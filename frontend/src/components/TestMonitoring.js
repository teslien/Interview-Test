import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Video, Users, Clock, AlertCircle, LogOut, ArrowLeft } from 'lucide-react';

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

const TestMonitoring = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTests, setActiveTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);

  // WebRTC state for admin monitoring
  const [peerConnection, setPeerConnection] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [webrtcConnected, setWebrtcConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    fetchActiveTests();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchActiveTests, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle pre-selected applicant from notification
  useEffect(() => {
    const preselectedData = localStorage.getItem('preselectedApplicant');
    if (preselectedData) {
      try {
        const { invite_id, applicant_email, timestamp } = JSON.parse(preselectedData);
        
        // Check if the data is recent (within 5 minutes)
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          // Find the matching test in activeTests
          const matchingTest = activeTests.find(test => 
            test.id === invite_id || test.applicant_email === applicant_email
          );
          
          if (matchingTest && matchingTest.can_monitor) {
            // Auto-select the applicant
            setSelectedTest(matchingTest);
            setConnectionStatus('connecting');
            toast.info(`Auto-selected ${matchingTest.applicant_name} for monitoring`);
            
            // Clear the preselected data
            localStorage.removeItem('preselectedApplicant');
          } else if (matchingTest && !matchingTest.can_monitor) {
            toast.warning(`${applicant_email} is not currently taking a test`);
            localStorage.removeItem('preselectedApplicant');
          }
        } else {
          // Data is too old, remove it
          localStorage.removeItem('preselectedApplicant');
        }
      } catch (error) {
        console.error('Error parsing preselected applicant data:', error);
        localStorage.removeItem('preselectedApplicant');
      }
    }
  }, [activeTests]);

  const fetchActiveTests = async () => {
    try {
      // Get all invitations (admin can see all)
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/invites`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Filter for tests that are in progress and could be monitored
      const monitorableTests = response.data.filter(invite =>
        invite.status === 'in_progress' ||
        (invite.status === 'sent' && invite.scheduled_date)
      );

      console.log('Monitorable tests found:', monitorableTests);

      // Enhance test data with additional info if needed
      const enhancedTests = monitorableTests.map(invite => ({
        ...invite,
        test_title: invite.test_title || invite.test?.title || 'Test in Progress',
        can_monitor: invite.status === 'in_progress'
      }));

      setActiveTests(enhancedTests);
    } catch (error) {
      console.error('Failed to fetch active tests:', error);
      toast.error('Failed to fetch active tests: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleGoBack = () => {
    // Clear any preselected data when going back
    localStorage.removeItem('preselectedApplicant');
    navigate('/admin');
  };

  const handleMonitorTest = async (invite) => {
    if (!invite.can_monitor) {
      toast.error('Test must be in progress to start monitoring');
      return;
    }

    setSelectedTest(invite);
    setConnectionStatus('connecting');
    toast.info(`Monitoring test for ${invite.applicant_name}`);

    // Initialize WebRTC session first (use invite.id, not test.id)
    try {
      await axios.post(`${API}/webrtc/start-session/${invite.id}`);
    } catch (error) {
      console.error('Failed to initialize WebRTC session:', error);
      toast.error('Failed to initialize monitoring session');
      return;
    }

    // Initialize WebRTC connection as the admin (answerer)
    await startWebRTCMonitoring(invite.id);
  };

  const startWebRTCMonitoring = async (inviteId) => {
    console.log('TestMonitoring - Starting WebRTC monitoring for invite:', inviteId);
    try {
      // Set up WebRTC peer connection as the "answerer" (admin responds to applicant offer)
      const pc = new RTCPeerConnection(RTC_CONFIGURATION);

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Received remote stream:', event.streams[0]);
        setRemoteStream(event.streams[0]);
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().catch(e => console.error('Video play failed:', e));
        }
      };

      // Handle ICE candidates from applicant
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
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
        console.log('TestMonitoring - Connection state:', pc.connectionState);
        switch (pc.connectionState) {
          case 'connected':
            console.log('TestMonitoring - WebRTC connected successfully');
            setConnectionStatus('connected');
            setWebrtcConnected(true);
            toast.success('Connected to applicant video feed');
            break;
          case 'connecting':
            console.log('TestMonitoring - WebRTC connecting...');
            setConnectionStatus('connecting');
            break;
          case 'failed':
          case 'closed':
            console.log('TestMonitoring - WebRTC connection failed');
            setConnectionStatus('failed');
            setWebrtcConnected(false);
            toast.error('Video connection failed');
            break;
          default:
            console.log('TestMonitoring - Connection state changed:', pc.connectionState);
            break;
        }
      };

      // Poll for offer from applicant
      pollForWebRTCOffer(pc, inviteId);

      setPeerConnection(pc);
    } catch (error) {
      console.error('Failed to start WebRTC monitoring:', error);
      setConnectionStatus('failed');
      toast.error('Failed to start video monitoring');
    }
  };

  const pollForWebRTCOffer = async (pc, inviteId) => {
    try {
      const response = await axios.get(`${API}/webrtc/signals/${inviteId}`);
      const signals = response.data.signals;

      // Find the latest offer
      const offerSignal = signals
        .filter(signal => signal.type === 'offer')
        .pop();

      if (offerSignal && !webrtcConnected) {
        console.log('TestMonitoring - Found offer signal:', offerSignal);
        console.log('TestMonitoring - Offer SDP length:', offerSignal.data.sdp.length);
        const offer = {
          type: 'offer',
          sdp: offerSignal.data.sdp
        };

        try {
          await pc.setRemoteDescription(offer);
          console.log('TestMonitoring - WebRTC offer received and set');

          // Create and send answer
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log('TestMonitoring - Created answer with SDP length:', answer.sdp.length);

          console.log('TestMonitoring - Sending answer to backend');
          const response = await axios.post(`${API}/webrtc/answer`, {
            type: 'answer',
            sdp: answer.sdp,
            invite_id: inviteId
          });
          console.log('TestMonitoring - WebRTC answer sent successfully:', response.status);
        } catch (error) {
          console.error('TestMonitoring - Error processing offer:', error);
          throw error;
        }
      } else if (!offerSignal) {
        console.log('TestMonitoring - No offer signal found yet, signals count:', signals.length);
      }

      // Find ICE candidates and add them
      const iceCandidates = signals.filter(signal => signal.type === 'ice_candidate');
      for (const candidateSignal of iceCandidates) {
        if (candidateSignal.data.candidate && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(candidateSignal.data.candidate);
          } catch (error) {
            console.error('Failed to add ICE candidate:', error);
          }
        }
      }

      // Continue polling if not connected
      if (!webrtcConnected) {
        console.log('TestMonitoring - Continuing to poll for WebRTC offer...');
        setTimeout(() => pollForWebRTCOffer(pc, inviteId), 2000);
      } else {
        console.log('TestMonitoring - WebRTC connected, stopping polling');
      }
    } catch (error) {
      console.error('Failed to poll for WebRTC offer:', error);
      // Continue polling on error
      if (!webrtcConnected) {
        setTimeout(() => pollForWebRTCOffer(pc, inviteId), 2000);
      }
    }
  };

  const handleStopMonitoring = async () => {
    // End WebRTC session in backend
    if (selectedTest) {
      try {
        await axios.post(`${API}/webrtc/end-session/${selectedTest.id}`);
      } catch (error) {
        console.error('Failed to end WebRTC session:', error);
      }
    }

    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
    }

    // Clean up state
    setSelectedTest(null);
    setPeerConnection(null);
    setRemoteStream(null);
    setWebrtcConnected(false);
    setConnectionStatus('disconnected');

    toast.info('Stopped monitoring');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleGoBack}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
              <div className="h-10 w-10 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg flex items-center justify-center">
                <Video className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Test Monitoring</h1>
                <p className="text-sm text-gray-600">Live monitoring of active tests</p>
              </div>
            </div>
            
            <Button
              onClick={logout}
              variant="outline"
              className="flex items-center space-x-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Tests List */}
          <div className="lg:col-span-1">
            <Card className="glass-effect border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Active Tests ({activeTests.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeTests.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No active tests at the moment</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeTests.map((invite) => (
                      <div
                        key={invite.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedTest?.id === invite.id
                            ? 'border-red-500 bg-red-50'
                            : invite.can_monitor
                              ? 'border-gray-200 bg-white hover:border-red-300'
                              : 'border-gray-300 bg-gray-50'
                        }`}
                        onClick={() => invite.can_monitor && handleMonitorTest(invite)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {invite.applicant_name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {invite.test_title || 'Test in Progress'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            {invite.can_monitor ? (
                              <>
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-xs text-green-600">READY</span>
                              </>
                            ) : (
                              <>
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span className="text-xs text-yellow-600">WAITING</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Started: {new Date(invite.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Video Monitor */}
          <div className="lg:col-span-2">
            <Card className="glass-effect border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Video className="h-5 w-5" />
                    <span>
                      {selectedTest 
                        ? `Monitoring: ${selectedTest.applicant_name}` 
                        : 'Select a test to monitor'
                      }
                    </span>
                  </div>
                  {selectedTest && (
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => setSelectedTest(null)}
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1"
                      >
                        <ArrowLeft className="h-3 w-3" />
                        <span>Back to List</span>
                      </Button>
                      <Button
                        onClick={handleStopMonitoring}
                        variant="outline"
                        size="sm"
                      >
                        Stop Monitoring
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedTest ? (
                  <div className="space-y-4">
                    {/* Video Feed */}
                    <div className="relative">
                      <video
                        ref={videoRef}
                        className="w-full h-96 bg-black rounded-lg object-cover"
                        controls={false}
                        style={{ backgroundColor: '#000' }}
                        autoPlay
                        playsInline
                        muted
                      />
                      <div className={`absolute top-4 left-4 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2 ${
                        connectionStatus === 'connected' ? 'bg-green-500' :
                        connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}>
                        <div className={`w-2 h-2 rounded-full animate-pulse ${
                          connectionStatus === 'connected' ? 'bg-white' :
                          connectionStatus === 'connecting' ? 'bg-white' : 'bg-white'
                        }`}></div>
                        <span>
                          {connectionStatus === 'connected' ? 'LIVE' :
                           connectionStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
                        </span>
                      </div>
                      <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                        {selectedTest.applicant_name} - {selectedTest.test_title}
                      </div>

                      {/* Connection Status Overlay */}
                      {connectionStatus !== 'connected' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <div className="text-center text-white">
                            {connectionStatus === 'connecting' && (
                              <>
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                                <p>Connecting to applicant video...</p>
                              </>
                            )}
                            {connectionStatus === 'failed' && (
                              <>
                                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                                <p>Connection Failed</p>
                                <p className="text-sm">Unable to establish video connection</p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Test Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-2">Applicant Info</h4>
                        <p className="text-sm text-gray-600">Name: {selectedTest.applicant_name}</p>
                        <p className="text-sm text-gray-600">Email: {selectedTest.applicant_email}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-2">Test Status</h4>
                        <p className="text-sm text-gray-600">Status: In Progress</p>
                        <p className="text-sm text-gray-600">
                          Started: {new Date(selectedTest.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-2">Actions</h4>
                        <div className="space-y-2">
                          <Button size="sm" variant="outline" className="w-full">
                            Send Message
                          </Button>
                          <Button size="sm" variant="outline" className="w-full text-red-600">
                            Flag Issue
                          </Button>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-20">
                    <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Test Selected
                    </h3>
                    <p className="text-gray-600">
                      Select an active test from the list to start monitoring
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestMonitoring;