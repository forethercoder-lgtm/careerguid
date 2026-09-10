import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch } from 'react-native';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, S, withOpacity } from '../theme';
import { API_URL } from '../config';
import { getJSON, setJSON, removeItem } from '../storage';
import { requestPermission, scheduleReminder, cancelReminder } from '../notifications';
import { useApp } from '../AppContext';
import { useEntitlements } from '../entitlements';

const APP_VERSION = Constants.expoConfig?.version || '—';

const PRESET_TIMES = [[9, 0], [13, 0], [18, 0], [21, 0]];

export default function AccountScreen({ navigation }) {
  const { token, user } = useApp();
  const { isPremium, usesLeft } = useEntitlements();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [reminder, setReminder] = useState({ enabled: false, hour: 9, minute: 0, identifier: null });
  const [reminderBusy, setReminderBusy] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const rkey = `reminder_${user?.email}`;

  useEffect(() => { loadReminder(); }, []);

  async function loadReminder() {
    const saved = await getJSON(rkey);
    if (saved) setReminder(saved);
  }

  async function saveName() {
    if (!name.trim()) return Alert.alert('Ошибка', 'Введи имя');
    setSavingName(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert('Ошибка', data.error || 'Не удалось сохранить'); setSavingName(false); return; }
      await setJSON('user', data.user);
      Alert.alert('Готово', 'Имя обновлено');
    } catch {
      Alert.alert('Ошибка', 'Сервер недоступен');
    }
    setSavingName(false);
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) return Alert.alert('Ошибка', 'Заполни оба поля');
    if (newPassword !== confirmPassword) return Alert.alert('Ошибка', 'Пароли не совпадают');
    setChangingPassword(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert('Ошибка', data.error || 'Не удалось изменить пароль'); setChangingPassword(false); return; }
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      Alert.alert('Готово', 'Пароль изменён');
    } catch {
      Alert.alert('Ошибка', 'Сервер недоступен');
    }
    setChangingPassword(false);
  }

  async function toggleReminder(enabled) {
    setReminderBusy(true);
    if (enabled) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Нет разрешения', 'Разреши уведомления в настройках телефона, чтобы получать напоминания');
        setReminderBusy(false);
        return;
      }
      const hour = reminder.hour ?? 9;
      const minute = reminder.minute ?? 0;
      const identifier = await scheduleReminder(hour, minute, reminder.identifier);
      const next = { enabled: true, hour, minute, identifier };
      setReminder(next);
      await setJSON(rkey, next);
    } else {
      await cancelReminder(reminder.identifier);
      const next = { ...reminder, enabled: false, identifier: null };
      setReminder(next);
      await setJSON(rkey, next);
    }
    setReminderBusy(false);
  }

  async function pickTime(hour, minute) {
    if (!reminder.enabled) return;
    setReminderBusy(true);
    const identifier = await scheduleReminder(hour, minute, reminder.identifier);
    const next = { ...reminder, hour, minute, identifier };
    setReminder(next);
    await setJSON(rkey, next);
    setReminderBusy(false);
  }

  function logout() {
    Alert.alert('Выйти?', '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти', style: 'destructive', onPress: async () => {
          await removeItem('token');
          await removeItem('user');
          (navigation.getParent() || navigation).reset({ index: 0, routes: [{ name: 'Welcome' }] });
        }
      },
    ]);
  }

  function deleteAccount() {
    Alert.alert('Удалить аккаунт?', 'Это действие необратимо. Все данные аккаунта будут удалены.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive', onPress: async () => {
          setDeleting(true);
          try {
            await fetch(`${API_URL}/api/auth/account`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch {}
          await removeItem('token');
          await removeItem('user');
          (navigation.getParent() || navigation).reset({ index: 0, routes: [{ name: 'Welcome' }] });
        }
      },
    ]);
  }

  return (
    <ScrollView style={s.page} contentContainerStyle={[s.content, { paddingTop: 20 + insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>Профиль</Text>
      </View>

      <View style={s.avatarWrap}>
        <View style={s.avatar}><Text style={s.avatarText}>{(user?.name || '?')[0]?.toUpperCase()}</Text></View>
      </View>

      <TouchableOpacity style={[s.premiumCard, isPremium && s.premiumCardActive]} onPress={() => navigation.navigate('Premium')}>
        <Text style={s.premiumIcon}>👑</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.premiumTitle}>{isPremium ? 'КарьерГид Premium' : 'Перейти на Premium'}</Text>
          <Text style={s.premiumText}>
            {isPremium
              ? 'Активен — все функции без ограничений'
              : `Бесплатно осталось ИИ-запросов сегодня: ${usesLeft === Infinity ? '∞' : usesLeft}`}
          </Text>
        </View>
        <Text style={s.premiumChevron}>›</Text>
      </TouchableOpacity>

      <View style={S.card}>
        <Text style={S.label}>Имя</Text>
        <TextInput style={S.input} value={name} onChangeText={setName} placeholderTextColor={C.faint} />
        <Text style={[S.label, { marginTop: 14 }]}>Email</Text>
        <Text style={s.emailText}>{user?.email}</Text>
        <TouchableOpacity style={[S.btn, S.btnPrimary, { marginTop: 16 }]} onPress={saveName} disabled={savingName}>
          <Text style={S.btnText}>{savingName ? 'Сохраняю...' : 'Сохранить'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>Изменить пароль</Text>
      <View style={S.card}>
        <TextInput style={S.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Текущий пароль" placeholderTextColor={C.faint} secureTextEntry />
        <TextInput style={[S.input, { marginTop: 10 }]} value={newPassword} onChangeText={setNewPassword} placeholder="Новый пароль" placeholderTextColor={C.faint} secureTextEntry />
        <TextInput style={[S.input, { marginTop: 10 }]} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Повтори новый пароль" placeholderTextColor={C.faint} secureTextEntry />
        <TouchableOpacity style={[S.btn, S.btnPrimary, { marginTop: 16 }]} onPress={changePassword} disabled={changingPassword}>
          <Text style={S.btnText}>{changingPassword ? 'Сохраняю...' : 'Изменить пароль'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>Предпочтения</Text>
      <View style={S.card}>
        <TouchableOpacity style={s.dangerRow} onPress={() => navigation.navigate('PreferencesSurvey', { user })}>
          <Text style={s.dangerRowText}>📋 Опрос предпочтений</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>Напоминания</Text>
      <View style={S.card}>
        <View style={s.switchRow}>
          <Text style={s.switchLabel}>Ежедневное напоминание о задачах</Text>
          <Switch
            value={reminder.enabled}
            onValueChange={toggleReminder}
            disabled={reminderBusy}
            trackColor={{ true: C.primary, false: C.border }}
            thumbColor="#fff"
          />
        </View>
        {reminder.enabled && (
          <View style={s.timeRow}>
            {PRESET_TIMES.map(([h, m]) => {
              const active = reminder.hour === h && reminder.minute === m;
              const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
              return (
                <TouchableOpacity key={label} style={[s.timeChip, active && s.timeChipActive]} onPress={() => pickTime(h, m)} disabled={reminderBusy}>
                  <Text style={[s.timeChipText, active && s.timeChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <Text style={s.sectionTitle}>Аккаунт</Text>
      <View style={S.card}>
        <TouchableOpacity style={s.dangerRow} onPress={logout}>
          <Text style={s.dangerRowText}>Выйти</Text>
        </TouchableOpacity>
        <View style={s.hairline} />
        <TouchableOpacity style={s.dangerRow} onPress={deleteAccount} disabled={deleting}>
          <Text style={[s.dangerRowText, { color: C.danger }]}>{deleting ? 'Удаляю...' : 'Удалить аккаунт'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.version}>КарьерГид · версия {APP_VERSION}</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { color: C.text, fontSize: 20, fontWeight: '900' },
  back: { color: C.muted, fontSize: 13, fontWeight: '600' },
  avatarWrap: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  emailText: { color: C.muted, fontSize: 14 },
  sectionTitle: { color: C.muted, fontSize: 13, fontWeight: '700', marginTop: 24, marginBottom: 8, textTransform: 'uppercase' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { color: C.text, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 12 },
  timeRow: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' },
  timeChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.border },
  timeChipActive: { borderColor: C.primary, backgroundColor: withOpacity(C.primary, 0.2) },
  timeChipText: { color: C.muted, fontWeight: '700', fontSize: 13 },
  timeChipTextActive: { color: C.text },
  dangerRow: { paddingVertical: 12 },
  dangerRowText: { color: C.text, fontSize: 15, fontWeight: '600' },
  hairline: { height: 1, backgroundColor: C.border },
  premiumCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, backgroundColor: withOpacity(C.primary, 0.12), borderWidth: 1, borderColor: withOpacity(C.primary, 0.4), marginBottom: 8 },
  premiumCardActive: { backgroundColor: withOpacity(C.success, 0.12), borderColor: withOpacity(C.success, 0.4) },
  premiumIcon: { fontSize: 24 },
  premiumTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  premiumText: { color: C.muted, fontSize: 12, marginTop: 2, lineHeight: 16 },
  premiumChevron: { color: C.muted, fontSize: 22, fontWeight: '700' },
  version: { color: C.faint, fontSize: 12, textAlign: 'center', marginTop: 28 },
});
