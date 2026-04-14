import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import QRScanner from '../../components/tracking/QRScanner';
import TrackingTimeline from '../../components/tracking/TrackingTimeline';
import StatusBadge from '../../components/shipment/StatusBadge';
import SimpleMap from '../../components/tracking/SimpleMap';
import useAuthStore from '../../store/authStore';
import { Spinner } from '../../components/ui';
import { Search, Package, MapPin, Calendar, QrCode, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

const TRACKING_POLL_INTERVAL_MS = 2000;

const extractTrackingId = (value) => {
  if (!value) return '';
  const match = String(value).toUpperCase().match(/TRK-\d{8}-[A-Z0-9]{6}/);
  return match ? match[0] : String(value).trim().toUpperCase();
};

export default function TrackPage() {
  const { tracking_id: paramId } = useParams();
  const [trackingId, setTrackingId] = useState(paramId || '');
  const [shipment, setShipment] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [returnRequesting, setReturnRequesting] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const pollTimerRef = useRef(null);
  const pollInFlightRef = useRef(false);
  const canRequestReturn = isAuthenticated && ['customer', 'admin', 'super_admin'].includes(user?.role);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const applyTrackingPayload = (shipmentData) => {
    setShipment(shipmentData || null);

    const gpsPayload = shipmentData?.gps || {};
    const nextCurrentLocation = gpsPayload.current_location || null;
    const nextHistory = Array.isArray(gpsPayload.location_history) ? gpsPayload.location_history : [];

    setCurrentLocation(nextCurrentLocation);
    setLocationHistory(nextHistory);
  };

  const startPolling = (id) => {
    const normalizedId = extractTrackingId(id);
    if (!normalizedId) return;

    stopPolling();

    pollTimerRef.current = window.setInterval(async () => {
      if (pollInFlightRef.current) return;

      pollInFlightRef.current = true;
      try {
        const res = await api.get(`/track/${normalizedId}`);
        applyTrackingPayload(res.data);
        setError('');
      } catch (err) {
        // Keep the last known position on temporary polling failures.
        console.error('Tracking poll failed:', err?.message || err);
      } finally {
        pollInFlightRef.current = false;
      }
    }, TRACKING_POLL_INTERVAL_MS);
  };

  const searchTracking = async (id, updateUrl = true) => {
    const normalizedId = extractTrackingId(id);
    if (!normalizedId) {
      setError('Enter a valid tracking ID, for example: TRK-20260414-GCWBKO');
      return;
    }

    stopPolling();
    setLoading(true);
    setError('');
    setShipment(null);
    setCurrentLocation(null);
    setLocationHistory([]);

    try {
      const res = await api.get(`/track/${normalizedId}`);
      const shipmentData = res.data;
      applyTrackingPayload(shipmentData);
      setTrackingId(normalizedId);
      
      if (updateUrl) {
        navigate(`/track/${normalizedId}`, { replace: true });
      }

      startPolling(normalizedId);
    } catch (err) {
      const responseData = err?.response?.data;
      const apiError = responseData?.error || responseData?.message;

      if (apiError) {
        setError(apiError);
      } else if (err?.code === 'ERR_NETWORK') {
        setError('Unable to reach tracking server. Please ensure API is running on port 5000.');
      } else {
        setError('Shipment not found. Please check the tracking ID.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const normalized = extractTrackingId(trackingId);
    setTrackingId(normalized);
    await searchTracking(normalized, true);
  };

  const handleScan = (decodedText) => {
    setShowScanner(false);
    const id = extractTrackingId(decodedText);
    setTrackingId(id);
    searchTracking(id, true);
  };

  const handleReturn = async () => {
    if (!window.confirm('Request return for this shipment? It will be sent back to you.')) return;
    setReturnRequesting(true);
    try {
      await api.patch(`/track/${shipment.tracking_id}/request-return`);
      alert('✓ Return request submitted! You will receive a return notification email.');
      setShipment(prev => ({ ...prev, status: 'Returned' }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to request return');
    } finally { setReturnRequesting(false); }
  };

  // Auto-search if param provided
  useEffect(() => {
    if (paramId) {
      const normalizedParamId = extractTrackingId(paramId);
      setTrackingId(normalizedParamId);
      searchTracking(normalizedParamId, false);
    }
  }, [paramId]);

  // Cleanup polling timer on unmount.
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">Track Your Shipment</h1>
          <p className="mt-2 text-base text-gray-500">Scan QR code or enter tracking ID to get live shipment updates.</p>
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
            placeholder="e.g. TRK-20260410-ABC123"
            className="input-field text-base"
          />
          <button type="submit" disabled={loading} className="btn-primary px-6 py-2.5 text-base flex items-center justify-center gap-2">
            <Search size={18} />
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>

        <div className="mt-4">
          <button
            onClick={() => setShowScanner(!showScanner)}
            className="w-full rounded-lg border border-orange-400 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <QrCode size={18} />
              {showScanner ? 'Hide QR Scanner' : 'Scan QR Code'}
            </span>
          </button>
        </div>

        {showScanner && (
          <div className="mt-6 rounded-xl border border-orange-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-md bg-orange-50 p-2 text-orange-600">
                <QrCode size={18} />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Scan Shipment QR</h3>
            </div>
            <QRScanner onScan={handleScan} />
          </div>
        )}
      </section>

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      )}

      {error && !shipment && (
        <section className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <Package size={36} className="mx-auto mb-3 text-red-300" />
          <p className="font-medium text-red-700">{error}</p>
        </section>
      )}

      {shipment && (
        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Tracking ID</p>
                  <p className="font-mono text-2xl font-bold text-gray-900">{shipment.tracking_id}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={shipment.status} />
                  {currentLocation && (
                    <div className="text-xs text-orange-600 font-semibold animate-pulse">
                      Live Tracking (Polling)
                    </div>
                  )}
                  {shipment.status === 'Failed' && canRequestReturn && (
                    <button
                      onClick={handleReturn}
                      disabled={returnRequesting}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      <RotateCcw size={15} />
                      {returnRequesting ? 'Requesting...' : 'Request Return'}
                    </button>
                  )}
                  {shipment.status === 'Failed' && !canRequestReturn && (
                    <p className="text-xs text-gray-500">Sign in as customer to request return</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-5 sm:grid-cols-3">
                <div>
                  <p className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-gray-400"><MapPin size={12} />From</p>
                  <p className="text-sm font-semibold text-gray-900">{shipment.sender?.name}</p>
                  <p className="text-sm text-gray-500">{shipment.origin_hub?.city || shipment.sender?.city}</p>
                </div>
                <div>
                  <p className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-gray-400"><MapPin size={12} />To</p>
                  <p className="text-sm font-semibold text-gray-900">{shipment.receiver?.name}</p>
                  <p className="text-sm text-gray-500">{shipment.destination_hub?.city || shipment.receiver?.city}</p>
                </div>
                <div>
                  <p className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-gray-400"><Calendar size={12} />Est. Delivery</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {shipment.estimated_delivery ? format(new Date(shipment.estimated_delivery), 'MMM d, yyyy') : 'Not available'}
                  </p>
                </div>
              </div>
            </div>

            {(currentLocation || locationHistory.length > 0) && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900 inline-flex items-center gap-2">
                  <MapPin size={20} className="text-orange-500" />
                  Live Location Tracking
                </h2>
                <SimpleMap
                  shipment={shipment}
                  currentLocation={currentLocation}
                  locationHistory={locationHistory}
                />
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-lg font-semibold text-gray-900">Shipment History</h2>
              <TrackingTimeline events={shipment.events} />
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
              <p className="mb-3 text-sm font-medium text-gray-600">Scan to Share Tracking</p>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(window.location.href)}`}
                alt="Tracking QR Code"
                className="mx-auto rounded-lg border border-gray-200"
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Shipment Snapshot</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Current status</span>
                  <StatusBadge status={shipment.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Events logged</span>
                  <span className="font-semibold text-gray-900">{shipment.events?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Tracking visibility</span>
                  <span className="font-semibold text-gray-900">Public</span>
                </div>
                {currentLocation && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">GPS Updates</span>
                    <span className="font-semibold text-gray-900">{locationHistory.length}</span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}
