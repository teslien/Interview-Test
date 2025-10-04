import React from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TestLogin = () => {
  const testLogin = async () => {
    try {
      toast.info('Starting test login...');
      console.log('API URL:', API);
      
      const response = await axios.post(`${API}/auth/login`, { 
        email: 'admin@example.com', 
        password: 'admin123' 
      });
      
      toast.success('Login successful: ' + JSON.stringify(response.data));
      
      // Redirect manually
      window.location.href = '/admin';
      
    } catch (error) {
      toast.error('Login failed: ' + error.message);
      console.error('Login error:', error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{ marginBottom: '20px' }}>Test Login</h1>
        <button
          onClick={testLogin}
          style={{
            padding: '12px 24px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Test Login as Admin
        </button>
        
        <button
          onClick={() => toast.success('Alert test working!')}
          style={{
            padding: '12px 24px',
            background: '#48bb78',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer',
            marginLeft: '10px'
          }}
        >
          Test Alert
        </button>
      </div>
    </div>
  );
};

export default TestLogin;