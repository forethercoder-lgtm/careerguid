import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { C, S } from '../theme';
import { API_URL } from '../config';
import { setItem } from '../storage';

export default function AuthScreen({ navigation, route }) {
  const [tab, setTab] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email || !password) return Alert.alert('Ошибка', 'Заполни все поля');
    if (tab === 'register' && !name) return Alert.alert('Ошибка', 'Введи своё имя');
    if (password.length < 6) return Alert.alert('Ошибка', 'Пароль минимум 6 символов');

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/${tab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email.toLowerCase().trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert('Ошибка', data.error || 'Ошибка входа'); return; }
      await setItem('token', data.token);
      navigation.replace('Onboarding', { token: data.token, user: data.user });
    } catch (e) {
      Alert.alert('Ошибка', 'Сервер недоступен. Проверь подключение.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.logo}>🎓</Text>
      <Text style={S.title}>{tab === 'login' ? 'Добро пожаловать!' : 'Создай аккаунт'}</Text>
      <Text style={[S.sub, { marginBottom: 28 }]}>{tab === 'login' ? 'Войди чтобы продолжить' : 'Зарегистрируйся бесплатно'}</Text>

      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'login' && s.tabActive]} onPress={() => setTab('login')}>
          <Text style={[s.tabText, tab === 'login' && s.tabTextActive]}>Войти</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'register' && s.tabActive]} onPress={() => setTab('register')}>
          <Text style={[s.tabText, tab === 'register' && s.tabTextActive]}>Регистрация</Text>
        </TouchableOpacity>
      </View>

      {tab === 'register' && (
        <View style={s.field}>
          <Text style={S.label}>Твоё имя</Text>
          <TextInput style={S.input} value={name} onChangeText={setName} placeholder="Как тебя зовут?" placeholderTextColor={C.faint} />
        </View>
      )}
      <View style={s.field}>
        <Text style={S.label}>Email</Text>
        <TextInput style={S.input} value={email} onChangeText={setEmail} placeholder="example@mail.com" placeholderTextColor={C.faint} keyboardType="email-address" autoCapitalize="none" />
      </View>
      <View style={s.field}>
        <Text style={S.label}>Пароль</Text>
        <TextInput style={S.input} value={password} onChangeText={setPassword} placeholder="Минимум 6 символов" placeholderTextColor={C.faint} secureTextEntry />
      </View>

      <TouchableOpacity style={[S.btn, S.btnPrimary, { marginTop: 8 }]} onPress={submit} disabled={loading}>
        <Text style={S.btnText}>{loading ? 'Загрузка...' : tab === 'login' ? 'Войти →' : 'Создать аккаунт →'}</Text>
      </TouchableOpacity>

      <Text style={s.lock}>🔒 Пароль хранится в зашифрованном виде</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: { padding: 24, paddingTop: 60 },
  logo: { fontSize: 52, textAlign: 'center', marginBottom: 16 },
  tabs: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: C.primary },
  tabText: { color: C.muted, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#fff' },
  field: { marginBottom: 16 },
  lock: { textAlign: 'center', color: C.faint, fontSize: 12, marginTop: 20 },
});
