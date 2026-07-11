import { useEffect, useState } from 'react';
import Page from '../components/Page';
import { Api } from '../lib/api';

export default function OrganizerHistory({ onBack }) {
  const [history, setHistory] = useState(null);

  useEffect(() => { Api.history().then(setHistory).catch(() => setHistory([])); }, []);

  return (
    <Page>
      <div className="card">
        <div className="row between">
          <h2 style={{ margin: 0 }}>История проведённых квизов</h2>
          <button className="btn ghost" onClick={onBack}>← Назад</button>
        </div>
      </div>
      {history === null && <div className="card tight center muted"><span className="spin" /> Загружаю…</div>}
      {history && history.length === 0 && <div className="card tight center muted">Пока нет завершённых квизов.</div>}
      {history && history.map(h => (
        <div className="card tight row between" key={h.id}>
          <div>
            <strong>{h.quizTitle}</strong>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {new Date(h.finishedAt).toLocaleString('ru-RU')} · участников: {h.participants.length}
            </div>
          </div>
          <div className="muted">Победитель: {h.participants[0]?.nickname || '—'}</div>
        </div>
      ))}
    </Page>
  );
}
