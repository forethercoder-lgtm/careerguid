import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Modal, Alert, ActivityIndicator, Linking } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { C, S } from '../theme';
import { API_URL } from '../config';
import { getJSON, setJSON } from '../storage';

const CATS = { documents: '📄', languages: '🗣', universities: '🏫', essays: '✍️', study: '📚', finances: '💰', other: '📌' };

function today() { return new Date().toISOString().split('T')[0]; }

export default function PlanScreen({ route, navigation }) {
  const { token, user, onboarding } = route.params;
  const [allTasks, setAllTasks] = useState([]);

  const [showAddPlan, setShowAddPlan] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [planCat, setPlanCat] = useState('other');

  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCat, setTaskCat] = useState('other');

  const [breaking, setBreaking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localFor, setLocalFor] = useState(null);
  const [localData, setLocalData] = useState(null);
  const [filter, setFilter] = useState('today');

  const key = `tasks_${user?.email}`;
  const planItems = allTasks.filter(t => t.origin === 'plan');
  const trackerTasks = allTasks.filter(t => !t.origin || t.origin === 'ai-daily');

  useEffect(() => { load(); }, []);

  async function load() {
    const saved = await getJSON(key) || [];
    setAllTasks(saved);
  }

  async function save(updated) {
    setAllTasks(updated);
    await setJSON(key, updated);
  }

  async function addPlanItem() {
    if (!planTitle.trim()) return;
    const item = { id: Date.now(), title: planTitle.trim(), category: planCat, origin: 'plan', done: false, createdAt: today() };
    await save([...allTasks, item]);
    setPlanTitle('');
    setShowAddPlan(false);
  }

  async function addTrackerTask() {
    if (!taskTitle.trim()) return;
    const task = { id: Date.now(), title: taskTitle.trim(), category: taskCat, type: 'daily', dueDate: today(), origin: 'ai-daily', done: false, createdAt: today() };
    await save([...allTasks, task]);
    setTaskTitle('');
    setShowAddTask(false);
  }

  async function toggle(id) {
    await save(allTasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  function removeItem(id) {
    Alert.alert('Удалить?', '', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => await save(allTasks.filter(t => t.id !== id)) },
    ]);
  }

  async function breakIntoDays() {
    if (planItems.length === 0) return;
    setBreaking(true);
    try {
      const res = await fetch(`${API_URL}/api/generate-daily-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: planItems.map(t => ({ title: t.title, category: t.category })), goal: onboarding?.goal || '' }),
      });
      const data = await res.json();
      if (data.tasks?.length > 0) {
        const newTasks = data.tasks.map((t, i) => ({
          id: Date.now() + i, title: t.title, category: t.category || 'other',
          type: 'daily', dueDate: today(), note: t.note || '', origin: 'ai-daily', done: false,
        }));
        const merged = [...allTasks, ...newTasks.filter(nt => !allTasks.some(e => e.title === nt.title))];
        await save(merged);
        Alert.alert('Готово!', `${data.tasks.length} задач добавлено в трекер ниже`);
      } else {
        Alert.alert('Ошибка', data.error || 'Не удалось разбить план');
      }
    } catch {
      Alert.alert('Ошибка', 'Сервер недоступен');
    }
    setBreaking(false);
  }

  async function uploadDocument() {
    let result;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
      });
    } catch {
      return;
    }
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' });
      const res = await fetch(`${API_URL}/api/parse-document`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert('Ошибка', data.error || 'Не удалось прочитать документ'); setUploading(false); return; }
      const items = data.items || [];
      const newItems = items.map((it, i) => ({
        id: Date.now() + i, title: it.title, category: it.category || 'other',
        note: it.note || '', origin: 'plan', done: false, createdAt: today(),
      }));
      const merged = [...allTasks, ...newItems.filter(nt => !allTasks.some(e => e.title === nt.title))];
      await save(merged);
      Alert.alert('Готово!', `Из документа добавлено ${items.length} задач в план`);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить документ');
    }
    setUploading(false);
  }

  async function findLocal(item) {
    setLocalFor(item.id);
    setLocalData({ loading: true });
    try {
      const loc = onboarding?.location || {};
      const res = await fetch(`${API_URL}/api/suggest-local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lat: loc.lat, lon: loc.lon, city: loc.manualCity, topic: item.title }),
      });
      const data = await res.json();
      if (!res.ok) { setLocalData({ error: data.error || 'Ошибка' }); return; }
      setLocalData({ city: data.city, results: data.results || [] });
    } catch {
      setLocalData({ error: 'Сервер недоступен' });
    }
  }

  const t = today();
  const todayTasks = trackerTasks.filter(x => x.dueDate === t);
  const filteredTracker = trackerTasks.filter(x => {
    if (filter === 'today') return x.dueDate === t;
    if (filter === 'done') return x.done;
    if (filter === 'todo') return !x.done;
    return true;
  });
  const doneCount = todayTasks.filter(x => x.done).length;

  return (
    <ScrollView style={s.page} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={s.header}>
        <Text style={s.title}>Мой план</Text>
        {onboarding?.goal && <Text style={s.goal}>🎯 {onboarding.goal}</Text>}
      </View>

      <View style={s.actions}>
        <TouchableOpacity style={[S.btn, S.btnPrimary, { flex: 1 }]} onPress={() => setShowAddPlan(true)}>
          <Text style={S.btnText}>+ Задача</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.secondaryBtn, { flex: 1 }]} onPress={breakIntoDays} disabled={breaking || planItems.length === 0}>
          <Text style={s.secondaryBtnText}>{breaking ? 'Разбиваю...' : '🤖 Разбить на дни'}</Text>
        </TouchableOpacity>
      </View>
      <View style={s.actions}>
        <TouchableOpacity style={s.orientBtn} onPress={() => navigation.navigate('OrientationChat', { token, user, onboarding })}>
          <Text style={s.orientBtnText}>🎓 Помощь с выбором</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.docBtn} onPress={uploadDocument} disabled={uploading}>
          <Text style={s.docBtnText}>{uploading ? 'Читаю...' : '📄 Документ'}</Text>
        </TouchableOpacity>
      </View>

      {planItems.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📭</Text>
          <Text style={s.emptyText}>Впиши свой план — добавь первую задачу</Text>
        </View>
      ) : planItems.map(item => (
        <View key={item.id} style={s.card}>
          <TouchableOpacity style={s.cardRow} onPress={() => toggle(item.id)} onLongPress={() => removeItem(item.id)}>
            <Text style={s.check}>{item.done ? '✅' : '⬜'}</Text>
            <Text style={[s.cardTitle, item.done && s.cardTitleDone]}>{CATS[item.category] || '📌'} {item.title}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.localBtn} onPress={() => findLocal(item)}>
            <Text style={s.localBtnText}>📍 Найти варианты</Text>
          </TouchableOpacity>
          {localFor === item.id && localData && (
            <View style={s.localPanel}>
              {localData.loading && <ActivityIndicator size="small" color={C.primary} />}
              {localData.error && <Text style={s.localError}>⚠️ {localData.error}</Text>}
              {localData.results && (
                <>
                  {localData.city && <Text style={s.localCity}>По городу: {localData.city}</Text>}
                  {localData.results.length === 0 && <Text style={s.localCity}>Ничего не найдено</Text>}
                  {localData.results.map((r, i) => (
                    <TouchableOpacity key={i} style={s.resultItem} onPress={() => Linking.openURL(r.url)}>
                      <Text style={s.resultTitle}>{r.title}</Text>
                      <Text style={s.resultContent} numberOfLines={2}>{r.content}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          )}
        </View>
      ))}

      <View style={s.divider} />

      <View style={s.trackerHeader}>
        <Text style={s.title}>Задачи на день</Text>
        {todayTasks.length > 0 && (
          <View style={s.progress}>
            <View style={[s.progressBar, { width: `${(doneCount / todayTasks.length) * 100}%` }]} />
          </View>
        )}
        <Text style={s.progressText}>{doneCount}/{todayTasks.length} выполнено сегодня</Text>
      </View>

      <View style={s.filters}>
        {[['today', 'Сегодня'], ['todo', 'Активные'], ['done', 'Выполнено'], ['all', 'Все']].map(([id, label]) => (
          <TouchableOpacity key={id} style={[s.filter, filter === id && s.filterActive]} onPress={() => setFilter(id)}>
            <Text style={[s.filterText, filter === id && s.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredTracker.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>✅</Text>
          <Text style={s.emptyText}>{filter === 'today' ? 'На сегодня задач нет' : 'Задач нет'}</Text>
        </View>
      ) : filteredTracker.map(task => (
        <TouchableOpacity key={task.id} style={[s.task, task.done && s.taskDone]} onPress={() => toggle(task.id)} onLongPress={() => removeItem(task.id)}>
          <Text style={s.taskCheck}>{task.done ? '✅' : '⬜'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.taskTitle, task.done && s.taskTitleDone]}>{CATS[task.category] || '📌'} {task.title}</Text>
            {task.note && <Text style={s.taskNote}>{task.note}</Text>}
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={s.addTaskBtn} onPress={() => setShowAddTask(true)}>
        <Text style={s.addTaskBtnText}>+ Добавить задачу в трекер</Text>
      </TouchableOpacity>

      <Modal visible={showAddPlan} transparent animationType="slide">
        <View style={s.modal}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Новая задача плана</Text>
            <TextInput style={[S.input, { marginBottom: 12 }]} value={planTitle} onChangeText={setPlanTitle} placeholder="Например: Сдать IELTS до марта" placeholderTextColor={C.faint} autoFocus />
            <Text style={[S.label, { marginBottom: 8 }]}>Категория:</Text>
            <View style={s.catRow}>
              {Object.entries(CATS).map(([id, icon]) => (
                <TouchableOpacity key={id} style={[s.catBtn, planCat === id && s.catBtnActive]} onPress={() => setPlanCat(id)}>
                  <Text style={s.catIcon}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={[S.btn, { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }]} onPress={() => setShowAddPlan(false)}>
                <Text style={{ color: C.text, fontWeight: '700' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.btn, S.btnPrimary, { flex: 1 }]} onPress={addPlanItem}>
                <Text style={S.btnText}>Добавить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAddTask} transparent animationType="slide">
        <View style={s.modal}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Новая задача на сегодня</Text>
            <TextInput style={[S.input, { marginBottom: 12 }]} value={taskTitle} onChangeText={setTaskTitle} placeholder="Название задачи" placeholderTextColor={C.faint} autoFocus />
            <Text style={[S.label, { marginBottom: 8 }]}>Категория:</Text>
            <View style={s.catRow}>
              {Object.entries(CATS).map(([id, icon]) => (
                <TouchableOpacity key={id} style={[s.catBtn, taskCat === id && s.catBtnActive]} onPress={() => setTaskCat(id)}>
                  <Text style={s.catIcon}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={[S.btn, { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }]} onPress={() => setShowAddTask(false)}>
                <Text style={{ color: C.text, fontWeight: '700' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.btn, S.btnPrimary, { flex: 1 }]} onPress={addTrackerTask}>
                <Text style={S.btnText}>Добавить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { color: C.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
  goal: { color: C.muted, fontSize: 13, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 16 },
  secondaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  secondaryBtnText: { color: C.text, fontWeight: '700', fontSize: 14 },
  orientBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: C.accent },
  orientBtnText: { color: C.accent, fontWeight: '700', fontSize: 13 },
  docBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  docBtnText: { color: C.text, fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: C.muted, fontSize: 15 },
  card: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginHorizontal: 16, marginTop: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  check: { fontSize: 20 },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: '600', flex: 1 },
  cardTitleDone: { textDecorationLine: 'line-through', color: C.muted },
  localBtn: { marginTop: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  localBtnText: { color: C.primary, fontSize: 12, fontWeight: '600' },
  localPanel: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10, gap: 8 },
  localError: { color: C.danger, fontSize: 13 },
  localCity: { color: C.muted, fontSize: 12 },
  resultItem: { backgroundColor: C.bg2, borderRadius: 8, padding: 10 },
  resultTitle: { color: C.text, fontWeight: '600', fontSize: 13, marginBottom: 3 },
  resultContent: { color: C.muted, fontSize: 12, lineHeight: 16 },
  divider: { height: 1, backgroundColor: C.border, marginTop: 24, marginHorizontal: 16 },
  trackerHeader: { padding: 16, paddingBottom: 8 },
  progress: { height: 6, backgroundColor: C.surface, borderRadius: 3, overflow: 'hidden', marginTop: 8, marginBottom: 6 },
  progressBar: { height: '100%', backgroundColor: C.success, borderRadius: 3 },
  progressText: { color: C.muted, fontSize: 12 },
  filters: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filter: { flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: C.surface, alignItems: 'center' },
  filterActive: { backgroundColor: C.primary },
  filterText: { color: C.muted, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  task: { flexDirection: 'row', gap: 12, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, alignItems: 'center', marginHorizontal: 16, marginTop: 10 },
  taskDone: { opacity: 0.5 },
  taskCheck: { fontSize: 22 },
  taskTitle: { color: C.text, fontSize: 14, fontWeight: '600' },
  taskTitleDone: { textDecorationLine: 'line-through', color: C.muted },
  taskNote: { color: C.faint, fontSize: 12, marginTop: 2 },
  addTaskBtn: { marginHorizontal: 16, marginTop: 14, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' },
  addTaskBtnText: { color: C.muted, fontWeight: '600', fontSize: 13 },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  catRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  catBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  catBtnActive: { borderColor: C.primary, backgroundColor: 'rgba(99,102,241,0.2)' },
  catIcon: { fontSize: 20 },
  modalBtns: { flexDirection: 'row', gap: 10 },
});
