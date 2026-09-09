import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, S, withOpacity } from '../theme';
import { getJSON, setJSON } from '../storage';

const COUNTRIES = ['🇩🇪 Германия', '🇨🇦 Канада', '🇳🇱 Нидерланды', '🇬🇧 Великобритания', '🇺🇸 США', '🇦🇺 Австралия', '🇸🇪 Швеция', '🇨🇿 Чехия', '🇫🇮 Финляндия', '🇯🇵 Япония'];
const INTERESTS = ['💻 IT и программирование', '💼 Бизнес и менеджмент', '🎨 Дизайн и искусство', '⚕️ Медицина', '⚙️ Инженерия', '🔬 Науки', '📚 Гуманитарные науки', '⚖️ Право', '🌱 Экология', '🎬 Медиа и кино'];
const BUDGETS = ['До $10,000/год', '$10,000–20,000/год', '$20,000–30,000/год', 'Выше $30,000/год', 'Ищу стипендии и гранты'];
const LEVELS = [
  { id: 'bachelor', label: 'Бакалавр (Bachelor)' },
  { id: 'master', label: 'Магистр (Master)' },
  { id: 'phd', label: 'PhD / Докторантура' },
];

const STEPS = ['Страны', 'Интересы', 'Бюджет', 'Образование'];

