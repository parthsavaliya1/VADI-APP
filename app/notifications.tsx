import { AnimatedLoader } from "@/components/AnimatedLoader";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Image, Modal, RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/context/AuthContext";
import { showAlert } from "@/context/CustomAlertContext";
import { API } from "@/utils/api";
import { C, themed } from "@/constants/theme";
import { notificationAppearance, notificationDay, notificationTime } from "@/utils/notificationPresentation";

type Notice = { _id: string; title: string; body: string; imageUrl?: string; createdAt: string; read: boolean };

export default function NotificationsScreen() {
  const { user, isLoggedIn } = useAuth();
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const busy = markingAll || deleting || refreshing;
  const mutationBusy = useRef(false);
  const [error, setError] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const pending = useRef(new Set<string>());
  const request = useRef(0);
  const unreadCount = items.filter((item) => !item.read).length;

  const load = useCallback(async () => {
    const version = ++request.current;
    if (!user?._id) {
      setItems([]); setLoading(false); setRefreshing(false); return;
    }
    try {
      const { data } = await API.get("/notifications", { params: { userId: user._id, limit: 100 } });
      if (!data?.success || !Array.isArray(data.data)) throw new Error("Invalid notification response");
      if (version === request.current) { setItems(data.data); setError(""); }
    } catch {
      if (version === request.current) setError("Couldn't load notifications. Pull down to try again.");
    } finally {
      if (version === request.current) { setLoading(false); setRefreshing(false); }
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    setItems([]); setLoading(true); setError(""); void load();
    return () => { request.current += 1; };
  }, [load]));

  const markRead = async (id: string) => {
    if (!user?._id || pending.current.has(id) || busy || mutationBusy.current) return;
    pending.current.add(id);
    try {
      const { data } = await API.post(`/notifications/${id}/read`, { userId: user._id });
      if (!data?.success) throw new Error("Read update failed");
      setItems((prev) => prev.map((item) => item._id === id ? { ...item, read: true } : item));
    } catch {
      showAlert("Couldn't mark as read", "Please try again.");
    } finally { pending.current.delete(id); }
  };

  const markAllRead = async () => {
    if (!user?._id || busy || mutationBusy.current || pending.current.size > 0) return;
    const unread = items.filter((item) => !item.read);
    if (!unread.length) return;
    mutationBusy.current = true;
    setMarkingAll(true);
    // Bound concurrent requests; use the existing per-notification read endpoint.
    let failures = 0;
    try {
      for (let start = 0; start < unread.length; start += 5) {
        const batch = unread.slice(start, start + 5);
        const results = await Promise.allSettled(batch.map(async (item) => {
          const { data } = await API.post(`/notifications/${item._id}/read`, { userId: user._id });
          if (!data?.success) throw new Error("Read update failed");
          return item._id;
        }));
        const saved = new Set<string>();
        results.forEach((result) => {
          if (result.status === "fulfilled") saved.add(result.value);
          else failures += 1;
        });
        setItems((prev) => prev.map((item) => saved.has(item._id) ? { ...item, read: true } : item));
      }
      if (failures) showAlert("Some notifications are still unread", "Couldn't update every notification. Tap Mark all as read to retry.");
    } finally { setMarkingAll(false); mutationBusy.current = false; }
  };

  const exitSelection = () => { if (!deleting) { setSelectMode(false); setSelectedIds([]); } };
  const toggleSelected = (id: string) => {
    if (busy || mutationBusy.current) return;
    setSelectMode(true);
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]);
  };
  const deleteByIds = async (ids: string[]) => {
    if (!user?._id || !ids.length || busy || mutationBusy.current || pending.current.size) return;
    mutationBusy.current = true; setDeleting(true);
    try {
      const { data } = await API.post("/notifications/delete-bulk", { userId: user._id, ids });
      if (!data?.success || !Array.isArray(data.deletedIds)) throw new Error("Delete failed");
      const removed = new Set<string>(data.deletedIds);
      setItems((prev) => prev.filter((item) => !removed.has(item._id)));
      setSelectedIds([]); setSelectMode(false);
      if (removed.size !== ids.length) showAlert("Some notifications couldn't be deleted", "Refresh and try again.");
    } catch { showAlert("Couldn't delete notifications", "Please try again. Your notifications have been kept."); }
    finally { setDeleting(false); mutationBusy.current = false; }
  };
  const confirmDelete = (ids: string[]) => {
    if (!ids.length || busy || mutationBusy.current) return;
    showAlert("Delete notifications?", "Remove " + ids.length + " notification(s) from your inbox?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void deleteByIds(ids) },
    ]);
  };
  const openDeleteMenu = () => {
    if (!items.length || busy || mutationBusy.current) return;
    showAlert("Delete notifications", "Long press a notification to select it, or choose an option below.", [
      { text: "Select to delete", onPress: () => setSelectMode(true) },
      { text: "Delete all", style: "destructive", onPress: () => confirmDelete(items.map((item) => item._id)) },
      { text: "Cancel", style: "cancel" },
    ]);
  };
  const visible = items;
  const groups = new Map<string, Notice[]>();
  for (const item of visible) {
    const day = notificationDay(item.createdAt);
    groups.set(day, [...(groups.get(day) || []), item]);
  }
  const sections = [...groups].map(([title, data]) => ({ title, data }));

  if (!isLoggedIn || !user) return (
    <SafeAreaView style={s.safe}>
      <AppHeader title="Notifications" showBack />
      <View style={s.empty}>
        <View style={s.emptyIcon}><Ionicons name="notifications-outline" size={32} color={C.primary} /></View>
        <Text style={s.emptyTitle}>Your updates, in one place</Text>
        <Text style={s.emptyBody}>Sign in to see your order updates and messages from VADI.</Text>
        <TouchableOpacity style={s.primaryButton} onPress={() => router.push("/login")}><Text style={s.primaryText}>Log in</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <AppHeader title="Notifications" subtitle={selectMode ? selectedIds.length + " selected" : undefined} showBack right={
        <View style={s.headerActions}>
          {!selectMode && <TouchableOpacity style={[s.headerAction, (busy || loading || !unreadCount) && s.disabled]} onPress={markAllRead} disabled={busy || loading || !unreadCount} accessibilityRole="button" accessibilityLabel="Mark all notifications as read">
            {markingAll ? <AnimatedLoader size="small" color={C.primary} /> : <Ionicons name="checkmark-done-outline" size={22} color={C.primary} />}
          </TouchableOpacity>}
          <TouchableOpacity style={[s.headerAction, (busy || loading || !items.length) && s.disabled]} onPress={selectMode ? exitSelection : openDeleteMenu} disabled={busy || loading || !items.length} accessibilityRole="button" accessibilityLabel={selectMode ? "Cancel selection" : "Delete notifications"}>
            <Ionicons name={selectMode ? "close" : "trash-outline"} size={21} color={selectMode ? C.ink : "#B33F40"} />
          </TouchableOpacity>
        </View>
      } />
      {!!error && <View style={s.errorBanner}><Text style={s.errorText} accessibilityRole="alert">{error}</Text><TouchableOpacity onPress={() => { setRefreshing(true); void load(); }} disabled={busy} style={s.retry}><Text style={s.readAllText}>Retry</Text></TouchableOpacity></View>}
      {loading ? <View style={s.loader}><AnimatedLoader size="large" color={C.primary} /></View> : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[s.list, !visible.length && s.emptyList]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { if (busy || mutationBusy.current || pending.current.size) return; setRefreshing(true); void load(); }} colors={[C.primary]} tintColor={C.primary} />}
          renderSectionHeader={({ section }) => <Text style={s.sectionTitle}>{section.title}</Text>}
          ListEmptyComponent={<View style={s.empty}>
            <View style={s.emptyIcon}><Ionicons name="notifications-outline" size={32} color={C.primary} /></View>
            <Text style={s.emptyTitle}>{error ? "Updates couldn't load" : "No notifications yet"}</Text>
            <Text style={s.emptyBody}>{error ? "Try again to see your latest notifications." : "Your order updates and new messages will appear here."}</Text>
          </View>}
          renderItem={({ item }) => {
            const appearance = notificationAppearance(item.title);
            const isGeneralUpdate = appearance.label === "VADI update";
            return <TouchableOpacity style={[s.card, !item.read && s.unreadCard, selectedIds.includes(item._id) && s.selectedCard]} activeOpacity={item.read ? 1 : 0.75} onPress={() => { if (selectMode) toggleSelected(item._id); else if (!item.read) void markRead(item._id); }} onLongPress={() => toggleSelected(item._id)} delayLongPress={350} accessibilityRole="button" accessibilityLabel={`${item.read ? "Read" : "Unread"}: ${item.title}. ${item.body}`} accessibilityState={{ selected: selectedIds.includes(item._id) }} accessibilityHint={selectMode ? "Select for deletion" : "Tap to mark as read. Long press to select for deletion"}>
              {item.imageUrl && !selectMode ? <TouchableOpacity style={s.thumbnailWrap} accessibilityRole="button" accessibilityLabel="View notification image" onPress={(event) => { event.stopPropagation(); setPreviewImage(item.imageUrl!); if (!item.read) void markRead(item._id); }} onLongPress={() => toggleSelected(item._id)} delayLongPress={350}>
                <Image source={{ uri: item.imageUrl }} style={s.thumbnail} resizeMode="contain" />
              </TouchableOpacity> : <View style={[s.icon, { backgroundColor: isGeneralUpdate ? C.page : appearance.background }]}><Ionicons name={selectMode ? (selectedIds.includes(item._id) ? "checkmark-circle" : "ellipse-outline") : isGeneralUpdate ? "notifications-outline" : appearance.icon} size={19} color={selectMode ? C.primary : isGeneralUpdate ? C.muted : appearance.color} /></View>}
              <View style={s.cardContent}>
                <View style={s.cardTop}>
                  <Text style={[s.cardTitle, s.titleInRow, !item.read && s.unreadTitle]}>{item.title}</Text>
                  <View style={s.timeGroup}><Text style={s.time}>{notificationTime(item.createdAt)}</Text>{!item.read && <View style={s.dot} />}</View>
                </View>
                <Text style={s.body}>{item.body}</Text>
              </View>
            </TouchableOpacity>;
          }}
        />
      )}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <SafeAreaView style={s.previewBackdrop}>
          <TouchableOpacity style={s.previewClose} onPress={() => setPreviewImage(null)} accessibilityRole="button" accessibilityLabel="Close image preview"><Ionicons name="close" size={26} color="#FFFFFF" /></TouchableOpacity>
          {!!previewImage && <Image source={{ uri: previewImage }} resizeMode="contain" style={s.previewImage} />}
        </SafeAreaView>
      </Modal>
      {selectMode && items.length > 0 && <View style={s.selectionBar}>
        <TouchableOpacity style={s.selectAll} disabled={busy} onPress={() => setSelectedIds(selectedIds.length === items.length ? [] : items.map((item) => item._id))} accessibilityRole="button">
          <Ionicons name={selectedIds.length === items.length ? "checkmark-circle" : "ellipse-outline"} size={22} color={C.primary} />
          <Text style={s.readAllText}>{selectedIds.length === items.length ? "Deselect all" : "Select all"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.deleteButton, (!selectedIds.length || busy) && s.disabled]} disabled={!selectedIds.length || busy} onPress={() => confirmDelete(selectedIds)} accessibilityRole="button">
          {deleting ? <AnimatedLoader color="#FFFFFF" size="small" /> : <Ionicons name="trash-outline" size={18} color="#FFFFFF" />}
          <Text style={s.deleteText}>{deleting ? "Deleting…" : "Delete (" + selectedIds.length + ")"}</Text>
        </TouchableOpacity>
      </View>}
    </SafeAreaView>
  );
}

