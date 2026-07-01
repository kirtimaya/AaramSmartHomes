import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  TextInput, ActivityIndicator, RefreshControl,
  Modal, Platform, Image,
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useGuestDashboard, useVisitRequestForm } from '@aaram/core';
import type { GuestDashboardClient } from '@aaram/core';
import type { Property, VisitRequest } from '@aaram/types';
import { colors, radii } from '@aaram/config';

// ── Constants ─────────────────────────────────────────────────────────────────

const MUTED = '#9E998F';

const VISIT_STATUS_COLOR: Record<string, string> = {
  pending:   '#F59E0B',
  confirmed: colors.light.secondary,
  cancelled: MUTED,
};

const TYPE_ICON: Record<string, string> = {
  Villa:              '🏡',
  Flat:               '🏢',
  'Individual House': '🏠',
  Other:              '🏗️',
};

type Tab = 'explore' | 'visits' | 'support';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GuestPortalScreenProps {
  supabase: GuestDashboardClient;
  onNotAuthenticated: () => void;
  onSignOut: () => Promise<void>;
  onViewProperty: (id: string) => void;
}

// ── Schedule Visit Sheet ──────────────────────────────────────────────────────

function ScheduleVisitSheet({
  supabase, properties, initialPropertyId, onClose, onScheduled,
}: {
  supabase: GuestDashboardClient;
  properties: Property[];
  initialPropertyId?: string;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const {
    propertyId, setPropertyId,
    preferredDate, setPreferredDate,
    message, setMessage,
    loading, error, submitted, submit, reset,
  } = useVisitRequestForm(supabase);

  React.useEffect(() => {
    if (initialPropertyId) setPropertyId(initialPropertyId);
  }, [initialPropertyId]);

  const handleScheduled = () => { reset(); onScheduled(); onClose(); };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={s.sheetRoot} contentContainerStyle={s.sheetContent} keyboardShouldPersistTaps="handled">
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>Schedule a Visit</Text>
          <Pressable onPress={onClose} hitSlop={12}><Text style={s.sheetClose}>✕</Text></Pressable>
        </View>

        {submitted ? (
          <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={s.successBox}>
            <Text style={s.successEmoji}>🏠</Text>
            <Text style={s.successTitle}>Visit Requested!</Text>
            <Text style={s.successSub}>Our team will confirm your visit shortly.</Text>
            <Pressable style={s.successBtn} onPress={handleScheduled}>
              <Text style={s.successBtnText}>Done</Text>
            </Pressable>
          </MotiView>
        ) : (
          <>
            <Text style={s.fieldLabel}>Property</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.propertyPickRow}>
              {properties.map(p => {
                const sel = propertyId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    style={[s.propertyPickChip, sel && s.propertyPickChipActive]}
                    onPress={() => setPropertyId(p.id)}
                  >
                    <Text style={s.propertyPickEmoji}>{TYPE_ICON[p.property_type] ?? '🏠'}</Text>
                    <Text style={[s.propertyPickName, sel && { color: colors.light.primary }]}>{p.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[s.fieldLabel, { marginTop: 20 }]}>Preferred Date</Text>
            <TextInput
              style={s.dateInput}
              value={preferredDate}
              onChangeText={setPreferredDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={MUTED}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={[s.fieldLabel, { marginTop: 16 }]}>Message (optional)</Text>
            <TextInput
              style={s.msgInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Any specific requirements or questions…"
              placeholderTextColor={MUTED}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {error && <Text style={s.formError}>{error}</Text>}

            <Pressable
              style={({ pressed }) => [s.submitBtn, pressed && { opacity: 0.84 }, loading && s.submitBtnDisabled]}
              onPress={submit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.submitBtnText}>Request Visit</Text>
              }
            </Pressable>
          </>
        )}
      </ScrollView>
    </Modal>
  );
}

// ── Property Card ─────────────────────────────────────────────────────────────

function PropertyCard({ property, shortlisted, onShortlist, onView, index }: {
  property: Property;
  shortlisted: boolean;
  onShortlist: () => void;
  onView: () => void;
  index: number;
}) {
  const vacantCount = (property.rooms ?? []).filter(r => (r.occupancy_status ?? 'vacant') === 'vacant').length;
  const typeIcon    = TYPE_ICON[property.property_type] ?? '🏠';

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 340, delay: index * 50 }}
      style={s.propCard}
    >
      {property.image_url ? (
        <Image source={{ uri: property.image_url }} style={s.propImage} resizeMode="cover" />
      ) : (
        <View style={s.propImagePlaceholder}>
          <Text style={s.propImagePlaceholderText}>{typeIcon}</Text>
        </View>
      )}

      <Pressable style={s.shortlistBtn} onPress={onShortlist} hitSlop={8}>
        <Text style={[s.shortlistIcon, shortlisted && { color: colors.light.primary }]}>
          {shortlisted ? '♥' : '♡'}
        </Text>
      </Pressable>

      <View style={s.propBody}>
        <View style={s.propTopRow}>
          <Text style={s.propName}>{property.name}</Text>
          <View style={s.propTypeBadge}>
            <Text style={s.propTypeBadgeText}>{property.property_type}</Text>
          </View>
        </View>
        <Text style={s.propLocation}>📍 {property.location}</Text>

        <View style={s.propFooter}>
          <Text style={s.propStats}>
            {vacantCount > 0
              ? <Text style={{ color: colors.light.secondary }}>{vacantCount} vacant</Text>
              : <Text style={{ color: MUTED }}>Fully occupied</Text>
            }
            {' · '}{property.total_rooms} rooms
          </Text>
          <Pressable
            style={({ pressed }) => [s.viewBtn, pressed && { opacity: 0.78 }]}
            onPress={onView}
          >
            <Text style={s.viewBtnText}>View →</Text>
          </Pressable>
        </View>

        {/* Benefits row */}
        {(property.benefits ?? []).length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.benefitsRow}>
            {(property.benefits ?? []).slice(0, 4).map(b => (
              <View key={b.id} style={s.benefitChip}>
                <Text style={s.benefitIcon}>{b.icon}</Text>
                <Text style={s.benefitName}>{b.name}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </MotiView>
  );
}

// ── Visit Row ─────────────────────────────────────────────────────────────────

function VisitRow({ visit, index }: { visit: VisitRequest; index: number }) {
  const statusColor = VISIT_STATUS_COLOR[visit.status] ?? MUTED;
  const date = visit.preferred_date
    ? new Date(visit.preferred_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Date TBD';

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300, delay: index * 40 }}
      style={s.visitRow}
    >
      <View style={[s.visitStatusBar, { backgroundColor: statusColor }]} />
      <View style={s.visitBody}>
        <View style={s.visitTopRow}>
          <Text style={s.visitPropName}>{visit.property_name ?? 'Property visit'}</Text>
          <View style={[s.visitStatusBadge, { backgroundColor: `${statusColor}18` }]}>
            <Text style={[s.visitStatusText, { color: statusColor }]}>
              {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={s.visitDate}>📅 {date}</Text>
        {visit.message ? <Text style={s.visitMsg} numberOfLines={2}>{visit.message}</Text> : null}
      </View>
    </MotiView>
  );
}

// ── Support Tab (simple ticket form) ─────────────────────────────────────────

function SupportTab({ supabase }: { supabase: GuestDashboardClient }) {
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState('General');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [submitted,   setSubmitted]   = useState(false);

  const CATEGORIES = ['General', 'Maintenance', 'Housekeeping', 'Safety', 'Other'];

  const handleSubmit = async () => {
    if (!description.trim()) { setError('Please describe your issue'); return; }
    setError(null);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not authenticated'); return; }
      const { error: dbErr } = await supabase.from('tickets').insert({
        requester_id:   session.user.id,
        requester_type: 'guest',
        category,
        priority:    'Medium',
        status:      'Pending',
        description: description.trim(),
      });
      if (dbErr) throw new Error(dbErr.message);
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={s.supportSuccess}>
        <MotiView from={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 320 }}>
          <Text style={s.successEmoji}>✅</Text>
          <Text style={s.successTitle}>Ticket raised!</Text>
          <Text style={s.successSub}>Our team will get back to you soon.</Text>
          <Pressable style={s.successBtn} onPress={() => { setSubmitted(false); setDescription(''); }}>
            <Text style={s.successBtnText}>Raise another</Text>
          </Pressable>
        </MotiView>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.supportContent} keyboardShouldPersistTaps="handled">
      <Text style={s.supportHeading}>How can we help?</Text>
      <Text style={s.supportSub}>Send us a message and our support team will respond within 24 hours.</Text>

      <Text style={s.fieldLabel}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
        {CATEGORIES.map(c => (
          <Pressable
            key={c}
            style={[s.catChip, category === c && s.catChipActive]}
            onPress={() => setCategory(c)}
          >
            <Text style={[s.catChipText, category === c && { color: colors.light.primary }]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={[s.fieldLabel, { marginTop: 18 }]}>Description</Text>
      <TextInput
        style={s.descInput}
        value={description}
        onChangeText={setDescription}
        placeholder="Describe your issue or question…"
        placeholderTextColor={MUTED}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />

      {error && <Text style={s.formError}>{error}</Text>}

      <Pressable
        style={({ pressed }) => [s.submitBtn, pressed && { opacity: 0.84 }, loading && s.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Submit Ticket</Text>}
      </Pressable>
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function GuestPortalScreen({
  supabase, onNotAuthenticated, onSignOut, onViewProperty,
}: GuestPortalScreenProps) {
  const [activeTab,       setActiveTab]       = useState<Tab>('explore');
  const [showVisitSheet,  setShowVisitSheet]  = useState(false);
  const [visitPropertyId, setVisitPropertyId] = useState<string | undefined>();

  const { properties, shortlisted, visitRequests, loading, refreshing, error, toggleShortlist, refresh } =
    useGuestDashboard(supabase);

  React.useEffect(() => {
    if (error === 'not_authenticated') onNotAuthenticated();
  }, [error, onNotAuthenticated]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={s.loadingText}>Loading your portal…</Text>
      </View>
    );
  }

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'explore', label: 'Explore' },
    { id: 'visits',  label: 'Visits',  count: visitRequests.length },
    { id: 'support', label: 'Support' },
  ];

  return (
    <View style={s.root}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 380 }}
        style={s.header}
      >
        <View>
          <Text style={s.headerTitle}>Guest Portal</Text>
          <Text style={s.headerSub}>{properties.length} properties available</Text>
        </View>
        {activeTab === 'explore' && (
          <Pressable
            style={({ pressed }) => [s.scheduleBtn, pressed && { opacity: 0.8 }]}
            onPress={() => { setVisitPropertyId(undefined); setShowVisitSheet(true); }}
          >
            <Text style={s.scheduleBtnText}>+ Schedule Visit</Text>
          </Pressable>
        )}
      </MotiView>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <View style={s.tabBar}>
        {TABS.map(t => {
          const active = activeTab === t.id;
          return (
            <Pressable key={t.id} style={[s.tabItem, active && s.tabItemActive]} onPress={() => setActiveTab(t.id)}>
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>
                {t.label}{t.count ? ` (${t.count})` : ''}
              </Text>
              {active && <View style={s.tabUnderline} />}
            </Pressable>
          );
        })}
      </View>

      {/* ── Content ─────────────────────────────────────────────── */}
      {activeTab === 'explore' && (
        <ScrollView
          style={s.list}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh}
              tintColor={colors.light.primary} colors={[colors.light.primary]} />
          }
        >
          {properties.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyEmoji}>🏠</Text>
              <Text style={s.emptyTitle}>No properties yet</Text>
            </View>
          ) : (
            properties.map((p, i) => (
              <PropertyCard
                key={p.id}
                property={p}
                shortlisted={shortlisted.has(p.id)}
                onShortlist={() => toggleShortlist(p.id)}
                onView={() => onViewProperty(p.id)}
                index={i}
              />
            ))
          )}
        </ScrollView>
      )}

      {activeTab === 'visits' && (
        <ScrollView
          style={s.list}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh}
              tintColor={colors.light.primary} colors={[colors.light.primary]} />
          }
        >
          <Pressable
            style={({ pressed }) => [s.scheduleFullBtn, pressed && { opacity: 0.84 }]}
            onPress={() => { setVisitPropertyId(undefined); setShowVisitSheet(true); }}
          >
            <Text style={s.scheduleFullBtnText}>+ Schedule a New Visit</Text>
          </Pressable>

          {visitRequests.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyEmoji}>📅</Text>
              <Text style={s.emptyTitle}>No visits yet</Text>
              <Text style={s.emptySub}>Schedule a visit to see a property in person.</Text>
            </View>
          ) : (
            visitRequests.map((v, i) => <VisitRow key={v.id} visit={v} index={i} />)
          )}
        </ScrollView>
      )}

      {activeTab === 'support' && (
        <SupportTab supabase={supabase} />
      )}

      {/* Schedule visit modal */}
      {showVisitSheet && (
        <ScheduleVisitSheet
          supabase={supabase}
          properties={properties}
          initialPropertyId={visitPropertyId}
          onClose={() => setShowVisitSheet(false)}
          onScheduled={refresh}
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

  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 36, paddingBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.light.foreground, letterSpacing: -0.4 },
  headerSub: { fontSize: 11, color: MUTED, marginTop: 2 },
  scheduleBtn: {
    backgroundColor: colors.light.primary, borderRadius: radii.lg,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  scheduleBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: colors.light.border,
    marginHorizontal: 20,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  tabItemActive: {},
  tabLabel: { fontSize: 13, fontWeight: '700', color: MUTED },
  tabLabelActive: { color: colors.light.foreground },
  tabUnderline: {
    position: 'absolute', bottom: -1.5, left: 12, right: 12,
    height: 2.5, borderRadius: 2, backgroundColor: colors.light.primary,
  },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  // ── Property card
  propCard: {
    backgroundColor: '#fff', borderRadius: radii.xl,
    borderWidth: 1, borderColor: colors.light.border,
    marginBottom: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  propImage: { width: '100%', height: 180 },
  propImagePlaceholder: {
    width: '100%', height: 140,
    backgroundColor: `${colors.light.primary}10`,
    alignItems: 'center', justifyContent: 'center',
  },
  propImagePlaceholderText: { fontSize: 60 },
  shortlistBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  shortlistIcon: { fontSize: 20, color: MUTED },
  propBody: { padding: 14 },
  propTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  propName: { fontSize: 16, fontWeight: '900', color: colors.light.foreground, flex: 1, marginRight: 8, letterSpacing: -0.3 },
  propTypeBadge: { backgroundColor: `${colors.light.primary}12`, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  propTypeBadgeText: { fontSize: 10, fontWeight: '800', color: colors.light.primary },
  propLocation: { fontSize: 11, color: MUTED, marginBottom: 10 },
  propFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  propStats: { fontSize: 12, color: MUTED },
  viewBtn: { backgroundColor: `${colors.light.primary}15`, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radii.sm },
  viewBtnText: { fontSize: 12, fontWeight: '800', color: colors.light.primary },
  benefitsRow: { gap: 6, paddingRight: 4 },
  benefitChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.light.accent, borderRadius: 50,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: colors.light.border,
  },
  benefitIcon: { fontSize: 12 },
  benefitName: { fontSize: 10, fontWeight: '700', color: colors.light.foreground, opacity: 0.65 },

  // ── Visit rows
  scheduleFullBtn: {
    backgroundColor: `${colors.light.primary}12`,
    borderRadius: radii.lg, paddingVertical: 14,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1.5, borderColor: `${colors.light.primary}30`,
    borderStyle: 'dashed',
  },
  scheduleFullBtnText: { fontSize: 13, fontWeight: '800', color: colors.light.primary },
  visitRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: radii.xl, borderWidth: 1, borderColor: colors.light.border,
    marginBottom: 10, overflow: 'hidden',
  },
  visitStatusBar: { width: 4 },
  visitBody: { flex: 1, padding: 14 },
  visitTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  visitPropName: { fontSize: 14, fontWeight: '800', color: colors.light.foreground, flex: 1, marginRight: 8 },
  visitStatusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50 },
  visitStatusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  visitDate: { fontSize: 11, color: MUTED, marginBottom: 4 },
  visitMsg: { fontSize: 11, color: colors.light.foreground, opacity: 0.6, lineHeight: 16 },

  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.light.foreground },
  emptySub: { fontSize: 12, color: MUTED, textAlign: 'center', maxWidth: 260 },

  // ── Support
  supportContent: { padding: 20, paddingBottom: 40 },
  supportSuccess: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  supportHeading: { fontSize: 20, fontWeight: '900', color: colors.light.foreground, marginBottom: 6, letterSpacing: -0.3 },
  supportSub: { fontSize: 13, color: MUTED, lineHeight: 19, marginBottom: 24 },
  catRow: { gap: 8, paddingRight: 4, marginBottom: 4 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50,
    borderWidth: 1.5, borderColor: colors.light.border, backgroundColor: '#fff',
  },
  catChipActive: { borderColor: colors.light.primary, backgroundColor: `${colors.light.primary}10` },
  catChipText: { fontSize: 12, fontWeight: '700', color: MUTED },
  descInput: {
    borderWidth: 1.5, borderColor: colors.light.border, borderRadius: radii.md,
    padding: 14, minHeight: 110, fontSize: 13, lineHeight: 19,
    color: colors.light.foreground, backgroundColor: '#f8f8f6', marginBottom: 12,
  },

  // ── Sheet
  sheetRoot: { flex: 1, backgroundColor: '#fff' },
  sheetContent: { padding: 24, paddingTop: 32 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: colors.light.foreground, letterSpacing: -0.3 },
  sheetClose: { fontSize: 22, color: MUTED },
  propertyPickRow: { gap: 8, paddingRight: 4 },
  propertyPickChip: {
    padding: 12, borderRadius: radii.lg, borderWidth: 1.5,
    borderColor: colors.light.border, backgroundColor: '#fff',
    alignItems: 'center', gap: 6, minWidth: 90,
  },
  propertyPickChipActive: { borderColor: colors.light.primary, backgroundColor: `${colors.light.primary}08` },
  propertyPickEmoji: { fontSize: 24 },
  propertyPickName: { fontSize: 11, fontWeight: '700', color: colors.light.foreground, textAlign: 'center' },
  dateInput: {
    borderWidth: 1.5, borderColor: colors.light.border, borderRadius: radii.md,
    padding: 14, fontSize: 14, color: colors.light.foreground, backgroundColor: '#f8f8f6',
  },
  msgInput: {
    borderWidth: 1.5, borderColor: colors.light.border, borderRadius: radii.md,
    padding: 14, minHeight: 85, fontSize: 13, lineHeight: 19,
    color: colors.light.foreground, backgroundColor: '#f8f8f6', marginBottom: 12,
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.6, marginBottom: 10, textTransform: 'uppercase' },
  formError: { fontSize: 12, color: '#ef4444', marginBottom: 12, fontWeight: '600' },
  submitBtn: {
    backgroundColor: colors.light.primary, paddingVertical: 16, borderRadius: radii.lg, alignItems: 'center',
    shadowColor: colors.light.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.55 },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  successBox: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  successEmoji: { fontSize: 48 },
  successTitle: { fontSize: 18, fontWeight: '900', color: colors.light.foreground },
  successSub: { fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: 260, lineHeight: 19 },
  successBtn: {
    marginTop: 12, backgroundColor: `${colors.light.primary}15`,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: radii.lg,
  },
  successBtnText: { fontSize: 14, fontWeight: '800', color: colors.light.primary },
});
