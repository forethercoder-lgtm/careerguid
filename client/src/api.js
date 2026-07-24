async function callServer(path, token, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
}

export async function apiAssistant(token, messages) {
  const data = await callServer('/api/assistant', token, { messages });
  return { message: data.message };
}

export async function apiDailyTasks(token, items, goal) {
  return callServer('/api/generate-daily-tasks', token, { items, goal });
}

export async function apiSuggestLocal(token, { lat, lon, city }, topic) {
  return callServer('/api/suggest-local', token, { lat, lon, city, topic });
}

export async function apiOrientationChat(token, messages) {
  return callServer('/api/orientation-chat', token, { messages });
}

export async function apiSuggestSpecialties(token, lastMessage) {
  return callServer('/api/suggest-specialties', token, { lastMessage });
}

export async function apiSuggestUniversities(token, { specialty, strategy, countries, educationLevel }) {
  return callServer('/api/suggest-universities', token, { specialty, strategy, countries, educationLevel });
}

export async function apiGenerateStarterPlan(token, { specialty, university, goal }) {
  return callServer('/api/generate-starter-plan', token, { specialty, university, goal });
}

export async function apiParseDocument(token, file) {
  const formData = new FormData();
  formData.append('document', file);
  const res = await fetch('/api/parse-document', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
}
