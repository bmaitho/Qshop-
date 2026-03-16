import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from './SupabaseClient';
import Navbar from './Navbar';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const fmt = (n) => `KES ${Number(n).toLocaleString()}`;

const TABS = ['pending', 'approved', 'rejected'];

export default function AdminServicesPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      if (!profile?.is_admin) { navigate('/home'); return; }
      setIsAdmin(true);
      setAuthChecked(true);
    }
    checkAdmin();
  }, [navigate]);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_services')
        .select('*, profiles(full_name, email, phone), user_service_availabilities(*)')
        .eq('approval_status', activeTab)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setServices(data || []);
    } catch {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (authChecked) fetchServices();
  }, [authChecked, fetchServices]);

  async function approve(id) {
    const { error } = await supabase
      .from('user_services')
      .update({ approval_status: 'approved', rejection_reason: null })
      .eq('id', id);
    if (error) { toast.error('Failed to approve'); return; }
    toast.success('Service approved ✓');
    setServices(prev => prev.filter(s => s.id !== id));
  }

  async function reject(id) {
    if (!rejectionReason.trim()) { toast.error('Please enter a rejection reason'); return; }
    const { error } = await supabase
      .from('user_services')
      .update({ approval_status: 'rejected', rejection_reason: rejectionReason.trim() })
      .eq('id', id);
    if (error) { toast.error('Failed to reject'); return; }
    toast.success('Service rejected');
    setRejectingId(null);
    setRejectionReason('');
    setServices(prev => prev.filter(s => s.id !== id));
  }

  async function revertToPending(id) {
    const { error } = await supabase
      .from('user_services')
      .update({ approval_status: 'pending', rejection_reason: null })
      .eq('id', id);
    if (error) { toast.error('Failed'); return; }
    toast.success('Moved back to pending');
    setServices(prev => prev.filter(s => s.id !== id));
  }

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 mt-14 mb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Service Approvals</h1>
            <p className="text-muted-foreground text-sm">Review and approve user service listings</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit mb-6">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`capitalize px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No {activeTab} services.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map(svc => {
              const isExpanded = expandedId === svc.id;
              const isRejecting = rejectingId === svc.id;
              const availabilities = svc.user_service_availabilities || [];
              const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

              return (
                <div key={svc.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Image thumbnail */}
                      {Array.isArray(svc.images) && svc.images[0] ? (
                        <img src={svc.images[0]} alt={svc.title} className="w-20 h-20 object-cover rounded-xl shrink-0" />
                      ) : (
                        <div className="w-20 h-20 bg-muted rounded-xl shrink-0 flex items-center justify-center text-2xl">🛠️</div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">{svc.title}</p>
                            <p className="text-xs text-muted-foreground">{svc.category}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              By {svc.profiles?.full_name || 'Unknown'} · {svc.profiles?.email}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold">{fmt(svc.price)}</p>
                            <p className="text-xs text-muted-foreground">{svc.price_type.replace('_', ' ')}</p>
                          </div>
                        </div>

                        <div className="flex gap-1 mt-2 flex-wrap text-xs">
                          {svc.is_remote && <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full">🌐 Remote</span>}
                          {svc.location && <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full">📍 {svc.location}</span>}
                          <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                            {new Date(svc.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : svc.id)}
                      className="flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
                    >
                      <Eye className="w-3 h-3" />
                      {isExpanded ? 'Hide details' : 'View full details'}
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3">
                        <div className="bg-muted rounded-xl p-3">
                          <p className="text-xs font-medium mb-1">Description</p>
                          <p className="text-sm text-muted-foreground">{svc.description}</p>
                        </div>

                        {/* All images */}
                        {Array.isArray(svc.images) && svc.images.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {svc.images.map((url, i) => (
                              <img key={i} src={url} className="w-24 h-24 object-cover rounded-lg" />
                            ))}
                          </div>
                        )}

                        {/* Availability */}
                        {availabilities.length > 0 && (
                          <div className="bg-muted rounded-xl p-3">
                            <p className="text-xs font-medium mb-2">Availability Slots</p>
                            <div className="space-y-1">
                              {availabilities.map((av, i) => (
                                <p key={i} className="text-xs text-muted-foreground">
                                  {av.day_of_week !== null ? DAYS[av.day_of_week] : av.date} · {av.start_time?.slice(0,5)} – {av.end_time?.slice(0,5)}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Rejection reason if rejected */}
                        {svc.rejection_reason && (
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                            <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Rejection Reason</p>
                            <p className="text-sm text-red-700 dark:text-red-300">{svc.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reject form */}
                    {isRejecting && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          rows={2}
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                          placeholder="Reason for rejection (required)..."
                          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" onClick={() => reject(svc.id)}>Confirm Reject</Button>
                          <Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setRejectionReason(''); }}>Cancel</Button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-4">
                      {activeTab === 'pending' && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={() => approve(svc.id)}>
                            <CheckCircle className="w-3 h-3" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" className="gap-1" onClick={() => setRejectingId(svc.id)}>
                            <XCircle className="w-3 h-3" /> Reject
                          </Button>
                        </>
                      )}
                      {activeTab === 'approved' && (
                        <Button size="sm" variant="destructive" className="gap-1" onClick={() => setRejectingId(svc.id)}>
                          <XCircle className="w-3 h-3" /> Revoke Approval
                        </Button>
                      )}
                      {activeTab === 'rejected' && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={() => approve(svc.id)}>
                            <CheckCircle className="w-3 h-3" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => revertToPending(svc.id)}>
                            Move to Pending
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
