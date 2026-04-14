import { useEffect, useState, useMemo } from 'react';
import api from '../../api/axios';
import { Table, Modal, Button, Input } from '../../components/ui';
import { Plus, Edit, Trash2, Building2, Users, MapPin, Gauge } from 'lucide-react';

const EMPTY = { name: '', city: '', address: '' };

export default function HubsPage() {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, hub: null });
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const stats = useMemo(() => {
    const totalHubs = hubs.length;
    const totalAgents = hubs.reduce((sum, hub) => sum + (hub._count?.users || 0), 0);
    const average = totalHubs ? (totalAgents / totalHubs).toFixed(1) : '0.0';
    const cities = new Set(hubs.map((hub) => hub.city?.trim()).filter(Boolean)).size;
    return { totalHubs, totalAgents, average, cities };
  }, [hubs]);

  const load = () => { setLoading(true); api.get('/hubs').then(r => setHubs(r.data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openCreate = () => { setForm(EMPTY); setError(''); setModal({ open: true, hub: null }); };
  const openEdit = (hub) => { setForm({ name: hub.name, city: hub.city, address: hub.address }); setError(''); setModal({ open: true, hub }); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (modal.hub) await api.patch(`/hubs/${modal.hub.id}`, form);
      else await api.post('/hubs', form);
      setModal({ open: false, hub: null }); load();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this hub?')) return;
    try { await api.delete(`/hubs/${id}`); load(); } catch (err) { alert(err.response?.data?.error || 'Failed to delete'); }
  };

  const f = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });

  const columns = [
    { key: 'name', label: 'Hub Name' },
    { key: 'city', label: 'City' },
    { key: 'address', label: 'Address' },
    { key: '_count', label: 'Agents', render: r => r._count?.users ?? 0 },
    { key: 'created_at', label: 'Created', render: r => new Date(r.created_at).toLocaleDateString() },
    {
      key: 'actions', label: '', render: r => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(r)} className="text-sm font-medium" style={{ color: '#F74B25' }}><Edit size={15} /></button>
          <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hubs and Warehouses</h1>
          <p className="text-gray-500 text-sm mt-1">Manage operational hubs and their staffing footprint.</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Add Hub</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Hubs</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalHubs}</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-2 text-orange-600"><Building2 size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Agents</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalAgents}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600"><Users size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Cities Covered</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.cities}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><MapPin size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Avg Agents/Hub</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.average}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600"><Gauge size={18} /></div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-0 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Hub Directory</h2>
        </div>
        <Table columns={columns} data={hubs} loading={loading} emptyMessage="No hubs yet" />
      </div>
      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, hub: null })} title={modal.hub ? 'Edit Hub' : 'New Hub'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Hub Name" {...f('name')} required />
          <Input label="City" {...f('city')} required />
          <Input label="Full Address" {...f('address')} required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            <Button type="button" variant="secondary" onClick={() => setModal({ open: false, hub: null })}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
