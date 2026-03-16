import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Clock, CheckCircle, XCircle, AlertCircle, Image, X } from 'lucide-react';
import { supabase } from './SupabaseClient';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';

const fmt = (n) => `KES ${Number(n).toLocaleString()}`;

const SERVICE_CATEGORIES = [
  'Tutoring & Academic Help',
  'Photography & Videography',
  'Graphic Design & Art',
  'Cleaning & Home Services',
  'Food & Catering',
  'Hairdressing & Beauty',
  'Tech & IT Help',
  'Delivery & Errands',
  'Fitness & Training',
  'Events & Entertainment',
  'Other',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_CONFIG = {
  pending:  { icon: <Clock className="w-3 h-3" />,        label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  approved: { icon: <CheckCircle className="w-3 h-3" />,  label: 'Approved',         color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  rejected: { icon: <XCircle className="w-3 h-3" />,      label: 'Rejected',         color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

const EMPTY_FORM = {
  title: '', category: SERVICE_CATEGORIES[0], description: '',
  price: '', price_type: 'flat', location: '', is_remote: false,
};

export default function MyServices({ userId }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [availabilities, setAvailabilities] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [subTab, setSubTab] = useState('listings');
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_services')
        .select('*, user_service_availabilities(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setServices(data || []);
    } catch (e) {
      toast.error('Failed to load your services');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_service_bookings')
        .select('*, user_services(title, category)')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBookings(data || []);
    } catch (e) {
      toast.error('Failed to load bookings');
    } finally {
      setBookingsLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchServices(); }, [fetchServices]);
  useEffect(() => { if (subTab === 'bookings') fetchBookings(); }, [subTab, fetchBookings]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setAvailabilities([]);
    setImageFiles([]);
    setImagePreviewUrls([]);
    setExistingImages([]);
    setShowForm(true);
  }

  function openEdit(svc) {
    setEditingId(svc.id);
    setForm({
      title: svc.title, category: svc.category, description: svc.description,
      price: svc.price, price_type: svc.price_type, location: svc.location || '',
      is_remote: svc.is_remote,
    });
    setAvailabilities(
      (svc.user_service_availabilities || []).map(a => ({
        id: a.id, day_of_week: a.day_of_week, date: a.date || '',
        start_time: a.start_time, end_time: a.end_time,
      }))
    );
    setImageFiles([]);
    setImagePreviewUrls([]);
    setExistingImages(Array.isArray(svc.images) ? svc.images : []);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  function addAvailability() {
    setAvailabilities(prev => [...prev, { day_of_week: 1, date: '', start_time: '09:00', end_time: '17:00' }]);
  }

  function removeAvailability(index) {
    setAvailabilities(prev => prev.filter((_, i) => i !== index));
  }

  function updateAvailability(index, field, value) {
    setAvailabilities(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  }

  function handleImageChange(e) {
    const files = Array.from(e.target.files);
    setImageFiles(prev => [...prev, ...files]);
    const previews = files.map(f => URL.createObjectURL(f));
    setImagePreviewUrls(prev => [...prev, ...previews]);
  }

  function removeNewImage(index) {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  }

  function removeExistingImage(url) {
    setExistingImages(prev => prev.filter(u => u !== url));
  }

  async function uploadImages() {
    const uploaded = [];
    for (const file of imageFiles) {
      const ext = file.name.split('.').pop();
      const path = `services/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
      uploaded.push(publicUrl);
    }
    return uploaded;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.price) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const newImageUrls = await uploadImages();
      const allImages = [...existingImages, ...newImageUrls];

      const payload = {
        user_id: userId,
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        price: parseFloat(form.price),
        price_type: form.price_type,
        location: form.location.trim() || null,
        is_remote: form.is_remote,
        images: allImages,
      };

      let serviceId = editingId;
      if (editingId) {
        const { error } = await supabase.from('user_services').update(payload).eq('id', editingId);
        if (error) throw error;
        // re-submit for approval if editing
        await supabase.from('user_services').update({ approval_status: 'pending' }).eq('id', editingId);
      } else {
        const { data, error } = await supabase.from('user_services').insert(payload).select().single();
        if (error) throw error;
        serviceId = data.id;
      }

      // Delete old availabilities and re-insert
      await supabase.from('user_service_availabilities').delete().eq('service_id', serviceId);
      if (availabilities.length > 0) {
        const avRows = availabilities.map(a => ({
          service_id: serviceId,
          day_of_week: a.date ? null : Number(a.day_of_week),
          date: a.date || null,
          start_time: a.start_time,
          end_time: a.end_time,
        }));
        const { error: avErr } = await supabase.from('user_service_availabilities').insert(avRows);
        if (avErr) throw avErr;
      }

      toast.success(editingId ? 'Service updated & resubmitted for approval' : 'Service submitted for approval!');
      closeForm();
      fetchServices();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save service');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this service? This cannot be undone.')) return;
    const { error } = await supabase.from('user_services').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Service deleted');
    setServices(prev => prev.filter(s => s.id !== id));
  }

  async function toggleActive(svc) {
    const { error } = await supabase
      .from('user_services')
      .update({ is_active: !svc.is_active })
      .eq('id', svc.id);
    if (error) { toast.error('Failed to update'); return; }
    setServices(prev => prev.map(s => s.id === svc.id ? { ...s, is_active: !s.is_active } : s));
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-5 border-b border-border">
        {['listings', 'bookings'].map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`pb-2 px-1 text-sm font-medium capitalize border-b-2 transition-colors ${
              subTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'listings' ? 'My Service Listings' : 'Incoming Bookings'}
          </button>
        ))}
      </div>

      {subTab === 'listings' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">My Services</h2>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> Add Service
            </Button>
          </div>

          {services.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="mb-4">You haven't listed any services yet.</p>
              <Button onClick={openCreate} variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Create Your First Service
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map(svc => {
                const st = STATUS_CONFIG[svc.approval_status] || STATUS_CONFIG.pending;
                return (
                  <div key={svc.id} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
                    {/* Image */}
                    {Array.isArray(svc.images) && svc.images[0] && (
                      <img src={svc.images[0]} alt={svc.title} className="w-full h-36 object-cover rounded-lg" />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{svc.title}</p>
                        <p className="text-xs text-muted-foreground">{svc.category}</p>
                      </div>
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full shrink-0 ${st.color}`}>
                        {st.icon} {st.label}
                      </span>
                    </div>

                    {svc.approval_status === 'rejected' && svc.rejection_reason && (
                      <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                        Rejection reason: {svc.rejection_reason}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-primary">{fmt(svc.price)}<span className="text-xs font-normal text-muted-foreground ml-1">/{svc.price_type.replace('_', ' ')}</span></span>
                      <span className="text-xs text-muted-foreground">{svc.is_remote ? '🌐 Remote' : `📍 ${svc.location || 'On-site'}`}</span>
                    </div>

                    <div className="flex gap-2 mt-auto">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(svc)}>
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={svc.is_active ? 'outline' : 'default'}
                        className="flex-1"
                        onClick={() => toggleActive(svc)}
                        disabled={svc.approval_status !== 'approved'}
                        title={svc.approval_status !== 'approved' ? 'Service must be approved first' : ''}
                      >
                        {svc.is_active ? 'Pause' : 'Activate'}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(svc.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {subTab === 'bookings' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Incoming Bookings</h2>
          {bookingsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No bookings yet. Share your services to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map(b => (
                <div key={b.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-semibold text-sm">{b.user_services?.title}</p>
                      <p className="text-xs text-muted-foreground">Ref: {b.booking_reference}</p>
                      {b.scheduled_date && (
                        <p className="text-xs text-muted-foreground">
                          📅 {new Date(b.scheduled_date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {b.scheduled_start_time && ` at ${b.scheduled_start_time.slice(0, 5)}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{fmt(b.amount)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        b.payment_status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : b.payment_status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {b.payment_status}
                      </span>
                    </div>
                  </div>
                  {b.notes && <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">"{b.notes}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-semibold">{editingId ? 'Edit Service' : 'Create Service'}</h3>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-sm font-medium mb-1 block">Service Title *</label>
                <input
                  type="text" required maxLength={100}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Math Tutoring, Photography Session"
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium mb-1 block">Category *</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {SERVICE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium mb-1 block">Description *</label>
                <textarea
                  required rows={3} maxLength={1000}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe what you offer, your experience, what's included..."
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {/* Price + Price Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Price (KES) *</label>
                  <input
                    type="number" required min="1" step="1"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="500"
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Pricing Type</label>
                  <select
                    value={form.price_type}
                    onChange={e => setForm(f => ({ ...f, price_type: e.target.value }))}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="flat">Flat Rate</option>
                    <option value="per_hour">Per Hour</option>
                    <option value="per_session">Per Session</option>
                  </select>
                </div>
              </div>

              {/* Location + Remote */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <label className="text-sm font-medium">Location</label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox" checked={form.is_remote}
                      onChange={e => setForm(f => ({ ...f, is_remote: e.target.checked }))}
                      className="rounded"
                    />
                    Remote / Online
                  </label>
                </div>
                {!form.is_remote && (
                  <input
                    type="text" maxLength={100}
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Westlands, Nairobi"
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>

              {/* Images */}
              <div>
                <label className="text-sm font-medium mb-1 block">Photos</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {existingImages.map(url => (
                    <div key={url} className="relative w-20 h-20">
                      <img src={url} className="w-full h-full object-cover rounded-lg" />
                      <button type="button" onClick={() => removeExistingImage(url)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {imagePreviewUrls.map((url, i) => (
                    <div key={i} className="relative w-20 h-20">
                      <img src={url} className="w-full h-full object-cover rounded-lg" />
                      <button type="button" onClick={() => removeNewImage(i)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                    <Image className="w-6 h-6 text-muted-foreground" />
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                  </label>
                </div>
              </div>

              {/* Availability */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Availability Slots</label>
                  <button type="button" onClick={addAvailability}
                    className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add slot
                  </button>
                </div>
                {availabilities.length === 0 && (
                  <p className="text-xs text-muted-foreground">No slots added. Customers will contact you to arrange timing.</p>
                )}
                <div className="space-y-2">
                  {availabilities.map((av, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <select
                        value={av.day_of_week}
                        onChange={e => updateAvailability(i, 'day_of_week', e.target.value)}
                        className="border border-input rounded px-2 py-1 text-xs bg-background flex-shrink-0"
                      >
                        {DAYS.map((d, idx) => <option key={d} value={idx}>{d}</option>)}
                      </select>
                      <input type="time" value={av.start_time}
                        onChange={e => updateAvailability(i, 'start_time', e.target.value)}
                        className="border border-input rounded px-2 py-1 text-xs bg-background" />
                      <span className="text-xs text-muted-foreground">–</span>
                      <input type="time" value={av.end_time}
                        onChange={e => updateAvailability(i, 'end_time', e.target.value)}
                        className="border border-input rounded px-2 py-1 text-xs bg-background" />
                      <button type="button" onClick={() => removeAvailability(i)}
                        className="text-red-500 hover:text-red-700">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={closeForm}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? 'Saving...' : editingId ? 'Update & Resubmit' : 'Submit for Approval'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
