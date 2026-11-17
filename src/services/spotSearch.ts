import type { Region } from 'react-native-maps';
import tzLookup from 'tz-lookup';

import type { Spot } from '../types';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

export async function searchSpots(region: Region): Promise<Spot[]> {
  const south = region.latitude - region.latitudeDelta / 2;
  const north = region.latitude + region.latitudeDelta / 2;
  const west = region.longitude - region.longitudeDelta / 2;
  const east = region.longitude + region.longitudeDelta / 2;
  const bounds = `${south},${west},${north},${east}`;
  const query = `
    [out:json][timeout:15];
    (
      nwr["tourism"="viewpoint"](${bounds});
      nwr["tourism"="camp_site"](${bounds});
      nwr["natural"="beach"](${bounds});
      nwr["leisure"="park"](${bounds});
      nwr["boundary"="national_park"](${bounds});
      nwr["boundary"="protected_area"](${bounds});
    );
    out center tags 80;
  `;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18_000);

  try {
    const url = `${OVERPASS_URL}?data=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Place search failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as OverpassResponse;
    return (payload.elements ?? [])
      .map(toSpot)
      .filter((spot): spot is Spot => spot !== undefined)
      .sort(
        (first, second) =>
          distanceSquared(first.coordinate, region) -
          distanceSquared(second.coordinate, region),
      );
  } finally {
    clearTimeout(timeout);
  }
}

function toSpot(element: OverpassElement): Spot | undefined {
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;

  if (
    latitude === undefined ||
    longitude === undefined ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return undefined;
  }

  const tags = element.tags ?? {};
  const category = categoryFrom(tags);
  const name = tags.name?.trim() || fallbackName(category);

  return {
    id: `osm:${element.type}:${element.id}`,
    name,
    coordinate: { latitude, longitude },
    locality: tags['addr:city'] ?? tags['addr:town'] ?? tags['addr:village'],
    region: tags['addr:state'] ?? tags['is_in:state'],
    category,
    timeZone: tzLookup(latitude, longitude),
  };
}

function categoryFrom(tags: Record<string, string>): Spot['category'] {
  if (tags.tourism === 'viewpoint') return 'viewpoint';
  if (tags.tourism === 'camp_site') return 'camp';
  if (tags.natural === 'beach') return 'beach';
  if (tags.leisure === 'park') return 'park';
  return 'nature';
}

function fallbackName(category: Spot['category']): string {
  switch (category) {
    case 'viewpoint':
      return 'Scenic viewpoint';
    case 'beach':
      return 'Beach';
    case 'park':
      return 'Park';
    case 'camp':
      return 'Campsite';
    case 'nature':
      return 'Protected area';
  }
}

function distanceSquared(
  coordinate: Spot['coordinate'],
  region: Region,
): number {
  const latitude = coordinate.latitude - region.latitude;
  const longitude = coordinate.longitude - region.longitude;
  return latitude * latitude + longitude * longitude;
}
