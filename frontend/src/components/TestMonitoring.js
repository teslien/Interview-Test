import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Video, Users, Clock, AlertCircle, LogOut } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TestMonitoring = () => {
  const { user, logout } = useAuth();
  const [activeTests, setActiveTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    fetchActiveTests();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchActiveTests, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveTests = async () => {
    try {
      // Get invitations that are in progress
      const response = await axios.get(`${API}/invites`);
      const inProgressTests = response.data.filter(invite => invite.status === 'in_progress');
      setActiveTests(inProgressTests);
    } catch (error) {
      console.error('Failed to fetch active tests:', error);
    }
  };

  const handleMonitorTest = (test) => {
    setSelectedTest(test);
    toast.info(`Monitoring test for ${test.applicant_name}`);
  };

  const handleStopMonitoring = () => {
    setSelectedTest(null);
    toast.info('Stopped monitoring');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
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
                    {activeTests.map((test) => (
                      <div
                        key={test.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedTest?.id === test.id
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 bg-white hover:border-red-300'
                        }`}
                        onClick={() => handleMonitorTest(test)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {test.applicant_name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {test.test_title || 'Test in Progress'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-red-600">LIVE</span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Started: {new Date(test.created_at).toLocaleTimeString()}
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
                    <Button
                      onClick={handleStopMonitoring}
                      variant="outline"
                      size="sm"
                    >
                      Stop Monitoring
                    </Button>
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
                      />
                      <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span>LIVE</span>
                      </div>
                      <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                        {selectedTest.applicant_name} - {selectedTest.test_title}
                      </div>
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

                    {/* Placeholder for video feed */}
                    <div className="text-center text-gray-500 mt-8">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Video monitoring is simulated for demo purposes.</p>
                      <p className="text-sm">In production, this would show live video feed from the applicant's camera.</p>
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