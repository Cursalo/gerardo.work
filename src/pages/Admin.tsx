import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLogin from '../components/admin/AdminLogin';
import { ModernAdminDashboard } from '../components/admin/ModernAdminDashboard';

function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  
  // Check if admin is authenticated
  useEffect(() => {
    const adminAuth = localStorage.getItem('isAdminAuthenticated');
    setIsAuthenticated(adminAuth === 'true');
  }, []);

  // Set cursor to default for admin panel
  useEffect(() => {
    document.body.style.cursor = 'default';
    return () => {
      document.body.style.cursor = 'none';
    };
  }, []);

  const handleLogin = () => {
    localStorage.setItem('isAdminAuthenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    setIsAuthenticated(false);
    navigate('/');
  };

  // If not authenticated, show login
  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  // If authenticated, show admin dashboard
  return <ModernAdminDashboard onLogout={handleLogout} />;
}

export default Admin; 