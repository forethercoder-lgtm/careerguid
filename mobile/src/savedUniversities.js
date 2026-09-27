import { getJSON, setJSON } from './storage';

function keyFor(email) { return `saved_universities_${email}`; }

function sameUni(a, b) {
  return (a.name || '').toLowerCase() === (b.name || '').toLowerCase() && (a.country || '') === (b.country || '');
}

export async function getSavedUniversities(email) {
  return (await getJSON(keyFor(email))) || [];
}

/** Merge freshly suggested universities into the saved list, keeping notes already written for ones seen before. */
export async function mergeSuggested(email, suggested = []) {
  const existing = await getSavedUniversities(email);
  const merged = [...existing];
  for (const u of suggested) {
    const i = merged.findIndex(e => sameUni(e, u));
    if (i === -1) {
      merged.push({ id: Date.now() + Math.random(), name: u.name, country: u.country, city: u.city, ranking: u.ranking, tuition: u.tuition, whyFit: u.whyFit, notes: '', savedAt: new Date().toISOString() });
    }
  }
  await setJSON(keyFor(email), merged);
  return merged;
}

export async function updateNote(email, id, notes) {
  const list = await getSavedUniversities(email);
  const updated = list.map(u => (u.id === id ? { ...u, notes } : u));
  await setJSON(keyFor(email), updated);
  return updated;
}

export async function removeSaved(email, id) {
  const list = await getSavedUniversities(email);
  const updated = list.filter(u => u.id !== id);
  await setJSON(keyFor(email), updated);
  return updated;
}
