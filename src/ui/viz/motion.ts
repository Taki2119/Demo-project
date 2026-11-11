// Chart animation timing (kit 03 §7). Recharts does NOT read prefers-reduced-motion itself ⇒ pass it in.
import { useMediaQuery } from '../useMediaQuery';

export const CHART_ANIM_MS = 1000;

export function useChartAnim() {
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  return { isAnimationActive: !reduce, animationDuration: CHART_ANIM_MS, animationEasing: 'ease-out' as const };
}
