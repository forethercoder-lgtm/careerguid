import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { C, S, withOpacity } from '../../theme';
import { useApp } from '../../AppContext';
import { useEntitlements } from '../../entitlements';
import { getSavedUniversities } from '../../savedUniversities';

const LEVELS = { bachelor: 'Бакалавр', master: 'Магистр', phd: 'PhD' };
const STRATEGIES = { reach: '🚀 Амбициозная', balanced: '⚖️ Сбалансированная', safe: '🛡 Надёжная' };

export default function DiscoverTab({ navigation }) {
  const { token, user, onboarding } = useApp();
  const { canUseAi } = useEntitlements();
  const insets = useSafeAreaInsets();
  const [savedCount, setSavedCount] = useState(0);

  useFocusEffect(useCallback(() => {
    (async () => setSavedCount((await getSavedUniversities(user?.email)).length))();
  }, [user?.email]));

  const go = (screen, params) => navigation.navigate(screen, { token, user, onboarding, ...params });
  const goOrientation = () => (canUseAi ? go('OrientationChat') : navigation.navigate('Premium'));

  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 20, paddingTop: 16 + insets.top, paddingBottom: 40 + insets.bottom }}>
      <Text style={s.title}>Подбор</Text>
      <Text style={s.sub}>Определись со специальностью и университетом с помощью ИИ</Text>

      <TouchableOpacity style={s.hero} onPress={goOrientation}>
        <Text style={s.heroIcon}>🎓</Text>
        <Text style={s.heroTitle}>Карьерная ориентация {!canUseAi && <Text style={{ fontSize: 13 }}>🔒</Text>}</Text>
        <Text style={s.heroText}>Короткий диалог с ИИ-консультантом → 3 специальности под тебя и список университетов</Text>
        <View style={s.heroBtn}><Text style={s.heroBtnText}>Начать беседу →</Text></View>
      </TouchableOpacity>

      <TouchableOpacity style={s.card} onPress={() => navigation.navigate('PreferencesSurvey', { user })}>
        <Text style={s.cardTitle}>📋 Опрос предпочтений</Text>
        <Text style={s.cardText}>Страны, интересы, бюджет, уровень программы — чтобы подбор был точнее</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.card} onPress={() => navigation.navigate('SavedUniversities', { user })}>
        <Text style={s.cardTitle}>🏫 Мои университеты {savedCount > 0 ? `(${savedCount})` : ''}</Text>
        <Text style={s.cardText}>Подобранные вузы и твои заметки к каждому — можно вернуться в любой момент</Text>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>Твои настройки поступления</Text>
      <View style={s.card}>
        <Row label="Цель" value={onboarding?.goal || '—'} />
        <Row label="Уровень" value={LEVELS[onboarding?.level] || '—'} />
        <Row label="Стратегия" value={STRATEGIES[onboarding?.strategy] || '—'} />
        {onboarding?.targetSchool ? <Row label="Вуз мечты" value={onboarding.targetSchool} /> : null}
        <Row
          label="Локация"
          value={onboarding?.location?.manualCity || (onboarding?.location?.lat ? 'по геолокации' : '—')}
          last
        />
      </View>
    </ScrollView>
  );
}

function Row({ label, value, last }) {
  return (
    <View style={[s.row, !last && s.rowBorder]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  title: { color: C.text, fontSize: 22, fontWeight: '900' },
  sub: { color: C.muted, fontSize: 13, marginTop: 4, marginBottom: 20 },
  hero: { backgroundColor: withOpacity(C.primary, 0.12), borderWidth: 1, borderColor: C.primary, borderRadius: 18, padding: 20, marginBottom: 14 },
  heroIcon: { fontSize: 40, marginBottom: 8 },
  heroTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  heroText: { color: C.muted, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  heroBtn: { alignSelf: 'flex-start', backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  heroBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, marginBottom: 14 },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardText: { color: C.muted, fontSize: 12, lineHeight: 17 },
  sectionTitle: { color: C.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 10, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  rowLabel: { color: C.muted, fontSize: 13 },
  rowValue: { color: C.text, fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
});
