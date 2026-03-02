import type { LocationData } from './types';

export async function getCurrentLocation(): Promise<LocationData | null> {
  if (!('geolocation' in navigator)) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  });
}

export function watchLocation(callback: (location: LocationData) => void): () => void {
  if (!('geolocation' in navigator)) {
    return () => {};
  }

  const id = navigator.geolocation.watchPosition(
    (position) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      });
    },
    () => {},
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
    }
  );

  return () => navigator.geolocation.clearWatch(id);
}
