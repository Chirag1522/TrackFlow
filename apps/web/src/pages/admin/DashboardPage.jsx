import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Spinner } from '../../components/ui';
import { Package, CheckCircle, XCircle, Clock, Users, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [activeAgents, setActiveAgents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/analytics/summary'), api.get('/shipments?limit=8'), api.get('/users')])
      .then(([s, r, u]) => {
        setSummary(s.data);
        setRecent(r.data.slice(0, 8));
        setActiveAgents(u.data.filter((user) => user.role === 'agent' && user.is_active).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const total = summary?.total ?? 0;
  const delivered = summary?.delivered ?? 0;
  const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

  const StatCard = ({ title, value, icon: Icon, iconBg, iconColor, subtitle }) => (
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Operations Dashboard</h1>
        <p className="mt-1 text-gray-500">Shipment flow, delivery performance, and quick actions in one place.</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Total Shipments"
          value={total}
          subtitle="All records"
          icon={Package}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />
        <StatCard
          title="Delivered"
          value={delivered}
          subtitle="Successfully completed"
          icon={CheckCircle}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Pending"
          value={summary?.pending ?? 0}
          subtitle="In progress"
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Failed"
          value={summary?.failed ?? 0}
          subtitle="Requires action"
          icon={XCircle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
        <StatCard
          title="Active Agents"
          value={activeAgents}
          subtitle="Ready for assignments"
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent Shipments</h2>
              <p className="text-sm text-gray-500">Latest activity from your tenant</p>
            </div>
            <Link to="/admin/shipments" className="text-sm font-medium text-orange-600 hover:text-orange-700">View all</Link>
          </div>

          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No shipments yet.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((shipment) => (
                <div key={shipment.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-gray-900">{shipment.tracking_id}</p>
                    <p className="text-xs text-gray-500">
                      {shipment.receiver_info?.name} · {shipment.receiver_info?.city}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                    {shipment.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-md bg-emerald-50 p-2 text-emerald-600">
                <TrendingUp size={16} />
              </div>
              <h3 className="font-semibold text-gray-900">Delivery Rate</h3>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{deliveryRate}%</p>
            <p className="mt-1 text-xs text-gray-500">Calculated from delivered vs total shipments</p>
            <div className="mt-4 h-2 w-full rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${deliveryRate}%` }} />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-gray-900">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/admin/shipments" className="block rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100">
                Manage Shipments
              </Link>
              <Link to="/admin/agents" className="block rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                Manage Agents
              </Link>
              <Link to="/admin/analytics" className="block rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                View Analytics
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
