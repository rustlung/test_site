import { useState, useEffect, useRef, useCallback } from 'react';

const RETURN_KEY = 'reside_prestige_return_count';

function getReturnCount() {
  try {
    return parseInt(sessionStorage.getItem(RETURN_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function incrementReturnCount() {
  try {
    const n = getReturnCount() + 1;
    sessionStorage.setItem(RETURN_KEY, String(n));
    return n;
  } catch {
    return 0;
  }
}

export function useBehaviorTracking() {
  const [timeOnPage, setTimeOnPage] = useState(0);
  const [clicks, setClicks] = useState([]);
  const [hovers, setHovers] = useState([]);
  const [returnCount] = useState(incrementReturnCount);
  const startTime = useRef(Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeOnPage(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const trackClick = useCallback((target) => {
    const el = target;
    const info = {
      tag: el.tagName?.toLowerCase(),
      id: el.id || null,
      class: el.className?.toString?.()?.slice?.(0, 100) || null,
      text: el.textContent?.slice?.(0, 50) || null,
    };
    setClicks((prev) => [...prev.slice(-99), info]);
  }, []);

  const trackHover = useCallback((target, duration) => {
    if (!target || duration < 500) return;
    const el = target;
    const info = {
      tag: el.tagName?.toLowerCase(),
      id: el.id || null,
      class: el.className?.toString?.()?.slice?.(0, 100) || null,
      duration,
    };
    setHovers((prev) => {
      const filtered = prev.filter((h) => h.tag !== info.tag || h.id !== info.id);
      return [...filtered.slice(-49), info];
    });
  }, []);

  const getBehaviorPayload = useCallback(() => ({
    time_on_page: timeOnPage,
    clicks: clicks.length ? clicks : null,
    hovers: hovers.length ? hovers : null,
    return_count: returnCount,
    raw_data: null,
  }), [timeOnPage, clicks, hovers, returnCount]);

  return { trackClick, trackHover, getBehaviorPayload };
}
