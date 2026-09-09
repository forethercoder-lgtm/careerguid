import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Modal, Alert, RefreshControl, LayoutAnimation, Platform, UIManager, Linking } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, S, withOpacity } from '../../theme';
import { API_URL } from '../../config';
import { useApp } from '../../AppContext';
import { useTasks, todayStr } from '../../useTasks';
import TaskRow from '../../components/TaskRow';
import Toast from '../../components/Toast';
import Skeleton from '../../components/Skeleton';
import * as docStorage from '../../docStorage';
import { pickDailyDueDates } from '../../taskPacing';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATS = { documents: '📄', languages: '🗣', universities: '🏫', essays: '✍️', study: '📚', finances: '💰', other: '📌' };

export default function PlanTab({ navigation }) {
  const { token, user, onboarding } = useApp();
  const insets = useSafeAreaInsets();
  const { tasks, ref, load, addMany, toggle, remove } = useTasks(user?.email);

  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('other');
  const [breaking, setBreaking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localFor, setLocalFor] = useState(null);
  const [localData, setLocalData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const planItems = tasks.filter(t => t.origin === 'plan');
  const showToast = (message, actionLabel, onAction) => setToast({ message, actionLabel, onAction });

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function addPlanItem() {
    if (!title.trim()) return;
    addMany([{ id: Date.now(), title: title.trim(), category: cat, origin: 'plan', done: false, createdAt: todayStr() }]);
    setTitle('');
    setCat('other');
    setShowAdd(false);
  }

  const findLocal = useCallback(async (item) => {
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
  }, [token, onboarding]);

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
        const existingDue = ref.current.filter(t => t.origin === 'ai-daily' && !t.done).map(t => t.dueDate);
        const dueDates = pickDailyDueDates(data.tasks.length, existingDue);
        const added = addMany(data.tasks.map((t, i) => ({
          id: Date.now() + i, title: t.title, category: t.category || 'other',
          type: 'daily', dueDate: dueDates[i], note: t.note || '', origin: 'ai-daily', done: false,
        })));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        showToast(`${added} задач добавлено — распределены по дням. Открой «Сегодня».`);
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
    } catch { return; }
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' });
      const res = await fetch(`${API_URL}/api/parse-document`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert('Ошибка', data.error || 'Не удалось прочитать документ'); setUploading(false); return; }
      const items = data.items || [];
      const added = addMany(items.map((it, i) => ({
        id: Date.now() + i, title: it.title, category: it.category || 'other',
        note: it.note || '', origin: 'plan', done: false, createdAt: todayStr(),
      })));
      if (file.size && file.size <= docStorage.MAX_DOC_SIZE) {
        try { await docStorage.saveDocument(user?.email, file); } catch {}
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast(`Из документа добавлено ${added} задач в план`);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить документ');
    }
    setUploading(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={s.page}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
      >
        <View style={[s.header, { paddingTop: 16 + insets.top }]}>
          <Text style={s.title}>План поступления</Text>
          {onboarding?.goal ? <Text style={s.goal}>🎯 {onboarding.goal}</Text> : null}
        </View>

        <View style={s.actions}>
          <TouchableOpacity style={[S.btn, S.btnPrimary, { flex: 1 }]} onPress={() => setShowAdd(true)}>
            <Text style={S.btnText}>+ Задача</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.secondaryBtn, { flex: 1 }]} onPress={breakIntoDays} disabled={breaking || planItems.length === 0}>
            <Text style={s.secondaryBtnText}>{breaking ? 'Разбиваю...' : '🤖 Разбить на дни'}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.actions}>
          <TouchableOpacity style={s.docBtn} onPress={uploadDocument} disabled={uploading}>
            <Text style={s.docBtnText}>{uploading ? 'Читаю документ...' : '📄 Загрузить документ — AI добавит задачи'}</Text>
          </TouchableOpacity>
        </View>

        {planItems.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📭</Text>
            <Text style={s.emptyText}>Пусто. Добавь первую задачу плана или загрузи документ.</Text>
          </View>
        ) : planItems.map(item => (
          <View key={item.id}>
            <TaskRow task={item} onToggle={toggle} onDelete={t => remove(t, showToast)} onFindLocal={findLocal} />
            {localFor === item.id && localData && (
              <View style={s.localPanel}>
                {localData.loading && (
                  <>
                    <Skeleton height={13} width="60%" style={{ marginBottom: 10 }} />
                    <Skeleton height={44} style={{ marginBottom: 8 }} />
                    <Skeleton height={44} />
                  </>
                )}
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

        <Modal visible={showAdd} transparent animationType="slide">
          <View style={s.modal}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Новая задача плана</Text>
              <TextInput style={[S.input, { marginBottom: 12 }]} value={title} onChangeText={setTitle} placeholder="Например: Сдать IELTS до марта" placeholderTextColor={C.faint} autoFocus />
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
                <TouchableOpacity style={[S.btn, S.btnPrimary, { flex: 1 }]} onPress={addPlanItem}>
                  <Text style={S.btnText}>Добавить</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.bg2, paddingHorizontal: 20, paddingBottom: 18 },
  title: { color: C.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
  goal: { color: C.muted, fontSize: 13, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  secondaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  secondaryBtnText: { color: C.text, fontWeight: '700', fontSize: 13 },
  docBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  docBtnText: { color: C.text, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  empty: { alignItems: 'center', paddingTop: 48, paddingBottom: 20, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: C.muted, fontSize: 15, textAlign: 'center' },
  hairline: { height: 1, backgroundColor: C.border, marginLeft: 70 },
  localPanel: { marginTop: 6, marginBottom: 6, marginHorizontal: 16, backgroundColor: withOpacity('#ffffff', 0.04), borderRadius: 12, padding: 10, gap: 8 },
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
  catBtnActive: { borderColor: C.primary, backgroundColor: withOpacity(C.primary, 0.2) },
  catIcon: { fontSize: 20 },
  modalBtns: { flexDirection: 'row', gap: 10 },
});
