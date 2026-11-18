import { AnimatedLoader } from '@/components/AnimatedLoader';
import { useCallback, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { showAlert } from '@/context/CustomAlertContext';
import { API } from '@/utils/api';
import { openWalletTopup } from '@/utils/razorpay';
import { walletHistoryPresentation, type WalletHistoryItem } from '@/utils/walletPresentation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, themed } from '@/constants/theme';

type Source = { sourceTransactionId: string; amount: number; available: number; paymentMethod: string; paymentId: string; createdAt: string };
const PRESETS = [100, 500, 1000, 2000];
export default function WalletScreen() {
  const { user } = useAuth();
  const userId = user?._id;
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<WalletHistoryItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [amount, setAmount] = useState('500');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const mutation = useRef(false);
  const load = useCallback(async () => {
    if (!userId) return;
    const [wallet, ledger, refundable] = await Promise.all([
      API.get('/wallet'), API.get('/wallet/history', { params: { paginate: 'true' } }), API.get('/wallet/refundable-topups'),
    ]);
    setBalance(Number(wallet.data?.data?.balance || 0));
    const page = ledger.data?.data;
    setHistory(Array.isArray(page) ? page : page?.items || []);
    setNextCursor(Array.isArray(page) ? null : page?.nextCursor || null);
    const available: Source[] = refundable.data?.data?.sources || [];
    setSources(available);
    setSourceId(current => available.some(source => source.sourceTransactionId === current) ? current : available[0]?.sourceTransactionId || '');
  }, [userId]);
  useFocusEffect(useCallback(() => {
    if (!userId) { router.replace('/(auth)/login'); return; }
    void load().catch(() => showAlert('Wallet', 'Could not load wallet. Please refresh.')).finally(() => setLoading(false));
  }, [userId, load]));
  const refresh = async () => {
    setRefreshing(true);
    try { await load(); } catch { showAlert('Wallet', 'Could not refresh wallet.'); }
    finally { setRefreshing(false); }
  };
  const addMoney = async () => {
    const value = Number(amount);
    if (!userId || !/^\d+(\.\d{1,2})?$/.test(amount) || value < 1 || value > 100000) { showAlert('Amount', 'Enter ₹1–₹100000 with at most two decimal places.'); return; }
    if (mutation.current) return;
    mutation.current = true; setPaying(true);
    try {
      await openWalletTopup({ userId, amount: value, customerName: user?.name, customerPhone: user?.phone,
        onSuccess: async nextBalance => { setBalance(nextBalance); await load().catch(() => undefined); showAlert('Wallet updated', `₹${value} added to your wallet.`); },
        onFailure: async message => { await load().catch(() => undefined); showAlert('Payment', message || 'Payment was not confirmed. Check its status in History before trying again.'); },
      });
    } finally { mutation.current = false; setPaying(false); }
  };
  const requestRefund = async () => {
    const source = sources.find(item => item.sourceTransactionId === sourceId);
    const value = Number(refundAmount || source?.available || 0);
    if (!userId || !source || value < 1 || value > source.available || !/^\d+(\.\d{1,2})?$/.test(String(refundAmount || value))) { showAlert('Refund amount', 'Enter an amount of at least ₹1 within this top-up’s refundable balance.'); return; }
    if (mutation.current) return;
    mutation.current = true; setBusyId('new-refund');
    const storageKey = `wallet-refund-intent:${userId}`;
    try {
      let intent: { requestId: string; sourceTransactionId: string; amount: number } | null = null;
      try { intent = JSON.parse(await AsyncStorage.getItem(storageKey) || 'null'); } catch { /* Create a new intent if none was saved. */ }
      if (!intent || intent.sourceTransactionId !== sourceId || intent.amount !== value) {
        intent = { requestId: `wr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`, sourceTransactionId: sourceId, amount: value };
        await AsyncStorage.setItem(storageKey, JSON.stringify(intent));
      }
      const { data } = await API.post('/wallet/withdrawals', intent);
      if (!data.success) throw Error(data.message || 'Refund was not confirmed');
      await AsyncStorage.removeItem(storageKey);
      setRefundAmount('');
      await load();
      showAlert('Top-up refund', data.data.message || 'Refund request is recorded in History.');
    } catch (failure: unknown) {
      await load().catch(() => undefined);
      showAlert('Refund status', (failure as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ||
        'The request may be pending. Refresh History or retry the same request; do not submit a different amount until its status is known.');
    } finally { mutation.current = false; setBusyId(''); }
  };
  const check = async (row: WalletHistoryItem) => {
    if (mutation.current) return;
    mutation.current = true; setBusyId(row._id);
    try {
      const endpoint = row.reason === 'withdrawal' ? `/wallet/withdrawals/${row._id}/check` : '/wallet/topup/check';
      const { data } = await API.post(endpoint, row.reason === 'topup' ? { transactionId: row._id } : {});
      await load();
      showAlert('Payment status', data.data?.message || (data.data?.status === 'paid' ? 'Completed. History is updated.' : 'Not yet confirmed. Check again later.'));
    } catch (failure: unknown) { showAlert('Status check', (failure as { response?: { data?: { message?: string } } }).response?.data?.message || 'Could not check payment. No new transaction was started.'); }
    finally { mutation.current = false; setBusyId(''); }
  };
  const more = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data } = await API.get('/wallet/history', { params: { cursor: nextCursor } });
      setHistory(current => [...current, ...(data.data?.items || []).filter((row: WalletHistoryItem) => !current.some(item => item._id === row._id))]);
      setNextCursor(data.data?.nextCursor || null);
    } catch { showAlert('History', 'Could not load more transactions.'); }
    finally { setLoadingMore(false); }
  };
  const source = sources.find(item => item.sourceTransactionId === sourceId);
  const disabled = paying || !!busyId;
  return <SafeAreaView style={styles.safe}>
    <AppHeader title="Wallet" showBack showCart={false} />
    {loading ? <AnimatedLoader fullScreen /> : <FlatList data={history} keyExtractor={item => item._id}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshing={refreshing} onRefresh={() => void refresh()}
      ListHeaderComponent={<View>
        <View style={styles.balanceCard}><Text style={styles.balanceLabel}>Available balance</Text><Text style={styles.balanceValue}>₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text><Text style={styles.balanceHint}>Refund requests reserve money until the provider confirms the result.</Text></View>
        <Text style={styles.section}>Add money</Text>
        <View style={styles.presets}>{PRESETS.map(value => <TouchableOpacity key={value} style={[styles.preset, amount === String(value) && styles.selected]} onPress={() => setAmount(String(value))} disabled={disabled}><Text style={styles.body}>₹{value}</Text></TouchableOpacity>)}</View>
        <TextInput accessibilityLabel="Top-up amount" style={styles.input} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="Custom amount" editable={!disabled} />
        <TouchableOpacity style={[styles.button, disabled && styles.disabled]} onPress={() => void addMoney()} disabled={disabled}><Text style={styles.buttonText}>{paying ? 'Opening payment…' : `Add ₹${amount || 0}`}</Text></TouchableOpacity>
        {!user?.isDemo && <View style={styles.panel}>
          <Text style={styles.section}>Return unused top-up</Text>
          <Text style={styles.help}>Money goes back to the same bank, UPI account or card used to add it. Rewards and cash-order refunds are not top-up deposits.</Text>
          {sources.length ? <>
            {sources.map(item => <TouchableOpacity accessibilityRole="radio" accessibilityState={{ checked: item.sourceTransactionId === sourceId }} key={item.sourceTransactionId} disabled={disabled} onPress={() => { setSourceId(item.sourceTransactionId); setRefundAmount(''); }} style={[styles.source, sourceId === item.sourceTransactionId && styles.selected]}>
              <Text style={styles.body}>₹{item.available.toLocaleString('en-IN')} refundable · {item.paymentMethod.toUpperCase()}</Text>
              <Text style={styles.help}>{new Date(item.createdAt).toLocaleDateString()} · {item.paymentId}</Text>
            </TouchableOpacity>)}
            <TextInput accessibilityLabel="Amount to return to original payment method" style={styles.input} keyboardType="decimal-pad" value={refundAmount} onChangeText={setRefundAmount} placeholder={`Amount (up to ₹${source?.available || 0})`} editable={!disabled} />
            <TouchableOpacity disabled={disabled || !source || source.available < 1} style={[styles.button, (disabled || !source || source.available < 1) && styles.disabled]} onPress={() => showAlert('Return top-up money?', `Return ₹${refundAmount || source?.available || 0} to the original payment method? This amount will be reserved from the wallet and recorded in History.`, [
              { text: 'Keep in wallet', style: 'cancel' }, { text: 'Request refund', onPress: () => void requestRefund() },
            ])}><Text style={styles.buttonText}>{busyId === 'new-refund' ? 'Submitting…' : 'Return to original payment method'}</Text></TouchableOpacity>
          </> : <Text style={styles.help}>No unused verified top-up is currently available to return. Any pending request appears below in History.</Text>}
        </View>}
        <Text style={styles.section}>History</Text>
      </View>}
      ListEmptyComponent={<Text style={styles.help}>No wallet activity yet.</Text>}
      ListFooterComponent={nextCursor ? <TouchableOpacity disabled={loadingMore} onPress={() => void more()} style={styles.source}><Text style={styles.body}>{loadingMore ? 'Loading…' : 'Load more history'}</Text></TouchableOpacity> : undefined}
      renderItem={({ item }) => {
        const presentation = walletHistoryPresentation(item);
        const canCheck = (item.reason === 'withdrawal' && item.status === 'processing') || (item.reason === 'topup' && ['pending', 'failed'].includes(item.status || ''));
        return <View style={styles.row}>
          <View style={styles.rowHeader}><Text style={[styles.body, { flex: 1, fontWeight: '700' }]}>{presentation.title}</Text><Text style={[styles.amount, { color: presentation.isDebit ? '#C62828' : C.primary }]}>{presentation.amount}</Text></View>
          <Text style={styles.status}>{presentation.statusText}</Text>
          <Text style={styles.help}>{new Date(item.createdAt).toLocaleString()}</Text>
          {presentation.external ? <Text style={styles.help}>To original payment method · Wallet balance unchanged</Text>
            : typeof item.balanceAfter === 'number' && <Text style={styles.help}>{presentation.noCredit ? 'Wallet balance unchanged' : `Balance after transaction: ₹${item.balanceAfter.toLocaleString('en-IN')}`}</Text>}
          {!!item.refundId && <Text selectable style={styles.help}>Refund reference: {item.refundId}</Text>}
          {!!item.bankReference && <Text selectable style={styles.help}>Bank reference: {item.bankReference}</Text>}
          {!!(item.sourcePaymentId || item.razorpayPaymentId) && <Text selectable style={styles.help}>Payment reference: {item.sourcePaymentId || item.razorpayPaymentId}</Text>}
          {!!item.message && <Text style={styles.help}>{item.message}</Text>}
          {canCheck && <TouchableOpacity disabled={disabled} onPress={() => void check(item)}><Text style={styles.link}>{busyId === item._id ? 'Checking…' : 'Check status'}</Text></TouchableOpacity>}
        </View>;
      }} />}
  </SafeAreaView>;
}
const styles = themed(() => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page }, balanceCard: { backgroundColor: C.ink, borderRadius: 20, padding: 22, marginBottom: 18 },
  balanceLabel: { color: C.page, fontSize: 13, fontWeight: '600' }, balanceValue: { color: '#fff', fontSize: 36, fontWeight: '800', marginTop: 6 }, balanceHint: { color: C.soft, marginTop: 6, lineHeight: 19 },
  section: { fontSize: 16, fontWeight: '800', marginBottom: 10, color: C.ink }, presets: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  preset: { flex: 1, backgroundColor: C.card, borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.line },
  selected: { backgroundColor: C.soft, borderColor: C.primary }, input: { backgroundColor: C.card, borderRadius: 12, padding: 14, fontSize: 16, marginVertical: 12, color: C.ink, borderWidth: 1, borderColor: C.line },
  button: { backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 18 }, buttonText: { color: '#fff', fontWeight: '800', fontSize: 14, textAlign: 'center' }, disabled: { opacity: 0.5 },
  panel: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 14, marginBottom: 20 }, source: { borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, marginTop: 10 },
  body: { color: C.ink, fontSize: 14 }, help: { color: C.muted, fontSize: 12, marginTop: 5, lineHeight: 18 }, row: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 10, gap: 3 },
  rowHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, amount: { fontWeight: '800', fontSize: 15 }, status: { color: C.ink, fontSize: 12, fontWeight: '600' }, link: { color: C.primary, fontWeight: '700', paddingVertical: 10 },
}));
