import { useEffect, useRef, useState } from "react";

/**
 * usePullToRefresh
 * Attaches touch-based pull-to-refresh to a container ref.
 * @param {Function} onRefresh - async function to call on pull
 * @param {Object} options - { threshold: number (default 65) }
 * @returns { containerRef, pulling, pullDistance, refreshing }
 */
export default function usePullToRefresh(onRefresh, { threshold = 65 } = {}) {
  const containerRef = useRef(null);
  const startY = useRef(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      // Only trigger if scrolled to top
      if (el.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e) => {
      if (startY.current === null || refreshing) return;
      const dist = Math.max(0, e.touches[0].clientY - startY.current);
      if (dist > 0 && el.scrollTop === 0) {
        setPullDistance(Math.min(dist, threshold * 1.5));
        if (dist > 5) e.preventDefault();
      }
    };

    const onTouchEnd = async () => {
      if (pullDistance >= threshold && !refreshing) {
        setRefreshing(true);
        setPullDistance(0);
        startY.current = null;
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
        }
      } else {
        setPullDistance(0);
        startY.current = null;
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, pullDistance, refreshing, threshold]);

  return { containerRef, pulling: pullDistance > 0, pullDistance, refreshing };
}