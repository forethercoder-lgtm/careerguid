import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getItem(key) {
  try { return await AsyncStorage.getItem(key); } catch { return null; }
}
export async function setItem(key, value) {
  try { await AsyncStorage.setItem(key, String(value)); } catch {}
}
export async function getJSON(key) {
  try { const v = await AsyncStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
export async function setJSON(key, value) {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch {}
}
export async function removeItem(key) {
  try { await AsyncStorage.removeItem(key); } catch {}
}
