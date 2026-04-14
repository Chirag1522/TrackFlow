import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Spinner } from '../../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

const STATUS_COLORS = {
  Created: '#6b7280', Picked_Up: '#3b82f6', At_Sorting_Facility: '#8b5cf6',
  In_Transit: '#6366f1', Out_for_Delivery: '#f59e0b', Delivered: '#10b981',
  Failed: '#ef4444', Retry: '#f97316', Returned: '#9ca3af',
};

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [byStatus, setByStatus] = useState([]);
  const [agentPerf, setAgentPerf] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/summary'),
      api.get('/analytics/shipments-by-status'),
      api.get('/analytics/agent-performance'),
    ]).then(([s, b, a]) => {
      setSummary(s.data); setByStatus(b.data); setAgentPerf(a.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const total = summary?.total ?? 0;
  const delivered = summary?.delivered ?? 0;
  const failed = summary?.failed ?? 0;
  const pending = summary?.pending ?? 0;
  const deliveryRate = total ? Math.round((delivered / total) * 100) : 0;

  const MetricCard = ({ title, value, subtitle, icon: Icon, iconBg, iconColor }) => (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Track performance, delivery outcomes, and agent execution quality.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Total Shipments"
          value={total}
          subtitle="All statuses"
          icon={Package}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />
        <MetricCard
          title="Delivered"
          value={delivered}
          subtitle="Completed shipments"
          icon={CheckCircle}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <MetricCard
          title="Pending"
          value={pending}
          subtitle="Still moving"
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <MetricCard
          title="Failed"
          value={failed}
          subtitle="Needs intervention"
          icon={XCircle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
        <MetricCard
          title="Delivery Rate"
          value={`${deliveryRate}%`}
          subtitle="Delivered vs total"
          icon={TrendingUp}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shipments by Status */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-6">Shipments by Status</h2>
          {byStatus.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byStatus} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} tickFormatter={s => s.replace(/_/g, ' ')} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v, n, p) => [v, p.payload.status.replace(/_/g, ' ')]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {byStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Agent Performance */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-6">Agent Performance</h2>
          {agentPerf.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No agents yet</p>
          ) : (
            <div className="space-y-4">
              {agentPerf.map(a => (
                <div key={a.agent_id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{a.agent_name}</span>
                    <span className="text-xs text-gray-400">{a.delivered}/{a.total} delivered</span>
                  </div>
                  <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-gray-100">
                    {a.total > 0 && (
                      <>
                        <div className="bg-green-500 rounded-l-full" style={{ width: `${(a.delivered / a.total) * 100}%` }} />
                        <div className="bg-red-400" style={{ width: `${(a.failed / a.total) * 100}%` }} />
                      </>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>✅ {a.delivered} delivered</span>
                    <span>❌ {a.failed} failed</span>
                    <span>📦 {a.total} total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
