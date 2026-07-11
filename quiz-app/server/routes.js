const express = require('express');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const db = require('./db');

const router = express.Router();

// ---------- AUTH ----------
// Упрощённая аутентификация для MVP: логин по токену-сессии в памяти.
// В боевой версии — JWT/refresh-токены + httpOnly cookies (см. отчёт).
const sessions = {}; // token -> userId

function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  const userId = sessions[token];
  if (!userId) return res.status(401).json({ error: 'Не авторизован' });
  const users = db.load('users');
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
  req.user = user;
  next();
}

router.post('/auth/register', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !['organizer', 'participant'].includes(role)) {
    return res.status(400).json({ error: 'Некорректные данные регистрации' });
  }
  const users = db.load('users');
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ error: 'Такой логин уже занят' });
  }
  const user = {
    id: nanoid(10),
    username,
    passwordHash: bcrypt.hashSync(password, 8),
    role,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  db.save('users', users);
  const token = nanoid(24);
  sessions[token] = user.id;
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  const users = db.load('users');
  const user = users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  const token = nanoid(24);
  sessions[token] = user.id;
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

router.get('/auth/me', authMiddleware, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username, role: req.user.role } });
});

// ---------- QUIZZES (организатор создаёт/настраивает квиз) ----------
router.get('/quizzes', authMiddleware, (req, res) => {
  const quizzes = db.load('quizzes').filter(q => q.ownerId === req.user.id);
  res.json({ quizzes });
});

router.post('/quizzes', authMiddleware, (req, res) => {
  if (req.user.role !== 'organizer') return res.status(403).json({ error: 'Только организатор может создавать квизы' });
  const { title, category, questions } = req.body;
  if (!title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Укажите название и минимум один вопрос' });
  }
  const quiz = {
    id: nanoid(10),
    ownerId: req.user.id,
    title,
    category: category || 'Общее',
    createdAt: new Date().toISOString(),
    questions: questions.map(q => ({
      id: nanoid(8),
      type: q.type === 'image' ? 'image' : 'text',
      text: q.text || '',
      imageUrl: q.imageUrl || null,
      multiple: !!q.multiple,
      options: q.options,
      correct: q.correct, // индексы правильных ответов
      timeLimit: q.timeLimit && q.timeLimit > 0 ? q.timeLimit : 20,
    })),
  };
  const quizzes = db.load('quizzes');
  quizzes.push(quiz);
  db.save('quizzes', quizzes);
  res.json({ quiz });
});

router.get('/quizzes/:id', authMiddleware, (req, res) => {
  const quiz = db.load('quizzes').find(q => q.id === req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Квиз не найден' });
  res.json({ quiz });
});

router.put('/quizzes/:id', authMiddleware, (req, res) => {
  const quizzes = db.load('quizzes');
  const idx = quizzes.findIndex(q => q.id === req.params.id);
  if (idx === -1 || quizzes[idx].ownerId !== req.user.id) return res.status(404).json({ error: 'Квиз не найден' });
  const { title, category, questions } = req.body;
  if (!title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Укажите название и минимум один вопрос' });
  }
  const updated = {
    ...quizzes[idx],
    title,
    category: category || quizzes[idx].category,
    questions: questions.map(q => ({
      id: nanoid(8),
      type: q.type === 'image' ? 'image' : 'text',
      text: q.text || '',
      imageUrl: q.imageUrl || null,
      multiple: !!q.multiple,
      options: q.options,
      correct: q.correct,
      timeLimit: q.timeLimit && q.timeLimit > 0 ? q.timeLimit : 20,
    })),
  };
  quizzes[idx] = updated;
  db.save('quizzes', quizzes);
  res.json({ quiz: updated });
});

router.delete('/quizzes/:id', authMiddleware, (req, res) => {
  let quizzes = db.load('quizzes');
  const quiz = quizzes.find(q => q.id === req.params.id);
  if (!quiz || quiz.ownerId !== req.user.id) return res.status(404).json({ error: 'Квиз не найден' });
  quizzes = quizzes.filter(q => q.id !== req.params.id);
  db.save('quizzes', quizzes);
  res.json({ ok: true });
});

// ---------- ЛИЧНЫЙ КАБИНЕТ: история ----------
router.get('/history', authMiddleware, (req, res) => {
  const history = db.load('history');
  let records;
  if (req.user.role === 'organizer') {
    records = history.filter(h => h.hostId === req.user.id);
  } else {
    records = history.filter(h => h.participants.some(p => p.userId === req.user.id));
  }
  res.json({ history: records.sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt)) });
});

module.exports = { router, authMiddleware, sessions };
