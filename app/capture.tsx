import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState, useMemo, useEffect } from "react";
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
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";


import type { Category } from "@/constants/colors";
import { CATEGORIES, getCategoryConfig } from "@/constants/colors";
import { useExpenses } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";
import { usePenny } from "@/hooks/usePenny";
import { getPendingReview, setPendingReview } from "@/utils/pendingReview";

// ── keyword map for smart chip ordering ───────────────────────────────────────
const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  Food: [
    // generic
    "food","meal","snack","eat","drink","breakfast","lunch","dinner","brunch",
    // drinks
    "coffee","tea","chai","juice","smoothie","water","soda","energy drink","green tea",
    // cafes & fast food
    "cafe","bakery","diner","bistro","canteen","dhaba","stall","cart",
    "burger","pizza","sushi","wrap","sandwich","shawarma","roll","biryani","karahi",
    "nihari","haleem","kebab","tikka","bbq","grill","barbecue","paratha","naan","roti",
    "pasta","noodles","ramen","tacos","fries","wings","nuggets","fried chicken",
    // desserts
    "ice cream","dessert","cake","pastry","donut","cookie","chocolate","mithai","kheer",
    // groceries
    "grocery","groceries","supermarket","market","sabzi","vegetables","fruit","dairy",
    "imtiaz","naheed","carrefour","metro cash","hyperstar","chase up","alfatah",
    // delivery
    "foodpanda","cheetay","bykea food","uber eats","zomato","swiggy","deliveroo","doordash","grubhub",
    // restaurants generic
    "restaurant","eatery","kitchen","grill","house","bar","lounge","dine",
  ],
  Transport: [
    // ride hailing
    "uber","careem","lyft","bolt","grab","ola","rapido","indrive","bykea","swvl",
    // public
    "taxi","bus","train","metro","tram","ferry","rickshaw","qingqi","chingchi",
    "orange line","green line","brt","minibus","wagon","coaster",
    // fuel & vehicle
    "fuel","petrol","diesel","gas","cng","pump","shell","total","pso","attock","byco",
    "parking","toll","motorway","highway","expressway",
    // air
    "flight","airline","pia","airblue","serene air","fly jinnah","emirates","etihad",
    "airport","boarding","ticket","aviation",
    // maintenance
    "car","vehicle","bike","motorcycle","repair","service","tyre","tire","battery",
    "mechanic","garage","oil change","wash","detailing",
    // other transit
    "commute","transport","ride","travel","journey","trip",
  ],
  Entertainment: [
    // streaming
    "netflix","youtube","spotify","apple music","disney","hbo","amazon prime","peacock",
    "tidal","deezer","soundcloud","twitch","crunchyroll","shahid","tapmad","jazztv",
    // games
    "game","gaming","steam","playstation","xbox","nintendo","pubg","fortnite",
    "app store","google play","in-app","dlc",
    // cinema & events
    "movie","cinema","film","theatre","theater","nueplex","cinepax","atrium","cineworld",
    "concert","show","event","festival","carnival","amusement","theme park","zoo",
    "ticket","entry","pass","membership",
    // sports
    "sports","gym","fitness","yoga","swimming","cricket","football","match","game",
    "pcb","psl","football club",
    // hobbies
    "book","ebook","kindle","magazine","newspaper","comic","course","udemy","coursera",
    "music","instrument","art","craft","hobby","subscription","fun","recreation",
  ],
  Shopping: [
    // local platforms
    "daraz","aliexpress","alibaba","goto","yayvo","telemart","shophive","homeshopping",
    // global
    "amazon","ebay","etsy","walmart","target","ikea","zara","h&m","uniqlo","gap",
    // clothes & accessories
    "clothes","clothing","dress","shoes","shirt","pants","jeans","jacket","coat",
    "kurta","shalwar","saree","handbag","bag","wallet","belt","watch","jewellery",
    "sunglasses","cap","hat","scarf","accessories",
    // electronics
    "electronics","mobile","phone","laptop","tablet","computer","headphones","earphones",
    "charger","cable","keyboard","mouse","monitor","camera","tv","appliance",
    // home
    "furniture","home","decor","kitchen","bedding","curtains","rug","lamp","cushion",
    "hardware","tools","paint","plumbing",
    // beauty
    "salon","beauty","cosmetics","makeup","skincare","perfume","haircut","spa",
    // generic
    "shop","store","purchase","buy","order","retail","mall","plaza","market","outlet",
    "online","delivery","gift","present",
  ],
  Bills: [
    // utilities
    "electricity","wapda","lesco","kesc","hesco","iesco","gepco","fesco","mepco","pesco",
    "gas","sui gas","sngpl","ssgc","water","kw&sb","water board",
    // telecom
    "internet","wifi","broadband","fiber","ptcl","stormfiber","nayatel","cybernet","transworld",
    "phone","mobile","jazz","zong","telenor","ufone","warid","sim","recharge","top up",
    "airtime","data","bundle","package",
    // digital payments & wallets (bills context)
    "jazzcash","easypaisa","nayapay","sadapay","upaisa","payoneer","transfer","payment",
    // rent & housing
    "rent","lease","mortgage","landlord","property","maintenance fee","society","hoa",
    // insurance & finance
    "insurance","premium","policy","emi","installment","loan","credit card","bank","fee",
    // subscriptions
    "subscription","renewal","annual","monthly","plan","bill","utility","dues","tax",
    "invoice","challan","fee","tuition","school","university","college",
  ],
  Other:         [],
};

