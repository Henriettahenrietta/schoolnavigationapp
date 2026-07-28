import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { CAMPUS_CENTER } from '../data/campus';

// Detects the user's current outdoor position via GPS (expo-location).
// This is the "current location" input in the Systems Theory model.
//
// Because GPS is unreliable indoors and unavailable on some emulators, the
// hook fails gracefully: if permission is denied or no fix is obtained, it
// falls back to the campus centre so the rest of the app still works. This
// reflects the indoor-positioning limitation acknowledged in the project.
export default function useUserLocation() {
  const [location, setLocation] = useState(null); // {latitude, longitude}
  const [status, setStatus] = useState('loading'); // loading | granted | denied | error
  const [usingFallback, setUsingFallback] = useState(false);

  async function requestLocation() {
    try {
      setStatus('loading');
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setStatus('denied');
        setLocation(CAMPUS_CENTER);
        setUsingFallback(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      setUsingFallback(false);
      setStatus('granted');
    } catch (e) {
      setStatus('error');
      setLocation(CAMPUS_CENTER);
      setUsingFallback(true);
    }
  }

  useEffect(() => {
    requestLocation();
  }, []);

  return { location, status, usingFallback, refresh: requestLocation };
}
