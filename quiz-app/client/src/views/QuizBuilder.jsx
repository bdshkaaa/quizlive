import { useState } from 'react';
import Page from '../components/Page';
import QuestionEditor from '../components/QuestionEditor';
import { Api } from '../lib/api';

function blankQuestion() {
  return { type: 'text', text: '', imageUrl: '', multiple: false, timeLimit: 20, options: ['', '', '', ''], correct: [] };
}

export default function QuizBuilder({ existing, onDone }) {
  const [title, setTitle] = useState(existing?.title || '');
  const [questions, setQuestions] = useState(
    existing?.questions?.length
      ? existing.questions.map(q => ({ ...q, options: [...q.options, '', '', '', ''].slice(0, Math.max(4, q.options.length)) }))
      : [blankQuestion()]
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function updateQuestion(i, q) {
    const next = [...questions];
    next[i] = q;
    setQuestions(next);
  }
  function removeQuestion(i) { setQuestions(questions.filter((_, idx) => idx !== i)); }
  function addQuestion() { setQuestions([...questions, blankQuestion()]); }

  async function save() {
    const cleaned = questions.map(q => ({ ...q, options: q.options.map(o => o.trim()).filter(Boolean) }));
    const bad = !title.trim() || !cleaned.length || cleaned.some(q => !q.text.trim() || q.options.length < 2 || q.correct.length === 0);
    if (bad) {
      setError('Укажите название, а у каждого вопроса — текст, минимум 2 варианта и хотя бы один верный ответ.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = { title: title.trim(), category: 'Общее', questions: cleaned };
      if (existing) await Api.updateQuiz(existing.id, payload);
      else await Api.createQuiz(payload);
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <div className="card stack">
        <h2>{existing ? 'Изменить квиз' : 'Новый квиз'}</h2>
        <input className="field" type="text" placeholder="Название квиза" value={title} onChange={e => setTitle(e.target.value)} />

        <div className="stack">
          {questions.map((q, i) => (
            <QuestionEditor key={i} index={i} question={q} onChange={next => updateQuestion(i, next)} onRemove={() => removeQuestion(i)} />
          ))}
        </div>

        <div className="row"><button className="btn ghost" onClick={addQuestion}>+ Добавить вопрос</button></div>
        <p className="err">{error}</p>
        <div className="row">
          <button className="btn primary" disabled={busy} onClick={save}>{busy ? <span className="spin" /> : 'Сохранить квиз'}</button>
          <button className="btn ghost" onClick={onDone}>Отмена</button>
        </div>
      </div>
    </Page>
  );
}
