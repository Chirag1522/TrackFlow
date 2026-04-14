import { useEffect, useState, useMemo } from 'react';
import api from '../../api/axios';
import { Table, Modal, Button, Input, Select, Badge } from '../../components/ui';
import { Plus, Edit, UserX, Users, UserCheck, UserMinus, Building2 } from 'lucide-react';

const EMPTY = { name: '', email: '', password: '', hub_id: '' };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (email) => EMAIL_REGEX.test(email);

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, agent: null });
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const stats = useMemo(() => {
    const total = agents.length;
    const active = agents.filter((a) => a.is_active).length;
    const inactive = total - active;
    const assignedToHub = agents.filter((a) => a.hub_id).length;
    return { total, active, inactive, assignedToHub };
  }, [agents]);

  const load = async () => {
    setLoading(true);
    const [u, h] = await Promise.all([api.get('/users'), api.get('/hubs')]);
    setAgents(u.data.filter(u => u.role === 'agent'));
    setHubs(h.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setError(''); setModal({ open: true, agent: null }); };
  const openEdit = (a) => { setForm({ name: a.name, email: a.email, password: '', hub_id: a.hub_id || '' }); setError(''); setModal({ open: true, agent: a }); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      // Validate email
      if (!modal.agent && !form.email) {
        setError('Email is required');
        setSaving(false);
        return;
      }
      if (!modal.agent && !isValidEmail(form.email)) {
        setError('Please enter a valid email address (e.g., user@example.com)');
        setSaving(false);
        return;
      }
      const payload = { ...form, role: 'agent' };
      if (modal.agent) { delete payload.email; if (!payload.password) delete payload.password; await api.patch(`/users/${modal.agent.id}`, payload); }
      else await api.post('/users', payload);
      setModal({ open: false, agent: null }); load();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const deactivate = async (id) => {
    if (!confirm('Deactivate this agent?')) return;
    await api.delete(`/users/${id}`); load();
  };

  const f = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'hub', label: 'Hub', render: r => r.hub ? <Badge color="orange">{r.hub.name}</Badge> : <span className="text-gray-400">—</span> },
    { key: 'is_active', label: 'Status', render: r => <Badge color={r.is_active ? 'green' : 'red'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'actions', label: '', render: r => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(r)} className="text-sm font-medium" style={{ color: '#F74B25' }}><Edit size={15} /></button>
          <button onClick={() => deactivate(r.id)} className="text-red-500 hover:text-red-700"><UserX size={15} /></button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Agents</h1>
          <p className="text-gray-500 text-sm mt-1">Create, activate, and assign delivery workforce.</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Add Agent</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Agents</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-2 text-orange-600"><Users size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Active</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.active}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><UserCheck size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Inactive</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.inactive}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-2 text-red-600"><UserMinus size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Hub Assigned</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.assignedToHub}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600"><Building2 size={18} /></div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-0 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Agent Directory</h2>
        </div>
        <Table columns={columns} data={agents} loading={loading} emptyMessage="No agents yet" />
      </div>
      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, agent: null })} title={modal.agent ? 'Edit Agent' : 'New Agent'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Name" {...f('name')} required />
          {!modal.agent && <Input label="Email" type="email" {...f('email')} required />}
          <Input label={modal.agent ? 'New Password (leave blank to keep)' : 'Password'} type="password" {...f('password')} required={!modal.agent} minLength={6} />
          <Select label="Assign Hub" {...f('hub_id')}>
            <option value="">— No hub —</option>
            {hubs.map(h => <option key={h.id} value={h.id}>{h.name} ({h.city})</option>)}
          </Select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            <Button type="button" variant="secondary" onClick={() => setModal({ open: false, agent: null })}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
