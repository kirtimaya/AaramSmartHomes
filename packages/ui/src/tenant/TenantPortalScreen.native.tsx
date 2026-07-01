import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  Modal, ActivityIndicator, RefreshControl, Alert, Platform,
} from 'react-native';
import { MotiView } from 'moti';
import { useTenantDashboard, useTicketForm } from '@aaram/core';
import type { TenantSupabaseClient, TicketCategory, TicketPriority } from '@aaram/core';
import type { Tenant, Ticket, BillSplit } from '@aaram/types';
import { colors, radii } from '@aaram/config';

const MUTED = '#9E998F';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'tickets' | 'bills';

export interface TenantPortalScreenProps {
  supabase: TenantSupabaseClient;
  onNotAuthenticated: () => void;
  onSignOut: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Pending:      colors.light.primary,
  'In-Progress': '#F59E0B',
  Resolved:     colors.light.secondary,
};

const CATEGORIES: TicketCategory[] = ['Maintenance', 'Electrical', 'Plumbing', 'Housekeeping', 'Other'];
const PRIORITIES: TicketPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  Low:    '#10B981',
  Medium: '#F59E0B',
  High:   '#F97316',
  Urgent: '#EF4444',
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ emoji, value, label, index }: { emoji: string; value: string; label: string; index: number }) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 420, delay: 80 + index * 70 }}
      style={s.statCard}
    >
      <Text style={s.statEmoji}>{emoji}</Text>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </MotiView>
  );
}

function TicketCard({ ticket, index }: { ticket: Ticket; index: number }) {
  const statusColor = STATUS_COLORS[ticket.status] ?? MUTED;
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 360, delay: index * 55 }}
      style={s.card}
    >
      <View style={s.cardRow}>
        <Text style={s.cardTitle}>{ticket.category}</Text>
        <View style={[s.badge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[s.badgeText, { color: statusColor }]}>{ticket.status}</Text>
        </View>
      </View>
      <Text style={s.cardDesc} numberOfLines={2}>{ticket.description}</Text>
      <Text style={s.cardDate}>{formatDate(ticket.created_at)}</Text>
      {ticket.admin_note ? (
        <View style={s.adminNote}>
          <Text style={s.adminNoteLabel}>Admin Note</Text>
          <Text style={s.adminNoteText}>{ticket.admin_note}</Text>
        </View>
      ) : null}
    </MotiView>
  );
}

function BillCard({ bill, index }: { bill: BillSplit; index: number }) {
  const paid = !!bill.paid;
  const statusColor = paid ? colors.light.secondary : colors.light.primary;
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 360, delay: index * 55 }}
      style={s.card}
    >
      <View style={s.cardRow}>
        <Text style={s.cardTitle}>Room ···{bill.room_id.slice(-4)}</Text>
        <View style={[s.badge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[s.badgeText, { color: statusColor }]}>{paid ? 'PAID' : 'PENDING'}</Text>
        </View>
      </View>
      <View style={s.billAmounts}>
        <View style={s.billItem}>
          <Text style={s.billLabel}>AC Charge</Text>
          <Text style={s.billValue}>{formatCurrency(bill.ac_charge)}</Text>
        </View>
        <View style={s.billItem}>
          <Text style={s.billLabel}>Common</Text>
          <Text style={s.billValue}>{formatCurrency(bill.common_share)}</Text>
        </View>
        <View style={s.billItem}>
          <Text style={s.billLabel}>Total</Text>
          <Text style={[s.billValue, s.billTotal]}>{formatCurrency(bill.total_payable)}</Text>
        </View>
      </View>
    </MotiView>
  );
}

