import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, S } from '../theme';
import { API_URL } from '../config';

export default function EssayFeedbackScreen({ route, navigation }) {
  const { token } = route.params;
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function uploadFile() {
    let picked;
    try {
      picked = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
      });
    } catch { return; }
    if (picked.canceled || !picked.assets?.[0]) return;
    const file = picked.assets[0];

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' });
      const res = await fetch(`${API_URL}/api/extract-text`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert('Ошибка', data.error || 'Не удалось прочитать файл'); setUploading(false); return; }
      setText(data.text || '');
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить файл');
    }
    setUploading(false);
  }

  async function getFeedback() {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/essay-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) { setResult({ error: data.error || 'Ошибка' }); setLoading(false); return; }
      setResult(data);
    } catch {
      setResult({ error: 'Сервер недоступен' });
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.page} contentContainerStyle={[s.content, { paddingTop: 20 + insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>✍️ Проверка эссе</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>← Назад</Text></TouchableOpacity>
      </View>
      <Text style={S.sub}>Вставь текст эссе или мотивационного письма, или загрузи файл — ИИ даст структурированный фидбек.</Text>

      <TextInput
        style={[S.input, s.textarea]}
        value={text}
        onChangeText={setText}
        placeholder="Вставь текст эссе сюда..."
        placeholderTextColor={C.faint}
        multiline
      />

      <View style={s.actions}>
        <TouchableOpacity style={s.secondaryBtn} onPress={uploadFile} disabled={uploading}>
          <Text style={s.secondaryBtnText}>{uploading ? 'Читаю файл...' : '📄 Загрузить файл'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[S.btn, S.btnPrimary, { flex: 1 }]} onPress={getFeedback} disabled={loading || !text.trim()}>
          <Text style={S.btnText}>{loading ? 'Анализирую...' : 'Получить фидбек →'}</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 20 }} />}

      {result && !loading && (
        <View style={s.result}>
          {result.error && <Text style={s.error}>⚠️ {result.error}</Text>}
          {!result.error && (
            <>
              {result.score && <Text style={s.score}>Оценка: {result.score}</Text>}
              {result.summary && <Text style={s.summary}>{result.summary}</Text>}
              {result.strengths?.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>✅ Сильные стороны</Text>
                  {result.strengths.map((str, i) => <Text key={i} style={s.item}>• {str}</Text>)}
                </View>
              )}
              {result.improvements?.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>💡 Что улучшить</Text>
                  {result.improvements.map((str, i) => <Text key={i} style={s.item}>• {str}</Text>)}
                </View>
              )}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { color: C.text, fontSize: 20, fontWeight: '900' },
  back: { color: C.muted, fontSize: 13, fontWeight: '600' },
  textarea: { minHeight: 160, textAlignVertical: 'top', marginTop: 14, marginBottom: 14 },
  actions: { flexDirection: 'row', gap: 10 },
  secondaryBtn: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  secondaryBtnText: { color: C.text, fontWeight: '700', fontSize: 13 },
  result: { marginTop: 20, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 18 },
  error: { color: C.danger, fontSize: 13 },
  score: { alignSelf: 'flex-start', backgroundColor: 'rgba(16,185,129,0.15)', color: C.success, fontWeight: '700', fontSize: 13, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, marginBottom: 12, overflow: 'hidden' },
  summary: { color: C.muted, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  section: { marginBottom: 12 },
  sectionTitle: { color: C.text, fontWeight: '700', fontSize: 14, marginBottom: 6 },
  item: { color: C.text, fontSize: 13, lineHeight: 19, marginBottom: 4 },
});
