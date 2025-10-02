import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import BrandIcon from './ui/BrandIcon';
import axios from 'axios';

const SimpleLoginFixed = () => {
  const navigate = useNavigate();
  const { login, register, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  
  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  
  // Register form state
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'applicant'
  });

  // Admin restriction state
  const [adminExists, setAdminExists] = useState(false);
  const [checkingAdminStatus, setCheckingAdminStatus] = useState(true);

  // Check if admin exists
  const checkAdminStatus = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/check-signup-restriction`);
      setAdminExists(response.data.admin_exists);
    } catch (error) {
      console.error('Failed to check admin status:', error);
      // Default to allowing admin signup if check fails
      setAdminExists(false);
    } finally {
      setCheckingAdminStatus(false);
    }
  };

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/applicant');
      }
    }
  }, [user, navigate]);

  // Check admin status on component mount
  useEffect(() => {
    checkAdminStatus();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const userData = await login(loginData.email, loginData.password);
      if (userData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/applicant');
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await register(
        registerData.email,
        registerData.password,
        registerData.fullName,
        registerData.role
      );
      // Reset form
      setRegisterData({
        email: '',
        password: '',
        fullName: '',
        role: 'applicant'
      });
      setActiveTab('login');
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '20px'
    },
    card: {
      background: 'rgba(255, 255, 255, 0.9)',
      borderRadius: '16px',
      padding: '40px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
      width: '100%',
      maxWidth: '400px'
    },
    logo: {
      width: '80px',
      height: '80px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 24px',
      color: 'white',
      fontSize: '32px',
      fontWeight: 'bold'
    },
    title: {
      textAlign: 'center',
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1a202c',
      marginBottom: '8px'
    },
    subtitle: {
      textAlign: 'center',
      color: '#718096',
      marginBottom: '32px'
    },
    tabsContainer: {
      display: 'flex',
      marginBottom: '24px',
      background: '#f7fafc',
      borderRadius: '8px',
      padding: '4px'
    },
    tab: {
      flex: 1,
      padding: '8px 16px',
      textAlign: 'center',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'all 0.2s'
    },
    activeTab: {
      background: '#667eea',
      color: 'white'
    },
    inactiveTab: {
      background: 'transparent',
      color: '#718096'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '500',
      color: '#2d3748'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '16px',
      transition: 'border-color 0.2s',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '12px 16px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '16px',
      background: 'white',
      boxSizing: 'border-box'
    },
    button: {
      width: '100%',
      padding: '12px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      marginBottom: '16px'
    },
    loginButton: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    },
    registerButton: {
      background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
      color: 'white'
    },
    disabledButton: {
      background: '#a0aec0',
      cursor: 'not-allowed'
    },
    demoAccounts: {
      textAlign: 'center',
      fontSize: '14px',
      color: '#718096',
      paddingTop: '20px',
      borderTop: '1px solid #e2e8f0'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <BrandIcon className="h-16 w-16" showText={true} textClassName="text-2xl font-bold" />
        </div>
        {/* <h1 style={styles.title}>Interview Test Platform</h1> */}
        <p style={styles.subtitle}>Secure pre-interview assessments with live monitoring</p>
        
        {/* Tabs */}
        <div style={styles.tabsContainer}>
          <div
            style={{
              ...styles.tab,
              ...(activeTab === 'login' ? styles.activeTab : styles.inactiveTab)
            }}
            onClick={() => setActiveTab('login')}
          >
            Sign In
          </div>
          <div
            style={{
              ...styles.tab,
              ...(activeTab === 'register' ? styles.activeTab : styles.inactiveTab)
            }}
            onClick={() => setActiveTab('register')}
          >
            Sign Up
          </div>
        </div>
        
        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                style={styles.input}
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                required
                data-testid="login-email-input"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                style={styles.input}
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                required
                data-testid="login-password-input"
              />
            </div>
            
            <button
              type="submit"
              style={{
                ...styles.button,
                ...(isLoading ? styles.disabledButton : styles.loginButton)
              }}
              disabled={isLoading}
              data-testid="login-submit-button"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}
        
        {/* Register Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                style={styles.input}
                value={registerData.fullName}
                onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                required
                data-testid="register-name-input"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                style={styles.input}
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                required
                data-testid="register-email-input"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                placeholder="Create a password"
                style={styles.input}
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                required
                data-testid="register-password-input"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Role</label>
              <select
                style={styles.select}
                value={registerData.role}
                onChange={(e) => setRegisterData({ ...registerData, role: e.target.value })}
                data-testid="register-role-select"
                disabled={checkingAdminStatus}
              >
                <option value="applicant">Applicant</option>
                {checkingAdminStatus ? (
                  <option value="applicant">Loading...</option>
                ) : (
                  !adminExists && <option value="admin">Admin</option>
                )}
              </select>
              {adminExists && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #f59e0b',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#92400e'
                }}>
                  <strong>Note:</strong> Admin registration is not available. Only applicants can register when admins already exist.
                </div>
              )}
            </div>
            
            <button
              type="submit"
              style={{
                ...styles.button,
                ...(isLoading ? styles.disabledButton : styles.registerButton)
              }}
              disabled={isLoading}
              data-testid="register-submit-button"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}
        
        {/* Demo Accounts Info */}
        <div style={styles.demoAccounts}>
          <p style={{ margin: '0 0 8px' }}>Demo Accounts:</p>
          <p style={{ margin: '4px 0' }}><strong>Admin:</strong> admin@example.com / admin123</p>
          <p style={{ margin: '4px 0' }}><strong>Applicant:</strong> applicant@example.com / applicant123</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleLoginFixed;