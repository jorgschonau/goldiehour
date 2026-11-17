export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type Spot = {
  id: string;
  name: string;
  coordinate: Coordinate;
  locality?: string;
  region?: string;
  category: 'viewpoint' | 'beach' | 'park' | 'nature' | 'camp';
  timeZone: string;
  elevationMeters?: number;
  access?: string;
  description?: string;
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
