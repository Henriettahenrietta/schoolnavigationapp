import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CampusMap from '../components/CampusMap';
import useUserLocation from '../hooks/useUserLocation';
import { getBuildingById } from '../data/campus';
import { distanceMeters, formatDistance, walkingMinutes, regionForPoints } from '../utils/geo';
import { colors, spacing } from '../theme';

// Route guidance screen: draws a route from the user's current position to the
// selected building and shows distance + estimated walking time.
//
// The route is drawn as a direct guideline (prototype scope). This is the
// "output" of the Systems Theory model: directions + interactive map. A real
// turn-by-turn walking path via a routing service is noted as future work.
export default function DirectionsScreen({ route }) {
  const { buildingId } = route.params;
  const building = getBuildingById(buildingId);
  const { location, usingFallback, status } = useUserLocation();
  const mapRef = useRef(null);

  const destination = building
    ? { latitude: building.latitude, longitude: building.longitude }
    : null;

  const meters = useMemo(
    () => (location && destination ? distanceMeters(location, destination) : null),
    [location, destination]
  );
  const minutes = walkingMinutes(meters);

  const routeCoords = useMemo(() => {
    if (!location || !destination) return null;
    return [location, destination];
  }, [location, destination]);

  useEffect(() => {
    if (location && destination && mapRef.current) {
      const region = regionForPoints(location, destination);
      // Small delay lets the map mount before animating.
      const t = setTimeout(() => mapRef.current?.animateToRegion(region, 700), 400);
      return () => clearTimeout(t);
    }
  }, [location, destination]);

  if (!building) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.missing}>Building not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CampusMap
        mapRef={mapRef}
        style={StyleSheet.absoluteFill}
        region={regionForPoints(location || destination, destination)}
        markers={[building]}
        selectedId={building.id}
        userLocation={location}
        routeCoordinates={routeCoords}
      />

      <SafeAreaView style={styles.overlay} edges={['bottom']} pointerEvents="box-none">
        <View style={styles.card}>
          {status === 'loading' && !location ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Getting your location…</Text>
            </View>
          ) : (
            <>
              <Text style={styles.destLabel}>Destination</Text>
              <Text style={styles.destName}>{building.name}</Text>

              <View style={styles.statsRow}>
                <Stat value={formatDistance(meters)} label="Distance" />
                <View style={styles.divider} />
                <Stat value={minutes ? `${minutes} min` : '--'} label="Walk (approx.)" />
              </View>

              {usingFallback && (
                <Text style={styles.note}>
                  Live GPS unavailable — distance is measured from the campus
                  centre. Enable location for an accurate route.
                </Text>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1, backgroundColor: colors.background },
  overlay: { flex: 1, justifyContent: 'flex-end', padding: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  destLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  destName: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  divider: { width: 1, height: 34, backgroundColor: colors.border },
  note: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  loadingText: { marginLeft: spacing.sm, color: colors.textMuted, fontSize: 14 },
  missing: { color: colors.textMuted, fontSize: 15, textAlign: 'center', marginTop: spacing.xl },
});
