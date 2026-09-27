import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { C, S } from '../theme';
import { getSavedUniversities, updateNote, removeSaved } from '../savedUniversities';

export default function SavedUniversitiesScreen({ navigation, route }) {
  const { user } = route.params || {};
  const insets = useSafeAreaInsets();
  const [list, setList] = useState([]);

  useFocusEffect(useCallback(() => {
    (async () => setList(await getSavedUniversities(user?.email)))();
  }, [user?.email]));

  function onNoteChange(id, text) {
    setList(l => l.map(u => (u.id === id ? { ...u, notes: text } : u)));
  }

  function onNoteBlur(id, text) {
    updateNote(user?.email, id, text);
  }

  async function onRemove(id) {
    setList(await removeSaved(user?.email, id));
  }

  return (
    <View style={[s.page, { paddingTop: 14 + insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>← Назад</Text></TouchableOpacity>
        <Text style={s.title}>Мои университеты</Text>
        <View style={{ width: 48 }} />
      </View>

      {list.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>Пока пусто. Пройди «Карьерную ориентацию» — подобранные вузы появятся здесь, и к каждому можно добавить свою заметку.</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={u => String(u.id)}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom, gap: 14 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{item.name}</Text>
                  <Text style={s.cardDesc}>{item.city ? `${item.city}, ` : ''}{item.country}</Text>
                </View>
                <TouchableOpacity onPress={() => onRemove(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ fontSize: 18 }}>🗑</Text>
                </TouchableOpacity>
              </View>
              {item.ranking ? <Text style={s.uniMeta}>{item.ranking}</Text> : null}
              {item.tuition ? <Text style={s.uniMeta}>💰 {item.tuition}</Text> : null}
              {item.whyFit ? <Text style={s.why}>{item.whyFit}</Text> : null}
              <TextInput
                style={s.noteInput}
                value={item.notes}
                onChangeText={t => onNoteChange(item.id, t)}
                onBlur={() => onNoteBlur(item.id, item.notes)}
                placeholder="Своя заметка про этот вуз..."
                placeholderTextColor={C.faint}
                multiline
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  back: { color: C.muted, fontSize: 13, fontWeight: '600', width: 48 },
  title: { color: C.text, fontSize: 17, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: C.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  cardTitle: { color: C.text, fontWeight: '800', fontSize: 16 },
  cardDesc: { color: C.muted, fontSize: 12, marginTop: 3 },
  uniMeta: { color: C.muted, fontSize: 12, marginTop: 2 },
  why: { color: C.muted, fontSize: 13, lineHeight: 18, marginTop: 6 },
  noteInput: { marginTop: 10, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, color: C.text, fontSize: 13, minHeight: 40, textAlignVertical: 'top' },
});