const CATEGORY_EMOJI: Record<Category, string> = {
  Food: "🍔", Transport: "🚗", Entertainment: "🎬",
  Shopping: "🛍️", Bills: "📄", Other: "📦",
};

function scoreCategory(cat: Category, text: string): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  const keywords = CATEGORY_KEYWORDS[cat];
  if (!keywords) return 0;
  return keywords.reduce((n, kw) => n + (lower.includes(kw) ? 1 : 0), 0);
}

// ── image → AI receipt parse ───────────────────────────────────────────────────
async function parseReceiptImage(base64: string, apiUrl: string, customCategories: string[] = []) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    const resp = await fetch(`${apiUrl}/api/parse-expense`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "image", content: base64, customCategories }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    return resp.json() as Promise<{
      amount: number | null; date: string; description: string;
      category: Category | null; notes: string; confidence: "high" | "low";
    }>;
  } catch { return null; }
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// ─────────────────────────────────────────────────────────────────────────────
export default function CaptureScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { addExpense, preferences } = useExpenses();
  const penny   = usePenny();

  const params = useLocalSearchParams<{ amount?: string; description?: string; category?: string }>();

  const [description, setDescription]     = useState("");
  const [amount, setAmount]               = useState("");
  const [selectedCat, setSelectedCat]     = useState<Category | null>(null);
  const [userPickedCat, setUserPickedCat] = useState(false);
  const [isLoading, setIsLoading]         = useState(false);
  const [toastMsg, setToastMsg]           = useState<string | null>(null);

  // All categories: built-in + user custom, sorted by relevance
  const allCategories = useMemo(() => {
    const all = [...CATEGORIES, ...preferences.customCategories];
    return all.sort((a, b) => scoreCategory(b, description) - scoreCategory(a, description));
  }, [description, preferences.customCategories]);

  // Pre-fill from URL params (Shortcuts deep link) or voice/camera parse
  useEffect(() => {
    function hydrate() {
      if (params.amount || params.description || params.category) {
        if (params.amount) setAmount(params.amount);
        if (params.description) setDescription(params.description);
        const allCats = [...CATEGORIES, ...preferences.customCategories];
        if (params.category && allCats.includes(params.category)) {
          setSelectedCat(params.category as Category);
          setUserPickedCat(true); // lock — don't let auto-select override explicit param
        } else if (params.description) {
          const best = allCats.sort(
            (a, b) => scoreCategory(b, params.description!) - scoreCategory(a, params.description!)
          )[0];
          if (best && scoreCategory(best, params.description) > 0) setSelectedCat(best);
        }
        return;
      }
      const data = getPendingReview();
      if (!data) return;
      if (data.amount != null) setAmount(String(data.amount));
      if (data.description) setDescription(data.description);
      if (data.category) {
        setSelectedCat(data.category);
        setUserPickedCat(true); // lock — don't let auto-select wipe the AI-parsed category
      }
      if (data.date) setSelectedDate(data.date);
      setPendingReview(null);
    }
    hydrate();
  }, []);

  // Auto-select best matching category as user types
  useEffect(() => {
    if (!description.trim()) {
      // Description cleared — reset so auto-select can fire again
      setUserPickedCat(false);
      setSelectedCat(null);
      return;
    }
    if (userPickedCat) return; // user manually tapped a chip, don't override
    const top = allCategories[0];
    if (top && scoreCategory(top, description) > 0) {
      setSelectedCat(top);
    } else {
      setSelectedCat(null);
    }
  }, [description, allCategories, userPickedCat]);

  const descRef   = useRef<TextInput>(null);
  const amountRef = useRef<TextInput>(null);
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

  // ── text save (direct, no AI) ──────────────────────────────────────────────
  async function handleSave() {
    if (!description.trim()) { descRef.current?.focus(); return; }
    const num = parseFloat(amount.replace(/[^0-9.]/g, ""));
    if (!num || num <= 0) { amountRef.current?.focus(); return; }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();

    const saved = await addExpense({
      amount: num,
      date: selectedDate,
      description: description.trim(),
      category: selectedCat ?? "Other",
      notes: "",
      captureMethod: "text",
      receiptPath: null,
    });
    void penny.onExpenseSaved(saved);

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
    const parsed = await parseReceiptImage(base64, API_URL, preferences.customCategories);
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
      description: parsed?.description ?? "",
      category: parsed?.category ?? null,
      notes: parsed?.notes ?? "",
      receiptPath,
      captureMethod: type === "camera" ? "camera" : "upload_image",
    });
    router.push("/review");
  }


  const canSave = description.trim().length > 0 && parseFloat(amount) > 0;

  // ── styles ─────────────────────────────────────────────────────────────────
  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", zIndex: 10 },
    loadingCard: { backgroundColor: colors.card, borderRadius: 20, padding: 32, alignItems: "center", gap: 16, minWidth: 220 },
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
    chip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.muted },
    chipSelected: { backgroundColor: colors.primary },
    chipEmoji: { fontSize: 14 },
    chipText: { fontSize: 14, fontFamily: "Lato_400Regular", color: colors.foreground },
    chipTextSelected: { color: "#FFFFFF", fontFamily: "Lato_700Bold" },

    // save
    saveRow: { flexDirection: "row", paddingHorizontal: 24, paddingTop: 12, paddingBottom: insets.bottom + 16, backgroundColor: colors.background },
    saveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16 },
    saveBtnDisabled: { backgroundColor: colors.border },
    saveBtnText: { fontSize: 16, fontFamily: "Lato_700Bold", color: "#FFFFFF" },
  });

  return (
    <View style={s.container}>
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
          {/* All categories: built-in + custom, sorted by relevance */}
          {allCategories.map(cat => {
            const sel = selectedCat === cat;
            const cfg = getCategoryConfig(cat);
            return (
              <TouchableOpacity
                key={cat}
                style={[s.chip, sel && { backgroundColor: cfg.bar }]}
                onPress={() => {
                  setSelectedCat(sel ? null : cat);
                  setUserPickedCat(true);
                  void Haptics.selectionAsync();
                }}
              >
                <Text style={s.chipEmoji}>{CATEGORY_EMOJI[cat] ?? "🏷️"}</Text>
                <Text style={[s.chipText, sel && s.chipTextSelected]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
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
      </KeyboardStickyView>

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


    </View>
  );
}
