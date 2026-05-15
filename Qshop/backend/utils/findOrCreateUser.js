// backend/utils/findOrCreateUser.js
// Resolves an email to a Supabase auth user_id.
// If the user already exists, returns their id. Otherwise creates a shadow
// auth user (no password set, email auto-confirmed) and upserts a profile row.
//
// The shadow user can later "claim" the account via the standard password
// reset flow on the same email — at which point all their existing tickets
// are already associated with their user_id.

import { supabase } from '../supabaseClient.js';

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

/**
 * @param {Object} params
 * @param {string} params.email - Required
 * @param {string} [params.name] - Used for profiles.full_name on creation
 * @param {string} [params.phone] - Used for profiles.phone on creation
 * @returns {Promise<{ userId: string, isNew: boolean }>}
 */
export const findOrCreateUserByEmail = async ({ email, name, phone }) => {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@')) {
    throw new Error('A valid email is required');
  }

  // 1. Try to find an existing auth user with this email.
  //    supabase-js v2 admin API: listUsers paginates; we'll iterate until we find
  //    or exhaust. For a marketplace this size, scanning is fine; if it grows
  //    large we can switch to a dedicated index/RPC.
  let existingUserId = null;
  let page = 1;
  const perPage = 1000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('findOrCreateUserByEmail: listUsers error', error);
      throw new Error('Failed to look up user');
    }
    const users = data?.users || [];
    const hit = users.find(u => (u.email || '').toLowerCase() === normalized);
    if (hit) {
      existingUserId = hit.id;
      break;
    }
    if (users.length < perPage) break; // last page
    page += 1;
    if (page > 50) break; // safety net (50k users)
  }

  if (existingUserId) {
    // Best-effort: update profile name/phone if those columns are still blank
    if (name || phone) {
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', existingUserId)
          .maybeSingle();

        const patch = {};
        if (name && !existingProfile?.full_name) patch.full_name = name;
        if (phone && !existingProfile?.phone) patch.phone = phone;
        if (Object.keys(patch).length > 0) {
          await supabase.from('profiles').update(patch).eq('id', existingUserId);
        }
      } catch (e) {
        console.warn('findOrCreateUserByEmail: profile patch failed (non-fatal)', e.message);
      }
    }
    return { userId: existingUserId, isNew: false };
  }

  // 2. Create a shadow auth user. email_confirm: true skips the confirmation
  //    email — Supabase still considers the email "confirmed" so the user can
  //    sign in (after using "forgot password" to set one).
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: normalized,
    email_confirm: true,
    user_metadata: {
      full_name: name || null,
      created_via: 'guest_ticket_checkout',
    },
  });

  if (createErr) {
    console.error('findOrCreateUserByEmail: createUser error', createErr);
    throw new Error(createErr.message || 'Failed to create user');
  }

  const newUserId = created?.user?.id;
  if (!newUserId) throw new Error('No user id returned from createUser');

  // 3. Upsert the profile row. A DB trigger may already create one — upsert
  //    is safe either way.
  try {
    await supabase
      .from('profiles')
      .upsert(
        {
          id: newUserId,
          email: normalized,
          full_name: name || null,
          phone: phone || null,
        },
        { onConflict: 'id' }
      );
  } catch (e) {
    console.warn('findOrCreateUserByEmail: profile upsert failed (non-fatal)', e.message);
  }

  return { userId: newUserId, isNew: true };
};
