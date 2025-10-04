import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { 
  Plus, 
  ArrowLeft, 
  Save, 
  Eye, 
  Trash2, 
  Edit3, 
  FileText, 
  Code, 
  MessageSquare,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Settings,
  Copy,
  RefreshCw
} from 'lucide-react';
import BrandIcon from '../components/ui/BrandIcon';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const CreateTestPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  
  // Test state
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    duration_minutes: 60,
    questions: []
  });

  // Current question being created/edited
  const [currentQuestion, setCurrentQuestion] = useState({
    type: 'multiple_choice',
    question: '',
    options: ['', '', '', ''],
    correct_answer: '',
    expected_language: '',
    points: 1
  });

  const [editingIndex, setEditingIndex] = useState(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  const questionTypes = [
    { value: 'multiple_choice', label: 'Multiple Choice', icon: CheckCircle, description: 'Single correct answer from multiple options' },
    { value: 'coding', label: 'Coding Challenge', icon: Code, description: 'Programming problems with code evaluation' },
    { value: 'essay', label: 'Essay Question', icon: MessageSquare, description: 'Open-ended written responses' }
  ];

  const programmingLanguages = [
    'Python', 'JavaScript', 'Java', 'C++', 'C#', 'Ruby', 'Go', 'Rust', 'PHP', 'Swift', 'Kotlin', 'TypeScript'
  ];

  const resetQuestionForm = () => {
    setCurrentQuestion({
      type: 'multiple_choice',
      question: '',
      options: ['', '', '', ''],
      correct_answer: '',
      expected_language: '',
      points: 1
    });
    setEditingIndex(null);
    setShowQuestionForm(false);
  };

  const addQuestion = () => {
    if (!currentQuestion.question.trim()) {
      toast.error('Question text is required');
      return;
    }

    if (currentQuestion.type === 'multiple_choice') {
      const validOptions = currentQuestion.options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        toast.error('Multiple choice questions need at least 2 options');
        return;
      }
      if (!currentQuestion.correct_answer.trim()) {
        toast.error('Please select the correct answer');
        return;
      }
      if (!validOptions.includes(currentQuestion.correct_answer)) {
        toast.error('Selected correct answer must match one of the options');
        return;
      }
    }

    const newQuestion = { ...currentQuestion };
    if (editingIndex !== null) {
      const updatedQuestions = [...testData.questions];
      updatedQuestions[editingIndex] = newQuestion;
      setTestData({ ...testData, questions: updatedQuestions });
      toast.success('Question updated successfully');
    } else {
      setTestData({ ...testData, questions: [...testData.questions, newQuestion] });
      toast.success('Question added successfully');
    }

    resetQuestionForm();
  };

  const editQuestion = (index) => {
    setCurrentQuestion({ ...testData.questions[index] });
    setEditingIndex(index);
    setShowQuestionForm(true);
  };

  const deleteQuestion = (index) => {
    const updatedQuestions = testData.questions.filter((_, i) => i !== index);
    setTestData({ ...testData, questions: updatedQuestions });
    toast.success('Question deleted');
  };

  const duplicateQuestion = (index) => {
    const questionToDuplicate = { ...testData.questions[index] };
    questionToDuplicate.question = `${questionToDuplicate.question} (Copy)`;
    setTestData({ 
      ...testData, 
      questions: [...testData.questions, questionToDuplicate] 
    });
    toast.success('Question duplicated');
  };

  const createTest = async () => {
    if (!testData.title.trim()) {
      toast.error('Test title is required');
      return;
    }

    if (testData.questions.length === 0) {
      toast.error('Add at least one question to the test');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/tests`, testData);
      toast.success('Test created successfully!');
      navigate('/admin');
    } catch (error) {
      console.error('Failed to create test:', error);
      toast.error('Failed to create test: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = () => {
    const draftId = Date.now().toString();
    const draftToSave = {
      ...testData,
      lastModified: new Date().toISOString()
    };
    localStorage.setItem(`test_draft_${draftId}`, JSON.stringify(draftToSave));
    toast.success('Draft saved successfully!');
  };

  const loadDraft = () => {
    try {
      // First check for old format draft
      const oldDraft = localStorage.getItem('test_draft');
      if (oldDraft) {
        setTestData(JSON.parse(oldDraft));
        toast.success('Draft loaded');
        return;
      }

      // Look for new format drafts
      const drafts = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('test_draft_')) {
          const draftData = JSON.parse(localStorage.getItem(key));
          drafts.push({
            id: key.replace('test_draft_', ''),
            ...draftData,
            lastModified: new Date(draftData.lastModified || Date.now())
          });
        }
      }
      
      if (drafts.length > 0) {
        // Load the most recent draft
        drafts.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        const latestDraft = drafts[0];
        setTestData({
          title: latestDraft.title || '',
          description: latestDraft.description || '',
          duration_minutes: latestDraft.duration_minutes || 60,
          questions: latestDraft.questions || []
        });
        toast.success('Latest draft loaded');
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('test_draft');
    setTestData({
      title: '',
      description: '',
      duration_minutes: 60,
      questions: []
    });
    toast.success('Draft cleared');
  };

  // Load draft on component mount
  useEffect(() => {
    // Check if we're loading a specific draft from dashboard
    const draftToLoad = localStorage.getItem('test_draft_to_load');
    if (draftToLoad) {
      try {
        const draftData = JSON.parse(draftToLoad);
        setTestData({
          title: draftData.title || '',
          description: draftData.description || '',
          duration_minutes: draftData.duration_minutes || 60,
          questions: draftData.questions || []
        });
        setActiveStep(draftData.questions?.length > 0 ? 2 : 1);
        localStorage.removeItem('test_draft_to_load');
        toast.success('Draft loaded successfully!');
      } catch (error) {
        console.error('Error loading specific draft:', error);
        toast.error('Failed to load draft');
      }
    } else {
      // Load the auto-saved draft
      loadDraft();
    }
  }, []);

  const getQuestionTypeIcon = (type) => {
    const typeConfig = questionTypes.find(t => t.value === type);
    return typeConfig ? typeConfig.icon : FileText;
  };

  const getTotalPoints = () => {
    return testData.questions.reduce((sum, q) => sum + (q.points || 1), 0);
  };

  const steps = [
    { id: 1, name: 'Test Info', description: 'Basic test details' },
    { id: 2, name: 'Questions', description: 'Add test questions' },
    { id: 3, name: 'Review', description: 'Review and create' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <BrandIcon className="h-10 w-14" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Create New Test</h1>
                <p className="text-sm text-gray-600">Design your assessment with questions and settings</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={saveDraft}
                className="hidden sm:flex"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/admin')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  activeStep >= step.id 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-500'
                }`}>
                  {step.id}
                </div>
                <div className="ml-3 hidden sm:block">
                  <p className={`text-sm font-medium ${
                    activeStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-1 mx-4 ${
                    activeStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Step 1: Test Information */}
            {activeStep === 1 && (
              <Card className="glass-effect border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Test Information
                  </CardTitle>
                  <CardDescription>
                    Set up the basic details for your test
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="title" className="text-base font-medium">Test Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Frontend Developer Assessment"
                      value={testData.title}
                      onChange={(e) => setTestData({ ...testData, title: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description" className="text-base font-medium">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what this test evaluates and any special instructions..."
                      value={testData.description}
                      onChange={(e) => setTestData({ ...testData, description: e.target.value })}
                      rows={4}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="duration" className="text-base font-medium">Duration (minutes) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      max="480"
                      value={testData.duration_minutes}
                      onChange={(e) => setTestData({ ...testData, duration_minutes: parseInt(e.target.value) })}
                      className="mt-2 w-32"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={() => setActiveStep(2)}
                      disabled={!testData.title.trim()}
                    >
                      Next: Add Questions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Questions */}
            {activeStep === 2 && (
              <div className="space-y-6">
                {/* Question Type Selection */}
                {!showQuestionForm && (
                  <Card className="glass-effect border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle>Add Questions</CardTitle>
                      <CardDescription>
                        Choose a question type to get started
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {questionTypes.map((type) => {
                          const Icon = type.icon;
                          return (
                            <Card
                              key={type.value}
                              className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-300"
                              onClick={() => {
                                setCurrentQuestion({ ...currentQuestion, type: type.value });
                                setShowQuestionForm(true);
                              }}
                            >
                              <CardContent className="p-6 text-center">
                                <Icon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                                <h3 className="font-medium text-gray-900 mb-2">{type.label}</h3>
                                <p className="text-sm text-gray-600">{type.description}</p>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Question Form */}
                {showQuestionForm && (
                  <Card className="glass-effect border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>
                          {editingIndex !== null ? 'Edit Question' : 'Create New Question'}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetQuestionForm}
                        >
                          Cancel
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Question Type</Label>
                          <Select 
                            value={currentQuestion.type} 
                            onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {questionTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Points</Label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={currentQuestion.points}
                            onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Question Text *</Label>
                        <Textarea
                          placeholder="Enter your question here..."
                          value={currentQuestion.question}
                          onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                          rows={3}
                          className="mt-2"
                        />
                      </div>

                      {/* Multiple Choice Options */}
                      {currentQuestion.type === 'multiple_choice' && (
                        <div className="space-y-4">
                          <Label>Answer Options *</Label>
                          {currentQuestion.options.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <span className="text-sm font-medium w-6">{String.fromCharCode(65 + index)}.</span>
                              <Input
                                placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...currentQuestion.options];
                                  const oldValue = newOptions[index];
                                  newOptions[index] = e.target.value;
                                  
                                  // If the correct answer was the old value and it changed, clear it
                                  let updatedCorrectAnswer = currentQuestion.correct_answer;
                                  if (currentQuestion.correct_answer === oldValue && e.target.value !== oldValue) {
                                    updatedCorrectAnswer = '';
                                  }
                                  
                                  setCurrentQuestion({ 
                                    ...currentQuestion, 
                                    options: newOptions,
                                    correct_answer: updatedCorrectAnswer
                                  });
                                }}
                              />
                            </div>
                          ))}
                          
                          {/* Add/Remove Options */}
                          <div className="flex items-center gap-2">
                            {currentQuestion.options.length < 6 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCurrentQuestion({
                                    ...currentQuestion,
                                    options: [...currentQuestion.options, '']
                                  });
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Option
                              </Button>
                            )}
                            {currentQuestion.options.length > 2 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newOptions = currentQuestion.options.slice(0, -1);
                                  const lastOption = currentQuestion.options[currentQuestion.options.length - 1];
                                  let updatedCorrectAnswer = currentQuestion.correct_answer;
                                  
                                  // Clear correct answer if it was the removed option
                                  if (currentQuestion.correct_answer === lastOption) {
                                    updatedCorrectAnswer = '';
                                  }
                                  
                                  setCurrentQuestion({
                                    ...currentQuestion,
                                    options: newOptions,
                                    correct_answer: updatedCorrectAnswer
                                  });
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Remove Option
                              </Button>
                            )}
                          </div>
                          
                          <div>
                            <Label>Correct Answer *</Label>
                            <Select 
                              value={currentQuestion.correct_answer} 
                              onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, correct_answer: value })}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Select the correct answer" />
                              </SelectTrigger>
                              <SelectContent>
                                {currentQuestion.options.map((option, index) => (
                                  option.trim() && (
                                    <SelectItem key={index} value={option}>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-blue-600">
                                          {String.fromCharCode(65 + index)}.
                                        </span>
                                        <span>{option}</span>
                                      </div>
                                    </SelectItem>
                                  )
                                ))}
                                {currentQuestion.options.filter(opt => opt.trim()).length === 0 && (
                                  <SelectItem value="__no_options__" disabled>
                                    <span className="text-gray-400">Add options above first</span>
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            {currentQuestion.options.filter(opt => opt.trim()).length === 0 && (
                              <p className="text-sm text-gray-500 mt-1">
                                Fill in the answer options above to select the correct answer
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Coding Question Language */}
                      {currentQuestion.type === 'coding' && (
                        <div>
                          <Label>Expected Programming Language</Label>
                          <Select 
                            value={currentQuestion.expected_language} 
                            onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, expected_language: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select programming language" />
                            </SelectTrigger>
                            <SelectContent>
                              {programmingLanguages.map((lang) => (
                                <SelectItem key={lang} value={lang.toLowerCase()}>
                                  {lang}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button onClick={addQuestion}>
                          {editingIndex !== null ? 'Update Question' : 'Add Question'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Questions List */}
                {testData.questions.length > 0 && (
                  <Card className="glass-effect border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle>Questions ({testData.questions.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {testData.questions.map((question, index) => {
                          const Icon = getQuestionTypeIcon(question.type);
                          return (
                            <div key={index} className="border rounded-lg p-4 bg-gray-50">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Icon className="h-4 w-4 text-blue-600" />
                                    <Badge variant="outline">
                                      {questionTypes.find(t => t.value === question.type)?.label}
                                    </Badge>
                                    <Badge variant="secondary">
                                      {question.points} point{question.points !== 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                  <p className="text-sm font-medium text-gray-900 mb-2">
                                    Q{index + 1}: {question.question}
                                  </p>
                                  {question.type === 'multiple_choice' && (
                                    <div className="text-xs text-gray-600">
                                      Options: {question.options.filter(opt => opt.trim()).length} | 
                                      Correct: {question.correct_answer}
                                    </div>
                                  )}
                                  {question.type === 'coding' && question.expected_language && (
                                    <div className="text-xs text-gray-600">
                                      Language: {question.expected_language}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => duplicateQuestion(index)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => editQuestion(index)}
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => deleteQuestion(index)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="flex justify-between mt-6">
                        <Button
                          variant="outline"
                          onClick={() => setActiveStep(1)}
                        >
                          Previous
                        </Button>
                        <Button 
                          onClick={() => setActiveStep(3)}
                          disabled={testData.questions.length === 0}
                        >
                          Next: Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 3: Review */}
            {activeStep === 3 && (
              <Card className="glass-effect border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Review Test
                  </CardTitle>
                  <CardDescription>
                    Review all details before creating your test
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Test Details</h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div><strong>Title:</strong> {testData.title}</div>
                        <div><strong>Duration:</strong> {testData.duration_minutes} minutes</div>
                        <div><strong>Questions:</strong> {testData.questions.length}</div>
                        <div><strong>Total Points:</strong> {getTotalPoints()}</div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Question Breakdown</h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        {questionTypes.map(type => {
                          const count = testData.questions.filter(q => q.type === type.value).length;
                          return count > 0 ? (
                            <div key={type.value}>
                              <strong>{type.label}:</strong> {count}
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>

                  {testData.description && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        {testData.description}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setActiveStep(2)}
                    >
                      Previous
                    </Button>
                    <Button 
                      onClick={createTest}
                      disabled={loading}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Create Test
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Test Summary */}
              <Card className="glass-effect border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Test Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Questions</span>
                    <Badge>{testData.questions.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Points</span>
                    <Badge>{getTotalPoints()}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Duration</span>
                    <Badge>{testData.duration_minutes} min</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Est. Time per Q</span>
                    <Badge>
                      {testData.questions.length > 0 
                        ? Math.round(testData.duration_minutes / testData.questions.length)
                        : 0} min
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Draft Actions */}
              <Card className="glass-effect border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Draft Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={saveDraft}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={loadDraft}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Load Draft
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-red-600 hover:text-red-700"
                    onClick={clearDraft}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Draft
                  </Button>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card className="glass-effect border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2 text-gray-600">
                  <p>• Use clear, specific question wording</p>
                  <p>• Mix different question types for better assessment</p>
                  <p>• Assign more points to harder questions</p>
                  <p>• Test coding questions with multiple languages</p>
                  <p>• Save drafts frequently while working</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTestPage;
