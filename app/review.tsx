import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CATEGORIES, CATEGORY_CONFIG, type Category } from "@/constants/colors";
import { useExpenses } from "@/context/ExpenseContext";
import { getPendingReview, loadPendingReviewFromDisk, type ParsedExpense } from "@/utils/pendingReview";
import { useColors } from "@/hooks/useColors";
import { usePenny } from "@/hooks/usePenny";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", PKR: "₨", INR: "₹",
  AED: "د.إ", JPY: "¥", CAD: "CA$", AUD: "A$",
};

export default function ReviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addExpense, preferences } = useExpenses();
  const penny = usePenny();
  const currencySymbol = CURRENCY_SYMBOLS[preferences.currencyCode] ?? preferences.currencyCode;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [pending, setPending] = useState<ParsedExpense | null>(getPendingReview());
  const [amount, setAmount] = useState(
    pending?.amount != null ? String(pending.amount) : ""
  );
  const [description, setDescription] = useState(pending?.description ?? "");
  const [date, setDate] = useState(pending?.date ?? todayStr);
  const [category, setCategory] = useState<Category | null>(pending?.category ?? null);
  const [notes, setNotes] = useState(pending?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (pending) return;
    loadPendingReviewFromDisk().then((p) => {
      if (!p) return;
      setPending(p);
      if (p.amount != null) setAmount(String(p.amount));
      setDescription(p.description ?? "");
      setDate(p.date ?? todayStr);
      setCategory(p.category ?? null);
      setNotes(p.notes ?? "");
    });
  }, []);

  const webBottomPad = Platform.OS === "web" ? 34 : 0;
  const webTopPad = Platform.OS === "web" ? 67 : 0;

  async function handleSave() {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount greater than 0.");
      return;
    }
    if (!category) {
      Alert.alert("Category required", "Please select a category.");
      return;
    }

    setIsSaving(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const saved = await addExpense({
        amount: parsedAmount,
        date: date || todayStr,
        description: description || "",
        category,
        notes: notes ?? "",
        captureMethod: pending?.captureMethod ?? "text",
        receiptPath: pending?.receiptPath ?? null,
      });
      void penny.onExpenseSaved(saved);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
    } catch {
      Alert.alert("Error", "Couldn't save expense. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: insets.top + 16 + webTopPad,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    headerTitle: {
      flex: 1,
      fontSize: 22,
      fontFamily: "Lato_700Bold",
      color: colors.foreground,
      textAlign: "center",
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40 + insets.bottom + webBottomPad,
      gap: 16,
    },
    receiptPreview: {
      width: "100%",
      height: 180,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: colors.muted,
    },
    amountCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    amountLabel: {
      fontSize: 12,
      fontFamily: "Lato_400Regular",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    amountInputRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    currencySymbol: {
      fontSize: 32,
      fontFamily: "Lato_700Bold",
      color: colors.mutedForeground,
      marginRight: 4,
    },
    amountInput: {
      flex: 1,
      fontSize: 40,
      fontFamily: "Lato_700Bold",
      color: colors.foreground,
    },
    fieldCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 16,
    },
    fieldRow: {
      gap: 4,
    },
    fieldLabel: {
      fontSize: 12,
      fontFamily: "Lato_400Regular",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    fieldInput: {
      fontSize: 16,
      fontFamily: "Lato_400Regular",
      color: colors.foreground,
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
    },
    categorySection: {
      gap: 4,
    },
    categoryLabel: {
      fontSize: 12,
      fontFamily: "Lato_400Regular",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    categoryChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      gap: 6,
    },
    categoryChipText: {
      fontSize: 13,
      fontFamily: "Lato_400Regular",
    },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 18,
      padding: 18,
      alignItems: "center",
      marginTop: 4,
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      fontSize: 16,
      fontFamily: "Lato_700Bold",
      color: "#FFFFFF",
    },
    missingBanner: {
      backgroundColor: "#FFF3CD",
      borderRadius: 12,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    missingText: {
      fontSize: 13,
      fontFamily: "Lato_400Regular",
      color: "#856404",
      flex: 1,
    },
  });

  const hasImage = !!pending?.receiptPath;
  const isFormValid =
    parseFloat(amount) > 0 && !!category;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Review</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {hasImage && (
          <Image
            source={{ uri: pending!.receiptPath! }}
            style={styles.receiptPreview}
            contentFit="cover"
          />
        )}

        {(!pending?.amount || !pending?.description) && (
          <View style={styles.missingBanner}>
            <Ionicons name="warning-outline" size={18} color="#856404" />
            <Text style={styles.missingText}>
              {hasImage
                ? "Couldn't fully parse — please fill in the details below."
                : "Fill in your expense details."}
            </Text>
          </View>
        )}

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount</Text>
          <View style={styles.amountInputRow}>
            <Text style={styles.currencySymbol}>{currencySymbol}</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              selectTextOnFocus
            />
          </View>
        </View>

        <View style={styles.fieldCard}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={styles.fieldInput}
              value={description}
              onChangeText={setDescription}
              placeholder="What did you spend on?"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="next"
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              style={styles.fieldInput}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.fieldInput, { minHeight: 40 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any extra details..."
              placeholderTextColor={colors.mutedForeground}
              multiline
            />
          </View>
        </View>

        <View style={styles.fieldCard}>
          <View style={styles.categorySection}>
            <Text style={styles.categoryLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? cfg.bar : cfg.light,
                        borderColor: isSelected ? cfg.bar : "transparent",
                      },
                    ]}
                    onPress={() => {
                      setCategory(cat);
                      void Haptics.selectionAsync();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={cfg.icon as "receipt-outline"}
                      size={14}
                      color={isSelected ? "#FFFFFF" : cfg.bar}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isSelected ? "#FFFFFF" : cfg.bar },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, (!isFormValid || isSaving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!isFormValid || isSaving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>
            {isSaving ? "Saving..." : "Save Expense"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
