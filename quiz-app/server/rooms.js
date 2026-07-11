// Логика "живых" комнат квиза поверх WebSocket (Socket.IO).
// Комнаты хранятся в памяти процесса (на время сессии) — это стандартный подход
// для real-time слоя; финальные результаты сохраняются в data/history.json.
const { nanoid, customAlphabet } = require('nanoid');
const genCode = customAlphabet('0123456789', 6);
const db = require('./db');
const { sessions } = require('./routes');

const rooms = new Map(); // code -> room

function userFromToken(token) {
  const userId = sessions[token];
  if (!userId) return null;
  const users = db.load('users');
  return users.find(u => u.id === userId) || null;
}

function publicParticipants(room) {
  return [...room.participants.values()]
    .map(p => ({ id: p.id, nickname: p.nickname, score: p.score }))
    .sort((a, b) => b.score - a.score);
}

function publicQuestion(question, index, total) {
  return {
    index,
    total,
    id: question.id,
    type: question.type,
    text: question.text,
    imageUrl: question.imageUrl,
    multiple: question.multiple,
    options: question.options,
    timeLimit: question.timeLimit,
  };
}

function clearTimer(room) {
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }
}

function scoreAnswer(question, selected, timeTakenMs) {
  const correctSet = new Set(question.correct);
  const selSet = new Set(selected);
  const isCorrect =
    correctSet.size === selSet.size &&
    [...correctSet].every(i => selSet.has(i));
  if (!isCorrect) return { isCorrect: false, points: 0 };
  // Базовые баллы + бонус за скорость ответа (макс 500 базовых + до 500 за скорость)
  const timeLimitMs = question.timeLimit * 1000;
  const speedRatio = Math.max(0, 1 - timeTakenMs / timeLimitMs);
  const points = Math.round(500 + 500 * speedRatio);
  return { isCorrect: true, points };
}

function registerRoomHandlers(io, socket) {
  // --- Организатор создаёт комнату для выбранного квиза ---
  socket.on('host:create_room', ({ token, quizId }, cb) => {
    const user = userFromToken(token);
    if (!user || user.role !== 'organizer') return cb?.({ error: 'Не авторизован как организатор' });
    const quizzes = db.load('quizzes');
    const quiz = quizzes.find(q => q.id === quizId && q.ownerId === user.id);
    if (!quiz) return cb?.({ error: 'Квиз не найден' });

    let code;
    do { code = genCode(); } while (rooms.has(code));

    const room = {
      code,
      quiz,
      hostId: user.id,
      hostSocketId: socket.id,
      state: 'lobby', // lobby -> question -> question_result -> ... -> finished
      currentIndex: -1,
      participants: new Map(), // socketId -> {id, userId, nickname, score, currentAnswer, answeredAt}
      timer: null,
      startedAt: null,
    };
    rooms.set(code, room);
    socket.join(code);
    cb?.({ code });
  });

  // --- Участник подключается по коду комнаты ---
  socket.on('player:join', ({ code, nickname, token }, cb) => {
    const room = rooms.get(code);
    if (!room) return cb?.({ error: 'Комната с таким кодом не найдена' });
    if (room.state !== 'lobby') return cb?.({ error: 'Квиз уже запущен, подключение недоступно' });
    const nick = (nickname || 'Игрок').trim().slice(0, 24) || 'Игрок';
    const user = token ? userFromToken(token) : null;

    const participant = {
      id: nanoid(8),
      userId: user?.id || null,
      nickname: nick,
      score: 0,
      currentAnswer: null,
      answeredAt: null,
    };
    room.participants.set(socket.id, participant);
    socket.join(code);
    io.to(code).emit('room:update', {
      state: room.state,
      participants: publicParticipants(room),
      quizTitle: room.quiz.title,
    });
    cb?.({ ok: true, participantId: participant.id, quizTitle: room.quiz.title });
  });

  // --- Организатор запускает квиз ---
  socket.on('host:start_quiz', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.hostSocketId !== socket.id) return;
    room.currentIndex = -1;
    room.startedAt = new Date().toISOString();
    advanceQuestion(io, room);
  });

  // --- Организатор переходит к следующему вопросу вручную (или по таймауту — автоматически) ---
  socket.on('host:next_question', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.hostSocketId !== socket.id) return;
    advanceQuestion(io, room);
  });

  // --- Участник отправляет ответ ---
  socket.on('player:answer', ({ code, questionId, selected }) => {
    const room = rooms.get(code);
    if (!room || room.state !== 'question') return;
    const question = room.quiz.questions[room.currentIndex];
    if (!question || question.id !== questionId) return;
    const participant = room.participants.get(socket.id);
    if (!participant || participant.answeredAt) return; // один ответ на вопрос

    const timeTakenMs = Date.now() - room.questionStartedAtMs;
    const { isCorrect, points } = scoreAnswer(question, selected, timeTakenMs);
    participant.currentAnswer = selected;
    participant.answeredAt = Date.now();
    participant.score += points;

    socket.emit('player:answer_ack', { isCorrect, points });
    io.to(code).emit('room:progress', {
      answeredCount: [...room.participants.values()].filter(p => p.answeredAt).length,
      totalCount: room.participants.size,
    });
  });

  // --- Организатор завершает квиз досрочно ---
  socket.on('host:end_quiz', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.hostSocketId !== socket.id) return;
    finishQuiz(io, room);
  });

  socket.on('disconnect', () => {
    for (const room of rooms.values()) {
      if (room.participants.has(socket.id)) {
        room.participants.delete(socket.id);
        io.to(room.code).emit('room:update', {
          state: room.state,
          participants: publicParticipants(room),
          quizTitle: room.quiz.title,
        });
      }
      if (room.hostSocketId === socket.id) {
        clearTimer(room);
        io.to(room.code).emit('room:host_left');
        rooms.delete(room.code);
      }
    }
  });
}

