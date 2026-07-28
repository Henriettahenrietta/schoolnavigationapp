import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getBuildingById } from '../data/campus';
import { colors, spacing, categoryColors } from '../theme';

// Indoor floor-by-floor / room directory for a selected building.
// Built with plain React Native components (no GPS indoors), which is the
// deliberate design decision described in the project's technology stack:
// a dependable directory rather than unreliable indoor positioning.
export default function BuildingScreen({ route, navigation }) {
  const { buildingId } = route.params;
  const building = getBuildingById(buildingId);
  const [filter, setFilter] = useState('');

  const sections = useMemo(() => {
    if (!building) return [];
    const q = filter.trim().toLowerCase();
    return building.floors
      .map((floor) => ({
        title: floor.name,
        floorId: floor.id,
        data: floor.rooms.filter(
          (r) =>
            !q ||
            r.name.toLowerCase().includes(q) ||
            r.type.toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.data.length > 0);
  }, [building, filter]);

  if (!building) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.missing}>Building not found.</Text>
      </SafeAreaView>
    );
  }

  const accent = categoryColors[building.category] || colors.primary;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={[styles.hero, { borderLeftColor: accent }]}>
        <Text style={styles.buildingName}>{building.name}</Text>
        <Text style={styles.category}>{building.category}</Text>
        <Text style={styles.desc}>{building.description}</Text>
        <TouchableOpacity
          style={[styles.dirBtn, { backgroundColor: accent }]}
          onPress={() => navigation.navigate('Directions', { buildingId })}
        >
          <Text style={styles.dirBtnText}>🧭  Get Directions</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.filter}
        placeholder="Filter rooms in this building…"
        placeholderTextColor={colors.textMuted}
        value={filter}
        onChangeText={setFilter}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section }) => (
          <Text style={styles.floorHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.roomRow}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('Room', { buildingId, roomId: item.id })
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.roomName}>{item.name}</Text>
              <Text style={styles.roomType}>{item.type}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.missing}>No rooms match “{filter}”.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.card,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 5,
  },
  buildingName: { fontSize: 20, fontWeight: '700', color: colors.text },
  category: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  desc: { fontSize: 14, color: colors.text, marginTop: spacing.sm, lineHeight: 20 },
  dirBtn: {
    marginTop: spacing.md,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  dirBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  filter: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.text,
  },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  floorHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roomName: { fontSize: 15, fontWeight: '600', color: colors.text },
  roomType: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.textMuted, marginLeft: spacing.sm },
  missing: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
