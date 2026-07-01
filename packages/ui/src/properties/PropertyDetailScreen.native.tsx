import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  Image, ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { MotiView } from 'moti';
import { usePropertyDetail } from '@aaram/core';
import type { PropertyDetailClient } from '@aaram/core';
import type { Room, Benefit } from '@aaram/types';
import { colors, radii } from '@aaram/config';

// ── Constants ─────────────────────────────────────────────────────────────────

const MUTED = '#9E998F';

const OCCUPANCY_COLOR: Record<string, string> = {
  occupied: MUTED,
  vacant:   colors.light.secondary,
  notice:   '#F59E0B',
};

const TYPE_ICON: Record<string, string> = {
  Villa:              '🏡',
  Flat:               '🏢',
  'Individual House': '🏠',
  Other:              '🏗️',
};

function formatSqft(sqft?: number) {
  return sqft ? `${sqft} sqft` : null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PropertyDetailScreenProps {
  supabase: PropertyDetailClient;
  propertyId: string | null;
  onBack?: () => void;
  onRequestRoom?: (roomId: string, roomName: string) => void;
}

// ── Benefit chip ──────────────────────────────────────────────────────────────

function BenefitChip({ benefit }: { benefit: Benefit }) {
  return (
    <View style={s.benefitChip}>
      <Text style={s.benefitIcon}>{benefit.icon}</Text>
      <Text style={s.benefitName}>{benefit.name}</Text>
    </View>
  );
}

// ── Room card ─────────────────────────────────────────────────────────────────

function RoomCard({ room, active, onPress }: {
  room: Room;
  active: boolean;
  onPress: () => void;
}) {
  const status      = room.occupancy_status ?? 'vacant';
  const statusColor = OCCUPANCY_COLOR[status] ?? MUTED;

  return (
    <Pressable
      style={({ pressed }) => [
        s.roomCard,
        active && s.roomCardActive,
        pressed && { opacity: 0.82 },
      ]}
      onPress={onPress}
    >
      <View style={s.roomCardTop}>
        <Text style={[s.roomCardName, active && { color: colors.light.primary }]}>
          {room.name}
        </Text>
        <View style={[s.roomStatusDot, { backgroundColor: statusColor }]} />
      </View>
      <Text style={s.roomCardType}>{room.type}</Text>
      {room.sqft ? <Text style={s.roomCardSqft}>{formatSqft(room.sqft)}</Text> : null}
    </Pressable>
  );
}

// ── Room detail panel ─────────────────────────────────────────────────────────

function RoomDetail({ room, onRequest }: { room: Room; onRequest?: () => void }) {
  const status      = room.occupancy_status ?? 'vacant';
  const statusColor = OCCUPANCY_COLOR[status] ?? MUTED;
  const isVacant    = status === 'vacant';

  return (
    <MotiView
      key={room.id}
      from={{ opacity: 0, translateX: 12 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', duration: 280 }}
      style={s.roomDetail}
    >
      {/* Room image or placeholder */}
      {room.image_urls?.[0] ? (
        <Image source={{ uri: room.image_urls[0] }} style={s.roomImage} resizeMode="cover" />
      ) : (
        <View style={s.roomImagePlaceholder}>
          <Text style={s.roomImagePlaceholderText}>🛏️</Text>
        </View>
      )}

      <View style={s.roomDetailBody}>
        <View style={s.roomDetailHeader}>
          <View>
            <Text style={s.roomDetailName}>{room.name}</Text>
            <Text style={s.roomDetailType}>{room.type}{room.sqft ? ` · ${formatSqft(room.sqft)}` : ''}</Text>
          </View>
          <View style={[s.roomDetailStatusBadge, { backgroundColor: `${statusColor}18` }]}>
            <Text style={[s.roomDetailStatusText, { color: statusColor }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Features */}
        {room.features && room.features.length > 0 && (
          <View style={s.featuresRow}>
            {room.features.map((f, i) => (
              <View key={i} style={s.featureChip}>
                <Text style={s.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        )}

        {/* AC badge */}
        {room.has_ac && (
          <View style={s.acBadge}>
            <Text style={s.acBadgeText}>❄️ AC included</Text>
          </View>
        )}

        {/* Tenant name for occupied */}
        {room.tenant_name && !isVacant && (
          <Text style={s.tenantHint}>Tenant: {room.tenant_name}</Text>
        )}

        {/* CTA */}
        {isVacant && onRequest && (
          <Pressable
            style={({ pressed }) => [s.requestBtn, pressed && { opacity: 0.82 }]}
            onPress={onRequest}
          >
            <Text style={s.requestBtnText}>Request Allocation →</Text>
          </Pressable>
        )}
      </View>
    </MotiView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function PropertyDetailScreen({
  supabase, propertyId, onBack, onRequestRoom,
}: PropertyDetailScreenProps) {
  const { property, activeRoom, setActiveRoom, loading, error, refresh } =
    usePropertyDetail(supabase, propertyId);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={s.loadingText}>Loading property…</Text>
      </View>
    );
  }

  if (error || !property) {
    return (
      <View style={s.centered}>
        <Text style={s.errorEmoji}>🏗️</Text>
        <Text style={s.errorTitle}>{error === 'Property not found' ? 'Not Found' : 'Something went wrong'}</Text>
        <Text style={s.errorSub}>{error}</Text>
        {onBack && (
          <Pressable style={s.backFromErrorBtn} onPress={onBack}>
            <Text style={s.backFromErrorBtnText}>← Go back</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const rooms    = property.rooms    ?? [];
  const benefits = property.benefits ?? [];
  const typeIcon = TYPE_ICON[property.property_type] ?? '🏠';
  const vacantCount = rooms.filter(r => (r.occupancy_status ?? 'vacant') === 'vacant').length;

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refresh}
            tintColor={colors.light.primary}
            colors={[colors.light.primary]}
          />
        }
      >
        {/* ── Hero ────────────────────────────────────────────── */}
        {property.image_url ? (
          <Image source={{ uri: property.image_url }} style={s.heroImage} resizeMode="cover" />
        ) : (
          <View style={s.heroPlaceholder}>
            <Text style={s.heroPlaceholderText}>{typeIcon}</Text>
          </View>
        )}

        {/* Back button over hero */}
        {onBack && (
          <Pressable style={s.heroBack} onPress={onBack} hitSlop={12}>
            <Text style={s.heroBackText}>←</Text>
          </Pressable>
        )}

        {/* ── Info card ───────────────────────────────────────── */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 380 }}
          style={s.infoCard}
        >
          <View style={s.infoTopRow}>
            <View style={s.infoTitles}>
              <Text style={s.propertyName}>{property.name}</Text>
              <Text style={s.propertyLocation}>📍 {property.location}</Text>
            </View>
            <View style={s.typeBadge}>
              <Text style={s.typeBadgeEmoji}>{typeIcon}</Text>
              <Text style={s.typeBadgeText}>{property.property_type}</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statNum}>{rooms.length}</Text>
              <Text style={s.statLabel}>Rooms</Text>
            </View>
            <View style={[s.statBox, s.statDivider]}>
              <Text style={[s.statNum, { color: colors.light.secondary }]}>{vacantCount}</Text>
              <Text style={s.statLabel}>Vacant</Text>
            </View>
            <View style={[s.statBox, s.statDivider]}>
              <Text style={s.statNum}>{property.total_rooms}</Text>
              <Text style={s.statLabel}>Total capacity</Text>
            </View>
          </View>

          {/* Description */}
          {property.description ? (
            <Text style={s.description}>{property.description}</Text>
          ) : null}
        </MotiView>

        {/* ── Benefits ────────────────────────────────────────── */}
        {benefits.length > 0 && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 340, delay: 80 }}
            style={s.section}
          >
            <Text style={s.sectionTitle}>Amenities</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.benefitsRow}>
              {benefits.map(b => <BenefitChip key={b.id} benefit={b} />)}
            </ScrollView>
          </MotiView>
        )}

        {/* ── Rooms ───────────────────────────────────────────── */}
        {rooms.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Rooms</Text>

            {/* Horizontal picker */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.roomPicker}
            >
              {rooms.map(r => (
                <RoomCard
                  key={r.id}
                  room={r}
                  active={activeRoom?.id === r.id}
                  onPress={() => setActiveRoom(r)}
                />
              ))}
            </ScrollView>

            {/* Detail panel for active room */}
            {activeRoom && (
              <RoomDetail
                room={activeRoom}
                onRequest={
                  onRequestRoom
                    ? () => onRequestRoom(activeRoom.id, activeRoom.name)
                    : undefined
                }
              />
            )}
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 13, fontWeight: '600', color: MUTED },

  // ── Hero
  heroImage: { width: '100%', height: 260 },
  heroPlaceholder: {
    width: '100%', height: 220,
    backgroundColor: `${colors.light.primary}10`,
    alignItems: 'center', justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
  },
  heroPlaceholderText: { fontSize: 72 },
  heroBack: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 40, left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  heroBackText: { fontSize: 20, color: colors.light.foreground },

  // ── Info card
  infoCard: {
    marginHorizontal: 16, marginTop: -24,
    backgroundColor: '#fff',
    borderRadius: radii.xxl,
    padding: 20,
    borderWidth: 1, borderColor: colors.light.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  infoTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  infoTitles: { flex: 1, marginRight: 12 },
  propertyName: { fontSize: 20, fontWeight: '900', color: colors.light.foreground, letterSpacing: -0.4, marginBottom: 4 },
  propertyLocation: { fontSize: 12, color: MUTED, fontWeight: '600' },
  typeBadge: {
    backgroundColor: `${colors.light.primary}10`,
    borderRadius: radii.md, padding: 10,
    alignItems: 'center', gap: 3,
  },
  typeBadgeEmoji: { fontSize: 20 },
  typeBadgeText: { fontSize: 9, fontWeight: '800', color: colors.light.primary, letterSpacing: 0.3 },

  statsRow: { flexDirection: 'row', borderWidth: 1, borderColor: colors.light.border, borderRadius: radii.lg, overflow: 'hidden', marginBottom: 14 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.light.border },
  statNum: { fontSize: 20, fontWeight: '900', color: colors.light.foreground },
  statLabel: { fontSize: 9, fontWeight: '700', color: MUTED, marginTop: 2, letterSpacing: 0.4 },

  description: { fontSize: 13, color: colors.light.foreground, opacity: 0.62, lineHeight: 20 },

  // ── Section
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: MUTED, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },

  // ── Benefits
  benefitsRow: { gap: 8, paddingRight: 4 },
  benefitChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 50,
    borderWidth: 1.5, borderColor: colors.light.border,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  benefitIcon: { fontSize: 16 },
  benefitName: { fontSize: 12, fontWeight: '700', color: colors.light.foreground },

  // ── Room picker cards
  roomPicker: { gap: 8, paddingRight: 4, marginBottom: 14 },
  roomCard: {
    backgroundColor: '#fff', borderRadius: radii.lg,
    borderWidth: 1.5, borderColor: colors.light.border,
    padding: 12, minWidth: 110,
  },
  roomCardActive: { borderColor: colors.light.primary, backgroundColor: `${colors.light.primary}08` },
  roomCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  roomCardName: { fontSize: 13, fontWeight: '800', color: colors.light.foreground, flex: 1, marginRight: 4 },
  roomStatusDot: { width: 7, height: 7, borderRadius: 4 },
  roomCardType: { fontSize: 10, color: MUTED, fontWeight: '600' },
  roomCardSqft: { fontSize: 10, color: MUTED },

  // ── Room detail
  roomDetail: {
    backgroundColor: '#fff', borderRadius: radii.xl,
    borderWidth: 1, borderColor: colors.light.border,
    overflow: 'hidden',
  },
  roomImage: { width: '100%', height: 180 },
  roomImagePlaceholder: {
    width: '100%', height: 140,
    backgroundColor: `${colors.light.accent}`,
    alignItems: 'center', justifyContent: 'center',
  },
  roomImagePlaceholderText: { fontSize: 60 },
  roomDetailBody: { padding: 16 },
  roomDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  roomDetailName: { fontSize: 16, fontWeight: '900', color: colors.light.foreground, letterSpacing: -0.2 },
  roomDetailType: { fontSize: 11, color: MUTED, marginTop: 2 },
  roomDetailStatusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50 },
  roomDetailStatusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },

  featuresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  featureChip: {
    backgroundColor: colors.light.accent, borderRadius: 50,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: colors.light.border,
  },
  featureText: { fontSize: 11, fontWeight: '700', color: colors.light.foreground, opacity: 0.7 },

  acBadge: {
    backgroundColor: '#eff6ff', borderRadius: radii.sm,
    paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start', marginBottom: 10,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  acBadgeText: { fontSize: 11, fontWeight: '700', color: '#1d4ed8' },
  tenantHint: { fontSize: 11, color: MUTED, marginBottom: 10, fontWeight: '600' },

  requestBtn: {
    marginTop: 4,
    backgroundColor: colors.light.primary,
    paddingVertical: 14, borderRadius: radii.lg,
    alignItems: 'center',
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 3,
  },
  requestBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // ── Error state
  errorEmoji: { fontSize: 48, marginBottom: 4 },
  errorTitle: { fontSize: 18, fontWeight: '800', color: colors.light.foreground },
  errorSub: { fontSize: 12, color: MUTED, textAlign: 'center', maxWidth: 260 },
  backFromErrorBtn: {
    marginTop: 16,
    backgroundColor: `${colors.light.primary}15`,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: radii.lg,
  },
  backFromErrorBtnText: { fontSize: 13, fontWeight: '800', color: colors.light.primary },
});
