import React, { useState } from 'react';

interface RippleButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  disabled?: boolean;
  [key: string]: any;
}

interface Ripple {
  x: number;
  y: number;
  size: number;
  id: number;
}

/**
 * Ripple Button Component with material-style ripple animation
 * Creates expanding ripple effect on click
 */
export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  onClick,
  className,
  disabled,
  ...props
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const newRipple: Ripple = {
      x,
      y,
      size,
      id: Date.now()
    };

    setRipples(prev => [...prev, newRipple]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={className}
      onClick={handleRipple}
      disabled={disabled}
      style={{ position: 'relative', overflow: 'hidden' }}
      {...props}
    >
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.6)',
            transform: 'scale(0)',
            animation: 'ripple-expand 600ms ease-out forwards'
          }}
        />
      ))}
    </button>
  );
};

export default RippleButton;