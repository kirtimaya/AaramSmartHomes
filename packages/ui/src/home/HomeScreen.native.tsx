import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  Image, ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { MotiView } from 'moti';
import { useProperties } from '@aaram/core';
import type { PropertiesClient } from '@aaram/core';
import type { Property } from '@aaram/types';
import { colors, radii } from '@aaram/config';

// ── Constants ─────────────────────────────────────────────────────────────────

const MUTED = '#9E998F';

const AMENITIES = [
  { emoji: '🏊', title: 'Azure Pool',    type: 'Relax'  },
  { emoji: '🏋️', title: 'Focus Studio', type: 'Active' },
  { emoji: '🏸', title: 'Play Court',   type: 'Social' },
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HomeScreenProps {
  supabase: PropertiesClient;
  onNavigateProperty: (id: string) => void;
  onNavigateTenantPortal: () => void;
  onNavigateProperties: () => void;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PropertyCard({ property, index, onPress }: {
  property: Property;
  index: number;
  onPress: () => void;
}) {
  const rooms      = property.rooms ?? [];
  const total      = rooms.length || property.total_rooms || 0;
  const occupied   = rooms.filter(r => r.occupancy_status === 'Occupied').length;
  const vacant     = total - occupied;
  const occupiedPct = total > 0 ? (occupied / total) * 100 : 0;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 14 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 400, delay: 120 + index * 80 }}
      style={s.propertyCard}
    >
      <Pressable
        style={({ pressed }) => [s.propertyCardInner, pressed && { opacity: 0.88 }]}
        onPress={onPress}
      >
        {/* Image */}
        <View style={s.propertyImageWrap}>
          {property.image_url ? (
            <Image
              source={{ uri: property.image_url }}
              style={s.propertyImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[s.propertyImage, s.propertyImagePlaceholder]}>
              <Text style={s.propertyImagePlaceholderText}>🏡</Text>
            </View>
          )}
          <View style={s.propertyTypeBadge}>
            <Text style={s.propertyTypeBadgeText}>{property.property_type}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={s.propertyInfo}>
          <View style={s.propertyInfoRow}>
            <Text style={s.propertyName} numberOfLines={1}>{property.name}</Text>
            <View style={s.starBadge}>
              <Text style={s.starBadgeText}>⭐ 4.9</Text>
            </View>
          </View>
          <Text style={s.propertyLocation}>📍 {property.location}</Text>

          {/* Occupancy bar */}
          <View style={s.occupancyRow}>
            <Text style={s.occupancyLabel}>
              <Text style={s.occupancyOccupied}>{occupied} occ </Text>
              <Text style={s.occupancySep}>· </Text>
              <Text style={s.occupancyVacant}>{vacant} vacant</Text>
            </Text>
          </View>
          <View style={s.occupancyTrack}>
            <View style={[s.occupancyFill, { width: `${occupiedPct}%` as any }]} />
          </View>
        </View>
      </Pressable>
    </MotiView>
  );
}

