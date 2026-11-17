import type { Region } from 'react-native-maps';
import tzLookup from 'tz-lookup';

import type { Spot } from '../types';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const SEARCHES: Array<{ query: string; category: Spot['category'] }> = [
  { query: 'viewpoint', category: 'viewpoint' },
  { query: 'nature reserve', category: 'nature' },
  { query: 'beach', category: 'beach' },
  { query: 'park', category: 'park' },
  { query: 'campground', category: 'camp' },
];
const cache = new Map<string, Spot[]>();

type NominatimPlace = {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  extratags?: Record<string, string>;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
  };
};

export async function searchSpots(region: Region): Promise<Spot[]> {
  const searchRegion = cappedSearchRegion(region);
  const cacheKey = `${searchRegion.latitude.toFixed(2)}:${searchRegion.longitude.toFixed(2)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const viewbox = viewboxFor(searchRegion);
  const results: Spot[] = [];
  let completedSearches = 0;

  for (const search of SEARCHES) {
    const startedAt = Date.now();
    try {
      const places = await searchNominatim(search.query, viewbox);
      results.push(
        ...places
          .map((place) => toSpot(place, search.category))
          .filter((spot): spot is Spot => spot !== undefined),
      );
      completedSearches += 1;
    } catch {
      // Keep partial results from the other independent category searches.
    }

    const remainingDelay = 1_050 - (Date.now() - startedAt);
    if (remainingDelay > 0) await delay(remainingDelay);
  }

  if (completedSearches === 0) {
    throw new Error('Place search is unavailable.');
  }

  const unique = Array.from(
    new Map(results.map((spot) => [spot.id, spot])).values(),
  )
    .sort(
      (first, second) =>
        distanceSquared(first.coordinate, searchRegion) -
        distanceSquared(second.coordinate, searchRegion),
    )
    .slice(0, 40);

  cache.set(cacheKey, unique);
  return unique;
}

async function searchNominatim(
  query: string,
  viewbox: string,
): Promise<NominatimPlace[]> {
  const parameters = new URLSearchParams({
    format: 'jsonv2',
    q: query,
    viewbox,
    bounded: '1',
    limit: '8',
    addressdetails: '1',
    extratags: '1',
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(`${NOMINATIM_URL}?${parameters}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'GoldieHour/1.0 (github.com/jorgschonau/goldiehour)',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Place search failed with status ${response.status}.`);
    }

    return (await response.json()) as NominatimPlace[];
  } finally {
    clearTimeout(timeout);
  }
}

function toSpot(
  place: NominatimPlace,
  category: Spot['category'],
): Spot | undefined {
  const latitude = Number(place.lat);
  const longitude = Number(place.lon);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return undefined;
  }

  const address = place.address ?? {};
  const extra = place.extratags ?? {};
  if (extra.access === 'private' || extra.access === 'no') {
    return undefined;
  }

  const name =
    place.name?.trim() ||
    place.display_name.split(',')[0]?.trim() ||
    fallbackName(category);

  return {
    id: `osm:${place.place_id}`,
    name,
    coordinate: { latitude, longitude },
    locality:
      address.city ??
      address.town ??
      address.village ??
      address.municipality,
    region: address.state,
    category,
    timeZone: tzLookup(latitude, longitude),
    elevationMeters: parsedElevation(extra.ele),
    access: extra.access,
    description: extra.description,
  };
}

function parsedElevation(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const elevation = Number.parseFloat(value);
  return Number.isFinite(elevation) ? elevation : undefined;
}

function cappedSearchRegion(region: Region): Region {
  const latitudeDelta = Math.min(region.latitudeDelta, 1.2);
  const longitudeScale = Math.max(
    Math.cos((region.latitude * Math.PI) / 180),
    0.25,
  );
  const longitudeDelta = Math.min(
    region.longitudeDelta,
    latitudeDelta / longitudeScale,
  );

  return {
    ...region,
    latitudeDelta,
    longitudeDelta,
  };
}

function viewboxFor(region: Region): string {
  const west = region.longitude - region.longitudeDelta / 2;
  const east = region.longitude + region.longitudeDelta / 2;
  const north = region.latitude + region.latitudeDelta / 2;
  const south = region.latitude - region.latitudeDelta / 2;
  return `${west},${north},${east},${south}`;
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

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
