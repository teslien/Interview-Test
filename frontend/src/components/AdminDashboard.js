import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Plus, Send, Eye, Users, FileText, Clock, Video, LogOut, Trash2, Edit } from 'lucide-react';

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

  // Edit test state
  const [showEditTest, setShowEditTest] = useState(false);
  const [editingTest, setEditingTest] = useState(null);

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
      alert('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async () => {
    if (!newTest.title || !newTest.description || newTest.questions.length === 0) {
      alert('Please fill in all required fields and add at least one question');
      return;
    }
    
    try {
      await axios.post(`${API}/tests`, newTest);
      alert('Test created successfully!');
      setShowCreateTest(false);
      setNewTest({ title: '', description: '', duration_minutes: 60, questions: [] });
      fetchData();
    } catch (error) {
      console.error('Failed to create test:', error);
      alert('Failed to create test');
    }
  };

  const addQuestion = () => {
    if (!currentQuestion.question) {
      alert('Please enter a question');
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
    
    alert('Question added!');
  };

  const removeQuestion = (index) => {
    setNewTest(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleSendInvite = async () => {
    if (!newInvite.test_id || !newInvite.applicant_email || !newInvite.applicant_name) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      await axios.post(`${API}/invites`, newInvite);
      alert('Invite sent successfully!');
      setShowSendInvite(false);
      setNewInvite({ test_id: '', applicant_email: '', applicant_name: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to send invite:', error);
      alert('Failed to send invite');
    }
  };

  const handleEditTest = (test) => {
    setEditingTest({
      ...test,
      questions: [...test.questions]
    });
    setShowEditTest(true);
  };

  const handleUpdateTest = async () => {
    if (!editingTest.title || !editingTest.description || editingTest.questions.length === 0) {
      alert('Please fill in all required fields and add at least one question');
      return;
    }
    
    try {
      await axios.put(`${API}/tests/${editingTest.id}`, editingTest);
      alert('Test updated successfully!');
      setShowEditTest(false);
      setEditingTest(null);
      fetchData();
    } catch (error) {
      console.error('Failed to update test:', error);
      alert('Failed to update test');
    }
  };

  const handleDeleteTest = async (testId, testTitle) => {
    if (window.confirm(`Are you sure you want to delete "${testTitle}"? This action cannot be undone.`)) {
      try {
        await axios.delete(`${API}/tests/${testId}`);
        alert('Test deleted successfully!');
        fetchData();
      } catch (error) {
        console.error('Failed to delete test:', error);
        alert('Failed to delete test');
      }
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
            
            {/* Quick Actions */}
            <Card className="glass-effect border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your tests and invitations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button
                    onClick={() => setShowCreateTest(true)}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-20 flex flex-col items-center justify-center space-y-2"
                    data-testid="create-test-button"
                  >
                    <Plus className="h-6 w-6" />
                    <span>Create Test</span>
                  </Button>
                  
                  <Button
                    onClick={() => setShowSendInvite(true)}
                    className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white h-20 flex flex-col items-center justify-center space-y-2"
                    data-testid="send-invite-button"
                  >
                    <Send className="h-6 w-6" />
                    <span>Send Invite</span>
                  </Button>
                  
                  <Button
                    onClick={() => setActiveTab('results')}
                    className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white h-20 flex flex-col items-center justify-center space-y-2"
                    data-testid="view-results-button"
                  >
                    <Eye className="h-6 w-6" />
                    <span>View Results</span>
                  </Button>
                  
                  <Button
                    onClick={() => alert('Live monitoring will be available when tests are in progress')}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-20 flex flex-col items-center justify-center space-y-2"
                    data-testid="monitor-tests-button"
                  >
                    <Video className="h-6 w-6" />
                    <span>Monitor Tests</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
            
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
                  {invites.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No invites sent yet. Create a test and send your first invite!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tests Tab */}
          <TabsContent value="tests" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Manage Tests</h2>
              <Button
                onClick={() => setShowCreateTest(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                data-testid="create-test-button-tab"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Test
              </Button>
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
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleEditTest(test)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteTest(test.id, test.title)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {tests.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tests created yet</h3>
                  <p className="text-gray-600 mb-4">Create your first test to get started with assessments</p>
                  <Button
                    onClick={() => setShowCreateTest(true)}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Test
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Invites Tab */}
          <TabsContent value="invites" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Test Invitations</h2>
              <Button
                onClick={() => setShowSendInvite(true)}
                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
                data-testid="send-invite-button-tab"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Invite
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {invites.map((invite) => (
                <Card key={invite.id} className="glass-effect border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                          {invite.applicant_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{invite.applicant_name}</h3>
                          <p className="text-sm text-gray-600">{invite.applicant_email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Invited: {new Date(invite.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(invite.status)}
                        {invite.scheduled_date && (
                          <p className="text-xs text-gray-500 mt-1">
                            Scheduled: {new Date(invite.scheduled_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {invites.length === 0 && (
                <div className="text-center py-12">
                  <Send className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No invitations sent yet</h3>
                  <p className="text-gray-600 mb-4">Send test invitations to applicants to get started</p>
                  <Button
                    onClick={() => setShowSendInvite(true)}
                    className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Your First Invite
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Test Results</h2>
            
            <div className="grid grid-cols-1 gap-4">
              {results.map((result, index) => (
                <Card key={index} className="glass-effect border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{result.applicant_name}</h3>
                        <p className="text-sm text-gray-600">{result.test_title}</p>
                        <p className="text-xs text-gray-500">
                          Submitted: {new Date(result.submission.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-indigo-600">
                          {result.submission.score ? Math.round(result.submission.score) : 0}%
                        </div>
                        <Button size="sm" variant="outline" className="mt-2">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {results.length === 0 && (
                <div className="text-center py-12">
                  <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No results available yet</h3>
                  <p className="text-gray-600">Results will appear here after applicants complete their tests</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Test Modal */}
      {showCreateTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Create New Test</h2>
              <button
                onClick={() => setShowCreateTest(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="test-title">Test Title</Label>
                <Input
                  id="test-title"
                  value={newTest.title}
                  onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                  placeholder="Enter test title"
                />
              </div>
              
              <div>
                <Label htmlFor="test-description">Description</Label>
                <Textarea
                  id="test-description"
                  value={newTest.description}
                  onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                  placeholder="Enter test description"
                />
              </div>
              
              <div>
                <Label htmlFor="test-duration">Duration (minutes)</Label>
                <Input
                  id="test-duration"
                  type="number"
                  value={newTest.duration_minutes}
                  onChange={(e) => setNewTest({ ...newTest, duration_minutes: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
              
              {/* Questions List */}
              <div>
                <Label>Questions ({newTest.questions.length})</Label>
                <div className="space-y-2 mt-2">
                  {newTest.questions.map((q, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg flex justify-between items-start">
                      <div>
                        <p className="font-medium">{q.question}</p>
                        <p className="text-sm text-gray-600 capitalize">{q.type.replace('_', ' ')} • {q.points} points</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeQuestion(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Add Question Form */}
              <div className="border-t pt-4">
                <Label>Add Question</Label>
                <div className="space-y-3 mt-2">
                  <Select
                    value={currentQuestion.type}
                    onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="essay">Essay</SelectItem>
                      <SelectItem value="coding">Coding</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Textarea
                    value={currentQuestion.question}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                    placeholder="Enter your question"
                  />
                  
                  {currentQuestion.type === 'multiple_choice' && (
                    <div className="space-y-2">
                      <Label>Options</Label>
                      {currentQuestion.options.map((option, index) => (
                        <Input
                          key={index}
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...currentQuestion.options];
                            newOptions[index] = e.target.value;
                            setCurrentQuestion({ ...currentQuestion, options: newOptions });
                          }}
                          placeholder={`Option ${index + 1}`}
                        />
                      ))}
                      <Select
                        value={currentQuestion.correct_answer}
                        onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, correct_answer: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select correct answer" />
                        </SelectTrigger>
                        <SelectContent>
                          {currentQuestion.options.filter(opt => opt.trim()).map((option, index) => (
                            <SelectItem key={index} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {currentQuestion.type === 'coding' && (
                    <Select
                      value={currentQuestion.expected_language}
                      onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, expected_language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select programming language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="java">Java</SelectItem>
                        <SelectItem value="cpp">C++</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  
                  <Input
                    type="number"
                    value={currentQuestion.points}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) || 1 })}
                    placeholder="Points"
                    min="1"
                  />
                  
                  <Button onClick={addQuestion} className="w-full">
                    Add Question
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t flex space-x-3">
              <Button
                onClick={() => setShowCreateTest(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTest}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                Create Test
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Send Invite Modal */}
      {showSendInvite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Send Test Invite</h2>
              <button
                onClick={() => setShowSendInvite(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="invite-test">Select Test</Label>
                <Select
                  value={newInvite.test_id}
                  onValueChange={(value) => setNewInvite({ ...newInvite, test_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a test" />
                  </SelectTrigger>
                  <SelectContent>
                    {tests.map((test) => (
                      <SelectItem key={test.id} value={test.id}>
                        {test.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="applicant-name">Applicant Name</Label>
                <Input
                  id="applicant-name"
                  value={newInvite.applicant_name}
                  onChange={(e) => setNewInvite({ ...newInvite, applicant_name: e.target.value })}
                  placeholder="Enter applicant's full name"
                />
              </div>
              
              <div>
                <Label htmlFor="applicant-email">Applicant Email</Label>
                <Input
                  id="applicant-email"
                  type="email"
                  value={newInvite.applicant_email}
                  onChange={(e) => setNewInvite({ ...newInvite, applicant_email: e.target.value })}
                  placeholder="Enter applicant's email"
                />
              </div>
            </div>
            
            <div className="p-6 border-t flex space-x-3">
              <Button
                onClick={() => setShowSendInvite(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvite}
                className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
              >
                Send Invite
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;