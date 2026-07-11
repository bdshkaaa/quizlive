import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import Page from '../components/Page';
import Buzzer from '../components/Buzzer';
import TimerBar from '../components/TimerBar';
import OptionGrid from '../components/OptionGrid';
import Leaderboard from '../components/Leaderboard';
import { socket } from '../lib/socket';

export default function PlayRoom({ code, quizTitle, onExit }) {
  const [phase, setPhase] = useState('lobby'); // lobby | question | results | finished
  const [participants, setParticipants] = useState([]);
  const [title, setTitle] = useState(quizTitle || '');
  const [question, setQuestion] = useState(null);
  const [result, setResult] = useState(null);
  const [finalBoard, setFinalBoard] = useState(null);
  const [ack, setAck] = useState(null); // { isCorrect, points }
  const [submitted, setSubmitted] = useState(false);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    socket.on('room:update', ({ participants, quizTitle }) => { setParticipants(participants); if (quizTitle) setTitle(quizTitle); });
    socket.on('question:show', q => {
      setQuestion({ ...q, startedAt: Date.now() });
      setSelected([]); setSubmitted(false); setAck(null); setPhase('question');
    });
    socket.on('player:answer_ack', payload => setAck(payload));
    socket.on('question:end', payload => { setResult(payload); setPhase('results'); });
    socket.on('quiz:finished', ({ leaderboard }) => { setFinalBoard(leaderboard); setPhase('finished'); });
    socket.on('room:host_left', () => setPhase('host_left'));

    return () => {
      socket.off('room:update');
      socket.off('question:show');
      socket.off('player:answer_ack');
      socket.off('question:end');
      socket.off('quiz:finished');
      socket.off('room:host_left');
    };
  }, []);

  useEffect(() => {
    if (phase === 'finished') {
      confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 }, colors: ['#E8FF5B', '#B14EFF', '#5B9DFF', '#35D0BA'] });
    }
  }, [phase]);

  function toggle(i) {
    if (submitted) return;
    if (question.multiple) {
      setSelected(sel => sel.includes(i) ? sel.filter(x => x !== i) : [...sel, i]);
    } else {
      submit([i]);
    }
  }
  function submit(sel) {
    const answer = sel || selected;
    if (submitted || !answer.length) return;
    setSubmitted(true);
    setSelected(answer);
    socket.emit('player:answer', { code, questionId: question.id, selected: answer });
  }

  return (
    <Page>
      {phase === 'lobby' && (
        <div className="card center">
          <p className="muted" style={{ marginBottom: 0 }}>Код комнаты</p>
          <Buzzer code={code} />
          <h2 style={{ margin: '6px 0 4px' }}>{title}</h2>
          <p className="muted">Организатор скоро запустит квиз.</p>
          <div className="chip-grid">
            {participants.map(p => <span className="chip" key={p.id}>{p.nickname}</span>)}
          </div>
        </div>
      )}

      {phase === 'question' && question && (
        <div className="card">
          <div className="row between">
            <span className="pill">Вопрос {question.index + 1} / {question.total}</span>
            <span className="pill">{question.multiple ? 'Можно неск. вариантов' : 'Один вариант'}</span>
          </div>
          <h2>{question.text}</h2>
          {question.imageUrl && <img className="q-img" src={question.imageUrl} alt="" />}
          <TimerBar key={question.index} startedAt={question.startedAt} durationMs={question.timeLimit * 1000} />
          <OptionGrid mode="interactive" options={question.options} selected={selected} onToggle={toggle} disabled={submitted} />
          {question.multiple && (
            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn primary" disabled={submitted || !selected.length} onClick={() => submit()}>Отправить ответ</button>
            </div>
          )}
          <p className="muted" style={{ marginTop: 12 }}>
            {ack ? (ack.isCorrect ? `✅ Верно! +${ack.points} очков` : '❌ Неверно') : (submitted ? 'Ответ отправлен! Ждём остальных участников…' : '')}
          </p>
        </div>
      )}

      {phase === 'results' && result && (
        <div className="card">
          <h2>Результат вопроса</h2>
          <OptionGrid mode="reveal" options={question.options} correct={result.correct} counts={result.optionCounts} selected={selected} />
          <h3 style={{ margin: '22px 0 10px' }}>Таблица лидеров</h3>
          <Leaderboard list={result.leaderboard} />
          <p className="muted center" style={{ marginTop: 14 }}>Ожидаем следующий вопрос…</p>
        </div>
      )}

      {phase === 'finished' && finalBoard && (
        <div className="card center">
          <h2>🏆 Квиз завершён!</h2>
          <Leaderboard list={finalBoard} />
          <button className="btn ghost" style={{ marginTop: 18 }} onClick={onExit}>На главную</button>
        </div>
      )}

      {phase === 'host_left' && (
        <div className="card center">
          <h2>Организатор покинул комнату</h2>
          <p className="muted">Сессия завершена.</p>
          <button className="btn ghost" style={{ marginTop: 12 }} onClick={onExit}>На главную</button>
        </div>
      )}
    </Page>
  );
}
