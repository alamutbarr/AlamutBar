import { motion } from 'framer-motion';

export function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="modal-layer" role="dialog" aria-modal="true">
      <button type="button" className="modal-scrim" aria-label="بستن" onClick={onClose} />
      <motion.div className="modal-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button type="button" className="btn secondary" onClick={onClose}>بستن</button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export function Badge({ tone = 'idle', children }) {
  return <span className={`badge tone-${tone}`}>{children}</span>;
}

export function SkeletonRows() {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {[1, 2, 3, 4].map((item) => <div key={item} className="skeleton" style={{ height: 64 }} />)}
    </div>
  );
}

export function Empty({ text }) {
  return <div className="card" style={{ padding: 28, textAlign: 'center' }}><p className="muted">{text}</p></div>;
}

export function Page({ title, action, children }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>{title}</h1>
        {action}
      </div>
      {children}
    </motion.section>
  );
}
