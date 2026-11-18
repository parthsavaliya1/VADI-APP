import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { API } from '@/utils/api';
import { C } from '@/constants/theme';
import { showAlert } from '@/context/CustomAlertContext';
import { cancellationMessage, canCancelOrder, type Cancellation } from '@/utils/orderActionPresentation';
type Order = { _id: string; status: string; cancellation?: Cancellation; payment?: { status?: string; method?: string } };
export default function OrderCancellation({ order, onRefresh }: { order: Order; onRefresh: () => void | Promise<void> }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const run = async (check = false) => {
    if (guard.current) return;
    guard.current = true; setBusy(true);
    try {
      const { data } = await API.post(`/orders/${order._id}/cancel${check ? '/refund/check' : ''}`, check ? {} : { reason: reason.trim() });
      if (!data.success) throw Error(data.message || 'Could not update cancellation');
      await onRefresh(); setReason('');
      showAlert('Cancellation', data.message || cancellationMessage(data.data?.cancellation) || 'Order cancelled.');
    } catch (failure: unknown) {
      await Promise.resolve(onRefresh()).catch(() => undefined);
      showAlert('Cancellation', (failure as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ||
        'Could not confirm cancellation. Refresh the order before trying again.');
    } finally { guard.current = false; setBusy(false); }
  };
  if (order.status === 'cancelled') return <View style={{ gap: 8, paddingVertical: 12 }}>
    <Text style={{ color: C.ink }}>{cancellationMessage(order.cancellation) || 'Order cancelled.'}</Text>
    {!!order.cancellation?.refundOperation?.gatewayRefundId && <Text selectable style={{ color: C.muted }}>Refund reference: {order.cancellation.refundOperation.gatewayRefundId}</Text>}
    {order.cancellation?.state === 'processing' && <Pressable disabled={busy} accessibilityRole="button" onPress={() => void run(true)}><Text style={{ color: C.primary, fontWeight: '700' }}>{busy ? 'Checking…' : 'Check refund status'}</Text></Pressable>}
  </View>;
  if (!canCancelOrder(order.status)) return null;
  return <View style={{ gap: 10, paddingVertical: 12 }}>
    <Text style={{ color: C.ink, fontWeight: '800' }}>Cancel order</Text>
    <Text style={{ color: C.muted }}>Cancel before the order goes out for delivery. Paid cancellations receive a full refund including delivery charges: online payments return to the original method; wallet payments return to VADI wallet.</Text>
    <TextInput accessibilityLabel="Cancellation reason" placeholder="Why do you want to cancel? (at least 5 characters)" placeholderTextColor={C.muted}
      value={reason} onChangeText={setReason} maxLength={500} multiline editable={!busy}
      style={{ borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, color: C.ink }} />
    <Pressable accessibilityRole="button" disabled={busy || reason.trim().length < 5} onPress={() => showAlert('Cancel this order?', 'The order will be stopped and eligible payment refunded. The order and refund will remain in History.', [
      { text: 'Keep order', style: 'cancel' }, { text: 'Cancel order', onPress: () => void run() },
    ])} style={{ padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#B42318', opacity: busy || reason.trim().length < 5 ? 0.5 : 1 }}>
      <Text style={{ color: '#B42318', fontWeight: '700', textAlign: 'center' }}>{busy ? 'Cancelling…' : 'Cancel order'}</Text>
    </Pressable>
  </View>;
}
