import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { C, S } from '../theme';

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={s.page}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.hero}>
        <Text style={s.logo}>🎓</Text>
        <Text style={s.title}>КарьерГид</Text>
        <Text style={s.sub}>ИИ-помощник для поступления{'\n'}в зарубежные университеты и колледжи</Text>
      </View>

      <View style={s.features}>
        {[
          ['✍️', 'Твой план', 'Впиши свою цель и задачи сам'],
          ['🤖', 'ИИ-помощник', 'Помогает по запросу и ищет информацию'],
          ['📍', 'Рядом с тобой', 'Курсы и места по геолокации'],
          ['✅', 'Задачи', 'Ежедневный трекер с чек-листом'],
        ].map(([icon, title, desc]) => (
          <View key={title} style={s.feature}>
            <Text style={s.fIcon}>{icon}</Text>
            <View>
              <Text style={s.fTitle}>{title}</Text>
              <Text style={s.fDesc}>{desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[S.btn, S.btnPrimary, s.startBtn]} onPress={() => navigation.navigate('Auth')}>
        <Text style={S.btnText}>Начать бесплатно →</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 72, marginBottom: 12 },
  title: { fontSize: 32, fontWeight: '900', color: C.text, marginBottom: 8 },
  sub: { fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 22 },
  features: { gap: 14, marginBottom: 40 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
  fIcon: { fontSize: 28 },
  fTitle: { color: C.text, fontWeight: '700', fontSize: 15 },
  fDesc: { color: C.muted, fontSize: 12, marginTop: 2 },
  startBtn: { marginTop: 8 },
});
