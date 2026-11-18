import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API } from '@/utils/api';
import { C, themed } from '@/constants/theme';

type Tracking = {
  stage: string; label: string; confirmationCode?: string;
  pickupDriver?: { name?: string; phone?: string };
  deliveryDriver?: { name?: string; phone?: string };
  replacement?: { reference: string; items: { productName: string; quantity: number }[] };
  history?: { stage: string; label?: string; at: string }[];
};
const eventTime = (value: string) => new Date(value).toLocaleString('en-IN', {
  day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
});

export default function ReturnTracking({ orderId, onRefresh }: { orderId: string; onRefresh?: () => void | Promise<void> }) {
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const load = useCallback(async () => {
    try {
      const { data } = await API.get(`/after-sales/${orderId}`);
      if (!data.success) throw Error();
      setTracking(data.data); setError('');
    } catch { setError('Could not refresh tracking. Please retry.'); }
  }, [orderId]);
  useEffect(() => {
    void load();

  }, [load]);

  const pickup = tracking?.stage === 'pickup_assigned';
  const staff = ['out_for_delivery', 'completed'].includes(tracking?.stage || '') && tracking?.deliveryDriver?.name
    ? tracking.deliveryDriver : tracking?.pickupDriver;
  const deliveryStaff = staff === tracking?.deliveryDriver && !!staff;
  const history = tracking?.history || [];
  const lastEvent = history[history.length - 1];

  return <View style={styles.card}>
    <View style={styles.header}>
      <View style={styles.heading}>
        <Ionicons name="swap-horizontal-outline" size={18} color={C.primary} />
        <Text style={styles.eyebrow}>Return tracking</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Refresh return tracking" hitSlop={6} onPress={() => { void load(); void onRefresh?.(); }} style={({ pressed }) => [styles.refresh, pressed && { opacity: 0.55 }]}>
        <Ionicons name="refresh-outline" size={19} color={C.primary} />
      </Pressable>
    </View>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {tracking ? <>
      <View style={styles.statusRow}>
        <View style={styles.statusDot} />
        <Text accessibilityLiveRegion="polite" style={styles.status}>{tracking.label}</Text>
      </View>

      {!!staff?.name && <View style={styles.staffRow}>
        <View style={styles.staffIcon}><Ionicons name="person-outline" size={18} color={C.primary} /></View>
        <View style={styles.staffInfo}>
          <Text style={styles.caption}>{deliveryStaff ? 'Delivery partner' : 'Pickup partner'}</Text>
          <Text style={styles.staffName}>{staff.name}</Text>
          {!!staff.phone && <Text style={styles.staffPhone}>{staff.phone}</Text>}
        </View>
      </View>}

      {!!tracking.replacement?.reference && <View style={styles.replacement}>
        <View style={styles.replacementHeading}>
          <Ionicons name="cube-outline" size={17} color={C.primary} />
          <Text style={styles.replacementTitle}>Replacement package</Text>
          <Text style={styles.freeBadge}>₹0 due</Text>
        </View>
        <Text style={styles.reference}>{tracking.replacement.reference}</Text>
        {tracking.replacement.items.map((item, i) => <Text key={i} style={styles.item}>{item.productName} · Qty {item.quantity}</Text>)}
      </View>}

      {!!tracking.confirmationCode && <View style={styles.codePanel}>
        <View style={styles.codeHeading}>
          <Ionicons name="shield-checkmark-outline" size={16} color={C.primary} />
          <Text style={styles.codeTitle}>{pickup ? 'Pickup code' : 'Delivery code'}</Text>
        </View>
        <View style={styles.codeDigits} accessible accessibilityLabel={`${pickup ? 'Pickup' : 'Delivery'} code: ${tracking.confirmationCode.split('').join(' ')}`}>
          {tracking.confirmationCode.split('').map((digit, index) => <View key={index} style={styles.digitBox}><Text accessible={false} style={styles.digit} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{digit}</Text></View>)}
        </View>
        <Text style={styles.codeHint}>{pickup ? 'Share this code only after your items are collected.' : 'Share this code only after receiving your replacement. No payment needed.'}</Text>
      </View>}

      {!!lastEvent && <View style={styles.activity}>
        <View style={styles.activityFooter}>
          <Text style={styles.updated}>Updated {eventTime(lastEvent.at)}</Text>
          {history.length > 1 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: historyOpen }} onPress={() => setHistoryOpen(value => !value)} hitSlop={8} style={styles.historyButton}>
            <Text style={styles.historyLabel}>Activity</Text>
            <Ionicons name={historyOpen ? 'chevron-up' : 'chevron-down'} size={13} color={C.primary} />
          </Pressable>}
        </View>
        {historyOpen && history.map((event, index) => <View key={index} style={styles.eventRow}>
          <Ionicons name="checkmark-circle" size={14} color={C.primary} />
          <View style={styles.eventInfo}><Text style={styles.eventLabel}>{event.label || event.stage.replace(/_/g, ' ')}</Text><Text style={styles.updated}>{eventTime(event.at)}</Text></View>
        </View>)}
      </View>}
    </> : !error && <Text style={styles.updated}>Loading return status…</Text>}
  </View>;
}

const styles = themed(() => StyleSheet.create({
  card: { marginTop: 12, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heading: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrow: { fontSize: 12, fontWeight: '700', color: C.muted, flexShrink: 1 },
  refresh: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary },
  status: { flex: 1, minWidth: 0, fontSize: 18, lineHeight: 25, fontWeight: '800', color: C.ink },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  staffIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  staffInfo: { flex: 1, minWidth: 0, gap: 2 },
  caption: { fontSize: 10, fontWeight: '600', color: C.muted },
  staffName: { fontSize: 14, fontWeight: '700', color: C.ink },
  staffPhone: { fontSize: 12, color: C.muted },
  replacement: { marginTop: 12, marginBottom: 12, gap: 5 },
  replacementHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replacementTitle: { flex: 1, fontSize: 12, fontWeight: '700', color: C.ink },
  freeBadge: { fontSize: 10, fontWeight: '700', color: C.primary, backgroundColor: C.soft, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  reference: { fontSize: 10, color: C.muted },
  item: { fontSize: 12, color: C.ink, lineHeight: 18 },
  codePanel: { marginTop: 4, backgroundColor: C.soft, borderRadius: 12, padding: 12 },
  codeHeading: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  codeTitle: { color: C.ink, fontWeight: '700', fontSize: 12, flexShrink: 1 },
  codeDigits: { flexDirection: 'row', gap: 4 },
  digitBox: { flex: 1, minWidth: 0, backgroundColor: C.card, borderRadius: 7, borderWidth: 1, borderColor: C.line, paddingVertical: 8, alignItems: 'center' },
  digit: { width: '100%', textAlign: 'center', fontSize: 23, fontWeight: '800', fontVariant: ['tabular-nums'], color: C.primary },
  codeHint: { marginTop: 10, fontSize: 11, lineHeight: 16, color: C.muted },
  activity: { marginTop: 14, paddingTop: 11, borderTopWidth: 1, borderTopColor: C.line },
  activityFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  updated: { fontSize: 10, lineHeight: 16, color: C.muted },
  historyButton: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 },
  historyLabel: { fontSize: 11, fontWeight: '700', color: C.primary },
  eventRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'flex-start' },
  eventInfo: { flex: 1, gap: 2 },
  eventLabel: { fontSize: 12, color: C.ink },
  error: { fontSize: 12, color: '#B42318', marginVertical: 8 },
}));
