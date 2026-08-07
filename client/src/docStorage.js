export const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5MB per file
export const MAX_DOC_COUNT = 5; // keep only the most recent N files

export function getDocuments(uid) {
  try { return JSON.parse(localStorage.getItem(`documents_${uid}`) || '[]'); }
  catch { return []; }
}

export function saveDocument(uid, doc) {
  const updated = [...getDocuments(uid), doc].slice(-MAX_DOC_COUNT);
  localStorage.setItem(`documents_${uid}`, JSON.stringify(updated));
  return updated;
}

export function deleteDocument(uid, id) {
  const updated = getDocuments(uid).filter(d => d.id !== id);
  localStorage.setItem(`documents_${uid}`, JSON.stringify(updated));
  return updated;
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
