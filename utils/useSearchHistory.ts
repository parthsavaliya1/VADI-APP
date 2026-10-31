import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { API } from './api';

const GUEST_KEY = 'vadi_guest_search_history_v1';
const normalize = (query: string) => query.trim().replace(/\s+/g, ' ').slice(0, 100);
export function useSearchHistory(userId?: string) {
  const [history, setHistory] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const epoch = useRef(0);
  const readVersion = useRef(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const scope = useRef(userId);
  const load = useCallback(async () => {
    const version = epoch.current;
    const read = ++readVersion.current;
    try {
      if (userId) {
        const { data } = await API.get('/search-history');
        if (read !== readVersion.current || version !== epoch.current || scope.current !== userId) return;
        setHistory((data.data || []).map((item: { query: string }) => item.query));
        setNotificationsEnabled(data.notificationsEnabled !== false);
      } else {
        const stored = JSON.parse(await AsyncStorage.getItem(GUEST_KEY) || '[]');
        if (read !== readVersion.current || version !== epoch.current || scope.current !== userId) return;
        setHistory(Array.isArray(stored) ? stored.filter((q): q is string => typeof q === 'string').slice(0, 20) : []);
      }
      setError('');
    } catch { if (read === readVersion.current && version === epoch.current) setError('Could not load search history. Please try again.'); }
  }, [userId]);
  useFocusEffect(useCallback(() => {
    scope.current = userId;
    epoch.current += 1; setHistory([]); setError(''); setBusy(false); void load();
    return () => { epoch.current += 1; };
  }, [load, userId]));

  const mutate = useCallback((action: 'save' | 'delete' | 'preferences', query = '', enabled?: boolean) => {
    const version = epoch.current;
    const term = normalize(query);
    if (action === 'save' && !term) return Promise.resolve(false);
    const task = async () => {
      if (scope.current !== userId) return false;
      if (version === epoch.current) setBusy(true);
      try {
        if (userId) {
          if (action === 'save') await API.post('/search-history', { query: term });
          else if (action === 'delete') await API.delete('/search-history', { data: { query: term } });
          else await API.patch('/search-history/preferences', { enabled });
        } else if (action !== 'preferences') {
          const stored = JSON.parse(await AsyncStorage.getItem(GUEST_KEY) || '[]');
          const list: string[] = Array.isArray(stored) ? stored.filter((q): q is string => typeof q === 'string') : [];
          const rest = list.filter(q => q.toLowerCase() !== term.toLowerCase());
          await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(action === 'save' ? [term, ...rest].slice(0, 20) : term ? rest : []));
        }
        if (version === epoch.current) await load();
        return true;
      } catch { if (version === epoch.current) setError('Could not update search history. Please try again.'); return false; }
      finally { if (version === epoch.current) setBusy(false); }
    };
    queue.current = queue.current.then(task, task);
    return queue.current;
  }, [load, userId]);
  const save = useCallback((query: string) => mutate('save', query), [mutate]);
  const remove = useCallback((query = '') => mutate('delete', query), [mutate]);
  const setNotifications = useCallback((enabled: boolean) => mutate('preferences', '', enabled), [mutate]);
  return { history, notificationsEnabled, busy, error, reload: load, save, remove, setNotifications };
}
