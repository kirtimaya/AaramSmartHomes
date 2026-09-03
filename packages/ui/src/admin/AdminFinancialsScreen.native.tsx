import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { MotiView } from 'moti';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import type { barDataItem } from 'react-native-gifted-charts';
import { useAdminFinancials } from '@aaram/core';
import type { AdminFinancialsClient, CategorySlice, MonthlyPoint } from '@aaram/core';
import { colors, radii } from '@aaram/config';

// ── Constants ─────────────────────────────────────────────────────────────────

const MUTED = '#9E998F';

const INR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const CATEGORY_LABEL: Record<string, string> = {
  rent:             'Rent',
  maintenance:      'Maintenance',
  electricity:      'Electricity',
  gas:              'Gas',
  wifi:             'Wi-Fi',
  maid:             'Cleaning',
  furniture:        'Furniture',
  smart_devices:    'Smart Devices',
  organic_nature:   'Organic',
  utilities:        'Utilities',
  other:            'Other',
  custom:           'Custom',
  security_deposit: 'Deposit',
  setup_expense:    'Setup',
};

const SLICE_COLORS = [
  colors.light.primary,
  colors.light.secondary,
  '#F59E0B',
  '#3B82F6',
  '#8B5CF6',
  '#10B981',
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminFinancialsScreenProps {
  supabase: AdminFinancialsClient;
  onNotAuthenticated: () => void;
  onBack?: () => void;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent, index }: {
  label: string; value: string; sub?: string; accent: string; index: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 320, delay: index * 60 }}
      style={[s.kpiCard, { borderTopColor: accent, borderTopWidth: 3 }]}
    >
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={[s.kpiValue, { color: accent }]}>{value}</Text>
      {sub ? <Text style={s.kpiSub}>{sub}</Text> : null}
    </MotiView>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionTitle}>{title}</Text>;
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function AdminFinancialsScreen({ supabase, onNotAuthenticated, onBack }: AdminFinancialsScreenProps) {
  const {
    totalIncome, totalExpenses, netProfit,
    monthIncome, monthExpenses,
    monthlyPoints, categorySlices, recentTransactions,
    loading, refreshing, error, refresh,
  } = useAdminFinancials(supabase);

  React.useEffect(() => {
    if (error === 'not_authenticated') onNotAuthenticated();
  }, [error, onNotAuthenticated]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={s.loadingText}>Loading financials…</Text>
      </View>
    );
  }

  // Build BarChart data — two-series interleaved (income, expense per month)
  const barData: barDataItem[] = monthlyPoints.flatMap((m: MonthlyPoint, i: number) => [
    {
      value:        m.income,
      label:        i % 2 === 0 ? m.month : '',  // label every other to avoid crowding
      frontColor:   colors.light.secondary,
      spacing:      2,
      labelWidth:   30,
      labelTextStyle: { color: MUTED, fontSize: 9, fontWeight: '700' },
    },
    {
      value:        m.expense,
      frontColor:   colors.light.primary,
      spacing:      14,
      labelTextStyle: { color: MUTED, fontSize: 9 },
    },
  ]);

  // Pie data
  const pieData = categorySlices.map((sl: CategorySlice, i: number) => ({
    value:     sl.pct,
    color:     SLICE_COLORS[i % SLICE_COLORS.length],
    text:      `${sl.pct}%`,
    label:     CATEGORY_LABEL[sl.category] ?? sl.category,
  }));

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
            <Text style={s.headerTitle}>Financials</Text>
            <Text style={s.headerSub}>Read-only analytics view</Text>
          </View>
        </View>
      </MotiView>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh}
            tintColor={colors.light.primary} colors={[colors.light.primary]} />
        }
      >
        {/* ── KPI row ─────────────────────────────────────────────── */}
        <SectionHeader title="All-Time Summary" />
        <View style={s.kpiRow}>
          <KpiCard label="Total Income"   value={INR(totalIncome)}   accent={colors.light.secondary} index={0} />
          <KpiCard label="Total Expenses" value={INR(totalExpenses)} accent={colors.light.primary}   index={1} />
        </View>
        <View style={[s.kpiRow, { marginTop: 10 }]}>
          <KpiCard
            label="Net Profit"
            value={INR(netProfit)}
            accent={netProfit >= 0 ? colors.light.secondary : '#EF4444'}
            index={2}
          />
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>This Month</Text>
            <Text style={[s.kpiValue, { color: colors.light.secondary, fontSize: 15 }]}>{INR(monthIncome)}</Text>
            <Text style={s.kpiSub}>income · {INR(monthExpenses)} exp</Text>
          </View>
        </View>

        {/* ── Bar chart — last 6 months ────────────────────────────── */}
        {monthlyPoints.length > 0 && (
          <View style={s.chartSection}>
            <SectionHeader title="Last 6 Months" />
            <View style={s.legendRow}>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: colors.light.secondary }]} />
                <Text style={s.legendText}>Income</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: colors.light.primary }]} />
                <Text style={s.legendText}>Expenses</Text>
              </View>
            </View>
            <View style={s.chartWrap}>
              <BarChart
                data={barData}
                barWidth={18}
                spacing={2}
                roundedTop
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisTextStyle={{ color: MUTED, fontSize: 8 }}
                noOfSections={4}
                maxValue={Math.max(...monthlyPoints.flatMap(m => [m.income, m.expense])) * 1.2}
                hideRules
                isAnimated
                animationDuration={800}
                width={280}
                height={160}
              />
            </View>
          </View>
        )}

        {/* ── Pie chart — expense breakdown ───────────────────────── */}
        {categorySlices.length > 0 && (
          <View style={s.chartSection}>
            <SectionHeader title="Expense Breakdown" />
            <View style={s.pieRow}>
              <PieChart
                data={pieData}
                donut
                radius={72}
                innerRadius={44}
                centerLabelComponent={() => (
                  <View style={s.pieCenterLabel}>
                    <Text style={s.pieCenterLabelText}>Expenses</Text>
                  </View>
                )}
                isAnimated
              />
              <View style={s.pieLegend}>
                {categorySlices.map((sl, i) => (
                  <View key={sl.category} style={s.pieLegendRow}>
                    <View style={[s.pieLegendDot, { backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }]} />
                    <Text style={s.pieLegendLabel}>{CATEGORY_LABEL[sl.category] ?? sl.category}</Text>
                    <Text style={s.pieLegendPct}>{sl.pct}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── Recent transactions ──────────────────────────────────── */}
        {recentTransactions.length > 0 && (
          <View style={s.chartSection}>
            <SectionHeader title="Recent Transactions" />
            {recentTransactions.map((t, i) => {
              const isIncome = t.type === 'income';
              return (
                <MotiView
                  key={t.id}
                  from={{ opacity: 0, translateX: -8 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ type: 'timing', duration: 300, delay: i * 35 }}
                  style={s.txRow}
                >
                  <View style={[s.txTypeDot, { backgroundColor: isIncome ? colors.light.secondary : colors.light.primary }]} />
                  <View style={s.txBody}>
                    <Text style={s.txLabel}>{t.label}</Text>
                    <Text style={s.txDate}>{t.date ? new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</Text>
                  </View>
                  <Text style={[s.txAmount, { color: isIncome ? colors.light.secondary : colors.light.primary }]}>
                    {isIncome ? '+' : '−'} {INR(t.amount)}
                  </Text>
                </MotiView>
              );
            })}
          </View>
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
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 36, paddingBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5, borderColor: colors.light.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 18, color: MUTED },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.light.foreground, letterSpacing: -0.4 },
  headerSub: { fontSize: 11, color: MUTED, marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },

  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: MUTED,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, marginTop: 20,
  },

  kpiRow: { flexDirection: 'row', gap: 12 },
  kpiCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: radii.xl,
    padding: 16, borderWidth: 1, borderColor: colors.light.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  kpiLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.4, marginBottom: 6, textTransform: 'uppercase' },
  kpiValue: { fontSize: 18, fontWeight: '900', letterSpacing: -0.4 },
  kpiSub: { fontSize: 10, color: MUTED, marginTop: 3 },

  chartSection: { marginTop: 4 },
  chartWrap: {
    backgroundColor: '#fff', borderRadius: radii.xl,
    borderWidth: 1, borderColor: colors.light.border,
    padding: 16, paddingTop: 12, overflow: 'hidden',
  },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '700', color: MUTED },

  pieRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: radii.xl,
    borderWidth: 1, borderColor: colors.light.border,
    padding: 16, gap: 20,
  },
  pieCenterLabel: { alignItems: 'center' },
  pieCenterLabelText: { fontSize: 9, fontWeight: '800', color: MUTED, textTransform: 'uppercase' },
  pieLegend: { flex: 1, gap: 8 },
  pieLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pieLegendDot: { width: 8, height: 8, borderRadius: 4 },
  pieLegendLabel: { flex: 1, fontSize: 11, fontWeight: '700', color: colors.light.foreground },
  pieLegendPct: { fontSize: 11, fontWeight: '800', color: MUTED },

  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.light.border,
    padding: 12, marginBottom: 8, gap: 10,
  },
  txTypeDot: { width: 10, height: 10, borderRadius: 5 },
  txBody: { flex: 1 },
  txLabel: { fontSize: 13, fontWeight: '700', color: colors.light.foreground, textTransform: 'capitalize' },
  txDate: { fontSize: 10, color: MUTED },
  txAmount: { fontSize: 13, fontWeight: '800' },
});
