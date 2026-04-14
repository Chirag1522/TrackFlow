import { useEffect, useRef, useState } from 'react';
import { MapPin, AlertCircle, Navigation, Copy, Check } from 'lucide-react';

/**
 * HubMap Component
 * Interactive map for selecting hub location
 * Click on map to select coordinates, similar to Google Maps location picker
 */
export default function HubMap({ onLocationSelect, initialLocation = null, readOnly = false }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    if (window.google?.maps) {
      initializeMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&libraries=geometry,drawing,places`;
    script.async = true;
    script.defer = true;
    script.onload = initializeMap;
    script.onerror = () => setError('Failed to load Google Maps');
    document.head.appendChild(script);

    return () => {
      if (!document.head.contains(script)) document.head.appendChild(script);
    };
  }, []);

  // Initialize map
  const initializeMap = () => {
    if (!mapRef.current || !window.google?.maps) return;

    const defaultCenter = initialLocation
      ? { lat: initialLocation.latitude, lng: initialLocation.longitude }
      : { lat: 28.6139, lng: 77.209 }; // Delhi

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      zoom: 15,
      center: defaultCenter,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });

    setMap(mapInstance);

    // Add click listener
    if (!readOnly) {
      mapInstance.addListener('click', async (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        setSelectedLocation({ latitude: lat, longitude: lng });
        onLocationSelect({ latitude: lat, longitude: lng });

        // Move/create marker
        if (marker) {
          marker.setPosition({ lat, lng });
        } else {
          const newMarker = new window.google.maps.Marker({
            position: { lat, lng },
            map: mapInstance,
            draggable: true,
            title: 'Hub Location',
            animation: window.google.maps.Animation.DROP,
          });

          // Update location when marker is dragged
          newMarker.addListener('dragend', () => {
            const newPos = newMarker.getPosition();
            const newLat = newPos.lat();
            const newLng = newPos.lng();
            setSelectedLocation({ latitude: newLat, longitude: newLng });
            onLocationSelect({ latitude: newLat, longitude: newLng });
          });

          setMarker(newMarker);
        }
      });
    }

    // Add existing marker if initial location provided
    if (initialLocation) {
      const existingMarker = new window.google.maps.Marker({
        position: { lat: initialLocation.latitude, lng: initialLocation.longitude },
        map: mapInstance,
        draggable: !readOnly,
        title: 'Hub Location',
      });

      if (!readOnly) {
        existingMarker.addListener('dragend', () => {
          const pos = existingMarker.getPosition();
          setSelectedLocation({ latitude: pos.lat(), longitude: pos.lng() });
          onLocationSelect({ latitude: pos.lat(), longitude: pos.lng() });
        });
      }

      setMarker(existingMarker);
    }

    // Add geolocation button
    const userLocationButton = document.createElement('button');
    userLocationButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-12.5c-1.93 0-3.5 1.57-3.5 3.5S10.07 14.5 12 14.5s3.5-1.57 3.5-3.5S13.93 7.5 12 7.5z"/></svg>';
    userLocationButton.style.cssText = `
      background-color: white;
      border: 2px solid #ccc;
      border-radius: 2px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      cursor: pointer;
      margin: 10px;
      padding: 8px;
      text-align: center;
      color: #333;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    userLocationButton.onclick = (e) => {
      e.preventDefault();
      if (navigator.geolocation && !readOnly) {
        navigator.geolocation.getCurrentPosition((position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          mapInstance.setCenter({ lat, lng });
          mapInstance.setZoom(17);

          setSelectedLocation({ latitude: lat, longitude: lng });
          onLocationSelect({ latitude: lat, longitude: lng });

          if (marker) {
            marker.setPosition({ lat, lng });
          } else {
            const newMarker = new window.google.maps.Marker({
              position: { lat, lng },
              map: mapInstance,
              draggable: true,
              title: 'Hub Location',
            });

            newMarker.addListener('dragend', () => {
              const pos = newMarker.getPosition();
              setSelectedLocation({ latitude: pos.lat(), longitude: pos.lng() });
              onLocationSelect({ latitude: pos.lat(), longitude: pos.lng() });
            });

            setMarker(newMarker);
          }
        });
      }
    };

    if (!readOnly) {
      mapInstance.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(userLocationButton);
    }
  };

  const copyCoordinates = () => {
    if (selectedLocation) {
      const text = `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8">
        <AlertCircle size={32} className="mb-2 text-red-600" />
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div
        ref={mapRef}
        className="h-80 w-full rounded-lg border border-gray-200 shadow-sm"
        style={{ minHeight: '320px' }}
      />

      {!readOnly && (
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          <span className="font-semibold">Tip:</span> Click on the map to place marker, or use your current location button (GPS icon).
        </p>
      )}

      {/* Coordinates Display */}
      {selectedLocation && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <MapPin size={20} className="mt-0.5 text-orange-600" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Selected Coordinates</p>
                <p className="font-mono text-lg font-semibold text-gray-900">
                  {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                </p>
              </div>
            </div>
            {!readOnly && (
              <button
                onClick={copyCoordinates}
                className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-200"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
