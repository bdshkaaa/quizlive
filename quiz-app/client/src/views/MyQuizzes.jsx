import { useEffect, useState } from 'react';
import Page from '../components/Page';
import { Api } from '../lib/api';

export default function MyQuizzes({ onCreate, onEdit, onLaunch, onHistory }) {
  const [quizzes, setQuizzes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);
  async function load() {
    try { setQuizzes(await Api.listQuizzes()); }
    catch (e) { setError(e.message); setQuizzes([]); }
  }
  async function remove(id) {
    await Api.deleteQuiz(id);
    load();
  }

  return (
    <Page>
      <div className="card row between">
        <div>
          <h2>Мои квизы</h2>
          <p className="muted" style={{ margin: '6px 0 0' }}>Квизы хранятся на сервере — доступны с любого устройства.</p>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={onHistory}>История</button>
          <button className="btn primary" onClick={onCreate}>+ Новый квиз</button>
        </div>
      </div>

      {quizzes === null && <div className="card tight center muted"><span className="spin" /> Загружаю…</div>}
      {error && <p className="err">{error}</p>}
      {quizzes && quizzes.length === 0 && <div className="card tight center muted">Пока пусто — создайте первый квиз.</div>}

      {quizzes && quizzes.map(q => (
        <div className="card tight row between" key={q.id}>
          <div>
            <strong>{q.title}</strong>
            <div className="row" style={{ marginTop: 6, gap: 8 }}>
              <span className="pill">{q.category || 'Общее'}</span>
              <span className="muted" style={{ fontSize: 13 }}>{q.questions.length} вопрос(ов)</span>
            </div>
          </div>
          <div className="row">
            <button className="btn primary" onClick={() => onLaunch(q)}>Запустить</button>
            <button className="btn ghost" onClick={() => onEdit(q)}>Изменить</button>
            <button className="btn danger" onClick={() => remove(q.id)}>Удалить</button>
          </div>
        </div>
      ))}
    </Page>
  );
}
