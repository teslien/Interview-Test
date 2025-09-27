import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Send, Eye, Users, FileText, Clock, Video, LogOut, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [tests, setTests] = useState([]);
  const [invites, setInvites] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Test creation state
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [newTest, setNewTest] = useState({
    title: '',
    description: '',
    duration_minutes: 60,
    questions: []
  });
  
  // Question creation state
  const [currentQuestion, setCurrentQuestion] = useState({
    type: 'multiple_choice',
    question: '',
    options: ['', '', '', ''],
    correct_answer: '',
    expected_language: '',
    points: 1
  });
  
  // Invite creation state
  const [showSendInvite, setShowSendInvite] = useState(false);
  const [newInvite, setNewInvite] = useState({
    test_id: '',
    applicant_email: '',
    applicant_name: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [testsRes, invitesRes, resultsRes] = await Promise.all([
        axios.get(`${API}/tests`),
        axios.get(`${API}/invites`),
        axios.get(`${API}/results`)
      ]);
      
      setTests(testsRes.data);
      setInvites(invitesRes.data);
      setResults(resultsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async () => {
    if (!newTest.title || !newTest.description || newTest.questions.length === 0) {
      toast.error('Please fill in all required fields and add at least one question');
      return;
    }
    
    try {
      await axios.post(`${API}/tests`, newTest);
      toast.success('Test created successfully!');
      setShowCreateTest(false);
      setNewTest({ title: '', description: '', duration_minutes: 60, questions: [] });
      fetchData();
    } catch (error) {
      console.error('Failed to create test:', error);
      toast.error('Failed to create test');
    }
  };

  const addQuestion = () => {
    if (!currentQuestion.question) {
      toast.error('Please enter a question');
      return;
    }
    
    const question = { ...currentQuestion, id: Date.now().toString() };
    
    // Clean up question based on type
    if (question.type !== 'multiple_choice') {
      delete question.options;
      delete question.correct_answer;
    }
    if (question.type !== 'coding') {
      delete question.expected_language;
    }
    
    setNewTest(prev => ({
      ...prev,
      questions: [...prev.questions, question]
    }));
    
    // Reset form
    setCurrentQuestion({
      type: 'multiple_choice',
      question: '',
      options: ['', '', '', ''],
      correct_answer: '',
      expected_language: '',
      points: 1
    });
    
    toast.success('Question added!');
  };

  const removeQuestion = (index) => {
    setNewTest(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleSendInvite = async () => {
    if (!newInvite.test_id || !newInvite.applicant_email || !newInvite.applicant_name) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      await axios.post(`${API}/invites`, newInvite);
      toast.success('Invite sent successfully!');
      setShowSendInvite(false);
      setNewInvite({ test_id: '', applicant_email: '', applicant_name: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to send invite:', error);
      toast.error('Failed to send invite');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      sent: { color: 'bg-blue-100 text-blue-800', label: 'Sent' },
      scheduled: { color: 'bg-yellow-100 text-yellow-800', label: 'Scheduled' },
      in_progress: { color: 'bg-orange-100 text-orange-800', label: 'In Progress' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      expired: { color: 'bg-red-100 text-red-800', label: 'Expired' }
    };
    
    const config = statusConfig[status] || statusConfig.sent;
    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="tests" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Tests</span>
            </TabsTrigger>
            <TabsTrigger value="invites" className="flex items-center space-x-2">
              <Send className="h-4 w-4" />
              <span>Invites</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center space-x-2">
              <Video className="h-4 w-4" />
              <span>Results</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="glass-effect border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Tests</p>
                      <p className="text-3xl font-bold text-gray-900">{tests.length}</p>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass-effect border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Invites Sent</p>
                      <p className="text-3xl font-bold text-gray-900">{invites.length}</p>
                    </div>
                    <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Send className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass-effect border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed Tests</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {invites.filter(i => i.status === 'completed').length}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass-effect border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">In Progress</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {invites.filter(i => i.status === 'in_progress').length}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Clock className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Activity */}
            <Card className="glass-effect border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest test invites and submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invites.slice(0, 5).map((invite, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white/50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {invite.applicant_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{invite.applicant_name}</p>
                          <p className="text-sm text-gray-600">{invite.applicant_email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(invite.status)}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(invite.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tests Tab */}
          <TabsContent value="tests" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Manage Tests</h2>
              <Dialog open={showCreateTest} onOpenChange={setShowCreateTest}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white" data-testid="create-test-button">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Test
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Test</DialogTitle>
                    <DialogDescription>
                      Create a comprehensive test with multiple question types
                    </DialogDescription>
                  </DialogHeader>
                  {/* Test creation form content would go here - truncated for brevity */}
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tests.map((test) => (
                <Card key={test.id} className="glass-effect border-0 shadow-lg hover:shadow-xl transition-all duration-300 card-hover">
                  <CardHeader>
                    <CardTitle className="text-lg">{test.title}</CardTitle>
                    <CardDescription>{test.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Questions:</span>
                        <span className="font-medium">{test.questions.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{test.duration_minutes} min</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">{new Date(test.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Similar structure for Invites and Results tabs */}
          <TabsContent value="invites" className="space-y-6">
            {/* Invites content */}
          </TabsContent>
          
          <TabsContent value="results" className="space-y-6">
            {/* Results content */}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;