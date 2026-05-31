import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CATEGORIES, getCategoryConfig, type Category } from "@/constants/colors";
import { type Expense, useExpenses } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type FilterCategory = Category | "All";

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, preferences } = useExpenses();
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("All");

  const webTopPad = Platform.OS === "web" ? 67 : 0;
  const webBottomPad = Platform.OS === "web" ? 34 : 0;

  const filtered = useMemo(() => {
    return selectedCategory === "All"
      ? expenses
      : expenses.filter((e) => e.category === selectedCategory);
  }, [expenses, selectedCategory]);

  const grouped = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    for (const e of filtered) {
      const [year, month] = e.date.split("-");
      const key = `${year}-${month}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  type ListItem =
    | { type: "header"; key: string; label: string; total: number }
    | { type: "expense"; expense: Expense };

  const listData: ListItem[] = useMemo(() => {
    const items: ListItem[] = [];
    for (const [key, exps] of grouped) {
      const [year, month] = key.split("-");
      const total = exps.reduce((s, e) => s + e.amount, 0);
      items.push({
        type: "header",
        key,
        label: `${MONTH_NAMES[Number(month) - 1]} ${year}`,
        total,
      });
      for (const exp of exps) {
        items.push({ type: "expense", expense: exp });
      }
    }
    return items;
  }, [grouped]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: insets.top + 16 + webTopPad,
      paddingHorizontal: 20,
      paddingBottom: 12,
      backgroundColor: colors.background,
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: "Lato_700Bold",
      color: colors.foreground,
      marginBottom: 16,
    },
    filterScroll: {
      paddingBottom: 12,
    },
    filterScrollContent: {
      gap: 8,
      paddingRight: 4,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    filterChipText: {
      fontSize: 13,
      fontFamily: "Lato_400Regular",
    },
    monthHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 8,
    },
    monthLabel: {
      fontSize: 14,
      fontFamily: "Lato_700Bold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    monthTotal: {
      fontSize: 14,
      fontFamily: "Lato_700Bold",
      color: colors.foreground,
    },
    expenseRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: colors.card,
      marginHorizontal: 20,
      marginBottom: 1,
      borderRadius: 0,
    },
    firstInGroup: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    lastInGroup: {
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
      marginBottom: 4,
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
    expenseMeta: {
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
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 80,
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

  // Track first/last in each card group
  const groupBoundaries = useMemo(() => {
    const boundaries = new Set<string>();
    const lastInGroup = new Set<string>();
    let prevHeaderKey: string | null = null;
    let prevExpenseId: string | null = null;
    for (const item of listData) {
      if (item.type === "header") {
        if (prevExpenseId) lastInGroup.add(prevExpenseId);
        prevHeaderKey = item.key;
        prevExpenseId = null;
      } else {
        if (prevHeaderKey && prevExpenseId === null) {
          boundaries.add(item.expense.id);
        }
        prevExpenseId = item.expense.id;
      }
    }
    if (prevExpenseId) lastInGroup.add(prevExpenseId);
    return { first: boundaries, last: lastInGroup };
  }, [listData]);

  const filterCategories: FilterCategory[] = ["All", ...CATEGORIES, ...preferences.customCategories];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
        <FlatList
          horizontal
          data={filterCategories}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
          style={styles.filterScroll}
          renderItem={({ item }) => {
            const isActive = item === selectedCategory;
            const cfg = item !== "All" ? getCategoryConfig(item) : null;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive
                      ? cfg?.bar ?? colors.primary
                      : colors.card,
                    borderColor: isActive
                      ? cfg?.bar ?? colors.primary
                      : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(item)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isActive ? "#FFFFFF" : colors.foreground,
                    },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {listData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>No transactions</Text>
          <Text style={styles.emptySubtext}>
            {selectedCategory !== "All"
              ? `No ${selectedCategory} expenses yet`
              : "Add your first expense with the + button"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) =>
            item.type === "header" ? `header-${item.key}` : item.expense.id
          }
          contentContainerStyle={{
            paddingBottom: 100 + insets.bottom + webBottomPad,
          }}
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <View style={styles.monthHeader}>
                  <Text style={styles.monthLabel}>{item.label}</Text>
                  <Text style={styles.monthTotal}>
                    {formatCurrency(item.total, preferences.currencyCode)}
                  </Text>
                </View>
              );
            }
            const { expense } = item;
            const cfg = getCategoryConfig(expense.category);
            const isFirst = groupBoundaries.first.has(expense.id);
            const isLast = groupBoundaries.last.has(expense.id);
            return (
              <TouchableOpacity
                style={[
                  styles.expenseRow,
                  isFirst && styles.firstInGroup,
                  isLast && styles.lastInGroup,
                ]}
                onPress={() => router.push(`/expense/${expense.id}`)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.expenseIconWrap,
                    { backgroundColor: cfg.light },
                  ]}
                >
                  <Ionicons
                    name={cfg.icon as "receipt-outline"}
                    size={20}
                    color={cfg.bar}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expenseDescription} numberOfLines={1}>
                    {expense.description || "—"}
                  </Text>
                  <Text style={styles.expenseMeta}>
                    {formatDate(expense.date)} · {expense.category}
                  </Text>
                </View>
                <Text style={styles.expenseAmount}>
                  {formatCurrency(expense.amount, preferences.currencyCode)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
