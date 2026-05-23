import {
  Lato_400Regular,
  Lato_700Bold,
  useFonts,
} from "@expo-google-fonts/lato";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ExpenseProvider } from "@/context/ExpenseContext";
import { requestPermissions } from "@/lib/penny/penny-notifications";
import { usePenny } from "@/hooks/usePenny";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const penny = usePenny();
  const pennyRef = useRef(penny);
  pennyRef.current = penny;

  useEffect(() => {
    void requestPermissions();
    void pennyRef.current.onForeground();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void pennyRef.current.onForeground();
    });
    return () => sub.remove();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="capture"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="review"
        options={{ presentation: "card", headerShown: false }}
      />
      <Stack.Screen
        name="expense/[id]"
        options={{ presentation: "card", headerShown: false }}
      />
      <Stack.Screen
        name="category/[name]"
        options={{ presentation: "card", headerShown: false }}
      />
      <Stack.Screen
        name="settings"
        options={{ presentation: "card", headerShown: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Lato_400Regular,
    Lato_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <ExpenseProvider>
                <RootLayoutNav />
              </ExpenseProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
