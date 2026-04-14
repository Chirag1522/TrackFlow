import { useEffect, useState, useMemo } from 'react';
import api from '../../api/axios';
import { Table, Modal, Button, Input, Select, Badge } from '../../components/ui';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Building2, Activity, Ban, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

const EMPTY_FORM = { name: '', slug: '', plan_id: '', plan_valid_until: '', status: 'active' };

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, tenant: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const stats = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter((tenant) => tenant.status === 'active').length;
    const inactive = total - active;
    const withPlan = tenants.filter((tenant) => tenant.plan_id).length;
    return { total, active, inactive, withPlan };
  }, [tenants]);

  const load = async () => {
    setLoading(true);
    try {
      const [t, p] = await Promise.all([api.get('/tenants'), api.get('/plans')]);
      setTenants(t.data);
      setPlans(p.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setError(''); setModal({ open: true, tenant: null }); };
  const openEdit = (tenant) => {
    setForm({ name: tenant.name, slug: tenant.slug, plan_id: tenant.plan_id || '', plan_valid_until: tenant.plan_valid_until ? tenant.plan_valid_until.slice(0, 10) : '', status: tenant.status });
    setError('');
    setModal({ open: true, tenant });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (modal.tenant) await api.patch(`/tenants/${modal.tenant.id}`, form);
      else await api.post('/tenants', form);
      setModal({ open: false, tenant: null });
      load();
    } catch (err) { setError(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (tenant) => {
    try {
      await api.patch(`/tenants/${tenant.id}`, { status: tenant.status === 'active' ? 'inactive' : 'active' });
      load();
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this tenant? This cannot be undone.')) return;
    try { await api.delete(`/tenants/${id}`); load(); } catch {}
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'slug', label: 'Slug', render: (r) => <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{r.slug}</code> },
    { key: 'plan', label: 'Plan', render: (r) => r.plan ? <Badge color="orange">{r.plan.name}</Badge> : <span className="text-gray-400">—</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge color={r.status === 'active' ? 'green' : 'red'}>{r.status}</Badge> },
    { key: 'plan_valid_until', label: 'Plan Expires', render: (r) => r.plan_valid_until ? format(new Date(r.plan_valid_until), 'MMM d, yyyy') : '—' },
    { key: 'created_at', label: 'Created', render: (r) => format(new Date(r.created_at), 'MMM d, yyyy') },
    {
      key: 'actions', label: '', render: (r) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(r)} className="text-sm font-medium" style={{ color: '#F74B25' }}><Edit size={15} /></button>
          <button onClick={() => toggleStatus(r)} className="text-gray-500 hover:text-gray-700">
            {r.status === 'active' ? <ToggleRight size={15} className="text-green-600" /> : <ToggleLeft size={15} />}
          </button>
          <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-500 text-sm mt-1">Manage multi-tenant organizations and plan assignments.</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> New Tenant</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Tenants</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-2 text-orange-600"><Building2 size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Active</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.active}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><Activity size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Inactive</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.inactive}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-2 text-red-600"><Ban size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">With Plan</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.withPlan}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600"><CreditCard size={18} /></div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-0 overflow-hidden shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Tenant Registry</h2>
        </div>
        <Table columns={columns} data={tenants} loading={loading} emptyMessage="No tenants yet" />
      </div>

      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, tenant: null })}
        title={modal.tenant ? 'Edit Tenant' : 'New Tenant'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Company Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Slug (URL-safe)" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} placeholder="my-courier-co" required />
          <Select label="Subscription Plan" value={form.plan_id} onChange={e => setForm(f => ({ ...f, plan_id: e.target.value }))}>
            <option value="">— No plan —</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price}/mo)</option>)}
          </Select>
          <Input label="Plan Valid Until" type="date" value={form.plan_valid_until} onChange={e => setForm(f => ({ ...f, plan_valid_until: e.target.value }))} />
          <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            <Button type="button" variant="secondary" onClick={() => setModal({ open: false, tenant: null })}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
