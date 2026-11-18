import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { API } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { payWithRazorpayCheckout } from '@/components/RazorpayCheckout';
import { C } from '@/constants/theme';

type PaymentOrder = { _id: string; orderNumber: string; status: string; grandTotal: number;
  payment: { method: string; status: string; codCollected?: boolean; onlineAttempt?: string | null; convertedFromCod?: boolean; cashCollectionStarted?: boolean } };
type Result = { state: string; message?: string; key?: string; razorpayOrderId?: string; amountInPaise?: number; currency?: string };

export default function CodOnlinePayment({ order, onRefresh }: { order: PaymentOrder; onRefresh: () => void | Promise<void> }) {
  const { user } = useAuth();
  const guard = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const eligible = order.payment.method === 'cod' && order.payment.status === 'pending' &&
    !order.payment.codCollected && !['delivered', 'cancelled', 'returned'].includes(order.status);
  const request = async (action: string, details = {}): Promise<Result> => {
    const { data } = await API.post(`/payments/cod-online/${action}`, { orderId: order._id, ...details });
    if (!data.success) throw new Error(data.message || 'Could not check payment');
    return data.data;
  };
  const run = async (action: 'start' | 'check' | 'cancel') => {
    if (guard.current) return;
    guard.current = true; setBusy(true); setMessage('');
    let opened = false;
    try {
      let result = await request(action);
      if (result.state === 'checkout') {
        if (!result.key || !result.razorpayOrderId || !result.amountInPaise) throw new Error('Payment screen could not be opened');
        opened = true;
        const response = await payWithRazorpayCheckout({ keyId: result.key, orderId: result.razorpayOrderId,
          amount: result.amountInPaise, currency: result.currency || 'INR', description: `Pay for order ${order.orderNumber}`,
          name: user?.name || '', contact: user?.phone || '' });
        result = await request('verify', { razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature });
      }
      setMessage(result.message || (result.state === 'paid' ? 'Paid online. Do not pay cash at delivery.' : 'Payment checked.'));
    } catch (error: unknown) {
      if (opened) {
        // A dismissed checkout may already have succeeded. Always ask the server first.
        try {
          const result = await request('cancel');
          setMessage(result.message || 'Payment check is pending. Do not pay cash until it is resolved.');
        } catch { setMessage('Payment confirmation is pending. Check payment before trying again or paying cash.'); }
      } else {
        setMessage((error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ||
          (error as Error).message || 'Payment could not be checked. Please try again.');
      }
    } finally {
      try { await onRefresh(); } finally { guard.current = false; setBusy(false); }
    }
  };
  if (order.payment.status === 'paid' && order.payment.convertedFromCod) {
    return <Text style={{ marginTop: 10, color: C.primary, fontWeight: '700' }}>Paid online — do not pay cash at delivery.</Text>;
  }
  if (!eligible) return null;
  if (order.payment.cashCollectionStarted) return <Text style={{ marginTop: 10, color: C.muted }}>Staff has started cash collection. Ask staff to release it before paying online.</Text>;
  return <View style={{ marginTop: 12, gap: 10 }}>
    <Text style={{ color: C.muted }}>{order.payment.onlineAttempt ? 'Online checkout is pending. Check payment before paying cash.' : 'Prefer online payment? Pay for this same order now.'}</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run('start')}
      style={{ backgroundColor: C.primary, borderRadius: 10, padding: 13, opacity: busy ? 0.6 : 1 }}>
      <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>{busy ? 'Checking payment…' : `${order.payment.onlineAttempt ? 'Resume payment' : 'Pay online'} · ₹${order.grandTotal.toLocaleString('en-IN')}`}</Text>
    </Pressable>
    {order.payment.onlineAttempt && <View style={{ flexDirection: 'row', gap: 20 }}>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run('check')}><Text style={{ color: C.primary }}>Check payment</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run('cancel')}><Text style={{ color: C.primary }}>Keep COD</Text></Pressable>
    </View>}
    {!!message && <Text accessibilityLiveRegion="polite" style={{ color: C.ink }}>{message}</Text>}
  </View>;
}
