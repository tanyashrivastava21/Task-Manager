import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const navLinks = [
    { to: '/dashboard', label: '📊 Dashboard' },
    { to: '/projects', label: '📁 Projects' },
    ...(user?.role === 'ADMIN' ? [{ to: '/admin', label: '🛡️ Admin' }] : []),
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">TaskFlow</span>
        </Link>
      </div>

      <div className="navbar-links">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`nav-link ${location.pathname === link.to ? 'active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="navbar-user">
        <div className="user-avatar">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="user-info">
          <span className="user-name">{user?.name}</span>
          <span className={`role-badge ${user?.role === 'ADMIN' ? 'admin' : 'member'}`}>
            {user?.role}
          </span>
        </div>
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="btn btn-ghost btn-sm"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
