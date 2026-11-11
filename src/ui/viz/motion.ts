// Nhịp animation của chart (kit 03 §7). Recharts KHÔNG tự đọc prefers-reduced-motion ⇒ truyền vào.
import { useMediaQuery } from '../useMediaQuery';

export const CHART_ANIM_MS = 1000;

export function useChartAnim() {
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  return { isAnimationActive: !reduce, animationDuration: CHART_ANIM_MS, animationEasing: 'ease-out' as const };
}
