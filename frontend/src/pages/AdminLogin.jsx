import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = '/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasAdmin, setHasAdmin] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function checkAdmin() {
      try {
        const res = await fetch(`${API_BASE}/auth/has-admin`);
        if (!res.ok) {
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!cancelled && typeof data.has_admin === 'boolean') {
          setHasAdmin(data.has_admin);
        }
      } catch {
        // ignore network errors here
      } finally {
        if (!cancelled) {
          setCheckingAdmin(false);
        }
      }
    }
    checkAdmin();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Введите логин и пароль');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        setError('Неверный логин или пароль');
        return;
      }
      if (!res.ok || !data.access_token) {
        setError('Ошибка входа. Попробуйте позже.');
        return;
      }
      try {
        localStorage.setItem('admin_token', data.access_token);
      } catch {
        // ignore storage error
      }
      navigate('/admin/leads', { replace: true });
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password || !confirmPassword) {
      setError('Заполните все поля');
      return;
    }
    if (password.length < 8) {
      setError('Пароль должен быть не менее 8 символов');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.access_token) {
        if (res.status === 400 && data.detail) {
          setError(typeof data.detail === 'string' ? data.detail : 'Регистрация недоступна');
        } else {
          setError('Ошибка регистрации. Попробуйте позже.');
        }
        return;
      }
      try {
        localStorage.setItem('admin_token', data.access_token);
      } catch {
        // ignore
      }
      navigate('/admin/leads', { replace: true });
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #fdfcfb 0%, #f5f2ed 100%)',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '2.5rem 2.75rem',
          boxShadow: '0 18px 45px rgba(0,0,0,0.08)',
          border: '1px solid rgba(201, 168, 76, 0.35)',
          maxWidth: '400px',
          width: '100%',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: '1.8rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#2c2a26',
            }}
          >
            Résidé Prestige
          </div>
          <div
            style={{
              marginTop: '0.4rem',
              fontSize: '0.9rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#8a8374',
            }}
          >
            Панель администратора
          </div>
        </div>

        <form onSubmit={hasAdmin ? handleLogin : handleRegister}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#6b6559',
                display: 'block',
                marginBottom: '0.35rem',
              }}
            >
              Логин
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 0.9rem',
                borderRadius: '10px',
                border: '1px solid #ded8cc',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#6b6559',
                display: 'block',
                marginBottom: '0.35rem',
              }}
            >
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 0.9rem',
                borderRadius: '10px',
                border: '1px solid #ded8cc',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>

          {!hasAdmin && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: '#6b6559',
                  display: 'block',
                  marginBottom: '0.35rem',
                }}
              >
                Подтверждение пароля
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '10px',
                  border: '1px solid #ded8cc',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {error && (
            <div
              style={{
                marginBottom: '0.9rem',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                backgroundColor: '#fbeaea',
                color: '#9b2c2c',
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '999px',
              border: 'none',
              background:
                'linear-gradient(135deg, #c9a84c 0%, #e3c975 50%, #c19a3a 100%)',
              color: '#1a1a1a',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: loading ? 'default' : 'pointer',
              boxShadow: '0 10px 25px rgba(201,168,76,0.35)',
              marginBottom: 0,
            }}
          >
            {loading ? (hasAdmin ? 'Вход...' : 'Регистрация...') : (hasAdmin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>
      </div>
    </div>
  );
}


