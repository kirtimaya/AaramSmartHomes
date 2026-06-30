import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import type { Tenant, Ticket, BillSplit } from '../../lib/types';
import { colors, radius, shadow } from '../../lib/theme';

type Tab = 'dashboard' | 'tickets' | 'bills';

export default function PortalScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? colors.backgroundDark : colors.background;
  const fg = isDark ? colors.foregroundDark : colors.foreground;
  const surface = isDark ? colors.surfaceDark : colors.white;
  const borderColor = isDark ? colors.borderDark : colors.border;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [bills, setBills] = useState<BillSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [ticketModal, setTicketModal] = useState(false);
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Maintenance');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    await loadData(session.user.id);
  };

  const loadData = async (userId: string) => {
    setLoading(true);
    // Fetch tenant profile
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setTenant(tenantData);

    // Fetch tickets
    const { data: ticketData } = await supabase
      .from('tickets')
      .select('*')
      .eq('requester_id', userId)
      .order('created_at', { ascending: false });
    setTickets(ticketData || []);

    // Fetch bill splits
    const { data: billData } = await supabase
      .from('bill_splits')
      .select('*')
      .eq('tenant_id', userId)
      .order('id', { ascending: false })
      .limit(6);
    setBills(billData || []);

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await loadData(session.user.id);
    setRefreshing(false);
  };

  const submitTicket = async () => {
    if (!ticketDesc.trim()) return Alert.alert('Please describe your issue');
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace('/login'); return; }

    const { error } = await supabase.from('tickets').insert({
      requester_id: session.user.id,
      requester_type: 'tenant',
      category: ticketCategory,
      priority: 'Medium',
      status: 'Pending',
      description: ticketDesc,
    });

    if (error) {
      Alert.alert('Error', 'Failed to submit ticket. Please try again.');
    } else {
      Alert.alert('✅ Submitted', 'Your ticket has been raised. We will get back to you soon.');
      setTicketModal(false);
      setTicketDesc('');
      await loadData(session.user.id);
    }
    setSubmitting(false);
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  const s = makeStyles(isDark, bg, fg, surface, borderColor);

  if (loading) {
    return (
      <View style={[s.centered, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[s.loadingText, { color: colors.muted }]}>Loading your portal…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerGreeting}>
            {tenant ? `Hello, ${tenant.name.split(' ')[0]} 👋` : 'My Portal'}
          </Text>
          {tenant?.status && (
            <View style={s.statusBadge}>
              <View style={[s.statusDot, { backgroundColor: tenant.status === 'active' ? colors.secondary : colors.primary }]} />
              <Text style={s.statusText}>{tenant.status.toUpperCase()}</Text>
            </View>
          )}
        </View>
        <Pressable style={s.signOutBtn} onPress={handleSignOut}>
          <Text style={s.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      {/* ── Tab Bar ─────────────────────────────────────────────── */}
      <View style={[s.tabBar, { backgroundColor: surface, borderBottomColor: borderColor }]}>
        {(['dashboard', 'tickets', 'bills'] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[s.tabItem, activeTab === tab && s.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'dashboard' ? '🏠 Home' : tab === 'tickets' ? '🎫 Tickets' : '💡 Bills'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ── Dashboard Tab ───────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <View>
            {/* Quick stats */}
            <View style={s.statsRow}>
              <View style={[s.statCard, { backgroundColor: surface, borderColor }]}>
                <Text style={s.statEmoji}>🎫</Text>
                <Text style={[s.statNumber, { color: fg }]}>{tickets.length}</Text>
                <Text style={s.statLabel}>Tickets</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: surface, borderColor }]}>
                <Text style={s.statEmoji}>💡</Text>
                <Text style={[s.statNumber, { color: fg }]}>{bills.length}</Text>
                <Text style={s.statLabel}>Bills</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: surface, borderColor }]}>
                <Text style={s.statEmoji}>📅</Text>
                <Text style={[s.statNumber, { color: fg }]}>
                  {tenant?.move_in_date
                    ? new Date(tenant.move_in_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                    : '—'}
                </Text>
                <Text style={s.statLabel}>Moved In</Text>
              </View>
            </View>

            {/* Quick actions */}
            <Text style={[s.groupLabel, { color: fg }]}>Quick Actions</Text>
            <View style={s.actionsGrid}>
              <Pressable
                style={[s.actionCard, { backgroundColor: surface, borderColor }]}
                onPress={() => setTicketModal(true)}
              >
                <Text style={s.actionEmoji}>🔧</Text>
                <Text style={[s.actionTitle, { color: fg }]}>Raise Ticket</Text>
                <Text style={s.actionSub}>Maintenance or support</Text>
              </Pressable>
              <Pressable
                style={[s.actionCard, { backgroundColor: surface, borderColor }]}
                onPress={() => setActiveTab('bills')}
              >
                <Text style={s.actionEmoji}>💡</Text>
                <Text style={[s.actionTitle, { color: fg }]}>View Bills</Text>
                <Text style={s.actionSub}>Electricity & charges</Text>
              </Pressable>
            </View>

            {/* Recent tickets */}
            {tickets.length > 0 && (
              <>
                <Text style={[s.groupLabel, { color: fg }]}>Recent Tickets</Text>
                {tickets.slice(0, 3).map((t) => (
                  <TicketCard key={t.id} ticket={t} fg={fg} surface={surface} borderColor={borderColor} s={s} />
                ))}
              </>
            )}
          </View>
        )}

        {/* ── Tickets Tab ─────────────────────────────────────── */}
        {activeTab === 'tickets' && (
          <View>
            <Pressable
              style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.8 }]}
              onPress={() => setTicketModal(true)}
            >
              <Text style={s.primaryBtnText}>+ Raise New Ticket</Text>
            </Pressable>

            {tickets.length === 0 ? (
              <View style={[s.emptyCard, { backgroundColor: surface, borderColor }]}>
                <Text style={s.emptyEmoji}>🎫</Text>
                <Text style={[s.emptyTitle, { color: fg }]}>No tickets yet</Text>
                <Text style={s.emptySub}>Raise a ticket if you need maintenance or support.</Text>
              </View>
            ) : (
              tickets.map((t) => (
                <TicketCard key={t.id} ticket={t} fg={fg} surface={surface} borderColor={borderColor} s={s} />
              ))
            )}
          </View>
        )}

        {/* ── Bills Tab ───────────────────────────────────────── */}
        {activeTab === 'bills' && (
          <View>
            {bills.length === 0 ? (
              <View style={[s.emptyCard, { backgroundColor: surface, borderColor }]}>
                <Text style={s.emptyEmoji}>💡</Text>
                <Text style={[s.emptyTitle, { color: fg }]}>No bills yet</Text>
                <Text style={s.emptySub}>Your electricity bill splits will appear here.</Text>
              </View>
            ) : (
              bills.map((b) => (
                <View key={b.id} style={[s.billCard, { backgroundColor: surface, borderColor }]}>
                  <View style={s.billHeader}>
                    <Text style={[s.billRoom, { color: fg }]}>Room {b.room_id?.slice(-4)}</Text>
                    <View style={[s.billPaidBadge, { backgroundColor: b.paid ? `${colors.secondary}20` : `${colors.primary}20` }]}>
                      <Text style={[s.billPaidText, { color: b.paid ? colors.secondary : colors.primary }]}>
                        {b.paid ? 'PAID' : 'PENDING'}
                      </Text>
                    </View>
                  </View>
                  <View style={s.billRow}>
                    <View style={s.billItem}>
                      <Text style={s.billLabel}>AC Charge</Text>
                      <Text style={[s.billValue, { color: fg }]}>₹{b.ac_charge.toFixed(0)}</Text>
                    </View>
                    <View style={s.billItem}>
                      <Text style={s.billLabel}>Common Share</Text>
                      <Text style={[s.billValue, { color: fg }]}>₹{b.common_share.toFixed(0)}</Text>
                    </View>
                    <View style={s.billItem}>
                      <Text style={s.billLabel}>Total</Text>
                      <Text style={[s.billTotal, { color: colors.primary }]}>₹{b.total_payable.toFixed(0)}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Raise Ticket Modal ────────────────────────────────── */}
      <Modal visible={ticketModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modalContainer, { backgroundColor: bg }]}>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: fg }]}>Raise a Ticket</Text>
            <Pressable onPress={() => setTicketModal(false)}>
              <Text style={{ fontSize: 24, color: colors.muted }}>✕</Text>
            </Pressable>
          </View>

          {/* Category picker */}
          <Text style={[s.fieldLabel, { color: fg }]}>Category</Text>
          <View style={s.categoryRow}>
            {['Maintenance', 'Support'].map((cat) => (
              <Pressable
                key={cat}
                style={[
                  s.categoryBtn,
                  { borderColor: ticketCategory === cat ? colors.primary : borderColor },
                  ticketCategory === cat && { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => setTicketCategory(cat)}
              >
                <Text style={[s.categoryText, { color: ticketCategory === cat ? colors.primary : colors.muted }]}>
                  {cat === 'Maintenance' ? '🔧 Maintenance' : '💬 Support'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Description */}
          <Text style={[s.fieldLabel, { color: fg }]}>Description</Text>
          <TextInput
            style={[s.textarea, { backgroundColor: surface, borderColor, color: fg }]}
            placeholder="Describe your issue in detail…"
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={ticketDesc}
            onChangeText={setTicketDesc}
          />

          <Pressable
            style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.8 }, { marginTop: 20 }]}
            onPress={submitTicket}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.primaryBtnText}>Submit Ticket</Text>
            )}
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function TicketCard({ ticket, fg, surface, borderColor, s }: any) {
  const statusColor = {
    'Pending': colors.primary,
    'In-Progress': '#F59E0B',
    'Resolved': colors.secondary,
  }[ticket.status] || colors.muted;

  return (
    <View style={[s.ticketCard, { backgroundColor: surface, borderColor }]}>
      <View style={s.ticketHeader}>
        <Text style={[s.ticketCategory, { color: fg }]}>{ticket.category}</Text>
        <View style={[s.ticketStatusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[s.ticketStatusText, { color: statusColor }]}>{ticket.status}</Text>
        </View>
      </View>
      <Text style={[s.ticketDesc, { color: fg }]} numberOfLines={2}>{ticket.description}</Text>
      <Text style={s.ticketDate}>
        {new Date(ticket.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </Text>
      {ticket.admin_note && (
        <View style={[s.adminNote, { backgroundColor: `${colors.secondary}15` }]}>
          <Text style={s.adminNoteLabel}>Admin Note</Text>
          <Text style={[s.adminNoteText, { color: fg }]}>{ticket.admin_note}</Text>
        </View>
      )}
    </View>
  );
}

const makeStyles = (isDark: boolean, bg: string, fg: string, surface: string, borderColor: string) =>
  StyleSheet.create({
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 16, fontSize: 14, fontWeight: '600' },

    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
      backgroundColor: bg,
    },
    headerGreeting: { fontSize: 22, fontWeight: '800', color: fg, letterSpacing: -0.3 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: 10, fontWeight: '800', color: colors.muted, letterSpacing: 1 },
    signOutBtn: {
      borderWidth: 1.5,
      borderColor: borderColor,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.md,
    },
    signOutText: { fontSize: 12, fontWeight: '700', color: colors.muted },

    // Tabs
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      paddingHorizontal: 20,
    },
    tabItem: {
      flex: 1,
      paddingVertical: 13,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabItemActive: { borderBottomColor: colors.primary },
    tabText: { fontSize: 12, fontWeight: '700', color: colors.muted },
    tabTextActive: { color: colors.primary },

    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

    // Stats
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
    statCard: {
      flex: 1,
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: 16,
      alignItems: 'center',
      ...shadow.sm,
    },
    statEmoji: { fontSize: 22, marginBottom: 6 },
    statNumber: { fontSize: 16, fontWeight: '800' },
    statLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, marginTop: 2, letterSpacing: 0.5 },

    groupLabel: { fontSize: 16, fontWeight: '800', marginBottom: 14, letterSpacing: -0.2 },

    // Actions grid
    actionsGrid: { flexDirection: 'row', gap: 12, marginBottom: 28 },
    actionCard: {
      flex: 1,
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: 18,
      ...shadow.sm,
    },
    actionEmoji: { fontSize: 28, marginBottom: 8 },
    actionTitle: { fontSize: 14, fontWeight: '800' },
    actionSub: { fontSize: 11, color: colors.muted, marginTop: 3 },

    // Empty state
    emptyCard: {
      borderRadius: radius.xl,
      borderWidth: 1,
      padding: 40,
      alignItems: 'center',
      marginTop: 12,
    },
    emptyEmoji: { fontSize: 44, marginBottom: 12 },
    emptyTitle: { fontSize: 17, fontWeight: '800' },
    emptySub: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },

    // Tickets
    ticketCard: {
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: 18,
      marginBottom: 14,
      ...shadow.sm,
    },
    ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    ticketCategory: { fontSize: 14, fontWeight: '800' },
    ticketStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
    ticketStatusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    ticketDesc: { fontSize: 13, lineHeight: 19 },
    ticketDate: { fontSize: 11, color: colors.muted, marginTop: 8 },
    adminNote: { marginTop: 12, borderRadius: radius.md, padding: 12 },
    adminNoteLabel: { fontSize: 9, fontWeight: '800', color: colors.secondary, letterSpacing: 1, marginBottom: 4 },
    adminNoteText: { fontSize: 13, lineHeight: 18 },

    // Bills
    billCard: {
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: 18,
      marginBottom: 14,
      ...shadow.sm,
    },
    billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    billRoom: { fontSize: 15, fontWeight: '800' },
    billPaidBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
    billPaidText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    billRow: { flexDirection: 'row', justifyContent: 'space-between' },
    billItem: { alignItems: 'center' },
    billLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, letterSpacing: 0.3 },
    billValue: { fontSize: 16, fontWeight: '700', marginTop: 4 },
    billTotal: { fontSize: 18, fontWeight: '800', marginTop: 4 },

    // Primary button
    primaryBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: radius.lg,
      alignItems: 'center',
      marginBottom: 20,
      ...shadow.sm,
    },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

    // Modal
    modalContainer: { flex: 1, padding: 24 },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 28,
      paddingTop: 12,
    },
    modalTitle: { fontSize: 22, fontWeight: '800' },
    fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
    categoryRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
    categoryBtn: {
      flex: 1,
      borderWidth: 1.5,
      borderRadius: radius.md,
      paddingVertical: 12,
      alignItems: 'center',
    },
    categoryText: { fontWeight: '700', fontSize: 13 },
    textarea: {
      borderWidth: 1.5,
      borderRadius: radius.md,
      padding: 14,
      minHeight: 130,
      fontSize: 14,
      lineHeight: 21,
    },
  });
