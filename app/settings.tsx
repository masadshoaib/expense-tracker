import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CATEGORIES, CATEGORY_CONFIG, type Category } from "@/constants/colors";
import { useExpenses } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

// ── currency options ───────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: "USD", symbol: "$",  label: "US Dollar" },
  { code: "EUR", symbol: "€",  label: "Euro" },
  { code: "GBP", symbol: "£",  label: "British Pound" },
  { code: "PKR", symbol: "₨",  label: "Pakistani Rupee" },
  { code: "INR", symbol: "₹",  label: "Indian Rupee" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
  { code: "JPY", symbol: "¥",  label: "Japanese Yen" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "A$",  label: "Australian Dollar" },
];

// ── row component ──────────────────────────────────────────────────────────────
function SettingsRow({
  emoji, title, subtitle, onPress, last = false, rightEl,
}: {
  emoji: string; title: string; subtitle?: string;
  onPress?: () => void; last?: boolean; rightEl?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <>
      <TouchableOpacity
        style={row.wrap}
        onPress={onPress}
        activeOpacity={onPress ? 0.6 : 1}
        disabled={!onPress}
      >
        <View style={row.icon}>
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[row.title, { color: colors.foreground }]}>{title}</Text>
          {subtitle ? <Text style={[row.sub, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
        </View>
        {rightEl ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} /> : null)}
      </TouchableOpacity>
      {!last && <View style={[row.sep, { backgroundColor: colors.border }]} />}
    </>
  );
}

const row = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontFamily: "Lato_700Bold" },
  sub:   { fontSize: 13, fontFamily: "Lato_400Regular", marginTop: 1 },
  sep:   { height: 1, marginLeft: 74 },
});

// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { expenses, preferences, updatePreferences, deleteExpense } = useExpenses();

  // budget editor
  const [budgetsOpen, setBudgetsOpen] = useState(false);
  const [budgets, setBudgets] = useState<Record<Category, string>>(
    Object.fromEntries(CATEGORIES.map(c => [c, preferences.budgets[c] != null ? String(preferences.budgets[c]) : ""])) as Record<Category, string>
  );
  const [savingBudgets, setSavingBudgets] = useState(false);

  // currency picker
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const currentCurrency = CURRENCIES.find(c => c.code === preferences.currencyCode) ?? CURRENCIES[0];

  const webTopPad    = Platform.OS === "web" ? 67 : 0;
  const webBottomPad = Platform.OS === "web" ? 34 : 0;

  // ── save budgets ─────────────────────────────────────────────────────────
  async function saveBudgets() {
    setSavingBudgets(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const parsed = Object.fromEntries(
      CATEGORIES.map(c => {
        const v = parseFloat(budgets[c]);
        return [c, isNaN(v) || v <= 0 ? null : v];
      })
    ) as Record<Category, number | null>;
    await updatePreferences({ budgets: parsed });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSavingBudgets(false);
    setBudgetsOpen(false);
  }

  // ── export CSV ───────────────────────────────────────────────────────────
  function exportCSV() {
    const header = "Date,Description,Category,Amount,Notes,Method\n";
    const rows = expenses.map(e =>
      `${e.date},"${e.description.replace(/"/g, '""')}",${e.category},${e.amount.toFixed(2)},"${(e.notes ?? "").replace(/"/g, '""')}",${e.captureMethod}`
    ).join("\n");
    const csv = header + rows;

    if (Platform.OS === "web") {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      void Share.share({ title: "Expense Export", message: csv });
    }
  }

  // ── clear all data ───────────────────────────────────────────────────────
  function clearData() {
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all your expense records. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: async () => {
            for (const e of expenses) await deleteExpense(e.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: insets.top + 20 + webTopPad, paddingHorizontal: 20, paddingBottom: 20 },
    title:     { fontSize: 28, fontFamily: "Lato_700Bold", color: colors.foreground },
    closeBtn:  { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
    content:   { paddingHorizontal: 20, paddingBottom: 40 + insets.bottom + webBottomPad, gap: 28 },
    sectionLabel: { fontSize: 13, fontFamily: "Lato_700Bold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
    card:      { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },

    // inline budget editor
    budgetRow:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
    budgetDot:   { width: 10, height: 10, borderRadius: 5 },
    budgetLabel: { flex: 1, fontSize: 15, fontFamily: "Lato_400Regular", color: colors.foreground },
    budgetInput: { fontSize: 15, fontFamily: "Lato_700Bold", color: colors.foreground, textAlign: "right", minWidth: 80, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: colors.muted, borderRadius: 8 },
    saveBudgetsBtn: { margin: 12, backgroundColor: colors.primary, borderRadius: 14, padding: 14, alignItems: "center" },
    saveBudgetsTxt: { fontSize: 15, fontFamily: "Lato_700Bold", color: "#FFFFFF" },
    sep: { height: 1, backgroundColor: colors.border, marginLeft: 74 },

    // currency modal
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    modalSheet:    { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 20 },
    modalTitle:    { fontSize: 17, fontFamily: "Lato_700Bold", color: colors.foreground, textAlign: "center", padding: 20 },
    currencyRow:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
    currencySymbol:{ width: 40, fontSize: 18, fontFamily: "Lato_700Bold", color: colors.foreground, textAlign: "center" },
    currencyLabel: { flex: 1, fontSize: 15, fontFamily: "Lato_400Regular", color: colors.foreground },
    currencyCode:  { fontSize: 14, fontFamily: "Lato_400Regular", color: colors.mutedForeground },
  });

  return (
    <View style={s.container}>
      {/* ── header ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Text style={s.title}>Settings</Text>
        <Pressable style={s.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <View>
          <Text style={s.sectionLabel}>Content</Text>
          <View style={s.card}>

            {/* Budgets row */}
            <SettingsRow
              emoji="💰"
              title="Budgets"
              subtitle="Set monthly spending limits per category"
              onPress={() => setBudgetsOpen(v => !v)}
              rightEl={<Ionicons name={budgetsOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />}
            />

            {/* Inline budget editor */}
            {budgetsOpen && (
              <View>
                <View style={[s.sep, { marginLeft: 0 }]} />
                {CATEGORIES.map((cat, i) => (
                  <View key={cat}>
                    <View style={s.budgetRow}>
                      <View style={[s.budgetDot, { backgroundColor: CATEGORY_CONFIG[cat].bar }]} />
                      <Text style={s.budgetLabel}>{cat}</Text>
                      <TextInput
                        style={s.budgetInput}
                        value={budgets[cat]}
                        onChangeText={v => setBudgets(p => ({ ...p, [cat]: v }))}
                        placeholder="No limit"
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="decimal-pad"
                        textAlign="right"
                      />
                    </View>
                    {i < CATEGORIES.length - 1 && <View style={[s.sep, { marginLeft: 36 }]} />}
                  </View>
                ))}
                <TouchableOpacity style={s.saveBudgetsBtn} onPress={saveBudgets} disabled={savingBudgets} activeOpacity={0.85}>
                  <Text style={s.saveBudgetsTxt}>{savingBudgets ? "Saving…" : "Save Budgets"}</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={s.sep} />

            {/* Export CSV */}
            <SettingsRow
              emoji="📊"
              title="Export CSV"
              subtitle={`${expenses.length} expense${expenses.length !== 1 ? "s" : ""} ready to export`}
              onPress={exportCSV}
            />

            <View style={s.sep} />

            {/* Clear data */}
            <SettingsRow
              emoji="🗑️"
              title="Clear All Data"
              subtitle="Permanently delete all expense records"
              onPress={clearData}
              last
            />
          </View>
        </View>

        {/* ── Language & Region ─────────────────────────────────────────── */}
        <View>
          <Text style={s.sectionLabel}>Language & Region</Text>
          <View style={s.card}>
            <SettingsRow
              emoji="💵"
              title="Currency"
              subtitle={`${currentCurrency.code} · ${currentCurrency.label}`}
              onPress={() => setCurrencyOpen(true)}
              last
            />
          </View>
        </View>

        {/* ── AI ───────────────────────────────────────────────────────── */}
        <View>
          <Text style={s.sectionLabel}>AI</Text>
          <View style={s.card}>
            <SettingsRow
              emoji="🤖"
              title="Confirm AI Input"
              subtitle="Review voice/AI-parsed expenses before saving"
              last
              rightEl={
                <Switch
                  value={preferences.confirmAiInput}
                  onValueChange={async (v) => {
                    void Haptics.selectionAsync();
                    await updatePreferences({ confirmAiInput: v });
                  }}
                />
              }
            />
          </View>
        </View>

        {/* ── More ─────────────────────────────────────────────────────── */}
        <View>
          <Text style={s.sectionLabel}>More</Text>
          <View style={s.card}>
            <SettingsRow
              emoji="ℹ️"
              title="About"
              subtitle="Personal Expense Tracker · v1.0"
              last
            />
          </View>
        </View>

      </ScrollView>

      {/* ── Currency picker modal ────────────────────────────────────────── */}
      <Modal visible={currencyOpen} transparent animationType="slide" onRequestClose={() => setCurrencyOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setCurrencyOpen(false)}>
          <Pressable style={s.modalSheet} onPress={e => e.stopPropagation()}>
            <Text style={s.modalTitle}>Select Currency</Text>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <ScrollView>
              {CURRENCIES.map((c, i) => {
                const selected = c.code === preferences.currencyCode;
                return (
                  <View key={c.code}>
                    <TouchableOpacity
                      style={s.currencyRow}
                      onPress={async () => {
                        await updatePreferences({ currencyCode: c.code });
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setCurrencyOpen(false);
                      }}
                      activeOpacity={0.6}
                    >
                      <Text style={s.currencySymbol}>{c.symbol}</Text>
                      <Text style={s.currencyLabel}>{c.label}</Text>
                      <Text style={s.currencyCode}>{c.code}</Text>
                      {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                    </TouchableOpacity>
                    {i < CURRENCIES.length - 1 && <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 20 }} />}
                  </View>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
