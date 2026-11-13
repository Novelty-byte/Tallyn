import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { useCountUp } from '@/lib/animations';

interface MetricCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Animated metric counter for dashboard KPI cards.
 * Counts smoothly from previous value to target with ease-out easing.
 * Deterministic: only animates the DISPLAY of pre-computed values —
 * never computes financial figures itself.
 */
export const MetricCounter: React.FC<MetricCounterProps> = ({
  value,
  duration = 1200,
  prefix = '',
  suffix = '',
  className
}) => {
  const animatedValue = useCountUp(value, duration);

  return (
    <div className={className}>
      {prefix && <span className="text-slate-400">{prefix}</span>}
      <span className="figure">{formatCurrency(Math.round(animatedValue))}</span>
      {suffix && <span className="text-slate-400">{suffix}</span>}
    </div>
  );
};

export default MetricCounter;
