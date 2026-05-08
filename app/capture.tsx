import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useRef, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Category } from "@/constants/colors";
import { CATEGORIES, CATEGORY_CONFIG } from "@/constants/colors";
import { useExpenses } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";
import { setPendingReview } from "@/utils/pendingReview";

// ── keyword map for smart chip ordering ───────────────────────────────────────
const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  Food:          ["food","coffee","cafe","restaurant","grocery","groceries","lunch","dinner","breakfast","eat","drink","burger","pizza","sushi","meal","snack"],
  Transport:     ["uber","lyft","taxi","bus","train","metro","gas","fuel","parking","transport","ride","car","flight","airline","commute"],
  Entertainment: ["movie","cinema","game","netflix","spotify","concert","show","ticket","entertainment","fun","music","book","stream"],
  Shopping:      ["shop","store","amazon","clothes","clothing","buy","purchase","retail","online","mall","dress","shoes"],
  Bills:         ["bill","utility","electricity","water","internet","phone","rent","insurance","subscription"],
  Other:         [],
};

const CATEGORY_EMOJI: Record<Category, string> = {
  Food: "🍔", Transport: "🚗", Entertainment: "🎬",
  Shopping: "🛍️", Bills: "📄", Other: "📦",
};

function scoreCategory(cat: Category, text: string): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  return CATEGORY_KEYWORDS[cat].reduce((n, kw) => n + (lower.includes(kw) ? 1 : 0), 0);
}

