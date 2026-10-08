// backend/controllers/eventTicketImportController.js
//
// Imports ticket sales from an external ticketing partner (e.g. Little
// Events) as event_tickets rows, so attendees who bought elsewhere can
// later claim their UniHive account benefits via claim_external_ticket.
//
// IMPORTANT — this does NOT grant entry and never sets scanned/
// scanned_at/scanned_by/admits_used. Those columns represent physical
// admission and, for any row where source_platform != 'unihive', must
// stay untouched forever. The external platform's own scanner remains
// the sole authority on entry. This endpoint only creates the ticket
// record so an attendee can later link it to a UniHive account.
//
// Admin-only. Follows the same profiles.is_admin check used by
// StaffScanner.jsx and AdminServicesPanel.jsx, not the unused
// app_metadata-based requireAdmin in authMiddleware.js.

import { supabase } from '../supabaseClient.js';

const MAX_ROWS_PER_IMPORT = 500;

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * Verify the bearer token belongs to an admin. Returns the user id on
 * success, or sends an error response and returns null on failure.
 */
const requireAdminUser = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    return null;
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
    return null;
  }

  return user.id;
};

/**
 * POST /api/admin/events/:eventId/import-tickets
 *
 * Body: {
 *   source_platform: string,          // e.g. "little" — never "unihive"
 *   external_reference?: string,      // OPTIONAL fallback used only for
 *                                      // rows that don't carry their own
 *                                      // reference (e.g. pasted from a
 *                                      // screenshot with no per-ticket
 *                                      // id). A real export like Little's
 *                                      // "Payment Key" column gives each
 *                                      // ticket its own reference, which
 *                                      // should be passed per-row below
 *                                      // instead — that's the preferred
 *                                      // path now that it's known to exist.
 *   tickets: Array<{
 *     name: string,
 *     phone?: string,
 *     email?: string,
 *     tier: string,                   // e.g. "Regular", "VIP"
 *     amount_paid: number,
 *     payment_method?: string,
 *     purchased_at?: string,          // ISO date, best-effort
 *     external_reference?: string,    // per-ticket reference (preferred);
 *                                      // falls back to the body-level one
 *                                      // above if omitted
 *   }>
 * }
 *
 * Note: an "Attended"-style column from the source export is deliberately
 * never accepted here. Entry/check-in state is the external platform's
 * authority, not UniHive's — see the file header.
 */
export const importExternalTickets = async (req, res) => {
  try {
    const adminId = await requireAdminUser(req, res);
    if (!adminId) return; // response already sent

    const { eventId } = req.params;
    const { source_platform, external_reference, tickets } = req.body;

    if (!isNonEmptyString(eventId)) {
      return res.status(400).json({ success: false, error: 'eventId is required' });
    }
    if (!isNonEmptyString(source_platform) || source_platform === 'unihive') {
      return res.status(400).json({
        success: false,
        error: 'source_platform is required and must not be "unihive" (that value is reserved for native sales)',
      });
    }
    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ success: false, error: 'tickets must be a non-empty array' });
    }
    if (tickets.length > MAX_ROWS_PER_IMPORT) {
      return res.status(400).json({
        success: false,
        error: `Too many rows in one import (${tickets.length}). Split into batches of ${MAX_ROWS_PER_IMPORT} or fewer.`,
      });
    }

    // Confirm the event exists before importing anything against it.
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) {
      return res.status(500).json({ success: false, error: eventError.message });
    }
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // Validate each row before writing anything — an import should not
    // partially land with silently-skipped bad rows.
    const errors = [];
    tickets.forEach((t, i) => {
      if (!isNonEmptyString(t.name)) errors.push(`Row ${i + 1}: name is required`);
      if (!isNonEmptyString(t.tier)) errors.push(`Row ${i + 1}: tier is required`);
      if (typeof t.amount_paid !== 'number' || t.amount_paid < 0) {
        errors.push(`Row ${i + 1}: amount_paid must be a non-negative number`);
      }
      if (!isNonEmptyString(t.phone) && !isNonEmptyString(t.email)) {
        errors.push(`Row ${i + 1}: at least one of phone or email is required (needed later for claiming)`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
    }

    // Dedupe against rows already imported for this event from the same
    // source, matched on phone/email — re-running an import (e.g. after
    // fixing a typo in one row) should not create duplicates for
    // everyone else in the batch.
    const { data: existing, error: existingError } = await supabase
      .from('event_tickets')
      .select('attendee_phone, attendee_email')
      .eq('event_id', eventId)
      .eq('source_platform', source_platform);

    if (existingError) {
      return res.status(500).json({ success: false, error: existingError.message });
    }

    const existingPhones = new Set((existing || []).map((r) => r.attendee_phone).filter(Boolean));
    const existingEmails = new Set((existing || []).map((r) => r.attendee_email).filter(Boolean));

    const toInsert = [];
    const skipped = [];

    for (const t of tickets) {
      const phone = isNonEmptyString(t.phone) ? t.phone.trim() : null;
      const email = isNonEmptyString(t.email) ? t.email.trim().toLowerCase() : null;
      const rowReference = isNonEmptyString(t.external_reference)
        ? t.external_reference.trim()
        : isNonEmptyString(external_reference)
        ? external_reference.trim()
        : null;

      const alreadyImported =
        (phone && existingPhones.has(phone)) || (email && existingEmails.has(email));

      if (alreadyImported) {
        skipped.push({ name: t.name, phone, email, reason: 'already imported for this event/source' });
        continue;
      }

      toInsert.push({
        event_id: eventId,
        user_id: null,
        guest_purchase: true,
        guest_name: t.name.trim(),
        attendee_phone: phone,
        attendee_email: email,
        tier: t.tier.trim(),
        amount_paid: t.amount_paid,
        payment_status: 'completed',
        source_platform,
        external_reference: rowReference,
        created_at: isNonEmptyString(t.purchased_at) ? t.purchased_at : undefined,
      });
    }

    if (toInsert.length === 0) {
      return res.status(200).json({
        success: true,
        imported: 0,
        skipped: skipped.length,
        details: skipped,
        message: 'Nothing new to import — every row matched an existing import for this event/source.',
      });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('event_tickets')
      .insert(toInsert)
      .select('id, guest_name, tier, attendee_phone, attendee_email');

    if (insertError) {
      return res.status(500).json({ success: false, error: insertError.message });
    }

    return res.status(200).json({
      success: true,
      event: event.title,
      imported: inserted.length,
      skipped: skipped.length,
      details: { inserted, skipped },
    });
  } catch (error) {
    console.error('Error importing external tickets:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during import' });
  }
};
