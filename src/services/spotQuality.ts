import type {
  Coordinate,
  Spot,
  SpotCategory,
  SpotQualityFilter,
  SpotSort,
} from '../types';

const GOOD_SCORE = 55;
const TOP_SCORE = 70;

const CATEGORY_SCORE: Record<SpotCategory, number> = {
  viewpoint: 55,
  beach: 47,
  nature: 42,
  park: 30,
  camp: 25,
};

const CATEGORY_SIGNAL: Record<SpotCategory, string> = {
  viewpoint: 'Mapped viewpoint',
  beach: 'Open water horizon',
  nature: 'Protected nature',
  park: 'Open green space',
  camp: 'Sunrise-ready base',
};

export type QualityInput = {
  category: SpotCategory;
  hasMappedName: boolean;
  importance?: number;
  hasWikipedia: boolean;
  hasWikidata: boolean;
  hasDescription: boolean;
  hasImage: boolean;
  elevationMeters?: number;
  access?: string;
};

export function calculateSpotQuality(input: QualityInput): {
  score: number;
  signals: string[];
} {
  let score = CATEGORY_SCORE[input.category];
  const signals = [CATEGORY_SIGNAL[input.category]];

  if (input.hasMappedName) score += 5;

  const importance = clamp(input.importance ?? 0, 0, 0.5);
  score += Math.round((importance / 0.5) * 15);
  if (importance >= 0.2) signals.push('Notable map feature');

  if (input.hasWikipedia) {
    score += 8;
    signals.push('Wikipedia coverage');
  } else if (input.hasWikidata) {
    score += 5;
    signals.push('Wikidata entry');
  }

  if (input.hasDescription) {
    score += 4;
    signals.push('Detailed listing');
  }

  if (input.hasImage) {
    score += 3;
    signals.push('Mapped imagery');
  }

  if (input.elevationMeters !== undefined) {
    score += 3;
    signals.push('Elevation mapped');
  }

  if (input.access === 'yes' || input.access === 'public') {
    score += 2;
    signals.push('Public access');
  }

  return {
    score: clamp(Math.round(score), 0, 100),
    signals: signals.slice(0, 4),
  };
}

export function qualityLabel(score: number): string {
  if (score >= TOP_SCORE) return 'Top mapped match';
  if (score >= GOOD_SCORE) return 'Good mapped match';
  return 'Basic mapped match';
}

export function filterAndSortSpots(
  spots: readonly Spot[],
  qualityFilter: SpotQualityFilter,
  sort: SpotSort,
  origin: Coordinate,
): Spot[] {
  const minimum =
    qualityFilter === 'top'
      ? TOP_SCORE
      : qualityFilter === 'good'
        ? GOOD_SCORE
        : 0;

  return spots
    .filter((spot) => spot.qualityScore >= minimum)
    .sort((first, second) => {
      const distanceDifference =
        distanceKilometers(first.coordinate, origin) -
        distanceKilometers(second.coordinate, origin);

      if (sort === 'distance') {
        return distanceDifference || second.qualityScore - first.qualityScore;
      }

      const scoreDifference = second.qualityScore - first.qualityScore;
      return Math.abs(scoreDifference) >= 3
        ? scoreDifference
        : distanceDifference;
    });
}

function distanceKilometers(first: Coordinate, second: Coordinate): number {
  const earthRadius = 6_371;
  const latitudeDelta = degreesToRadians(second.latitude - first.latitude);
  const longitudeDelta = degreesToRadians(
    second.longitude - first.longitude,
  );
  const firstLatitude = degreesToRadians(first.latitude);
  const secondLatitude = degreesToRadians(second.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
