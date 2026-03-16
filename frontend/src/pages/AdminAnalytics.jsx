import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import h337 from 'heatmap.js';
import { useAuth } from '../hooks/useAuth';

const API_BASE = '/api';
const HEATMAP_WIDTH = 1280;
const HEATMAP_HEIGHT_FALLBACK = 900;
// Ширина контента формы на главной (max-width .main в App.css)
const CONTENT_WIDTH = 720;
// Отступ сверху до начала основного контента: header (3rem+контент+1rem) + main padding (1rem) ≈ 8rem
const CONTENT_TOP_REM = 8;
const CONTENT_TOP_PX = CONTENT_TOP_REM * 16;
// Ручная подгонка: сдвиг карты влево и вверх (положительные значения)
const HEATMAP_OFFSET_X = 0;
const HEATMAP_OFFSET_Y = 15;

function buildHeatmapPoints(points, width, height) {
  if (!points || points.length === 0) return { max: 0, data: [] };
  let maxX = 0;
  let maxY = 0;
  let minX = Infinity;
  let minY = Infinity;
  points.forEach((p) => {
    if (typeof p.x === 'number' && typeof p.y === 'number') {
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
    }
  });
  if (minX === Infinity) minX = 0;
  if (minY === Infinity) minY = 0;

  // Контент 720px: считаем, что правый край контента у пользователя — maxX (крайняя клик/движение).
  const contentLeftUser = maxX - CONTENT_WIDTH;
  const previewContentLeft = (width - CONTENT_WIDTH) / 2;
  // Y: вычитаем отступ до контента (шапка), затем масштабируем высоту контента под превью
  const contentHeightUser = Math.max(1, maxY - CONTENT_TOP_PX);
  const contentHeightPreview = height - CONTENT_TOP_PX;
  const scaleY = contentHeightPreview / contentHeightUser;

  let maxValue = 0;
  const data = points
    .filter((p) => typeof p.x === 'number' && typeof p.y === 'number')
    .map((p) => {
      const value = typeof p.count === 'number' ? p.count : 1;
      if (value > maxValue) maxValue = value;
      const contentX = p.x - contentLeftUser;
      const contentY = p.y - CONTENT_TOP_PX;
      const x = Math.max(0, Math.min(width, Math.round(previewContentLeft + contentX - HEATMAP_OFFSET_X)));
      const y = Math.max(0, Math.min(height, Math.round(CONTENT_TOP_PX + contentY * scaleY - HEATMAP_OFFSET_Y)));
      return {
        x,
        y,
        value,
      };
    });

  return { max: maxValue || 1, data };
}

