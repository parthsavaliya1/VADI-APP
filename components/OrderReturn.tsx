import { type ReturnProgressRequest } from "@/utils/returnProgress";
import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { showAlert } from '@/context/CustomAlertContext';
import { isWithinReturnWindow } from '@/utils/orderActionPresentation';
import { API } from '@/utils/api';
import { C } from '@/constants/theme';

export type ReturnItem = { variantId: string; productName: string; quantity: number };
export type ReturnRequest = ReturnProgressRequest & { status?: string; refundedTo?: string; refundAmount?: number; refundStatus?: string; adminNote?: string };
type Order = { _id: string; status: string; deliveredAt?: string; updatedAt?: string; items: ReturnItem[]; returnRequest?: ReturnRequest };
export default function OrderReturn({ order, onRefresh }: { order: Order; onRefresh: () => void | Promise<void> }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [selected, setSelected] = useState<Record<string, 'refund' | 'replace'>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [packagingConfirmed, setPackagingConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState<ReturnRequest | null>(null);
  const guard = useRef(false);
  if (!['delivered', 'returned'].includes(order.status)) return null;
  const request = order.returnRequest?.status ? order.returnRequest : submitted;
  const eligible = order.status === 'delivered' && isWithinReturnWindow(order.deliveredAt || order.updatedAt);
  const valid = !!user?._id && Object.keys(selected).length > 0 && reason.trim().length >= 5 && packagingConfirmed;
  const submit = async () => {
    if (!valid || !eligible || guard.current || request?.status) return;
    guard.current = true; setBusy(true);
    try {
      const items = order.items.filter(item => selected[item.variantId]).map(item => ({
        variantId: item.variantId, action: selected[item.variantId], quantity: quantities[item.variantId] || item.quantity,
      }));
      const { data } = await API.post(`/orders/${order._id}/return`, {
        reason: reason.trim(), packagingConfirmed: true, items,
      });
      if (!data.success) throw Error(data.message || 'Return request could not be confirmed');
      const updated = data.data?.order || data.data;
      setSubmitted(updated?.returnRequest || { status: 'pending' });
      setOpen(false);
      await Promise.resolve(onRefresh()).catch(() => undefined);
      showAlert('Return requested', 'Your request was sent for admin review. Any approved refund will appear on this order and in Wallet History.');
    } catch (failure: unknown) {
      await Promise.resolve(onRefresh()).catch(() => undefined);
      showAlert('Return request', (failure as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Could not confirm the request. Refresh this order before trying again.');
    } finally { guard.current = false; setBusy(false); }
  };
  const button = { borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12 };
  return <View style={{ gap: 12 }}>
    <Text style={{ color: C.ink, fontSize: 16, fontWeight: '800' }}>Return order</Text>
    {request?.status ? <>
      <Text accessibilityLiveRegion="polite" style={{ color: C.ink }}>Request {request.status}{request.status === 'pending' ? ' · Awaiting admin review' : ''}</Text>
      {request.status === 'processing' && <Text style={{ color: C.muted }}>{request.refundStatus === 'failed' ? 'Refund needs support attention.' : 'Refund confirmation is pending.'}</Text>}
      {request.refundedTo && request.refundedTo !== 'none' && <Text style={{ color: C.ink }}>₹{request.refundAmount || 0} refunded to {request.refundedTo === 'wallet' ? 'your VADI wallet' : 'the original payment method'}. See Wallet History for details.</Text>}
      {!!request.adminNote && <Text style={{ color: C.muted }}>Admin note: {request.adminNote}</Text>}
    </> : !eligible ? <Text style={{ color: C.muted }}>The 24-hour return window has ended. Contact support if you need help.</Text>
      : !order.items.length ? <>
        <Text style={{ color: C.muted }}>Refresh the order to load the items for your return.</Text>
        <Pressable accessibilityRole="button" onPress={() => void onRefresh()}><Text style={{ color: C.primary }}>Refresh order</Text></Pressable>
      </> : <>
        <Text style={{ color: C.muted }}>Request within 24 hours of delivery. Original packaging must be unopened with all seals intact.</Text>
        {!open ? <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={{ ...button, backgroundColor: C.primary }}><Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>Request return</Text></Pressable> : <>
          {order.items.map(item => {
            const action = selected[item.variantId], quantity = quantities[item.variantId] || item.quantity;
            const choose = (value: 'refund' | 'replace') => setSelected(current => {
              const next = { ...current }; if (next[item.variantId] === value) delete next[item.variantId]; else next[item.variantId] = value; return next;
            });
            return <View key={item.variantId} style={{ gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: C.line }}>
              <Text style={{ color: C.ink, fontWeight: '700' }}>{item.productName} · Ordered: {item.quantity}</Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {(['refund', 'replace'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: action === value }} disabled={busy}
                  onPress={() => choose(value)} style={{ ...button, borderColor: action === value ? C.primary : C.line }}>
                  <Text style={{ color: action === value ? C.primary : C.ink }}>{value === 'refund' ? 'Refund' : 'Replace'}{action === value ? ' selected' : ''}</Text>
                </Pressable>)}
              </View>
              {!!action && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                <Pressable accessibilityRole="button" accessibilityLabel={'Reduce return quantity for ' + item.productName} disabled={busy || quantity <= 1} onPress={() => setQuantities(current => ({ ...current, [item.variantId]: quantity - 1 }))}><Text style={{ color: C.primary, fontSize: 24 }}>−</Text></Pressable>
                <Text style={{ color: C.ink }}>Return quantity: {quantity}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={'Increase return quantity for ' + item.productName} disabled={busy || quantity >= item.quantity} onPress={() => setQuantities(current => ({ ...current, [item.variantId]: quantity + 1 }))}><Text style={{ color: C.primary, fontSize: 24 }}>+</Text></Pressable>
              </View>}
            </View>;
          })}
          <Text style={{ color: C.muted }}>Select Refund or Replace for each item. Approved online refunds return to the original payment method; wallet payments and collected COD return to VADI wallet. Delivery charges are not refundable.</Text>
          <TextInput accessibilityLabel="Return reason" multiline maxLength={1000} value={reason} onChangeText={setReason} editable={!busy}
            placeholder="Describe the issue (at least 5 characters)" placeholderTextColor={C.muted} style={{ ...button, color: C.ink, minHeight: 80 }} />
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: packagingConfirmed }} disabled={busy} onPress={() => setPackagingConfirmed(value => !value)} style={{ paddingVertical: 10 }}>
            <Text style={{ color: C.ink }}>{packagingConfirmed ? '☑' : '☐'} I confirm the packaging is unopened and all seals are intact.</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy || !valid} onPress={() => void submit()} style={{ ...button, backgroundColor: C.primary, opacity: busy || !valid ? 0.5 : 1 }}>
            <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>{busy ? 'Sending…' : 'Submit return request'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => setOpen(false)}><Text style={{ color: C.primary, textAlign: 'center', paddingVertical: 8 }}>Close return form</Text></Pressable>
        </>}
      </>}
  </View>;
}
