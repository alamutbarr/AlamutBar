export default function StepHeader({ title, description }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-ink-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-ink-300">{description}</p>}
    </div>
  );
}
