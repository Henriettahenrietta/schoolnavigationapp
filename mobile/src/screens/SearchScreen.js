import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ALL_ROOMS, BUILDINGS } from '../data/campus';
import { colors, spacing, categoryColors } from '../theme';

// Campus-wide search across buildings AND their rooms/offices.
// This is the "location search" objective from Chapter One, and the query
// matching described in the Systems Theory process step.
export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const buildingHits = BUILDINGS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
    ).map((b) => ({
      key: `b-${b.id}`,
      kind: 'building',
      title: b.name,
      subtitle: b.category,
      category: b.category,
      buildingId: b.id,
    }));

    const roomHits = ALL_ROOMS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
    ).map((r) => ({
      key: `r-${r.id}`,
      kind: 'room',
      title: r.name,
      subtitle: `${r.type} · ${r.buildingName} · ${r.floorName}`,
      category: null,
      buildingId: r.buildingId,
      roomId: r.id,
    }));

    return [...buildingHits, ...roomHits];
  }, [query]);

  function openResult(item) {
    if (item.kind === 'building') {
      navigation.navigate('Building', { buildingId: item.buildingId });
    } else {
      navigation.navigate('Room', {
        buildingId: item.buildingId,
        roomId: item.roomId,
      });
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.input}
          placeholder="Search a hall, office, lab or building…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={styles.clear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {query.trim().length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Type the name of a building, lecture hall, office or laboratory to
            find where it is on campus.
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No results for “{query}”.</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.85}
              onPress={() => openResult(item)}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: item.category
                      ? categoryColors[item.category] || colors.primary
                      : colors.accent,
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSub}>{item.subtitle}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    margin: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.text },
  clear: { fontSize: 16, color: colors.textMuted, paddingHorizontal: 6 },
  empty: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.md },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.textMuted, marginLeft: spacing.sm },
});
