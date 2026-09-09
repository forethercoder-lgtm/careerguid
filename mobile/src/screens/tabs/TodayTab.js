import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Modal, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { C, S, withOpacity } from '../../theme';
import { useApp } from '../../AppContext';
import { useTasks, todayStr } from '../../useTasks';
import { getJSON, setJSON } from '../../storage';
import TaskRow from '../../components/TaskRow';
import BadgesRow from '../../components/BadgesRow';
import Toast from '../../components/Toast';

const CATS = { documents: '📄', languages: '🗣', universities: '🏫', essays: '✍️', study: '📚', finances: '💰', other: '📌' };

export default function TodayTab() {
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const { tasks, load, addMany, toggle, remove } = useTasks(user?.email);

  const [streak, setStreak] = useState(0);
  const [filter, setFilter] = useState('today');
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('other');
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, actionLabel, onAction) => setToast({ message, actionLabel, onAction });

  useFocusEffect(useCallback(() => { loadStreak(); }, []));

  async function loadStreak() {
    const skey = `streak_${user?.email}`;
    const data = (await getJSON(skey)) || { count: 0, lastDate: '' };
    const t = todayStr();
    if (data.lastDate !== t) {
      const yd = new Date(); yd.setDate(yd.getDate() - 1);
      const yds = yd.toISOString().split('T')[0];
      const newCount = data.lastDate === yds ? data.count + 1 : 1;
      await setJSON(skey, { count: newCount, lastDate: t });
      setStreak(newCount);
    } else {
      setStreak(data.count);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([load(), loadStreak()]);
    setRefreshing(false);
  }

  function addTask() {
    if (!title.trim()) return;
    addMany([{ id: Date.now(), title: title.trim(), category: cat, type: 'daily', dueDate: todayStr(), origin: 'ai-daily', done: false, createdAt: todayStr() }]);
    setTitle('');
    setCat('other');
    setShowAdd(false);
  }

  const t = todayStr();
  const tracker = tasks.filter(x => !x.origin || x.origin === 'ai-daily');
  const todayTasks = tracker.filter(x => x.dueDate === t);
  const doneCount = todayTasks.filter(x => x.done).length;
  const planCount = tasks.filter(x => x.origin === 'plan').length;
  const filtered = tracker.filter(x => {
    if (filter === 'today') return x.dueDate === t;
    if (filter === 'done') return x.done;
    if (filter === 'todo') return !x.done;
    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
      >
        <View style={[s.header, { paddingTop: 16 + insets.top }]}>
          <Text style={s.title}>Сегодня</Text>
          {streak > 0 && <Text style={s.streak}>🔥 {streak}</Text>}
        </View>

        <BadgesRow streak={streak} doneCount={doneCount} planCount={planCount} />

        <View style={s.progressWrap}>
          {todayTasks.length > 0 && (
            <View style={s.progress}>
              <View style={[s.progressBar, { width: `${(doneCount / todayTasks.length) * 100}%` }]} />
            </View>
          )}
          <Text style={s.progressText}>{doneCount}/{todayTasks.length} выполнено сегодня</Text>
        </View>

        <View style={s.filters}>
          {[['today', 'Сегодня'], ['todo', 'Активные'], ['done', 'Готово'], ['all', 'Все']].map(([id, label]) => (
            <TouchableOpacity key={id} style={[s.filter, filter === id && s.filterActive]} onPress={() => setFilter(id)}>
              <Text style={[s.filterText, filter === id && s.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>✅</Text>
            <Text style={s.emptyText}>
              {filter === 'today' ? 'На сегодня задач нет. Разбей план на дни во вкладке «План».' : 'Задач нет'}
            </Text>
          </View>
        ) : filtered.map(task => (
          <View key={task.id}>
            <TaskRow task={task} onToggle={toggle} onDelete={x => remove(x, showToast)} />
            <View style={s.hairline} />
          </View>
        ))}

        <Modal visible={showAdd} transparent animationType="slide">
          <View style={s.modal}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Новая задача на сегодня</Text>
              <TextInput style={[S.input, { marginBottom: 12 }]} value={title} onChangeText={setTitle} placeholder="Название задачи" placeholderTextColor={C.faint} autoFocus />
              <Text style={[S.label, { marginBottom: 8 }]}>Категория:</Text>
              <View style={s.catRow}>
                {Object.entries(CATS).map(([id, icon]) => (
                  <TouchableOpacity key={id} style={[s.catBtn, cat === id && s.catBtnActive]} onPress={() => setCat(id)}>
                    <Text style={s.catIcon}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.modalBtns}>
                <TouchableOpacity style={[S.btn, { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }]} onPress={() => setShowAdd(false)}>
                  <Text style={{ color: C.text, fontWeight: '700' }}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.btn, S.btnPrimary, { flex: 1 }]} onPress={addTask}>
                  <Text style={S.btnText}>Добавить</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>

      <TouchableOpacity style={[s.fab, { bottom: 24 + insets.bottom }]} onPress={() => setShowAdd(true)}>
        <Text style={s.fabIcon}>+</Text>
      </TouchableOpacity>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: C.bg2, paddingHorizontal: 20, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: C.text, fontSize: 22, fontWeight: '900' },
  streak: { color: '#fbbf24', fontSize: 15, fontWeight: '800' },
  progressWrap: { paddingHorizontal: 16, paddingTop: 14 },
  progress: { height: 6, backgroundColor: C.surface, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressBar: { height: '100%', backgroundColor: C.success, borderRadius: 3 },
  progressText: { color: C.muted, fontSize: 12 },
  filters: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filter: { flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: C.surface, alignItems: 'center' },
  filterActive: { backgroundColor: C.primary },
  filterText: { color: C.muted, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 48, paddingBottom: 20, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: C.muted, fontSize: 15, textAlign: 'center' },
  hairline: { height: 1, backgroundColor: C.border, marginLeft: 70 },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  fabIcon: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  catRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  catBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  catBtnActive: { borderColor: C.primary, backgroundColor: withOpacity(C.primary, 0.2) },
  catIcon: { fontSize: 20 },
  modalBtns: { flexDirection: 'row', gap: 10 },
});
