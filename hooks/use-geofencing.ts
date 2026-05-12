import { api } from '@/convex/_generated/api';
import { registerGeofences } from '@/lib/geofencing';
import { checkGeofencingPermissions } from '@/lib/permissions';
import { useQuery } from 'convex/react';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

export function useGeofencing(enabled: boolean = true) {
  const pins = useQuery(api.pins.getAllPins, enabled ? undefined : "skip");
  const prevPinHashRef = useRef<string>('');

  // Re-register geofences when pins change
  useEffect(() => {
    if (!pins) return;

    const pinHash = pins
      .map((p: any) => `${p._id}:${p.lat}:${p.lng}`)
      .sort()
      .join('|');

    if (pinHash === prevPinHashRef.current) return;
    prevPinHashRef.current = pinHash;

    (async () => {
      const perms = await checkGeofencingPermissions();
      if (!perms.backgroundLocation || !perms.notifications) return;

      await registerGeofences(
        pins.map((p: any) => ({
          _id: p._id,
          title: p.title,
          lat: p.lat,
          lng: p.lng,
        }))
      );
    })();
  }, [pins]);

  // Re-register when app returns to foreground (user may have moved)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && pins) {
        (async () => {
          const perms = await checkGeofencingPermissions();
          if (!perms.backgroundLocation || !perms.notifications) return;

          await registerGeofences(
            pins.map((p: any) => ({
              _id: p._id,
              title: p.title,
              lat: p.lat,
              lng: p.lng,
            }))
          );
        })();
      }
    });

    return () => subscription.remove();
  }, [pins]);
}
