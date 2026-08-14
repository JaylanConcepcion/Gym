import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';

/**
 * Two-tap destructive action button. First tap arms it ("Sure?"), second tap
 * within 3s confirms. Replaces window.confirm, which installed iOS web apps
 * silently suppress — taps looked ignored and deletes never fired.
 */
export default function ConfirmButton({
  className,
  confirmLabel = 'Sure?',
  ariaLabel,
  onConfirm,
  children
}: {
  className: string;
  confirmLabel?: string;
  ariaLabel?: string;
  onConfirm: () => void;
  children: ReactNode;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    if (armed) {
      if (timer.current) clearTimeout(timer.current);
      setArmed(false);
      onConfirm();
      return;
    }
    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), 3000);
  }

  return (
    <button
      type="button"
      className={`${className}${armed ? ' armed' : ''}`}
      onClick={handleClick}
      aria-label={ariaLabel}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
