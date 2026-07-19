import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, TextInput, Modal, Alert, ActivityIndicator, Linking } from 'react-native';
import { C, S } from '../theme';
import { API_URL } from '../config';
import { getJSON, setJSON } from '../storage';

const CATS = { documents: '📄', languages: '🗣', universities: '🏫', essays: '✍️', study: '📚', finances: '💰', other: '📌' };

export default function PlanScreen({ route, navigation }) {
  const { token, user, onboarding } = route.params;
  const [allTasks, setAllTasks] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('other');
  const [breaking, setBreaking] = useState(false);
  const [localFor, setLocalFor] = useState(null); // task id currently showing local results
  const [localData, setLocalData] = useState(null); // { loading, city, results, error }

  const key = `tasks_${user?.email}`;
  const planItems = allTasks.filter(t => t.origin === 'plan');

  useEffect(() => { load(); }, []);

  async function load() {
    const saved = await getJSON(key) || [];
    setAllTasks(saved);
  }

  async function save(updated) {
    setAllTasks(updated);
    await setJSON(key, updated);
  }

  async function addItem() {
    if (!newTitle.trim()) return;
    const item = { id: Date.now(), title: newTitle.trim(), category: newCat, origin: 'plan', done: false, createdAt: new Date().toISOString() };
    await save([...allTasks, item]);
    setNewTitle('');
    setShowAdd(false);
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
        const today = new Date().toISOString().split('T')[0];
        const newTasks = data.tasks.map((t, i) => ({
          id: Date.now() + i, title: t.title, category: t.category || 'other',
          type: 'daily', dueDate: today, note: t.note || '', origin: 'ai-daily', done: false,
        }));
        const merged = [...allTasks, ...newTasks.filter(nt => !allTasks.some(e => e.title === nt.title))];
        await save(merged);
        Alert.alert('Готово!', `${data.tasks.length} задач добавлено в трекер`, [
          { text: 'Открыть задачи', onPress: () => navigation.navigate('Tasks', { user }) },
          { text: 'Ок', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Ошибка', data.error || 'Не удалось разбить план');
      }
    } catch {
      Alert.alert('Ошибка', 'Сервер недоступен');
    }
    setBreaking(false);
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

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Text style={s.title}>Мой план</Text>
        {onboarding?.goal && <Text style={s.goal}>🎯 {onboarding.goal}</Text>}
      </View>

      <View style={s.actions}>
        <TouchableOpacity style={[S.btn, S.btnPrimary, { flex: 1 }]} onPress={() => setShowAdd(true)}>
          <Text style={S.btnText}>+ Задача</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.secondaryBtn, { flex: 1 }]} onPress={breakIntoDays} disabled={breaking || planItems.length === 0}>
          <Text style={s.secondaryBtnText}>{breaking ? 'Разбиваю...' : '🤖 Разбить на дни'}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={s.orientBtn} onPress={() => navigation.navigate('OrientationChat', { token, user, onboarding })}>
        <Text style={s.orientBtnText}>🎓 Помощь с выбором</Text>
      </TouchableOpacity>

      <FlatList
        data={planItems}
        keyExtractor={t => String(t.id)}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📭</Text>
            <Text style={s.emptyText}>Впиши свой план — добавь первую задачу</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
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
        )}
      />

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modal}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Новая задача</Text>
            <TextInput style={[S.input, { marginBottom: 12 }]} value={newTitle} onChangeText={setNewTitle} placeholder="Например: Сдать IELTS до марта" placeholderTextColor={C.faint} autoFocus />
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
              <TouchableOpacity style={[S.btn, S.btnPrimary, { flex: 1 }]} onPress={addItem}>
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
  title: { color: C.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
  goal: { color: C.muted, fontSize: 13, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 10, padding: 16 },
  secondaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  secondaryBtnText: { color: C.text, fontWeight: '700', fontSize: 14 },
  orientBtn: { marginHorizontal: 16, marginBottom: 4, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: C.accent },
  orientBtnText: { color: C.accent, fontWeight: '700', fontSize: 13 },
  list: { padding: 16, gap: 12, paddingBottom: 60 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: C.muted, fontSize: 15 },
  card: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14 },
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
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  catRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  catBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  catBtnActive: { borderColor: C.primary, backgroundColor: 'rgba(99,102,241,0.2)' },
  catIcon: { fontSize: 20 },
  modalBtns: { flexDirection: 'row', gap: 10 },
});
