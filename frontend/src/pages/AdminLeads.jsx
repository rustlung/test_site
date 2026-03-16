import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = '/api';
const TOKEN_KEY = 'admin_token';

const rowBgByTemp = {
  hot: '#fce8e8',
  warm: '#fcf0e0',
  cold: '#e5eef8',
};

const thStyle = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  color: '#c9a84c',
  fontWeight: 600,
  letterSpacing: '0.04em',
};
const rowStyle = { borderBottom: '1px solid #e8e6e1' };
const tdStyle = { padding: '0.7rem 1rem', color: '#2c2a26' };

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AdminLeads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [modalLead, setModalLead] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

  useEffect(() => {
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/leads/prioritized`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          navigate('/admin/login', { replace: true });
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          let message = 'Ошибка загрузки заявок';
          const detail = data && data.detail;
          if (typeof detail === 'string') {
            message = detail;
          } else if (Array.isArray(detail)) {
            message = detail
              .map((d) => (typeof d === 'string' ? d : d?.msg || JSON.stringify(d)))
              .join('; ');
          } else if (detail) {
            message = JSON.stringify(detail);
          }
          setError(message);
          return;
        }
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setLeads(data);
        }
      } catch {
        if (!cancelled) setError('Ошибка сети');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token, navigate]);

  useEffect(() => {
    if (!selectedId || !token) {
      setModalLead(null);
      return;
    }
    let cancelled = false;
    setModalLoading(true);
    setModalLead(null);
    fetch(`${API_BASE}/leads/${selectedId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          navigate('/admin/login', { replace: true });
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) {
          setModalLead(data);
        }
      })
      .catch(() => {
        if (!cancelled) setModalLead(null);
      })
      .finally(() => {
        if (!cancelled) setModalLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedId, token, navigate]);

  const closeModal = () => {
    setSelectedId(null);
    setModalLead(null);
  };

  const contactLabel = (method) => {
    const m = { phone: 'Телефон', email: 'Email', telegram: 'Telegram', whatsapp: 'WhatsApp' };
    return m[method] || method;
  };

  return (
    <div
      style={{
        color: '#2c2a26',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <h1
        style={{
          fontSize: '1.75rem',
          marginBottom: '1.5rem',
          color: '#c9a84c',
          fontWeight: 600,
        }}
      >
        Заявки
      </h1>

      {error && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            backgroundColor: '#fbeaea',
            color: '#9b2c2c',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6b6559' }}>Загрузка...</p>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            borderRadius: '12px',
            border: '1px solid rgba(201, 168, 76, 0.3)',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 20px rgba(44, 42, 38, 0.06)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #c9a84c', backgroundColor: '#f8f6f3' }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Имя</th>
                <th style={thStyle}>Компания</th>
                <th style={thStyle}>Бюджет</th>
                <th style={thStyle}>Дедлайн</th>
                <th style={thStyle}>Способ связи</th>
                <th style={thStyle}>Контакт</th>
                <th style={thStyle}>Температура</th>
                <th style={thStyle}>Дата заявки</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedId(lead.id)}
                  style={{
                    ...rowStyle,
                    backgroundColor: rowBgByTemp[lead.temperature] || '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <td style={tdStyle}>{lead.id}</td>
                  <td style={tdStyle}>
                    {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td style={tdStyle}>
                    {[lead.business_niche, lead.company_size].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td style={tdStyle}>{lead.budget ?? '—'}</td>
                  <td style={tdStyle}>{lead.deadline ?? '—'}</td>
                  <td style={tdStyle}>{contactLabel(lead.contact_method) || '—'}</td>
                  <td style={tdStyle}>{lead.contact_value ?? '—'}</td>
                  <td style={tdStyle}>{lead.temperature ?? '—'}</td>
                  <td style={tdStyle}>{formatDate(lead.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 && (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#6b6559' }}>
              Заявок пока нет
            </p>
          )}
        </div>
      )}

      {selectedId != null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
            padding: '2rem',
            boxSizing: 'border-box',
          }}
          onClick={closeModal}
          role="presentation"
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid rgba(201, 168, 76, 0.4)',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '1.75rem 2rem',
              boxShadow: '0 18px 45px rgba(44, 42, 38, 0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <h2
              id="modal-title"
              style={{
                marginTop: 0,
                marginBottom: '1.25rem',
                color: '#c9a84c',
                fontSize: '1.35rem',
              }}
            >
              Заявка #{selectedId}
            </h2>

            {modalLoading ? (
              <p style={{ color: '#6b6559' }}>Загрузка...</p>
            ) : modalLead ? (
              <>
                <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '1.25rem' }}>
                  {[
                    ['Имя', [modalLead.first_name, modalLead.last_name, modalLead.patronymic].filter(Boolean).join(' ')],
                    ['Описание бизнеса', modalLead.business_info],
                    ['Ниша', modalLead.business_niche],
                    ['Размер компании', modalLead.company_size],
                    ['Объём задачи', modalLead.task_volume],
                    ['Роль', modalLead.role],
                    ['Бюджет', modalLead.budget],
                    ['Тип задачи', modalLead.task_type],
                    ['Продукт', modalLead.interested_product],
                    ['Дедлайн', modalLead.deadline],
                    ['Способ связи', contactLabel(modalLead.contact_method)],
                    ['Контакт', modalLead.contact_value],
                    ['Удобное время', modalLead.convenient_time],
                    ['Комментарий', modalLead.comment],
                    ['Температура', modalLead.temperature],
                    ['Балл', modalLead.score],
                    ['Дата заявки', formatDate(modalLead.created_at)],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <span style={{ color: '#6b6559', minWidth: '140px' }}>{label}:</span>
                      <span style={{ color: '#2c2a26' }}>{value ?? '—'}</span>
                    </div>
                  ))}
                </div>

                {modalLead.behavior && (
                  <div
                    style={{
                      borderTop: '1px solid #e8e6e1',
                      paddingTop: '1rem',
                      marginTop: '0.5rem',
                    }}
                  >
                    <div style={{ color: '#c9a84c', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Поведение на странице
                    </div>
                    <div style={{ display: 'grid', gap: '0.4rem', fontSize: '0.85rem', color: '#2c2a26' }}>
                      <div><span style={{ color: '#6b6559' }}>Время на странице (сек):</span> {modalLead.behavior.time_on_page}</div>
                      <div><span style={{ color: '#6b6559' }}>Возвратов:</span> {modalLead.behavior.return_count}</div>
                      {modalLead.behavior.clicks != null && (
                        <div><span style={{ color: '#6b6559' }}>Кликов:</span> {Array.isArray(modalLead.behavior.clicks) ? modalLead.behavior.clicks.length : '—'}</div>
                      )}
                      {modalLead.behavior.hovers != null && (
                        <div><span style={{ color: '#6b6559' }}>Наведений:</span> {Array.isArray(modalLead.behavior.hovers) ? modalLead.behavior.hovers.length : '—'}</div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    marginTop: '1.5rem',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '999px',
                    border: '1px solid rgba(201, 168, 76, 0.6)',
                    backgroundColor: 'transparent',
                    color: '#8a7530',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  Закрыть
                </button>
              </>
            ) : (
              <p style={{ color: '#6b6559' }}>Не удалось загрузить заявку</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
