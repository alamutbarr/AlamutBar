import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function when(mission) {
  const date = mission.visit.date ? new Date(mission.visit.date).toLocaleDateString('fa-IR') : '—';
  return `${date}، ${mission.visit.from || '—'} تا ${mission.visit.to || '—'}`;
}

export default function Visits({ scope = 'open' }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/missions?scope=${scope}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [scope]);

  if (error) return <p className="inspector-muted">{error}</p>;
  if (!data) return <p className="inspector-muted">در حال آوردن مراجعه‌ها...</p>;

  return (
    <>
      <header className="panel-section-head">
        <p className="panel-kicker">متصدی میدان</p>
        <h1 style={{ margin: 0 }}>{scope === 'done' ? 'مراجعه‌های بسته‌شده' : 'مراجعه‌های امروز'}</h1>
      </header>
      <p className="inspector-muted">{data.payerNote}</p>
      {data.missions.map((mission) => (
        <button key={mission.id} type="button" className="inspector-card" style={{ textAlign: 'right' }} onClick={() => navigate(`/inspector/missions/${mission.id}`)}>
          <div className="inspector-row">
            <strong>{mission.trackingCode}</strong>
            <span className={`inspector-pill ${mission.completeness.complete ? 'ok' : 'warn'}`}>
              {mission.completeness.complete ? 'مدارک کامل' : 'ناقص'}
            </span>
          </div>
          <p>{mission.visit.city} — {mission.visit.address}</p>
          <p className="inspector-muted">{when(mission)}</p>
          <p className="inspector-muted">{mission.workflowLabel}{mission.discrepancies.length ? ` — ${mission.discrepancies.length.toLocaleString('fa-IR')} مغایرت` : ''}</p>
        </button>
      ))}
      {data.missions.length === 0 && <article className="inspector-card"><p className="inspector-muted">مراجعه‌ای در این فهرست نیست.</p></article>}
    </>
  );
}
