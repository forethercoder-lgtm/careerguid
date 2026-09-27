import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { C, S, withOpacity } from '../theme';
import { getJSON } from '../storage';

const TARGETS = [
  ['Бакалавр', '6.0–6.5 overall, не ниже 5.5–6.0 за секцию'],
  ['Магистр', '6.5–7.0 overall, не ниже 6.0–6.5 за секцию'],
  ['PhD / топ-вузы', '7.0+, письмо 6.5–7.0'],
];

const CRITERIA = [
  ['Task Response', 'Ответить на ВСЕ части вопроса, ясная позиция, идеи с примерами. Минимум 250 слов.'],
  ['Coherence & Cohesion', 'Один абзац — одна мысль, уместные связки, есть вступление и вывод.'],
  ['Lexical Resource', 'Разнообразная лексика, синонимы вместо повторов, точная сочетаемость.'],
  ['Grammatical Range', 'Разные конструкции (условные, пассив, сложноподчинённые), большинство фраз без ошибок.'],
];

const PLAN = [
  ['Неделя 1', 'Диагностика: 1 полный пробный тест. Разобрать формат всех секций. Завести словарь.'],
  ['Неделя 2', 'Listening (section 1–2), Reading: skimming/scanning, True/False/Not Given.'],
  ['Неделя 3', 'Writing Task 1: язык трендов, 4 эссе по образцу. Speaking Part 1 на диктофон.'],
  ['Неделя 4', 'Writing Task 2: структура, 3 типа вопросов, 3 эссе + самопроверка. 50 тематических коллокаций.'],
  ['Неделя 5', 'Listening (section 3–4), Reading: matching headings. Промежуточный mock (L+R).'],
  ['Неделя 6', 'Writing Task 2: оставшиеся типы, 4 эссе. Speaking Part 2: 10 cue cards с таймером.'],
  ['Неделя 7', 'Полный mock под таймер. Speaking Part 3. Точечно закрыть слабую секцию.'],
  ['Неделя 8', '2 полных mock с проверкой. Повторить словарь и связки. Перед экзаменом — лёгкое повторение.'],
];

const PROMPTS = [
  'Some people think university education should be free for everyone. To what extent do you agree or disagree?',
  'Many young people leave their home country to work abroad. Discuss the advantages and disadvantages.',
  'Online learning is becoming more common. Do the benefits outweigh the drawbacks?',
  'In many cities traffic and pollution are serious problems. What causes this and what solutions can you suggest?',
  'Some believe schools should teach practical skills; others think academic subjects matter more. Discuss both views and give your opinion.',
];

const RESOURCES = [
  ['British Council — IELTS Ready (бесплатно)', 'https://takeielts.britishcouncil.org/prepare/ielts-ready'],
  ['Бесплатные пробные тесты + бланки', 'https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests'],
  ['Writing Band Descriptors (PDF, Cambridge)', 'https://takeielts.britishcouncil.org/sites/default/files/ielts_writing_band_descriptors.pdf'],
  ['Speaking Band Descriptors (PDF)', 'https://takeielts.britishcouncil.org/sites/default/files/ielts_speaking_band_descriptors.pdf'],
  ['IELTS Online Tests (банк практик)', 'https://ieltsonlinetests.com/'],
];

