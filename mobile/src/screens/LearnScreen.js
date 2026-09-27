import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, S, withOpacity } from '../theme';
import { API_URL } from '../config';

const SKILL_LABELS = {
  listening: '🎧 Listening',
  reading: '📖 Reading',
  writingTask1: '✍️ Writing Task 1',
  writingTask2: '✍️ Writing Task 2 и прогресс по band',
  speaking: '🗣 Speaking',
  vocabulary: '📚 Лексика по темам',
  grammar: '🔤 Грамматика',
};
const SKILL_ORDER = ['listening', 'reading', 'writingTask1', 'writingTask2', 'speaking', 'vocabulary', 'grammar'];
const GUIDE_TYPE_LABELS = { general: 'Общие гайды', topic: 'По процессу поступления', country: 'По странам' };
const GUIDE_TYPE_ORDER = ['general', 'topic', 'country'];
const TABS = [
  { id: 'lessons', label: 'Уроки' },
  { id: 'practice', label: 'Практика' },
  { id: 'vocab', label: 'Словарь' },
  { id: 'guides', label: 'Гайды' },
];

export default function LearnScreen({ navigation, route }) {
  const { token } = route.params || {};
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('lessons');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [practiceSub, setPracticeSub] = useState('essays'); // essays | speaking
  const [vocabTopic, setVocabTopic] = useState(null);
  const [vocabSearch, setVocabSearch] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/ielts/learn`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setVocabTopic(Object.keys(d.vocabulary || {})[0] || null); })
      .catch(() => setError('Не удалось загрузить материалы'))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id) {
    setExpanded(e => ({ ...e, [id]: !e[id] }));
  }

  return (
    <View style={[s.page, { paddingTop: 14 + insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>← Назад</Text></TouchableOpacity>
        <Text style={s.title}>Уроки и материалы</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={s.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} style={[s.tab, tab === t.id && s.tabActive]} onPress={() => setTab(t.id)}>
            <Text style={[s.tabText, tab === t.id && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
      ) : error || !data ? (
        <Text style={s.errorText}>{error || 'Ошибка загрузки'}</Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }}>
          {tab === 'lessons' && SKILL_ORDER.map(skill => (
            <View key={skill} style={{ marginBottom: 18 }}>
              <Text style={s.skillTitle}>{SKILL_LABELS[skill]}</Text>
              {data.lessons.filter(l => l.skill === skill).map(l => (
                <TouchableOpacity key={l.id} style={s.card} onPress={() => toggle(l.id)} activeOpacity={0.8}>
                  <Text style={s.cardTitle}>{expanded[l.id] ? '▾ ' : '▸ '}{l.title}</Text>
                  {expanded[l.id] && (
                    <View style={{ marginTop: 8 }}>
                      {l.points.map((p, i) => <Text key={i} style={s.bullet}>• {p}</Text>)}
                      {l.tip && <Text style={s.tip}>💡 {l.tip}</Text>}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {tab === 'practice' && (
            <>
              <View style={s.subTabs}>
                <TouchableOpacity style={[s.subTab, practiceSub === 'essays' && s.subTabActive]} onPress={() => setPracticeSub('essays')}>
                  <Text style={[s.subTabText, practiceSub === 'essays' && s.subTabTextActive]}>Эссе ({Object.values(data.practiceBank).flat().length})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.subTab, practiceSub === 'speaking' && s.subTabActive]} onPress={() => setPracticeSub('speaking')}>
                  <Text style={[s.subTabText, practiceSub === 'speaking' && s.subTabTextActive]}>Speaking ({Object.values(data.part2Categories).flat().length})</Text>
                </TouchableOpacity>
              </View>

              {practiceSub === 'essays' && Object.entries(data.practiceBank).map(([cat, prompts]) => (
                <View key={cat} style={{ marginBottom: 16 }}>
                  <Text style={s.skillTitle}>{cat}</Text>
                  {prompts.map((p, i) => <View key={i} style={s.card}><Text style={s.promptText}>{p}</Text></View>)}
                </View>
              ))}

              {practiceSub === 'speaking' && Object.entries(data.part2Categories).map(([cat, topics]) => (
                <View key={cat} style={{ marginBottom: 16 }}>
                  <Text style={s.skillTitle}>{cat}</Text>
                  {topics.map((t, i) => {
                    const set = data.part3Sets.find(ps => ps.part2Topic === t);
                    const id = 'p2-' + cat + i;
                    return (
                      <TouchableOpacity key={id} style={s.card} onPress={() => set && toggle(id)} activeOpacity={set ? 0.8 : 1}>
                        <Text style={s.cardTitle}>{set ? (expanded[id] ? '▾ ' : '▸ ') : ''}{t}</Text>
                        {set && expanded[id] && (
                          <View style={{ marginTop: 8 }}>
                            <Text style={s.tip}>Вопросы Part 3 по теме:</Text>
                            {set.questions.map((q, qi) => <Text key={qi} style={s.bullet}>• {q}</Text>)}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </>
          )}

          {tab === 'vocab' && (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {Object.keys(data.vocabulary).map(topic => (
                  <TouchableOpacity key={topic} style={[s.subTab, vocabTopic === topic && s.subTabActive]} onPress={() => { setVocabTopic(topic); setVocabSearch(''); }}>
                    <Text style={[s.subTabText, vocabTopic === topic && s.subTabTextActive]}>{topic} ({data.vocabulary[topic].length})</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={s.vocabSearch}
                value={vocabSearch}
                onChangeText={setVocabSearch}
                placeholder="Поиск слова..."
                placeholderTextColor={C.faint}
              />
              {(data.vocabulary[vocabTopic] || [])
                .filter(w => !vocabSearch || w.word.toLowerCase().includes(vocabSearch.toLowerCase()))
                .map((w, i) => (
                  <View key={i} style={s.vocabRow}>
                    <Text><Text style={s.vocabWord}>{w.word}</Text><Text style={s.vocabPos}>  {w.pos}</Text></Text>
                    {w.example && <Text style={s.vocabExample}>{w.example}</Text>}
                  </View>
                ))}
            </>
          )}

          {tab === 'guides' && GUIDE_TYPE_ORDER.map(type => (
            <View key={type} style={{ marginBottom: 18 }}>
              <Text style={s.skillTitle}>{GUIDE_TYPE_LABELS[type]} ({data.guides.filter(g => g.type === type).length})</Text>
              {data.guides.filter(g => g.type === type).map(g => (
                <TouchableOpacity key={g.id} style={s.card} onPress={() => toggle(g.id)} activeOpacity={0.8}>
                  <Text style={s.cardTitle}>{expanded[g.id] ? '▾ ' : '▸ '}{g.title}</Text>
                  {expanded[g.id] && (
                    <View style={{ marginTop: 8 }}>
                      {g.sections.map((sec, i) => (
                        <View key={i} style={{ marginBottom: 10 }}>
                          <Text style={s.sectionHeading}>{sec.heading}</Text>
                          <Text style={s.sectionBody}>{sec.body}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  back: { color: C.muted, fontSize: 13, fontWeight: '600', width: 48 },
  title: { color: C.text, fontSize: 17, fontWeight: '800' },
  errorText: { color: C.danger, fontSize: 14, textAlign: 'center', marginTop: 40 },
  tabs: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 12, padding: 4, marginHorizontal: 20, marginTop: 10 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: C.primary },
  tabText: { color: C.muted, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  subTabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  subTab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  subTabActive: { backgroundColor: withOpacity(C.primary, 0.18), borderColor: C.primary },
  subTabText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  subTabTextActive: { color: C.text },
  skillTitle: { color: C.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  bullet: { color: C.muted, fontSize: 13, lineHeight: 19, marginBottom: 6 },
  tip: { color: C.primary, fontSize: 12, lineHeight: 18, marginTop: 4, fontStyle: 'italic' },
  promptText: { color: C.text, fontSize: 13, lineHeight: 19 },
  sectionHeading: { color: C.primary, fontSize: 13, fontWeight: '700', marginBottom: 3 },
  sectionBody: { color: C.muted, fontSize: 13, lineHeight: 19 },
  vocabSearch: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, color: C.text, fontSize: 13, marginBottom: 14 },
  vocabRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  vocabWord: { color: C.text, fontSize: 14, fontWeight: '700' },
  vocabPos: { color: C.faint, fontSize: 12, fontStyle: 'italic' },
  vocabExample: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
});
