import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
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

import { CATEGORIES, getCategoryConfig, type Category } from "@/constants/colors";
import { useExpenses } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

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

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, updateExpense, deleteExpense, preferences } = useExpenses();

  const expense = expenses.find((e) => e.id === id);
  const [isEditing, setIsEditing] = useState(false);

  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [date, setDate] = useState(expense?.date ?? "");
  const [category, setCategory] = useState<Category | null>(expense?.category ?? null);
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const webTopPad = Platform.OS === "web" ? 67 : 0;
  const webBottomPad = Platform.OS === "web" ? 34 : 0;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: insets.top + 16 + webTopPad,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontFamily: "Lato_700Bold",
      color: colors.foreground,
      textAlign: "center",
    },
    headerBtn: {
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
    receiptImage: {
      width: "100%",
      height: 200,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: colors.muted,
    },
    amountCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryPill: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
      marginBottom: 12,
    },
    categoryPillText: {
      fontSize: 13,
      fontFamily: "Lato_700Bold",
      color: "#FFFFFF",
    },
    amountDisplay: {
      fontSize: 48,
      fontFamily: "Lato_700Bold",
      color: colors.foreground,
      letterSpacing: -1,
    },
    amountInput: {
      fontSize: 40,
      fontFamily: "Lato_700Bold",
      color: colors.foreground,
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
      textAlign: "center",
      minWidth: 150,
    },
    detailCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 16,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    detailIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    detailLabel: {
      fontSize: 12,
      fontFamily: "Lato_400Regular",
      color: colors.mutedForeground,
      marginBottom: 2,
    },
    detailValue: {
      fontSize: 15,
      fontFamily: "Lato_400Regular",
      color: colors.foreground,
    },
    detailInput: {
      fontSize: 15,
      fontFamily: "Lato_400Regular",
      color: colors.foreground,
      borderBottomWidth: 1,
      borderBottomColor: colors.primary,
      paddingVertical: 2,
      minWidth: 120,
    },
    separator: { height: 1, backgroundColor: colors.border },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 4,
    },
    categoryChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1.5,
      gap: 5,
    },
    categoryChipText: {
      fontSize: 12,
      fontFamily: "Lato_400Regular",
    },
    actionRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 4,
    },
    editBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 16,
      alignItems: "center",
    },
    editBtnText: {
      fontSize: 15,
      fontFamily: "Lato_700Bold",
      color: "#FFFFFF",
    },
    deleteBtn: {
      flex: 1,
      backgroundColor: "#FEE2E2",
      borderRadius: 16,
      padding: 16,
      alignItems: "center",
    },
    deleteBtnText: {
      fontSize: 15,
      fontFamily: "Lato_700Bold",
      color: "#EF4444",
    },
    captureTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      alignSelf: "center",
    },
    captureTagText: {
      fontSize: 12,
      fontFamily: "Lato_400Regular",
      color: colors.mutedForeground,
    },
  });

  if (!expense) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.mutedForeground} />
        <Text style={{ color: colors.mutedForeground, marginTop: 8, fontFamily: "Lato_400Regular" }}>
          Expense not found
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontFamily: "Lato_400Regular" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cfg = getCategoryConfig(expense.category);

  async function handleSave() {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }
    if (!category) {
      Alert.alert("Category required", "Please select a category.");
      return;
    }
    setIsSaving(true);
    try {
      await updateExpense(expense!.id, {
        amount: parsedAmount,
        description,
        date,
        category,
        notes,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteExpense(expense!.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.back();
          },
        },
      ]
    );
  }

  const captureMethodLabels: Record<string, string> = {
    camera: "Camera",
    upload_image: "Upload",
    text: "Text",
    voice: "Voice",
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Expense</Text>
        {isEditing ? (
          <Pressable
            style={[styles.headerBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          </Pressable>
        ) : (
          <Pressable style={styles.headerBtn} onPress={() => setIsEditing(true)}>
            <Ionicons name="pencil-outline" size={18} color={colors.foreground} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {expense.receiptPath && (
          <Image
            source={{ uri: expense.receiptPath }}
            style={styles.receiptImage}
            contentFit="cover"
          />
        )}

        <View style={styles.amountCard}>
          <View style={[styles.categoryPill, { backgroundColor: cfg.bar }]}>
            <Ionicons name={cfg.icon as "receipt-outline"} size={14} color="#FFFFFF" />
            <Text style={styles.categoryPillText}>{expense.category}</Text>
          </View>
          {isEditing ? (
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
          ) : (
            <Text style={styles.amountDisplay}>
              {formatCurrency(expense.amount, preferences.currencyCode)}
            </Text>
          )}
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailIconWrap}>
              <Ionicons name="storefront-outline" size={18} color={colors.mutedForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Description</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What did you spend on?"
                  placeholderTextColor={colors.mutedForeground}
                />
              ) : (
                <Text style={styles.detailValue}>{expense.description || "—"}</Text>
              )}
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconWrap}>
              <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Date</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailInput}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numbers-and-punctuation"
                />
              ) : (
                <Text style={styles.detailValue}>{formatDate(expense.date)}</Text>
              )}
            </View>
          </View>

          {(expense.notes || isEditing) && (
            <>
              <View style={styles.separator} />
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="document-text-outline" size={18} color={colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Notes</Text>
                  {isEditing ? (
                    <TextInput
                      style={[styles.detailInput, { minHeight: 40 }]}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Optional notes..."
                      placeholderTextColor={colors.mutedForeground}
                      multiline
                    />
                  ) : (
                    <Text style={styles.detailValue}>{expense.notes}</Text>
                  )}
                </View>
              </View>
            </>
          )}

          {isEditing && (
            <>
              <View style={styles.separator} />
              <View>
                <Text style={[styles.detailLabel, { marginBottom: 8 }]}>Category</Text>
                <View style={styles.categoryGrid}>
                  {[...CATEGORIES, ...preferences.customCategories].map((cat) => {
                    const c = getCategoryConfig(cat);
                    const isSelected = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: isSelected ? c.bar : c.light,
                            borderColor: isSelected ? c.bar : "transparent",
                          },
                        ]}
                        onPress={() => {
                          setCategory(cat);
                          void Haptics.selectionAsync();
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={c.icon as "receipt-outline"}
                          size={13}
                          color={isSelected ? "#FFFFFF" : c.bar}
                        />
                        <Text
                          style={[
                            styles.categoryChipText,
                            { color: isSelected ? "#FFFFFF" : c.bar },
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          )}
        </View>

        <View style={styles.captureTag}>
          <Ionicons
            name={
              expense.captureMethod === "camera"
                ? "camera-outline"
                : expense.captureMethod === "upload_image"
                ? "image-outline"
                : expense.captureMethod === "voice"
                ? "mic-outline"
                : "text-outline"
            }
            size={13}
            color={colors.mutedForeground}
          />
          <Text style={styles.captureTagText}>
            Logged via {captureMethodLabels[expense.captureMethod] ?? expense.captureMethod}
          </Text>
        </View>

        {!isEditing && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
