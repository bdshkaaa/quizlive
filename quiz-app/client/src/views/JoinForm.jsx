import { useState } from 'react';
import Page from '../components/Page';
import { socket } from '../lib/socket';
import { Api } from '../lib/api';

export default function JoinForm({ defaultNickname, onBack, onJoined }) {
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState(defaultNickname || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function join() {
    setError('');
    const trimmedCode = code.trim();
    const nick = nickname.trim() || 'Игрок';
    if (!/^\d{6}$/.test(trimmedCode)) { setError('Код должен состоять из 6 цифр.'); return; }
    setBusy(true);
    socket.emit('player:join', { code: trimmedCode, nickname: nick, token: Api.getToken() }, res => {
      setBusy(false);
      if (res?.error) { setError(res.error); return; }
      onJoined(trimmedCode, nick);
    });
  }

  return (
    <Page>
      <div className="card stack" style={{ maxWidth: 420, margin: '30px auto' }}>
        <h2>Присоединиться к квизу</h2>
        <input
          className="field" type="text" inputMode="numeric" maxLength={6}
          placeholder="Код комнаты (6 цифр)" value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
        />
        <input
          className="field" type="text" maxLength={24} placeholder="Ваш ник"
          value={nickname} onChange={e => setNickname(e.target.value)}
        />
        <button className="btn primary block" disabled={busy} onClick={join}>
          {busy ? <span className="spin" /> : 'Подключиться'}
        </button>
        <p className="err">{error}</p>
      </div>
      <div className="row"><button className="btn ghost" onClick={onBack}>← Назад</button></div>
    </Page>
  );
}
