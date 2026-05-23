import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import VoiceOverlay from "@/app/voice";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect } from "react-native-svg";

import { CATEGORIES, CATEGORY_CONFIG, type Category } from "@/constants/colors";
import { useExpenses } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const CAT_EMOJI: Record<Category, string> = {
  Food: "🍔", Transport: "🚗", Entertainment: "🎬",
  Shopping: "🛍️", Bills: "💡", Other: "📦",
};

const CAT_SHORT: Record<Category, string> = {
  Food: "Food", Transport: "Trans", Entertainment: "Entmt",
  Shopping: "Shop", Bills: "Bills", Other: "Other",
};

const CHART_HEIGHT = 220;
const BAR_WIDTH = 68;
const BAR_GAP = 16;
const BUDGET_THRESHOLD = 0.6;

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${Math.round(n)}`;
}

function formatCurrency(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: code,
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);
  } catch { return `$${Math.round(amount)}`; }
}

function formatAmount(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: code, minimumFractionDigits: 2,
    }).format(amount);
  } catch { return `$${amount.toFixed(2)}`; }
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function darkenHex(hex: string, factor: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - factor)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - factor)));
  const b = Math.max(0, Math.round((n & 255) * (1 - factor)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// ── BarColumn: own useAnimatedStyle so hooks aren't called in a loop ──
interface BarColumnProps {
  cat: Category;
  spend: number;
  budget: number | null;
  maxValue: number;
  onPress: () => void;
  currencyCode: string;
  mutedForeground: string;
}

function BarColumn({
  cat, spend, budget, maxValue, onPress, currencyCode, mutedForeground,
}: BarColumnProps) {
  const cfg = CATEGORY_CONFIG[cat];
  const overBudget = budget != null && spend > budget;
  const barColor = cfg.bar;

  const fillRatio = maxValue > 0 ? spend / maxValue : 0;
  const targetFillHeight = Math.max(fillRatio * CHART_HEIGHT, spend > 0 ? 8 : 0);

  const spendRatio = budget != null && budget > 0 ? spend / budget : 0;
  const hasBudget = budget != null && budget > 0;
  const showBudgetOutline = hasBudget && spendRatio >= BUDGET_THRESHOLD;
  const outlineColor = overBudget ? darkenHex(cfg.bar, 0.45) : darkenHex(cfg.bar, 0.25);
  const rawBudgetH = hasBudget && maxValue > 0 ? (budget! / maxValue) * CHART_HEIGHT : 0;
  const budgetBarH = Math.min(rawBudgetH, CHART_HEIGHT);
  const pctLabel = hasBudget && spend > 0 ? `${Math.round(spendRatio * 100)}%` : null;

  const animHeight = useSharedValue(0);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      animHeight.value = targetFillHeight;
    } else {
      animHeight.value = withTiming(targetFillHeight, { duration: 350 });
    }
  }, [targetFillHeight]);

  const animFillStyle = useAnimatedStyle(() => ({
    height: animHeight.value,
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{ alignItems: "center", width: BAR_WIDTH, marginRight: BAR_GAP }}
    >
      {/* Bar area */}
      <View style={{ width: BAR_WIDTH, height: CHART_HEIGHT, justifyContent: "flex-end", position: "relative" }}>
        {/* Dashed budget outline — only at ≥60% spend */}
        {showBudgetOutline && budgetBarH > 8 && (
          <Svg
            width={BAR_WIDTH}
            height={budgetBarH}
            style={{ position: "absolute", bottom: 0, left: 0 }}
          >
            <Rect
              x={1} y={1}
              width={BAR_WIDTH - 2} height={budgetBarH - 2}
              rx={13} ry={13}
              fill="none"
              stroke={outlineColor}
              strokeWidth={1.8}
              strokeDasharray="6,4"
            />
          </Svg>
        )}

        {/* Animated fill — always mounted so withTiming fires correctly on data load */}
        <Animated.View
          style={[{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            borderRadius: 14,
            backgroundColor: hexToRgba(barColor, 0.45),
          }, animFillStyle]}
        />

        {/* Emoji inside bar — only when bar is tall enough */}
        {targetFillHeight > 60 && (
          <View style={{ position: "absolute", bottom: 14, left: 0, right: 0, alignItems: "center" }}>
            <Text style={{ fontSize: 24 }}>{CAT_EMOJI[cat]}</Text>
          </View>
        )}
      </View>

      {/* Labels below */}
      <Text style={{ fontSize: 12, fontFamily: "Lato_400Regular", color: mutedForeground, marginTop: 10 }}>
        {CAT_SHORT[cat]}
      </Text>
      <Text style={{ fontSize: 13, fontFamily: "Lato_700Bold", color: spend > 0 ? barColor : mutedForeground, marginTop: 2 }}>
        {spend > 0 ? formatCompact(spend) : "—"}
      </Text>
      {/* Always render pct row to keep column height uniform — invisible when not applicable */}
      <Text style={{
        fontSize: 11,
        fontFamily: "Lato_400Regular",
        color: spendRatio >= BUDGET_THRESHOLD ? darkenHex(cfg.bar, 0.3) : mutedForeground,
        marginTop: 1,
        opacity: pctLabel && spend > 0 ? 1 : 0,
      }}>
        {pctLabel ?? " "}
      </Text>
    </TouchableOpacity>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { preferences, getExpensesForMonth, getCategoryTotal, getMonthTotal } = useExpenses();

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const monthlyExpenses = getExpensesForMonth(selectedYear, selectedMonth);
  const monthTotal = getMonthTotal(selectedYear, selectedMonth);
  const recentExpenses = monthlyExpenses.slice(0, 5);

  function prevMonth() {
    void Haptics.selectionAsync();
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  }
  function nextMonth() {
    void Haptics.selectionAsync();
    const now = new Date();
    if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1) return;
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  }
  const isCurrentMonth =
    selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1;

  const webTopPad = Platform.OS === "web" ? 67 : 0;
  const webBottomPad = Platform.OS === "web" ? 34 : 0;

  // Category data — sorted descending ──────────────────────────────────────
  const categoryData = useMemo(() => {
    return CATEGORIES
      .map((cat) => ({
        cat,
        spend: getCategoryTotal(cat, selectedYear, selectedMonth),
        budget: preferences.budgets[cat],
      }))
      .sort((a, b) => b.spend - a.spend); // descending
  }, [getCategoryTotal, selectedYear, selectedMonth, preferences.budgets]);

  // Scale is spend-only — budgets are a visual overlay and must NOT shrink bars
  const maxValue = useMemo(() => {
    return Math.max(...categoryData.map((d) => d.spend), 1);
  }, [categoryData]);

  const totalChartWidth = categoryData.length * (BAR_WIDTH + BAR_GAP) + 20;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FFFFFF" },
    settingsBtn: {
      position: "absolute",
      top: insets.top + 20 + webTopPad,
      right: 20,
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: colors.muted,
      alignItems: "center", justifyContent: "center",
      zIndex: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    centerBlock: { alignItems: "center", paddingHorizontal: 20, marginBottom: 36 },
    monthNav: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
    monthNavBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center",
    },
    monthLabel: {
      fontSize: 15, fontFamily: "Lato_400Regular", color: colors.mutedForeground,
      minWidth: 130, textAlign: "center",
    },
    totalAmount: {
      fontSize: 58, fontFamily: "Lato_700Bold", color: colors.foreground,
      letterSpacing: -2, lineHeight: 64, textAlign: "center",
    },
    totalLabel: {
      fontSize: 13, fontFamily: "Lato_400Regular",
      color: colors.mutedForeground, marginTop: 6, textAlign: "center",
    },
    sectionLabel: {
      fontSize: 12, fontFamily: "Lato_700Bold", color: colors.mutedForeground,
      textTransform: "uppercase", letterSpacing: 1, paddingHorizontal: 20, marginBottom: 16,
    },
    chartArea: { flexDirection: "row", alignItems: "flex-end", height: CHART_HEIGHT + 68 },
    recentHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 20, marginBottom: 12,
    },
    recentTitle: { fontSize: 17, fontFamily: "Lato_700Bold", color: colors.foreground },
    seeAll: { fontSize: 14, fontFamily: "Lato_400Regular", color: colors.primary },
    expenseRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 },
    expenseIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 12 },
    expenseDescription: { fontSize: 15, fontFamily: "Lato_700Bold", color: colors.foreground },
    expenseMeta: { fontSize: 12, fontFamily: "Lato_400Regular", color: colors.mutedForeground, marginTop: 2 },
    expenseAmount: { fontSize: 15, fontFamily: "Lato_700Bold", color: colors.foreground },
    separator: { height: 1, backgroundColor: "#F2F2F7", marginLeft: 74 },
    emptyState: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 20 },
    emptyText: { fontSize: 15, fontFamily: "Lato_700Bold", color: colors.mutedForeground, marginTop: 10 },
    emptySubtext: { fontSize: 13, fontFamily: "Lato_400Regular", color: colors.mutedForeground, textAlign: "center", marginTop: 4 },
    fab: {
      position: "absolute", right: 20,
      bottom: 90 + insets.bottom + webBottomPad,
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
    },
    micFab: {
      position: "absolute", right: 92,
      bottom: 90 + insets.bottom + webBottomPad,
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border,
      alignItems: "center", justifyContent: "center",
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push("/settings")} activeOpacity={0.7}>
        <Ionicons name="settings-outline" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 20 + webTopPad,
          paddingBottom: 120 + insets.bottom + webBottomPad,
        }}
      >
        {/* Centered month nav + total */}
        <View style={styles.centerBlock}>
          <View style={styles.monthNav}>
            <TouchableOpacity style={styles.monthNavBtn} onPress={prevMonth} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={16} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </Text>
            <TouchableOpacity
              style={[styles.monthNavBtn, isCurrentMonth && { opacity: 0.3 }]}
              onPress={nextMonth} activeOpacity={0.7} disabled={isCurrentMonth}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <Text style={styles.totalAmount}>{formatCurrency(monthTotal, preferences.currencyCode)}</Text>
          <Text style={styles.totalLabel}>
            {monthlyExpenses.length} transaction{monthlyExpenses.length !== 1 ? "s" : ""} this month
          </Text>
        </View>

        <Text style={styles.sectionLabel}>By Category</Text>
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
            style={{ marginBottom: 32 }}
          >
            <View style={[styles.chartArea, { width: totalChartWidth }]}>
              {categoryData.map(({ cat, spend, budget }) => (
                <BarColumn
                  key={cat}
                  cat={cat}
                  spend={spend}
                  budget={budget}
                  maxValue={maxValue}
                  onPress={() => router.push(`/category/${cat}`)}
                  currencyCode={preferences.currencyCode}
                  mutedForeground={colors.mutedForeground}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Recent transactions */}
        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>Recent</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/history")} activeOpacity={0.7}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {recentExpenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={36} color="#D1D1D6" />
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptySubtext}>Tap + to log your first expense</Text>
          </View>
        ) : (
          recentExpenses.map((expense, index) => {
            const cfg = CATEGORY_CONFIG[expense.category];
            return (
              <View key={expense.id}>
                <TouchableOpacity
                  style={styles.expenseRow}
                  onPress={() => router.push(`/expense/${expense.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.expenseIconWrap, { backgroundColor: hexToRgba(cfg.bar, 0.12) }]}>
                    <Ionicons name={cfg.icon as "receipt-outline"} size={20} color={cfg.bar} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expenseDescription} numberOfLines={1}>
                      {expense.description || "—"}
                    </Text>
                    <Text style={styles.expenseMeta}>{formatDate(expense.date)} · {expense.category}</Text>
                  </View>
                  <Text style={styles.expenseAmount}>{formatAmount(expense.amount, preferences.currencyCode)}</Text>
                </TouchableOpacity>
                {index < recentExpenses.length - 1 && <View style={styles.separator} />}
              </View>
            );
          })
        )}
      </Animated.ScrollView>

      <VoiceOverlay visible={voiceOpen} onClose={() => setVoiceOpen(false)} />

      <Pressable
        style={({ pressed }) => [styles.micFab, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setVoiceOpen(true);
        }}
      >
        <Ionicons name="mic-outline" size={26} color={colors.foreground} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] }]}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/capture");
        }}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
