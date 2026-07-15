import type { DeliveryZone } from '@/types';

export interface DeliveryZoneEvaluation {
  fee: number | null;
  zone: DeliveryZone | null;
  isOutOfRange: boolean;
  maxDistanceKm: number | null;
}

export function sortDeliveryZones(zones: DeliveryZone[]): DeliveryZone[] {
  return [...zones].sort((a, b) => {
    const byMaxDistance = (a.maxDistanceKm ?? 0) - (b.maxDistanceKm ?? 0);
    if (byMaxDistance !== 0) return byMaxDistance;
    const bySortOrder = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (bySortOrder !== 0) return bySortOrder;
    return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
  });
}

export function getDeliveryZoneForDistance(distanceKm: number, zones: DeliveryZone[]): DeliveryZoneEvaluation {
  const activeZones = sortDeliveryZones(zones.filter(zone => zone.isActive !== false));
  const maxZone = activeZones[activeZones.length - 1] ?? null;

  for (const zone of activeZones) {
    if (distanceKm <= zone.maxDistanceKm) {
      return {
        fee: Number(zone.fee),
        zone,
        isOutOfRange: false,
        maxDistanceKm: maxZone?.maxDistanceKm ?? null,
      };
    }
  }

  return {
    fee: null,
    zone: null,
    isOutOfRange: true,
    maxDistanceKm: maxZone?.maxDistanceKm ?? null,
  };
}
