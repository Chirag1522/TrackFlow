import { useEffect, useState, useMemo } from 'react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';
import StatusBadge from '../../components/shipment/StatusBadge';
import { Modal, Button, Select, Spinner } from '../../components/ui';
import { MapPin, Upload, ChevronRight, Package, Truck, CheckCircle, Clock3 } from 'lucide-react';

const TRANSITIONS = {
  Created: ['Picked_Up'],
  Picked_Up: ['At_Sorting_Facility'],
  At_Sorting_Facility: ['In_Transit'],
  In_Transit: ['Out_for_Delivery'],
  Out_for_Delivery: ['Delivered', 'Failed'],
  Failed: ['Retry', 'Returned'],
  Retry: ['Picked_Up'],
};

export default function DeliveriesPage() {
  const { user } = useAuthStore();
  const [workitems, setWorkitems] = useState({ pickup: [], delivery: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusModal, setStatusModal] = useState({ open: false, shipment: null, stage: null, status: '', location: '', note: '' });
  const [proofModal, setProofModal] = useState({ open: false, shipment: null, file: null, uploading: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activePickupItems = useMemo(
    () => workitems.pickup.filter((item) => !item.isCompleted),
    [workitems.pickup]
  );

  const activeDeliveryItems = useMemo(
    () => workitems.delivery.filter((item) => !item.isCompleted),
    [workitems.delivery]
  );

  const pastShipments = useMemo(() => {
    const completed = [
      ...workitems.pickup.filter((item) => item.isCompleted),
      ...workitems.delivery.filter((item) => item.isCompleted),
    ];

    return completed.sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
      return bTime - aTime;
    });
  }, [workitems.pickup, workitems.delivery]);

  const formatDateTime = (value) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString();
  };

  const taskStats = useMemo(() => {
    const active = activePickupItems.length + activeDeliveryItems.length;
    const completed = pastShipments.length;
    return {
      total: active + completed,
      pickup: activePickupItems.length,
      delivery: activeDeliveryItems.length,
      completed,
      active,
    };
  }, [activePickupItems, activeDeliveryItems, pastShipments]);

  const load = async () => {
    setLoading(true);
    try { 
      const res = await api.get('/shipments/workitems'); 
      setWorkitems(res.data); 
    }
    catch { 
      setWorkitems({ pickup: [], delivery: [], total: 0 }); 
    }
    finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { load(); }, []);

  const openStatus = (s, stage) => {
    const next = TRANSITIONS[s.status] || [];
    setStatusModal({ open: true, shipment: s, stage, status: next[0] || '', location: '', note: '' });
    setError('');
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault(); 
    setSaving(true); 
    setError('');
    try {
      await api.patch(`/shipments/${statusModal.shipment.id}/status`, {
        status: statusModal.status, 
        location: statusModal.location, 
        note: statusModal.note,
      });
      setStatusModal({ open: false, shipment: null, stage: null, status: '', location: '', note: '' });
      load();
    } catch (err) { 
      setError(err.response?.data?.error || 'Failed to update'); 
    }
    finally { 
      setSaving(false); 
    }
  };

  const handleProofUpload = async () => {
    if (!proofModal.file) return;
    setProofModal(m => ({ ...m, uploading: true }));
    try {
      const formData = new FormData();
      formData.append('proof', proofModal.file);
      await api.post(`/shipments/${proofModal.shipment.id}/proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProofModal({ open: false, shipment: null, file: null, uploading: false });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
      setProofModal(m => ({ ...m, uploading: false }));
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="mb-1">
        <h1 className="text-3xl font-bold text-gray-900">My Workitems</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome, {user?.name}. Execute pickups and deliveries from one queue.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Tasks</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{taskStats.total}</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-2 text-orange-600"><Package size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Active</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{taskStats.active}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600"><Clock3 size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Pickup</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{taskStats.pickup}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600"><Truck size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Delivery</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{taskStats.delivery}</p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><MapPin size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Completed</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{taskStats.completed}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><CheckCircle size={18} /></div>
          </div>
        </div>
      </div>

      {workitems.total === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white text-center py-16 shadow-sm">
          <Package size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">No tasks assigned yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* PICKUP ITEMS */}
          {activePickupItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Truck size={20} style={{ color: '#F74B25' }} />
                <h2 className="text-lg font-semibold text-gray-900">Pickup Tasks ({activePickupItems.length})</h2>
              </div>
              <div className="space-y-3">
                {activePickupItems.map(s => {
                  const nextStatuses = TRANSITIONS[s.status] || [];
                  return (
                    <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm font-bold text-orange-700 truncate">{s.tracking_id}</p>
                          <StatusBadge status={s.status} />
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <MapPin size={14} className="flex-shrink-0 mt-0.5 text-gray-400" />
                          <div>
                            <p className="font-medium">{s.sender_info?.name}</p>
                            <p className="text-gray-400 text-xs">{s.sender_info?.address}, {s.sender_info?.city}</p>
                            {s.sender_info?.phone && <p className="text-xs text-orange-600">📞 {s.sender_info.phone}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          <CheckCircle size={12} style={{ color: '#F74B25' }} />
                          To: {s.origin_hub?.name} ({s.origin_hub?.city})
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {nextStatuses.length > 0 && (
                          <button onClick={() => openStatus(s, 'PICKUP')}
                            className="flex items-center gap-1.5 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                            style={{ backgroundColor: '#F74B25' }}>
                            Update Status <ChevronRight size={14} />
                          </button>
                        )}
                        {
                          <button onClick={() => setProofModal({ open: true, shipment: s, file: null, uploading: false })}
                            className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm px-4 py-2 rounded-lg transition-colors">
                            <Upload size={14} /> Upload Proof
                          </button>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DELIVERY ITEMS */}
          {activeDeliveryItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={20} style={{ color: '#F74B25' }} />
                <h2 className="text-lg font-semibold text-gray-900">Delivery Tasks ({activeDeliveryItems.length})</h2>
              </div>
              <div className="space-y-3">
                {activeDeliveryItems.map(s => {
                  const nextStatuses = TRANSITIONS[s.status] || [];
                  return (
                    <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm font-bold text-orange-700 truncate">{s.tracking_id}</p>
                          <StatusBadge status={s.status} />
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <MapPin size={14} className="flex-shrink-0 mt-0.5 text-gray-400" />
                          <div>
                            <p className="font-medium">{s.receiver_info?.name}</p>
                            <p className="text-gray-400 text-xs">{s.receiver_info?.address}, {s.receiver_info?.city}</p>
                            {s.receiver_info?.phone && <p className="text-xs text-orange-600">📞 {s.receiver_info.phone}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          <Truck size={12} style={{ color: '#F74B25' }} />
                          From: {s.destination_hub?.name} ({s.destination_hub?.city})
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {nextStatuses.length > 0 && (
                          <button onClick={() => openStatus(s, 'DELIVERY')}
                            className="flex items-center gap-1.5 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                            style={{ backgroundColor: '#F74B25' }}>
                            Update Status <ChevronRight size={14} />
                          </button>
                        )}
                        {
                          <button onClick={() => setProofModal({ open: true, shipment: s, file: null, uploading: false })}
                            className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm px-4 py-2 rounded-lg transition-colors">
                            <Upload size={14} /> Upload Proof
                          </button>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pastShipments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock3 size={20} style={{ color: '#475569' }} />
                <h2 className="text-lg font-semibold text-gray-900">Past Shipments ({pastShipments.length})</h2>
              </div>
              <div className="space-y-3">
                {pastShipments.map((s) => {
                  const contact = s.stage === 'PICKUP' ? s.sender_info : s.receiver_info;
                  const hubLabel = s.stage === 'PICKUP'
                    ? `${s.origin_hub?.name || 'Origin Hub'} (${s.origin_hub?.city || 'N/A'})`
                    : `${s.destination_hub?.name || 'Destination Hub'} (${s.destination_hub?.city || 'N/A'})`;

                  return (
                    <div key={`past-${s.id}-${s.stage}`} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-sm font-bold text-slate-700">{s.tracking_id}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <StatusBadge status={s.status} />
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold tracking-wide text-slate-700">
                              {s.stage === 'PICKUP' ? 'Pickup' : 'Delivery'}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{contact?.name || 'Recipient not available'}</p>
                          <p className="text-xs text-slate-500">{hubLabel}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Updated</p>
                          <p className="mt-1 text-sm font-medium text-slate-700">{formatDateTime(s.updated_at || s.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activePickupItems.length === 0 && activeDeliveryItems.length === 0 && pastShipments.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-600 shadow-sm">
              No active tasks right now. Your recent completed and processed shipments are listed above.
            </div>
          )}
        </div>
      )}

      {/* Status Update Modal */}
      <Modal isOpen={statusModal.open} onClose={() => setStatusModal(m => ({ ...m, open: false }))} title={`Update ${statusModal.stage || ''} Status`}>
        <form onSubmit={handleStatusUpdate} className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Current: <StatusBadge status={statusModal.shipment?.status} /></p>
          </div>
          <Select label="New Status" value={statusModal.status}
            onChange={e => setStatusModal(m => ({ ...m, status: e.target.value }))} required>
            <option value="">— Select status —</option>
            {(TRANSITIONS[statusModal.shipment?.status] || []).map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </Select>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input className="input-field" placeholder="Current location" value={statusModal.location}
              onChange={e => setStatusModal(m => ({ ...m, location: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <textarea className="input-field" rows={3} placeholder="Additional notes…" value={statusModal.note}
              onChange={e => setStatusModal(m => ({ ...m, note: e.target.value }))} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving || !statusModal.status}>{saving ? 'Updating…' : 'Update'}</Button>
            <Button type="button" variant="secondary" onClick={() => setStatusModal(m => ({ ...m, open: false }))}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Proof Upload Modal */}
      <Modal isOpen={proofModal.open} onClose={() => setProofModal({ open: false, shipment: null, file: null, uploading: false })} title="Upload Proof of Delivery">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            {proofModal.file ? (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">{proofModal.file.name}</p>
                <img src={URL.createObjectURL(proofModal.file)} alt="Preview"
                  className="mx-auto max-h-40 rounded-lg object-cover" />
              </div>
            ) : (
              <div>
                <Upload size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">Tap to select a photo</p>
              </div>
            )}
            <input type="file" accept="image/*" capture="environment"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ position: 'relative' }}
              onChange={e => setProofModal(m => ({ ...m, file: e.target.files[0] }))} />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleProofUpload} disabled={!proofModal.file || proofModal.uploading}>
              {proofModal.uploading ? 'Uploading…' : 'Upload Photo'}
            </Button>
            <Button variant="secondary" onClick={() => setProofModal({ open: false, shipment: null, file: null, uploading: false })}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
