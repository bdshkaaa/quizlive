import { motion, AnimatePresence } from 'framer-motion';

export default function Leaderboard({ list, highlightId }) {
  return (
    <ol className="board">
      <AnimatePresence initial={false}>
        {list.map((p, i) => (
          <motion.li
            key={p.id || p.nickname}
            layout
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: i * 0.03 }}
            className={i === 0 ? 'top1' : ''}
            style={highlightId && p.id === highlightId ? { outline: '2px solid var(--sky)' } : undefined}
          >
            <span className="rank mono">{i + 1}</span>
            <span className="name">{p.nickname}</span>
            <span className="score mono">{p.score}</span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}
