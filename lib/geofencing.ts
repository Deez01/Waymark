import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const GEOFENCE_TASK_NAME = 'WAYMARK_GEOFENCE_TASK';
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const GEOFENCE_RADIUS_METERS = 200;
const MAX_GEOFENCES = 19; // iOS limit is 20, keep 1 buffer

// Define the background task at module scope — must execute before any geofence events fire
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Geofence task error:', error);
    return;
  }

  const { eventType, region } = data as {
    eventType: Location.GeofencingEventType;
    region: { identifier: string };
  };

  if (eventType !== Location.GeofencingEventType.Enter) return;

  const pinId = region.identifier;

  try {
    // Check cooldown
    const cooldownsRaw = await AsyncStorage.getItem('geofence_cooldowns');
    const cooldowns: Record<string, number> = cooldownsRaw ? JSON.parse(cooldownsRaw) : {};

    if (cooldowns[pinId] && Date.now() - cooldowns[pinId] < COOLDOWN_MS) {
      return; // Still in cooldown
    }

    // Get pin metadata
    const metaRaw = await AsyncStorage.getItem('geofence_pin_data');
    const pinData: Record<string, { title: string; lat: number; lng: number }> = metaRaw
      ? JSON.parse(metaRaw)
      : {};
    const pin = pinData[pinId];

    if (!pin) return;

    // Fire immediate local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "You're near a pin!",
        body: `You're close to "${pin.title}"`,
        data: { pinId, lat: pin.lat, lng: pin.lng },
        sound: 'default',
      },
      trigger: null, // immediate
    });

    // Update cooldown
    cooldowns[pinId] = Date.now();
    await AsyncStorage.setItem('geofence_cooldowns', JSON.stringify(cooldowns));
  } catch (e) {
    console.error('Geofence notification error:', e);
  }
});

function getDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function registerGeofences(
  pins: Array<{ _id: string; title: string; lat: number; lng: number }>
) {
  if (pins.length === 0) {
    await unregisterGeofences();
    return;
  }

  // Get current location to sort by distance
  let userLat = 0;
  let userLng = 0;
  try {
    const lastPos = await Location.getLastKnownPositionAsync();
    if (lastPos) {
      userLat = lastPos.coords.latitude;
      userLng = lastPos.coords.longitude;
    } else {
      const currentPos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      userLat = currentPos.coords.latitude;
      userLng = currentPos.coords.longitude;
    }
  } catch {
    // If we can't get location, just take the first MAX_GEOFENCES pins
  }

  // Sort pins by distance from user and take nearest ones
  const sorted =
    userLat || userLng
      ? [...pins].sort(
          (a, b) =>
            getDistance(userLat, userLng, a.lat, a.lng) -
            getDistance(userLat, userLng, b.lat, b.lng)
        )
      : pins;

  const selected = sorted.slice(0, MAX_GEOFENCES);

  // Store pin metadata for the background task
  const pinData: Record<string, { title: string; lat: number; lng: number }> = {};
  for (const pin of selected) {
    pinData[pin._id] = { title: pin.title, lat: pin.lat, lng: pin.lng };
  }
  await AsyncStorage.setItem('geofence_pin_data', JSON.stringify(pinData));

  // Clean up stale cooldowns while we're here
  try {
    const cooldownsRaw = await AsyncStorage.getItem('geofence_cooldowns');
    if (cooldownsRaw) {
      const cooldowns: Record<string, number> = JSON.parse(cooldownsRaw);
      const now = Date.now();
      const cleaned: Record<string, number> = {};
      for (const [id, timestamp] of Object.entries(cooldowns)) {
        if (now - timestamp < COOLDOWN_MS) {
          cleaned[id] = timestamp;
        }
      }
      await AsyncStorage.setItem('geofence_cooldowns', JSON.stringify(cleaned));
    }
  } catch {
    // Non-critical, ignore
  }

  // Build geofence regions
  const regions: Location.LocationRegion[] = selected.map((pin) => ({
    identifier: pin._id,
    latitude: pin.lat,
    longitude: pin.lng,
    radius: GEOFENCE_RADIUS_METERS,
    notifyOnEnter: true,
    notifyOnExit: false,
  }));

  await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
}

export async function unregisterGeofences() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
    if (isRegistered) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }
  } catch {
    // Task might not be registered, that's fine
  }
}
