// Простое файловое хранилище (JSON) — для MVP-прототипа этого достаточно.
// В продакшене здесь должна быть настоящая БД (PostgreSQL/MongoDB) — см. отчёт, раздел "Дальнейшее развитие".
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  quizzes: path.join(DATA_DIR, 'quizzes.json'),
  history: path.join(DATA_DIR, 'history.json'),
};

function ensureFile(file) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf-8');
}

function load(key) {
  ensureFile(FILES[key]);
  return JSON.parse(fs.readFileSync(FILES[key], 'utf-8'));
}

function save(key, data) {
  ensureFile(FILES[key]);
  fs.writeFileSync(FILES[key], JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { load, save };
