export function persianInitials(firstName, lastName, fullName) {
  const first = String(firstName || '').trim();
  const last = String(lastName || '').trim();
  if (first || last) {
    return `${first.charAt(0)}${last.charAt(0)}`.trim();
  }
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0].charAt(0);
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`;
}

export default function InitialAvatar({
  src,
  firstName,
  lastName,
  fullName,
  size = 72,
  alt = '',
  className = '',
}) {
  const initials = persianInitials(firstName, lastName, fullName);
  const style = {
    width: size,
    height: size,
    borderRadius: 16,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  };
  if (src) {
    return (
      <img
        src={src}
        alt={alt || [firstName, lastName].filter(Boolean).join(' ') || fullName || 'تصویر پروفایل'}
        className={className}
        style={{ ...style, objectFit: 'cover' }}
      />
    );
  }
  return (
    <span
      aria-hidden={!initials}
      className={className}
      style={{
        ...style,
        background: 'linear-gradient(145deg, #087f8c 0%, #10282b 58%, #d7b56d 140%)',
        color: '#f7f6f0',
        fontWeight: 800,
        fontSize: Math.max(16, Math.round(size * 0.34)),
        letterSpacing: '0.08em',
        textShadow: '0 1px 2px rgba(16, 40, 43, 0.65)',
      }}
    >
      {initials || '؟'}
    </span>
  );
}
