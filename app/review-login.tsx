import { AnimatedLoader } from "@/components/AnimatedLoader";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/context/AuthContext";
import { API } from "@/utils/api";
import { C } from "@/constants/theme";

export default function ReviewLogin() {
  const { acceptSession } = useAuth();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signIn() {
    if (busy || !accepted || !login.trim() || !password) return;
    setBusy(true); setError("");
    try {
      const { data } = await API.post("/api/auth/review-login", { role: "user", login: login.trim(), password, privacyPolicyAccepted: true });
      if (!data?.token) throw new Error("Review sign-in failed");
      await acceptSession(data.user, data.token);
      router.replace("/(tabs)");
    } catch (e: any) { setError(e?.response?.data?.error || e?.message || "Could not sign in"); }
    finally { setBusy(false); }
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: C.page }}>
    <AppHeader title="Test account sign-in" showBack showCart={false} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 18 }}>
      <Text style={{ color: C.ink, fontSize: 18, fontWeight: "700" }}>Use your assigned test credentials</Text>
      <Text style={{ color: C.muted }}>This account does not require SMS. Checkout, payments and orders use a demo sandbox. No real charge, sale or delivery is created.</Text>
      <TextInput value={login} onChangeText={setLogin} editable={!busy} autoCapitalize="none" autoCorrect={false} placeholder="Account username" accessibilityLabel="Account username" style={{ padding: 14, borderWidth: 1, borderColor: C.line, borderRadius: 8, color: C.ink }} />
      <TextInput value={password} onChangeText={setPassword} editable={!busy} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Password" accessibilityLabel="Password" style={{ padding: 14, borderWidth: 1, borderColor: C.line, borderRadius: 8, color: C.ink }} />
      <Pressable onPress={() => setAccepted(!accepted)} disabled={busy} accessibilityRole="checkbox" accessibilityState={{ checked: accepted }}><Text style={{ color: C.ink }}>{accepted ? "☑" : "☐"} I have read and accept the privacy policy.</Text></Pressable>
      <Pressable onPress={() => router.push("/privacy-policy")}><Text style={{ color: C.primary }}>Read privacy policy</Text></Pressable>
      {!!error && <Text accessibilityRole="alert" style={{ color: "#b91c1c" }}>{error}</Text>}
      <Pressable disabled={busy || !accepted || !login.trim() || !password} onPress={() => void signIn()} style={{ padding: 16, borderRadius: 10, backgroundColor: C.primary, opacity: !accepted || busy ? 0.5 : 1 }}>{busy ? <AnimatedLoader color="#fff" /> : <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>Sign in without OTP</Text>}</Pressable>
    </ScrollView>
  </SafeAreaView>;
}
