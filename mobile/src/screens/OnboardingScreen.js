import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import * as Location from 'expo-location';
import { C, S } from '../theme';
import { setJSON, getJSON } from '../storage';

const LEVELS = [
  { id: 'bachelor', label: 'Бакалавр' },
  { id: 'master', label: 'Магистр' },
  { id: 'phd', label: 'PhD' },
];
const STRATEGIES = [
  { id: 'reach', label: '🚀 Амбициозная' },
  { id: 'balanced', label: '⚖️ Сбалансированная' },
  { id: 'safe', label: '🛡 Надёжная' },
];

export default function OnboardingScreen({ navigation, route }) {
  const { token, user } = route.params;
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('');
  const [strategy, setStrategy] = useState('');
  const [targetSchool, setTargetSchool] = useState('');
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | requesting | granted | denied
  const [location, setLocation] = useState(null);
  const [manualCity, setManualCity] = useState('');
  const [saving, setSaving] = useState(false);

  async function requestLocation() {
    setGeoStatus('requesting');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setGeoStatus('denied'); return; }
      const pos = await Location.getCurrentPositionAsync({});
      setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      setGeoStatus('granted');
    } catch {
      setGeoStatus('denied');
    }
  }

  async function finish() {
    if (!goal.trim()) return Alert.alert('Ошибка', 'Расскажи о своей цели');
    if (!level) return Alert.alert('Ошибка', 'Выбери уровень образования');
    if (!strategy) return Alert.alert('Ошибка', 'Выбери стратегию поступления');

    setSaving(true);
    const finalLocation = location || (manualCity.trim() ? { manualCity: manualCity.trim() } : null);
    const onboarding = { goal: goal.trim(), level, strategy, targetSchool: targetSchool.trim(), location: finalLocation };
    await setJSON(`onboarding_${user?.email}`, onboarding);
    const existingTasks = await getJSON(`tasks_${user?.email}`) || [];
    const hasPlan = existingTasks.some(t => t.origin === 'plan');
    setSaving(false);
    if (hasPlan) navigation.replace('Plan', { token, user, onboarding });
    else navigation.replace('OrientationChat', { token, user, onboarding });
  }

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      <Text style={S.title}>Расскажи о себе</Text>
      <Text style={[S.sub, { marginBottom: 24 }]}>Это поможет ИИ-помощнику быть полезнее</Text>

      <Text style={S.label}>Твоя цель</Text>
      <TextInput
        style={[S.input, s.textarea]}
        value={goal}
        onChangeText={setGoal}
        placeholder="Например: хочу поступить на Computer Science в Германии"
        placeholderTextColor={C.faint}
        multiline
      />

      <Text style={[S.label, { marginTop: 20 }]}>Уровень образования</Text>
      <View style={s.row}>
        {LEVELS.map(l => (
          <TouchableOpacity key={l.id} style={[s.choice, level === l.id && s.choiceActive]} onPress={() => setLevel(l.id)}>
            <Text style={[s.choiceText, level === l.id && s.choiceTextActive]}>{l.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[S.label, { marginTop: 20 }]}>Стратегия поступления</Text>
      <View style={{ gap: 8 }}>
        {STRATEGIES.map(st => (
          <TouchableOpacity key={st.id} style={[s.choice, strategy === st.id && s.choiceActive]} onPress={() => setStrategy(st.id)}>
            <Text style={[s.choiceText, strategy === st.id && s.choiceTextActive]}>{st.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[S.label, { marginTop: 20 }]}>Целевой университет/колледж (необязательно)</Text>
      <TextInput
        style={S.input}
        value={targetSchool}
        onChangeText={setTargetSchool}
        placeholder="Например: TU Munich"
        placeholderTextColor={C.faint}
      />

      <Text style={[S.label, { marginTop: 20 }]}>Геолокация</Text>
      <Text style={[S.sub, { marginBottom: 10 }]}>Так ИИ сможет подсказывать курсы и места рядом с тобой</Text>
      {geoStatus !== 'granted' && (
        <TouchableOpacity style={[S.btn, S.btnPrimary]} onPress={requestLocation} disabled={geoStatus === 'requesting'}>
          <Text style={S.btnText}>{geoStatus === 'requesting' ? 'Определяю...' : '📍 Разрешить геолокацию'}</Text>
        </TouchableOpacity>
      )}
      {geoStatus === 'granted' && <Text style={[S.sub, { color: C.success }]}>✅ Местоположение определено</Text>}
      {geoStatus === 'denied' && (
        <TextInput
          style={S.input}
          value={manualCity}
          onChangeText={setManualCity}
          placeholder="Введи свой город вручную"
          placeholderTextColor={C.faint}
        />
      )}

      <TouchableOpacity style={[S.btn, S.btnPrimary, { marginTop: 28 }]} onPress={finish} disabled={saving}>
        <Text style={S.btnText}>{saving ? 'Сохраняю...' : 'Готово! Начать →'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  choice: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  choiceActive: { borderColor: C.primary, backgroundColor: 'rgba(99,102,241,0.15)' },
  choiceText: { color: C.muted, fontWeight: '600', fontSize: 13 },
  choiceTextActive: { color: C.text },
});
