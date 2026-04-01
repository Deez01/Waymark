import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

export interface GeofencingPermissions {
  foregroundLocation: boolean;
  backgroundLocation: boolean;
  notifications: boolean;
}

export async function checkGeofencingPermissions(): Promise<GeofencingPermissions> {
  const [fg, bg, notif] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
    Notifications.getPermissionsAsync(),
  ]);

  return {
    foregroundLocation: fg.status === 'granted',
    backgroundLocation: bg.status === 'granted',
    notifications: notif.status === 'granted',
  };
}

export async function requestAllGeofencingPermissions(): Promise<GeofencingPermissions> {
  // Step 1: Foreground location
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    return {
      foregroundLocation: false,
      backgroundLocation: false,
      notifications: false,
    };
  }

  // Step 2: Background location (requires foreground first)
  const bg = await Location.requestBackgroundPermissionsAsync();

  // Step 3: Notifications
  const notif = await Notifications.requestPermissionsAsync();

  return {
    foregroundLocation: true,
    backgroundLocation: bg.status === 'granted',
    notifications: notif.status === 'granted',
  };
}
