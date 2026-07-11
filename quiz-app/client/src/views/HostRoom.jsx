import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import Page from '../components/Page';
import Buzzer from '../components/Buzzer';
import TimerBar from '../components/TimerBar';
import OptionGrid from '../components/OptionGrid';
import Leaderboard from '../components/Leaderboard';
import { socket } from '../lib/socket';
import { Api } from '../lib/api';

export default function HostRoom({ quiz, onExit }) {
  const [code, setCode] = useState(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('lobby'); // lobby | question | results | finished
  const [participants, setParticipants] = useState([]);
  const [question, setQuestion] = useState(null); // { ...q, startedAt }
  const [answeredCount, setAnsweredCount] = useState(0);
  const [result, setResult] = useState(null); // { correct, optionCounts, leaderboard, isLastQuestion }
  const [finalBoard, setFinalBoard] = useState(null);
  const createdRef = useRef(false);

  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;
    socket.emit('host:create_room', { token: Api.getToken(), quizId: quiz.id }, res => {
      if (res?.error) { setError(res.error); return; }
      setCode(res.code);
    });

    socket.on('room:update', ({ participants }) => setParticipants(participants));
    socket.on('question:show', q => { setQuestion({ ...q, startedAt: Date.now() }); setAnsweredCount(0); setPhase('question'); });
    socket.on('room:progress', ({ answeredCount }) => setAnsweredCount(answeredCount));
    socket.on('question:end', payload => { setResult(payload); setPhase('results'); });
    socket.on('quiz:finished', ({ leaderboard }) => { setFinalBoard(leaderboard); setPhase('finished'); });

    return () => {
      socket.off('room:update');
      socket.off('question:show');
      socket.off('room:progress');
      socket.off('question:end');
      socket.off('quiz:finished');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 'finished') {
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#E8FF5B', '#B14EFF', '#5B9DFF', '#35D0BA'] });
    }
  }, [phase]);

  if (error) {
    return (
      <Page>
        <div className="card center">
          <p className="err">{error}</p>
          <button className="btn ghost" onClick={onExit}>Назад</button>
        </div>
      </Page>
    );
  }
  if (!code) {
    return <Page><div className="card center muted"><span className="spin" /> Создаём комнату…</div></Page>;
  }

  return (
    <Page>
      {phase === 'lobby' && (
        <div className="card center">
          <p className="muted" style={{ marginBottom: 0 }}>Код комнаты для участников</p>
          <Buzzer code={code} live />
          <h2 style={{ margin: '6px 0 4px' }}>{quiz.title}</h2>
          <p className="muted">Ожидаем участников…</p>
          <div className="chip-grid">
            {participants.map(p => <span className="chip" key={p.id}>{p.nickname}</span>)}
          </div>
          <button className="btn primary lg" disabled={!participants.length} onClick={() => socket.emit('host:start_quiz', { code })}>
            Начать квиз
          </button>
        </div>
      )}

      {phase === 'question' && question && (
        <div className="card">
          <div className="row between">
            <span className="pill">Вопрос {question.index + 1} / {question.total}</span>
            <span className="pill mono">Ответили: {answeredCount} / {participants.length}</span>
          </div>
          <h2>{question.text}</h2>
          {question.imageUrl && <img className="q-img" src={question.imageUrl} alt="" />}
          <TimerBar key={question.index} startedAt={question.startedAt} durationMs={question.timeLimit * 1000} />
          <OptionGrid mode="display" options={question.options} />
        </div>
      )}

      {phase === 'results' && result && (
        <div className="card">
          <h2>Промежуточный результат</h2>
          <Leaderboard list={result.leaderboard} />
          <div className="row" style={{ marginTop: 18 }}>
            <button className="btn primary" onClick={() => socket.emit('host:next_question', { code })}>
              {result.isLastQuestion ? 'Показать финал' : 'Следующий вопрос'}
            </button>
          </div>
        </div>
      )}

      {phase === 'finished' && finalBoard && (
        <div className="card center">
          <h2>🏆 Итоги квиза</h2>
          <Leaderboard list={finalBoard} />
          <button className="btn ghost" style={{ marginTop: 18 }} onClick={onExit}>Вернуться к моим квизам</button>
        </div>
      )}
    </Page>
  );
}
