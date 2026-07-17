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
