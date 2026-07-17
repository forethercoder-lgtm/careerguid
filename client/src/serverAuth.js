// Bridges Firebase Google sign-in to the server's JWT auth, so the web client
// can call the shared-key AI endpoints without asking the user for anything extra.
async function derivePassword(uid) {
  const data = new TextEncoder().encode(uid + ':careerguid-bridge-v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function ensureBackendSession(fbUser) {
  const email = fbUser.email || `${fbUser.uid}@careerguid.local`;
  const name = fbUser.displayName || 'Студент';
  const password = await derivePassword(fbUser.uid);

  let res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось подключиться к серверу');
  return { token: data.token };
}
