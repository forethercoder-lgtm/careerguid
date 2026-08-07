import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Modal, Alert, ActivityIndicator, Linking } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { C, S } from '../theme';
import { API_URL } from '../config';
import { getJSON, setJSON, removeItem } from '../storage';
import BadgesRow from '../components/BadgesRow';
import * as docStorage from '../docStorage';

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
  const [scholarships, setScholarships] = useState(null);
  const [streak, setStreak] = useState(0);
  const [documents, setDocuments] = useState([]);

  const key = `tasks_${user?.email}`;
  const planItems = allTasks.filter(t => t.origin === 'plan');
  const trackerTasks = allTasks.filter(t => !t.origin || t.origin === 'ai-daily');

  useEffect(() => { load(); loadStreak(); loadDocuments(); }, []);

  async function load() {
    const saved = await getJSON(key) || [];
    setAllTasks(saved);
  }

  async function loadStreak() {
    const skey = `streak_${user?.email}`;
    const data = (await getJSON(skey)) || { count: 0, lastDate: '' };
    const t = today();
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

  async function loadDocuments() {
    setDocuments(await docStorage.getDocuments(user?.email));
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

      if (file.size && file.size <= docStorage.MAX_DOC_SIZE) {
        try { setDocuments(await docStorage.saveDocument(user?.email, file)); } catch {}
      }

      Alert.alert('Готово!', `Из документа добавлено ${items.length} задач в план`);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить документ');
    }
    setUploading(false);
  }

  async function findScholarships() {
    setScholarships({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/suggest-scholarships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ specialty: onboarding?.goal, educationLevel: onboarding?.level }),
      });
      const data = await res.json();
      if (!res.ok) { setScholarships({ error: data.error || 'Ошибка' }); return; }
      setScholarships({ results: data.scholarships || [] });
    } catch {
      setScholarships({ error: 'Сервер недоступен' });
    }
  }

  async function addScholarshipToPlan(sch) {
    const item = {
      id: Date.now(), title: `Подать заявку на стипендию «${sch.name}»${sch.deadline ? ' до ' + sch.deadline : ''}`,
      category: 'finances', note: sch.whyFit || sch.eligibility || '', origin: 'plan', done: false, createdAt: today(),
    };
    await save([...allTasks, item]);
    Alert.alert('Готово!', 'Стипендия добавлена в план');
  }

  async function deleteDoc(id) {
    setDocuments(await docStorage.deleteDocument(user?.email, id));
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

  function logout() {
    Alert.alert('Выйти?', '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти', style: 'destructive', onPress: async () => {
          await removeItem('token');
          await removeItem('user');
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        }
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <ScrollView style={s.page} contentContainerStyle={{ paddingBottom: 90 }}>
      <View style={s.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.title}>Мой план</Text>
            {streak > 0 && <Text style={s.streak}>🔥 {streak}</Text>}
          </View>
          <TouchableOpacity onPress={logout}><Text style={s.logoutText}>Выйти</Text></TouchableOpacity>
        </View>
        {onboarding?.goal && <Text style={s.goal}>🎯 {onboarding.goal}</Text>}
      </View>

      <BadgesRow streak={streak} doneCount={doneCount} planCount={planItems.length} />

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
      <View style={s.actions}>
        <TouchableOpacity style={s.docBtn} onPress={findScholarships} disabled={scholarships?.loading}>
          <Text style={s.docBtnText}>{scholarships?.loading ? 'Ищу...' : '💰 Стипендии'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.docBtn} onPress={() => navigation.navigate('EssayFeedback', { token })}>
          <Text style={s.docBtnText}>✍️ Эссе</Text>
        </TouchableOpacity>
      </View>

      {scholarships && !scholarships.loading && (
        <View style={s.localPanel}>
          {scholarships.error && <Text style={s.localError}>⚠️ {scholarships.error}</Text>}
          {scholarships.results?.length === 0 && <Text style={s.localCity}>Ничего не найдено</Text>}
          {scholarships.results?.map((sch, i) => (
            <View key={i} style={s.resultItem}>
              <Text style={s.resultTitle}>{sch.name}</Text>
              <Text style={s.resultContent}>💰 {sch.amount} · 📅 {sch.deadline}{sch.country ? ` · ${sch.country}` : ''}</Text>
              {sch.eligibility ? <Text style={s.resultContent}>{sch.eligibility}</Text> : null}
              {sch.whyFit ? <Text style={s.resultContent}>{sch.whyFit}</Text> : null}
              <TouchableOpacity style={s.addToPlanBtn} onPress={() => addScholarshipToPlan(sch)}>
                <Text style={s.addToPlanBtnText}>+ В план</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {planItems.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📭</Text>
          <Text style={s.emptyText}>Впиши свой план — добавь первую задачу</Text>
        </View>
      ) : planItems.map(item => (
        <View key={item.id}>
          <TouchableOpacity style={s.row} onPress={() => toggle(item.id)} onLongPress={() => removeItem(item.id)}>
            <View style={[s.avatar, item.done && s.avatarDone]}>
              <Text style={s.avatarEmoji}>{item.done ? '✅' : (CATS[item.category] || '📌')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, item.done && s.rowTitleDone]}>{item.title}</Text>
              {item.note ? <Text style={s.rowSubtitle} numberOfLines={1}>{item.note}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => findLocal(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={s.rowAction}>📍</Text>
            </TouchableOpacity>
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
          <View style={s.hairline} />
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
        <View key={task.id}>
          <TouchableOpacity style={s.row} onPress={() => toggle(task.id)} onLongPress={() => removeItem(task.id)}>
            <View style={[s.avatar, task.done && s.avatarDone]}>
              <Text style={s.avatarEmoji}>{task.done ? '✅' : (CATS[task.category] || '📌')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, task.done && s.rowTitleDone]}>{task.title}</Text>
              {task.note ? <Text style={s.rowSubtitle} numberOfLines={1}>{task.note}</Text> : null}
            </View>
          </TouchableOpacity>
          <View style={s.hairline} />
        </View>
      ))}

      {documents.length > 0 && (
        <>
          <View style={s.divider} />
          <View style={s.trackerHeader}>
            <Text style={s.title}>📁 Документы</Text>
          </View>
          {documents.map(doc => (
            <View key={doc.id} style={s.docRow}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => Linking.openURL(doc.uri)}>
                <Text style={s.rowTitle} numberOfLines={1}>{doc.name}</Text>
                <Text style={s.rowSubtitle}>{doc.size ? `${Math.round(doc.size / 1024)} КБ` : ''}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteDoc(doc.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={s.rowAction}>🗑</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

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

    <TouchableOpacity style={s.fab} onPress={() => setShowAddTask(true)}>
      <Text style={s.fabIcon}>+</Text>
    </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { color: C.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
  goal: { color: C.muted, fontSize: 13, fontStyle: 'italic' },
  streak: { color: '#fbbf24', fontSize: 14, fontWeight: '800' },
  logoutText: { color: C.muted, fontSize: 13, fontWeight: '600' },
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarDone: { backgroundColor: 'rgba(16,185,129,0.15)' },
  avatarEmoji: { fontSize: 19 },
  rowTitle: { color: C.text, fontSize: 15, fontWeight: '600' },
  rowTitleDone: { textDecorationLine: 'line-through', color: C.muted },
  rowSubtitle: { color: C.muted, fontSize: 12, marginTop: 2 },
  rowAction: { fontSize: 18, padding: 4 },
  hairline: { height: 1, backgroundColor: C.border, marginLeft: 70 },
  localPanel: { marginTop: 6, marginBottom: 6, marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10, gap: 8 },
  localError: { color: C.danger, fontSize: 13 },
  localCity: { color: C.muted, fontSize: 12 },
  resultItem: { backgroundColor: C.bg2, borderRadius: 8, padding: 10 },
  resultTitle: { color: C.text, fontWeight: '600', fontSize: 13, marginBottom: 3 },
  resultContent: { color: C.muted, fontSize: 12, lineHeight: 16 },
  addToPlanBtn: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addToPlanBtnText: { color: C.text, fontSize: 12, fontWeight: '700' },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  divider: { height: 8, backgroundColor: C.bg2, marginTop: 16 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  fabIcon: { color: '#000', fontSize: 28, fontWeight: '300', marginTop: -2 },
  trackerHeader: { padding: 16, paddingBottom: 8 },
  progress: { height: 6, backgroundColor: C.surface, borderRadius: 3, overflow: 'hidden', marginTop: 8, marginBottom: 6 },
  progressBar: { height: '100%', backgroundColor: C.success, borderRadius: 3 },
  progressText: { color: C.muted, fontSize: 12 },
  filters: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filter: { flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: C.surface, alignItems: 'center' },
  filterActive: { backgroundColor: C.primary },
  filterText: { color: C.muted, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  catRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  catBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  catBtnActive: { borderColor: C.primary, backgroundColor: 'rgba(99,102,241,0.2)' },
  catIcon: { fontSize: 20 },
  modalBtns: { flexDirection: 'row', gap: 10 },
});
