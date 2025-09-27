import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, Mic, MicOff, Monitor, User, Clock, AlertTriangle } from 'lucide-react';
// Removed toast import

const VideoMonitor = () => {
  const { inviteId } = useParams();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [applicantInfo, setApplicantInfo] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    testTitle: 'Frontend Developer Assessment',
    startTime: new Date(),
    status: 'in_progress'
  });

  useEffect(() => {
    initializeVideoCall();
    return () => {
      cleanup();
    };
  }, []);

  const initializeVideoCall = async () => {
    try {
      // Get admin's video/audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // In a real implementation, you would set up WebRTC peer connection here
      // For now, we'll simulate the connection
      setTimeout(() => {
        setConnectionStatus('connected');
        toast.success('Connected to applicant video feed');
      }, 2000);
      
    } catch (error) {
      console.error('Failed to initialize video call:', error);
      toast.error('Failed to access camera/microphone');
      setConnectionStatus('failed');
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOn(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioOn(audioTrack.enabled);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      connecting: { color: 'bg-yellow-100 text-yellow-800', label: 'Connecting' },
      connected: { color: 'bg-green-100 text-green-800', label: 'Connected' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Connection Failed' },
      in_progress: { color: 'bg-blue-100 text-blue-800', label: 'Test In Progress' },
      completed: { color: 'bg-gray-100 text-gray-800', label: 'Test Completed' }
    };
    
    const config = statusConfig[status] || statusConfig.connecting;
    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    );
  };

  const formatDuration = (startTime) => {
    const now = new Date();
    const diff = Math.floor((now - startTime) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <Monitor className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Video Monitor</h1>
                <p className="text-sm text-gray-600">Monitoring: {applicantInfo.name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {getStatusBadge(connectionStatus)}
              <div className="text-sm text-gray-600">
                Duration: {formatDuration(applicantInfo.startTime)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Feeds */}
          <div className="lg:col-span-2 space-y-6">
            {/* Applicant Video (Main) */}
            <Card className="glass-effect border-0 shadow-xl">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Applicant Video</span>
                  </CardTitle>
                  {getStatusBadge(applicantInfo.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative video-container">
                  <video 
                    ref={remoteVideoRef}
                    autoPlay 
                    className="w-full h-full object-cover"
                    poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23374151'/%3E%3Ctext x='400' y='225' text-anchor='middle' fill='white' font-size='24' font-family='Arial'%3EApplicant Video Feed%3C/text%3E%3C/svg%3E"
                  />
                  <div className="video-overlay"></div>
                  
                  {/* Video Status Indicator */}
                  <div className="absolute top-4 left-4 flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                    }`}></div>
                    <span className="text-white text-sm font-medium">
                      {connectionStatus === 'connected' ? 'LIVE' : 'OFFLINE'}
                    </span>
                  </div>
                  
                  {/* Recording Indicator */}
                  <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span>RECORDING</span>
                  </div>
                  
                  {connectionStatus !== 'connected' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center text-white">
                        {connectionStatus === 'connecting' && (
                          <>
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                            <p>Connecting to applicant...</p>
                          </>
                        )}
                        {connectionStatus === 'failed' && (
                          <>
                            <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                            <p>Connection Failed</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Admin Video (Picture-in-Picture) */}
            <Card className="glass-effect border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Monitor className="h-5 w-5" />
                  <span>Your Video</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative video-container max-w-sm">
                  <video 
                    ref={localVideoRef}
                    autoPlay 
                    muted 
                    className="w-full h-full object-cover"
                  />
                  <div className="video-overlay"></div>
                </div>
                
                {/* Video Controls */}
                <div className="flex justify-center space-x-4 mt-4">
                  <Button
                    onClick={toggleVideo}
                    variant={isVideoOn ? "default" : "destructive"}
                    size="sm"
                    className="flex items-center space-x-2"
                    data-testid="toggle-video-button"
                  >
                    {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    <span>{isVideoOn ? 'Camera On' : 'Camera Off'}</span>
                  </Button>
                  
                  <Button
                    onClick={toggleAudio}
                    variant={isAudioOn ? "default" : "destructive"}
                    size="sm"
                    className="flex items-center space-x-2"
                    data-testid="toggle-audio-button"
                  >
                    {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    <span>{isAudioOn ? 'Mic On' : 'Mic Off'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Information Sidebar */}
          <div className="space-y-6">
            {/* Applicant Info */}
            <Card className="glass-effect border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Applicant Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">{applicantInfo.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{applicantInfo.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Test</p>
                  <p className="font-medium">{applicantInfo.testTitle}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Started</p>
                  <p className="font-medium">{applicantInfo.startTime.toLocaleTimeString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Test Progress */}
            <Card className="glass-effect border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Test Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Questions Completed</span>
                  <span className="font-medium">3 / 10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '30%' }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Time Remaining</span>
                  <span className="font-medium text-orange-600">45:30</span>
                </div>
              </CardContent>
            </Card>

            {/* Monitoring Actions */}
            <Card className="glass-effect border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Monitoring Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full"
                  variant="outline"
                  data-testid="flag-incident-button"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Flag Incident
                </Button>
                <Button 
                  className="w-full"
                  variant="outline"
                  data-testid="take-screenshot-button"
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Take Screenshot
                </Button>
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  data-testid="end-session-button"
                >
                  End Session
                </Button>
              </CardContent>
            </Card>

            {/* Connection Status */}
            <Card className="glass-effect border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Connection Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Video Quality</span>
                  <span className="text-green-600 font-medium">HD</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Connection</span>
                  <span className="text-green-600 font-medium">Stable</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Latency</span>
                  <span className="text-green-600 font-medium">45ms</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoMonitor;