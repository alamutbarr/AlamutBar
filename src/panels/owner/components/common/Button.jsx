import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const variants = {
  primary:
    'bg-ink-950 text-[#f7f6f0] hover:bg-[#087f8c] focus-visible:outline-[#087f8c] disabled:bg-ink-300',
  accent:
    'bg-[#087f8c] text-[#f7f6f0] hover:bg-ink-950 focus-visible:outline-[#087f8c] disabled:bg-ink-100 disabled:text-ink-300',
  ghost:
    'bg-transparent text-ink-700 hover:bg-ink-50 focus-visible:outline-ink-300 disabled:text-ink-300',
  danger:
    'bg-white text-red-600 border border-red-200 hover:bg-red-50 focus-visible:outline-red-400',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className = '',
  children,
  disabled,
  ...props
}) {
  const MotionComponent = motion.create ? motion.create(Component) : motion(Component);
  const isDisabled = disabled || loading;

  return (
    <MotionComponent
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl font-semibold
        transition-colors duration-150 focus-visible:outline focus-visible:outline-2
        focus-visible:outline-offset-2 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {!loading && Icon && <Icon size={16} />}
      {children}
    </MotionComponent>
  );
}
