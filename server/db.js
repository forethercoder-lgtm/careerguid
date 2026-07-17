require('dotenv').config();
const fs = require('fs');
const path = require('path');

const USE_MONGO = !!process.env.MONGODB_URI;
const DB_PATH = path.join(__dirname, 'users.json');

// ─── JSON (локально без MongoDB) ───────────────────────
function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [] }, null, 2));
    return { users: [] };
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Mongoose модель (продакшн) ─────────────────────────
let UserModel = null;

async function connectDB() {
  if (USE_MONGO) {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    if (!UserModel) {
      const schema = new mongoose.Schema({
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
        preferences: { type: mongoose.Schema.Types.Mixed, default: null },
      }, { timestamps: true });
      UserModel = mongoose.models.User || mongoose.model('User', schema);
    }
    console.log('✅ MongoDB подключена');
  } else {
    console.log('📁 Локальная база (users.json)');
  }
}

function normalize(doc) {
  if (!doc) return null;
  return { ...doc, id: doc._id ? doc._id.toString() : doc.id };
}

// ─── Единый API для обоих режимов ──────────────────────
async function findByEmail(email) {
  if (USE_MONGO) {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    return normalize(doc);
  }
  return readDB().users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

async function findById(id) {
  if (USE_MONGO) {
    try {
      const doc = await UserModel.findById(id).lean();
      return normalize(doc);
    } catch { return null; }
  }
  return readDB().users.find(u => String(u.id) === String(id)) || null;
}

async function createUser(data) {
  if (USE_MONGO) {
    const doc = await UserModel.create(data);
    return normalize(doc.toObject());
  }
  const db = readDB();
  const id = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
  const user = { id, ...data, createdAt: new Date().toISOString() };
  db.users.push(user);
  writeDB(db);
  return user;
}

async function updateUser(id, updates) {
  if (USE_MONGO) {
    const doc = await UserModel.findByIdAndUpdate(id, updates, { new: true }).lean();
    return normalize(doc);
  }
  const db = readDB();
  const i = db.users.findIndex(u => String(u.id) === String(id));
  if (i === -1) return null;
  db.users[i] = { ...db.users[i], ...updates, updatedAt: new Date().toISOString() };
  writeDB(db);
  return db.users[i];
}

module.exports = { connectDB, findByEmail, findById, createUser, updateUser };
