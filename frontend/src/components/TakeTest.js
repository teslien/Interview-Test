import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Clock, Camera, Mic, AlertTriangle, Send, Code } from 'lucide-react';
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

const TakeTest = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const previewVideoRef = useRef(null);
  const monitoringVideoRef = useRef(null);
  const [invite, setInvite] = useState(null);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // WebRTC state
  const [peerConnection, setPeerConnection] = useState(null);
  const [webrtcConnected, setWebrtcConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'failed'
  const [inviteId, setInviteId] = useState(null);

  useEffect(() => {
    fetchTestDetails();
    
    // Add cleanup function for page unload
    const handleBeforeUnload = () => {
      // Stop video stream
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      // Close WebRTC connection
      if (peerConnection) {
        peerConnection.close();
      }
      // End WebRTC session
      if (inviteId) {
        navigator.sendBeacon(`${API}/webrtc/end-session/${inviteId}`);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      // Cleanup video stream and WebRTC connection
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }
      // End WebRTC session in backend
      if (inviteId) {
        axios.post(`${API}/webrtc/end-session/${inviteId}`).catch(console.error);
      }
      // Remove event listener
      window.removeEventListener('beforeunload', handleBeforeUnload);
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

  // Set monitoring video stream when videoStream changes
  useEffect(() => {
    if (monitoringVideoRef.current && videoStream) {
      monitoringVideoRef.current.srcObject = videoStream;
      monitoringVideoRef.current.play().catch(e => console.error('Monitoring video play failed:', e));
    }
  }, [videoStream]);

  const fetchTestDetails = async () => {
    try {
      const response = await axios.get(`${API}/take-test/${token}`);
      setInvite(response.data.invite);
      setTest(response.data.test);
      setTimeLeft(response.data.test.duration_minutes * 60);
      setInviteId(response.data.invite.id);

      // Initialize WebRTC session for monitoring
      await initializeWebRTCSession(response.data.invite.id);
    } catch (error) {
      console.error('Failed to fetch test details:', error);
      toast.error('Unable to load test. Error: ' + (error.response?.data?.detail || error.message));
      navigate('/');
    } finally {
      setLoading(false);
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

  const startVideoAndWebRTC = async () => {
    try {
      // Get user's media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setVideoStream(stream);
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        previewVideoRef.current.play().catch(e => console.error('Preview video play failed:', e));
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
        console.log('TakeTest - Connection state:', pc.connectionState);
        switch (pc.connectionState) {
          case 'connected':
            console.log('TakeTest - WebRTC connected successfully');
            setConnectionStatus('connected');
            setWebrtcConnected(true);
            break;
          case 'connecting':
            console.log('TakeTest - WebRTC connecting...');
            setConnectionStatus('connecting');
            break;
          case 'failed':
          case 'closed':
            console.log('TakeTest - WebRTC connection failed');
            setConnectionStatus('failed');
            setWebrtcConnected(false);
            break;
          default:
            console.log('TakeTest - Connection state changed:', pc.connectionState);
            break;
        }
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('TakeTest - Created and set local offer');

      // Send offer to admin via backend
      console.log('TakeTest - Sending offer to backend:', { type: 'offer', sdp: offer.sdp.substring(0, 50) + '...', invite_id: inviteId });
      try {
        const response = await axios.post(`${API}/webrtc/offer`, {
          type: 'offer',
          sdp: offer.sdp,
          invite_id: inviteId
        });
        console.log('TakeTest - Offer sent successfully:', response.status);
      } catch (error) {
        console.error('TakeTest - Failed to send offer:', error.response?.data || error.message);
        throw error;
      }

      // Wait a bit for admin to initialize session, then poll for answer
      setTimeout(() => {
        console.log('TakeTest - Starting to poll for WebRTC answer');
        pollForWebRTCAnswer(pc);
      }, 1000);

      setPeerConnection(pc);
      return true;
    } catch (error) {
      console.error('Failed to start video and WebRTC:', error);
      toast.error('Camera access and WebRTC setup failed. Please check your camera permissions.');
      return false;
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
        console.log('WebRTC answer received and set');
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
        console.log('TakeTest - Continuing to poll for WebRTC answer...');
        setTimeout(() => pollForWebRTCAnswer(pc), 2000);
      } else {
        console.log('TakeTest - WebRTC connected, stopping polling');
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
      }
    } catch (error) {
      console.error('Failed to start test:', error);
      toast.error('Failed to start test: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmitTest = async () => {
    setSubmitting(true);
    try {
      const submissionData = {
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          question_id: questionId,
          answer: answer
        }))
      };

      await axios.post(`${API}/submit-test/${token}`, submissionData);

      // End WebRTC session
      if (inviteId) {
        await axios.post(`${API}/webrtc/end-session/${inviteId}`);
      }

      toast.success('Test submitted successfully!');

      // Stop video stream and close peer connection
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }

      navigate('/login');
    } catch (error) {
      console.error('Failed to submit test:', error);
      toast.error('Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!test) return 0;
    return ((currentQuestionIndex + 1) / test.questions.length) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!testStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Card className="glass-effect border-0 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Ready to Start Your Test?</CardTitle>
              <CardDescription>
                {test?.title} - {test?.duration_minutes} minutes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Video Preview */}
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                <video
                  ref={previewVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!videoStream && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-center">
                      <Camera className="h-12 w-12 mx-auto mb-2" />
                      <p>Camera preview will appear here</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-800 mb-2">Important Instructions:</h3>
                    <ul className="space-y-1 text-yellow-700 text-sm">
                      <li>• Your camera and microphone will be active during the test</li>
                      <li>• Do not leave the test window or switch applications</li>
                      <li>• Ensure good lighting and a quiet environment</li>
                      <li>• You have {test?.duration_minutes} minutes to complete the test</li>
                      <li>• The test will auto-submit when time expires</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Test Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{test?.questions.length}</p>
                  <p className="text-sm text-gray-600">Questions</p>
                </div>
                <div className="bg-white/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{test?.duration_minutes}</p>
                  <p className="text-sm text-gray-600">Minutes</p>
                </div>
              </div>

              <Button 
                onClick={handleStartTest}
                className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white py-3 text-lg"
                data-testid="start-test-button"
              >
                <Camera className="h-5 w-5 mr-2" />
                Start Test
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestion = test?.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header with timer and video */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Progress and Timer */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-indigo-600" />
                <span className={`font-mono text-lg font-semibold ${
                  timeLeft < 300 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  Question {currentQuestionIndex + 1} of {test?.questions.length}
                </span>
                <Progress value={getProgressPercentage()} className="w-32" />
              </div>
            </div>

            {/* Video Monitor and Connection Status */}
            <div className="flex items-center space-x-3">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  connectionStatus === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                }`}></div>
                <span className={`text-sm font-medium ${
                  connectionStatus === 'connected' ? 'text-green-600' :
                  connectionStatus === 'connecting' ? 'text-yellow-600' :
                  connectionStatus === 'failed' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {connectionStatus === 'connected' ? 'Connected' :
                   connectionStatus === 'connecting' ? 'Connecting...' :
                   connectionStatus === 'failed' ? 'Connection Failed' : 'Disconnected'}
                </span>
              </div>

              {/* Video Monitor */}
              <div className="flex flex-col items-center space-y-1">
                <div className="w-32 h-24 bg-gray-900 rounded-lg overflow-hidden relative">
                  <video
                    ref={monitoringVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 right-1">
                    <div className="flex space-x-1">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                      <Mic className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  {!videoStream && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {videoStream ? 'Camera Active' : 'No Camera'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentQuestion && (
          <Card className="glass-effect border-0 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  Question {currentQuestionIndex + 1}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {currentQuestion.type === 'coding' && <Code className="h-5 w-5 text-blue-600" />}
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm capitalize">
                    {currentQuestion.type.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-gray-600">
                    {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question Text */}
              <div className="bg-white/50 rounded-lg p-4">
                <p className="text-lg text-gray-900 whitespace-pre-wrap">
                  {currentQuestion.question}
                </p>
              </div>

              {/* Answer Input */}
              <div className="space-y-4">
                {currentQuestion.type === 'multiple_choice' && (
                  <RadioGroup 
                    value={answers[currentQuestion.id] || ''}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  >
                    {currentQuestion.options?.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                        <RadioGroupItem value={option} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="cursor-pointer flex-1">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {(currentQuestion.type === 'essay' || currentQuestion.type === 'coding') && (
                  <div>
                    {currentQuestion.type === 'coding' && currentQuestion.expected_language && (
                      <p className="text-sm text-gray-600 mb-2">
                        Expected language: <span className="font-medium">{currentQuestion.expected_language}</span>
                      </p>
                    )}
                    <Textarea
                      placeholder={currentQuestion.type === 'coding' ? 'Write your code here...' : 'Write your answer here...'}
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className={`min-h-[200px] ${currentQuestion.type === 'coding' ? 'font-mono' : ''} bg-white/80`}
                      data-testid={`answer-${currentQuestion.type}`}
                    />
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-6">
                <Button
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  variant="outline"
                  data-testid="previous-question-button"
                >
                  Previous
                </Button>
                
                <div className="flex space-x-3">
                  {currentQuestionIndex < test.questions.length - 1 ? (
                    <Button
                      onClick={() => setCurrentQuestionIndex(prev => Math.min(test.questions.length - 1, prev + 1))}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      data-testid="next-question-button"
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmitTest}
                      disabled={submitting}
                      className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
                      data-testid="submit-test-button"
                    >
                      {submitting ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </div>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Test
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TakeTest;