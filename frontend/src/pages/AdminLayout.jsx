import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

function NavItem({ label, to, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '0.7rem 1rem',
        borderRadius: '999px',
        border: 'none',
        marginBottom: '0.35rem',
        cursor: 'pointer',
        background: active
          ? 'linear-gradient(135deg, #c9a84c 0%, #e3c975 50%, #c19a3a 100%)'
          : 'transparent',
        color: active ? '#1a1a1a' : '#5a564d',
        fontSize: '0.95rem',
        fontWeight: active ? 600 : 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        borderColor: 'transparent',
      }}
    >
      {label}
    </button>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const pathname = location.pathname || '';

  const go = (path) => {
    if (pathname !== path) {
      navigate(path);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('admin_token');
    } catch {
      // ignore
    }
    navigate('/admin/login', { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: '#fdfcfb',
        color: '#2c2a26',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <aside
        style={{
          width: '260px',
          padding: '2rem 1.5rem',
          borderRight: '1px solid rgba(201, 168, 76, 0.25)',
          background: 'linear-gradient(180deg, #f8f6f3 0%, #f5f2ed 100%)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ marginBottom: '2.5rem' }}>
          <div
            style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: '1.6rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#2c2a26',
            }}
          >
            Résidé Prestige
          </div>
          <div
            style={{
              marginTop: '0.3rem',
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#c9a84c',
            }}
          >
            Admin
          </div>
        </div>

        <nav>
          <NavItem
            label="Заявки"
            to="/admin/leads"
            active={pathname.startsWith('/admin/leads')}
            onClick={() => go('/admin/leads')}
          />
          <NavItem
            label="Услуги"
            to="/admin/services"
            active={pathname.startsWith('/admin/services')}
            onClick={() => go('/admin/services')}
          />
          <NavItem
            label="Аналитика"
            to="/admin/analytics"
            active={pathname.startsWith('/admin/analytics')}
            onClick={() => go('/admin/analytics')}
          />
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.6rem 1rem',
              borderRadius: '999px',
              border: '1px solid rgba(201, 168, 76, 0.5)',
              backgroundColor: 'transparent',
              color: '#5a564d',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Выйти
          </button>
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          padding: '2rem 2.5rem',
          backgroundColor: '#fdfcfb',
          boxSizing: 'border-box',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}


