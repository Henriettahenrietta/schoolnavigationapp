import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CampusMap from '../components/CampusMap';
import useUserLocation from '../hooks/useUserLocation';
import { BUILDINGS, CAMPUS_REGION } from '../data/campus';
import { distanceMeters, formatDistance } from '../utils/geo';
import { colors, spacing, categoryColors } from '../theme';

export default function HomeScreen({ navigation }) {
  const { location, usingFallback } = useUserLocation();
  const mapRef = useRef(null);

  // Sort buildings by distance from the user so the nearest appear first.
  const buildings = useMemo(() => {
    return BUILDINGS.map((b) => ({
      ...b,
      distance: location ? distanceMeters(location, b) : null,
    })).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [location]);

  function focusBuilding(building) {
    mapRef.current?.animateToRegion(
      {
        latitude: building.latitude,
        longitude: building.longitude,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      },
      500
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Campus Navigation</Text>
        <Text style={styles.subtitle}>Yaounde International Business School</Text>
      </View>

      <TouchableOpacity
        style={styles.searchBar}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Search')}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchText}>Search buildings, offices, halls…</Text>
      </TouchableOpacity>

      <View style={styles.mapWrap}>
        <CampusMap
          mapRef={mapRef}
          style={styles.map}
          region={CAMPUS_REGION}
          markers={BUILDINGS}
          userLocation={location}
          onMarkerPress={(m) =>
            navigation.navigate('Building', { buildingId: m.id })
          }
        />
        {usingFallback && (
          <View style={styles.locBanner}>
            <Text style={styles.locBannerText}>
              Using campus centre (live location unavailable)
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.listHeading}>
        Facilities {location ? '(nearest first)' : ''}
      </Text>
      <FlatList
        data={buildings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Building', { buildingId: item.id })}
          >
            <View
              style={[
                styles.catDot,
                { backgroundColor: categoryColors[item.category] || colors.primary },
              ]}
            />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardCategory}>{item.category}</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.distance}>{formatDistance(item.distance)}</Text>
              <TouchableOpacity
                style={styles.dirBtn}
                onPress={() =>
                  navigation.navigate('Directions', { buildingId: item.id })
                }
              >
                <Text style={styles.dirBtnText}>Directions</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { fontSize: 15, marginRight: spacing.sm },
  searchText: { color: colors.textMuted, fontSize: 15 },
  mapWrap: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: 14,
    overflow: 'hidden',
    height: 240,
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: { flex: 1 },
  locBanner: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(27,31,36,0.82)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  locBannerText: { color: '#fff', fontSize: 11, textAlign: 'center' },
  listHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.md },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  cardCategory: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  distance: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  dirBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dirBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
