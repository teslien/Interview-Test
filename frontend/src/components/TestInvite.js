import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Clock, FileText, User, CheckCircle } from 'lucide-react';
// Removed toast import
import { format } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TestInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [step, setStep] = useState('details'); // 'details', 'schedule', 'confirmed'

  useEffect(() => {
    fetchInviteDetails();
  }, [token]);

  const fetchInviteDetails = async () => {
    try {
      const response = await axios.get(`${API}/invites/token/${token}`);
      setInvite(response.data.invite);
      setTest(response.data.test);
      
      // Check if already scheduled
      if (response.data.invite.status === 'scheduled') {
        setStep('confirmed');
      }
    } catch (error) {
      console.error('Failed to fetch invite details:', error);
      toast.error('Invalid or expired invite link');
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

    setScheduling(true);
    try {
      const [hours, minutes] = selectedTime.split(':');
      const scheduledDateTime = new Date(selectedDate);
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await axios.post(`${API}/invites/token/${token}/schedule`, {
        scheduled_date: scheduledDateTime.toISOString()
      });

      toast.success('Test scheduled successfully!');
      setStep('confirmed');
      
      // Update invite status
      setInvite(prev => ({
        ...prev,
        status: 'scheduled',
        scheduled_date: scheduledDateTime.toISOString()
      }));
    } catch (error) {
      console.error('Failed to schedule test:', error);
      toast.error('Failed to schedule test');
    } finally {
      setScheduling(false);
    }
  };

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!invite || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <Card className="max-w-md w-full glass-effect border-0 shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invite</h2>
            <p className="text-gray-600 mb-4">This test invite link is invalid or has expired.</p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Invitation</h1>
          <p className="text-gray-600">You've been invited to take a pre-interview assessment</p>
        </div>

        {step === 'details' && (
          <div className="space-y-6 animate-slide-up">
            {/* Test Details */}
            <Card className="glass-effect border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl text-center">{test.title}</CardTitle>
                <CardDescription className="text-center text-lg">
                  {test.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Applicant Info */}
                <div className="bg-white/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <User className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-semibold text-gray-900">Candidate Information</h3>
                  </div>
                  <div className="space-y-2">
                    <p><span className="font-medium">Name:</span> {invite.applicant_name}</p>
                    <p><span className="font-medium">Email:</span> {invite.applicant_email}</p>
                  </div>
                </div>

                {/* Test Details */}
                <div className="bg-white/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-semibold text-gray-900">Test Details</h3>
                  </div>
                  <div className="space-y-2">
                    <p><span className="font-medium">Questions:</span> {test.questions.length}</p>
                    <p><span className="font-medium">Duration:</span> {test.duration_minutes} minutes</p>
                    <p><span className="font-medium">Question Types:</span></p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[...new Set(test.questions.map(q => q.type))].map(type => (
                        <span key={type} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm capitalize">
                          {type.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Important Notes */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">Important Notes:</h3>
                  <ul className="space-y-1 text-yellow-700 text-sm">
                    <li>• Ensure you have a stable internet connection</li>
                    <li>• You will be monitored via video call during the test</li>
                    <li>• The test must be completed in one session</li>
                    <li>• Have your ID ready for verification</li>
                  </ul>
                </div>

                <Button 
                  onClick={() => setStep('schedule')}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 text-lg font-medium"
                  data-testid="schedule-test-button"
                >
                  Schedule Test
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'schedule' && (
          <div className="space-y-6 animate-slide-up">
            <Card className="glass-effect border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl text-center">Schedule Your Test</CardTitle>
                <CardDescription className="text-center">
                  Choose a convenient date and time for your assessment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Selection */}
                <div>
                  <Label className="text-base font-medium mb-3 block">Select Date</Label>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date() || date < new Date(Date.now() - 86400000)}
                      className="rounded-lg border border-gray-200 bg-white/80 shadow-sm"
                      data-testid="date-picker"
                    />
                  </div>
                </div>

                {/* Time Selection */}
                {selectedDate && (
                  <div className="animate-fade-in">
                    <Label className="text-base font-medium mb-3 block">Select Time</Label>
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                      <SelectTrigger className="w-full bg-white/80" data-testid="time-picker">
                        <SelectValue placeholder="Choose a time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map(time => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Selected Date/Time Summary */}
                {selectedDate && selectedTime && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 animate-fade-in">
                    <div className="flex items-center space-x-3">
                      <CalendarIcon className="h-5 w-5 text-indigo-600" />
                      <div>
                        <p className="font-medium text-indigo-900">
                          {format(selectedDate, 'EEEE, MMMM do, yyyy')}
                        </p>
                        <p className="text-indigo-700">at {selectedTime}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-4">
                  <Button 
                    onClick={() => setStep('details')}
                    variant="outline"
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleSchedule}
                    disabled={!selectedDate || !selectedTime || scheduling}
                    className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
                    data-testid="confirm-schedule-button"
                  >
                    {scheduling ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Scheduling...
                      </div>
                    ) : (
                      'Confirm Schedule'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'confirmed' && (
          <div className="animate-bounce-in">
            <Card className="glass-effect border-0 shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Test Scheduled Successfully!</h2>
                <p className="text-gray-600 mb-6">Your test has been scheduled for:</p>
                
                {invite.scheduled_date && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-center space-x-3">
                      <CalendarIcon className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-900">
                          {format(new Date(invite.scheduled_date), 'EEEE, MMMM do, yyyy')}
                        </p>
                        <p className="text-green-700">
                          at {format(new Date(invite.scheduled_date), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
                  <ul className="space-y-1 text-blue-800 text-sm">
                    <li>• You'll receive a confirmation email shortly</li>
                    <li>• Join the test 5 minutes before your scheduled time</li>
                    <li>• Ensure your camera and microphone are working</li>
                    <li>• Have a valid ID ready for verification</li>
                  </ul>
                </div>

                <Button 
                  onClick={() => navigate('/login')}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                  data-testid="go-to-login-button"
                >
                  Go to Login
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestInvite;