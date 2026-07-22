import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { C, S } from '../theme';
import { API_URL } from '../config';

export default function OrientationChatScreen({ route, navigation }) {
  const { token, user, onboarding } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatRef = useRef(null);

  useEffect(() => { startChat(); }, []);

  async function call(msgs) {
    const res = await fetch(`${API_URL}/api/orientation-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messages: msgs.map(m => ({ role: m.role, content: m.content })) }),
    });
    return res.json();
  }

  async function startChat() {
    setLoading(true);
    try {
      const data = await call([{ role: 'user', content: 'Начни беседу' }]);
      if (data.message) setMessages([{ role: 'assistant', content: data.message, id: Date.now() }]);
    } catch { }
    setLoading(false);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: text, id: Date.now() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const data = await call(newMsgs);
      if (data.message) setMessages(m => [...m, { role: 'assistant', content: data.message, id: Date.now() + 1 }]);
      if (data.readyForResults) {
        setTimeout(() => navigation.navigate('OrientationResults', { token, user, onboarding, lastMessage: data.message }), 1200);
      }
    } catch { }
    setLoading(false);
  }

  function renderMsg({ item }) {
    const isBot = item.role === 'assistant';
    return (
      <View style={[s.msgRow, isBot ? s.botRow : s.userRow]}>
        {isBot && <Text style={s.avatar}>🎓</Text>}
        <View style={[s.bubble, isBot ? s.botBubble : s.userBubble]}>
          <Text style={[s.bubbleText, isBot ? s.botText : s.userText]}>{item.content}</Text>
        </View>
        {!isBot && <Text style={s.avatar}>👤</Text>}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.header}>
        <Text style={s.headerIcon}>🎓</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.headerName}>Помощь с выбором</Text>
          <Text style={s.headerStatus}>онлайн · ИИ-консультант</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.replace('Plan', { token, user, onboarding })}>
          <Text style={s.skipText}>Пропустить</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => String(m.id)}
        renderItem={renderMsg}
        contentContainerStyle={s.list}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
      />

      {loading && (
        <View style={s.typing}>
          <Text style={s.typingText}>🎓 печатает</Text>
          <ActivityIndicator size="small" color={C.primary} style={{ marginLeft: 8 }} />
        </View>
      )}

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Напиши свой ответ..."
          placeholderTextColor={C.faint}
          multiline
          maxLength={500}
          editable={!loading}
        />
        <TouchableOpacity style={s.sendBtn} onPress={send} disabled={loading || !input.trim()}>
          <Text style={s.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// WhatsApp-inspired dark chat palette
const WA = { bg: '#0b141a', header: '#202c33', outgoing: '#005c4b', incoming: '#202c33', text: '#e9edef', muted: '#8696a0', accent: '#00a884', input: '#2a3942' };

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: WA.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingTop: 50, backgroundColor: WA.header },
  headerIcon: { fontSize: 36 },
  headerName: { color: WA.text, fontWeight: '800', fontSize: 16 },
  headerStatus: { color: WA.muted, fontSize: 12, marginTop: 2 },
  skipText: { color: WA.muted, fontSize: 13, fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  botRow: { justifyContent: 'flex-start' },
  userRow: { justifyContent: 'flex-end' },
  avatar: { fontSize: 24 },
  bubble: { maxWidth: '75%', borderRadius: 12, padding: 10 },
  botBubble: { backgroundColor: WA.incoming, borderBottomLeftRadius: 3 },
  userBubble: { backgroundColor: WA.outgoing, borderBottomRightRadius: 3 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  botText: { color: WA.text },
  userText: { color: WA.text },
  typing: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  typingText: { color: WA.muted, fontSize: 13 },
  inputRow: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 24, backgroundColor: WA.header, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: WA.input, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: WA.text, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: WA.accent, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
