import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C } from '../theme';

export default function BadgesRow({ streak = 0, doneCount = 0, planCount = 0 }) {
  const badges = [
    planCount > 0 && { icon: '📋', label: 'План готов' },
    streak >= 3 && { icon: '🔥', label: '3 дня подряд' },
    streak >= 7 && { icon: '🏅', label: 'Неделя' },
    streak >= 14 && { icon: '🥈', label: 'Мастер' },
    streak >= 30 && { icon: '🏆', label: 'Легенда' },
    doneCount >= 10 && { icon: '✅', label: 'Первые 10' },
    doneCount >= 50 && { icon: '💪', label: '50 задач' },
  ].filter(Boolean);

  if (badges.length === 0) return null;

  return (
    <View style={s.row}>
      {badges.map((b, i) => (
        <View key={i} style={s.chip}>
          <Text style={s.icon}>{b.icon}</Text>
          <Text style={s.label}>{b.label}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  icon: { fontSize: 13 },
  label: { color: '#fbbf24', fontSize: 12, fontWeight: '700' },
});
