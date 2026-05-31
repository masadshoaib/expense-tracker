import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

import type { Category } from "@/constants/colors";
import { useExpenses } from "@/context/ExpenseContext";
import { setPendingReview } from "@/utils/pendingReview";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function VoiceOverlay({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { preferences, addExpense } = useExpenses();
  const [isListening, setIsListening] = useState(false);
  const [isParsing, setIsParsing]     = useState(false);
  const [transcript, setTranscript]   = useState("");
  const [hint, setHint]               = useState("Tap and hold to record your expense");
  const transcriptRef = useRef("");

  const pulseScale   = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setIsListening(false);
      setIsParsing(false);
      setTranscript("");
      setHint("Tap and hold to record your expense");
      transcriptRef.current = "";
      pulseScale.value   = withTiming(1, { duration: 150 });
      pulseOpacity.value = withTiming(1, { duration: 150 });
    }
  }, [visible]);

  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.3, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1, false
      );
      pulseOpacity.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1, false
      );
    } else {
      pulseScale.value   = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [isListening]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
    setHint("Release to send");
  });
  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
    const text = transcriptRef.current;
    if (text.trim()) {
      void handleParse(text);
    } else {
      setHint("Tap and hold to record your expense");
    }
  });
  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript ?? "";
    setTranscript(text);
    transcriptRef.current = text;
  });
  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);
    setHint("Tap and hold to record your expense");
    if (event.error !== "aborted") setTranscript("Couldn't hear that — try again");
  });

  async function startRecording() {
    const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
    if (!available) {
      Alert.alert("Not Supported", "Speech recognition requires a real iPhone.");
      return;
    }
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      Alert.alert("Microphone Permission", "Microphone access is needed for voice input.");
      return;
    }
    transcriptRef.current = "";
    setTranscript("");
    setHint("Release to send");
    setIsListening(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      ExpoSpeechRecognitionModule.start({ lang: "en-US", interimResults: true, continuous: false });
    } catch (err) {
      setIsListening(false);
      setHint("Tap and hold to record your expense");
      setTranscript(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function stopRecording() {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch { /* ignore if not running */ }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleParse(text: string) {
    setIsParsing(true);
    setHint("Parsing…");
    const _d = new Date();
    const today = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,"0")}-${String(_d.getDate()).padStart(2,"0")}`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45_000);
      const resp = await fetch(`${API_URL}/api/parse-expense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text", content: text, customCategories: preferences.customCategories }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const parsed = resp.ok
        ? await resp.json() as {
            amount: number | null; date: string; description: string;
            category: Category | null; notes: string; confidence: string;
          }
        : null;

      const canSkipReview =
        !preferences.confirmAiInput &&
        parsed?.amount != null &&
        parsed?.category != null;

      if (canSkipReview) {
        await addExpense({
          amount: parsed!.amount!,
          date: parsed!.date ?? today,
          description: parsed!.description || text,
          category: parsed!.category!,
          notes: parsed!.notes ?? "",
          captureMethod: "voice",
          receiptPath: null,
        });
        onClose();
      } else {
        setPendingReview({
          amount: parsed?.amount ?? null,
          date: parsed?.date ?? today,
          description: parsed?.description || text,
          category: parsed?.category ?? null,
          notes: parsed?.notes ?? "",
          receiptPath: null,
          captureMethod: "voice",
        });
        onClose();
        // Small delay so modal finishes closing before navigating
        setTimeout(() => router.push("/capture"), 50);
      }
    } catch {
      setIsParsing(false);
      setHint("Tap and hold to record your expense");
      setTranscript("Could not reach server — is the backend running?");
    }
  }

  const s = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.88)",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: insets.top + 24,
      paddingBottom: insets.bottom + 40,
    },
    closeBtn: {
      alignSelf: "flex-end",
      marginRight: 20,
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.12)",
      alignItems: "center", justifyContent: "center",
    },
    transcriptArea: {
      flex: 1, alignItems: "center", justifyContent: "center",
      paddingHorizontal: 32,
    },
    transcript: {
      fontSize: 26, fontFamily: "Lato_700Bold",
      color: "#FFFFFF", textAlign: "center", lineHeight: 36,
    },
    transcriptMuted: {
      fontSize: 26, fontFamily: "Lato_400Regular",
      color: "rgba(255,255,255,0.35)", textAlign: "center",
    },
    hint: {
      fontSize: 14, fontFamily: "Lato_400Regular",
      color: "rgba(255,255,255,0.5)", marginBottom: 32, letterSpacing: 0.3,
    },
    micOuter: {
      width: 96, height: 96, borderRadius: 48,
      backgroundColor: "rgba(239,68,68,0.2)",
      alignItems: "center", justifyContent: "center",
    },
    micBtn: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: "#EF4444",
      alignItems: "center", justifyContent: "center",
    },
    micBtnIdle: { backgroundColor: "rgba(255,255,255,0.15)" },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={s.transcriptArea}>
          {isParsing ? (
            <>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={[s.transcript, { marginTop: 20, fontSize: 18 }]}>Parsing…</Text>
            </>
          ) : transcript ? (
            <Text style={s.transcript}>{transcript}</Text>
          ) : (
            <Text style={s.transcriptMuted}>Say your expense…</Text>
          )}
        </View>

        <Text style={s.hint}>{hint}</Text>

        <Animated.View style={[s.micOuter, !isListening && { backgroundColor: "transparent" }, pulseStyle]}>
          <TouchableOpacity
            style={[s.micBtn, !isListening && s.micBtnIdle]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            disabled={isParsing}
            activeOpacity={0.85}
          >
            <Ionicons name="mic" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}
