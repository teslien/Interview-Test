import React from 'react';
import { useAuth } from './App';

const SimpleAdmin = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a202c', margin: '0 0 8px' }}>
              Admin Dashboard
            </h1>
            <p style={{ color: '#718096', margin: 0 }}>
              Welcome back, {user?.full_name}
            </p>
          </div>
          <button
            onClick={logout}
            style={{
              padding: '8px 16px',
              background: '#f56565',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2d3748', margin: '0 0 8px' }}>
              Total Tests
            </h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#4299e1', margin: 0 }}>5</p>
          </div>
          
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2d3748', margin: '0 0 8px' }}>
              Invites Sent
            </h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#48bb78', margin: 0 }}>12</p>
          </div>
          
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2d3748', margin: '0 0 8px' }}>
              Completed Tests
            </h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#9f7aea', margin: 0 }}>8</p>
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a202c', marginBottom: '24px' }}>
            Quick Actions
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <button
              onClick={() => alert('Create Test functionality will be implemented!')}
              style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              📝 Create Test
            </button>
            
            <button
              onClick={() => alert('Send Invite functionality will be implemented!')}
              style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              📧 Send Invite
            </button>
            
            <button
              onClick={() => alert('View Results functionality will be implemented!')}
              style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              📊 View Results
            </button>
            
            <button
              onClick={() => alert('Monitor Tests functionality will be implemented!')}
              style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #9f7aea 0%, #805ad5 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              📹 Monitor Tests
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleAdmin;