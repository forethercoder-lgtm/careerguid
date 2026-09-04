// Static hosts (Firebase, etc.) don't run the Node backend themselves, so
// requests must go straight to the Render server. Same-origin deployments
// (Render itself, local dev via the Vite proxy) keep using relative paths.
export const API_BASE = /\.(web\.app|firebaseapp\.com)$/.test(window.location.hostname)
  ? 'https://careerguid.onrender.com'
  : '';

async function callServer(path, token, body) {
  const res = await fetch(API_BASE + path, {
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

async function callServerUpload(path, token, file) {
  const formData = new FormData();
  formData.append('document', file);
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
}

export async function apiParseDocument(token, file) {
  return callServerUpload('/api/parse-document', token, file);
}

export async function apiExtractText(token, file) {
  return callServerUpload('/api/extract-text', token, file);
}

export async function apiSuggestScholarships(token, { specialty, countries, educationLevel, budget }) {
  return callServer('/api/suggest-scholarships', token, { specialty, countries, educationLevel, budget });
}

export async function apiEssayFeedback(token, text) {
  return callServer('/api/essay-feedback', token, { text });
}

export async function apiSuggestActivities(token, { query, goal, interests, countries, existingTasks }) {
  return callServer('/api/suggest-activities', token, { query, goal, interests, countries, existingTasks });
}