const s = themed(() => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  headerAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  selectedCard: { borderColor: C.primary, backgroundColor: C.soft },
  selectionBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.card },
  selectAll: { flexDirection: "row", gap: 8, alignItems: "center", minHeight: 44 },
  deleteButton: { flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 16, minHeight: 44, backgroundColor: "#B33F40", borderRadius: 10 },
  deleteText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  readAllText: { color: C.primary, fontSize: 12, fontWeight: "700" },
  disabled: { opacity: 0.4 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionTitle: { color: C.muted, fontSize: 11, fontWeight: "600", marginTop: 12, marginBottom: 7, paddingLeft: 2 },
  card: { flexDirection: "row", alignItems: "flex-start", backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, borderRadius: 10, marginBottom: 6, gap: 10 },
  unreadCard: { borderLeftWidth: 3, borderLeftColor: C.primary },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1, minWidth: 0 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 2 },
  titleInRow: { flex: 1, minWidth: 0 },
  timeGroup: { flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 0, paddingTop: 3 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary },
  cardTitle: { fontSize: 14, fontWeight: "600", lineHeight: 20, color: C.ink },
  unreadTitle: { fontWeight: "700" },
  body: { marginTop: 2, fontSize: 13, lineHeight: 18, color: C.muted },
  time: { fontSize: 10, color: C.muted, textAlign: "right" },
  thumbnailWrap: { width: 44, height: 52, borderRadius: 7, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, backgroundColor: C.page },
  thumbnail: { width: "100%", height: "100%" },
  previewBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.94)" },
  previewClose: { minHeight: 48, width: 48, alignSelf: "flex-end", alignItems: "center", justifyContent: "center", marginHorizontal: 12 },
  previewImage: { flex: 1, width: "100%", marginBottom: 20 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyList: { flexGrow: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingVertical: 48 },
  emptyIcon: { width: 76, height: 76, borderRadius: 26, backgroundColor: C.soft, alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginTop: 18, fontSize: 18, fontWeight: "800", color: C.ink, textAlign: "center" },
  emptyBody: { marginTop: 8, fontSize: 13, lineHeight: 20, color: C.muted, textAlign: "center" },
  primaryButton: { marginTop: 24, backgroundColor: C.primary, paddingHorizontal: 30, paddingVertical: 14, borderRadius: 12 },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  errorBanner: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  errorText: { color: C.muted, fontSize: 12, lineHeight: 18, flex: 1 },
  retry: { minHeight: 44, paddingHorizontal: 8, justifyContent: "center" },
}));
