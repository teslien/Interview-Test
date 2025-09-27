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
// Removed toast import

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TakeTest = () => {
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTestDetails();
    return () => {
      // Cleanup video stream
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
      const response = await axios.get(`${API}/take-test/${token}`);
      setInvite(response.data.invite);
      setTest(response.data.test);
      setTimeLeft(response.data.test.duration_minutes * 60);
    } catch (error) {
      console.error('Failed to fetch test details:', error);
      alert('Unable to load test. Error: ' + (error.response?.data?.detail || error.message));
      navigate('/');
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
      alert('Camera access is required for the test');
      return false;
    }
  };

  const handleStartTest = async () => {
    const videoStarted = await startVideo();
    if (videoStarted) {
      setTestStarted(true);
      alert('Test started! You are being monitored.');
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
      alert('Test submitted successfully!');
      
      // Stop video stream
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      
      navigate('/login');
    } catch (error) {
      console.error('Failed to submit test:', error);
      alert('Failed to submit test');
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
                  ref={videoRef}
                  autoPlay 
                  muted 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-center">
                    <Camera className="h-12 w-12 mx-auto mb-2" />
                    <p>Camera preview will appear here</p>
                  </div>
                </div>
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

            {/* Video Monitor */}
            <div className="w-32 h-24 bg-gray-900 rounded-lg overflow-hidden relative">
              <video 
                ref={videoRef}
                autoPlay 
                muted 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1 right-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <Mic className="h-3 w-3 text-white" />
                </div>
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