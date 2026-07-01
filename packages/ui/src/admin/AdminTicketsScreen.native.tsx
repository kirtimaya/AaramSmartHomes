import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  TextInput, ActivityIndicator, RefreshControl,
  Modal, Platform,
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useAdminTickets } from '@aaram/core';
import type { AdminTicketsClient, AdminTicketsFilter, AdminTicket } from '@aaram/core';
import type { TicketStatus } from '@aaram/types';
import { colors, radii } from '@aaram/config';

// ── Constants ─────────────────────────────────────────────────────────────────

const MUTED = '#9E998F';

const STATUS_COLOR: Record<string, string> = {
  Pending:      '#F59E0B',
  'In-Progress': '#3B82F6',
  Resolved:     colors.light.secondary,
};

const PRIORITY_COLOR: Record<string, string> = {
  Low:    colors.light.secondary,
  Medium: '#F59E0B',
  High:   colors.light.primary,
  Urgent: '#EF4444',
};

const FILTERS: AdminTicketsFilter[] = ['All', 'Pending', 'In-Progress', 'Resolved'];
const STATUSES: TicketStatus[]      = ['Pending', 'In-Progress', 'Resolved'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminTicketsScreenProps {
  supabase: AdminTicketsClient;
  onNotAuthenticated: () => void;
  onBack?: () => void;
}

// ── Update Sheet ──────────────────────────────────────────────────────────────

function UpdateSheet({
  ticket, onClose, onSave,
}: {
  ticket: AdminTicket;
  onClose: () => void;
  onSave: (status: TicketStatus, note: string) => Promise<void>;
}) {
  const [status,  setStatus]  = useState<TicketStatus>(ticket.status);
  const [note,    setNote]    = useState(ticket.admin_note ?? '');
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(status, note);
      setSuccess(true);
      setTimeout(onClose, 1200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={s.sheetRoot} contentContainerStyle={s.sheetContent} keyboardShouldPersistTaps="handled">
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>Update Ticket</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={s.sheetClose}>✕</Text>
          </Pressable>
        </View>

        {success ? (
          <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={s.successBox}>
            <Text style={s.successEmoji}>✅</Text>
            <Text style={s.successText}>Ticket updated</Text>
          </MotiView>
        ) : (
          <>
            {/* Ticket info */}
            <View style={s.ticketInfoBox}>
              <Text style={s.ticketInfoCategory}>{ticket.category}</Text>
              <Text style={s.ticketInfoDesc}>{ticket.description}</Text>
              <Text style={s.ticketInfoMeta}>
                {ticket.requester_name} · {ticket.requester_type} · {formatDate(ticket.created_at)}
              </Text>
            </View>

            {/* Status picker */}
            <Text style={s.fieldLabel}>Status</Text>
            <View style={s.statusRow}>
              {STATUSES.map(st => {
                const active = status === st;
                const color  = STATUS_COLOR[st];
                return (
                  <Pressable
                    key={st}
                    style={[s.statusBtn, active && { backgroundColor: color, borderColor: color }]}
                    onPress={() => setStatus(st)}
                  >
                    <Text style={[s.statusBtnText, active && { color: '#fff' }]}>{st}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Admin note */}
            <Text style={s.fieldLabel}>Admin Note (optional)</Text>
            <TextInput
              style={s.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note for the resident…"
              placeholderTextColor={MUTED}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Pressable
              style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.84 }, saving && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
            </Pressable>
          </>
        )}
      </ScrollView>
    </Modal>
  );
}

// ── Ticket Card ───────────────────────────────────────────────────────────────

function TicketCard({ ticket, index, onEdit }: {
  ticket: AdminTicket;
  index: number;
  onEdit: () => void;
}) {
  const statusColor   = STATUS_COLOR[ticket.status]   ?? MUTED;
  const priorityColor = PRIORITY_COLOR[ticket.priority] ?? MUTED;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 340, delay: index * 45 }}
      style={s.ticketCard}
    >
      {/* Priority stripe */}
      <View style={[s.stripe, { backgroundColor: priorityColor }]} />

      <View style={s.ticketBody}>
        <View style={s.ticketTopRow}>
          <View style={s.ticketMeta}>
            <Text style={s.ticketCategory}>{ticket.category}</Text>
            <Text style={s.ticketDate}>{formatDate(ticket.created_at)}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[s.statusBadgeText, { color: statusColor }]}>{ticket.status}</Text>
          </View>
        </View>

        <Text style={s.ticketDesc} numberOfLines={2}>{ticket.description}</Text>

        <View style={s.ticketFooter}>
          <View style={s.requesterRow}>
            <View style={s.requesterAvatar}>
              <Text style={s.requesterAvatarText}>{ticket.requester_name[0]?.toUpperCase()}</Text>
            </View>
            <Text style={s.requesterName}>{ticket.requester_name}</Text>
            <View style={[s.typeBadge, { backgroundColor: `${MUTED}18` }]}>
              <Text style={s.typeBadgeText}>{ticket.requester_type}</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [s.editBtn, pressed && { opacity: 0.75 }]}
            onPress={onEdit}
          >
            <Text style={s.editBtnText}>Update →</Text>
          </Pressable>
        </View>

        {ticket.admin_note ? (
          <View style={s.adminNoteBox}>
            <Text style={s.adminNoteLabel}>NOTE</Text>
            <Text style={s.adminNoteText}>{ticket.admin_note}</Text>
          </View>
        ) : null}
      </View>
    </MotiView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function AdminTicketsScreen({ supabase, onNotAuthenticated, onBack }: AdminTicketsScreenProps) {
  const { filtered, filter, setFilter, loading, refreshing, error, updateTicket, refresh } =
    useAdminTickets(supabase);

  const [editingTicket, setEditingTicket] = useState<AdminTicket | null>(null);

  React.useEffect(() => {
    if (error === 'not_authenticated') onNotAuthenticated();
  }, [error, onNotAuthenticated]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={s.loadingText}>Loading tickets…</Text>
      </View>
    );
  }

  const countByStatus = (f: AdminTicketsFilter) =>
    f === 'All' ? filtered.length : filtered.filter(t => t.status === f).length;

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
            <Text style={s.headerTitle}>Service Desk</Text>
            <Text style={s.headerSub}>{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      </MotiView>

      {/* ── Filter bar ──────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterBar}
        style={s.filterScroll}
      >
        {FILTERS.map(f => {
          const active = filter === f;
          const count  = countByStatus(f);
          return (
            <Pressable
              key={f}
              style={[s.filterChip, active && s.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                {f}{count > 0 ? ` (${count})` : ''}
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
            <Text style={s.emptyEmoji}>✅</Text>
            <Text style={s.emptyTitle}>No tickets</Text>
            <Text style={s.emptySub}>
              {filter === 'All' ? 'No tickets in the system.' : `No ${filter.toLowerCase()} tickets.`}
            </Text>
          </View>
        ) : (
          filtered.map((t, i) => (
            <TicketCard
              key={t.id}
              ticket={t}
              index={i}
              onEdit={() => setEditingTicket(t)}
            />
          ))
        )}
      </ScrollView>

      {/* Update sheet */}
      {editingTicket && (
        <UpdateSheet
          ticket={editingTicket}
          onClose={() => setEditingTicket(null)}
          onSave={async (status, note) => {
            await updateTicket(editingTicket.id, status, note);
            setEditingTicket(null);
          }}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  filterScroll: { maxHeight: 48 },
  filterBar: { paddingHorizontal: 20, gap: 8, alignItems: 'center', paddingBottom: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 50, borderWidth: 1.5,
    borderColor: colors.light.border,
    backgroundColor: '#fff',
  },
  filterChipActive: {
    borderColor: colors.light.primary,
    backgroundColor: `${colors.light.primary}12`,
  },
  filterChipText: { fontSize: 11, fontWeight: '700', color: MUTED },
  filterChipTextActive: { color: colors.light.primary },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },

  ticketCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stripe: { width: 4 },
  ticketBody: { flex: 1, padding: 14 },
  ticketTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  ticketMeta: { flex: 1, marginRight: 8 },
  ticketCategory: { fontSize: 14, fontWeight: '800', color: colors.light.foreground, letterSpacing: -0.2 },
  ticketDate: { fontSize: 10, color: MUTED, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50 },
  statusBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  ticketDesc: { fontSize: 12, color: colors.light.foreground, opacity: 0.62, lineHeight: 18, marginBottom: 10 },

  ticketFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  requesterRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  requesterAvatar: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: `${colors.light.primary}20`,
    alignItems: 'center', justifyContent: 'center',
  },
  requesterAvatarText: { fontSize: 10, fontWeight: '800', color: colors.light.primary },
  requesterName: { fontSize: 11, fontWeight: '700', color: colors.light.foreground },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 50 },
  typeBadgeText: { fontSize: 8, fontWeight: '800', color: MUTED, letterSpacing: 0.5, textTransform: 'uppercase' },
  editBtn: {
    backgroundColor: `${colors.light.primary}15`,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radii.sm,
  },
  editBtnText: { fontSize: 11, fontWeight: '800', color: colors.light.primary },

  adminNoteBox: {
    marginTop: 10,
    backgroundColor: `${colors.light.secondary}10`,
    borderRadius: radii.sm,
    padding: 10,
  },
  adminNoteLabel: { fontSize: 8, fontWeight: '800', color: colors.light.secondary, letterSpacing: 1.5, marginBottom: 3 },
  adminNoteText: { fontSize: 11, color: colors.light.foreground, opacity: 0.65, lineHeight: 16 },

  emptyBox: { alignItems: 'center', paddingVertical: 56, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.light.foreground },
  emptySub: { fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 18, maxWidth: 260 },

  // Sheet
  sheetRoot: { flex: 1, backgroundColor: '#fff' },
  sheetContent: { padding: 24, paddingTop: 32 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: colors.light.foreground, letterSpacing: -0.3 },
  sheetClose: { fontSize: 22, color: MUTED },

  ticketInfoBox: {
    backgroundColor: colors.light.accent,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  ticketInfoCategory: { fontSize: 13, fontWeight: '800', color: colors.light.foreground, marginBottom: 4 },
  ticketInfoDesc: { fontSize: 13, color: colors.light.foreground, opacity: 0.65, lineHeight: 18, marginBottom: 6 },
  ticketInfoMeta: { fontSize: 10, color: MUTED, fontWeight: '600' },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.6, marginBottom: 10, textTransform: 'uppercase' },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statusBtn: {
    flex: 1, paddingVertical: 10,
    borderRadius: radii.md, borderWidth: 1.5,
    borderColor: colors.light.border,
    alignItems: 'center', backgroundColor: '#f8f8f6',
  },
  statusBtnText: { fontSize: 11, fontWeight: '800', color: MUTED },

  noteInput: {
    borderWidth: 1.5, borderColor: colors.light.border,
    borderRadius: radii.md, padding: 14,
    minHeight: 100, fontSize: 13, lineHeight: 19,
    color: colors.light.foreground,
    backgroundColor: '#f8f8f6', marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: colors.light.primary,
    paddingVertical: 16, borderRadius: radii.lg,
    alignItems: 'center',
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  successBox: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  successEmoji: { fontSize: 48 },
  successText: { fontSize: 16, fontWeight: '800', color: colors.light.secondary },
});
