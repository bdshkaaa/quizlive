import { useEffect, useState } from 'react';
import Page from '../components/Page';
import { socket } from '../lib/socket';
import { Api } from '../lib/api';

export default function ParticipantHome({ user, onJoined }) {
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState(user.username);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(null);

  useEffect(() => { Api.history().then(setHistory).catch(() => setHistory([])); }, []);

  function join() {
    setError('');
    const trimmedCode = code.trim();
    const nick = nickname.trim() || 'Игрок';
    if (!/^\d{6}$/.test(trimmedCode)) { setError('Код должен состоять из 6 цифр.'); return; }
    setBusy(true);
    socket.emit('player:join', { code: trimmedCode, nickname: nick, token: Api.getToken() }, res => {
      setBusy(false);
      if (res?.error) { setError(res.error); return; }
      onJoined(trimmedCode, nick, res.quizTitle);
    });
  }

  return (
    <Page>
      <div className="card stack">
        <h2>Кабинет участника</h2>
        <p className="muted" style={{ margin: 0 }}>Введите код комнаты, который вам сообщил организатор.</p>
        <input className="field" type="text" inputMode="numeric" maxLength={6} placeholder="Код комнаты (6 цифр)" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
        <input className="field" type="text" maxLength={24} placeholder="Ваш ник" value={nickname} onChange={e => setNickname(e.target.value)} />
        <button className="btn primary" disabled={busy} onClick={join}>{busy ? <span className="spin" /> : 'Подключиться'}</button>
        <p className="err">{error}</p>
      </div>

      <div className="card">
        <h3>История участия</h3>
        {history === null && <p className="muted"><span className="spin" /> Загружаю…</p>}
        {history && history.length === 0 && <p className="muted">Вы ещё не участвовали в квизах.</p>}
        {history && history.map(h => {
          const me = h.participants.find(p => p.userId === user.id);
          const place = h.participants.slice().sort((a, b) => b.score - a.score).findIndex(p => p === me) + 1;
          return (
            <div className="card tight row between" key={h.id} style={{ marginBottom: 10 }}>
              <div>
                <strong>{h.quizTitle}</strong>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{new Date(h.finishedAt).toLocaleString('ru-RU')}</div>
              </div>
              <div className="muted">{me ? `${me.score} очков (место ${place})` : '—'}</div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}
