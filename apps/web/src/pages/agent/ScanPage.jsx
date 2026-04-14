import { useState, useRef } from 'react';
import api from '../../api/axios';
import QRScanner from '../../components/tracking/QRScanner';
import TrackingTimeline from '../../components/tracking/TrackingTimeline';
import StatusBadge from '../../components/shipment/StatusBadge';
import { Spinner } from '../../components/ui';
import { QrCode, Search, Package, MapPin, Calendar, X, Upload } from 'lucide-react';
import { format } from 'date-fns';
import jsQR from 'jsqr';

export default function ScanPage() {
  const [manualId, setManualId] = useState('');
  const [scanned, setScanned] = useState('');
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const fetchTracking = async (trackingId) => {
    if (!trackingId.trim()) return;
    
    setLoading(true);
    setError('');
    setShipment(null);
    
    try {
      const res = await api.get(`/track/${trackingId.trim()}`);
      setShipment(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Shipment not found. Please check the tracking ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleQRUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setShipment(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code) {
            const match = code.data.match(/TRK-\d{8}-[A-Z0-9]{6}/);
            const trackingId = match ? match[0] : code.data.trim();
            setScanned(code.data);
            setManualId('');
            fetchTracking(trackingId);
          } else {
            setError('Could not read QR code from image. Please try another image or scan directly.');
            setLoading(false);
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Error processing image. Please try another file.');
      setLoading(false);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleScan = (text) => {
    setScanned(text);
    setManualId('');
    setShipment(null);
    
    // Extract tracking ID from URL if it's a full URL
    const match = text.match(/TRK-\d{8}-[A-Z0-9]{6}/);
    const trackingId = match ? match[0] : text.trim();
    
    fetchTracking(trackingId);
  };

  const handleManual = (e) => {
    e.preventDefault();
    setScanned('');
    fetchTracking(manualId);
  };

  const clearResults = () => {
    setShipment(null);
    setError('');
    setManualId('');
    setScanned('');
  };

  return (
    <div className="space-y-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Shipment</h1>
          <p className="text-slate-600">Use QR scan or manual lookup to inspect live shipment history.</p>
        </div>

        {/* Scanner Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <QrCode size={22} className="text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Camera Scanner</h2>
          </div>
          <QRScanner onScan={handleScan} />
          {scanned && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 font-medium">✅ Scanned: {scanned}</p>
            </div>
          )}
        </div>

        {/* Upload QR Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Upload size={22} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Upload QR Image</h2>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleQRUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center gap-2">
              <Upload size={24} className="text-blue-600" />
              <span className="font-medium text-gray-900">Click to upload QR code image</span>
              <span className="text-xs text-slate-500">or drag and drop</span>
            </div>
          </button>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Search size={22} className="text-slate-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Enter Manually</h2>
          </div>
          <form onSubmit={handleManual} className="flex gap-3">
            <input
              type="text"
              className="input-field flex-1"
              placeholder="TRK-20260409-GUV060"
              value={manualId}
              onChange={e => setManualId(e.target.value.toUpperCase())}
            />
            <button type="submit" disabled={loading} className="btn-primary px-6">
              {loading ? '...' : 'Go'}
            </button>
          </form>
        </div>
      </div>

      {/* Tracking Results */}
      {(loading || shipment || error) && (
        <div className="mt-12 max-w-4xl mx-auto">
          {loading && (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-600" />
                <p className="text-slate-600 font-medium">Loading shipment details...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100 p-6 text-center shadow-sm">
              <Package size={48} className="text-red-300 mx-auto mb-3" />
              <p className="text-red-700 font-medium mb-4 text-lg">{error}</p>
              <button
                onClick={clearResults}
                className="inline-flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all"
              >
                ← Try Another ID
              </button>
            </div>
          )}

          {shipment && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Shipment Details</h2>
                <button
                  onClick={clearResults}
                  className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 flex items-center justify-center transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Status Card */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-2">Tracking ID</p>
                    <p className="text-2xl font-bold text-gray-900 font-mono">{shipment.tracking_id}</p>
                  </div>
                  <StatusBadge status={shipment.status} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-2 flex items-center gap-1"><MapPin size={14} />From</p>
                    <p className="text-base font-semibold text-gray-900">{shipment.sender?.name}</p>
                    <p className="text-sm text-slate-600">{shipment.origin_hub?.city || shipment.sender?.city}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-2 flex items-center gap-1"><MapPin size={14} />To</p>
                    <p className="text-base font-semibold text-gray-900">{shipment.receiver?.name}</p>
                    <p className="text-sm text-slate-600">{shipment.destination_hub?.city || shipment.receiver?.city}</p>
                  </div>
                  {shipment.estimated_delivery && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-2 flex items-center gap-1"><Calendar size={14} />Est. Delivery</p>
                      <p className="text-base font-semibold text-gray-900">{format(new Date(shipment.estimated_delivery), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              {shipment.events && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-900 mb-8">Shipment History</h3>
                  <TrackingTimeline events={shipment.events} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
