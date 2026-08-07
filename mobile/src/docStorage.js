import * as FileSystem from 'expo-file-system/legacy';
import { getJSON, setJSON } from './storage';

export const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5MB per file
export const MAX_DOC_COUNT = 5; // keep only the most recent N files

export async function getDocuments(email) {
  return (await getJSON(`documents_${email}`)) || [];
}

export async function saveDocument(email, pickedFile) {
  // pickedFile: { uri, name, mimeType, size } from expo-document-picker
  const destUri = FileSystem.documentDirectory + Date.now() + '_' + pickedFile.name;
  await FileSystem.copyAsync({ from: pickedFile.uri, to: destUri });
  const docs = await getDocuments(email);
  const doc = { id: Date.now(), name: pickedFile.name, uri: destUri, mimetype: pickedFile.mimeType, size: pickedFile.size, uploadedAt: new Date().toISOString() };
  const updated = [...docs, doc].slice(-MAX_DOC_COUNT);
  await setJSON(`documents_${email}`, updated);
  return updated;
}

export async function deleteDocument(email, id) {
  const docs = await getDocuments(email);
  const toDelete = docs.find(d => d.id === id);
  if (toDelete) {
    try { await FileSystem.deleteAsync(toDelete.uri, { idempotent: true }); } catch {}
  }
  const updated = docs.filter(d => d.id !== id);
  await setJSON(`documents_${email}`, updated);
  return updated;
}
