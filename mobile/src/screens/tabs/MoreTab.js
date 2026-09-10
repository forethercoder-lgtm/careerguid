import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking, LayoutAnimation } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { C, S, withOpacity } from '../../theme';
import { API_URL } from '../../config';
import { useApp } from '../../AppContext';
import { useEntitlements } from '../../entitlements';
import { useTasks, todayStr } from '../../useTasks';
import Skeleton from '../../components/Skeleton';
import Toast from '../../components/Toast';
import * as docStorage from '../../docStorage';

export default function MoreTab({ navigation }) {
  const { token, user, onboarding } = useApp();
  const { canUseAi, recordAiUse } = useEntitlements();
  const insets = useSafeAreaInsets();
  const { addMany } = useTasks(user?.email);

  const [sch, setSch] = useState(null); // null | {loading} | {error} | {results}
  const [schOpen, setSchOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [toast, setToast] = useState(null);

  useFocusEffect(useCallback(() => {
    (async () => setDocuments(await docStorage.getDocuments(user?.email)))();
  }, [user?.email]));

  async function findScholarships() {
    if (!canUseAi) { navigation.navigate('Premium'); return; }
    if (!schOpen) setSchOpen(true);
    setSch({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/suggest-scholarships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ specialty: onboarding?.goal, educationLevel: onboarding?.level }),
      });
      const data = await res.json();
      if (!res.ok) { setSch({ error: data.error || 'Ошибка' }); return; }
      await recordAiUse();
      setSch({ results: data.scholarships || [] });
    } catch {
      setSch({ error: 'Сервер недоступен' });
    }
  }

  function addScholarship(item) {
    addMany([{
      id: Date.now(),
      title: `Подать на стипендию «${item.name}»${item.deadline ? ' до ' + item.deadline : ''}`,
      category: 'finances', note: item.whyFit || item.eligibility || '', origin: 'plan', done: false, createdAt: todayStr(),
    }]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setToast({ message: 'Стипендия добавлена в план' });
  }

  async function deleteDoc(id) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDocuments(await docStorage.deleteDocument(user?.email, id));
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView style={s.page} contentContainerStyle={{ padding: 20, paddingTop: 16 + insets.top, paddingBottom: 40 + insets.bottom }}>
        <Text style={s.title}>Ещё</Text>

        <Text style={s.sectionTitle}>Инструменты ИИ</Text>

        <TouchableOpacity style={s.tile} onPress={findScholarships} disabled={sch?.loading}>
          <Text style={s.tileIcon}>💰</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.tileTitle}>Поиск стипендий</Text>
            <Text style={s.tileText}>{sch?.loading ? 'Ищу подходящие программы...' : 'Стипендии и гранты под твою специальность'}</Text>
          </View>
        </TouchableOpacity>

        {schOpen && sch && (
          <View style={s.panel}>
            {sch.loading && (<><Skeleton height={70} style={{ marginBottom: 8 }} /><Skeleton height={70} /></>)}
            {sch.error && <Text style={s.err}>⚠️ {sch.error}</Text>}
            {sch.results?.length === 0 && <Text style={s.muted}>Ничего не найдено</Text>}
            {sch.results?.map((item, i) => (
              <View key={i} style={s.schItem}>
                <Text style={s.schName}>{item.name}</Text>
                <Text style={s.schMeta}>💰 {item.amount} · 📅 {item.deadline}{item.country ? ` · ${item.country}` : ''}</Text>
                {item.eligibility ? <Text style={s.schMeta}>{item.eligibility}</Text> : null}
                {item.whyFit ? <Text style={s.schMeta}>{item.whyFit}</Text> : null}
                <TouchableOpacity style={s.addBtn} onPress={() => addScholarship(item)}>
                  <Text style={s.addBtnText}>+ В план</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={s.tile}
          onPress={() => navigation.navigate(canUseAi ? 'EssayFeedback' : 'Premium', canUseAi ? { token } : undefined)}
        >
          <Text style={s.tileIcon}>✍️</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.tileTitle}>Проверка эссе {!canUseAi && <Text style={s.lock}>🔒</Text>}</Text>
            <Text style={s.tileText}>ИИ разберёт мотивационное письмо и даст оценку</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={s.tile} onPress={() => navigation.navigate('Ielts')}>
          <Text style={s.tileIcon}>🗣</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.tileTitle}>Подготовка к IELTS</Text>
            <Text style={s.tileText}>Критерии, план на 8 недель, бесплатные материалы</Text>
          </View>
        </TouchableOpacity>

        <Text style={s.sectionTitle}>Мои документы</Text>
        {documents.length === 0 ? (
          <View style={s.card}><Text style={s.muted}>Загруженные документы появятся здесь. Загрузить можно во вкладке «План».</Text></View>
        ) : documents.map(doc => (
          <View key={doc.id} style={s.docRow}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => Linking.openURL(doc.uri)}>
              <Text style={s.docName} numberOfLines={1}>{doc.name}</Text>
              <Text style={s.muted}>{doc.size ? `${Math.round(doc.size / 1024)} КБ` : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteDoc(doc.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ fontSize: 18 }}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  title: { color: C.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
  sectionTitle: { color: C.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 22, marginBottom: 10 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  tileIcon: { fontSize: 24 },
  tileTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  lock: { fontSize: 12 },
  tileText: { color: C.muted, fontSize: 12, marginTop: 2, lineHeight: 16 },
  panel: { backgroundColor: withOpacity('#ffffff', 0.04), borderRadius: 12, padding: 10, gap: 8, marginBottom: 10 },
  err: { color: C.danger, fontSize: 13 },
  muted: { color: C.muted, fontSize: 12, lineHeight: 16 },
  schItem: { backgroundColor: C.bg2, borderRadius: 8, padding: 10 },
  schName: { color: C.text, fontWeight: '700', fontSize: 13, marginBottom: 3 },
  schMeta: { color: C.muted, fontSize: 12, lineHeight: 16 },
  addBtn: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { color: C.text, fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
  docName: { color: C.text, fontSize: 14, fontWeight: '600' },
});
