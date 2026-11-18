import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, TextInput, View } from 'react-native';
import { API } from '@/utils/api';
import { getDriverToken } from '@/utils/driverSession';
import { C } from '@/constants/theme';
type Task = { _id: string; orderNumber: string; address?: { name?: string; phone?: string; addressLine?: string; address?: string; city?: string; pincode?: string }; items?: { productName: string; quantity: number }[]; fulfillment: { stage: string; label: string; version: number; replacement?: { reference: string; items: { productName: string; quantity: number }[] } } };
export default function DriverReturnTasks() {
  const [tasks, setTasks] = useState<Task[]>([]), [codes, setCodes] = useState<Record<string, string>>({});
  const [error, setError] = useState(''), [busy, setBusy] = useState(''); const guard = useRef(false);
  const headers = async () => { const token = await getDriverToken(); if (!token) throw Error('Staff login required'); return { Authorization: `Bearer ${token}` }; };
  const load = useCallback(async () => {
    if (guard.current) return;
    try { const { data } = await API.get('/after-sales/assigned', { headers: await headers() }); if (!data.success) throw Error(); setTasks(data.data); setError(''); }
    catch { setError('Could not load return tasks. Sign in as staff and refresh.'); }
  }, []);
  useEffect(() => { void load(); const timer = setInterval(() => { if (AppState.currentState === 'active') void load(); }, 10000); return () => clearInterval(timer); }, [load]);
  const confirmTask = async (task: Task) => {
    if (guard.current) return; guard.current = true; setBusy(task._id); setError('');
    try {
      const config = { headers: await headers() };
      const { data } = await API.post(`/after-sales/${task._id}/action`, { action: task.fulfillment.stage === 'pickup_assigned' ? 'collect' : 'deliver', version: task.fulfillment.version, code: codes[task._id] }, config);
      if (!data.success) throw Error(); setCodes(current => ({ ...current, [task._id]: '' }));
      const updated = await API.get('/after-sales/assigned', config); if (updated.data.success) setTasks(updated.data.data);
    } catch (failure: unknown) { setError((failure as { response?: { data?: { message?: string } } }).response?.data?.message || 'Could not verify handover. Refresh before retrying.'); }
    finally { guard.current = false; setBusy(''); }
  };
  return <View style={{ marginTop: 14, padding: 16, borderRadius: 16, backgroundColor: C.card, gap: 12 }}>
    <Text style={{ color: C.ink, fontSize: 18, fontWeight: '800' }}>Return pickups & replacements</Text>
    <Pressable accessibilityRole="button" disabled={!!busy} onPress={() => void load()}><Text style={{ color: C.primary }}>Refresh tasks</Text></Pressable>
    {!!error && <Text accessibilityRole="alert" style={{ color: '#B42318' }}>{error}</Text>}
    {!tasks.length && <Text style={{ color: C.muted }}>No return tasks assigned.</Text>}
    {tasks.map(task => <View key={task._id} style={{ borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, gap: 8 }}>
      <Text style={{ color: C.ink, fontWeight: '800' }}>{task.orderNumber} · {task.fulfillment.label}</Text>
      <Text style={{ color: C.muted }}>{task.address?.name} · {task.address?.phone}</Text><Text style={{ color: C.muted }}>{task.address?.addressLine || task.address?.address} {task.address?.city} {task.address?.pincode}</Text>
      {(task.fulfillment.stage === 'out_for_delivery' ? task.fulfillment.replacement?.items : task.items)?.map((item, i) => <Text key={i} style={{ color: C.ink }}>{item.productName} · Qty {item.quantity}</Text>)}
      {task.fulfillment.stage === 'collected' ? <Text style={{ color: C.ink }}>Bring collected goods to VADI for admin receipt and inspection.</Text> : <>
        <Text style={{ color: C.ink }}>{task.fulfillment.stage === 'pickup_assigned' ? 'Collect the returned goods before asking for the pickup code.' : `Replacement ${task.fulfillment.replacement?.reference || ''} · ₹0 payable. Ask the customer for the delivery code only after handover.`}</Text>
        <TextInput accessibilityLabel={`Code for ${task.orderNumber}`} placeholder="Customer’s 6-digit code" placeholderTextColor={C.muted} keyboardType="number-pad" maxLength={6} editable={!busy} value={codes[task._id] || ''} onChangeText={value => setCodes(current => ({ ...current, [task._id]: value.replace(/\D/g, '').slice(0, 6) }))} style={{ borderWidth: 1, borderColor: C.line, color: C.ink, borderRadius: 10, padding: 12 }} />
        <Pressable accessibilityRole="button" disabled={!!busy || !/^\d{6}$/.test(codes[task._id] || '')} onPress={() => void confirmTask(task)} style={{ padding: 12, borderRadius: 10, backgroundColor: C.primary, opacity: busy || !/^\d{6}$/.test(codes[task._id] || '') ? 0.5 : 1 }}><Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>{busy === task._id ? 'Verifying…' : task.fulfillment.stage === 'pickup_assigned' ? 'Verify pickup & mark collected' : 'Verify replacement delivered'}</Text></Pressable>
      </>}
    </View>)}
  </View>;
}
