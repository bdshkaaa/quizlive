const COLORS = ['coral', 'sky', 'gold', 'teal'];

export default function QuestionEditor({ index, question, onChange, onRemove }) {
  const q = question;
  function set(patch) { onChange({ ...q, ...patch }); }
  function setOption(i, text) {
    const options = [...q.options];
    options[i] = text;
    set({ options });
  }
  function toggleCorrect(i) {
    const has = q.correct.includes(i);
    set({ correct: has ? q.correct.filter(x => x !== i) : [...q.correct, i] });
  }

  return (
    <div className="q-block stack">
      <div className="row between">
        <div className="row">
          <span className="q-num">{index + 1}</span>
          <select className="field" style={{ width: 190 }} value={q.type} onChange={e => set({ type: e.target.value })}>
            <option value="text">Текстовый вопрос</option>
            <option value="image">С изображением</option>
          </select>
          <input
            className="field" type="number" min={5} max={120} style={{ width: 90 }}
            value={q.timeLimit} title="секунд на ответ"
            onChange={e => set({ timeLimit: parseInt(e.target.value, 10) || 20 })}
          />
          <label className="check">
            <input type="checkbox" checked={q.multiple} onChange={e => set({ multiple: e.target.checked })} />
            Неск. ответов
          </label>
        </div>
        <button type="button" className="btn ghost" onClick={onRemove}>Удалить</button>
      </div>

      <textarea
        className="field" placeholder="Текст вопроса" value={q.text}
        onChange={e => set({ text: e.target.value })}
      />

      {q.type === 'image' && (
        <input
          className="field" type="url" placeholder="URL изображения"
          value={q.imageUrl} onChange={e => set({ imageUrl: e.target.value })}
        />
      )}

      <div className="stack" style={{ gap: 8 }}>
        {[0, 1, 2, 3].map(i => (
          <div className="opt-row" key={i}>
            <span className="opt-dot" style={{ background: `var(--${COLORS[i]})` }} />
            <input
              className="field" type="text" placeholder={`Вариант ${i + 1}`}
              value={q.options[i] || ''} onChange={e => setOption(i, e.target.value)}
            />
            <label className="check">
              <input type="checkbox" checked={q.correct.includes(i)} onChange={() => toggleCorrect(i)} />
              верный
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
