import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

/**
 * SimpleMap - Displays shipment location on a simple map
 * Uses OpenStreetMap with Leaflet (fallback to text if not available)
 */
export default function SimpleMap({ 
  shipment, 
  currentLocation, 
  locationHistory = [],
  onLocationUpdate 
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  // Initialize map when component mounts
  useEffect(() => {
    // Dynamically load Leaflet if not present
    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      script.onload = () => setLoaded(true);
      script.onerror = () => setError('Failed to load map library');
      document.body.appendChild(script);
    } else {
      setLoaded(true);
    }
  }, []);

  // Initialize and update map
  useEffect(() => {
    if (!loaded || !mapContainerRef.current || !window.L) return;

    // Get origin and destination coordinates
    const origin = shipment?.origin_hub;
    const destination = shipment?.destination_hub;

    // Default to New York if coordinates not available
    const fromCoords = origin?.latitude && origin?.longitude
      ? [origin.latitude, origin.longitude]
      : [40.7128, -74.0060];
    
    const toCoords = destination?.latitude && destination?.longitude
      ? [destination.latitude, destination.longitude]
      : [34.0522, -118.2437];

    const agentLocation = currentLocation
      ? [currentLocation.latitude, currentLocation.longitude]
      : fromCoords;

    // Initialize map if it hasn't been created yet
    if (!mapRef.current) {
      // Center on the midpoint between origin and destination
      const centerLat = (fromCoords[0] + toCoords[0]) / 2;
      const centerLon = (fromCoords[1] + toCoords[1]) / 2;

      mapRef.current = window.L.map(mapContainerRef.current, {
        center: [centerLat, centerLon],
        zoom: 10,
      });

      // Add tile layer
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof window.L.Marker || layer instanceof window.L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Add origin marker (green)
    const originMarker = window.L.circleMarker(fromCoords, {
      radius: 8,
      color: '#22c55e',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.7,
    })
      .addTo(map)
      .bindPopup(`<strong>Origin Hub</strong><br/>${origin?.name || 'Start Location'}`);

    // Add destination marker (red)
    const destMarker = window.L.circleMarker(toCoords, {
      radius: 8,
      color: '#ef4444',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.7,
    })
      .addTo(map)
      .bindPopup(`<strong>Destination Hub</strong><br/>${destination?.name || 'End Location'}`);

    // Add agent current location marker (blue/orange)
    if (currentLocation) {
      markerRef.current = window.L.circleMarker(agentLocation, {
        radius: 10,
        color: '#f97316',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.8,
      })
        .addTo(map)
        .bindPopup(`<strong>Agent Location</strong><br/>Lat: ${agentLocation[0].toFixed(4)}, Lon: ${agentLocation[1].toFixed(4)}<br/>Speed: ${currentLocation.speed_kmh?.toFixed(1) || 0} km/h`);

      map.setView(agentLocation, 13);
    }

    // Add polyline for location history
    if (locationHistory.length > 1) {
      const polylineCoords = locationHistory.map(loc => [loc.latitude, loc.longitude]);
      window.L.polyline(polylineCoords, {
        color: '#3b82f6',
        weight: 2,
        opacity: 0.6,
      }).addTo(map);
    }

    // Fit bounds to include all markers
    if (locationHistory.length > 0 || currentLocation) {
      const allCoords = [
        fromCoords,
        toCoords,
        ...(locationHistory.map(loc => [loc.latitude, loc.longitude]) || []),
      ];
      const group = new window.L.featureGroup(
        allCoords.map(coord => window.L.marker(coord))
      );
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }, [loaded, shipment, currentLocation, locationHistory]);

  if (!shipment) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <MapPin size={24} className="mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600">Shipment data not available</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        ref={mapContainerRef}
        className="h-96 w-full rounded-lg border border-gray-200 bg-gray-100"
        style={{ minHeight: '300px' }}
      />

      {currentLocation && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Navigation size={16} className="text-orange-600" />
            <h4 className="font-semibold text-orange-900">Agent Live Location</h4>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-orange-700 font-medium">Latitude</p>
              <p className="font-mono text-orange-900">{currentLocation.latitude?.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-xs text-orange-700 font-medium">Longitude</p>
              <p className="font-mono text-orange-900">{currentLocation.longitude?.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-xs text-orange-700 font-medium">Speed</p>
              <p className="font-medium text-orange-900">{currentLocation.speed_kmh?.toFixed(1) || 0} km/h</p>
            </div>
            <div>
              <p className="text-xs text-orange-700 font-medium">Accuracy</p>
              <p className="font-medium text-orange-900">{currentLocation.accuracy_meters?.toFixed(0) || '—'} m</p>
            </div>
          </div>
        </div>
      )}

      {locationHistory.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">
            📍 {locationHistory.length} Location Updates
          </p>
          <p className="mt-1 text-xs text-blue-700">
            Agent has made {locationHistory.length} GPS checkins during delivery
          </p>
        </div>
      )}
    </div>
  );
}
