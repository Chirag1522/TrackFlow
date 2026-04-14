import { useEffect, useState, useMemo } from 'react';
import api from '../../api/axios';
import { Table, Modal, Button, Input } from '../../components/ui';
import { Plus, Edit, CreditCard, DollarSign, Package, Users } from 'lucide-react';

const EMPTY = { name: '', price: '', max_shipments: '', max_agents: '' };

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, plan: null });
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const stats = useMemo(() => {
    const totalPlans = plans.length;
    const avgPrice = totalPlans
      ? (plans.reduce((sum, plan) => sum + Number(plan.price || 0), 0) / totalPlans).toFixed(2)
      : '0.00';
    const maxShipmentCap = totalPlans
      ? Math.max(...plans.map((plan) => Number(plan.max_shipments || 0)))
      : 0;
    const maxAgentCap = totalPlans
      ? Math.max(...plans.map((plan) => Number(plan.max_agents || 0)))
      : 0;
    return { totalPlans, avgPrice, maxShipmentCap, maxAgentCap };
  }, [plans]);

  const load = () => { setLoading(true); api.get('/plans').then(r => setPlans(r.data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openCreate = () => { setForm(EMPTY); setError(''); setModal({ open: true, plan: null }); };
  const openEdit = (plan) => { setForm({ name: plan.name, price: plan.price, max_shipments: plan.max_shipments, max_agents: plan.max_agents }); setError(''); setModal({ open: true, plan }); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (modal.plan) await api.patch(`/plans/${modal.plan.id}`, form);
      else await api.post('/plans', form);
      setModal({ open: false, plan: null }); load();
    } catch (err) { setError(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const f = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });

  const columns = [
    { key: 'name', label: 'Plan Name' },
    { key: 'price', label: 'Price/mo', render: r => `$${Number(r.price).toFixed(2)}` },
    { key: 'max_shipments', label: 'Max Shipments', render: r => r.max_shipments.toLocaleString() },
    { key: 'max_agents', label: 'Max Agents' },
    { key: 'actions', label: '', render: r => <button onClick={() => openEdit(r)} className="text-sm font-medium" style={{ color: '#F74B25' }}><Edit size={15} /></button> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-gray-500 text-sm mt-1">Define pricing tiers and product limits for tenants.</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> New Plan</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Plans</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalPlans}</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-2 text-orange-600"><CreditCard size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Avg Monthly Price</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">${stats.avgPrice}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><DollarSign size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Max Shipment Cap</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.maxShipmentCap}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600"><Package size={18} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Max Agent Cap</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.maxAgentCap}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600"><Users size={18} /></div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-0 overflow-hidden shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Plan Catalog</h2>
        </div>
        <Table columns={columns} data={plans} loading={loading} emptyMessage="No plans yet" />
      </div>
      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, plan: null })} title={modal.plan ? 'Edit Plan' : 'New Plan'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Plan Name" {...f('name')} required />
          <Input label="Price (USD/month)" type="number" step="0.01" {...f('price')} required />
          <Input label="Max Shipments/month" type="number" {...f('max_shipments')} required />
          <Input label="Max Agents" type="number" {...f('max_agents')} required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            <Button type="button" variant="secondary" onClick={() => setModal({ open: false, plan: null })}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
