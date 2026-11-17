import * as Location from 'expo-location';

import type { Coordinate } from '../types';

export type LocationState = {
  permission: Location.PermissionStatus;
  coordinate?: Coordinate;
  servicesEnabled: boolean;
};

export async function loadLocationState(): Promise<LocationState> {
  const [permissionResult, servicesEnabled] = await Promise.all([
    withTimeout(Location.getForegroundPermissionsAsync(), 4_000),
    withTimeout(Location.hasServicesEnabledAsync(), 4_000, false),
  ]);
  const permission =
    permissionResult?.status ?? Location.PermissionStatus.UNDETERMINED;

  if (permission !== Location.PermissionStatus.GRANTED) {
    return { permission, servicesEnabled: servicesEnabled ?? false };
  }

  const lastKnown = await withTimeout(
    Location.getLastKnownPositionAsync({
      maxAge: 10 * 60 * 1_000,
      requiredAccuracy: 2_000,
    }),
    4_000,
    null,
  );

  return {
    permission,
    servicesEnabled: servicesEnabled ?? false,
    coordinate: lastKnown ? coordinateFrom(lastKnown) : undefined,
  };
}

export async function requestLocation(): Promise<LocationState> {
  const servicesEnabled =
    (await withTimeout(Location.hasServicesEnabledAsync(), 4_000, false)) ??
    false;

  if (!servicesEnabled) {
    return {
      permission: Location.PermissionStatus.DENIED,
      servicesEnabled: false,
    };
  }

  const permissionResult = await Location.requestForegroundPermissionsAsync();
  if (permissionResult.status !== Location.PermissionStatus.GRANTED) {
    return {
      permission: permissionResult.status,
      servicesEnabled,
    };
  }

  const location = await withTimeout(
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }),
    10_000,
    null,
  );

  return {
    permission: permissionResult.status,
    servicesEnabled,
    coordinate: location ? coordinateFrom(location) : undefined,
  };
}

export async function refreshLocation(): Promise<Coordinate | undefined> {
  const location = await withTimeout(
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }),
    10_000,
    null,
  );
  return location ? coordinateFrom(location) : undefined;
}

function coordinateFrom(location: Location.LocationObject): Coordinate {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  fallback?: T,
): Promise<T | undefined> {
  let timeout: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T | undefined>((resolve, reject) => {
    timeout = setTimeout(() => {
      if (fallback !== undefined) resolve(fallback);
      else reject(new Error('timeout'));
    }, milliseconds);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timeout)),
    timeoutPromise,
  ]);
}
