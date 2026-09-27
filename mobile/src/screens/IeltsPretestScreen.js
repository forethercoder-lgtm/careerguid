import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, S, withOpacity } from '../theme';
import { API_URL } from '../config';
import { setJSON } from '../storage';
import { useEntitlements } from '../entitlements';
import { useTasks, todayStr } from '../useTasks';

const WRITING_PROMPTS = [
  'Some people think university education should be free for everyone. To what extent do you agree or disagree?',
  'Many young people leave their home country to work abroad. Discuss the advantages and disadvantages.',
  'Online learning is becoming more common. Do the benefits outweigh the drawbacks?',
  'In many cities traffic and pollution are serious problems. What causes this and what solutions can you suggest?',
];

const TARGET_BANDS = [5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5];
const HOURS_OPTIONS = [
  { v: 3, label: '~3 ч/нед' },
  { v: 5, label: '~5 ч/нед' },
  { v: 10, label: '~10 ч/нед' },
  { v: 15, label: '15+ ч/нед' },
];

export default function IeltsPretestScreen({ navigation, route }) {
  const { token, user } = route.params || {};
  const { canUseAi, recordAiUse } = useEntitlements();
  const { addMany } = useTasks(user?.email);
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(1)).current;

  const [step, setStep] = useState('intro'); // intro | quiz | writing | goal | result
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // questionId -> choice index
  const [writingPrompt] = useState(WRITING_PROMPTS[Math.floor(Math.random() * WRITING_PROMPTS.length)]);
  const [writingText, setWritingText] = useState('');
  const [targetBand, setTargetBand] = useState(7.0);
  const [hoursPerWeek, setHoursPerWeek] = useState(5);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (step !== 'quiz' || questions.length > 0) return;
    setLoadingQuestions(true);
    fetch(`${API_URL}/api/ielts/pretest`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setQuestions(data.questions || []))
      .catch(() => setError('Не удалось загрузить вопросы теста'))
      .finally(() => setLoadingQuestions(false));
  }, [step]);

  function animateTo(nextStep) {
    Animated.sequence([
      Animated.timing(fade, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
    setStep(nextStep);
  }

  function pickAnswer(choiceIdx) {
    const q = questions[qIndex];
    setAnswers(a => ({ ...a, [q.id]: choiceIdx }));
    if (qIndex < questions.length - 1) {
      setTimeout(() => setQIndex(i => i + 1), 150);
    } else {
      setTimeout(() => animateTo('writing'), 150);
    }
  }

  async function submit() {
    if (!canUseAi) { navigation.navigate('Premium'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/ielts/pretest/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, choice]) => ({ questionId, choice })),
          writingText: writingText.trim() || undefined,
          writingPrompt,
          targetBand,
          hoursPerWeek,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Ошибка сервера'); setSubmitting(false); return; }
      await recordAiUse();
      setResult(data);
      await setJSON(`ielts_result_${user?.email}`, { ...data, takenAt: todayStr() });
      animateTo('result');
    } catch {
      setError('Сервер недоступен');
    }
    setSubmitting(false);
  }

  function addPlanToTasks() {
    if (!result?.studyPlan?.length) return;
    const items = result.studyPlan.map((w, i) => ({
      id: Date.now() + i,
      title: `IELTS — неделя ${w.week}: ${w.focus.split('.')[0]}`,
      category: 'languages',
      note: w.focus,
      origin: 'plan',
      done: false,
      createdAt: todayStr(),
    }));
    addMany(items);
    setAdded(true);
  }

  const insetsTop = { paddingTop: 14 + insets.top };

  return (
    <View style={[s.page, insetsTop]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => (step === 'intro' ? navigation.goBack() : animateTo('intro'))}>
          <Text style={s.back}>← Назад</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Тест уровня IELTS</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }}>
        <Animated.View style={{ opacity: fade }}>

          {step === 'intro' && (
            <>
              <Text style={s.emoji}>🎯</Text>
              <Text style={S.title}>Узнай свой примерный уровень</Text>
              <Text style={[S.sub, { marginTop: 8 }]}>
                Короткий тест (~5 минут): 18 вопросов на грамматику и лексику + необязательное эссе.
                Дальше укажешь желаемый балл — и получишь прикидку, сколько времени нужно на подготовку,
                плюс план, который можно сразу добавить в свои задачи.
              </Text>
              <Text style={[S.sub, s.note]}>
                Это не официальный результат IELTS — только ориентир. Для точной оценки пройди бесплатный
                мок-тест British Council (ссылка есть на этом экране ниже, во вкладке «Подготовка к IELTS»).
              </Text>
              <TouchableOpacity style={[S.btn, S.btnPrimary, { marginTop: 24 }]} onPress={() => animateTo('quiz')}>
                <Text style={S.btnText}>Начать тест →</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'quiz' && (
            loadingQuestions ? (
              <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
            ) : questions.length === 0 ? (
              <Text style={s.errorText}>{error || 'Вопросы не загрузились'}</Text>
            ) : (
              <>
                <Text style={s.stepLabel}>Вопрос {qIndex + 1} / {questions.length}</Text>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${((qIndex + 1) / questions.length) * 100}%` }]} />
                </View>
                {questions[qIndex].passage && (
                  <View style={s.passageBox}><Text style={s.passageText}>{questions[qIndex].passage}</Text></View>
                )}
                <Text style={s.question}>{questions[qIndex].prompt}</Text>
                <View style={{ gap: 8, marginTop: 14 }}>
                  {questions[qIndex].options.map((opt, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[s.optionBtn, answers[questions[qIndex].id] === i && s.optionBtnActive]}
                      onPress={() => pickAnswer(i)}
                    >
                      <Text style={[s.optionText, answers[questions[qIndex].id] === i && s.optionTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )
          )}

          {step === 'writing' && (
            <>
              <Text style={s.question}>Writing Task 2 (необязательно)</Text>
              <Text style={[S.sub, { marginBottom: 12 }]}>
                Если напишешь короткое эссе (от 150 слов), ИИ оценит его по официальным критериям —
                прикидка уровня будет точнее.
              </Text>
              <View style={s.promptBox}><Text style={s.promptText}>{writingPrompt}</Text></View>
              <TextInput
                style={[S.input, s.textarea]}
                value={writingText}
                onChangeText={setWritingText}
                placeholder="Напиши эссе здесь (можно пропустить)..."
                placeholderTextColor={C.faint}
                multiline
              />
              <Text style={s.wordCount}>{writingText.trim() ? writingText.trim().split(/\s+/).length : 0} слов</Text>
              <TouchableOpacity style={[S.btn, S.btnPrimary, { marginTop: 10 }]} onPress={() => animateTo('goal')}>
                <Text style={S.btnText}>{writingText.trim() ? 'Далее →' : 'Пропустить →'}</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'goal' && (
            <>
              <Text style={s.question}>Какой балл — твоя цель?</Text>
              <View style={s.chipsGrid}>
                {TARGET_BANDS.map(b => (
                  <TouchableOpacity key={b} style={[s.chip, targetBand === b && s.chipActive]} onPress={() => setTargetBand(b)}>
                    <Text style={[s.chipText, targetBand === b && s.chipTextActive]}>{b.toFixed(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.question, { marginTop: 22 }]}>Сколько часов в неделю готов уделять?</Text>
              <View style={s.chipsGrid}>
                {HOURS_OPTIONS.map(h => (
                  <TouchableOpacity key={h.v} style={[s.chip, hoursPerWeek === h.v && s.chipActive]} onPress={() => setHoursPerWeek(h.v)}>
                    <Text style={[s.chipText, hoursPerWeek === h.v && s.chipTextActive]}>{h.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {error && <Text style={s.errorText}>{error}</Text>}
              <TouchableOpacity style={[S.btn, S.btnPrimary, { marginTop: 24 }]} onPress={submit} disabled={submitting}>
                <Text style={S.btnText}>{submitting ? 'Считаю результат...' : 'Показать результат →'}</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'result' && result && (
            <>
              <Text style={s.emoji}>📊</Text>
              <Text style={S.title}>Твой примерный уровень: {result.estimatedBand.toFixed(1)}</Text>
              <Text style={[S.sub, { marginTop: 6 }]}>Цель: {result.targetBand.toFixed(1)}</Text>

              <View style={s.resultCard}>
                <Text style={s.resultRow}>✅ Правильных ответов: {result.objective.correct} / {result.objective.total}</Text>
                {result.writing?.overallBand != null && (
                  <>
                    <Text style={s.resultRow}>✍️ Эссе (ИИ-оценка): {result.writing.overallBand.toFixed(1)}</Text>
                    {result.writing.strengths?.map((str, i) => <Text key={'s' + i} style={s.resultSub}>+ {str}</Text>)}
                    {result.writing.improvements?.map((str, i) => <Text key={'i' + i} style={s.resultSub}>→ {str}</Text>)}
                  </>
                )}
                {result.writing?.feedback && !result.writing.overallBand && (
                  <Text style={s.resultSub}>{result.writing.feedback}</Text>
                )}
              </View>

              <View style={s.resultCard}>
                <Text style={s.resultTitle}>⏱ Сколько нужно времени</Text>
                {result.timeline.gapSteps === 0 ? (
                  <Text style={s.resultRow}>{result.timeline.message}</Text>
                ) : (
                  <Text style={s.resultRow}>
                    Примерно {result.timeline.weeksLow}–{result.timeline.weeksHigh} недель
                    {' '}(≈{Math.round(result.timeline.weeksLow / 4.3)}–{Math.round(result.timeline.weeksHigh / 4.3)} мес.)
                    {' '}при {hoursPerWeek} ч/нед.
                  </Text>
                )}
                <Text style={s.note}>Это грубая рыночная прикидка (не официальная гарантия IELTS) — реальный темп зависит от твоего старта и регулярности занятий.</Text>
              </View>

              {result.studyPlan?.length > 0 && (
                <TouchableOpacity style={[S.btn, S.btnPrimary, { marginTop: 6 }]} onPress={addPlanToTasks} disabled={added}>
                  <Text style={S.btnText}>{added ? 'План добавлен ✓' : `Добавить план (${result.studyPlan.length} нед.) в мои задачи`}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={s.ghostBtn} onPress={() => navigation.goBack()}>
                <Text style={s.ghostBtnText}>Готово</Text>
              </TouchableOpacity>
            </>
          )}

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  back: { color: C.muted, fontSize: 13, fontWeight: '600', width: 48 },
  headerTitle: { color: C.text, fontSize: 16, fontWeight: '800' },
  emoji: { fontSize: 40, marginBottom: 10 },
  note: { color: C.faint, fontSize: 12, lineHeight: 17, marginTop: 10, fontStyle: 'italic' },
  stepLabel: { color: C.faint, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  progressTrack: { height: 6, backgroundColor: C.surface, borderRadius: 3, overflow: 'hidden', marginBottom: 18 },
  progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
  passageBox: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, marginBottom: 14 },
  passageText: { color: C.muted, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  question: { color: C.text, fontSize: 18, fontWeight: '800', lineHeight: 25 },
  optionBtn: { padding: 14, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  optionBtnActive: { borderColor: C.primary, backgroundColor: withOpacity(C.primary, 0.12) },
  optionText: { color: C.muted, fontSize: 14, fontWeight: '600' },
  optionTextActive: { color: C.text },
  promptBox: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, marginBottom: 14 },
  promptText: { color: C.text, fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  textarea: { minHeight: 160, textAlignVertical: 'top' },
  wordCount: { color: C.faint, fontSize: 12, marginTop: 6, textAlign: 'right' },
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: withOpacity(C.primary, 0.18), borderColor: C.primary },
  chipText: { color: C.muted, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: C.text },
  errorText: { color: C.danger, fontSize: 13, marginTop: 12 },
  resultCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginTop: 16 },
  resultTitle: { color: C.text, fontSize: 14, fontWeight: '800', marginBottom: 8 },
  resultRow: { color: C.text, fontSize: 14, fontWeight: '600', marginBottom: 4, lineHeight: 20 },
  resultSub: { color: C.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  ghostBtn: { marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  ghostBtnText: { color: C.muted, fontWeight: '700', fontSize: 14 },
});