// ── image → AI receipt parse ───────────────────────────────────────────────────
async function parseReceiptImage(base64: string, apiUrl: string) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    const resp = await fetch(`${apiUrl}/api/parse-expense`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "image", content: base64 }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    return resp.json() as Promise<{
      amount: number | null; date: string; merchant: string;
      category: Category | null; notes: string; confidence: "high" | "low";
    }>;
  } catch { return null; }
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// ─────────────────────────────────────────────────────────────────────────────
export default function CaptureScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { addExpense } = useExpenses();

  const [description, setDescription]     = useState("");
  const [amount, setAmount]               = useState("");
  const [selectedCat, setSelectedCat]     = useState<Category | null>(null);
  const [customChips, setCustomChips]     = useState<string[]>([]);
  const [addingCustom, setAddingCustom]   = useState(false);
  const [customInput, setCustomInput]     = useState("");
  const [isLoading, setIsLoading]         = useState(false);
  const [toastMsg, setToastMsg]           = useState<string | null>(null);

  const descRef   = useRef<TextInput>(null);
  const amountRef = useRef<TextInput>(null);
  const customRef = useRef<TextInput>(null);
  const dateRef   = useRef<TextInput>(null);

  const todayDateStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  const [selectedDate, setSelectedDate] = useState(todayDateStr);
  const [editingDate, setEditingDate]   = useState(false);

  const webTopPad    = Platform.OS === "web" ? 80 : 24;
  const webBottomPad = Platform.OS === "web" ? 34 : 0;

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  }

  // Sort predefined categories by description relevance
  const sortedCategories = useMemo(() =>
    [...CATEGORIES].sort((a, b) => scoreCategory(b, description) - scoreCategory(a, description)),
  [description]);

  // ── text save (direct, no AI) ──────────────────────────────────────────────
  async function handleSave() {
    if (!description.trim()) { descRef.current?.focus(); return; }
    const num = parseFloat(amount.replace(/[^0-9.]/g, ""));
    if (!num || num <= 0) { amountRef.current?.focus(); return; }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();

    await addExpense({
      amount: num,
      date: selectedDate,
      merchant: description.trim(),
      category: selectedCat ?? "Other",
      notes: "",
      captureMethod: "text",
      receiptPath: null,
    });

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(`Saved · ${selectedCat ?? "Other"} · $${num.toFixed(2)}`);
    setTimeout(() => router.back(), 700);
  }

  // ── image capture ──────────────────────────────────────────────────────────
  async function handleCapture(type: "camera" | "upload") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();

    let result: ImagePicker.ImagePickerResult;
    if (type === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Camera Permission", "Camera access is required to take receipt photos.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6, base64: true, allowsEditing: false });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6, base64: true, allowsEditing: false });
    }

    if (result.canceled || !result.assets[0]) return;
    const base64 = result.assets[0].base64;
    if (!base64) return;

    setIsLoading(true);
    const parsed = await parseReceiptImage(base64, API_URL);
    setIsLoading(false);

    // Save receipt image to file system (avoid storing base64 in DB)
    let receiptPath: string | null = null;
    try {
      const dir = FileSystem.documentDirectory + "receipts/";
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const path = dir + ("xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 0x3) | 0x8).toString(16); })) + ".jpg";
      await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
      receiptPath = path;
    } catch {
      // Non-fatal — expense saves without image
    }

    setPendingReview({
      amount: parsed?.amount ?? null,
      date:   parsed?.date ?? selectedDate,
      merchant: parsed?.merchant ?? "",
      category: parsed?.category ?? null,
      notes: parsed?.notes ?? "",
      receiptPath,
      captureMethod: type === "camera" ? "camera" : "upload_image",
    });
    router.push("/review");
  }

  // ── custom chip ────────────────────────────────────────────────────────────
  function commitCustom() {
    const label = customInput.trim();
    setAddingCustom(false);
    setCustomInput("");
    if (!label) return;
    if (!customChips.includes(label)) setCustomChips(p => [...p, label]);
    setSelectedCat("Other");
  }

  const canSave = description.trim().length > 0 && parseFloat(amount) > 0;

  // ── styles ─────────────────────────────────────────────────────────────────
  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", zIndex: 10 },
    loadingCard: { backgroundColor: colors.card, borderRadius: 20, padding: 32, alignItems: "center", gap: 16 },
    loadingText: { fontSize: 15, fontFamily: "Lato_400Regular", color: colors.foreground },

    toast: { position: "absolute", bottom: 120 + insets.bottom + webBottomPad, left: 20, right: 20, backgroundColor: "#22C55E", borderRadius: 14, padding: 14, alignItems: "center", zIndex: 20 },
    toastText: { fontSize: 14, fontFamily: "Lato_700Bold", color: "#FFFFFF" },

    content: { paddingHorizontal: 24, paddingTop: insets.top + webTopPad, paddingBottom: 40 + insets.bottom + webBottomPad },

    // top row
    topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
    mediaRow: { flexDirection: "row", gap: 8 },
    mediaBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
    closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },

    // date chip
    dateChip: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 4, backgroundColor: colors.muted, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
    dateChipText: { fontSize: 14, fontFamily: "Lato_700Bold", color: colors.foreground },
    dateChipInput: { fontSize: 14, fontFamily: "Lato_700Bold", color: colors.foreground, minWidth: 110, paddingVertical: 0 },

    // inputs — left accent line style
    inputWrap: { borderLeftWidth: 3, borderLeftColor: colors.border, paddingLeft: 16, marginTop: 28 },
    inputWrapFilled: { borderLeftColor: colors.primary },
    descInput: { fontSize: 32, fontFamily: "Lato_700Bold", color: colors.foreground, paddingVertical: 0 },
    amountInput: { fontSize: 28, fontFamily: "Lato_400Regular", color: colors.foreground, paddingVertical: 0, marginTop: 14 },

    // chips
    chipsRow: { flexDirection: "row", gap: 8, paddingVertical: 4, alignItems: "center" },
    addChip: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    customInputChip: { height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.primary, paddingHorizontal: 14, fontSize: 14, fontFamily: "Lato_400Regular", color: colors.foreground, minWidth: 100 },
    chip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.muted },
    chipSelected: { backgroundColor: colors.primary },
    chipEmoji: { fontSize: 14 },
    chipText: { fontSize: 14, fontFamily: "Lato_400Regular", color: colors.foreground },
    chipTextSelected: { color: "#FFFFFF", fontFamily: "Lato_700Bold" },

    // save
    saveRow: { marginTop: 40, flexDirection: "row" },
    saveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16 },
    saveBtnDisabled: { backgroundColor: colors.border },
    saveBtnText: { fontSize: 16, fontFamily: "Lato_700Bold", color: "#FFFFFF" },
  });

  return (
    <View style={s.container}>
      {isLoading && (
        <Animated.View entering={FadeIn} style={s.overlay}>
          <View style={s.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={s.loadingText}>Reading receipt…</Text>
          </View>
        </Animated.View>
      )}

      {toastMsg && (
        <Animated.View entering={FadeInUp} style={s.toast}>
          <Text style={s.toastText}>{toastMsg}</Text>
        </Animated.View>
      )}

      <KeyboardAwareScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
      >
        {/* ── top row: media buttons + close ─────────────────────────────── */}
        <View style={s.topRow}>
          <View style={s.mediaRow}>
            <TouchableOpacity style={s.mediaBtn} onPress={() => handleCapture("camera")} disabled={isLoading}>
              <Ionicons name="camera-outline" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity style={s.mediaBtn} onPress={() => handleCapture("upload")} disabled={isLoading}>
              <Ionicons name="image-outline" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <Pressable style={s.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        {/* ── date chip ───────────────────────────────────────────────────── */}
        {editingDate ? (
          <View style={s.dateChip}>
            <TextInput
              ref={dateRef}
              style={s.dateChipInput}
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
              onSubmitEditing={() => setEditingDate(false)}
              onBlur={() => setEditingDate(false)}
              autoFocus
            />
          </View>
        ) : (
          <TouchableOpacity
            style={s.dateChip}
            activeOpacity={0.7}
            onPress={() => { setEditingDate(true); setTimeout(() => dateRef.current?.focus(), 60); }}
          >
            <Text style={s.dateChipText}>{selectedDate === todayDateStr ? "Today" : selectedDate}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}

        {/* ── inputs with left accent ─────────────────────────────────────── */}
        <View style={[s.inputWrap, description ? s.inputWrapFilled : null]}>
          <TextInput
            ref={descRef}
            style={s.descInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            placeholderTextColor={colors.border}
            returnKeyType="next"
            onSubmitEditing={() => amountRef.current?.focus()}
            blurOnSubmit={false}
            editable={!isLoading}
            autoFocus
          />
          <TextInput
            ref={amountRef}
            style={s.amountInput}
            value={amount}
            onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ""))}
            placeholder="Amount"
            placeholderTextColor={colors.border}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            editable={!isLoading}
          />
        </View>

        {/* ── category chips ──────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 32 }}
          contentContainerStyle={s.chipsRow}
          keyboardShouldPersistTaps="handled"
        >
          {/* Add custom */}
          {addingCustom ? (
            <TextInput
              ref={customRef}
              style={s.customInputChip}
              value={customInput}
              onChangeText={setCustomInput}
              placeholder="Category…"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
              onSubmitEditing={commitCustom}
              onBlur={commitCustom}
              autoFocus
            />
          ) : (
            <TouchableOpacity
              style={s.addChip}
              onPress={() => { setAddingCustom(true); setTimeout(() => customRef.current?.focus(), 60); }}
            >
              <Ionicons name="add" size={18} color={colors.foreground} />
            </TouchableOpacity>
          )}

          {/* Custom chips (map to Other) */}
          {customChips.map(label => {
            const sel = selectedCat === "Other";
            return (
              <TouchableOpacity key={label} style={[s.chip, sel && s.chipSelected]} onPress={() => setSelectedCat("Other")}>
                <Text style={[s.chipText, sel && s.chipTextSelected]}>{label}</Text>
              </TouchableOpacity>
            );
          })}

          {/* Predefined, sorted by relevance */}
          {sortedCategories.map(cat => {
            const sel = selectedCat === cat;
            const cfg = CATEGORY_CONFIG[cat];
            return (
              <TouchableOpacity
                key={cat}
                style={[s.chip, sel && { backgroundColor: cfg.bar }]}
                onPress={() => setSelectedCat(sel ? null : cat)}
              >
                <Text style={s.chipEmoji}>{CATEGORY_EMOJI[cat]}</Text>
                <Text style={[s.chipText, sel && s.chipTextSelected]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── save ────────────────────────────────────────────────────────── */}
        <View style={s.saveRow}>
          <TouchableOpacity
            style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave || isLoading}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            <Text style={s.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
