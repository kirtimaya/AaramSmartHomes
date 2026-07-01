import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { MotiView } from 'moti';
import { useAdminDashboard } from '@aaram/core';
import type { AdminSupabaseClient, WaterLog, AdminProperty, AdminRoom } from '@aaram/core';
import type { Ticket } from '@aaram/types';
import { colors, radii } from '@aaram/config';

// ── Constants ─────────────────────────────────────────────────────────────────

const MUTED = '#9E998F';

const TICKET_STATUS_COLOR: Record<string, string> = {
  Pending:      '#F59E0B',
  'In-Progress': '#3B82F6',
  Resolved:     colors.light.secondary,
};

const TICKET_PRIORITY_COLOR: Record<string, string> = {
  Low:    colors.light.secondary,
  Medium: '#F59E0B',
  High:   colors.light.primary,
  Urgent: '#EF4444',
};

function formatRevenue(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminDashboardScreenProps {
  onNavigateTenants?: () => void;
  supabase: AdminSupabaseClient;
  onNotAuthenticated: () => void;
  onNavigateTickets?: () => void;
  onNavigateFinancials?: () => void;
  onNavigateOccupancy?: () => void;
  onNavigateIoT?: () => void;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  emoji, label, value, trend, trendVariant, index, onPress,
}: {
  emoji: string;
  label: string;
  value: string;
  trend: string;
  trendVariant: 'good' | 'warn';
  index: number;
  onPress?: () => void;
}) {
  const trendColor = trendVariant === 'good' ? colors.light.secondary : colors.light.primary;
  return (
    <MotiView
      from={{ opacity: 0, translateY: 14 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 400, delay: 60 + index * 70 }}
      style={s.statCard}
    >
      <Pressable
        style={({ pressed }) => [s.statCardInner, pressed && { opacity: 0.82 }]}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={s.statCardTop}>
          <Text style={s.statEmoji}>{emoji}</Text>
          <View style={[s.trendBadge, { backgroundColor: `${trendColor}18` }]}>
            <Text style={[s.trendText, { color: trendColor }]}>{trend}</Text>
          </View>
        </View>
        <Text style={s.statLabel}>{label}</Text>
        <Text style={s.statValue}>{value}</Text>
      </Pressable>
    </MotiView>
  );
}

