import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = '/api';
const TOKEN_KEY = 'admin_token';

const thStyle = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  color: '#c9a84c',
  fontWeight: 600,
  letterSpacing: '0.04em',
};
const tdStyle = { padding: '0.7rem 1rem', color: '#2c2a26' };
const rowStyle = { borderBottom: '1px solid #e8e6e1' };

const defaultForm = {
  name: '',
  description: '',
  budget_min: '',
  budget_max: '',
  is_active: true,
};

function normalizeErrorDetail(data) {
  const detail = data && data.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d === 'string' ? d : d?.msg || JSON.stringify(d)))
      .join('; ');
  }
  if (detail) return JSON.stringify(detail);
  return 'Ошибка операции';
}

export default function AdminServices() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

  const loadServices = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/services/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        navigate('/admin/login', { replace: true });
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(normalizeErrorDetail(data));
        return;
      }
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }
    loadServices();
  }, [token, navigate]);

  const openAdd = () => {
    setFormData(defaultForm);
    setModalMode('add');
    setEditingId(null);
    setError('');
  };

  const openEdit = (service) => {
    setFormData({
      name: service.name ?? '',
      description: service.description ?? '',
      budget_min: service.budget_min ?? '',
      budget_max: service.budget_max ?? '',
      is_active: service.is_active ?? true,
    });
    setModalMode('edit');
    setEditingId(service.id);
    setError('');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormData(defaultForm);
    setSubmitLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    const name = (formData.name || '').trim();
    const budget_min = Number(formData.budget_min);
    const budget_max = Number(formData.budget_max);
    if (!name) {
      setError('Укажите название');
      return;
    }
    if (Number.isNaN(budget_min) || budget_min < 0) {
      setError('Бюджет мин — целое число ≥ 0');
      return;
    }
    if (Number.isNaN(budget_max) || budget_max < 0) {
      setError('Бюджет макс — целое число ≥ 0');
      return;
    }
    if (budget_max < budget_min) {
      setError('Бюджет макс должен быть ≥ бюджета мин');
      return;
    }
    setSubmitLoading(true);
    setError('');
    try {
      const body = {
        name,
        description: (formData.description || '').trim() || null,
        budget_min,
        budget_max,
        is_active: Boolean(formData.is_active),
      };
      const url = modalMode === 'edit'
        ? `${API_BASE}/services/${editingId}`
        : `${API_BASE}/services/`;
      const method = modalMode === 'edit' ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        navigate('/admin/login', { replace: true });
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(normalizeErrorDetail(data));
        return;
      }
      closeModal();
      await loadServices();
    } catch {
      setError('Ошибка сети');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!token || !deleteConfirmId) return;
    setDeleteLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/services/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        navigate('/admin/login', { replace: true });
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(normalizeErrorDetail(data));
        return;
      }
      setDeleteConfirmId(null);
      await loadServices();
    } catch {
      setError('Ошибка сети');
    } finally {
      setDeleteLoading(false);
    }
  };

  const baseStyles = {
    color: '#2c2a26',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  };

  return (
    <div style={baseStyles}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.75rem', margin: 0, color: '#c9a84c', fontWeight: 600 }}>
          Услуги
        </h1>
        <button
          type="button"
          onClick={openAdd}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '999px',
            border: '1px solid #c9a84c',
            backgroundColor: '#c9a84c',
            color: '#1a1a1a',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Добавить услугу
        </button>
      </div>

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
                <th style={thStyle}>Название</th>
                <th style={thStyle}>Описание</th>
                <th style={thStyle}>Бюджет мин</th>
                <th style={thStyle}>Бюджет макс</th>
                <th style={thStyle}>Активна</th>
                <th style={thStyle}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} style={rowStyle}>
                  <td style={tdStyle}>{s.name ?? '—'}</td>
                  <td style={{ ...tdStyle, maxWidth: '240px' }}>
                    {s.description
                      ? (s.description.length > 80 ? `${s.description.slice(0, 80)}…` : s.description)
                      : '—'}
                  </td>
                  <td style={tdStyle}>{s.budget_min != null ? s.budget_min : '—'}</td>
                  <td style={tdStyle}>{s.budget_max != null ? s.budget_max : '—'}</td>
                  <td style={tdStyle}>{s.is_active ? 'Да' : 'Нет'}</td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      style={{
                        marginRight: '0.5rem',
                        padding: '0.35rem 0.7rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(201, 168, 76, 0.5)',
                        background: 'transparent',
                        color: '#6b6559',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(s.id)}
                      style={{
                        padding: '0.35rem 0.7rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(185, 28, 28, 0.5)',
                        background: 'transparent',
                        color: '#9b2c2c',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {services.length === 0 && (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#6b6559' }}>
              Услуг пока нет
            </p>
          )}
        </div>
      )}

      {/* Модалка добавления/редактирования */}
      {(modalMode === 'add' || modalMode === 'edit') && (
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
              maxWidth: '480px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '1.75rem 2rem',
              boxShadow: '0 18px 45px rgba(44, 42, 38, 0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 style={{ marginTop: 0, marginBottom: '1.25rem', color: '#c9a84c', fontSize: '1.35rem' }}>
              {modalMode === 'add' ? 'Добавить услугу' : 'Редактировать услугу'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ fontSize: '0.9rem', color: '#6b6559', fontWeight: 500 }}>
                  Название *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  required
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(201, 168, 76, 0.4)',
                    fontSize: '1rem',
                  }}
                />
                <label style={{ fontSize: '0.9rem', color: '#6b6559', fontWeight: 500 }}>
                  Описание
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(201, 168, 76, 0.4)',
                    fontSize: '1rem',
                    resize: 'vertical',
                  }}
                />
                <label style={{ fontSize: '0.9rem', color: '#6b6559', fontWeight: 500 }}>
                  Бюджет мин *
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.budget_min === '' ? '' : formData.budget_min}
                  onChange={(e) => setFormData((p) => ({ ...p, budget_min: e.target.value }))}
                  required
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(201, 168, 76, 0.4)',
                    fontSize: '1rem',
                  }}
                />
                <label style={{ fontSize: '0.9rem', color: '#6b6559', fontWeight: 500 }}>
                  Бюджет макс *
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.budget_max === '' ? '' : formData.budget_max}
                  onChange={(e) => setFormData((p) => ({ ...p, budget_max: e.target.value }))}
                  required
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(201, 168, 76, 0.4)',
                    fontSize: '1rem',
                  }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                  />
                  <span style={{ fontSize: '0.9rem', color: '#6b6559' }}>Активна</span>
                </label>
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '999px',
                    border: '1px solid rgba(201, 168, 76, 0.6)',
                    backgroundColor: 'transparent',
                    color: '#8a7530',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '999px',
                    border: '1px solid #c9a84c',
                    backgroundColor: '#c9a84c',
                    color: '#1a1a1a',
                    cursor: submitLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  {submitLoading ? 'Сохранение…' : (modalMode === 'add' ? 'Добавить' : 'Сохранить')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Подтверждение удаления */}
      {deleteConfirmId != null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 101,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
            padding: '2rem',
            boxSizing: 'border-box',
          }}
          onClick={() => !deleteLoading && setDeleteConfirmId(null)}
          role="presentation"
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid rgba(201, 168, 76, 0.4)',
              maxWidth: '400px',
              width: '100%',
              padding: '1.75rem 2rem',
              boxShadow: '0 18px 45px rgba(44, 42, 38, 0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#2c2a26', fontSize: '1.25rem' }}>
              Удалить услугу?
            </h2>
            <p style={{ color: '#6b6559', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Это действие нельзя отменить.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => !deleteLoading && setDeleteConfirmId(null)}
                disabled={deleteLoading}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '999px',
                  border: '1px solid rgba(201, 168, 76, 0.6)',
                  backgroundColor: 'transparent',
                  color: '#8a7530',
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleteLoading}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '999px',
                  border: '1px solid #9b2c2c',
                  backgroundColor: '#9b2c2c',
                  color: '#fff',
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                {deleteLoading ? 'Удаление…' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
