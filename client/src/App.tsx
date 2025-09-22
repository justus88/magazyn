import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthContext } from './context/AuthContext';
import { InventoryPage } from './pages/InventoryPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import './App.css';

function AuthenticatedHeader() {
  const { user, logout } = useAuthContext();

  if (!user) {
    return null;
  }

  return (
    <header className="top-nav">
      <div className="top-nav__brand">
        <span className="top-nav__title">Magazyn serwisowy</span>
      </div>
      <nav className="top-nav__menu">
        <Link to="/" className="top-nav__link">
          Stany magazynu
        </Link>
        {user.role === 'ADMIN' ? (
          <Link to="/admin/users" className="top-nav__link">
            Panel administratora
          </Link>
        ) : null}
      </nav>
      <div className="top-nav__user">
        <div>
          <span className="top-nav__user-name">{user.email}</span>
          <span className="top-nav__user-role">Rola: {user.role.toLowerCase()}</span>
        </div>
        <button type="button" className="top-nav__logout" onClick={logout}>
          Wyloguj
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const { isAuthenticated } = useAuthContext();

  return (
    <div className="app-root">
      {isAuthenticated ? <AuthenticatedHeader /> : null}
      <main className={isAuthenticated ? 'app-main app-main--authenticated' : 'app-main'}>
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<InventoryPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>

          <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  );
}
