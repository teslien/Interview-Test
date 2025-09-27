import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WorkingTakeTest = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  
  const [invite, setInvite] = useState(null);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [videoStream, setVideoStream] = useState(null);

  useEffect(() => {
    fetchTestDetails();
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [token]);

  useEffect(() => {
    if (testStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [testStarted, timeLeft]);

  const fetchTestDetails = async () => {
    try {
      console.log('Fetching test details for token:', token);
      console.log('API URL:', `${API}/take-test/${token}`);
      const response = await axios.get(`${API}/take-test/${token}`);
      console.log('Test details response:', response.data);
      
      setInvite(response.data.invite);
      setTest(response.data.test);
      setTimeLeft(response.data.test.duration_minutes * 60);
      console.log('Test loaded successfully');
    } catch (error) {
      console.error('Failed to fetch test details:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      alert('DEBUG - Unable to load test. Error: ' + (error.response?.data?.detail || error.message) + ' Status: ' + (error.response?.status || 'no status'));
      // Don't navigate for now, stay on page for debugging
      // navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      return true;
    } catch (error) {
      console.error('Failed to start video:', error);
      alert('Camera access is required for the test. Please allow camera access.');
      return false;
    }
  };

  const handleStartTest = async () => {
    const videoStarted = await startVideo();
    if (videoStarted) {
      setTestStarted(true);
      alert('Test started! You are being monitored via video.');
    } else {
      // Allow test to proceed even without video for testing purposes
      const proceedWithoutVideo = window.confirm(
        'Camera access was denied. The test requires video monitoring for verification. Do you want to proceed anyway for testing purposes?'
      );
      if (proceedWithoutVideo) {
        setTestStarted(true);
        alert('Test started without video monitoring (testing mode).');
      }
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitTest = async () => {
    try {
      const submission = {
        answers: answers,
        submitted_at: new Date().toISOString()
      };
      
      await axios.post(`${API}/submit-test/${token}`, submission);
      alert('Test submitted successfully!');
      navigate('/');
    } catch (error) {
      console.error('Failed to submit test:', error);
      alert('Failed to submit test: ' + (error.response?.data?.detail || error.message));
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Loading test...</p>
        </div>
      </div>
    );
  }

  if (!testStarted) {
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
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          maxWidth: '600px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{
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
          }}>
            📝
          </div>
          
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
            {test?.title || 'Loading Test...'}
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            {test?.description || 'Loading test description...'}
          </p>
          
          <div style={{ 
            background: '#f8fafc', 
            padding: '20px', 
            borderRadius: '12px', 
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <h3 style={{ marginBottom: '12px', fontWeight: '600' }}>Test Information:</h3>
            <p><strong>Applicant:</strong> {invite?.applicant_name || 'Loading...'}</p>
            <p><strong>Duration:</strong> {test?.duration_minutes || 0} minutes</p>
            <p><strong>Questions:</strong> {test?.questions?.length || 0}</p>
          </div>
          
          <div style={{ 
            background: '#fef3c7', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '24px',
            border: '1px solid #f59e0b'
          }}>
            <p style={{ color: '#92400e', fontSize: '14px' }}>
              ⚠️ This test requires video monitoring. Please ensure your camera is working and you're in a quiet environment.
            </p>
          </div>
          
          <button
            onClick={handleStartTest}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Start Test
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = test?.questions[currentQuestionIndex];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 0',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                {test?.title}
              </h1>
              <p style={{ color: '#6b7280', margin: 0 }}>
                Question {currentQuestionIndex + 1} of {test?.questions?.length}
              </p>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '24px',
              fontSize: '18px',
              fontWeight: '600',
              color: timeLeft < 300 ? '#dc2626' : '#374151'
            }}>
              <span>⏱️ {formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Main Content */}
        <div style={{ flex: 1, marginRight: '24px' }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <span style={{
                background: '#6366f1',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {currentQuestion?.type?.replace('_', ' ').toUpperCase()}
              </span>
              <span style={{ 
                marginLeft: '12px', 
                color: '#6b7280', 
                fontSize: '14px' 
              }}>
                {currentQuestion?.points} point{currentQuestion?.points !== 1 ? 's' : ''}
              </span>
            </div>

            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              marginBottom: '24px',
              lineHeight: '1.4'
            }}>
              {currentQuestion?.question}
            </h2>

            {/* Multiple Choice */}
            {currentQuestion?.type === 'multiple_choice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentQuestion.options?.map((option, index) => (
                  <label 
                    key={index} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: answers[currentQuestion.id] === option ? '#eff6ff' : 'white',
                      borderColor: answers[currentQuestion.id] === option ? '#3b82f6' : '#e5e7eb'
                    }}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      style={{ marginRight: '12px' }}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Essay */}
            {currentQuestion?.type === 'essay' && (
              <textarea
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="Type your answer here..."
                style={{
                  width: '100%',
                  minHeight: '200px',
                  padding: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            )}

            {/* Coding */}
            {currentQuestion?.type === 'coding' && (
              <div>
                <p style={{ 
                  color: '#6b7280', 
                  marginBottom: '12px', 
                  fontSize: '14px' 
                }}>
                  Expected Language: {currentQuestion.expected_language}
                </p>
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="Write your code here..."
                  style={{
                    width: '100%',
                    minHeight: '300px',
                    padding: '16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            {/* Navigation */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginTop: '32px' 
            }}>
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                style={{
                  padding: '12px 24px',
                  border: '2px solid #e5e7eb',
                  background: 'white',
                  borderRadius: '8px',
                  cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentQuestionIndex === 0 ? 0.5 : 1
                }}
              >
                ← Previous
              </button>

              <div style={{ display: 'flex', gap: '12px' }}>
                {currentQuestionIndex < test.questions.length - 1 ? (
                  <button
                    onClick={handleNextQuestion}
                    style={{
                      padding: '12px 24px',
                      background: '#6366f1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitTest}
                    style={{
                      padding: '12px 24px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Submit Test
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Video Monitor */}
        <div style={{ width: '300px', flexShrink: 0 }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '12px' 
            }}>
              Video Monitoring
            </h3>
            <video
              ref={videoRef}
              autoPlay
              muted
              style={{
                width: '100%',
                height: '200px',
                borderRadius: '8px',
                background: '#000',
                objectFit: 'cover'
              }}
            />
            <p style={{ 
              fontSize: '12px', 
              color: '#6b7280', 
              marginTop: '8px',
              textAlign: 'center'
            }}>
              🔴 Recording for verification
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkingTakeTest;