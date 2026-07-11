import { motion } from 'framer-motion';

export default function Buzzer({ code, live = false }) {
  return (
    <div className="buzzer-outer">
      <motion.div
        className="buzzer-ring"
        animate={live ? { rotate: 360 } : { rotate: 0 }}
        transition={live ? { duration: 8, repeat: Infinity, ease: 'linear' } : {}}
      />
      <motion.div
        className="buzzer-core"
        animate={live ? { boxShadow: ['0 0 0 0 rgba(232,255,91,0.28)', '0 0 0 18px rgba(232,255,91,0)'] } : {}}
        transition={live ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : {}}
      >
        <motion.span
          className="code mono"
          key={code}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {code}
        </motion.span>
      </motion.div>
    </div>
  );
}
