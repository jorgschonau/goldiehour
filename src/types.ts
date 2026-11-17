export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type SpotCategory =
  | 'viewpoint'
  | 'beach'
  | 'park'
  | 'nature'
  | 'camp';

export type SpotQualityFilter = 'all' | 'good' | 'top';

export type SpotSort = 'quality' | 'distance';

export type Spot = {
  id: string;
  name: string;
  coordinate: Coordinate;
  locality?: string;
  region?: string;
  category: SpotCategory;
  timeZone: string;
  elevationMeters?: number;
  access?: string;
  description?: string;
  qualityScore: number;
  qualitySignals: string[];
};

export type LocalDate = {
  year: number;
  month: number;
  day: number;
};

export type SolarSchedule = {
  localDate: LocalDate;
  timeZone: string;
  sunrise?: Date;
  morningGoldenHour?: {
    start: Date;
    end: Date;
  };
  sunset?: Date;
  eveningGoldenHour?: {
    start: Date;
    end: Date;
  };
  status: 'normal' | 'noSunrise' | 'noSunset' | 'polarDay' | 'polarNight';
};
