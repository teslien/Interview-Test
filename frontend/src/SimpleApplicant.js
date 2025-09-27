import React from 'react';
import { useAuth } from './App';

const SimpleApplicant = () => {
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
              Applicant Dashboard
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
              Upcoming Tests
            </h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#4299e1', margin: 0 }}>2</p>
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
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#48bb78', margin: 0 }}>1</p>
          </div>
          
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2d3748', margin: '0 0 8px' }}>
              Average Score
            </h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#9f7aea', margin: 0 }}>85%</p>
          </div>
        </div>

        {/* Test List */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a202c', marginBottom: '24px' }}>
            Your Tests
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Upcoming Test */}
            <div style={{
              padding: '20px',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              background: '#f7fafc'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                  Frontend Developer Assessment
                </h3>
                <span style={{
                  padding: '4px 12px',
                  background: '#bee3f8',
                  color: '#2b6cb0',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  SCHEDULED
                </span>
              </div>
              <p style={{ color: '#718096', margin: '0 0 16px' }}>
                Scheduled for: Tomorrow, 2:00 PM • Duration: 90 minutes
              </p>
              <button
                onClick={() => alert('Take Test functionality will be implemented!')}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Take Test
              </button>
            </div>

            {/* Completed Test */}
            <div style={{
              padding: '20px',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              background: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                  JavaScript Fundamentals
                </h3>
                <span style={{
                  padding: '4px 12px',
                  background: '#c6f6d5',
                  color: '#22543d',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  COMPLETED
                </span>
              </div>
              <p style={{ color: '#718096', margin: '0 0 16px' }}>
                Completed: Last week • Score: 85/100
              </p>
              <button
                onClick={() => alert('View Results functionality will be implemented!')}
                style={{
                  padding: '8px 16px',
                  background: '#48bb78',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                View Results
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleApplicant;