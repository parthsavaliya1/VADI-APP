import { useAuth } from "@/context/AuthContext";
import { showAlert } from "@/context/CustomAlertContext";
import { API } from "@/utils/api";
import { openWalletTopup } from "@/utils/razorpay";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Txn = {
  _id: string;
  amount: number;
  direction: "credit" | "debit";
  reason: string;
  createdAt: string;
  order?: { orderNumber?: string };
};

const PRESETS = [100, 500, 1000, 2000];

export default function WalletScreen() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<Txn[]>([]);
  const [amount, setAmount] = useState("500");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    if (!user?._id) return;
    const [walletRes, historyRes] = await Promise.all([
      API.get("/wallet", { params: { userId: user._id } }),
      API.get("/wallet/history", { params: { userId: user._id } }),
    ]);
    setBalance(Number(walletRes.data?.data?.balance || 0));
    setHistory(historyRes.data?.data || []);
  }, [user?._id]);

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }
    load()
      .catch(() => showAlert("Wallet", "Could not load wallet"))
      .finally(() => setLoading(false));
  }, [user, load]);

  const addMoney = async () => {
    const value = Math.round(Number(amount));
    if (!user?._id || !value || value < 1) {
      showAlert("Amount", "Enter an amount of at least ₹1");
      return;
    }
    setPaying(true);
    await openWalletTopup({
      userId: user._id,
      amount: value,
      customerName: user.name,
      customerPhone: user.phone,
      onSuccess: async (nextBalance) => {
        setBalance(nextBalance);
        setPaying(false);
        await load().catch(() => undefined);
        showAlert("Wallet updated", `₹${value} added. Balance is ₹${nextBalance}.`);
      },
      onFailure: (message) => {
        setPaying(false);
        showAlert("Payment", message || "Wallet top-up was cancelled");
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator color="#C2410C" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListHeaderComponent={
            <View>
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Available balance</Text>
                <Text style={styles.balanceValue}>₹{balance}</Text>
                <Text style={styles.balanceHint}>Use this balance at checkout</Text>
              </View>

              <Text style={styles.section}>Add money</Text>
              <View style={styles.presets}>
                {PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.preset, amount === String(preset) && styles.presetOn]}
                    onPress={() => setAmount(String(preset))}
                  >
                    <Text style={[styles.presetText, amount === String(preset) && styles.presetTextOn]}>
                      ₹{preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={amount}
                onChangeText={setAmount}
                placeholder="Custom amount"
              />
              <TouchableOpacity style={styles.addBtn} onPress={addMoney} disabled={paying}>
                <Text style={styles.addBtnText}>{paying ? "Opening payment…" : `Add ₹${amount || 0}`}</Text>
              </TouchableOpacity>

              <Text style={styles.section}>History</Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.empty}>No wallet activity yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View>
                <Text style={styles.rowTitle}>
                  {item.reason === "topup"
                    ? "Added money"
                    : item.reason === "refund"
                      ? "Refund"
                      : `Order ${item.order?.orderNumber || ""}`.trim()}
                </Text>
                <Text style={styles.rowDate}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
              <Text style={[styles.rowAmount, item.direction === "credit" ? styles.credit : styles.debit]}>
                {item.direction === "credit" ? "+" : "-"}₹{item.amount}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF8F4" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  balanceCard: {
    backgroundColor: "#9A3412",
    borderRadius: 20,
    padding: 22,
    marginBottom: 18,
  },
  balanceLabel: { color: "#F5D0C0", fontSize: 13, fontWeight: "600" },
  balanceValue: { color: "#fff", fontSize: 36, fontWeight: "800", marginTop: 6 },
  balanceHint: { color: "#FFF1E8", marginTop: 6 },
  section: { fontSize: 16, fontWeight: "800", marginBottom: 10, color: "#1A1A1A" },
  presets: { flexDirection: "row", gap: 8, marginBottom: 12 },
  preset: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  presetOn: { backgroundColor: "#FFF1E8", borderColor: "#C2410C" },
  presetText: { fontWeight: "700", color: "#333" },
  presetTextOn: { color: "#9A3412" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  addBtn: {
    backgroundColor: "#C2410C",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 22,
  },
  addBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  empty: { color: "#777", marginTop: 8 },
  row: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowTitle: { fontWeight: "700", color: "#1A1A1A" },
  rowDate: { color: "#888", fontSize: 12, marginTop: 4 },
  rowAmount: { fontWeight: "800", fontSize: 16 },
  credit: { color: "#C2410C" },
  debit: { color: "#C62828" },
});