export default function PreferencesSurveyScreen({ navigation, route }) {
  const { user } = route.params || {};
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [prefs, setPrefs] = useState({ countries: [], interests: [], budget: '', educationLevel: '' });
  const fade = useRef(new Animated.Value(1)).current;

  function animateTo(next) {
    Animated.sequence([
      Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setStep(next);
  }

  function toggleMulti(key, val) {
    setPrefs(p => ({ ...p, [key]: p[key].includes(val) ? p[key].filter(v => v !== val) : [...p[key], val] }));
  }
  function setSingle(key, val) {
    setPrefs(p => ({ ...p, [key]: val }));
  }

  function canNext() {
    if (step === 0) return prefs.countries.length > 0;
    if (step === 1) return prefs.interests.length > 0;
    if (step === 2) return !!prefs.budget;
    if (step === 3) return !!prefs.educationLevel;
    return true;
  }

  async function finish() {
    setSaving(true);
    await setJSON(`prefs_${user?.email}`, prefs);
    setSaving(false);
    setDone(true);
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  if (done) {
    return (
      <View style={[s.page, s.doneWrap, { paddingTop: insets.top }]}>
        <Text style={s.doneEmoji}>🎉</Text>
        <Text style={S.title}>Опрос пройден!</Text>
        <Text style={[S.sub, s.doneSub]}>Спасибо! Твои предпочтения сохранены и помогут точнее подбирать рекомендации.</Text>
        <TouchableOpacity style={[S.btn, S.btnPrimary, { marginTop: 28, alignSelf: 'stretch' }]} onPress={() => navigation.goBack()}>
          <Text style={S.btnText}>Готово</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.page, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>← Назад</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Опрос предпочтений</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={s.stepLabel}>{step + 1} / {STEPS.length} · {STEPS[step]}</Text>

      <ScrollView contentContainerStyle={s.content}>
        <Animated.View style={{ opacity: fade }}>
          {step === 0 && (
            <>
              <Text style={s.question}>Какие страны рассматриваешь для учёбы?</Text>
              <Text style={s.hint}>Можно выбрать несколько</Text>
              <View style={s.chipsGrid}>
                {COUNTRIES.map(c => (
                  <TouchableOpacity key={c} style={[s.chip, prefs.countries.includes(c) && s.chipActive]} onPress={() => toggleMulti('countries', c)}>
                    <Text style={[s.chipText, prefs.countries.includes(c) && s.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <Text style={s.question}>Что тебя больше всего интересует?</Text>
              <Text style={s.hint}>Выбери 1–3 направления</Text>
              <View style={s.chipsGrid}>
                {INTERESTS.map(i => (
                  <TouchableOpacity key={i} style={[s.chip, prefs.interests.includes(i) && s.chipActive]} onPress={() => toggleMulti('interests', i)}>
                    <Text style={[s.chipText, prefs.interests.includes(i) && s.chipTextActive]}>{i}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={s.question}>Какой бюджет на обучение?</Text>
              <Text style={s.hint}>Стоимость в год, включая проживание</Text>
              <View style={{ gap: 8 }}>
                {BUDGETS.map(b => (
                  <TouchableOpacity key={b} style={[s.radioBtn, prefs.budget === b && s.radioBtnActive]} onPress={() => setSingle('budget', b)}>
                    <View style={[s.radioCircle, prefs.budget === b && s.radioCircleActive]}>{prefs.budget === b && <View style={s.radioDot} />}</View>
                    <Text style={[s.radioText, prefs.budget === b && s.radioTextActive]}>{b}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={s.question}>Какой уровень программы ищешь?</Text>
              <Text style={s.hint}>После какого образования поступаешь</Text>
              <View style={{ gap: 8 }}>
                {LEVELS.map(l => (
                  <TouchableOpacity key={l.id} style={[s.radioBtn, prefs.educationLevel === l.id && s.radioBtnActive]} onPress={() => setSingle('educationLevel', l.id)}>
                    <View style={[s.radioCircle, prefs.educationLevel === l.id && s.radioCircleActive]}>{prefs.educationLevel === l.id && <View style={s.radioDot} />}</View>
                    <Text style={[s.radioText, prefs.educationLevel === l.id && s.radioTextActive]}>{l.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>

      <View style={[s.actions, { paddingBottom: 16 + insets.bottom }]}>
        {step > 0 && (
          <TouchableOpacity style={s.ghostBtn} onPress={() => animateTo(step - 1)}>
            <Text style={s.ghostBtnText}>← Назад</Text>
          </TouchableOpacity>
        )}
        {step < STEPS.length - 1 ? (
          <TouchableOpacity style={[S.btn, S.btnPrimary, s.flexBtn, !canNext() && s.btnDisabled]} onPress={() => canNext() && animateTo(step + 1)} disabled={!canNext()}>
            <Text style={S.btnText}>Далее →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[S.btn, S.btnPrimary, s.flexBtn, !canNext() && s.btnDisabled]} onPress={finish} disabled={!canNext() || saving}>
            <Text style={S.btnText}>{saving ? 'Сохраняю...' : 'Готово! ✓'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  back: { color: C.muted, fontSize: 13, fontWeight: '600', width: 48 },
  headerTitle: { color: C.text, fontSize: 16, fontWeight: '800' },
  progressTrack: { height: 6, backgroundColor: C.surface, borderRadius: 3, marginHorizontal: 20, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
  stepLabel: { color: C.faint, fontSize: 12, fontWeight: '600', marginTop: 8, marginHorizontal: 20, marginBottom: 4 },
  content: { padding: 20, paddingBottom: 40 },
  question: { color: C.text, fontSize: 19, fontWeight: '800', marginBottom: 6 },
  hint: { color: C.muted, fontSize: 13, marginBottom: 16 },
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: withOpacity(C.primary, 0.18), borderColor: C.primary },
  chipText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: C.text },
  radioBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  radioBtnActive: { borderColor: C.primary, backgroundColor: withOpacity(C.primary, 0.1) },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.faint, alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: C.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  radioText: { color: C.muted, fontSize: 14, fontWeight: '600', flex: 1 },
  radioTextActive: { color: C.text },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 10 },
  flexBtn: { flex: 1 },
  btnDisabled: { opacity: 0.4 },
  ghostBtn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  ghostBtnText: { color: C.text, fontWeight: '700', fontSize: 15 },
  doneWrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  doneEmoji: { fontSize: 56, marginBottom: 16 },
  doneSub: { textAlign: 'center', marginTop: 10 },
});
