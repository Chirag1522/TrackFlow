const prisma = require('../../config/db');

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Record GPS location for an agent
 */
const recordGpsLocation = async (shipmentId, tenantId, agentId, latitude, longitude, additionalData = {}) => {
  try {
    const gpsRecord = await prisma.gpsTracking.create({
      data: {
        shipment_id: shipmentId,
        tenant_id: tenantId,
        agent_id: agentId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy_meters: additionalData.accuracy_meters || null,
        speed_kmh: additionalData.speed_kmh ? parseFloat(additionalData.speed_kmh) : null,
        heading: additionalData.heading || null,
      },
    });
    return gpsRecord;
  } catch (error) {
    console.error('Error recording GPS location:', error);
    throw new Error('Failed to record GPS location');
  }
};

/**
 * Get latest GPS location for a shipment
 */
const getLatestGpsLocation = async (shipmentId, tenantId) => {
  try {
    const latest = await prisma.gpsTracking.findFirst({
      where: {
        shipment_id: shipmentId,
        tenant_id: tenantId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
    return latest;
  } catch (error) {
    console.error('Error fetching latest GPS:', error);
    throw new Error('Failed to fetch GPS location');
  }
};

/**
 * Get GPS location history for a shipment
 */
const getGpsHistory = async (shipmentId, tenantId, limit = 50) => {
  try {
    const history = await prisma.gpsTracking.findMany({
      where: {
        shipment_id: shipmentId,
        tenant_id: tenantId,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: Math.min(limit, 200), // Max 200 records
    });
    return history.reverse(); // Return in chronological order
  } catch (error) {
    console.error('Error fetching GPS history:', error);
    throw new Error('Failed to fetch GPS history');
  }
};

/**
 * Simulate GPS location for demo purposes
 */
const simulateAgentLocation = (fromLat, fromLon, toLat, toLon) => {
  const progress = Math.random() * 0.5 + 0.1; // 10-60% progress
  const lat = fromLat + (toLat - fromLat) * progress;
  const lon = fromLon + (toLon - fromLon) * progress;

  return {
    latitude: lat,
    longitude: lon,
    accuracy_meters: Math.floor(Math.random() * 20) + 5,
    speed_kmh: Math.random() * 50 + 20,
    heading: Math.floor(Math.random() * 360),
  };
};

/**
 * Get public tracking with GPS data (no auth required)
 */
const getPublicTrackingWithGps = async (trackingId) => {
  try {
    const shipment = await prisma.shipment.findFirst({
      where: { tracking_id: trackingId },
      include: {
        origin_hub: true,
        destination_hub: true,
        current_hub: true,
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        events: {
          orderBy: { created_at: 'desc' },
          take: 10,
        },
      },
    });

    if (!shipment) {
      throw new Error('Shipment not found');
    }

    // Get GPS tracking data
    const gpsHistory = await prisma.gpsTracking.findMany({
      where: { shipment_id: shipment.id },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const latestGps = gpsHistory.length > 0 ? gpsHistory[0] : null;

    return {
      shipment: {
        id: shipment.id,
        tracking_id: shipment.tracking_id,
        status: shipment.status,
        sender_info: shipment.sender_info,
        receiver_info: shipment.receiver_info,
        estimated_delivery: shipment.estimated_delivery,
        origin_hub: shipment.origin_hub,
        destination_hub: shipment.destination_hub,
        current_hub: shipment.current_hub,
        agent: shipment.agent,
      },
      current_location: latestGps
        ? {
            latitude: latestGps.latitude,
            longitude: latestGps.longitude,
            accuracy_meters: latestGps.accuracy_meters,
            speed_kmh: latestGps.speed_kmh,
            heading: latestGps.heading,
            timestamp: latestGps.created_at,
          }
        : null,
      location_history: gpsHistory.reverse().map((gps) => ({
        latitude: gps.latitude,
        longitude: gps.longitude,
        speed_kmh: gps.speed_kmh,
        created_at: gps.created_at,
      })),
      distance_to_destination: latestGps && shipment.destination_hub
        ? calculateDistance(
            latestGps.latitude,
            latestGps.longitude,
            shipment.destination_hub.latitude,
            shipment.destination_hub.longitude
          )
        : null,
    };
  } catch (error) {
    console.error('Error fetching public tracking:', error);
    throw error;
  }
};

module.exports = {
  calculateDistance,
  recordGpsLocation,
  getLatestGpsLocation,
  getGpsHistory,
  simulateAgentLocation,
  getPublicTrackingWithGps,
};
