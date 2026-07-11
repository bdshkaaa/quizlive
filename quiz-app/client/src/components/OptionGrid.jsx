import { motion } from 'framer-motion';
import { OPTION_COLORS } from '../lib/util';

/**
 * options: string[]
 * mode: 'display' | 'interactive' | 'reveal'
 * selected: number[] (interactive) — controlled selection
 * correct: number[] (reveal)
 * counts: number[] (reveal) — сколько человек выбрали каждый вариант
 */
export default function OptionGrid({ options, mode, selected = [], onToggle, correct = [], counts = [], disabled = false }) {
  return (
    <div className="opt-grid">
      {options.map((opt, i) => {
        const cls = ['opt-btn', OPTION_COLORS[i]];
        if (mode === 'interactive' && selected.includes(i)) cls.push('selected');
        if (mode === 'reveal') cls.push(correct.includes(i) ? 'correct' : (selected.includes(i) ? 'incorrect' : ''));
        const Comp = mode === 'interactive' ? motion.button : motion.div;
        return (
          <Comp
            key={i}
            className={cls.join(' ')}
            disabled={mode === 'interactive' ? disabled : undefined}
            whileTap={mode === 'interactive' && !disabled ? { scale: 0.97 } : undefined}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            onClick={mode === 'interactive' && !disabled ? () => onToggle(i) : undefined}
          >
            {opt}
            {mode === 'reveal' && <span className="pct mono">{counts[i] || 0}</span>}
          </Comp>
        );
      })}
    </div>
  );
}
