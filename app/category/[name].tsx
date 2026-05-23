import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CATEGORY_CONFIG, type Category } from "@/constants/colors";
import { useExpenses } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatCurrency(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CategoryDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getExpensesForMonth, preferences, getCategoryTotal } = useExpenses();

  const category = name as Category;
  const cfg = CATEGORY_CONFIG[category];

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);

  const categoryExpenses = useMemo(() => {
    return getExpensesForMonth(selectedYear, selectedMonth).filter(
      (e) => e.category === category
    );
  }, [getExpensesForMonth, selectedYear, selectedMonth, category]);

  const total = getCategoryTotal(category, selectedYear, selectedMonth);
  const budget = preferences.budgets[category];
  const overBudget = budget != null && total > budget;

  function prevMonth() {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    const now = new Date();
    if (
      selectedYear === now.getFullYear() &&
      selectedMonth === now.getMonth() + 1
    )
      return;
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  }

  const isCurrentMonth =
    selectedYear === today.getFullYear() &&
    selectedMonth === today.getMonth() + 1;

  const webTopPad = Platform.OS === "web" ? 67 : 0;
  const webBottomPad = Platform.OS === "web" ? 34 : 0;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerGradient: {
      paddingTop: insets.top + 16 + webTopPad,
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: "Lato_700Bold",
      color: "#FFFFFF",
      flex: 1,
    },
    totalRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
    },
    totalAmount: {
      fontSize: 40,
      fontFamily: "Lato_700Bold",
      color: "#FFFFFF",
      letterSpacing: -1,
    },
    totalSub: {
      fontSize: 14,
      fontFamily: "Lato_400Regular",
      color: "rgba(255,255,255,0.7)",
      marginBottom: 6,
    },
    budgetRow: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    budgetBar: {
      flex: 1,
      height: 6,
      backgroundColor: "rgba(255,255,255,0.3)",
      borderRadius: 3,
      overflow: "hidden",
    },
    budgetBarFill: {
      height: "100%",
      borderRadius: 3,
    },
    budgetText: {
      fontSize: 13,
      fontFamily: "Lato_400Regular",
      color: "rgba(255,255,255,0.8)",
    },
    monthNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      gap: 16,
      backgroundColor: colors.background,
    },
    monthNavBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    monthLabel: {
      fontSize: 15,
      fontFamily: "Lato_700Bold",
      color: colors.foreground,
      minWidth: 140,
      textAlign: "center",
    },
    expenseRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 1,
    },
    firstInGroup: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    lastInGroup: {
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
    },
    expenseIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    expenseDescription: {
      fontSize: 15,
      fontFamily: "Lato_700Bold",
      color: colors.foreground,
    },
    expenseDate: {
      fontSize: 12,
      fontFamily: "Lato_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },
    expenseAmount: {
      fontSize: 15,
      fontFamily: "Lato_700Bold",
      color: colors.foreground,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 60,
      paddingHorizontal: 40,
    },
    emptyText: {
      fontSize: 16,
      fontFamily: "Lato_700Bold",
      color: colors.mutedForeground,
      marginTop: 12,
    },
    emptySubtext: {
      fontSize: 13,
      fontFamily: "Lato_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      marginTop: 4,
    },
  });

  const gradientColors: [string, string] =
    overBudget ? ["#EF4444", "#DC2626"] : [cfg.bar, adjustColor(cfg.bar, -20)];

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={styles.headerGradient}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>{category}</Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalAmount}>
            {formatCurrency(total, preferences.currencyCode)}
          </Text>
          <Text style={styles.totalSub}>this month</Text>
        </View>

        {budget != null && (
          <View style={styles.budgetRow}>
            <View style={styles.budgetBar}>
              <View
                style={[
                  styles.budgetBarFill,
                  {
                    width: `${Math.min((total / budget) * 100, 100)}%`,
                    backgroundColor: overBudget
                      ? "#FFFFFF"
                      : "rgba(255,255,255,0.9)",
                  },
                ]}
              />
            </View>
            <Text style={styles.budgetText}>
              {formatCurrency(budget, preferences.currencyCode)} budget
            </Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.monthNavBtn} onPress={prevMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
        </Text>
        <TouchableOpacity
          style={[styles.monthNavBtn, isCurrentMonth && { opacity: 0.3 }]}
          onPress={nextMonth}
          activeOpacity={0.7}
          disabled={isCurrentMonth}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {categoryExpenses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name={cfg.icon as "receipt-outline"} size={48} color={colors.border} />
          <Text style={styles.emptyText}>No {category} expenses</Text>
          <Text style={styles.emptySubtext}>
            Expenses you log in this category will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={categoryExpenses}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{
            paddingVertical: 16,
            paddingBottom: 40 + insets.bottom + webBottomPad,
          }}
          renderItem={({ item, index }) => {
            const isFirst = index === 0;
            const isLast = index === categoryExpenses.length - 1;
            return (
              <TouchableOpacity
                style={[
                  styles.expenseRow,
                  isFirst && styles.firstInGroup,
                  isLast && styles.lastInGroup,
                ]}
                onPress={() => router.push(`/expense/${item.id}`)}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.expenseIconWrap, { backgroundColor: cfg.light }]}
                >
                  <Ionicons
                    name={cfg.icon as "receipt-outline"}
                    size={20}
                    color={cfg.bar}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expenseDescription} numberOfLines={1}>
                    {item.description || "—"}
                  </Text>
                  <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
                </View>
                <Text style={styles.expenseAmount}>
                  {formatCurrency(item.amount, preferences.currencyCode)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
