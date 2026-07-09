export const RESTAURANT_LAT = 52.4269;
export const RESTAURANT_LNG = 13.3089;
export const MAX_DELIVERY_KM = 7;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export async function geocodeAddress(address: string, zip: string, city: string): Promise<{ lat: number; lng: number } | null> {
  const q = encodeURIComponent(`${address}, ${zip}, ${city}, Germany`);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${q}`,
    { headers: { 'User-Agent': 'sushibanana-app/1.0' } }
  );
  if (!res.ok) return null;
  const data: Array<{ lat: string; lon: string }> = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}
