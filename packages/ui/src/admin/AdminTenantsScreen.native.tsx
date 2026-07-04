import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  TextInput, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { MotiView } from 'moti';
import { useAdminTenants } from '@aaram/core';
import type { AdminTenantsClient, AdminTenantRow, AdminTenantStatus } from '@aaram/core';
import { colors, radii } from '@aaram/config';

// ── Constants ─────────────────────────────────────────────────────────────────

const MUTED = '#9E998F';

const STATUS_LABEL: Record<AdminTenantStatus | 'all', string> = {
  all:       'All',
  active:    'Active',
  notice:    'Notice',
  moved_out: 'Moved Out',
};

const STATUS_COLOR: Record<AdminTenantStatus, string> = {
  active:    colors.light.secondary,
  notice:    '#F59E0B',
  moved_out: MUTED,
};

const STATUS_FILTERS = ['all', 'active', 'notice', 'moved_out'] as const;

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase()).join('');
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminTenantsScreenProps {
  supabase: AdminTenantsClient;
  onNotAuthenticated: () => void;
  onBack?: () => void;
}

// ── Tenant Card ───────────────────────────────────────────────────────────────

function TenantCard({ tenant, index }: { tenant: AdminTenantRow; index: number }) {
  const statusColor = STATUS_COLOR[tenant.status];

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 340, delay: index * 40 }}
      style={s.card}
    >
      {/* Left status stripe */}
      <View style={[s.stripe, { backgroundColor: statusColor }]} />

      <View style={s.cardBody}>
        <View style={s.cardTop}>
          {/* Avatar + name row */}
          <View style={s.nameRow}>
            <View style={[s.avatar, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[s.avatarText, { color: statusColor }]}>{initials(tenant.name)}</Text>
            </View>
            <View style={s.nameBlock}>
              <Text style={s.tenantName}>{tenant.name}</Text>
              {tenant.property_name ? (
                <Text style={s.tenantLocation}>
                  {tenant.property_name}{tenant.room_name ? ` · ${tenant.room_name}` : ''}
                </Text>
              ) : (
                <Text style={s.tenantLocation}>No room assigned</Text>
              )}
            </View>
          </View>

          {/* Status badge */}
          <View style={[s.statusBadge, { backgroundColor: `${statusColor}18` }]}>
            <Text style={[s.statusBadgeText, { color: statusColor }]}>
              {STATUS_LABEL[tenant.status]}
            </Text>
          </View>
        </View>

        {/* Contact info */}
        <View style={s.contactRow}>
          {tenant.email ? (
            <View style={s.contactItem}>
              <Text style={s.contactIcon}>✉</Text>
              <Text style={s.contactText} numberOfLines={1}>{tenant.email}</Text>
            </View>
          ) : null}
          {tenant.phone ? (
            <View style={s.contactItem}>
              <Text style={s.contactIcon}>☏</Text>
              <Text style={s.contactText}>{tenant.phone}</Text>
            </View>
          ) : null}
        </View>

        {/* Date info */}
        <View style={s.dateRow}>
          {tenant.move_in_date ? (
            <View style={s.dateItem}>
              <Text style={s.dateLabel}>MOVE IN</Text>
              <Text style={s.dateValue}>{formatDate(tenant.move_in_date)}</Text>
            </View>
          ) : null}
          {tenant.notice_date ? (
            <View style={s.dateItem}>
              <Text style={[s.dateLabel, { color: '#F59E0B' }]}>NOTICE</Text>
              <Text style={[s.dateValue, { color: '#F59E0B' }]}>{formatDate(tenant.notice_date)}</Text>
            </View>
          ) : null}
          {tenant.move_out_date ? (
            <View style={s.dateItem}>
              <Text style={[s.dateLabel, { color: MUTED }]}>MOVE OUT</Text>
              <Text style={[s.dateValue, { color: MUTED }]}>{formatDate(tenant.move_out_date)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </MotiView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function AdminTenantsScreen({ supabase, onNotAuthenticated, onBack }: AdminTenantsScreenProps) {
  const {
    filtered, query, setQuery,
    statusFilter, setStatusFilter,
    loading, refreshing, error, refresh,
  } = useAdminTenants(supabase);

  React.useEffect(() => {
    if (error === 'not_authenticated') onNotAuthenticated();
  }, [error, onNotAuthenticated]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={s.loadingText}>Loading tenants…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 380 }}
        style={s.header}
      >
        <View style={s.headerLeft}>
          {onBack && (
            <Pressable onPress={onBack} style={s.backBtn} hitSlop={12}>
              <Text style={s.backBtnText}>←</Text>
            </Pressable>
          )}
          <View>
            <Text style={s.headerTitle}>Members</Text>
            <Text style={s.headerSub}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      </MotiView>

      {/* ── Search bar ──────────────────────────────────────────── */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>⌕</Text>
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, email, or phone…"
          placeholderTextColor={MUTED}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8} style={s.clearBtn}>
            <Text style={s.clearBtnText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* ── Status filter chips ──────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterBar}
        style={s.filterScroll}
      >
        {STATUS_FILTERS.map(f => {
          const active = statusFilter === f;
          const color  = f === 'all' ? colors.light.primary : STATUS_COLOR[f];
          return (
            <Pressable
              key={f}
              style={[s.filterChip, active && { borderColor: color, backgroundColor: `${color}12` }]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[s.filterChipText, active && { color }]}>
                {STATUS_LABEL[f]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── List ────────────────────────────────────────────────── */}
      <ScrollView
        style={s.list}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.light.primary}
            colors={[colors.light.primary]}
          />
        }
      >
        {filtered.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyEmoji}>🔍</Text>
            <Text style={s.emptyTitle}>No tenants found</Text>
            <Text style={s.emptySub}>
              {query.trim()
                ? `No results for "${query}".`
                : statusFilter !== 'all'
                  ? `No ${STATUS_LABEL[statusFilter].toLowerCase()} tenants.`
                  : 'No tenants in the system.'}
            </Text>
            {query.trim() ? (
              <Pressable style={s.clearSearchBtn} onPress={() => setQuery('')}>
                <Text style={s.clearSearchBtnText}>Clear search</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          filtered.map((t, i) => (
            <TenantCard key={t.id} tenant={t} index={i} />
          ))
        )}
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
    paddingBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5, borderColor: colors.light.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 18, color: MUTED },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.light.foreground, letterSpacing: -0.4 },
  headerSub: { fontSize: 11, color: MUTED, marginTop: 1 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    borderWidth: 1.5, borderColor: colors.light.border,
    paddingHorizontal: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  searchIcon: { fontSize: 18, color: MUTED, marginRight: 8 },
  searchInput: {
    flex: 1, paddingVertical: 12,
    fontSize: 13, color: colors.light.foreground,
  },
  clearBtn: { padding: 4 },
  clearBtnText: { fontSize: 13, color: MUTED },

  filterScroll: { maxHeight: 46 },
  filterBar: { paddingHorizontal: 16, gap: 8, alignItems: 'center', paddingBottom: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 50, borderWidth: 1.5,
    borderColor: colors.light.border,
    backgroundColor: '#fff',
  },
  filterChipText: { fontSize: 11, fontWeight: '700', color: MUTED },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: radii.xl,
    borderWidth: 1, borderColor: colors.light.border,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  stripe: { width: 4 },
  cardBody: { flex: 1, padding: 14 },

  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '900' },
  nameBlock: { flex: 1 },
  tenantName: { fontSize: 14, fontWeight: '800', color: colors.light.foreground, letterSpacing: -0.2 },
  tenantLocation: { fontSize: 11, color: MUTED, marginTop: 2 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50, marginLeft: 8 },
  statusBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contactIcon: { fontSize: 11, color: MUTED },
  contactText: { fontSize: 11, color: colors.light.foreground, opacity: 0.65 },

  dateRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  dateItem: { gap: 2 },
  dateLabel: { fontSize: 8, fontWeight: '800', color: MUTED, letterSpacing: 1 },
  dateValue: { fontSize: 11, fontWeight: '700', color: colors.light.foreground },

  emptyBox: { alignItems: 'center', paddingVertical: 56, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.light.foreground },
  emptySub: { fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 18, maxWidth: 260 },
  clearSearchBtn: {
    marginTop: 8,
    backgroundColor: `${colors.light.primary}15`,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: radii.lg,
  },
  clearSearchBtnText: { fontSize: 13, fontWeight: '800', color: colors.light.primary },
});