function AmenityCard({ emoji, title, type, index }: {
  emoji: string; title: string; type: string; index: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 360, delay: 300 + index * 60 }}
      style={s.amenityCard}
    >
      <Text style={s.amenityEmoji}>{emoji}</Text>
      <Text style={s.amenityTitle}>{title}</Text>
      <Text style={s.amenityType}>{type}</Text>
    </MotiView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function HomeScreen({
  supabase,
  onNavigateProperty,
  onNavigateTenantPortal,
  onNavigateProperties,
}: HomeScreenProps) {
  const { properties, loading, refresh } = useProperties(supabase, 6);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.light.primary}
          colors={[colors.light.primary]}
        />
      }
    >
      {/* ── Hero ────────────────────────────────────────────────── */}
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500 }}
        style={s.hero}
      >
        <View style={s.heroBadge}>
          <Text style={s.heroBadgeText}>🌿 Organic Living</Text>
        </View>
        <Text style={s.heroTitle}>LIVE IN{'\n'}<Text style={s.heroTitleAccent}>HARMONY.</Text></Text>
        <Text style={s.heroSub}>
          Thoughtfully managed homes combining minimalist design with smart technology.
        </Text>

        <View style={s.heroButtons}>
          <Pressable
            style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.84 }]}
            onPress={onNavigateProperties}
          >
            <Text style={s.primaryBtnText}>Explore Homes  →</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.84 }]}
            onPress={onNavigateTenantPortal}
          >
            <Text style={s.secondaryBtnText}>My Portal</Text>
          </Pressable>
        </View>
      </MotiView>

      {/* ── Featured Properties ──────────────────────────────────── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>A Home That Breathes</Text>
          <Pressable onPress={onNavigateProperties}>
            <Text style={s.sectionLink}>See all →</Text>
          </Pressable>
        </View>
        <Text style={s.sectionSub}>Natural materials and intentional white space, balanced for focus.</Text>

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={colors.light.primary} />
            <Text style={s.loadingText}>Fetching sanctuaries…</Text>
          </View>
        ) : properties.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyEmoji}>🏡</Text>
            <Text style={s.emptyText}>No properties found.</Text>
          </View>
        ) : (
          properties.map((p, i) => (
            <PropertyCard
              key={p.id}
              property={p}
              index={i}
              onPress={() => onNavigateProperty(p.id)}
            />
          ))
        )}
      </View>

      {/* ── Amenities ───────────────────────────────────────────── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Curated Amenities</Text>
        <Text style={s.sectionSub}>Designed to support your wellness journey seamlessly.</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.amenitiesRow}
          style={s.amenitiesScroll}
        >
          {AMENITIES.map((a, i) => (
            <AmenityCard key={a.title} {...a} index={i} />
          ))}
        </ScrollView>
      </View>

      {/* ── Food Hub Banner ─────────────────────────────────────── */}
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 500 }}
        style={s.section}
      >
        <View style={s.foodHubCard}>
          <View style={s.foodHubLeft}>
            <View style={s.foodHubBadge}>
              <Text style={s.foodHubBadgeText}>🌱 Aaram Kitchen</Text>
            </View>
            <Text style={s.foodHubTitle}>Organic Food Hub &{'\n'}Nutrition Science</Text>
            <Text style={s.foodHubSub}>Whole spice recipes, weekly balanced menus — no processed masala.</Text>
            <View style={s.foodHubTags}>
              {['7-Day Plan', 'Whole Spices', 'AI Analysis'].map(tag => (
                <View key={tag} style={s.foodHubTag}>
                  <Text style={s.foodHubTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={s.foodHubEmojiGrid}>
            {['🫓', '🌿', '🥘', '🌱'].map((e, i) => (
              <View key={i} style={s.foodHubEmoji}>
                <Text style={s.foodHubEmojiText}>{e}</Text>
              </View>
            ))}
          </View>
        </View>
      </MotiView>

      {/* ── Footer space ────────────────────────────────────────── */}
      <View style={s.footerPad} />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background },
  content: { paddingTop: Platform.OS === 'ios' ? 60 : 36 },

  // Hero
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.light.secondary}18`,
    borderWidth: 1,
    borderColor: `${colors.light.secondary}30`,
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  heroBadgeText: { fontSize: 9, fontWeight: '800', color: colors.light.secondary, letterSpacing: 1.2, textTransform: 'uppercase' },
  heroTitle: {
    fontSize: 46,
    fontWeight: '900',
    color: colors.light.foreground,
    letterSpacing: -1.5,
    lineHeight: 50,
    marginBottom: 14,
  },
  heroTitleAccent: { color: colors.light.primary, fontStyle: 'italic' },
  heroSub: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 20,
    maxWidth: 300,
    marginBottom: 24,
  },
  heroButtons: { flexDirection: 'row', gap: 12 },
  primaryBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: radii.lg,
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.2 },
  secondaryBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryBtnText: { color: colors.light.foreground, fontWeight: '800', fontSize: 13 },

  // Sections
  section: { paddingHorizontal: 24, marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: colors.light.foreground, letterSpacing: -0.4 },
  sectionLink: { fontSize: 12, fontWeight: '700', color: colors.light.primary },
  sectionSub: { fontSize: 12, color: MUTED, lineHeight: 18, marginBottom: 18 },

  // Loading / empty
  loadingBox: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  loadingText: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyEmoji: { fontSize: 32 },
  emptyText: { fontSize: 13, color: MUTED },

  // Property card
  propertyCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.light.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  propertyCardInner: {},
  propertyImageWrap: { position: 'relative' },
  propertyImage: { width: '100%', height: 180 },
  propertyImagePlaceholder: { backgroundColor: colors.light.accent, alignItems: 'center', justifyContent: 'center' },
  propertyImagePlaceholderText: { fontSize: 40 },
  propertyTypeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: `${colors.light.secondary}CC`,
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  propertyTypeBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.8, textTransform: 'uppercase' },
  propertyInfo: { padding: 16 },
  propertyInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  propertyName: { fontSize: 16, fontWeight: '800', color: colors.light.foreground, flex: 1, letterSpacing: -0.3 },
  propertyLocation: { fontSize: 11, color: MUTED, marginBottom: 12 },
  starBadge: {
    backgroundColor: `${colors.light.primary}15`,
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  starBadgeText: { fontSize: 10, fontWeight: '800', color: colors.light.primary },
  occupancyRow: { flexDirection: 'row', marginBottom: 6 },
  occupancyLabel: { fontSize: 10, fontWeight: '700' },
  occupancyOccupied: { color: '#EF4444' },
  occupancySep: { color: MUTED },
  occupancyVacant: { color: colors.light.secondary },
  occupancyTrack: { height: 4, borderRadius: 4, backgroundColor: `${colors.light.foreground}08`, overflow: 'hidden' },
  occupancyFill: { height: 4, borderRadius: 4, backgroundColor: '#EF4444' },

  // Amenities
  amenitiesScroll: { marginHorizontal: -24 },
  amenitiesRow: { paddingHorizontal: 24, gap: 12 },
  amenityCard: {
    width: 130,
    backgroundColor: '#fff',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  amenityEmoji: { fontSize: 30, marginBottom: 10 },
  amenityTitle: { fontSize: 13, fontWeight: '800', color: colors.light.foreground, marginBottom: 2 },
  amenityType: { fontSize: 9, fontWeight: '800', color: colors.light.secondary, letterSpacing: 1.5, textTransform: 'uppercase' },

  // Food Hub banner
  foodHubCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: `${colors.light.secondary}30`,
    backgroundColor: `${colors.light.secondary}06` as any,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  foodHubLeft: { flex: 1 },
  foodHubBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.light.secondary}18`,
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  foodHubBadgeText: { fontSize: 9, fontWeight: '800', color: colors.light.secondary, letterSpacing: 1 },
  foodHubTitle: { fontSize: 16, fontWeight: '800', color: colors.light.foreground, lineHeight: 22, marginBottom: 6, letterSpacing: -0.2 },
  foodHubSub: { fontSize: 11, color: MUTED, lineHeight: 17, marginBottom: 12 },
  foodHubTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  foodHubTag: {
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.light.accent,
  },
  foodHubTagText: { fontSize: 9, fontWeight: '800', color: MUTED, letterSpacing: 0.5 },
  foodHubEmojiGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 84, gap: 6, alignSelf: 'flex-start' },
  foodHubEmoji: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodHubEmojiText: { fontSize: 18 },

  footerPad: { height: 24 },
});
