import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Spinner } from '../../components/ui';
import { Building2, CreditCard, Activity, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SuperDashboardPage() {
  const [stats, setStats] = useState({ tenants: 0, plans: 0, activeTenants: 0 });
  const [recentTenants, setRecentTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/tenants'), api.get('/plans')]).then(([t, p]) => {
      const tenants = t.data || [];
      setStats({
        tenants: tenants.length,
        activeTenants: tenants.filter((tenant) => tenant.status === 'active').length,
        plans: p.data.length,
      });
      setRecentTenants(tenants.slice(0, 6));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const StatCard = ({ title, value, subtitle, icon: Icon, iconBg, iconColor }) => (
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
        <h1 className="text-3xl font-bold text-gray-900">Platform Dashboard</h1>
        <p className="mt-1 text-gray-500">Control tenants, plans, and platform-wide growth from a single dashboard.</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Tenants"
          value={stats.tenants}
          subtitle="Across all accounts"
          icon={Building2}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />
        <StatCard
          title="Active Tenants"
          value={stats.activeTenants}
          subtitle="Currently operating"
          icon={Activity}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Subscription Plans"
          value={stats.plans}
          subtitle="Published plans"
          icon={CreditCard}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Inactive Tenants"
          value={Math.max(stats.tenants - stats.activeTenants, 0)}
          subtitle="Need review"
          icon={Layers}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent Tenants</h2>
              <p className="text-sm text-gray-500">Latest organizations onboarded to the platform</p>
            </div>
            <Link to="/super-admin/tenants" className="text-sm font-medium text-orange-600 hover:text-orange-700">View all</Link>
          </div>

          {recentTenants.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No tenants found.</p>
          ) : (
            <div className="space-y-2">
              {recentTenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{tenant.name}</p>
                    <p className="text-xs text-gray-500">{tenant.slug}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tenant.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {tenant.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-gray-900">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/super-admin/tenants" className="block rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100">
                Add Tenant
              </Link>
              <Link to="/super-admin/plans" className="block rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                Add Plan
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-6">
            <h3 className="font-semibold text-gray-900">Health Snapshot</h3>
            <p className="mt-2 text-sm text-gray-600">
              {stats.activeTenants} out of {stats.tenants} tenants are active.
            </p>
            <div className="mt-4 h-2 w-full rounded-full bg-white/70">
              <div
                className="h-2 rounded-full bg-orange-500"
                style={{ width: `${stats.tenants > 0 ? Math.round((stats.activeTenants / stats.tenants) * 100) : 0}%` }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
