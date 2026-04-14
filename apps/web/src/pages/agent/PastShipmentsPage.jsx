import { useEffect, useMemo, useState } from 'react';
import { Clock3, Filter, Search, RefreshCw, CheckCircle2, Archive } from 'lucide-react';
import api from '../../api/axios';
import StatusBadge from '../../components/shipment/StatusBadge';
import { Button, Select, Spinner } from '../../components/ui';

const DATE_FILTERS = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

const STAGE_OPTIONS = [
  { value: 'all', label: 'All stages' },
  { value: 'PICKUP', label: 'Pickup' },
  { value: 'DELIVERY', label: 'Delivery' },
];

const getItemDate = (item) => {
  const timestamp = item.updated_at || item.created_at;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
};

export default function PastShipmentsPage() {
  const [loading, setLoading] = useState(true);
  const [workitems, setWorkitems] = useState({ pickup: [], delivery: [], total: 0 });
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('all');
  const [status, setStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/shipments/workitems');
      setWorkitems(res.data);
    } catch {
      setWorkitems({ pickup: [], delivery: [], total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pastShipments = useMemo(() => {
    const completedPickup = workitems.pickup
      .filter((item) => item.isCompleted)
      .map((item) => ({ ...item, stage: 'PICKUP' }));

    const completedDelivery = workitems.delivery
      .filter((item) => item.isCompleted)
      .map((item) => ({ ...item, stage: 'DELIVERY' }));

    return [...completedPickup, ...completedDelivery];
  }, [workitems.delivery, workitems.pickup]);

  const availableStatuses = useMemo(() => {
    const uniqueStatuses = [...new Set(pastShipments.map((item) => item.status).filter(Boolean))];
    return uniqueStatuses.sort((a, b) => a.localeCompare(b));
  }, [pastShipments]);

  const filteredShipments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const now = new Date();

    const matchesDateFilter = (item) => {
      if (dateFilter === 'all') return true;
      const itemDate = getItemDate(item);
      if (!itemDate) return false;

      if (dateFilter === 'today') {
        return itemDate.toDateString() === now.toDateString();
      }

      const diffMs = now.getTime() - itemDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (dateFilter === '7d') return diffDays <= 7;
      if (dateFilter === '30d') return diffDays <= 30;
      return true;
    };

    const rows = pastShipments.filter((item) => {
      if (stage !== 'all' && item.stage !== stage) return false;
      if (status !== 'all' && item.status !== status) return false;
      if (!matchesDateFilter(item)) return false;

      if (!normalizedQuery) return true;

      const contact = item.stage === 'PICKUP' ? item.sender_info : item.receiver_info;
      const haystack = [
        item.tracking_id,
        contact?.name,
        contact?.phone,
        contact?.city,
        item.origin_hub?.name,
        item.destination_hub?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    return rows.sort((a, b) => {
      const aTime = getItemDate(a)?.getTime() ?? 0;
      const bTime = getItemDate(b)?.getTime() ?? 0;
      return sortBy === 'oldest' ? aTime - bTime : bTime - aTime;
    });
  }, [dateFilter, pastShipments, query, sortBy, stage, status]);

  const stats = useMemo(() => {
    const deliveredCount = pastShipments.filter((item) => item.status === 'Delivered').length;
    const returnedCount = pastShipments.filter((item) => item.status === 'Returned').length;

    return {
      total: pastShipments.length,
      delivered: deliveredCount,
      returned: returnedCount,
    };
  }, [pastShipments]);

  const resetFilters = () => {
    setQuery('');
    setStage('all');
    setStatus('all');
    setDateFilter('all');
    setSortBy('newest');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Past Shipments</h1>
        <p className="mt-1 text-sm text-gray-500">Review completed pickup and delivery history with smart filters.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Total History</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <Archive size={18} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Delivered</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-semibold text-gray-900">{stats.delivered}</p>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 size={18} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Returned</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-semibold text-gray-900">{stats.returned}</p>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <Clock3 size={18} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-800">Filters</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Search</label>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input-field pl-9"
                placeholder="Tracking ID, name, phone, city..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <Select label="Stage" value={stage} onChange={(e) => setStage(e.target.value)}>
            {STAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>

          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {availableStatuses.map((value) => (
              <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>
            ))}
          </Select>

          <Select label="Date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            {DATE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Select label="Sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>

          <div className="flex items-end gap-2 xl:col-span-4">
            <Button type="button" variant="secondary" onClick={resetFilters}>Reset</Button>
            <Button type="button" variant="secondary" onClick={load}>
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{filteredShipments.length}</span> shipment{filteredShipments.length === 1 ? '' : 's'}
        </p>

        {filteredShipments.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
            <Archive size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No shipments match your filters</p>
          </div>
        ) : (
          filteredShipments.map((item) => {
            const contact = item.stage === 'PICKUP' ? item.sender_info : item.receiver_info;
            const hubLabel = item.stage === 'PICKUP'
              ? `${item.origin_hub?.name || 'Origin Hub'} (${item.origin_hub?.city || 'N/A'})`
              : `${item.destination_hub?.name || 'Destination Hub'} (${item.destination_hub?.city || 'N/A'})`;

            return (
              <div key={`${item.id}-${item.stage}`} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-slate-700">{item.tracking_id}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.status} />
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold tracking-wide text-slate-700">
                        {item.stage === 'PICKUP' ? 'Pickup' : 'Delivery'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-700">{contact?.name || 'Contact unavailable'}</p>
                    <p className="text-xs text-slate-500">{contact?.city || 'City not available'}</p>
                    <p className="mt-1 text-xs text-slate-500">{hubLabel}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Updated</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{formatDateTime(item.updated_at || item.created_at)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
