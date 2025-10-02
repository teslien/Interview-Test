import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

// WebRTC Configuration
const RTC_CONFIGURATION = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ]
};

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
  const [inviteId, setInviteId] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [webrtcConnected, setWebrtcConnected] = useState(false);

  useEffect(() => {
    fetchTestDetails();
    return () => {
      // Cleanup video stream
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      // Cleanup WebRTC connection
      if (peerConnection) {
        peerConnection.close();
      }
      // End WebRTC session
      if (inviteId) {
        axios.post(`${API}/webrtc/end-session/${inviteId}`).catch(console.error);
      }
    };
  }, [token]);

  // Effect to handle video stream assignment - only runs when videoStream changes
  useEffect(() => {
    if (videoStream && videoRef.current) {
      const videoElement = videoRef.current;
      
      // Only set if not already set to avoid re-renders and blinking
      if (videoElement.srcObject !== videoStream) {
        console.log('Setting video stream in useEffect');
        videoElement.srcObject = videoStream;
        
        // Add event listeners to debug
        const onLoadedMetadata = () => console.log('Video metadata loaded');
        const onCanPlay = () => console.log('Video can play');
        const onPlay = () => console.log('Video started playing');
        
        videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
        videoElement.addEventListener('canplay', onCanPlay);
        videoElement.addEventListener('play', onPlay);
        
        videoElement.play().catch(e => console.error('Video play failed:', e));
        
        // Cleanup listeners
        return () => {
          videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
          videoElement.removeEventListener('canplay', onCanPlay);
          videoElement.removeEventListener('play', onPlay);
        };
      }
    }
  }, [videoStream]);

  useEffect(() => {
    let timer;
    if (testStarted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Use setTimeout to avoid calling handleSubmitTest during render
            setTimeout(() => handleSubmitTest(), 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [testStarted]); // Only depend on testStarted, not timeLeft

  const fetchTestDetails = async () => {
    try {
      console.log('Fetching test details for token:', token);
      const response = await axios.get(`${API}/take-test/${token}`);
      console.log('Test details response:', response.data);
      
      setInvite(response.data.invite);
      setTest(response.data.test);
      setTimeLeft(response.data.test.duration_minutes * 60);
      setInviteId(response.data.invite.id);
      console.log('Test loaded successfully');
    } catch (error) {
      console.error('Failed to fetch test details:', error);
      console.error('Error response:', error.response);
      toast.error('Unable to load test: ' + (error.response?.data?.detail || error.message));
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const startVideoAndWebRTC = async () => {
    try {
      console.log('Starting video and WebRTC...');
      
      // Get user's media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      console.log('Got media stream:', stream);
      console.log('Video tracks:', stream.getVideoTracks());
      
      setVideoStream(stream);

      // Initialize WebRTC session for monitoring
      if (inviteId) {
        await initializeWebRTCSession(inviteId);
      }

      // Set up WebRTC peer connection as the "offerer" (applicant initiates)
      const pc = new RTCPeerConnection(RTC_CONFIGURATION);

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate && inviteId) {
          try {
            await axios.post(`${API}/webrtc/ice-candidate`, {
              candidate: event.candidate,
              invite_id: inviteId
            });
          } catch (error) {
            console.error('Failed to send ICE candidate:', error);
          }
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('WorkingTakeTest - Connection state:', pc.connectionState);
        switch (pc.connectionState) {
          case 'connected':
            console.log('WorkingTakeTest - WebRTC connected successfully');
            setWebrtcConnected(true);
            toast.success('Video monitoring connected');
            break;
          case 'connecting':
            console.log('WorkingTakeTest - WebRTC connecting...');
            break;
          case 'failed':
          case 'closed':
            console.log('WorkingTakeTest - WebRTC connection failed');
            setWebrtcConnected(false);
            break;
          default:
            console.log('WorkingTakeTest - Connection state changed:', pc.connectionState);
            break;
        }
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('WorkingTakeTest - Created and set local offer');

      // Send offer to admin via backend
      if (inviteId) {
        try {
          const response = await axios.post(`${API}/webrtc/offer`, {
            type: 'offer',
            sdp: offer.sdp,
            invite_id: inviteId
          });
          console.log('WorkingTakeTest - Offer sent successfully:', response.status);
        } catch (error) {
          console.error('WorkingTakeTest - Failed to send offer:', error.response?.data || error.message);
        }

        // Wait a bit for admin to initialize session, then poll for answer
        setTimeout(() => {
          console.log('WorkingTakeTest - Starting to poll for WebRTC answer');
          pollForWebRTCAnswer(pc);
        }, 1000);
      }

      setPeerConnection(pc);
      return true;
    } catch (error) {
      console.error('Failed to start video and WebRTC:', error);
      return false;
    }
  };

  const initializeWebRTCSession = async (inviteId) => {
    try {
      // Initialize WebRTC session in backend
      await axios.post(`${API}/webrtc/start-session/${inviteId}`);
      console.log('WebRTC session initialized');
    } catch (error) {
      console.error('Failed to initialize WebRTC session:', error);
    }
  };

  const pollForWebRTCAnswer = async (pc) => {
    if (!inviteId) return;

    try {
      const response = await axios.get(`${API}/webrtc/signals/${inviteId}`);
      const signals = response.data.signals;

      // Find the latest answer
      const answerSignal = signals
        .filter(signal => signal.type === 'answer')
        .pop();

      if (answerSignal && !webrtcConnected) {
        const answer = {
          type: 'answer',
          sdp: answerSignal.data.sdp
        };

        await pc.setRemoteDescription(answer);
        console.log('WorkingTakeTest - WebRTC answer received and set');
      }

      // Find ICE candidates and add them
      const iceCandidates = signals.filter(signal => signal.type === 'ice_candidate');
      for (const candidateSignal of iceCandidates) {
        if (candidateSignal.data.candidate) {
          try {
            await pc.addIceCandidate(candidateSignal.data.candidate);
          } catch (error) {
            console.error('Failed to add ICE candidate:', error);
          }
        }
      }

      // Continue polling if not connected
      if (!webrtcConnected) {
        console.log('WorkingTakeTest - Continuing to poll for WebRTC answer...');
        setTimeout(() => pollForWebRTCAnswer(pc), 2000);
      } else {
        console.log('WorkingTakeTest - WebRTC connected, stopping polling');
      }
    } catch (error) {
      console.error('Failed to poll for WebRTC answer:', error);
      // Continue polling on error
      if (!webrtcConnected) {
        setTimeout(() => pollForWebRTCAnswer(pc), 2000);
      }
    }
  };

  const handleStartTest = async () => {
    try {
      // First start the test in backend to set status to 'in_progress'
      await axios.post(`${API}/start-test/${token}`);

      // Then start video and WebRTC
      const videoStarted = await startVideoAndWebRTC();
      if (videoStarted) {
        setTestStarted(true);
        toast.success('Test started! Video monitoring enabled.');
      } else {
        const proceedWithoutVideo = window.confirm(
          'Camera access was denied. The test requires video monitoring for verification. Do you want to proceed anyway for testing purposes?'
        );
        if (proceedWithoutVideo) {
          setTestStarted(true);
          toast.info('Test started without video monitoring (testing mode).');
        }
      }
    } catch (error) {
      console.error('Failed to start test:', error);
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        // User has an incomplete test in progress
        toast.error(error.response.data.detail, { duration: 8000 });
        
        // Show additional help dialog
        const shouldContactAdmin = window.confirm(
          error.response.data.detail + '\n\nWould you like to contact the administrator for help?'
        );
        
        if (shouldContactAdmin) {
          // You could redirect to a contact page or show contact info
          toast.info('Please contact your administrator to reset your previous test.');
        }
      } else {
        toast.error('Failed to start test: ' + (error.response?.data?.detail || error.message));
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
    if (currentQuestionIndex < (test?.questions?.length || 0) - 1) {
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
      // Convert answers object to array format expected by backend
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: questionId,
        answer: answer
      }));
      
      const submission = {
        answers: answersArray
      };
      
      console.log('Submitting test with answers:', submission);
      
      const response = await axios.post(`${API}/submit-test/${token}`, submission);
      console.log('Submission response:', response.data);
      
      // End WebRTC session
      if (inviteId) {
        await axios.post(`${API}/webrtc/end-session/${inviteId}`).catch(console.error);
      }
      
      toast.success('Test submitted successfully! Score: ' + (response.data.score || 0) + '%');
      navigate('/');
    } catch (error) {
      console.error('Failed to submit test:', error);
      console.error('Error response:', error.response);
      toast.error('Failed to submit test: ' + (error.response?.data?.detail || error.message));
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

  const currentQuestion = test?.questions?.[currentQuestionIndex];

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
                {test?.title || 'Test'}
              </h1>
              <p style={{ color: '#6b7280', margin: 0 }}>
                Question {currentQuestionIndex + 1} of {test?.questions?.length || 0}
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
              <span> {formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Main Content */}
        <div style={{ flex: 1, marginRight: '24px' }}>
          {!currentQuestion ? (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              textAlign: 'center'
            }}>
              <p>Loading test questions...</p>
            </div>
          ) : (
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
                {currentQuestionIndex < (test?.questions?.length || 0) - 1 ? (
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
          )}
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
              ref={(el) => {
                videoRef.current = el;
                // Only set srcObject if element exists, has no current source, and we have a stream
                if (el && videoStream && !el.srcObject) {
                  console.log('Setting srcObject in ref callback');
                  el.srcObject = videoStream;
                  el.play().catch(e => console.error('Video play failed:', e));
                }
              }}
              autoPlay
              muted
              playsInline
              controls={false}
              style={{
                width: '100%',
                height: '200px',
                borderRadius: '8px',
                background: '#333',
                objectFit: 'cover',
                transform: 'scaleX(-1)' // Mirror the video like a selfie camera
              }}
            />
            <p style={{ 
              fontSize: '12px', 
              color: '#6b7280', 
              marginTop: '8px',
              textAlign: 'center'
            }}>
              {videoStream ? '🔴 Recording for verification' : '📷 Camera not active'}
            </p>
            {/* Temporary debug info */}
            <div style={{ fontSize: '10px', color: '#999', textAlign: 'center', marginTop: '4px' }}>
              Stream: {videoStream ? 'Active' : 'None'} | 
              Tracks: {videoStream ? videoStream.getVideoTracks().length : 0} |
              Ref: {videoRef.current ? 'Ready' : 'Null'}
            </div>
            {/* Temporary debug button */}
            {!testStarted && (
              <button 
                onClick={startVideoAndWebRTC}
                style={{ 
                  fontSize: '10px', 
                  padding: '4px 8px', 
                  marginTop: '4px',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Test Video + WebRTC
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkingTakeTest;