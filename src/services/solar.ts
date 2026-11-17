import type { Coordinate, LocalDate, SolarSchedule } from '../types';

const MINUTE = 60_000;
const SAMPLE_INTERVAL = 5 * MINUTE;
const SUNRISE_ELEVATION = -0.833;
const GOLDEN_HOUR_LOWER = -4;
const GOLDEN_HOUR_UPPER = 6;

type Direction = 'ascending' | 'descending';

export function solarSchedule(
  localDate: LocalDate,
  coordinate: Coordinate,
  timeZone: string,
): SolarSchedule {
  const start = zonedMidnight(localDate, timeZone);
  const end = zonedMidnight(addDays(localDate, 1), timeZone);

  const morningStart = crossing(
    start,
    end,
    coordinate,
    GOLDEN_HOUR_LOWER,
    'ascending',
  );
  const sunrise = crossing(
    start,
    end,
    coordinate,
    SUNRISE_ELEVATION,
    'ascending',
  );
  const morningEnd = crossing(
    start,
    end,
    coordinate,
    GOLDEN_HOUR_UPPER,
    'ascending',
  );
  const eveningStart = crossing(
    start,
    end,
    coordinate,
    GOLDEN_HOUR_UPPER,
    'descending',
  );
  const sunset = crossing(
    start,
    end,
    coordinate,
    SUNRISE_ELEVATION,
    'descending',
  );
  const eveningEnd = crossing(
    start,
    end,
    coordinate,
    GOLDEN_HOUR_LOWER,
    'descending',
  );

  return {
    localDate,
    timeZone,
    sunrise,
    morningGoldenHour:
      morningStart && morningEnd
        ? { start: morningStart, end: morningEnd }
        : undefined,
    sunset,
    eveningGoldenHour:
      eveningStart && eveningEnd
        ? { start: eveningStart, end: eveningEnd }
        : undefined,
    status: solarStatus(start, end, coordinate, sunrise, sunset),
  };
}

export function todayInTimeZone(timeZone: string, now = new Date()): LocalDate {
  const parts = dateParts(now, timeZone);
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

export function formatTime(date: Date | undefined, timeZone: string): string {
  if (!date) return '—';

  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatLocalDate(localDate: LocalDate, timeZone: string): string {
  const date = zonedMidnight(localDate, timeZone);
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  }).format(date);
}

function crossing(
  start: Date,
  end: Date,
  coordinate: Coordinate,
  threshold: number,
  direction: Direction,
): Date | undefined {
  let lower = start.getTime();
  let lowerValue = solarElevation(new Date(lower), coordinate) - threshold;

  while (lower < end.getTime()) {
    const upper = Math.min(lower + SAMPLE_INTERVAL, end.getTime());
    const upperValue = solarElevation(new Date(upper), coordinate) - threshold;
    const crossed =
      direction === 'ascending'
        ? lowerValue <= 0 && upperValue > 0
        : lowerValue >= 0 && upperValue < 0;

    if (crossed) {
      return refineCrossing(lower, upper, coordinate, threshold, direction);
    }

    lower = upper;
    lowerValue = upperValue;
  }

  return undefined;
}

function refineCrossing(
  lowerBound: number,
  upperBound: number,
  coordinate: Coordinate,
  threshold: number,
  direction: Direction,
): Date {
  let lower = lowerBound;
  let upper = upperBound;

  while (upper - lower > 250) {
    const midpoint = (lower + upper) / 2;
    const value = solarElevation(new Date(midpoint), coordinate) - threshold;
    const crossedMidpoint =
      direction === 'ascending' ? value >= 0 : value <= 0;

    if (crossedMidpoint) upper = midpoint;
    else lower = midpoint;
  }

  return new Date((lower + upper) / 2);
}

function solarStatus(
  start: Date,
  end: Date,
  coordinate: Coordinate,
  sunrise: Date | undefined,
  sunset: Date | undefined,
): SolarSchedule['status'] {
  if (sunrise && sunset) return 'normal';
  if (!sunrise && sunset) return 'noSunrise';
  if (sunrise && !sunset) return 'noSunset';

  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;

  for (
    let timestamp = start.getTime();
    timestamp <= end.getTime();
    timestamp += SAMPLE_INTERVAL
  ) {
    const elevation = solarElevation(new Date(timestamp), coordinate);
    minimum = Math.min(minimum, elevation);
    maximum = Math.max(maximum, elevation);
  }

  if (minimum > SUNRISE_ELEVATION) return 'polarDay';
  if (maximum < SUNRISE_ELEVATION) return 'polarNight';
  return 'noSunrise';
}

function solarElevation(date: Date, coordinate: Coordinate): number {
  const julianDay = date.getTime() / 86_400_000 + 2_440_587.5;
  const julianCentury = (julianDay - 2_451_545) / 36_525;

  const geometricMeanLongitude = normalized(
    280.46646 +
      julianCentury * (36_000.76983 + julianCentury * 0.0003032),
    360,
  );
  const geometricMeanAnomaly =
    357.52911 +
    julianCentury * (35_999.05029 - 0.0001537 * julianCentury);
  const orbitEccentricity =
    0.016708634 -
    julianCentury * (0.000042037 + 0.0000001267 * julianCentury);

  const anomalyRadians = radians(geometricMeanAnomaly);
  const equationOfCenter =
    Math.sin(anomalyRadians) *
      (1.914602 -
        julianCentury * (0.004817 + 0.000014 * julianCentury)) +
    Math.sin(2 * anomalyRadians) * (0.019993 - 0.000101 * julianCentury) +
    Math.sin(3 * anomalyRadians) * 0.000289;

  const trueLongitude = geometricMeanLongitude + equationOfCenter;
  const apparentLongitude =
    trueLongitude -
    0.00569 -
    0.00478 * Math.sin(radians(125.04 - 1934.136 * julianCentury));

  const meanObliquity =
    23 +
    (26 +
      (21.448 -
        julianCentury *
          (46.815 +
            julianCentury * (0.00059 - julianCentury * 0.001813))) /
        60) /
      60;
  const correctedObliquity =
    meanObliquity +
    0.00256 * Math.cos(radians(125.04 - 1934.136 * julianCentury));
  const obliquityRadians = radians(correctedObliquity);
  const declination = Math.asin(
    Math.sin(obliquityRadians) * Math.sin(radians(apparentLongitude)),
  );

  const y = Math.tan(obliquityRadians / 2) ** 2;
  const longitudeRadians = radians(geometricMeanLongitude);
  const equationOfTime =
    4 *
    degrees(
      y * Math.sin(2 * longitudeRadians) -
        2 * orbitEccentricity * Math.sin(anomalyRadians) +
        4 *
          orbitEccentricity *
          y *
          Math.sin(anomalyRadians) *
          Math.cos(2 * longitudeRadians) -
        0.5 * y ** 2 * Math.sin(4 * longitudeRadians) -
        1.25 * orbitEccentricity ** 2 * Math.sin(2 * anomalyRadians),
    );

  const utcMinutes = normalized(date.getTime() / MINUTE, 1_440);
  const trueSolarMinutes = normalized(
    utcMinutes + equationOfTime + 4 * coordinate.longitude,
    1_440,
  );
  let hourAngle = trueSolarMinutes / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;

  const latitudeRadians = radians(coordinate.latitude);
  const cosineZenith =
    Math.sin(latitudeRadians) * Math.sin(declination) +
    Math.cos(latitudeRadians) *
      Math.cos(declination) *
      Math.cos(radians(hourAngle));
  const zenith = degrees(Math.acos(Math.min(1, Math.max(-1, cosineZenith))));
  return 90 - zenith;
}

function zonedMidnight(localDate: LocalDate, timeZone: string): Date {
  const target = Date.UTC(
    localDate.year,
    localDate.month - 1,
    localDate.day,
    0,
    0,
    0,
  );
  let guess = target;

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = dateParts(new Date(guess), timeZone);
    const represented = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    guess += target - represented;
  }

  return new Date(guess);
}

function dateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const values: Record<string, number> = {};

  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }

  return {
    year: required(values.year),
    month: required(values.month),
    day: required(values.day),
    hour: required(values.hour),
    minute: required(values.minute),
    second: required(values.second),
  };
}

function addDays(localDate: LocalDate, days: number): LocalDate {
  const date = new Date(
    Date.UTC(localDate.year, localDate.month - 1, localDate.day + days),
  );
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function required(value: number | undefined): number {
  if (value === undefined || Number.isNaN(value)) {
    throw new Error('Could not resolve local calendar components.');
  }
  return value;
}

function normalized(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function radians(value: number): number {
  return (value * Math.PI) / 180;
}

function degrees(value: number): number {
  return (value * 180) / Math.PI;
}
