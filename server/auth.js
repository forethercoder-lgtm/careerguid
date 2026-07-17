require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findByEmail, findById, createUser, updateUser } = require('./db');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'careerguid_jwt_secret_2026';

function sign(userId) {
  return jwt.sign({ userId: String(userId) }, SECRET, { expiresIn: '30d' });
}

function safeUser(u) {
  return { id: String(u.id || u._id), name: u.name, email: u.email, preferences: u.preferences, createdAt: u.createdAt };
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Заполни все поля' });
    if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
    if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Введи корректный email' });

    const existing = await findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Этот email уже зарегистрирован' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({ name: name.trim(), email: email.toLowerCase().trim(), passwordHash });
    res.json({ token: sign(user.id), user: safeUser(user) });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Введи email и пароль' });

    const user = await findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Неверный email или пароль' });

    res.json({ token: sign(user.id), user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
});

router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Нет токена' });
  try {
    const { userId } = jwt.verify(header.replace('Bearer ', ''), SECRET);
    const user = await findById(userId);
    if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
    res.json({ user: safeUser(user) });
  } catch {
    res.status(401).json({ error: 'Токен недействителен' });
  }
});

router.put('/preferences', async (req, res) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Нет токена' });
  try {
    const { userId } = jwt.verify(header.replace('Bearer ', ''), SECRET);
    const user = await updateUser(userId, { preferences: req.body.preferences });
    res.json({ user: safeUser(user) });
  } catch {
    res.status(401).json({ error: 'Токен недействителен' });
  }
});

module.exports = router;
