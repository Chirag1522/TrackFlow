import { useEffect, useRef, useState } from 'react';

export default function QRScanner({ onScan, onError }) {
  const instanceRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (instanceRef.current) {
        instanceRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanner = async () => {
    try {
      const { Html5QrcodeScanner } = await import('html5-qrcode');
      if (instanceRef.current) return;

      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: 250,
          aspectRatio: 1.0,
          disableFlip: false,
          showTorchButtonIfSupported: true
        },
        /* verbose= */ false
      );
      
      instanceRef.current = scanner;

      scanner.render(
        (decodedText) => {
          scanner.clear().catch(() => {});
          instanceRef.current = null;
          setStarted(false);
          setError('');
          onScan(decodedText);
        },
        (err) => {
          // Ignore "No MultiFormat" noise
          if (err && !err.toString().includes('No MultiFormat')) {
            console.warn('QR Scanner warning:', err);
          }
        }
      );
      setStarted(true);
      setError('');
    } catch (err) {
      let errorMsg = err.message || 'Failed to start camera';
      
      if (err.message?.includes('NotReadableError') || err.message?.includes('NotAllowedError')) {
        errorMsg = 'Camera permission denied. Please allow camera access in your browser settings and try again.';
      } else if (err.message?.includes('NotFoundError')) {
        errorMsg = 'No camera found. Please connect a camera device and try again.';
      }
      
      setError(errorMsg);
      onError?.(err);
    }
  };

  const stopScanner = () => {
    if (instanceRef.current) {
      instanceRef.current.stop().catch(() => {});
      instanceRef.current = null;
    }
    setStarted(false);
    setError('');
  };

  return (
    <div>
      {!started && (
        <button
          onClick={startScanner}
          className="w-full btn-primary py-3 text-base rounded-xl"
        >
          📷 Start Camera Scanner
        </button>
      )}
      {started && (
        <button
          onClick={stopScanner}
          className="w-full btn-secondary py-3 text-base rounded-xl mb-4"
        >
          ✕ Stop Scanner
        </button>
      )}
      <div id="qr-reader" className={started ? 'mt-4 rounded-xl overflow-hidden' : 'hidden'} />
      <div id="qr-reader-hidden" className="hidden" />
      {error && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-700">⚠️ {error}</p>
        </div>
      )}
    </div>
  );
}
