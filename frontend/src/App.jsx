import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import Home from './pages/Home';
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './pages/AdminLayout';
import AdminLeads from './pages/AdminLeads';
import AdminServices from './pages/AdminServices';
import AdminAnalytics from './pages/AdminAnalytics';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('admin_token');
  return token ? children : <Navigate to="/admin/login" replace />;
}

class AppErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#333' }}>
          <h1>Ошибка</h1>
          <pre style={{ background: '#f5f5f5', padding: '1rem', overflow: 'auto' }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={(
            <PrivateRoute>
              <AdminLayout />
            </PrivateRoute>
          )}
        >
          <Route index element={<Navigate to="/admin/leads" replace />} />
          <Route path="leads" element={<AdminLeads />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="analytics" element={<AdminAnalytics />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AppErrorBoundary>
  );
}
