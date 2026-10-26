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
    return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
  }
  return null;
};

const searchPhoton = async (query) => {
  const url = 'https://photon.komoot.io/api/?limit=1&q=' + encodeURIComponent(query);
  const response = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } });
  if (!response.ok) throw new Error('Photon HTTP ' + response.status);
  const data = await response.json();
  const coords = data?.features?.[0]?.geometry?.coordinates;
  if (coords && coords.length >= 2) {
    return { latitude: parseFloat(coords[1]), longitude: parseFloat(coords[0]) };
  }
  return null;
};

// Returns { latitude, longitude } or null if not found. Throws only if every provider failed.
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