export default function IeltsScreen({ navigation, route }) {
  const { token, user } = route.params || {};
  const insets = useSafeAreaInsets();
  const [lastResult, setLastResult] = useState(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      if (!user?.email) return;
      const r = await getJSON(`ielts_result_${user.email}`);
      setLastResult(r);
    })();
  }, [user?.email]));

  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 20, paddingTop: 14 + insets.top, paddingBottom: 40 + insets.bottom }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>← Назад</Text></TouchableOpacity>
        <Text style={s.title}>Подготовка к IELTS</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={s.ctaCard}>
        {lastResult ? (
          <>
            <Text style={s.ctaTitle}>Твой уровень: ~{Number(lastResult.estimatedBand).toFixed(1)} · цель {Number(lastResult.targetBand).toFixed(1)}</Text>
            <Text style={s.p}>Пройдено {lastResult.takenAt}. Пройди тест ещё раз, чтобы обновить прогноз.</Text>
          </>
        ) : (
          <>
            <Text style={s.ctaTitle}>🎯 Не знаешь свой уровень?</Text>
            <Text style={s.p}>Пройди тест на 5 минут — узнаешь примерный балл, поставишь цель и получишь план подготовки.</Text>
          </>
        )}
        <TouchableOpacity style={[S.btn, S.btnPrimary, { marginTop: 12 }]} onPress={() => navigation.navigate('IeltsPretest', { token, user })}>
          <Text style={S.btnText}>{lastResult ? 'Пройти тест заново →' : 'Пройти тест уровня →'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.learnCard} onPress={() => navigation.navigate('Learn', { token })}>
        <Text style={s.ctaTitle}>📚 Уроки и материалы</Text>
        <Text style={s.p}>19 уроков по всем навыкам, банк из 24 эссе, cue cards для Speaking и гайды по поступлению за рубеж</Text>
      </TouchableOpacity>

      <Section title="Формат">
        <Text style={s.p}>Listening 30 мин · Reading 60 мин · Writing 60 мин · Speaking 11–14 мин. Каждая секция 1–9, overall — среднее. Результат действует 2 года.</Text>
      </Section>

      <Section title="Сколько нужно баллов">
        {TARGETS.map(([k, v]) => (
          <View key={k} style={s.row}><Text style={s.rowK}>{k}</Text><Text style={s.rowV}>{v}</Text></View>
        ))}
        <Text style={s.note}>Точный порог всегда смотри на странице программы.</Text>
      </Section>

      <Section title="Writing Task 2 — критерии оценки">
        {CRITERIA.map(([k, v]) => (
          <View key={k} style={s.block}><Text style={s.blockK}>{k}</Text><Text style={s.p}>{v}</Text></View>
        ))}
        <Text style={s.note}>Структура: вступление → тело 1 (мысль + пример) → тело 2 → вывод. 4 абзаца, 260–290 слов.</Text>
      </Section>

      <Section title="План на 8 недель">
        {PLAN.map(([k, v]) => (
          <View key={k} style={s.block}><Text style={s.blockK}>{k}</Text><Text style={s.p}>{v}</Text></View>
        ))}
      </Section>

      <Section title="Темы для тренировки эссе">
        {PROMPTS.map((t, i) => <Text key={i} style={s.bullet}>• {t}</Text>)}
        <Text style={s.note}>Напиши эссе и проверь его во вкладке «Ещё → Проверка эссе».</Text>
      </Section>

      <Section title="Бесплатные материалы">
        {RESOURCES.map(([label, url]) => (
          <TouchableOpacity key={url} onPress={() => Linking.openURL(url)}>
            <Text style={s.link}>🔗 {label}</Text>
          </TouchableOpacity>
        ))}
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  back: { color: C.muted, fontSize: 13, fontWeight: '600', width: 48 },
  title: { color: C.text, fontSize: 17, fontWeight: '800' },
  ctaCard: { backgroundColor: withOpacity(C.primary, 0.1), borderWidth: 1, borderColor: C.primary, borderRadius: 14, padding: 16, marginBottom: 16 },
  ctaTitle: { color: C.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  learnCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginBottom: 16 },
  section: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '800', marginBottom: 10 },
  p: { color: C.muted, fontSize: 13, lineHeight: 19 },
  note: { color: C.faint, fontSize: 12, lineHeight: 17, marginTop: 8, fontStyle: 'italic' },
  bullet: { color: C.muted, fontSize: 13, lineHeight: 20, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  rowK: { color: C.text, fontSize: 13, fontWeight: '700', width: 110 },
  rowV: { color: C.muted, fontSize: 13, flex: 1, lineHeight: 18 },
  block: { marginBottom: 10 },
  blockK: { color: C.primary, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  link: { color: C.primary, fontSize: 13, fontWeight: '600', paddingVertical: 7 },
});
