import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { C, S } from '../theme';
import { API_URL } from '../config';
import { getJSON, setJSON } from '../storage';

export default function OrientationResultsScreen({ route, navigation }) {
  const { token, user, onboarding, lastMessage } = route.params;
  const [step, setStep] = useState('specialties'); // specialties | universities
  const [loading, setLoading] = useState(true);
  const [specialties, setSpecialties] = useState([]);
  const [selected, setSelected] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadSpecialties(); }, []);

  async function loadSpecialties() {
    try {
      const res = await fetch(`${API_URL}/api/suggest-specialties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lastMessage }),
      });
      const data = await res.json();
      setSpecialties(data.specialties || []);
    } catch { }
    setLoading(false);
  }

  async function pickSpecialty(sp) {
    setSelected(sp);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/suggest-universities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          specialty: sp.title,
          strategy: onboarding?.strategy,
          countries: onboarding?.countries,
          educationLevel: onboarding?.level,
        }),
      });
      const data = await res.json();
      setUniversities(data.universities || []);
      setStep('universities');
    } catch { }
    setLoading(false);
  }

  async function addToPlan() {
    const best = universities.find(u => u.isBestPick) || universities[0];
    setAdding(true);
    try {
      const res = await fetch(`${API_URL}/api/generate-starter-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          specialty: selected?.title,
          university: best ? `${best.name} (${best.country})` : '',
          goal: onboarding?.goal,
        }),
      });
      const data = await res.json();
      const items = data.items || [];
      const today = new Date().toISOString().split('T')[0];
      const newItems = items.map((it, i) => ({
        id: Date.now() + i, title: it.title, category: it.category || 'other',
        note: it.note || '', origin: 'plan', done: false, createdAt: today,
      }));
      const key = `tasks_${user?.email}`;
      const existing = await getJSON(key) || [];
      const merged = [...existing, ...newItems.filter(nt => !existing.some(e => e.title === nt.title))];
      await setJSON(key, merged);
      navigation.replace('Plan', { token, user, onboarding });
    } catch { }
    setAdding(false);
  }

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text style={s.loadText}>{step === 'specialties' ? 'Анализирую результаты...' : 'Ищу университеты...'}</Text>
    </View>
  );

  if (step === 'specialties') {
    return (
      <View style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Твои специальности</Text>
          <Text style={s.sub}>Выбери одну чтобы продолжить</Text>
        </View>
        <FlatList
          data={specialties}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => pickSpecialty(item)}>
              <View style={s.cardTop}>
                <Text style={s.emoji}>{item.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  <Text style={s.cardDesc}>{item.description}</Text>
                </View>
              </View>
              <Text style={s.why}>{item.why}</Text>
              <View style={s.cardBottom}>
                <Text style={s.salary}>💰 {item.salary}</Text>
                <Text style={s.demand}>📈 {item.demand}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Text style={s.title}>Университеты</Text>
        <Text style={s.sub}>Для «{selected?.title}»</Text>
      </View>
      <FlatList
        data={universities}
        keyExtractor={(i, idx) => String(idx)}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={[s.uniCard, item.isBestPick && s.uniCardBest]}>
            {item.isBestPick && <Text style={s.bestBadge}>🏆 Рекомендуем</Text>}
            <Text style={s.cardTitle}>{item.name}</Text>
            <Text style={s.cardDesc}>{item.city ? `${item.city}, ` : ''}{item.country}</Text>
            {item.ranking && <Text style={s.uniMeta}>{item.ranking}</Text>}
            {item.tuition && <Text style={s.uniMeta}>💰 {item.tuition}</Text>}
            <Text style={s.why}>{item.whyFit}</Text>
          </View>
        )}
        ListFooterComponent={
          <TouchableOpacity style={[S.btn, S.btnPrimary, { marginTop: 12 }]} onPress={addToPlan} disabled={adding}>
            <Text style={S.btnText}>{adding ? 'Строю план...' : `Добавить план для «${selected?.title}» →`}</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadText: { color: C.muted, fontSize: 15 },
  header: { padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { color: C.text, fontSize: 22, fontWeight: '800' },
  sub: { color: C.muted, fontSize: 13, marginTop: 4 },
  list: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16 },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  emoji: { fontSize: 36 },
  cardTitle: { color: C.text, fontWeight: '800', fontSize: 16 },
  cardDesc: { color: C.muted, fontSize: 12, marginTop: 3 },
  why: { color: C.muted, fontSize: 13, lineHeight: 18, marginBottom: 6 },
  cardBottom: { flexDirection: 'row', gap: 16 },
  salary: { color: C.accent, fontSize: 13, fontWeight: '600' },
  demand: { color: C.success, fontSize: 13, fontWeight: '600' },
  uniCard: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16 },
  uniCardBest: { borderColor: C.accent, borderWidth: 2 },
  bestBadge: { color: C.accent, fontWeight: '700', fontSize: 12, marginBottom: 6 },
  uniMeta: { color: C.muted, fontSize: 12, marginTop: 2 },
});