function TicketRow({ ticket, tenantName, index }: {
  ticket: Ticket;
  tenantName: string;
  index: number;
}) {
  const statusColor   = TICKET_STATUS_COLOR[ticket.status]   ?? MUTED;
  const priorityColor = TICKET_PRIORITY_COLOR[ticket.priority] ?? MUTED;
  return (
    <MotiView
      from={{ opacity: 0, translateX: -8 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', duration: 320, delay: index * 50 }}
      style={s.ticketRow}
    >
      <View style={s.ticketLeft}>
        <View style={[s.priorityBar, { backgroundColor: priorityColor }]} />
        <View style={s.ticketInfo}>
          <Text style={s.ticketCategory}>{ticket.category}</Text>
          <Text style={s.ticketResident} numberOfLines={1}>{tenantName}</Text>
        </View>
      </View>
      <View style={[s.statusBadge, { backgroundColor: `${statusColor}20` }]}>
        <Text style={[s.statusText, { color: statusColor }]}>{ticket.status}</Text>
      </View>
    </MotiView>
  );
}

function WaterLevelRow({ log, property, index }: {
  log: WaterLog;
  property?: AdminProperty;
  index: number;
}) {
  const pct     = log.level_percentage;
  const barColor = pct < 30 ? colors.light.primary : colors.light.secondary;
  return (
    <MotiView
      from={{ opacity: 0, translateX: 8 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', duration: 320, delay: index * 60 }}
      style={s.waterRow}
    >
      <View style={s.waterRowHeader}>
        <Text style={s.waterPropertyName}>{property?.name ?? 'Property'}</Text>
        <Text style={[s.waterPct, { color: barColor }]}>{pct}%</Text>
      </View>
      <View style={s.waterTrack}>
        <MotiView
          from={{ width: '0%' as any }}
          animate={{ width: `${pct}%` as any }}
          transition={{ type: 'timing', duration: 900, delay: 200 + index * 60 }}
          style={[s.waterFill, { backgroundColor: barColor }]}
        />
      </View>
    </MotiView>
  );
}

function PropertyStrip({ property, rooms, index }: {
  property: AdminProperty;
  rooms: AdminRoom[];
  index: number;
}) {
  const occupied = rooms.filter(r => r.occupancy_status === 'Occupied').length;
  const notice   = rooms.filter(r => r.occupancy_status === 'Notice Period').length;
  const vacant   = rooms.filter(r => r.occupancy_status === 'Vacant').length;
  const rate     = rooms.length ? Math.round(((occupied + notice) / rooms.length) * 100) : 0;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300, delay: index * 50 }}
      style={s.propRow}
    >
      <View style={s.propInfo}>
        <Text style={s.propName}>{property.name}</Text>
        <Text style={s.propLocation}>{property.location}</Text>
      </View>
      <View style={s.propStats}>
        <Text style={s.propOccupied}>{occupied} occ</Text>
        {notice > 0 && <Text style={s.propNotice}>{notice} notice</Text>}
        <Text style={s.propVacant}>{vacant} vacant</Text>
        <View style={s.propBar}>
          <View style={[s.propBarFill, { width: `${rate}%` as any }]} />
        </View>
        <Text style={s.propRate}>{rate}%</Text>
      </View>
    </MotiView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function AdminDashboardScreen({
  supabase,
  onNotAuthenticated,
  onNavigateTickets,
  onNavigateFinancials,
  onNavigateOccupancy,
  onNavigateIoT,
  onNavigateTenants,
}: AdminDashboardScreenProps) {
  const { data, loading, refreshing, error, refresh } = useAdminDashboard(supabase);

  React.useEffect(() => {
    if (error === 'not_authenticated') onNotAuthenticated();
  }, [error, onNotAuthenticated]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={s.loadingText}>Loading dashboard…</Text>
      </View>
    );
  }

  const revenueDisplay = data.monthlyRevenue > 0 ? formatRevenue(data.monthlyRevenue) : '—';
  const waterInsight = data.avgWaterLevel < 30
    ? 'Critically low — arrange refill'
    : data.avgWaterLevel < 50
    ? 'Moderate — monitor closely'
    : 'Healthy across all properties';

  const stats = [
    { emoji: '🏠', label: 'Occupancy',    value: `${data.occupancyRate}%`,   trend: `${data.noticeTenants} notice`, trendVariant: 'warn' as const,  onPress: onNavigateOccupancy },
    { emoji: '💰', label: 'Revenue',      value: revenueDisplay,              trend: 'This month',                  trendVariant: 'good' as const,  onPress: onNavigateFinancials },
    { emoji: '🎫', label: 'Open Tickets', value: String(data.openTickets),    trend: `${data.tickets.length} total`, trendVariant: 'warn' as const, onPress: onNavigateTickets },
    { emoji: '💧', label: 'Water Level',  value: `${data.avgWaterLevel}%`,    trend: data.avgWaterLevel < 30 ? 'Low' : 'Stable', trendVariant: data.avgWaterLevel < 30 ? 'warn' as const : 'good' as const, onPress: onNavigateIoT },
    { emoji: '👥', label: 'Tenants',      value: String(Object.keys(data.tenantNameMap).length), trend: `${data.noticeTenants} on notice`, trendVariant: 'warn' as const, onPress: onNavigateTenants },
  ];

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.light.primary}
          colors={[colors.light.primary]}
        />
      }
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 420 }}
        style={s.header}
      >
        <View style={s.heroBadge}>
          <Text style={s.heroBadgeText}>🌿 Live Dashboard</Text>
        </View>
        <Text style={s.heroTitle}>Aaram <Text style={s.heroTitleAccent}>Portfolio</Text></Text>
        <Text style={s.heroSub}>Real-time status across all managed properties.</Text>
      </MotiView>

      {/* ── Stats Grid ──────────────────────────────────────────── */}
      <View style={s.statsGrid}>
        {stats.map((stat, i) => (
          <StatCard key={stat.label} {...stat} index={i} />
        ))}
      </View>

      {/* ── Recent Tickets ──────────────────────────────────────── */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.cardAccentBar} />
          <Text style={s.cardTitle}>Resident Support</Text>
          {onNavigateTickets && (
            <Pressable onPress={onNavigateTickets} style={s.cardLink}>
              <Text style={s.cardLinkText}>View All →</Text>
            </Pressable>
          )}
        </View>
        {data.tickets.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyEmoji}>✅</Text>
            <Text style={s.emptyText}>No open tickets</Text>
          </View>
        ) : (
          <View style={s.ticketList}>
            {data.tickets.map((t, i) => (
              <TicketRow
                key={t.id}
                ticket={t}
                tenantName={data.tenantNameMap[t.requester_id] ?? t.requester_id.slice(0, 8).toUpperCase()}
                index={i}
              />
            ))}
          </View>
        )}
      </View>

      {/* ── Water Levels ────────────────────────────────────────── */}
      {data.waterLogs.length > 0 && (
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardAccentBar, { backgroundColor: colors.light.secondary }]} />
            <Text style={s.cardTitle}>Water Telemetry</Text>
          </View>
          <View style={s.waterList}>
            {data.waterLogs.map((log, i) => (
              <WaterLevelRow
                key={log.id}
                log={log}
                property={data.properties.find(p => p.id === log.property_id)}
                index={i}
              />
            ))}
          </View>
          <View style={s.waterInsight}>
            <Text style={s.waterInsightLabel}>INSIGHT</Text>
            <Text style={s.waterInsightText}>{waterInsight}</Text>
          </View>
        </View>
      )}

      {/* ── Properties at a Glance ──────────────────────────────── */}
      {data.properties.length > 0 && (
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardAccentBar, { backgroundColor: colors.light.secondary }]} />
            <Text style={s.cardTitle}>Properties at a Glance</Text>
            {onNavigateOccupancy && (
              <Pressable onPress={onNavigateOccupancy} style={s.cardLink}>
                <Text style={s.cardLinkText}>Occupancy →</Text>
              </Pressable>
            )}
          </View>
          <View style={s.propList}>
            {data.properties.map((prop, i) => (
              <PropertyStrip
                key={prop.id}
                property={prop}
                rooms={data.rooms.filter(r => r.property_id === prop.id)}
                index={i}
              />
            ))}
          </View>
        </View>
      )}

      <View style={s.footerPad} />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background },
  content: { paddingTop: Platform.OS === 'ios' ? 60 : 36 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, fontWeight: '600', color: MUTED },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.light.secondary}18`,
    borderWidth: 1,
    borderColor: `${colors.light.secondary}30`,
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 14,
  },
  heroBadgeText: { fontSize: 9, fontWeight: '800', color: colors.light.secondary, letterSpacing: 1.2, textTransform: 'uppercase' },
  heroTitle: { fontSize: 36, fontWeight: '900', color: colors.light.foreground, letterSpacing: -1, marginBottom: 6 },
  heroTitleAccent: { color: colors.light.primary, fontStyle: 'italic' },
  heroSub: { fontSize: 12, color: MUTED, lineHeight: 18 },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
    overflow: 'hidden',
  },
  statCardInner: { padding: 16 },
  statCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statEmoji: { fontSize: 24 },
  trendBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 50 },
  trendText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  statLabel: { fontSize: 9, fontWeight: '800', color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.light.foreground, letterSpacing: -0.5 },

  // Generic card
  card: {
    marginHorizontal: 14,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.light.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    gap: 10,
  },
  cardAccentBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: colors.light.primary,
  },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.light.foreground, letterSpacing: -0.2 },
  cardLink: {},
  cardLinkText: { fontSize: 11, fontWeight: '700', color: colors.light.primary },

  emptyBox: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyEmoji: { fontSize: 28 },
  emptyText: { fontSize: 12, color: MUTED, fontWeight: '600' },

  // Tickets
  ticketList: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10 },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.light.border}80`,
  },
  ticketLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  priorityBar: { width: 3, height: 32, borderRadius: 2 },
  ticketInfo: { flex: 1 },
  ticketCategory: { fontSize: 13, fontWeight: '700', color: colors.light.foreground },
  ticketResident: { fontSize: 10, color: MUTED, marginTop: 2 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 50, marginLeft: 8 },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },

  // Water
  waterList: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  waterRow: { marginBottom: 16 },
  waterRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  waterPropertyName: { fontSize: 13, fontWeight: '700', color: colors.light.foreground },
  waterPct: { fontSize: 15, fontWeight: '800' },
  waterTrack: { height: 6, borderRadius: 3, backgroundColor: `${colors.light.foreground}08`, overflow: 'hidden' },
  waterFill: { height: 6, borderRadius: 3 },
  waterInsight: {
    margin: 14,
    marginTop: 4,
    padding: 12,
    backgroundColor: `${colors.light.secondary}10`,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: `${colors.light.secondary}20`,
  },
  waterInsightLabel: { fontSize: 8, fontWeight: '800', color: colors.light.secondary, letterSpacing: 1.5, marginBottom: 3 },
  waterInsightText: { fontSize: 11, color: colors.light.foreground, opacity: 0.65, lineHeight: 16, fontStyle: 'italic' },

  // Properties
  propList: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10 },
  propRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.light.border}80`,
    gap: 8,
  },
  propInfo: { flex: 1 },
  propName: { fontSize: 13, fontWeight: '700', color: colors.light.foreground },
  propLocation: { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginTop: 2 },
  propStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  propOccupied: { fontSize: 9, fontWeight: '700', color: colors.light.secondary },
  propNotice: { fontSize: 9, fontWeight: '700', color: '#F59E0B' },
  propVacant: { fontSize: 9, fontWeight: '700', color: MUTED },
  propBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: `${colors.light.foreground}10`, overflow: 'hidden' },
  propBarFill: { height: 4, borderRadius: 2, backgroundColor: colors.light.secondary },
  propRate: { fontSize: 9, fontWeight: '800', color: MUTED, width: 22, textAlign: 'right' },

  footerPad: { height: 24 },
});