function EmptyState({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <View style={s.emptyState}>
      <Text style={s.emptyEmoji}>{emoji}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

// ── Raise-Ticket Sheet ────────────────────────────────────────────────────────

function RaiseTicketSheet({
  visible, onClose, supabase, tenantId, onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  supabase: TenantSupabaseClient;
  tenantId: string;
  onSuccess: () => void;
}) {
  const form = useTicketForm(supabase, tenantId, () => {
    onSuccess();
    setTimeout(() => { form.reset(); onClose(); }, 1600);
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={s.sheetContainer} contentContainerStyle={s.sheetContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>Raise a Ticket</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={s.sheetClose}>✕</Text>
          </Pressable>
        </View>

        {form.submitted ? (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={s.successBox}
          >
            <Text style={s.successEmoji}>✅</Text>
            <Text style={s.successTitle}>Ticket Raised!</Text>
            <Text style={s.successSub}>We'll get back to you shortly.</Text>
          </MotiView>
        ) : (
          <>
            {/* Category */}
            <Text style={s.fieldLabel}>Category</Text>
            <View style={s.categoryGrid}>
              {CATEGORIES.map(c => (
                <Pressable
                  key={c}
                  style={[s.categoryBtn, form.category === c && s.categoryBtnActive]}
                  onPress={() => form.setCategory(c)}
                >
                  <Text style={[s.categoryBtnText, form.category === c && s.categoryBtnTextActive]}>
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Priority */}
            <Text style={s.fieldLabel}>Priority</Text>
            <View style={s.priorityRow}>
              {PRIORITIES.map(p => {
                const active = form.priority === p;
                const color  = PRIORITY_COLORS[p];
                return (
                  <Pressable
                    key={p}
                    style={[
                      s.priorityBtn,
                      active && { backgroundColor: color, borderColor: color },
                    ]}
                    onPress={() => form.setPriority(p)}
                  >
                    <Text style={[s.priorityBtnText, active && { color: '#fff' }]}>{p}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Description */}
            <Text style={s.fieldLabel}>Describe the Issue</Text>
            <TextInput
              style={s.textarea}
              placeholder="e.g. AC not cooling below 28°C since yesterday…"
              placeholderTextColor={MUTED}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={form.description}
              onChangeText={form.setDescription}
            />

            {form.error ? <Text style={s.errorText}>{form.error}</Text> : null}

            <Pressable
              style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.82 }, form.loading && s.primaryBtnDisabled]}
              onPress={form.submit}
              disabled={form.loading}
            >
              {form.loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryBtnText}>Submit Ticket</Text>}
            </Pressable>
          </>
        )}
      </ScrollView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function TenantPortalScreen({ supabase, onNotAuthenticated, onSignOut }: TenantPortalScreenProps) {
  const { tenant, tickets, bills, loading, refreshing, error, refresh } = useTenantDashboard(supabase);
  const [activeTab,    setActiveTab]    = useState<Tab>('dashboard');
  const [ticketSheet,  setTicketSheet]  = useState(false);

  const handleError = useCallback(() => {
    if (error === 'not_authenticated') onNotAuthenticated();
  }, [error, onNotAuthenticated]);

  React.useEffect(() => { handleError(); }, [handleError]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: onSignOut },
    ]);
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={s.loadingText}>Loading your portal…</Text>
      </View>
    );
  }

  const firstName = tenant?.name?.split(' ')[0] ?? 'Resident';

  return (
    <View style={s.root}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <MotiView
        from={{ opacity: 0, translateY: -12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 380 }}
        style={s.header}
      >
        <View>
          <Text style={s.headerGreeting}>
            {tenant ? `Namaste, ${firstName} 🌿` : 'My Portal'}
          </Text>
          {tenant?.status ? (
            <View style={s.statusRow}>
              <View style={[
                s.statusDot,
                { backgroundColor: tenant.status === 'active' ? colors.light.secondary : colors.light.primary },
              ]} />
              <Text style={s.statusText}>{tenant.status.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>
        <Pressable style={s.signOutBtn} onPress={handleSignOut}>
          <Text style={s.signOutText}>Sign Out</Text>
        </Pressable>
      </MotiView>

      {/* ── Tab Bar ────────────────────────────────────────────────── */}
      <View style={s.tabBar}>
        {(['dashboard', 'tickets', 'bills'] as Tab[]).map(tab => (
          <Pressable
            key={tab}
            style={[s.tabItem, activeTab === tab && s.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'dashboard' ? '🏠 Home' : tab === 'tickets' ? '🎫 Tickets' : '⚡ Bills'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Content ────────────────────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
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
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <View>
            {/* Stats row */}
            <View style={s.statsRow}>
              <StatCard emoji="🎫" value={String(tickets.length)} label="Tickets" index={0} />
              <StatCard emoji="⚡" value={String(bills.length)} label="Bills" index={1} />
              <StatCard
                emoji="📅"
                value={tenant?.move_in_date
                  ? new Date(tenant.move_in_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                  : '—'}
                label="Move-in"
                index={2}
              />
            </View>

            {/* Quick actions */}
            <Text style={s.sectionLabel}>Quick Actions</Text>
            <View style={s.actionsRow}>
              <MotiView
                from={{ opacity: 0, translateY: 14 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 380, delay: 180 }}
                style={[s.actionCard, s.actionCardPrimary]}
              >
                <Pressable
                  style={({ pressed }) => [s.actionCardInner, pressed && { opacity: 0.8 }]}
                  onPress={() => setTicketSheet(true)}
                >
                  <Text style={s.actionEmoji}>🔧</Text>
                  <Text style={s.actionTitle}>Raise Ticket</Text>
                  <Text style={s.actionSub}>Maintenance or support</Text>
                </Pressable>
              </MotiView>

              <MotiView
                from={{ opacity: 0, translateY: 14 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 380, delay: 250 }}
                style={s.actionCard}
              >
                <Pressable
                  style={({ pressed }) => [s.actionCardInner, pressed && { opacity: 0.8 }]}
                  onPress={() => setActiveTab('bills')}
                >
                  <Text style={s.actionEmoji}>⚡</Text>
                  <Text style={s.actionTitle}>View Bills</Text>
                  <Text style={s.actionSub}>Electricity splits</Text>
                </Pressable>
              </MotiView>
            </View>

            {/* Recent tickets preview */}
            {tickets.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Recent Tickets</Text>
                {tickets.slice(0, 3).map((t, i) => (
                  <TicketCard key={t.id} ticket={t} index={i} />
                ))}
              </>
            )}
          </View>
        )}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <View>
            <Pressable
              style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.82 }]}
              onPress={() => setTicketSheet(true)}
            >
              <Text style={s.primaryBtnText}>+ Raise New Ticket</Text>
            </Pressable>

            {tickets.length === 0 ? (
              <EmptyState emoji="🎫" title="No tickets yet" sub="Raise a ticket if you need maintenance or support." />
            ) : (
              tickets.map((t, i) => <TicketCard key={t.id} ticket={t} index={i} />)
            )}
          </View>
        )}

        {/* Bills Tab */}
        {activeTab === 'bills' && (
          <View>
            {bills.length === 0 ? (
              <EmptyState emoji="⚡" title="No bills yet" sub="Your electricity bill splits will appear here." />
            ) : (
              bills.map((b, i) => <BillCard key={b.id} bill={b} index={i} />)
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Raise Ticket Sheet ─────────────────────────────────────── */}
      {tenant && (
        <RaiseTicketSheet
          visible={ticketSheet}
          onClose={() => setTicketSheet(false)}
          supabase={supabase}
          tenantId={tenant.id}
          onSuccess={refresh}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, fontWeight: '600', color: MUTED },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
  },
  headerGreeting: { fontSize: 22, fontWeight: '800', color: colors.light.foreground, letterSpacing: -0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 1 },
  signOutBtn: {
    borderWidth: 1.5,
    borderColor: colors.light.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  signOutText: { fontSize: 12, fontWeight: '700', color: MUTED },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingHorizontal: 20,
    backgroundColor: colors.light.background,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: colors.light.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: MUTED },
  tabTextActive: { color: colors.light.primary },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statEmoji: { fontSize: 20, marginBottom: 5 },
  statValue: { fontSize: 15, fontWeight: '800', color: colors.light.foreground },
  statLabel: { fontSize: 10, fontWeight: '700', color: MUTED, marginTop: 2, letterSpacing: 0.5 },

  sectionLabel: { fontSize: 15, fontWeight: '800', color: colors.light.foreground, marginBottom: 12, letterSpacing: -0.2 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  actionCardPrimary: {
    borderColor: `${colors.light.primary}30`,
    backgroundColor: `${colors.light.primary}08`,
  },
  actionCardInner: { padding: 18 },
  actionEmoji: { fontSize: 26, marginBottom: 8 },
  actionTitle: { fontSize: 13, fontWeight: '800', color: colors.light.foreground },
  actionSub: { fontSize: 11, color: MUTED, marginTop: 2 },

  // Generic card
  card: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.light.foreground },
  cardDesc: { fontSize: 13, color: colors.light.foreground, lineHeight: 19, opacity: 0.65 },
  cardDate: { fontSize: 11, color: MUTED, marginTop: 8 },
  adminNote: { marginTop: 10, backgroundColor: `${colors.light.secondary}15`, borderRadius: radii.sm, padding: 10 },
  adminNoteLabel: { fontSize: 9, fontWeight: '800', color: colors.light.secondary, letterSpacing: 1, marginBottom: 3 },
  adminNoteText: { fontSize: 12, lineHeight: 17, color: colors.light.foreground, opacity: 0.75 },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },

  // Bill amounts
  billAmounts: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 },
  billItem: { alignItems: 'center' },
  billLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.3 },
  billValue: { fontSize: 15, fontWeight: '700', color: colors.light.foreground, marginTop: 3 },
  billTotal: { color: colors.light.primary, fontSize: 17, fontWeight: '800' },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 44,
    gap: 8,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.light.foreground },
  emptySub: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19, maxWidth: 260 },

  // Primary button
  primaryBtn: {
    backgroundColor: colors.light.primary,
    paddingVertical: 16,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },

  // Sheet (Raise Ticket Modal)
  sheetContainer: { flex: 1, backgroundColor: '#fff' },
  sheetContent: { padding: 24, paddingTop: 32 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: colors.light.foreground, letterSpacing: -0.3 },
  sheetClose: { fontSize: 22, color: MUTED, lineHeight: 28 },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.light.foreground, marginBottom: 10, opacity: 0.55, letterSpacing: 0.5 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  categoryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    backgroundColor: '#f8f8f6',
  },
  categoryBtnActive: {
    borderColor: colors.light.primary,
    backgroundColor: `${colors.light.primary}12`,
  },
  categoryBtnText: { fontSize: 12, fontWeight: '700', color: MUTED },
  categoryBtnTextActive: { color: colors.light.primary },

  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  priorityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    alignItems: 'center',
    backgroundColor: '#f8f8f6',
  },
  priorityBtnText: { fontSize: 11, fontWeight: '800', color: MUTED, letterSpacing: 0.3 },

  textarea: {
    borderWidth: 1.5,
    borderColor: colors.light.border,
    borderRadius: radii.md,
    padding: 14,
    minHeight: 120,
    fontSize: 14,
    lineHeight: 20,
    color: colors.light.foreground,
    backgroundColor: '#f8f8f6',
    marginBottom: 8,
  },
  errorText: { fontSize: 12, color: '#EF4444', fontWeight: '600', marginBottom: 10 },

  successBox: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  successEmoji: { fontSize: 48 },
  successTitle: { fontSize: 18, fontWeight: '800', color: '#059669', letterSpacing: -0.2 },
  successSub: { fontSize: 13, color: MUTED },
});