function advanceQuestion(io, room) {
  clearTimer(room);
  // Если перед этим был активный вопрос — сначала показываем результаты по нему
  room.currentIndex += 1;
  if (room.currentIndex >= room.quiz.questions.length) {
    finishQuiz(io, room);
    return;
  }
  const question = room.quiz.questions[room.currentIndex];
  room.state = 'question';
  room.questionStartedAtMs = Date.now();
  for (const p of room.participants.values()) {
    p.currentAnswer = null;
    p.answeredAt = null;
  }
  io.to(room.code).emit(
    'question:show',
    publicQuestion(question, room.currentIndex, room.quiz.questions.length)
  );
  room.timer = setTimeout(() => showQuestionResults(io, room), question.timeLimit * 1000);
}

function showQuestionResults(io, room) {
  clearTimer(room);
  const question = room.quiz.questions[room.currentIndex];
  room.state = 'question_result';

  const optionCounts = new Array(question.options.length).fill(0);
  for (const p of room.participants.values()) {
    if (p.currentAnswer) for (const idx of p.currentAnswer) optionCounts[idx] = (optionCounts[idx] || 0) + 1;
  }

  io.to(room.code).emit('question:end', {
    correct: question.correct,
    optionCounts,
    leaderboard: publicParticipants(room),
    isLastQuestion: room.currentIndex === room.quiz.questions.length - 1,
  });
}

function finishQuiz(io, room) {
  clearTimer(room);
  room.state = 'finished';
  const leaderboard = publicParticipants(room);
  io.to(room.code).emit('quiz:finished', { leaderboard });

  const history = db.load('history');
  history.push({
    id: nanoid(10),
    code: room.code,
    quizId: room.quiz.id,
    quizTitle: room.quiz.title,
    hostId: room.hostId,
    startedAt: room.startedAt,
    finishedAt: new Date().toISOString(),
    participants: leaderboard.map(p => {
      const full = [...room.participants.values()].find(x => x.id === p.id);
      return { userId: full?.userId || null, nickname: p.nickname, score: p.score };
    }),
  });
  db.save('history', history);
  rooms.delete(room.code);
}

module.exports = { registerRoomHandlers, rooms };
