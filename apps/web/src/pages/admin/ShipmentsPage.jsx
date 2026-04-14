import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../../api/axios';
import { Table, Modal, Button, Input, Select, Spinner } from '../../components/ui';
import StatusBadge from '../../components/shipment/StatusBadge';
import { Plus, QrCode, UserCheck, Filter, ExternalLink, Package, Clock3, AlertTriangle, Truck } from 'lucide-react';
import { format } from 'date-fns';

const EMPTY_FORM = {
  sender_info: { name: '', email: '', phone: '', city: '', address: '' },
  receiver_info: { name: '', email: '', phone: '', city: '', address: '' },
  origin_hub_id: '', destination_hub_id: '', estimated_delivery: '',
};

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState([]);
  const [agents, setAgents] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', agent: '' });
  const [createModal, setCreateModal] = useState(false);
  const [qrModal, setQrModal] = useState({ open: false, qr: '', trackingId: '' });
  const [assignModal, setAssignModal] = useState({ open: false, shipment: null, agentId: '', agents: [], error: '', loading: false, isReassignment: false });
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const shipmentStats = useMemo(() => {
    const total = shipments.length;
    const delivered = shipments.filter((s) => s.status === 'Delivered').length;
    const active = shipments.filter((s) => !['Delivered', 'Returned'].includes(s.status)).length;
    const attention = shipments.filter((s) => ['Failed', 'Retry'].includes(s.status)).length;
    const unassigned = shipments.filter((s) => !s.assigned_agent_id).length;
    return { total, delivered, active, attention, unassigned };
  }, [shipments]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.agent) params.set('agent', filters.agent);
      const [s, u, h] = await Promise.all([
        api.get(`/shipments?${params}`),
        api.get('/users'),
        api.get('/hubs'),
      ]);
      setShipments(s.data);
      setAgents(u.data.filter(u => u.role === 'agent'));
      setHubs(h.data);
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/shipments', {
        sender_info: form.sender_info,
        receiver_info: form.receiver_info,
        origin_hub_id: form.origin_hub_id || null,
        destination_hub_id: form.destination_hub_id || null,
        estimated_delivery: form.estimated_delivery || null,
      });
      setCreateModal(false); setForm(EMPTY_FORM); load();
    } catch (err) { setError(err.response?.data?.error || 'Failed to create'); }
    finally { setSaving(false); }
  };

  const showQR = async (shipment) => {
    try {
      const res = await api.get(`/shipments/${shipment.id}/qr`);
      setQrModal({ open: true, qr: res.data.qr_code, trackingId: shipment.tracking_id });
    } catch {}
  };

  const openAssignModal = async (shipment) => {
    setAssignModal(prev => ({ 
      ...prev, 
      open: true, 
      shipment, 
      agentId: shipment.assigned_agent_id || '', 
      loading: true, 
      error: ''
    }));
    try {
      const res = await api.get(`/shipments/${shipment.id}/available-agents`);
      let allAgents = res.data;
      let filteredAgents = allAgents;
      
      // For delivery statuses (Out_for_Delivery, Retry): show only destination hub agents
      if ((shipment.status === 'Out_for_Delivery' || shipment.status === 'Retry') && shipment.destination_hub_id) {
        filteredAgents = allAgents.filter(a => a.hub_id === shipment.destination_hub_id);
      }
      // If at destination sorting facility, show only destination hub agents
      else if (shipment.status === 'At_Sorting_Facility' && shipment.destination_hub_id) {
        filteredAgents = allAgents.filter(a => a.hub_id === shipment.destination_hub_id);
      }
      // If created, show only origin hub agents
      else if (shipment.status === 'Created' && shipment.origin_hub_id) {
        filteredAgents = allAgents.filter(a => a.hub_id === shipment.origin_hub_id);
      }
      
      setAssignModal(prev => ({ ...prev, agents: filteredAgents, loading: false }));
    } catch (err) {
      setAssignModal(prev => ({ ...prev, error: err.response?.data?.error || 'Failed to load agents', loading: false }));
    }
  };

  const handleTransitionStage = async (shipment) => {
    if (!window.confirm('Move this shipment to the next stage?')) return;
    setSaving(true);
    try {
      await api.patch(`/shipments/${shipment.id}/transition-stage`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to transition');
    } finally { setSaving(false); }
  };

  const handleReturn = async (shipment) => {
    if (!window.confirm('Return this shipment to sender? The sender will receive a return notification.')) return;
    setSaving(true);
    try {
      await api.patch(`/shipments/${shipment.id}/status`, { status: 'Returned', location: 'Returning to sender', note: 'Shipment returned - will be sent back to sender' });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to return shipment');
    } finally { setSaving(false); }
  };

  const handleRetry = async (shipment) => {
    if (!window.confirm('Retry delivery for this shipment?')) return;
    setSaving(true);
    try {
      await api.patch(`/shipments/${shipment.id}/status`, { status: 'Retry', location: shipment.origin_hub?.name || 'Origin Hub', note: 'Shipment marked for redelivery attempt' });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to retry shipment');
    } finally { setSaving(false); }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setAssignModal(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const shipment = assignModal.shipment;
      
      // If Retry status, transition to Out_for_Delivery first
      if (shipment.status === 'Retry') {
        await api.patch(`/shipments/${shipment.id}/status`, { 
          status: 'Out_for_Delivery', 
          location: shipment.destination_hub?.name || 'Destination Hub',
          note: 'Retry: Ready for redelivery attempt'
        });
      }
      
      // Then assign the agent
      await api.patch(`/shipments/${shipment.id}/assign-agent`, { agent_id: assignModal.agentId });
      setAssignModal({ open: false, shipment: null, agentId: '', agents: [], error: '', loading: false, isReassignment: false }); 
      load();
    } catch (err) { 
      setAssignModal(prev => ({ ...prev, error: err.response?.data?.error || 'Failed to assign agent', loading: false }));
    }
  };

  const setInfoField = (side, field, val) =>
    setForm(f => ({ ...f, [`${side}_info`]: { ...f[`${side}_info`], [field]: val } }));

  const STATUSES = ['Created', 'Picked_Up', 'At_Sorting_Facility', 'In_Transit', 'Out_for_Delivery', 'Delivered', 'Failed', 'Retry', 'Returned'];

  const columns = [
    { key: 'tracking_id', label: 'Tracking ID', render: r => <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{r.tracking_id}</code> },
    { key: 'sender', label: 'Sender', render: r => <span className="text-sm">{r.sender_info?.name}</span> },
    { key: 'receiver', label: 'Receiver', render: r => <div><p className="text-sm">{r.receiver_info?.name}</p><p className="text-xs text-gray-400">{r.receiver_info?.city}</p></div> },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
    { key: 'agent', label: 'Agent', render: r => r.agent ? <span className="text-sm">{r.agent.name}</span> : <span className="text-gray-400 text-sm">Unassigned</span> },
    { key: 'created_at', label: 'Created', render: r => format(new Date(r.created_at), 'MMM d, yy') },
    {
      key: 'actions', label: 'Actions', render: r => (
        <div className="flex flex-wrap items-center gap-2">
          <button title="View QR" onClick={() => showQR(r)} className="rounded-md bg-orange-50 p-1.5 text-orange-600 hover:bg-orange-100"><QrCode size={14} /></button>
          
          {/* Created: Admin assigns pickup agent at origin hub */}
          {r.status === 'Created' && (
            <button title="Assign Pickup Agent" onClick={() => openAssignModal(r)} className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 flex items-center gap-1">
              <UserCheck size={14} /> Assign
            </button>
          )}
          
          {/* At_Sorting_Facility (origin): Admin moves to In_Transit */}
          {r.status === 'At_Sorting_Facility' && (
            <button title="Move to In Transit" onClick={() => handleTransitionStage(r)} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100">
              Move to Transit
            </button>
          )}
          
          {/* In_Transit: Admin moves to At_Sorting_Facility at destination */}
          {r.status === 'In_Transit' && (
            <button title="Arrive at Destination Hub" onClick={() => handleTransitionStage(r)} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100">
              Mark Arrived
            </button>
          )}
          
          {/* Out_for_Delivery: Admin assigns delivery agent from destination hub */}
          {r.status === 'Out_for_Delivery' && (
            <button title="Assign Delivery Agent" onClick={() => openAssignModal(r)} className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
              Assign Agent
            </button>
          )}
          
          {/* Failed: Admin can retry or return */}
          {r.status === 'Failed' && (
            <div className="flex gap-2">
              <button title="Retry Delivery" onClick={() => handleRetry(r)} className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100">
                Retry
              </button>
              <button title="Return to Sender" onClick={() => handleReturn(r)} className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
                Return
              </button>
            </div>
          )}
          
          {/* Retry: Can go back to Out_for_Delivery for another delivery attempt */}
          {r.status === 'Retry' && (
            <button title="Assign Delivery Agent for Retry" onClick={() => openAssignModal(r)} className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100">
              Assign for Retry
            </button>
          )}
          
          {/* Picked_Up: No actions - agent controls */}
          {r.status === 'Picked_Up' && (
            <span className="text-xs text-gray-400">—</span>
          )}
          
          {/* Final states */}
          {r.status === 'Delivered' && (
            <span className="text-xs text-gray-400">Delivered</span>
          )}
          {r.status === 'Returned' && (
            <span className="text-xs text-red-500">Returned</span>
          )}
          
          <a href={`/track/${r.tracking_id}`} target="_blank" rel="noopener noreferrer" title="Track" className="rounded-md bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"><ExternalLink size={14} /></a>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shipments</h1>
          <p className="text-gray-500 text-sm mt-1">Manage lifecycle, assignment, and delivery flow.</p>
        </div>
        <Button onClick={() => { setCreateModal(true); setError(''); setForm(EMPTY_FORM); }}>
          <Plus size={16} /> New Shipment
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{shipmentStats.total}</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-2 text-orange-600"><Package size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Active</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{shipmentStats.active}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600"><Clock3 size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Delivered</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{shipmentStats.delivered}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><Truck size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Needs Action</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{shipmentStats.attention}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-2 text-red-600"><AlertTriangle size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Unassigned</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{shipmentStats.unassigned}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600"><UserCheck size={18} /></div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex gap-4 flex-wrap items-end">
        <Filter size={16} className="text-gray-400 self-center" />
        <Select label="Status" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="w-40">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
        <Select label="Agent" value={filters.agent} onChange={e => setFilters(f => ({ ...f, agent: e.target.value }))} className="w-40">
          <option value="">All Agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Button variant="secondary" size="sm" onClick={() => setFilters({ status: '', agent: '' })}>Clear</Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-0 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Shipment Table</h2>
        </div>
        <Table columns={columns} data={shipments} loading={loading} emptyMessage="No shipments found" />
      </div>

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create New Shipment" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Sender Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Name" value={form.sender_info.name} onChange={e => setInfoField('sender', 'name', e.target.value)} required />
              <Input label="Email" type="email" value={form.sender_info.email} onChange={e => setInfoField('sender', 'email', e.target.value)} />
              <Input label="Phone" value={form.sender_info.phone} onChange={e => setInfoField('sender', 'phone', e.target.value)} />
              <Input label="City" value={form.sender_info.city} onChange={e => setInfoField('sender', 'city', e.target.value)} />
              <div className="col-span-2">
                <Input label="Address" value={form.sender_info.address} onChange={e => setInfoField('sender', 'address', e.target.value)} />
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Receiver Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Name" value={form.receiver_info.name} onChange={e => setInfoField('receiver', 'name', e.target.value)} required />
              <Input label="Email" type="email" value={form.receiver_info.email} onChange={e => setInfoField('receiver', 'email', e.target.value)} />
              <Input label="Phone" value={form.receiver_info.phone} onChange={e => setInfoField('receiver', 'phone', e.target.value)} />
              <Input label="City" value={form.receiver_info.city} onChange={e => setInfoField('receiver', 'city', e.target.value)} />
              <div className="col-span-2">
                <Input label="Address" value={form.receiver_info.address} onChange={e => setInfoField('receiver', 'address', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Origin Hub" value={form.origin_hub_id} onChange={e => setForm(f => ({ ...f, origin_hub_id: e.target.value }))}>
              <option value="">— Select hub —</option>
              {hubs.map(h => <option key={h.id} value={h.id}>{h.name} ({h.city})</option>)}
            </Select>
            <Select label="Destination Hub" value={form.destination_hub_id} onChange={e => setForm(f => ({ ...f, destination_hub_id: e.target.value }))}>
              <option value="">— Select hub —</option>
              {hubs.map(h => <option key={h.id} value={h.id}>{h.name} ({h.city})</option>)}
            </Select>
            <Input label="Estimated Delivery" type="date" value={form.estimated_delivery} onChange={e => setForm(f => ({ ...f, estimated_delivery: e.target.value }))} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Shipment'}</Button>
            <Button type="button" variant="secondary" onClick={() => setCreateModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* QR Modal */}
      <Modal isOpen={qrModal.open} onClose={() => setQrModal({ open: false, qr: '', trackingId: '' })} title="Shipment QR Code">
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-4 font-mono">{qrModal.trackingId}</p>
          {qrModal.qr && <img src={qrModal.qr} alt="QR Code" className="mx-auto rounded-xl border border-gray-200 max-w-[250px]" />}
          <p className="text-xs text-gray-400 mt-4">Scan to track this shipment</p>
        </div>
      </Modal>

      {/* Assign Agent Modal */}
      <Modal isOpen={assignModal.open} onClose={() => setAssignModal({ open: false, shipment: null, agentId: '', agents: [], error: '', loading: false, isReassignment: false })} title={
        assignModal.shipment?.status === 'Created' ? '🚀 Assign Pickup Agent' : assignModal.shipment?.status === 'At_Sorting_Facility' ? '🚪 Assign Delivery Agent' : 'Assign Agent'
      }>
        {assignModal.loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : assignModal.error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{assignModal.error}</div>
        ) : assignModal.agents.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700 text-sm">
            <p className="font-medium mb-2">❌ No agents available</p>
            <p className="text-xs mb-2">
              {assignModal.shipment?.status === 'Created' ? (
                <>Required hub: <strong>{assignModal.shipment?.origin_hub?.name}</strong> ({assignModal.shipment?.origin_hub?.city})</>
              ) : (
                <>Required hub: <strong>{assignModal.shipment?.destination_hub?.name}</strong> ({assignModal.shipment?.destination_hub?.city})</>
              )}
            </p>
            <p className="text-xs">Please create agents and assign them to this hub.</p>
          </div>
        ) : (
          <form onSubmit={handleAssign} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700 text-sm">
              {assignModal.shipment?.status === 'Created' ? (
                <p>🏪 Pickup Agent from <strong>{assignModal.shipment?.origin_hub?.name}</strong> ({assignModal.shipment?.origin_hub?.city})</p>
              ) : assignModal.shipment?.status === 'At_Sorting_Facility' ? (
                <p>📍 Delivery Agent from <strong>{assignModal.shipment?.destination_hub?.name}</strong> ({assignModal.shipment?.destination_hub?.city})</p>
              ) : (
                <p>Assigning agent...</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Select Agent</label>
              <select 
                value={assignModal.agentId} 
                onChange={e => setAssignModal(m => ({ ...m, agentId: e.target.value }))} 
                required
                disabled={assignModal.loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
              >
                <option value="">— Choose agent —</option>
                {assignModal.agents.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} {a.hub ? `(${a.hub.name}, ${a.hub.city})` : ''}
                  </option>
                ))}
              </select>
              {assignModal.error && <p className="text-sm text-red-600 mt-2">{assignModal.error}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={assignModal.loading}>{assignModal.loading ? 'Assigning…' : 'Assign'}</Button>
              <Button type="button" variant="secondary" onClick={() => setAssignModal({ open: false, shipment: null, agentId: '', agents: [], error: '', loading: false, isReassignment: false })}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
