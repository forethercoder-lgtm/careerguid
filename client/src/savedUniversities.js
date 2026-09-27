function keyFor(uid) { return `saved_universities_${uid}`; }

function sameUni(a, b) {
  return (a.name || '').toLowerCase() === (b.name || '').toLowerCase() && (a.country || '') === (b.country || '');
}

export function getSavedUniversities(uid) {
  try { return JSON.parse(localStorage.getItem(keyFor(uid)) || '[]'); } catch { return []; }
}

function persist(uid, list) {
  localStorage.setItem(keyFor(uid), JSON.stringify(list));
  return list;
}

/** Merge freshly suggested universities into the saved list, keeping notes already written for ones seen before. */
export function mergeSuggested(uid, suggested = []) {
  const existing = getSavedUniversities(uid);
  const merged = [...existing];
  for (const u of suggested) {
    const i = merged.findIndex(e => sameUni(e, u));
    if (i === -1) {
      merged.push({ id: Date.now() + Math.random(), name: u.name, country: u.country, city: u.city, ranking: u.ranking, tuition: u.tuition, whyFit: u.whyFit, notes: '', savedAt: new Date().toISOString() });
    }
  }
  return persist(uid, merged);
}

export function updateNote(uid, id, notes) {
  const list = getSavedUniversities(uid).map(u => (u.id === id ? { ...u, notes } : u));
  return persist(uid, list);
}

export function removeSaved(uid, id) {
  const list = getSavedUniversities(uid).filter(u => u.id !== id);
  return persist(uid, list);
}
