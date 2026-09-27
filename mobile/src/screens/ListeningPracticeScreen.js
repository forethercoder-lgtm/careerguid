import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { C, S, withOpacity } from '../theme';
import { API_URL } from '../config';

function fmt(sec) {
  if (!sec || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function Player({ url }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  return (
    <View style={s.playerBox}>
      <TouchableOpacity style={s.playBtn} onPress={() => (status.playing ? player.pause() : player.play())}>
        <Text style={s.playBtnText}>{status.playing ? '⏸' : '▶'}</Text>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <View style={s.playerTrack}>
          <View style={[s.playerFill, { width: `${status.duration ? (status.currentTime / status.duration) * 100 : 0}%` }]} />
        </View>
        <Text style={s.playerTime}>{fmt(status.currentTime)} / {fmt(status.duration)}</Text>
      </View>
    </View>
  );
}

export default function ListeningPracticeScreen({ navigation, route }) {
  const { token } = route.params || {};
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState('list'); // list | section | result
  const [tests, setTests] = useState(null);
  const [test, setTest] = useState(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/ielts/listening`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setTests(d.tests || []))
      .catch(() => setError('Не удалось загрузить тесты'))
      .finally(() => setLoading(false));
  }, []);

  async function pickTest(t) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/ielts/listening/${t.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Ошибка'); setLoading(false); return; }
      setTest(data);
      setSectionIndex(0);
      setAnswers({});
      setStep('section');
    } catch {
      setError('Сервер недоступен');
    }
    setLoading(false);
  }

  function setAnswer(itemId, value) {
    setAnswers(a => ({ ...a, [itemId]: value }));
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/ielts/listening/${test.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers: Object.entries(answers).map(([itemId, value]) => ({ itemId, value })) }),
      });
      const data = await res.json();
      setResult(data);
      setStep('result');
    } catch {
      setError('Не удалось отправить ответы');
    }
    setSubmitting(false);
  }

  if (loading && step === 'list') {
    return <View style={s.center}><ActivityIndicator size="large" color={C.primary} /></View>;
  }

  const section = test?.sections?.[sectionIndex];

  return (
    <View style={[s.page, { paddingTop: 14 + insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => (step === 'list' ? navigation.goBack() : setStep('list'))}>
          <Text style={s.back}>← Назад</Text>
        </TouchableOpacity>
        <Text style={s.title}>Listening практика</Text>
        <View style={{ width: 48 }} />
      </View>

      {step === 'list' && (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }}>
          <Text style={s.hint}>Реальное аудио с текстами и вопросами, с автопроверкой.</Text>
          {error && <Text style={s.errorText}>{error}</Text>}
          {(tests || []).map(t => (
            <TouchableOpacity key={t.id} style={s.card} onPress={() => pickTest(t)}>
              <Text style={s.cardTitle}>{t.title}</Text>
              <Text style={s.cardMeta}>{t.sections.length} {t.sections.length === 1 ? 'секция' : 'секции'} · {t.sections.reduce((n, sec) => n + sec.itemCount, 0)} вопросов</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {step === 'section' && section && (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }}>
          <Text style={s.stepLabel}>Секция {sectionIndex + 1} / {test.sections.length}</Text>
          <View style={s.progressTrack}><View style={[s.progressFill, { width: `${((sectionIndex + 1) / test.sections.length) * 100}%` }]} /></View>

          <Text style={s.sectionTitle}>{section.title}</Text>
          <Player url={`${API_URL}${section.audioUrl}`} />

          {section.groups.map((g, gi) => (
            <View key={gi} style={{ marginBottom: 18, marginTop: 16 }}>
              <Text style={s.instructions}>{g.instructions}</Text>
              {g.items.map(item => (
                <View key={item.id} style={s.itemBox}>
                  <Text style={s.itemPrompt}>{item.prompt}</Text>
                  {item.kind === 'choice' ? (
                    <View style={{ gap: 6, marginTop: 8 }}>
                      {item.options.map((opt, oi) => (
                        <TouchableOpacity key={oi} style={[s.optionBtn, answers[item.id] === opt && s.optionBtnActive]} onPress={() => setAnswer(item.id, opt)}>
                          <Text style={[s.optionText, answers[item.id] === opt && s.optionTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <TextInput
                      style={s.textInput}
                      value={answers[item.id] || ''}
                      onChangeText={t => setAnswer(item.id, t)}
                      placeholder="Твой ответ..."
                      placeholderTextColor={C.faint}
                    />
                  )}
                </View>
              ))}
            </View>
          ))}

          {sectionIndex < test.sections.length - 1 ? (
            <TouchableOpacity style={[S.btn, S.btnPrimary]} onPress={() => setSectionIndex(i => i + 1)}>
              <Text style={S.btnText}>Следующая секция →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[S.btn, S.btnPrimary]} onPress={submit} disabled={submitting}>
              <Text style={S.btnText}>{submitting ? 'Проверяю...' : 'Завершить и проверить →'}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {step === 'result' && result && (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }}>
          <Text style={s.resultScore}>✅ {result.correct} / {result.total} правильных</Text>
          <Text style={s.hint}>Это не официальный балл IELTS. Ниже разбор по каждому вопросу.</Text>
          {result.details.map((d, i) => (
            <View key={i} style={[s.reviewRow, d.correct ? s.reviewRowOk : s.reviewRowBad]}>
              <Text style={s.reviewText}>{d.correct ? '✓' : '✗'} Твой ответ: {d.given || '—'}{!d.correct && `  →  правильный: ${d.correctAnswer}`}</Text>
            </View>
          ))}
          <TouchableOpacity style={[S.btn, S.btnPrimary, { marginTop: 16 }]} onPress={() => setStep('list')}>
            <Text style={S.btnText}>К списку тестов</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  back: { color: C.muted, fontSize: 13, fontWeight: '600', width: 48 },
  title: { color: C.text, fontSize: 17, fontWeight: '800' },
  hint: { color: C.muted, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  errorText: { color: C.danger, fontSize: 13, marginBottom: 12 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardMeta: { color: C.muted, fontSize: 12 },
  stepLabel: { color: C.faint, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  progressTrack: { height: 6, backgroundColor: C.surface, borderRadius: 3, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  playerBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14 },
  playBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  playBtnText: { color: '#fff', fontSize: 18 },
  playerTrack: { height: 5, backgroundColor: C.bg2, borderRadius: 3, overflow: 'hidden' },
  playerFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
  playerTime: { color: C.muted, fontSize: 11, marginTop: 4 },
  instructions: { color: C.primary, fontSize: 13, fontWeight: '700', marginBottom: 10 },
  itemBox: { marginBottom: 14 },
  itemPrompt: { color: C.text, fontSize: 13, fontWeight: '600', lineHeight: 19, marginBottom: 4 },
  optionBtn: { padding: 10, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  optionBtnActive: { borderColor: C.primary, backgroundColor: withOpacity(C.primary, 0.12) },
  optionText: { color: C.muted, fontSize: 13 },
  optionTextActive: { color: C.text, fontWeight: '600' },
  textInput: { marginTop: 6, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, color: C.text, fontSize: 13 },
  resultScore: { color: C.text, fontSize: 22, fontWeight: '900', marginBottom: 8 },
  reviewRow: { padding: 10, borderRadius: 10, marginBottom: 6, borderWidth: 1 },
  reviewRowOk: { backgroundColor: withOpacity(C.success, 0.1), borderColor: C.success },
  reviewRowBad: { backgroundColor: withOpacity(C.danger, 0.08), borderColor: C.danger },
  reviewText: { color: C.text, fontSize: 12, lineHeight: 17 },
});