export default function AdminAnalytics() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState({ clicks: [], hovers: [] });
  const [mode, setMode] = useState('clicks'); // 'clicks' | 'hovers'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState({ width: HEATMAP_WIDTH, height: HEATMAP_HEIGHT_FALLBACK });
  const [scale, setScale] = useState(1);

  const heatmapContainerRef = useRef(null);
  const heatmapInstanceRef = useRef(null);
  const viewportRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [statsRes, heatRes] = await Promise.all([
          fetch(`${API_BASE}/analytics/stats`, { headers }),
          fetch(`${API_BASE}/analytics/heatmap`, { headers }),
        ]);

        if (!statsRes.ok) {
          throw new Error('Ошибка загрузки статистики');
        }
        if (!heatRes.ok) {
          throw new Error('Ошибка загрузки heatmap');
        }

        const statsJson = await statsRes.json();
        const heatJson = await heatRes.json();

        if (cancelled) return;
        setStats(statsJson);
        setHeatmapData({
          clicks: Array.isArray(heatJson.clicks) ? heatJson.clicks : [],
          hovers: Array.isArray(heatJson.hovers) ? heatJson.hovers : [],
        });
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Ошибка загрузки аналитики');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!heatmapContainerRef.current) return;

    if (!heatmapInstanceRef.current) {
      heatmapInstanceRef.current = h337.create({
        container: heatmapContainerRef.current,
        radius: 40,
        maxOpacity: 0.7,
        minOpacity: 0,
        blur: 0.85,
        backgroundColor: 'rgba(0,0,0,0)',
      });
    }

    const instance = heatmapInstanceRef.current;
    const source =
      mode === 'clicks' ? heatmapData.clicks : heatmapData.hovers;
    const { max, data } = buildHeatmapPoints(
      source || [],
      pageSize.width,
      pageSize.height,
    );

    instance.setData({ max, data });
  }, [mode, heatmapData, pageSize]);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth || HEATMAP_WIDTH;
      const nextScale = Math.min(1, w / HEATMAP_WIDTH);
      setScale(nextScale);
    };
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const handleIframeLoad = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const h = doc.documentElement?.scrollHeight || doc.body?.scrollHeight || HEATMAP_HEIGHT_FALLBACK;
      const w = doc.documentElement?.scrollWidth || doc.body?.scrollWidth || HEATMAP_WIDTH;
      setPageSize({
        width: Math.max(HEATMAP_WIDTH, Number(w) || HEATMAP_WIDTH),
        height: Math.max(HEATMAP_HEIGHT_FALLBACK, Number(h) || HEATMAP_HEIGHT_FALLBACK),
      });
    } catch {
      setPageSize({ width: HEATMAP_WIDTH, height: HEATMAP_HEIGHT_FALLBACK });
    }
  };

  if (!token) {
    return (
      <div style={{ padding: '2rem', color: '#2c2a26' }}>
        Требуется авторизация.
      </div>
    );
  }

  const avgMinutes = stats
    ? Math.round((stats.avg_time_on_page || 0) / 60)
    : 0;

  return (
    <div
      style={{
        padding: '2rem',
        backgroundColor: 'transparent',
        color: '#2c2a26',
        minHeight: '100%',
        boxSizing: 'border-box',
      }}
    >
      <h1
        style={{
          fontSize: '1.8rem',
          marginBottom: '1.5rem',
          color: '#c9a84c',
        }}
      >
        Аналитика
      </h1>

      {error && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            backgroundColor: '#fbeaea',
            color: '#9b2c2c',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid rgba(201, 168, 76, 0.25)',
            boxShadow: '0 4px 16px rgba(44, 42, 38, 0.06)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#6b6559' }}>
            Всего заявок
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 600, color: '#2c2a26' }}>
            {stats?.total_leads ?? (loading ? '…' : 0)}
          </div>
        </div>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid rgba(201, 168, 76, 0.25)',
            boxShadow: '0 4px 16px rgba(44, 42, 38, 0.06)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#6b6559' }}>
            За сегодня
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 600, color: '#2c2a26' }}>
            {stats?.leads_today ?? (loading ? '…' : 0)}
          </div>
        </div>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid rgba(201, 168, 76, 0.25)',
            boxShadow: '0 4px 16px rgba(44, 42, 38, 0.06)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#6b6559' }}>
            За неделю
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 600, color: '#2c2a26' }}>
            {stats?.leads_this_week ?? (loading ? '…' : 0)}
          </div>
        </div>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid rgba(201, 168, 76, 0.25)',
            boxShadow: '0 4px 16px rgba(44, 42, 38, 0.06)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#6b6559' }}>
            За месяц
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 600, color: '#2c2a26' }}>
            {stats?.leads_this_month ?? (loading ? '…' : 0)}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid rgba(201, 168, 76, 0.25)',
            boxShadow: '0 4px 16px rgba(44, 42, 38, 0.06)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#6b6559' }}>
            Среднее время на странице
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 600, color: '#2c2a26' }}>
            {loading ? '…' : `${avgMinutes} мин`}
          </div>
        </div>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid rgba(201, 168, 76, 0.25)',
            boxShadow: '0 4px 16px rgba(44, 42, 38, 0.06)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#6b6559' }}>
            Среднее количество возвратов
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 600, color: '#2c2a26' }}>
            {stats
              ? (stats.avg_return_count ?? 0).toFixed(2)
              : loading
                ? '…'
                : '0.00'}
          </div>
        </div>
      </div>

      {/* Heatmap block */}
      <div
        style={{
          marginTop: '1rem',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '1rem',
          border: '1px solid rgba(201, 168, 76, 0.25)',
          boxShadow: '0 4px 16px rgba(44, 42, 38, 0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ fontWeight: 500, color: '#2c2a26' }}>Карта активности</div>
          <div
            style={{
              display: 'inline-flex',
              borderRadius: '999px',
              border: '1px solid rgba(201, 168, 76, 0.4)',
              overflow: 'hidden',
            }}
          >
            {[
              { key: 'clicks', label: 'Клики' },
              { key: 'hovers', label: 'Движение мыши' },
            ].map((tab) => {
              const active = mode === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setMode(tab.key)}
                  style={{
                    padding: '0.3rem 0.9rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    backgroundColor: active ? '#c9a84c' : 'transparent',
                    color: active ? '#1a1a1a' : '#5a564d',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '72vh',
            overflow: 'auto',
            borderRadius: '12px',
            border: '1px solid #e0ddd7',
            backgroundColor: '#fff',
          }}
          ref={viewportRef}
        >
          <div
            style={{
              position: 'relative',
              width: `${HEATMAP_WIDTH}px`,
              height: `${pageSize.height}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <iframe
              ref={iframeRef}
              onLoad={handleIframeLoad}
              title="Site preview"
              src="/"
              width={HEATMAP_WIDTH}
              height={pageSize.height}
              style={{
                border: 'none',
                pointerEvents: 'none',
                display: 'block',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 1,
              }}
            />
            <div
              ref={heatmapContainerRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${HEATMAP_WIDTH}px`,
                height: `${pageSize.height}px`,
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

