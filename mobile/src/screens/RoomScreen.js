import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getBuildingById } from '../data/campus';
import { colors, spacing } from '../theme';

// Detail view for a single room / office, reachable from search or from a
// building's directory.
export default function RoomScreen({ route, navigation }) {
  const { buildingId, roomId } = route.params;
  const building = getBuildingById(buildingId);

  let room = null;
  let floorName = '';
  if (building) {
    for (const floor of building.floors) {
      const found = floor.rooms.find((r) => r.id === roomId);
      if (found) {
        room = found;
        floorName = floor.name;
        break;
      }
    }
  }

  if (!building || !room) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.missing}>Room not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.roomName}>{room.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{room.type}</Text>
        </View>

        <View style={styles.card}>
          <Row label="Building" value={building.name} />
          <Row label="Floor" value={floorName} />
          <Row label="Category" value={building.category} />
        </View>

        {room.description ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>About</Text>
            <Text style={styles.desc}>{room.description}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Directions', { buildingId })}
        >
          <Text style={styles.primaryBtnText}>🧭  Directions to {building.name}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Building', { buildingId })}
        >
          <Text style={styles.secondaryBtnText}>View full building directory</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  roomName: { fontSize: 24, fontWeight: '700', color: colors.text },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e7f0ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: spacing.sm,
  },
  badgeText: { color: colors.primaryDark, fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLabel: { color: colors.textMuted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: spacing.md },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  desc: { fontSize: 15, color: colors.text, lineHeight: 22 },
  primaryBtn: {
    backgroundColor: colors.primary,
    marginTop: spacing.xl,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryBtn: { marginTop: spacing.md, paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  missing: { color: colors.textMuted, fontSize: 15, textAlign: 'center', marginTop: spacing.xl },
});
