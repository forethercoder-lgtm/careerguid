import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, TextInput, Modal, Alert } from 'react-native';
import { C, S } from '../theme';
import { getJSON, setJSON } from '../storage';

const CATS = { documents: '📄', languages: '🗣', universities: '🏫', essays: '✍️', study: '📚', finances: '💰', other: '📌' };

export default function TasksScreen({ route }) {
  const user = route?.params?.user;
  const [allTasks, setAllTasks] = useState([]);
  const [filter, setFilter] = useState('today');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('other');

  const key = `tasks_${user?.email}`;

  useEffect(() => { load(); }, []);

  async function load() {
    const saved = await getJSON(key) || [];
    setAllTasks(saved);
  }

  async function save(updated) {
    setAllTasks(updated);
    await setJSON(key, updated);
  }

  async function toggle(id) {
    const updated = allTasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    await save(updated);
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    const task = { id: Date.now(), title: newTitle.trim(), category: newCat, type: 'daily', dueDate: today, origin: 'ai-daily', done: false, createdAt: new Date().toISOString() };
    await save([...allTasks, task]);
    setNewTitle('');
    setShowAdd(false);
  }

  async function deleteTask(id) {
    Alert.alert('Удалить?', '', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => await save(allTasks.filter(t => t.id !== id)) },
    ]);
  }

  const tasks = allTasks.filter(t => !t.origin || t.origin === 'ai-daily');
  const today = new Date().toISOString().split('T')[0];
  const filtered = tasks.filter(t => {
    if (filter === 'today') return t.dueDate === today;
    if (filter === 'done') return t.done;
    if (filter === 'todo') return !t.done;
    return true;
  });

  const doneCount = tasks.filter(t => t.dueDate === today && t.done).length;
  const totalToday = tasks.filter(t => t.dueDate === today).length;

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Text style={s.title}>Задачи</Text>
        {totalToday > 0 && (
          <View style={s.progress}>
            <View style={[s.progressBar, { width: `${(doneCount / totalToday) * 100}%` }]} />
          </View>
        )}
        <Text style={s.progressText}>{doneCount}/{totalToday} выполнено сегодня</Text>
      </View>

      <View style={s.filters}>
        {[['today','Сегодня'],['todo','Активные'],['done','Выполнено'],['all','Все']].map(([id, label]) => (
          <TouchableOpacity key={id} style={[s.filter, filter === id && s.filterActive]} onPress={() => setFilter(id)}>
            <Text style={[s.filterText, filter === id && s.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={t => String(t.id)}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>✅</Text>
            <Text style={s.emptyText}>{filter === 'today' ? 'На сегодня задач нет' : 'Задач нет'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.task, item.done && s.taskDone]} onPress={() => toggle(item.id)} onLongPress={() => deleteTask(item.id)}>
            <Text style={s.taskCheck}>{item.done ? '✅' : '⬜'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.taskTitle, item.done && s.taskTitleDone]}>{CATS[item.category] || '📌'} {item.title}</Text>
              {item.note && <Text style={s.taskNote}>{item.note}</Text>}
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={s.fab} onPress={() => setShowAdd(true)}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modal}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Новая задача</Text>
            <TextInput style={[S.input, { marginBottom: 12 }]} value={newTitle} onChangeText={setNewTitle} placeholder="Название задачи" placeholderTextColor={C.faint} autoFocus />
            <Text style={[S.label, { marginBottom: 8 }]}>Категория:</Text>
            <View style={s.catRow}>
              {Object.entries(CATS).map(([id, icon]) => (
                <TouchableOpacity key={id} style={[s.catBtn, newCat === id && s.catBtnActive]} onPress={() => setNewCat(id)}>
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
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { color: C.text, fontSize: 24, fontWeight: '900', marginBottom: 10 },
  progress: { height: 6, backgroundColor: C.surface, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressBar: { height: '100%', backgroundColor: C.success, borderRadius: 3 },
  progressText: { color: C.muted, fontSize: 12 },
  filters: { flexDirection: 'row', padding: 12, gap: 8 },
  filter: { flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: C.surface, alignItems: 'center' },
  filterActive: { backgroundColor: C.primary },
  filterText: { color: C.muted, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { padding: 16, gap: 10, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: C.muted, fontSize: 15 },
  task: { flexDirection: 'row', gap: 12, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, alignItems: 'center' },
  taskDone: { opacity: 0.5 },
  taskCheck: { fontSize: 22 },
  taskTitle: { color: C.text, fontSize: 14, fontWeight: '600' },
  taskTitleDone: { textDecorationLine: 'line-through', color: C.muted },
  taskNote: { color: C.faint, fontSize: 12, marginTop: 2 },
  fab: { position: 'absolute', right: 20, bottom: 30, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  catRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  catBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  catBtnActive: { borderColor: C.primary, backgroundColor: 'rgba(99,102,241,0.2)' },
  catIcon: { fontSize: 20 },
  modalBtns: { flexDirection: 'row', gap: 10 },
});
