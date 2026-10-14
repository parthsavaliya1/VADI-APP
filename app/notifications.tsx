import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/context/AuthContext";
import { API } from "@/utils/api";
import { C, themed } from "@/constants/theme";

type InAppNotification = {
  _id: string;
  title: string;
  body: string;
  imageUrl?: string;
  createdAt: string;
  read: boolean;
};

export default function NotificationsScreen() {
  const { user, isLoggedIn } = useAuth();
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?._id) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const { data } = await API.get("/notifications", {
        params: { userId: user._id, limit: 100 },
      });
      setItems(data.data || []);
      setUnreadCount(Number(data.unreadCount) || 0);
    } catch (e) {
      console.warn("Notifications load failed", e);
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?._id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const markRead = async (id: string) => {
    if (!user?._id) return;
    try {
      await API.post(`/notifications/${id}/read`, { userId: user._id });
      setItems((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.warn("Mark read failed", e);
    }
  };

  if (!isLoggedIn || !user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <AppHeader title="Notifications" showBack showCart={false} />
        <View style={styles.centerBox}>
          <Ionicons name="notifications-off-outline" size={56} color={C.muted} />
          <Text style={styles.emptyTitle}>Sign in to see notifications</Text>
          <Text style={styles.emptySub}>
            Messages from Vadi will appear here after you log in.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push("/login")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Log in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AppHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : undefined}
        showBack
        showCart={false}
      />

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={
            items.length === 0 ? styles.emptyList : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[C.primary]}
              tintColor={C.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Ionicons name="mail-open-outline" size={52} color={C.muted} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>
                When we share offers or updates, they will show up here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.read && styles.cardUnread]}
              activeOpacity={0.75}
              onPress={() => {
                if (!item.read) void markRead(item._id);
              }}
            >
              <View style={styles.cardRow}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <Ionicons name="megaphone-outline" size={22} color={C.primary} />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {!item.read && <View style={styles.unreadPill} />}
                  </View>
                  <Text style={styles.cardBody} numberOfLines={4}>
                    {item.body}
                  </Text>
                  <Text style={styles.cardDate}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = themed(() => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
    backgroundColor: C.card,
  },
  backBtn: { padding: 8 },
  title: { fontSize: 20, fontWeight: "700", color: C.ink },
  subCount: { fontSize: 12, color: C.muted, marginTop: 2 },
  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, paddingBottom: 32 },
  emptyList: { flexGrow: 1 },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },
  emptySub: {
    marginTop: 8,
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: C.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.line,
  },
  cardUnread: {
    borderColor: "#BBF7D0",
    backgroundColor: "#FFF7ED",
  },
  cardRow: { flexDirection: "row", alignItems: "flex-start" },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: C.line,
    marginRight: 12,
  },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: C.ink, marginRight: 8 },
  unreadPill: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
  cardBody: { marginTop: 6, fontSize: 14, color: C.muted, lineHeight: 20 },
  cardDate: { marginTop: 8, fontSize: 12, color: C.muted },
}));
