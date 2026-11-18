import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { API } from '@/utils/api';
import { getDriverToken } from '@/utils/driverSession';
import { showAlert } from '@/context/CustomAlertContext';
import { C } from '@/constants/theme';
type Summary = { amount: number; orderNumber?: string; method: string; status: string; onlinePending: boolean; cashReserved: boolean; message: string };
type Choice = 'cash' | 'online';
export default function DriverPaymentCheck({ orderRef }: { orderRef: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const check = useCallback(async (action = 'check', nextChoice?: Choice) => {
    if (!orderRef.trim() || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const token = await getDriverToken();
      const ref = encodeURIComponent(orderRef.trim().replace(/^#/, ''));
      const { data } = await API.post(`/api/driver/orders/${ref}/payment`, { action }, { headers: { Authorization: `Bearer ${token}` } });
      if (!data.success) throw Error('Could not check payment');
      const result: Summary = data.data;
      setSummary(result);
      setChoice(current => nextChoice || (result.onlinePending ? 'online' : result.cashReserved ? 'cash' : current));
    } catch (failure: unknown) {
      setError((failure as { response?: { data?: { message?: string } } }).response?.data?.message || 'Could not check payment');
    } finally { inFlight.current = false; setBusy(false); }
  }, [orderRef]);
  useEffect(() => {
    const timer = setTimeout(() => { if (orderRef.trim().length >= 3) void check(); }, 300);
    return () => clearTimeout(timer);
  }, [check, orderRef]);
  const chooseOnline = () => {
    if (busy || !summary) return;
    if (summary.cashReserved) showAlert('Switch to online payment?', 'Confirm no cash was collected. This releases cash collection so the customer can pay in the VADI app.', [
      { text: 'Keep cash', style: 'cancel' }, { text: 'No cash collected — switch', onPress: () => void check('release', 'online') },
    ]);
    else setChoice('online');
  };
  const unpaidCod = summary?.method === 'cod' && summary.status === 'pending';
  return <View style={{ marginVertical: 12, padding: 14, backgroundColor: C.soft, borderRadius: 12, gap: 12 }}>
    <Text style={{ color: C.ink, fontWeight: '800' }}>Payment method</Text>
    <Pressable accessibilityRole="button" disabled={busy || !orderRef.trim()} onPress={() => void check()}><Text style={{ color: C.primary }}>{busy ? 'Checking…' : 'Refresh payment'}</Text></Pressable>
    {!summary && <Text style={{ color: C.muted }}>Enter an order number to load payment methods.</Text>}
    {summary && <>
      <Text accessibilityLiveRegion="polite" style={{ color: C.ink }}>{summary.message}</Text>
      {unpaidCod && <>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: choice === 'cash', disabled: busy || summary.onlinePending }} disabled={busy || summary.onlinePending}
          style={{ borderWidth: 1, borderColor: choice === 'cash' ? C.primary : C.line, padding: 12, borderRadius: 10, opacity: summary.onlinePending ? 0.5 : 1 }}
          onPress={() => { if (summary.cashReserved) setChoice('cash'); else void check('prepare', 'cash'); }}>
          <Text style={{ color: C.ink, fontWeight: '700' }}>Cash on delivery · ₹{summary.amount.toLocaleString('en-IN')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: choice === 'online' }} disabled={busy} onPress={chooseOnline}
          style={{ borderWidth: 1, borderColor: choice === 'online' ? C.primary : C.line, padding: 12, borderRadius: 10 }}>
          <Text style={{ color: C.ink, fontWeight: '700' }}>Online payment · UPI / card</Text>
          <Text style={{ color: C.muted, marginTop: 4 }}>Customer pays in the VADI app</Text>
        </Pressable>
        {choice === 'cash' && summary.cashReserved && <Text style={{ color: C.muted }}>Collect cash, then verify the customer code. Choose Online payment to switch before taking cash.</Text>}
        {choice === 'online' && !summary.cashReserved && <View style={{ gap: 10 }}>
          <Text style={{ color: C.ink }}>Ask the customer to open My Orders or Order Tracking for {summary.orderNumber || 'this order'}, tap Pay online, and choose UPI or card. Payment methods open on their phone.</Text>
          <Text style={{ color: C.muted }}>Do not collect cash. Refresh here and confirm delivery only after Paid online appears.</Text>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void check()}><Text style={{ color: C.primary, fontWeight: '700' }}>Check online payment received</Text></Pressable>
        </View>}
      </>}
    </>}
    {!!error && <Text style={{ color: '#C62828' }}>{error}</Text>}
  </View>;
}
