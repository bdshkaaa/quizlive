const { io } = require('socket.io-client');
const BASE = 'http://localhost:3000';

async function api(method, url, body, token) {
  const res = await fetch(BASE + '/api' + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(url + ' -> ' + JSON.stringify(data));
  return data;
}

(async () => {
  const suffix = Date.now();
  console.log('1. Регистрация организатора и участника...');
  const org = await api('POST', '/auth/register', { username: 'org_' + suffix, password: 'pass123', role: 'organizer' });
  const p1 = await api('POST', '/auth/register', { username: 'p1_' + suffix, password: 'pass123', role: 'participant' });
  console.log('   OK:', org.user.username, p1.user.username);

  console.log('2. Создание квиза с 2 вопросами...');
  const { quiz } = await api('POST', '/quizzes', {
    title: 'Тестовый квиз E2E',
    category: 'Тест',
    questions: [
      { type: 'text', text: 'Столица Франции?', options: ['Берлин', 'Париж', 'Рим', 'Мадрид'], correct: [1], timeLimit: 3 },
      { type: 'text', text: 'Выберите чётные числа', options: ['1', '2', '3', '4'], correct: [1, 3], multiple: true, timeLimit: 3 },
    ],
  }, org.token);
  console.log('   OK: quiz id =', quiz.id);

  const hostSocket = io(BASE, { transports: ['websocket'] });
  const playerSocket = io(BASE, { transports: ['websocket'] });

  await new Promise(r => hostSocket.on('connect', r));
  await new Promise(r => playerSocket.on('connect', r));
  console.log('3. Сокеты подключены.');

  const { code } = await new Promise((resolve, reject) => {
    hostSocket.emit('host:create_room', { token: org.token, quizId: quiz.id }, res => res.error ? reject(res.error) : resolve(res));
  });
  console.log('4. Комната создана, код =', code);

  hostSocket.on('room:update', d => console.log('   [host] room:update, participants =', d.participants.map(p => p.nickname)));

  await new Promise((resolve, reject) => {
    playerSocket.emit('player:join', { code, nickname: 'Игрок1', token: p1.token }, res => res.error ? reject(res.error) : resolve(res));
  });
  console.log('5. Участник подключился.');
  await new Promise(r => setTimeout(r, 300));

  let questionsSeen = 0;
  let finished = false;
  let finalLeaderboard = null;

  playerSocket.on('question:show', q => {
    console.log(`   [player] Вопрос ${q.index + 1}: "${q.text}"`);
    questionsSeen++;
    // отвечаем правильно на оба вопроса
    const correctAnswers = [[1], [1, 3]];
    setTimeout(() => {
      playerSocket.emit('player:answer', { code, questionId: q.id, selected: correctAnswers[q.index] });
    }, 200);
  });

  playerSocket.on('player:answer_ack', d => console.log('   [player] Ответ засчитан:', d));

  hostSocket.on('question:end', d => {
    console.log('   [host] question:end, лидерборд:', d.leaderboard);
    setTimeout(() => hostSocket.emit('host:next_question', { code }), 200);
  });

  hostSocket.on('quiz:finished', d => {
    console.log('6. Квиз завершён! Финальный лидерборд:', d.leaderboard);
    finished = true;
    finalLeaderboard = d.leaderboard;
  });

  hostSocket.emit('host:start_quiz', { code });

  const start = Date.now();
  while (!finished && Date.now() - start < 20000) {
    await new Promise(r => setTimeout(r, 200));
  }

  if (!finished) throw new Error('Квиз не завершился за отведённое время');
  if (questionsSeen !== 2) throw new Error('Ожидалось 2 вопроса, получено ' + questionsSeen);
  if (!finalLeaderboard[0] || finalLeaderboard[0].score <= 0) throw new Error('Некорректный подсчёт очков');

  console.log('7. Проверка истории через REST API...');
  const hist = await api('GET', '/history', null, org.token);
  if (!hist.history.length) throw new Error('История не сохранилась');
  console.log('   OK, записей в истории:', hist.history.length);

  console.log('\n✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО');
  process.exit(0);
})().catch(err => {
  console.error('\n❌ ОШИБКА ТЕСТА:', err);
  process.exit(1);
});
