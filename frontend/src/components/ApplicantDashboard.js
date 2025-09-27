import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, Clock, CheckCircle, AlertCircle, LogOut } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ApplicantDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [upcomingTests, setUpcomingTests] = useState([]);
  const [completedTests, setCompletedTests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchApplicantData();
  }, []);

  const fetchApplicantData = async () => {
    setLoading(true);
    try {
      // Fetch user's test invitations
      const invitesResponse = await axios.get(`${API}/my-invites`);
      const invites = invitesResponse.data;
      
      // Separate upcoming and completed tests
      const upcoming = invites.filter(invite => 
        invite.status === 'sent' || invite.status === 'scheduled' || invite.status === 'in_progress'
      );
      const completed = invites.filter(invite => 
        invite.status === 'completed'
      );
      
      setUpcomingTests(upcoming);
      setCompletedTests(completed);
      
    } catch (error) {
      console.error('Failed to fetch applicant data:', error);
      // Fallback to mock data for demo
      setUpcomingTests([
        {
          id: '1',
          test_title: 'Sample Frontend Test',
          test: { title: 'Sample Frontend Test', duration_minutes: 90 },
          scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: 'scheduled',
          token: '0e3b7e4e-cc78-4b86-92a7-d85ab37ea726'
        }
      ]);
      
      setCompletedTests([
        {
          id: '2',
          test_title: 'JavaScript Fundamentals',
          test: { title: 'JavaScript Fundamentals' },
          completed_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          score: 85,
          status: 'completed'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeTest = (test) => {
    if (test.token) {
      // Navigate to test taking page with token
      navigate(`/take-test/${test.token}`);
    } else {
      alert('Test token not available. Please contact administrator.');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      sent: { color: 'bg-blue-100 text-blue-800', label: 'Scheduled', icon: Calendar },
      scheduled: { color: 'bg-blue-100 text-blue-800', label: 'Scheduled', icon: Calendar },
      in_progress: { color: 'bg-orange-100 text-orange-800', label: 'In Progress', icon: Clock },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed', icon: CheckCircle },
      expired: { color: 'bg-red-100 text-red-800', label: 'Expired', icon: AlertCircle }
    };
    
    const config = statusConfig[status] || statusConfig.scheduled;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} border-0 flex items-center space-x-1`}>
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Applicant Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {user?.full_name}</p>
              </div>
            </div>
            
            <Button
              onClick={logout}
              variant="outline"
              className="flex items-center space-x-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
              data-testid="logout-button"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass-effect border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Upcoming Tests</p>
                  <p className="text-3xl font-bold text-gray-900">{upcomingTests.length}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-effect border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed Tests</p>
                  <p className="text-3xl font-bold text-gray-900">{completedTests.length}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-effect border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Score</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {completedTests.length > 0 
                      ? Math.round(completedTests.reduce((acc, test) => acc + (test.score || 0), 0) / completedTests.length)
                      : 0}%
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Tests */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Upcoming Tests</h2>
            {upcomingTests.length === 0 ? (
              <Card className="glass-effect border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Tests</h3>
                  <p className="text-gray-600">You don't have any scheduled tests at the moment.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingTests.map((test) => (
                  <Card key={test.id} className="glass-effect border-0 shadow-lg hover:shadow-xl transition-all duration-300 card-hover">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{test.test_title || test.test?.title}</CardTitle>
                        {getStatusBadge(test.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {test.scheduled_date 
                              ? new Date(test.scheduled_date).toLocaleDateString()
                              : 'Not scheduled'
                            }
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>{test.test?.duration_minutes || 90} minutes</span>
                        </div>
                        <Button 
                          className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                          data-testid={`take-test-${test.id}`}
                          onClick={() => handleTakeTest(test)}
                        >
                          Take Test
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Completed Tests */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Completed Tests</h2>
            {completedTests.length === 0 ? (
              <Card className="glass-effect border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Completed Tests</h3>
                  <p className="text-gray-600">Your completed tests will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedTests.map((test) => (
                  <Card key={test.id} className="glass-effect border-0 shadow-lg hover:shadow-xl transition-all duration-300 card-hover">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{test.test_title || test.test?.title}</CardTitle>
                        {getStatusBadge(test.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Completed: {test.completed_date 
                              ? new Date(test.completed_date).toLocaleDateString()
                              : 'N/A'
                            }
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Score:</span>
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-20 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full"
                                style={{ width: `${test.score || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{test.score || 0}%</span>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full mt-4"
                          data-testid={`view-results-${test.id}`}
                        >
                          View Results
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicantDashboard;