// Location search helper that works inside the Android/iOS APK as well as web.
// Nominatim blocks requests without a proper User-Agent, so we send one and
// fall back to Photon (no UA requirement) if Nominatim fails.

const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const searchNominatim = async (query) => {
  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(query);
  const response = await fetchWithTimeout(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'MedicalCareApp/1.0 (admin@brightangle.com)',
      'Referer': 'https://medicalapp-backend.sunmaayon.com'
    }
  });
  if (!response.ok) throw new Error('Nominatim HTTP ' + response.status);
  const data = await response.json();
  if (Array.isArray(data) && data.length > 0) {
    const item = data[0];
    return { 
      latitude: parseFloat(item.lat), 
      longitude: parseFloat(item.lon),
      displayName: item.display_name || query
    };
  }
  return null;
};

const searchPhoton = async (query) => {
  const url = 'https://photon.komoot.io/api/?limit=1&q=' + encodeURIComponent(query);
  const response = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } });
  if (!response.ok) throw new Error('Photon HTTP ' + response.status);
  const data = await response.json();
  const feat = data?.features?.[0];
  const coords = feat?.geometry?.coordinates;
  if (coords && coords.length >= 2) {
    const props = feat.properties || {};
    const parts = [
      props.name,
      props.street,
      props.city || props.district || props.county,
      props.state
    ].filter(Boolean);
    const friendlyName = parts.length > 0 ? parts.join(', ') : query;

    return { 
      latitude: parseFloat(coords[1]), 
      longitude: parseFloat(coords[0]),
      displayName: friendlyName
    };
  }
  return null;
};

// Returns { latitude, longitude, displayName } or null if not found. Throws only if every provider failed.
export const searchLocationByName = async (query) => {
  let lastError = null;
  let reachedAProvider = false;

  for (const provider of [searchNominatim, searchPhoton]) {
    try {
      const result = await provider(query);
      reachedAProvider = true;
      if (result) return result;
    } catch (error) {
      lastError = error;
      console.log('Location provider failed:', error.message);
    }
  }

  if (!reachedAProvider && lastError) throw lastError;
  return null;
};

export const reverseGeocodeCoords = async (latitude, longitude) => {
  try {
    const url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + latitude + '&lon=' + longitude;
    const response = await fetchWithTimeout(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MedicalCareApp/1.0 (admin@brightangle.com)',
        'Referer': 'https://medicalapp-backend.sunmaayon.com'
      }
    }, 6000);
    if (response.ok) {
      const data = await response.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch (err) {
    console.log('Reverse geocode error:', err.message);
  }
  return null;
};
