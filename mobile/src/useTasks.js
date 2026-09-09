import { useState, useRef, useEffect, useCallback } from 'react';
import { LayoutAnimation } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { getJSON, setJSON } from './storage';

export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Общий стор задач. Обе вкладки (План / Сегодня) читают и пишут один ключ tasks_<email>
// и синхронизируются при возврате фокуса на вкладку.
export function useTasks(email) {
  const key = `tasks_${email}`;
  const [tasks, setTasks] = useState([]);
  const ref = useRef([]);
  useEffect(() => { ref.current = tasks; }, [tasks]);

  const load = useCallback(async () => {
    const saved = (await getJSON(key)) || [];
    ref.current = saved;
    setTasks(saved);
  }, [key]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const persist = useCallback((updated) => {
    ref.current = updated;
    setTasks(updated);
    setJSON(key, updated);
  }, [key]);

  const toggle = useCallback((id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    persist(ref.current.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  }, [persist]);

  const remove = useCallback((task, showToast) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const prev = ref.current;
    persist(prev.filter(t => t.id !== task.id));
    showToast?.(`Удалено: «${task.title}»`, 'Отменить', () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      persist(prev);
    });
  }, [persist]);

  // добавить, отбросив дубли по названию; вернуть кол-во реально добавленных
  const addMany = useCallback((items) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const existing = ref.current;
    const fresh = items.filter(nt => !existing.some(e => e.title === nt.title));
    persist([...existing, ...fresh]);
    return fresh.length;
  }, [persist]);

  return { tasks, ref, load, persist, toggle, remove, addMany };
}
