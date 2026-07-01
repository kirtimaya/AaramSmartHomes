import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  ActivityIndicator, RefreshControl, StyleSheet, Platform,
} from 'react-native';
import { MotiView } from 'moti';
import { colors, radii } from '@aaram/config';
import { useProperties } from '@aaram/core';
import type { PropertiesClient } from '@aaram/core';
import type { Property } from '@aaram/types';

const MUTED = '#9E998F';

export interface PropertyCatalogScreenProps {
  supabase: PropertiesClient;
  onViewProperty?: (propertyId: string) => void;
  onBack?: () => void;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PropertyCard({
  property, index, onPress,
}: { property: Property; index: number; onPress?: () => void }) {
  const rooms = (property as any).rooms ?? [];
  const benefits = (property as any).benefits ?? [];
  const vacant = rooms.filter((r: any) => r.status === 'vacant').length;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 350, delay: index * 60 }}
    >
      <Pressable
        style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
        onPress={onPress}
        disabled={!onPress}
      >
        {/* Color band by city */}
        <View style={[s.cardBand, { backgroundColor: colors.light.primary }]} />

        <View style={s.cardBody}>
          <View style={s.cardTop}>
            <Text style={s.cardName} numberOfLines={1}>{property.name}</Text>
            {vacant > 0 && (
              <View style={s.vacantBadge}>
                <Text style={s.vacantBadgeText}>{vacant} vacant</Text>
              </View>
            )}
          </View>

          {property.address && (
            <Text style={s.cardAddress} numberOfLines={1}>📍 {property.address}</Text>
          )}

          <View style={s.cardStats}>
            <Text style={s.cardStat}>🛏 {rooms.length} rooms</Text>
            <Text style={s.cardStat}>·</Text>
            <Text style={s.cardStat}>
              {rooms.filter((r: any) => r.status === 'occupied').length} occupied
            </Text>
            {property.rent_per_room && (
              <>
                <Text style={s.cardStat}>·</Text>
                <Text style={s.cardStatHighlight}>₹{property.rent_per_room}/mo</Text>
              </>
            )}
          </View>

          {benefits.length > 0 && (
            <View style={s.benefitsRow}>
              {benefits.slice(0, 4).map((b: any) => (
                <View key={b.id ?? b.name} style={s.benefitChip}>
                  <Text style={s.benefitChipText}>{b.name}</Text>
                </View>
              ))}
              {benefits.length > 4 && (
                <Text style={s.benefitMore}>+{benefits.length - 4}</Text>
              )}
            </View>
          )}

          {onPress && (
            <Pressable onPress={onPress} style={s.viewBtn}>
              <Text style={s.viewBtnText}>View Details →</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    </MotiView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function PropertyCatalogScreen({
  supabase, onViewProperty, onBack,
}: PropertyCatalogScreenProps) {
  const { properties, loading, error, refresh } = useProperties(supabase);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const filtered = properties.filter(p =>
    !query.trim() ||
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    (p.address ?? '').toLowerCase().includes(query.toLowerCase())
  );

  if (loading && !refreshing) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={s.loadingText}>Loading properties…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        {onBack && (
          <Pressable onPress={onBack} style={s.backBtn}>
            <Text style={s.backBtnText}>←</Text>
          </Pressable>
        )}
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Properties</Text>
          <Text style={s.headerSub}>{filtered.length} listing{filtered.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or address…"
          placeholderTextColor={MUTED}
          style={s.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} style={s.clearBtn}>
            <Text style={s.clearBtnText}>✕</Text>
          </Pressable>
        )}
      </View>

      {error && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.light.primary}
            colors={[colors.light.primary]}
          />
        }
      >
        {filtered.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyEmoji}>🏠</Text>
            <Text style={s.emptyText}>
              {query ? 'No properties match your search' : 'No properties available'}
            </Text>
          </View>
        ) : (
          filtered.map((p, i) => (
            <PropertyCard
              key={p.id}
              property={p}
              index={i}
              onPress={onViewProperty ? () => onViewProperty(p.id) : undefined}
            />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, fontWeight: '600', color: MUTED },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.light.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 18, color: colors.light.foreground },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.light.foreground, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: MUTED, marginTop: 2 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.light.foreground },
  clearBtn: { paddingLeft: 8 },
  clearBtnText: { fontSize: 13, color: MUTED },

  errorBox: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#FFF0F0', borderRadius: radii.md,
    padding: 10,
  },
  errorText: { fontSize: 13, color: '#C00', textAlign: 'center' },

  list: { paddingHorizontal: 16, gap: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.light.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardBand: { height: 4 },
  cardBody: { padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardName: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.light.foreground, letterSpacing: -0.3 },
  vacantBadge: {
    backgroundColor: `${colors.light.accent}20`,
    borderRadius: radii.sm,
    paddingHorizontal: 8, paddingVertical: 2,
    marginLeft: 8,
  },
  vacantBadgeText: { fontSize: 10, fontWeight: '700', color: colors.light.accent },
  cardAddress: { fontSize: 12, color: MUTED, marginBottom: 8 },
  cardStats: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardStat: { fontSize: 12, color: MUTED },
  cardStatHighlight: { fontSize: 12, fontWeight: '700', color: colors.light.primary },

  benefitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  benefitChip: {
    backgroundColor: `${colors.light.secondary}15`,
    borderRadius: radii.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  benefitChipText: { fontSize: 10, fontWeight: '600', color: colors.light.secondary },
  benefitMore: { fontSize: 10, color: MUTED, alignSelf: 'center' },

  viewBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: colors.light.primary,
    borderRadius: radii.md,
  },
  viewBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 14, color: MUTED, textAlign: 'center' },
});
