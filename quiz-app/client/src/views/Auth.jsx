import { useState } from 'react';
import Page from '../components/Page';
import { Api } from '../lib/api';

export default function Auth({ onAuthed }) {
  const [tab, setTab] = useState('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const fd = new FormData(e.target);
    try {
      const user = tab === 'login'
        ? await Api.login(fd.get('username'), fd.get('password'))
        : await Api.register(fd.get('username'), fd.get('password'), fd.get('role'));
      onAuthed(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <div className="card stack" style={{ maxWidth: 420, margin: '40px auto' }}>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className={`btn ${tab === 'login' ? 'primary' : 'ghost'}`}
            style={{ flex: 1 }}
            onClick={() => { setTab('login'); setError(''); }}
          >
            Вход
          </button>
          <button
            type="button"
            className={`btn ${tab === 'register' ? 'primary' : 'ghost'}`}
            style={{ flex: 1 }}
            onClick={() => { setTab('register'); setError(''); }}
          >
            Регистрация
          </button>
        </div>

        <form className="stack" onSubmit={submit} key={tab}>
          <input className="field" name="username" placeholder="Логин" required autoComplete="username" />
          <input className="field" name="password" type="password" placeholder="Пароль" required
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />
          {tab === 'register' && (
            <div className="row" style={{ gap: 20 }}>
              <label className="check"><input type="radio" name="role" value="organizer" defaultChecked /> Организатор</label>
              <label className="check"><input type="radio" name="role" value="participant" /> Участник</label>
            </div>
          )}
          <button className="btn primary block" disabled={busy} type="submit">
            {busy ? <span className="spin" /> : (tab === 'login' ? 'Войти' : 'Создать аккаунт')}
          </button>
          <p className="err">{error}</p>
        </form>
      </div>
    </Page>
  );
}
