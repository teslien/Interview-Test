import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Plus, Send, Eye, Users, FileText, Clock, Video, LogOut, Trash2, Edit, Bell, BellRing, CheckSquare, AlertCircle, Settings, Mail, UserCheck, UserX, Shield, MoreVertical, AlertTriangle, RefreshCw } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import BrandIcon from '../components/ui/BrandIcon';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { applyTheme, currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [tests, setTests] = useState([]);
  const [invites, setInvites] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [applicants, setApplicants] = useState([]);
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: 'Interview Platform'
  });
  const [scoringQueue, setScoringQueue] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissionDetails, setSubmissionDetails] = useState(null);
  const [scoringLoading, setScoringLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, testId: null, testTitle: '', isForce: false });
  const [deleteApplicantDialog, setDeleteApplicantDialog] = useState({ open: false, applicantId: null, applicantName: '', applicantEmail: '' });
  const [themeSettings, setThemeSettings] = useState({
    themeName: 'classic',
    customColors: {}
  });
  
  // Pagination and filtering state for Results
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTestFilter, setSelectedTestFilter] = useState('all');

  // Filtering state for Invites
  const [inviteDateFilter, setInviteDateFilter] = useState(new Date().toISOString().split('T')[0]); // Today's date
  const [inviteStatusFilter, setInviteStatusFilter] = useState('all');
  const [inviteEmailSearch, setInviteEmailSearch] = useState('');

  // Dialog state for viewing result details
  const [selectedResult, setSelectedResult] = useState(null);
  const [resultDetails, setResultDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
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
  const [showAddQuestionToEdit, setShowAddQuestionToEdit] = useState(false);
  const [showEditQuestion, setShowEditQuestion] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  
  // Test filtering state
  const [testFilter, setTestFilter] = useState('multiple_choice');
  const [testSearchQuery, setTestSearchQuery] = useState('');
  
  // Draft management state
  const [savedDrafts, setSavedDrafts] = useState([]);
  
  // Auto generate test state
  const [showAutoGenerateDialog, setShowAutoGenerateDialog] = useState(false);
  const [autoGenerateLoading, setAutoGenerateLoading] = useState(false);
  const [autoGenerateData, setAutoGenerateData] = useState({
    topic: '',
    questionCount: 10,
    geminiApiKey: '',
    level: 'intermediate'
  });

  // Admin Management State
  const [isFirstAdmin, setIsFirstAdmin] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [showAdminManagement, setShowAdminManagement] = useState(false);
  const [showCreateAdminDialog, setShowCreateAdminDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [newAdminData, setNewAdminData] = useState({
    email: '',
    password: '',
    full_name: ''
  });
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchData();
    fetchApplicants();
    fetchNotifications();
    fetchScoringQueue();
    fetchThemeSettings();
    fetchEmailSettings();
    checkFirstAdmin();
    loadSavedDrafts();
    
    // Poll for new notifications every 30 seconds
    const notificationInterval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(notificationInterval);
  }, []);

  // Separate useEffect for admin-related operations that depend on user
  useEffect(() => {
    if (user?.role === 'admin') {
      console.log('👤 User is admin, loading admin data...');
      fetchAdmins();
    }
  }, [user]);

  // Refetch results when pagination or filters change
  useEffect(() => {
    if (activeTab === 'results') {
      fetchResults();
    }
  }, [currentPage, pageSize, startDate, endDate, selectedTestFilter, activeTab]);

  // Refetch invites when filters change
  useEffect(() => {
    if (activeTab === 'invites') {
      fetchInvites();
    }
  }, [inviteDateFilter, inviteStatusFilter, inviteEmailSearch, activeTab]);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-dropdown')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const fetchInvites = async () => {
    try {
      const params = new URLSearchParams();
      
      if (inviteDateFilter) {
        params.append('date_filter', inviteDateFilter);
      }
      
      if (inviteStatusFilter && inviteStatusFilter !== 'all') {
        params.append('status_filter', inviteStatusFilter);
      }
      
      if (inviteEmailSearch.trim()) {
        params.append('email_search', inviteEmailSearch.trim());
      }
      
      const response = await axios.get(`${API}/invites?${params.toString()}`);
      setInvites(response.data);
    } catch (error) {
      console.error('Failed to fetch invites:', error);
      toast.error('Failed to load invites');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const testsRes = await axios.get(`${API}/tests`);
      setTests(testsRes.data);
      
      // Fetch invites with filters
      await fetchInvites();
      
      // Fetch results separately with pagination
      await fetchResults();
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async (page = currentPage) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString()
      });
      
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedTestFilter && selectedTestFilter !== 'all') params.append('test_id', selectedTestFilter);
      
      const resultsRes = await axios.get(`${API}/results?${params}`);
      
      setResults(resultsRes.data.results);
      setCurrentPage(resultsRes.data.pagination.page);
      setTotalPages(resultsRes.data.pagination.total_pages);
      setTotalResults(resultsRes.data.pagination.total);
    } catch (error) {
      console.error('Failed to fetch results:', error);
      toast.error('Failed to load results');
    }
  };

  const fetchNotifications = async () => {
    try {
      const [notificationsRes, unreadCountRes] = await Promise.all([
        axios.get(`${API}/admin/notifications`),
        axios.get(`${API}/admin/notifications/unread-count`)
      ]);
      
      setNotifications(notificationsRes.data.notifications);
      setUnreadCount(unreadCountRes.data.unread_count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await axios.post(`${API}/admin/notifications/${notificationId}/mark-read`);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      // Mark notification as read
      await markNotificationAsRead(notification.id);
      
      // Check if it's a test started notification
      if (notification.type === 'test_started' && notification.data) {
        const { invite_id, applicant_email } = notification.data;
        
        if (invite_id && applicant_email) {
          // Store the pre-selected applicant data in localStorage
          localStorage.setItem('preselectedApplicant', JSON.stringify({
            invite_id,
            applicant_email,
            timestamp: Date.now()
          }));
          
          // Navigate to monitoring page
          navigate('/monitoring');
          
          toast.success(`Redirecting to monitor ${applicant_email}...`);
        } else {
          toast.error('Invalid notification data');
        }
      } else {
        // For other notification types, just mark as read
        toast.info('Notification marked as read');
      }
    } catch (error) {
      console.error('Failed to handle notification click:', error);
      toast.error('Failed to process notification');
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/notifications/clear-all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Clear notifications from state
      setNotifications([]);
      setUnreadCount(0);
      
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      toast.error('Failed to clear notifications: ' + (error.response?.data?.detail || error.message));
    }
  };

  const fetchApplicants = async () => {
    try {
      console.log('Fetching applicants...');
      const response = await axios.get(`${API}/admin/applicants`);
      console.log('Applicants response:', response.data);
      setApplicants(response.data);
    } catch (error) {
      console.error('Failed to fetch applicants:', error);
      toast.error('Failed to load applicants: ' + (error.response?.data?.detail || error.message));
    }
  };

  const fetchEmailSettings = async () => {
    try {
      const response = await axios.get(`${API}/admin/email-settings`);
      setEmailSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch email settings:', error);
    }
  };

  const updateEmailSettings = async () => {
    try {
      await axios.put(`${API}/admin/email-settings`, emailSettings);
      toast.success('Email settings updated successfully!');
    } catch (error) {
      console.error('Failed to update email settings:', error);
      toast.error('Failed to update email settings');
    }
  };

  const testEmailSettings = async () => {
    const testEmail = prompt('Enter email address to send test email to:');
    if (!testEmail) return;
    
    try {
      await axios.post(`${API}/admin/email-settings/test`, { email: testEmail });
      toast.success('Test email sent successfully!');
    } catch (error) {
      console.error('Failed to send test email:', error);
      toast.error('Failed to send test email: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Admin Management Functions
  const checkFirstAdmin = async () => {
    try {
      console.log('🔍 Checking first admin status...');
      const response = await axios.get(`${API}/admin/is-first-admin`);
      console.log('📊 First admin response:', response.data);
      setIsFirstAdmin(response.data.is_first_admin);
      
      if (response.data.is_first_admin) {
        console.log(' Current user is the first admin');
        console.log('👑 First admin details:', response.data.first_admin);
      } else {
        console.log('❌ Current user is NOT the first admin');
      }
    } catch (error) {
      console.error('❌ Failed to check first admin status:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      console.log('🔍 Fetching admins list...');
      const response = await axios.get(`${API}/admin/list-admins`);
      console.log('📊 Admins response:', response.data);
      setAdmins(response.data);
      console.log('✅ Admins loaded successfully:', response.data.length, 'admins');
    } catch (error) {
      console.error('❌ Failed to fetch admins:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to load admins: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoadingAdmins(false);
    }
  };

  const createAdmin = async () => {
    if (!newAdminData.email || !newAdminData.password || !newAdminData.full_name) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await axios.post(`${API}/admin/create-admin`, newAdminData);
      toast.success('Admin created successfully!');
      setShowCreateAdminDialog(false);
      setNewAdminData({ email: '', password: '', full_name: '' });
      fetchAdmins();
    } catch (error) {
      console.error('Failed to create admin:', error);
      toast.error('Failed to create admin: ' + (error.response?.data?.detail || error.message));
    }
  };

  const changeAdminPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      await axios.put(`${API}/admin/change-password/${selectedAdmin.id}`, {
        new_password: newPassword
      });
      toast.success('Password changed successfully!');
      setShowChangePasswordDialog(false);
      setNewPassword('');
      setSelectedAdmin(null);
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error('Failed to change password: ' + (error.response?.data?.detail || error.message));
    }
  };

  const deleteAdmin = async (adminId, adminEmail) => {
    if (!confirm(`Are you sure you want to delete admin ${adminEmail}? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/admin/delete-admin/${adminId}`);
      toast.success('Admin deleted successfully!');
      fetchAdmins();
    } catch (error) {
      console.error('Failed to delete admin:', error);
      toast.error('Failed to delete admin: ' + (error.response?.data?.detail || error.message));
    }
  };

  const fetchThemeSettings = async () => {
    try {
      const response = await axios.get(`${API}/admin/theme-settings`);
      setThemeSettings(response.data);
      // Apply the fetched theme
      if (response.data.themeName) {
        applyTheme(response.data.themeName);
      }
    } catch (error) {
      console.error('Failed to fetch theme settings:', error);
    }
  };

  const updateThemeSettings = async () => {
    try {
      await axios.put(`${API}/admin/theme-settings`, themeSettings);
      // Apply the new theme immediately
      applyTheme(themeSettings.themeName);
      toast.success('Theme settings updated successfully!');
    } catch (error) {
      console.error('Failed to update theme settings:', error);
      toast.error('Failed to update theme settings');
    }
  };

  const deleteApplicantCompletely = async (applicantId) => {
    try {
      const response = await axios.delete(`${API}/admin/applicants/${applicantId}`);
      toast.success(response.data.message);
      fetchApplicants(); // Refresh the list
      setDeleteApplicantDialog({ open: false, applicantId: null, applicantName: '', applicantEmail: '' });
    } catch (error) {
      console.error('Failed to delete applicant:', error);
      toast.error('Failed to delete applicant: ' + (error.response?.data?.detail || error.message));
    }
  };

  const toggleApplicantStatus = async (applicantId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await axios.put(`${API}/admin/applicants/${applicantId}/status`, { status: newStatus });
      setApplicants(prev => 
        prev.map(applicant => 
          applicant.id === applicantId ? { ...applicant, is_active: newStatus === 'active' } : applicant
        )
      );
      toast.success(`Applicant ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Failed to update applicant status:', error);
      toast.error('Failed to update applicant status');
    }
  };

  const fetchScoringQueue = async () => {
    try {
      const response = await axios.get(`${API}/admin/scoring-queue`);
      setScoringQueue(response.data.submissions);
    } catch (error) {
      console.error('Failed to fetch scoring queue:', error);
    }
  };

  const fetchSubmissionDetails = async (submissionId) => {
    setScoringLoading(true);
    try {
      const response = await axios.get(`${API}/admin/scoring/${submissionId}`);
      setSubmissionDetails(response.data);
    } catch (error) {
      console.error('Failed to fetch submission details:', error);
      toast.error('Failed to load submission details');
    } finally {
      setScoringLoading(false);
    }
  };

  const scoreAnswer = async (submissionId, answerId, scoreData) => {
    try {
      await axios.post(`${API}/admin/scoring/${submissionId}/answer/${answerId}`, scoreData);
      toast.success('Answer scored successfully');
      
      // Refresh submission details and scoring queue
      await fetchSubmissionDetails(submissionId);
      await fetchScoringQueue();
    } catch (error) {
      console.error('Failed to score answer:', error);
      toast.error('Failed to score answer');
    }
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
    fetchResults(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchResults(page);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    fetchResults(1);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedTestFilter('all');
    setCurrentPage(1);
    fetchResults(1);
  };

  // Invite filter handlers
  const clearInviteFilters = () => {
    setInviteDateFilter(new Date().toISOString().split('T')[0]); // Reset to today
    setInviteStatusFilter('all');
    setInviteEmailSearch('');
  };

  const handleInviteFilterChange = () => {
    fetchInvites();
  };

  const handleCreateTest = async () => {
    if (!newTest.title || !newTest.description || newTest.questions.length === 0) {
      toast.error('Please fill in all required fields and add at least one question');
      return;
    }
    
    try {
      const response = await axios.post(`${API}/tests`, newTest);
      console.log('Test created:', response.data);
      toast.success('Test created successfully!');
      setShowCreateTest(false);
      setNewTest({ title: '', description: '', duration_minutes: 60, questions: [] });
      fetchData();
    } catch (error) {
      console.error('Failed to create test:', error);
      toast.error('Failed to create test: ' + (error.response?.data?.detail || error.message));
    }
  };

  const addQuestion = () => {
    if (!currentQuestion.question) {
      toast.error('Please enter a question');
      return;
    }
    
    // Validation for multiple choice
    if (currentQuestion.type === 'multiple_choice') {
      const filledOptions = currentQuestion.options.filter(opt => opt.trim() !== '');
      if (filledOptions.length < 2) {
        toast.error('Please provide at least 2 options for multiple choice questions');
        return;
      }
      if (!currentQuestion.correct_answer) {
        toast.error('Please select the correct answer for multiple choice questions');
        return;
      }
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
    
    toast.success('Question added successfully!');
  };

  const updateQuestion = () => {
    if (!currentQuestion.question) {
      toast.error('Please enter a question');
      return;
    }
    
    // Validation for multiple choice
    if (currentQuestion.type === 'multiple_choice') {
      const filledOptions = currentQuestion.options.filter(opt => opt.trim() !== '');
      if (filledOptions.length < 2) {
        toast.error('Please provide at least 2 options for multiple choice questions');
        return;
      }
      if (!currentQuestion.correct_answer) {
        toast.error('Please select the correct answer for multiple choice questions');
        return;
      }
    }
    
    const updatedQuestion = { ...currentQuestion };
    
    // Clean up question based on type
    if (updatedQuestion.type !== 'multiple_choice') {
      delete updatedQuestion.options;
      delete updatedQuestion.correct_answer;
    }
    if (updatedQuestion.type !== 'coding') {
      delete updatedQuestion.expected_language;
    }
    
    // Update in newTest or editingTest based on context
    if (editingTest && editingQuestionIndex !== null) {
      const updatedQuestions = [...editingTest.questions];
      updatedQuestions[editingQuestionIndex] = updatedQuestion;
      setEditingTest({ ...editingTest, questions: updatedQuestions });
    } else if (editingQuestionIndex !== null) {
      const updatedQuestions = [...newTest.questions];
      updatedQuestions[editingQuestionIndex] = updatedQuestion;
      setNewTest({ ...newTest, questions: updatedQuestions });
    }
    
    // Reset form and close modal
    setCurrentQuestion({
      type: 'multiple_choice',
      question: '',
      options: ['', '', '', ''],
      correct_answer: '',
      expected_language: '',
      points: 1
    });
    setShowEditQuestion(false);
    setEditingQuestionIndex(null);
    
    toast.success('Question updated successfully!');
  };

  const addQuestionToEditingTest = () => {
    if (!currentQuestion.question) {
      toast.error('Please enter a question');
      return;
    }
    
    // Validation for multiple choice
    if (currentQuestion.type === 'multiple_choice') {
      const filledOptions = currentQuestion.options.filter(opt => opt.trim() !== '');
      if (filledOptions.length < 2) {
        toast.error('Please provide at least 2 options for multiple choice questions');
        return;
      }
      if (!currentQuestion.correct_answer) {
        toast.error('Please select the correct answer for multiple choice questions');
        return;
      }
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
    
    setEditingTest(prev => ({
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
    
    setShowAddQuestionToEdit(false);
    toast.success('Question added successfully!');
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
      toast.error('Failed to send invite: ' + (error.response?.data?.detail || error.message));
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
      toast.error('Please fill in all required fields and add at least one question');
      return;
    }
    
    try {
      await axios.put(`${API}/tests/${editingTest.id}`, editingTest);
      toast.success('Test updated successfully!');
      setShowEditTest(false);
      setEditingTest(null);
      fetchData();
    } catch (error) {
      console.error('Failed to update test:', error);
      toast.error('Failed to update test: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDeleteTest = (testId, testTitle, force = false) => {
    setDeleteDialog({ open: true, testId, testTitle, isForce: force });
  };

  const confirmDeleteTest = async () => {
    try {
      const endpoint = deleteDialog.isForce 
        ? `${API}/tests/${deleteDialog.testId}/force`
        : `${API}/tests/${deleteDialog.testId}`;
      
      const response = await axios.delete(endpoint);
      
      if (deleteDialog.isForce) {
        toast.success(`Test force deleted! ${response.data.deleted_invites} invites were also removed.`);
      } else {
        toast.success('Test deleted successfully!');
      }
      
      fetchData();
    } catch (error) {
      console.error('Failed to delete test:', error);
      const errorMessage = error.response?.data?.detail || error.message;
      
      // If regular delete fails due to active invites, show force delete option
      if (!deleteDialog.isForce && errorMessage.includes('active invitations')) {
        toast.error('Cannot delete test with active invitations. Use Force Delete to remove all data.');
      } else {
        toast.error('Failed to delete test: ' + errorMessage);
      }
    } finally {
      setDeleteDialog({ open: false, testId: null, testTitle: '', isForce: false });
    }
  };

  // Filter tests based on question type and search query
  const getFilteredTests = () => {
    return tests.filter(test => {
      // Filter by question type
      const hasFilteredQuestions = testFilter === 'all' || 
        test.questions.some(question => question.type === testFilter);
      
      // Filter by search query
      const matchesSearch = testSearchQuery === '' ||
        test.title.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
        test.description.toLowerCase().includes(testSearchQuery.toLowerCase());
      
      return hasFilteredQuestions && matchesSearch;
    });
  };

  // Draft management functions
  const loadSavedDrafts = () => {
    try {
      const drafts = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('test_draft_')) {
          const draftData = JSON.parse(localStorage.getItem(key));
          const draftId = key.replace('test_draft_', '');
          drafts.push({
            id: draftId,
            ...draftData,
            lastModified: new Date(draftData.lastModified || Date.now())
          });
        }
      }
      // Sort by last modified date
      drafts.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      setSavedDrafts(drafts);
    } catch (error) {
      console.error('Error loading drafts:', error);
    }
  };

  const saveDraftToStorage = (draftData, draftId = null) => {
    const id = draftId || Date.now().toString();
    const draftToSave = {
      ...draftData,
      lastModified: new Date().toISOString()
    };
    localStorage.setItem(`test_draft_${id}`, JSON.stringify(draftToSave));
    loadSavedDrafts();
    toast.success('Draft saved successfully!');
    return id;
  };

  const deleteDraft = (draftId) => {
    localStorage.removeItem(`test_draft_${draftId}`);
    loadSavedDrafts();
    toast.success('Draft deleted successfully!');
  };

  const loadDraft = (draftId) => {
    try {
      const draftData = localStorage.getItem(`test_draft_${draftId}`);
      if (draftData) {
        // Navigate to create test page with the draft data
        localStorage.setItem('test_draft_to_load', draftData);
        navigate('/admin/create-test');
        toast.success('Draft loaded! Redirecting to test creator...');
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      toast.error('Failed to load draft');
    }
  };

  // Auto generate test function
  const handleAutoGenerateTest = async () => {
    if (!autoGenerateData.topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }
    if (!autoGenerateData.geminiApiKey.trim()) {
      toast.error('Please enter your Gemini API key');
      return;
    }
    if (autoGenerateData.questionCount < 1 || autoGenerateData.questionCount > 30) {
      toast.error('Question count must be between 1 and 30');
      return;
    }

    setAutoGenerateLoading(true);
    try {
      const response = await axios.post(`${API}/tests/auto-generate`, {
        topic: autoGenerateData.topic,
        questionCount: autoGenerateData.questionCount,
        geminiApiKey: autoGenerateData.geminiApiKey,
        level: autoGenerateData.level
      });

      if (response.data.success) {
        toast.success(`Test "${response.data.test.title}" generated successfully!`);
        setShowAutoGenerateDialog(false);
        setAutoGenerateData({ topic: '', questionCount: 10, geminiApiKey: '', level: 'intermediate' });
        fetchData(); // Refresh tests list
      } else {
        toast.error('Failed to generate test: ' + response.data.message);
      }
    } catch (error) {
      console.error('Auto generate error:', error);
      let message = 'Failed to generate test';
      
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          message = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          message = error.response.data.detail.map(err => err.msg || err).join(', ');
        } else {
          message = JSON.stringify(error.response.data.detail);
        }
      } else if (error.message) {
        message = error.message;
      }
      
      toast.error(message);
    } finally {
      setAutoGenerateLoading(false);
    }
  };

  const handleViewResultDetails = async (result) => {
    setSelectedResult(result);
    setDetailsLoading(true);
    setDetailsDialogOpen(true);

    try {
      const response = await axios.get(`${API}/results/${result.submission_id}`);
      setResultDetails(response.data);
    } catch (error) {
      console.error('Failed to fetch result details:', error);
      toast.error('Failed to load result details');
      setResultDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeResultDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedResult(null);
    setResultDetails(null);
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
    <div className={`min-h-screen themed-component ${currentTheme !== 'light' ? `theme-${currentTheme}` : ''}`} style={{
      background: currentTheme === 'modern' ? 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' : 
                  currentTheme === 'professional' ? '#f8fafc' :
                  currentTheme === 'premium' ? 'linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 50%, #000000 100%)' :
                  currentTheme === 'dark' ? '#111827' : 
                  currentTheme === 'classic' ? 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' :
                  'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
    }}>
      {/* Header */}
      <div className={`admin-header sticky top-0 z-40 ${currentTheme === 'premium' ? 'text-white' : 
                      currentTheme === 'dark' ? 'bg-gray-900 text-white border-b border-gray-700' :
                      currentTheme === 'modern' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' :
                      currentTheme === 'professional' ? 'bg-gradient-to-r from-gray-600 to-blue-600 text-white' :
                      currentTheme === 'classic' ? 'bg-gradient-to-r from-blue-400 to-purple-400 text-white' :
                      'bg-white/80 backdrop-blur-sm border-b border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <BrandIcon className="h-10 w-14" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {user?.full_name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Settings */}
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
                size="sm"
                className="relative"
              >
                <Settings className="h-4 w-4" />
              </Button>

              {/* Notification Bell */}
              <div className="relative notification-dropdown">
                <Button
                  onClick={() => setShowNotifications(!showNotifications)}
                  variant="outline"
                  size="sm"
                  className="relative"
                >
                  {unreadCount > 0 ? (
                    <BellRing className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
                
                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No notifications
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                              !notification.is_read ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-900">
                                    {notification.message}
                                  </p>
                                  {notification.type === 'test_started' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      <Video className="h-3 w-3 mr-1" />
                                      Monitor
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(notification.created_at).toLocaleString()}
                                </p>
                              </div>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-gray-200">
                        <Button
                          onClick={handleClearAllNotifications}
                          variant="outline"
                          size="sm"
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Clear All Notifications
                        </Button>
                      </div>
                    )}
                  </div>
                )}
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
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5">
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
            <TabsTrigger value="scoring" className="flex items-center space-x-2 relative">
              <CheckSquare className="h-4 w-4" />
              <span>Scoring</span>
              {scoringQueue.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {scoringQueue.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className={`admin-card glass-effect border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${currentTheme !== 'light' ? 'themed-card-override' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${currentTheme === 'dark' || currentTheme === 'premium' ? 'text-gray-300' : 'text-gray-600'}`}>Total Tests</p>
                      <p className={`text-3xl font-bold ${currentTheme === 'dark' || currentTheme === 'premium' ? 'text-white' : 'text-gray-900'}`}>{tests.length}</p>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className={`admin-card glass-effect border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${currentTheme !== 'light' ? 'themed-card-override' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${currentTheme === 'dark' || currentTheme === 'premium' ? 'text-gray-300' : 'text-gray-600'}`}>Invites Sent</p>
                      <p className={`text-3xl font-bold ${currentTheme === 'dark' || currentTheme === 'premium' ? 'text-white' : 'text-gray-900'}`}>{invites.length}</p>
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
                    onClick={() => navigate('/admin/create-test')}
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
                    onClick={() => navigate('/monitoring')}
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
              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowAutoGenerateDialog(true)}
                  variant="outline"
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl border-0"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Auto Generate Test
                </Button>
                <Button
                  onClick={() => navigate('/admin/create-test')}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                  data-testid="create-test-button-tab"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Test
                </Button>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg border">
              <div className="flex-1">
                <Label htmlFor="test-search" className="text-sm font-medium text-gray-700 mb-1 block">
                  Search Tests
                </Label>
                <Input
                  id="test-search"
                  placeholder="Search by title or description..."
                  value={testSearchQuery}
                  onChange={(e) => setTestSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="sm:w-64">
                <Label htmlFor="test-filter" className="text-sm font-medium text-gray-700 mb-1 block">
                  Filter by Question Type
                </Label>
                <Select value={testFilter} onValueChange={setTestFilter}>
                  <SelectTrigger id="test-filter">
                    <SelectValue placeholder="Select question type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Question Types</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="coding">Coding Questions</SelectItem>
                    <SelectItem value="essay">Essay Questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Counter */}
            {tests.length > 0 && (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {getFilteredTests().length} of {tests.length} test{tests.length !== 1 ? 's' : ''}
                  {testFilter !== 'all' && (
                    <span className="ml-1">
                      with {testFilter.replace('_', ' ')} questions
                    </span>
                  )}
                  {testSearchQuery && (
                    <span className="ml-1">
                      matching "{testSearchQuery}"
                    </span>
                  )}
                </span>
                {(testFilter !== 'all' || testSearchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTestFilter('all');
                      setTestSearchQuery('');
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            )}

            {/* Saved Drafts Section */}
            {savedDrafts.length > 0 && (
              <Card className="glass-effect border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Saved Drafts ({savedDrafts.length})
                  </CardTitle>
                  <CardDescription>
                    Resume working on your unfinished tests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedDrafts.map((draft) => (
                      <div key={draft.id} className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {draft.title || 'Untitled Draft'}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {draft.questions?.length || 0} question{(draft.questions?.length || 0) !== 1 ? 's' : ''}
                              {draft.duration_minutes && ` • ${draft.duration_minutes} min`}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Last modified: {new Date(draft.lastModified).toLocaleDateString()} at {new Date(draft.lastModified).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadDraft(draft.id)}
                            className="flex-1 text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Continue
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteDraft(draft.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredTests().map((test) => (
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 hover:text-red-700"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTest(test.id, test.title, false)}
                            className="text-red-600 focus:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Test
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTest(test.id, test.title, true)}
                            className="text-red-700 focus:text-red-800 focus:bg-red-50"
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Force Delete All
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {getFilteredTests().length === 0 && tests.length > 0 && (
                <div className="col-span-full text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tests match your filters</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your search or filter criteria</p>
                  <Button
                    onClick={() => {
                      setTestFilter('all');
                      setTestSearchQuery('');
                    }}
                    variant="outline"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
              {tests.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tests created yet</h3>
                  <p className="text-gray-600 mb-4">Create your first test to get started with assessments</p>
                  <Button
                    onClick={() => navigate('/admin/create-test')}
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

            {/* Invite Filters */}
            <Card className="glass-effect border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="invite-date-filter">Date Filter</Label>
                    <Input
                      id="invite-date-filter"
                      type="date"
                      value={inviteDateFilter}
                      onChange={(e) => setInviteDateFilter(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="invite-status-filter">Status Filter</Label>
                    <Select value={inviteStatusFilter} onValueChange={setInviteStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Invites</SelectItem>
                        <SelectItem value="active">Active (Pending)</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="invite-email-search">Search by Email</Label>
                    <Input
                      id="invite-email-search"
                      type="text"
                      placeholder="Enter email to search..."
                      value={inviteEmailSearch}
                      onChange={(e) => setInviteEmailSearch(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleInviteFilterChange}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Apply Filters
                    </Button>
                    <Button
                      onClick={clearInviteFilters}
                      variant="outline"
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
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
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Test Results</h2>
              <div className="text-sm text-gray-600">
                {totalResults} total results
              </div>
            </div>

            {/* Filters */}
            <Card className="glass-effect border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="start-date" className="text-sm font-medium">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date" className="text-sm font-medium">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="test-filter" className="text-sm font-medium">Test</Label>
                    <Select value={selectedTestFilter} onValueChange={setSelectedTestFilter}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All tests" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All tests</SelectItem>
                        {tests.map((test) => (
                          <SelectItem key={test.id} value={test.id}>
                            {test.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end space-x-2">
                    <Button onClick={handleFilterChange} className="flex-1">
                      Apply Filters
                    </Button>
                    <Button onClick={clearFilters} variant="outline">
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4">
              {results.map((result, index) => (
                <Card key={index} className="glass-effect border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{result.applicant_name}</h3>
                        <p className="text-sm text-gray-600">{result.test_title}</p>
                        <p className="text-xs text-gray-500">
                          Submitted: {new Date(result.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex flex-col items-end space-y-1">
                          <div className="text-2xl font-bold text-indigo-600">
                            {result.score ? Math.round(result.score) : 0}%
                          </div>
                          <Badge 
                            variant={
                              result.scoring_status === 'auto_only' ? 'secondary' :
                              result.scoring_status === 'needs_review' ? 'destructive' :
                              result.scoring_status === 'partially_reviewed' ? 'default' :
                              'outline'
                            }
                            className="text-xs"
                          >
                            {result.scoring_status === 'auto_only' ? 'Auto-scored' :
                             result.scoring_status === 'needs_review' ? 'Needs Review' :
                             result.scoring_status === 'partially_reviewed' ? 'Partial Review' :
                             'Fully Reviewed'}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => handleViewResultDetails(result)}
                        >
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

            {/* Pagination */}
            {totalPages > 1 && (
              <Card className="glass-effect border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalResults)} of {totalResults} results
                      </span>
                      <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(parseInt(value))}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">per page</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                      >
                        Previous
                      </Button>
                      
                      <div className="flex space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      
                      <Button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        size="sm"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Scoring Tab */}
          <TabsContent value="scoring" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Manual Scoring</h2>
              <Button onClick={fetchScoringQueue} variant="outline" size="sm">
                <AlertCircle className="h-4 w-4 mr-2" />
                Refresh Queue
              </Button>
            </div>

            {!selectedSubmission ? (
              // Scoring Queue View
              <div className="space-y-4">
                {scoringQueue.length === 0 ? (
                  <Card className="glass-effect border-0 shadow-lg">
                    <CardContent className="p-8 text-center">
                      <CheckSquare className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
                      <p className="text-gray-600">No submissions need manual scoring at the moment.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {scoringQueue.map((submission) => (
                      <Card key={submission.submission_id} className="glass-effect border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-semibold text-gray-900">{submission.test_title}</h3>
                                <Badge variant={submission.scoring_status === 'needs_review' ? 'destructive' : 'secondary'}>
                                  {submission.scoring_status === 'needs_review' ? 'New' : 'Partial'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                Applicant: {submission.applicant_email}
                              </p>
                              <p className="text-sm text-gray-500">
                                Submitted: {new Date(submission.submitted_at).toLocaleString()}
                              </p>
                              <div className="flex items-center space-x-4 mt-2 text-sm">
                                <span className="text-blue-600">
                                  {submission.manual_questions} manual questions
                                </span>
                                <span className="text-orange-600">
                                  {submission.pending_reviews} pending reviews
                                </span>
                              </div>
                            </div>
                            <Button
                              onClick={() => {
                                setSelectedSubmission(submission.submission_id);
                                fetchSubmissionDetails(submission.submission_id);
                              }}
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                            >
                              Review & Score
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Submission Scoring View
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={() => {
                      setSelectedSubmission(null);
                      setSubmissionDetails(null);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    ← Back to Queue
                  </Button>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {submissionDetails?.submission?.test_title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {submissionDetails?.submission?.applicant_email}
                    </p>
                  </div>
                </div>

                {scoringLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading submission details...</p>
                  </div>
                ) : submissionDetails ? (
                  <div className="space-y-6">
                    {/* Score Summary */}
                    <Card className="glass-effect border-0 shadow-lg">
                      <CardHeader>
                        <CardTitle>Score Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-sm text-gray-600">Auto Score</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {submissionDetails.submission.auto_score?.toFixed(1) || 0}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Manual Score</p>
                            <p className="text-2xl font-bold text-orange-600">
                              {submissionDetails.submission.manual_score?.toFixed(1) || 'Pending'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Final Score</p>
                            <p className="text-2xl font-bold text-green-600">
                              {submissionDetails.submission.final_score?.toFixed(1) || 0}%
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Answers for Scoring */}
                    <div className="space-y-4">
                      {submissionDetails.answers
                        .filter(answer => ['essay', 'coding'].includes(answer.question_type))
                        .map((answer) => (
                          <ScoringAnswerCard
                            key={answer.id}
                            answer={answer}
                            submissionId={selectedSubmission}
                            onScore={scoreAnswer}
                          />
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Failed to load submission details
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Test Modal */}
      {showCreateTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
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
                <div className="space-y-3 mt-2">
                  {newTest.questions.map((q, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-1">{q.question}</p>
                          <p className="text-sm text-gray-600 capitalize mb-2">
                            {q.type.replace('_', ' ')} • {q.points} points
                          </p>
                          {q.type === 'multiple_choice' && q.options && (
                            <div className="text-xs text-gray-500">
                              <strong>Options:</strong> {q.options.join(', ')}
                            </div>
                          )}
                          {q.correct_answer && (
                            <div className="text-xs text-green-600 mt-1">
                              <strong>Correct Answer:</strong> {q.correct_answer}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingQuestionIndex(index);
                              setCurrentQuestion(q);
                              setShowEditQuestion(true);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeQuestion(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {newTest.questions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No questions added yet</p>
                      <p className="text-sm">Add your first question below</p>
                    </div>
                  )}
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
                  
                  <Button 
                    onClick={addQuestion} 
                    className="w-full"
                    type="button"
                  >
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
                type="button"
              >
                Create Test
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Generate Test Dialog */}
      {showAutoGenerateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold flex items-center">
                <RefreshCw className="h-5 w-5 mr-2 text-emerald-600" />
                Auto Generate Test with AI
              </h2>
              <button
                onClick={() => setShowAutoGenerateDialog(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                disabled={autoGenerateLoading}
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="topic">Topic *</Label>
                <Input
                  id="topic"
                  type="text"
                  value={autoGenerateData.topic}
                  onChange={(e) => setAutoGenerateData({ ...autoGenerateData, topic: e.target.value })}
                  placeholder="e.g., JavaScript, React, Python, Data Structures"
                  className="mt-1"
                  disabled={autoGenerateLoading}
                />
              </div>
              
              <div>
                <Label htmlFor="questionCount">Number of Questions *</Label>
                <Input
                  id="questionCount"
                  type="number"
                  min="1"
                  max="30"
                  value={autoGenerateData.questionCount}
                  onChange={(e) => setAutoGenerateData({ ...autoGenerateData, questionCount: parseInt(e.target.value) || 10 })}
                  className="mt-1"
                  disabled={autoGenerateLoading}
                />
                <p className="text-sm text-gray-500 mt-1">Maximum 30 questions</p>
              </div>
              
              <div>
                <Label htmlFor="level">Difficulty Level *</Label>
                <Select
                  value={autoGenerateData.level}
                  onValueChange={(value) => setAutoGenerateData({ ...autoGenerateData, level: value })}
                  disabled={autoGenerateLoading}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select difficulty level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner - Basic concepts and fundamentals</SelectItem>
                    <SelectItem value="intermediate">Intermediate - Practical applications and moderate complexity</SelectItem>
                    <SelectItem value="advanced">Advanced - Complex scenarios and expert-level knowledge</SelectItem>
                    <SelectItem value="mixed">Mixed - Combination of all difficulty levels</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">Choose the difficulty level for your test questions</p>
              </div>
              
              <div>
                <Label htmlFor="geminiApiKey">Gemini API Key *</Label>
                <Input
                  id="geminiApiKey"
                  type="password"
                  value={autoGenerateData.geminiApiKey}
                  onChange={(e) => setAutoGenerateData({ ...autoGenerateData, geminiApiKey: e.target.value })}
                  placeholder="Enter your Google Gemini API key"
                  className="mt-1"
                  disabled={autoGenerateLoading}
                />
                <p className="text-sm text-blue-600 mt-1">
                  <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">
                    Get your free API key here →
                  </a>
                </p>
              </div>
              
              {autoGenerateLoading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                    <div>
                      <p className="text-blue-800 font-medium">Generating test with AI...</p>
                      <p className="text-blue-600 text-sm">This may take 30-60 seconds</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t bg-gray-50 rounded-b-lg">
              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowAutoGenerateDialog(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={autoGenerateLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAutoGenerateTest}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                  disabled={autoGenerateLoading}
                >
                  {autoGenerateLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </div>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate Test
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Admin Dialog */}
      {showCreateAdminDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold flex items-center">
                <Shield className="h-5 w-5 mr-2 text-green-600" />
                Create New Admin
              </h2>
              <button
                onClick={() => setShowCreateAdminDialog(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="admin-full-name">Full Name *</Label>
                <Input
                  id="admin-full-name"
                  type="text"
                  value={newAdminData.full_name}
                  onChange={(e) => setNewAdminData({ ...newAdminData, full_name: e.target.value })}
                  placeholder="Enter full name"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="admin-email">Email *</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={newAdminData.email}
                  onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                  placeholder="Enter email address"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="admin-password">Password *</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={newAdminData.password}
                  onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                  placeholder="Enter password (min 6 characters)"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">Minimum 6 characters required</p>
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50 rounded-b-lg">
              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowCreateAdminDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={createAdmin}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Create Admin
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Dialog */}
      {showChangePasswordDialog && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold flex items-center">
                <Shield className="h-5 w-5 mr-2 text-blue-600" />
                Change Password
              </h2>
              <button
                onClick={() => {
                  setShowChangePasswordDialog(false);
                  setSelectedAdmin(null);
                  setNewPassword('');
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Admin:</strong> {selectedAdmin.full_name} ({selectedAdmin.email})
                </p>
              </div>
              
              <div>
                <Label htmlFor="new-password">New Password *</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">Minimum 6 characters required</p>
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50 rounded-b-lg">
              <div className="flex space-x-3">
                <Button
                  onClick={() => {
                    setShowChangePasswordDialog(false);
                    setSelectedAdmin(null);
                    setNewPassword('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={changeAdminPassword}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Invite Modal */}
      {showSendInvite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
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

      {/* Edit Test Offcanvas */}
      {showEditTest && editingTest && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => {
              setShowEditTest(false);
              setEditingTest(null);
            }}
          />
          
          {/* Offcanvas Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Edit Test</h2>
              <button
                onClick={() => {
                  setShowEditTest(false);
                  setEditingTest(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-6">
              <div>
                <Label htmlFor="edit-test-title">Test Title</Label>
                <Input
                  id="edit-test-title"
                  value={editingTest.title}
                  onChange={(e) => setEditingTest({ ...editingTest, title: e.target.value })}
                  placeholder="Enter test title"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-test-description">Description</Label>
                <Textarea
                  id="edit-test-description"
                  value={editingTest.description}
                  onChange={(e) => setEditingTest({ ...editingTest, description: e.target.value })}
                  placeholder="Enter test description"
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-test-duration">Duration (minutes)</Label>
                <Input
                  id="edit-test-duration"
                  type="number"
                  value={editingTest.duration_minutes}
                  onChange={(e) => setEditingTest({ ...editingTest, duration_minutes: parseInt(e.target.value) })}
                  min="1"
                  className="mt-1"
                />
              </div>
              
              {/* Questions List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-lg font-medium">Questions ({editingTest.questions.length})</Label>
                  <Button
                    onClick={() => setShowAddQuestionToEdit(true)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Question
                  </Button>
                </div>
                <div className="space-y-3">
                  {editingTest.questions.map((q, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-1">{q.question}</p>
                          <p className="text-sm text-gray-600 capitalize mb-2">
                            {q.type.replace('_', ' ')} • {q.points} points
                          </p>
                          {q.type === 'multiple_choice' && q.options && (
                            <div className="text-xs text-gray-500">
                              <strong>Options:</strong> {q.options.join(', ')}
                            </div>
                          )}
                          {q.correct_answer && (
                            <div className="text-xs text-green-600 mt-1">
                              <strong>Correct Answer:</strong> {q.correct_answer}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingQuestionIndex(index);
                              setCurrentQuestion(q);
                              setShowEditQuestion(true);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const updatedQuestions = editingTest.questions.filter((_, i) => i !== index);
                              setEditingTest({ ...editingTest, questions: updatedQuestions });
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {editingTest.questions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No questions added yet</p>
                      <p className="text-sm">Click "Add Question" to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3">
              <Button
                onClick={() => {
                  setShowEditTest(false);
                  setEditingTest(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateTest}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                Update Test
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Custom Modal for Result Details */}
      {detailsDialogOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[100] bg-black bg-opacity-50"
            onClick={closeResultDetails}
          />
          {/* Modal Content */}
          <div className="fixed left-[50%] top-[50%] z-[100] grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Test Result Details</h2>
                <p className="text-sm text-gray-600">Detailed information about the test submission</p>
              </div>
              <button
                onClick={closeResultDetails}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-2">Loading details...</span>
              </div>
            ) : resultDetails ? (
              <div className="overflow-y-auto max-h-[60vh] space-y-6">
                {/* Test Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Test Information</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-600">Test:</span>
                        <p className="font-medium">{resultDetails.test_title}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Duration:</span>
                        <p className="font-medium">{resultDetails.test_duration_minutes} minutes</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Score:</span>
                        <p className={`font-bold text-lg ${resultDetails.score >= 70 ? 'text-green-600' : resultDetails.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {Math.round(resultDetails.score)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Submission Information</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-600">Started:</span>
                        <p className="font-medium">{new Date(resultDetails.started_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Submitted:</span>
                        <p className="font-medium">{new Date(resultDetails.submitted_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Monitored:</span>
                        <Badge className={resultDetails.is_monitored ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {resultDetails.is_monitored ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Answers */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Questions & Answers</h4>
                  <div className="space-y-4">
                    {resultDetails.answers.map((answer, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-gray-900">
                            Question {index + 1} ({answer.points} {answer.points === 1 ? 'point' : 'points'})
                          </h5>
                          <Badge className={`capitalize ${
                            answer.question_type === 'multiple_choice' ? 'bg-blue-100 text-blue-800' :
                            answer.question_type === 'coding' ? 'bg-purple-100 text-purple-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {answer.question_type.replace('_', ' ')}
                          </Badge>
                        </div>

                        <p className="text-gray-700 mb-3">{answer.question}</p>

                        <div className="bg-gray-50 p-3 rounded">
                          <p className="font-medium text-gray-900 mb-1">Answer:</p>
                          <p className="text-gray-700 whitespace-pre-wrap">{answer.answer}</p>
                        </div>

                        {answer.question_type === 'multiple_choice' && answer.correct_answer && (
                          <div className="mt-2">
                            <p className="font-medium text-gray-900 mb-1">Correct Answer:</p>
                            <p className={`text-sm ${answer.answer === answer.correct_answer ? 'text-green-600' : 'text-red-600'}`}>
                              {answer.correct_answer} {answer.answer === answer.correct_answer ? '✓ Correct' : '✗ Incorrect'}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Failed to load result details
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Question Modal */}
      {showEditQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Edit Question</h2>
              <button
                onClick={() => {
                  setShowEditQuestion(false);
                  setEditingQuestionIndex(null);
                  setCurrentQuestion({
                    type: 'multiple_choice',
                    question: '',
                    options: ['', '', '', ''],
                    correct_answer: '',
                    expected_language: '',
                    points: 1
                  });
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
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
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="essay">Essay</SelectItem>
                    <SelectItem value="coding">Coding</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-question-text">Question</Label>
                <Textarea
                  id="edit-question-text"
                  value={currentQuestion.question}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                  placeholder="Enter your question"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-question-points">Points</Label>
                <Input
                  id="edit-question-points"
                  type="number"
                  min="1"
                  value={currentQuestion.points}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) || 1 })}
                />
              </div>

              {currentQuestion.type === 'multiple_choice' && (
                <>
                  <div>
                    <Label>Options</Label>
                    <div className="space-y-2 mt-2">
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
                    </div>
                  </div>

                  <div>
                    <Label>Correct Answer</Label>
                    <Select
                      value={currentQuestion.correct_answer}
                      onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, correct_answer: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select correct answer" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentQuestion.options.map((option, index) => (
                          option.trim() && (
                            <SelectItem key={index} value={option}>
                              {option}
                            </SelectItem>
                          )
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {currentQuestion.type === 'coding' && (
                <div>
                  <Label htmlFor="edit-expected-language">Expected Language</Label>
                  <Input
                    id="edit-expected-language"
                    value={currentQuestion.expected_language}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, expected_language: e.target.value })}
                    placeholder="e.g., JavaScript, Python, Java"
                  />
                </div>
              )}
            </div>
            
            <div className="p-6 border-t flex space-x-3">
              <Button
                onClick={() => {
                  setShowEditQuestion(false);
                  setEditingQuestionIndex(null);
                  setCurrentQuestion({
                    type: 'multiple_choice',
                    question: '',
                    options: ['', '', '', ''],
                    correct_answer: '',
                    expected_language: '',
                    points: 1
                  });
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={updateQuestion}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                Update Question
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Question to Edit Test Modal */}
      {showAddQuestionToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add Question to Test</h2>
              <button
                onClick={() => {
                  setShowAddQuestionToEdit(false);
                  setCurrentQuestion({
                    type: 'multiple_choice',
                    question: '',
                    options: ['', '', '', ''],
                    correct_answer: '',
                    expected_language: '',
                    points: 1
                  });
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
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
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="essay">Essay</SelectItem>
                    <SelectItem value="coding">Coding</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="add-question-text">Question</Label>
                <Textarea
                  id="add-question-text"
                  value={currentQuestion.question}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                  placeholder="Enter your question"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="add-question-points">Points</Label>
                <Input
                  id="add-question-points"
                  type="number"
                  min="1"
                  value={currentQuestion.points}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) || 1 })}
                />
              </div>

              {currentQuestion.type === 'multiple_choice' && (
                <>
                  <div>
                    <Label>Options</Label>
                    <div className="space-y-2 mt-2">
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
                    </div>
                  </div>

                  <div>
                    <Label>Correct Answer</Label>
                    <Select
                      value={currentQuestion.correct_answer}
                      onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, correct_answer: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select correct answer" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentQuestion.options.map((option, index) => (
                          option.trim() && (
                            <SelectItem key={index} value={option}>
                              {option}
                            </SelectItem>
                          )
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {currentQuestion.type === 'coding' && (
                <div>
                  <Label htmlFor="add-expected-language">Expected Language</Label>
                  <Input
                    id="add-expected-language"
                    value={currentQuestion.expected_language}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, expected_language: e.target.value })}
                    placeholder="e.g., JavaScript, Python, Java"
                  />
                </div>
              )}
            </div>
            
            <div className="p-6 border-t flex space-x-3">
              <Button
                onClick={() => {
                  setShowAddQuestionToEdit(false);
                  setCurrentQuestion({
                    type: 'multiple_choice',
                    question: '',
                    options: ['', '', '', ''],
                    correct_answer: '',
                    expected_language: '',
                    points: 1
                  });
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={addQuestionToEditingTest}
                className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
              >
                Add Question
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Offcanvas */}
      {showSettings && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowSettings(false)}
          />
          
          {/* Settings Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Admin Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <Tabs defaultValue="applicants" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="applicants" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Applicant Management
                  </TabsTrigger>
                  <TabsTrigger value="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Settings
                  </TabsTrigger>
                  <TabsTrigger value="theme" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Theme Settings
                  </TabsTrigger>
                  {user?.role === 'admin' && (
                    <TabsTrigger value="admin-management" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin Management
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Applicant Management Tab */}
                <TabsContent value="applicants" className="space-y-6 mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Manage Applicants</h3>
                    <Button
                      onClick={fetchApplicants}
                      variant="outline"
                      size="sm"
                    >
                      Refresh
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {applicants.map((applicant) => (
                      <Card key={applicant.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {applicant.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{applicant.full_name}</p>
                              <p className="text-sm text-gray-600">{applicant.email}</p>
                              <p className="text-xs text-gray-500">
                                Joined: {new Date(applicant.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={applicant.is_active ? "default" : "secondary"}>
                              {applicant.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Button
                              onClick={() => toggleApplicantStatus(applicant.id, applicant.is_active ? 'active' : 'inactive')}
                              variant="outline"
                              size="sm"
                              className={applicant.is_active ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
                            >
                              {applicant.is_active ? (
                                <>
                                  <UserX className="h-4 w-4 mr-1" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Activate
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => setDeleteApplicantDialog({ 
                                open: true, 
                                applicantId: applicant.id, 
                                applicantName: applicant.full_name,
                                applicantEmail: applicant.email
                              })}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete All Data
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                    {applicants.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>No applicants found</p>
                        <p className="text-sm">Click refresh to load applicants</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Email Settings Tab */}
                <TabsContent value="email" className="space-y-6 mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Email Configuration</h3>
                    <Button
                      onClick={fetchEmailSettings}
                      variant="outline"
                      size="sm"
                    >
                      Load Settings
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtp-host">SMTP Host</Label>
                        <Input
                          id="smtp-host"
                          value={emailSettings.smtpHost}
                          onChange={(e) => setEmailSettings({...emailSettings, smtpHost: e.target.value})}
                          placeholder="smtp.gmail.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtp-port">SMTP Port</Label>
                        <Input
                          id="smtp-port"
                          type="number"
                          value={emailSettings.smtpPort}
                          onChange={(e) => setEmailSettings({...emailSettings, smtpPort: parseInt(e.target.value)})}
                          placeholder="587"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtp-user">SMTP Username</Label>
                        <Input
                          id="smtp-user"
                          value={emailSettings.smtpUser}
                          onChange={(e) => setEmailSettings({...emailSettings, smtpUser: e.target.value})}
                          placeholder="your-email@gmail.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtp-password">SMTP Password</Label>
                        <Input
                          id="smtp-password"
                          type="password"
                          value={emailSettings.smtpPassword}
                          onChange={(e) => setEmailSettings({...emailSettings, smtpPassword: e.target.value})}
                          placeholder="App password or SMTP password"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="from-email">From Email</Label>
                        <Input
                          id="from-email"
                          value={emailSettings.fromEmail}
                          onChange={(e) => setEmailSettings({...emailSettings, fromEmail: e.target.value})}
                          placeholder="noreply@yourcompany.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="from-name">From Name</Label>
                        <Input
                          id="from-name"
                          value={emailSettings.fromName}
                          onChange={(e) => setEmailSettings({...emailSettings, fromName: e.target.value})}
                          placeholder="Interview Platform"
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <div className="space-y-2">
                        <Button
                          onClick={updateEmailSettings}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Save Email Settings
                        </Button>
                        <Button
                          onClick={testEmailSettings}
                          variant="outline"
                          className="w-full"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Test Email
                        </Button>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900">Email Security Tips</h4>
                          <ul className="text-sm text-blue-700 mt-1 space-y-1">
                            <li>• Use app-specific passwords for Gmail/Outlook</li>
                            <li>• Enable 2FA on your email account</li>
                            <li>• Test email settings before going live</li>
                            <li>• Keep SMTP credentials secure</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Theme Settings Tab */}
                <TabsContent value="theme" className="space-y-6 mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Theme Configuration</h3>
                    <Button
                      onClick={fetchThemeSettings}
                      variant="outline"
                      size="sm"
                    >
                      Refresh
                    </Button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="theme-select" className="text-base font-medium">Select Theme</Label>
                      <p className="text-sm text-gray-600 mb-3">Choose a theme for your admin dashboard</p>
                      <Select value={themeSettings.themeName} onValueChange={(value) => setThemeSettings({...themeSettings, themeName: value})}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
                              <span>Light Theme</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="dark">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-gray-800 rounded"></div>
                              <span>Dark Theme</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="modern">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
                              <span>Modern Theme</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="professional">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-gradient-to-r from-gray-600 to-blue-600 rounded"></div>
                              <span>Professional Theme</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="premium">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-gradient-to-r from-yellow-600 to-black rounded"></div>
                              <span>Premium Black Gold</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="classic">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded"></div>
                              <span>Classic Theme</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Theme Preview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { name: 'light', title: 'Light', colors: ['bg-white', 'bg-gray-100', 'bg-blue-500'] },
                        { name: 'dark', title: 'Dark', colors: ['bg-gray-900', 'bg-gray-800', 'bg-blue-400'] },
                        { name: 'modern', title: 'Modern', colors: ['bg-white', 'bg-gradient-to-r from-blue-500 to-purple-500', 'bg-gray-100'] },
                        { name: 'professional', title: 'Professional', colors: ['bg-slate-50', 'bg-gradient-to-r from-gray-600 to-blue-600', 'bg-slate-200'] },
                        { name: 'premium', title: 'Premium Black Gold', colors: ['bg-black', 'bg-gradient-to-r from-yellow-600 to-yellow-800', 'bg-gray-800'] },
                        { name: 'classic', title: 'Classic', colors: ['bg-gradient-to-r from-blue-400 to-purple-400', 'bg-white', 'bg-blue-100'] }
                      ].map((theme) => (
                        <Card 
                          key={theme.name} 
                          className={`cursor-pointer transition-all duration-200 ${
                            themeSettings.themeName === theme.name 
                              ? 'ring-2 ring-blue-500 shadow-lg' 
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => setThemeSettings({...themeSettings, themeName: theme.name})}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-2 mb-3">
                              <div className="flex space-x-1">
                                {theme.colors.map((color, index) => (
                                  <div key={index} className={`w-4 h-4 rounded ${color}`}></div>
                                ))}
                              </div>
                              <span className="font-medium">{theme.title}</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              {theme.name === 'light' && 'Clean and bright interface'}
                              {theme.name === 'dark' && 'Easy on the eyes for long sessions'}
                              {theme.name === 'modern' && 'Contemporary gradient design'}
                              {theme.name === 'professional' && 'Corporate-friendly styling'}
                              {theme.name === 'premium' && 'Luxury black and gold aesthetic'}
                              {theme.name === 'classic' && 'Original glass-morphism design with gradients'}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={updateThemeSettings}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Save Theme Settings
                      </Button>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <CheckSquare className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-900">Theme Information</h4>
                          <ul className="text-sm text-green-700 mt-1 space-y-1">
                            <li>• Theme changes apply immediately</li>
                            <li>• Settings are saved per admin account</li>
                            <li>• Premium themes include enhanced visual effects</li>
                            <li>• Themes affect dashboard colors and styling</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Admin Management Tab - Only visible to first admin */}
                {user?.role === 'admin' && (
                  <TabsContent value="admin-management" className="space-y-6 mt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Admin Management</h3>
                      <div className="flex space-x-2">
                        <Button
                          onClick={checkFirstAdmin}
                          variant="outline"
                          size="sm"
                        >
                          Debug Status
                        </Button>
                        <Button
                          onClick={fetchAdmins}
                          variant="outline"
                          size="sm"
                        >
                          Load Admins
                        </Button>
                        <Button
                          onClick={() => {
                            fetchAdmins();
                            setShowCreateAdminDialog(true);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={!isFirstAdmin}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Admin
                        </Button>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900">Superadmin Privileges</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            As the superadmin, you have exclusive access to create, manage, and delete other admin accounts.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Debug Status */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Debug Information</h4>
                      <div className="text-sm text-gray-700 space-y-1">
                        <p><strong>Is Superadmin:</strong> {isFirstAdmin ? ' Yes' : '❌ No'}</p>
                        <p><strong>Current User:</strong> {user?.email || 'Not loaded'}</p>
                        <p><strong>User Role:</strong> {user?.role || 'Not loaded'}</p>
                        <p><strong>User ID:</strong> {user?.id || 'Not loaded'}</p>
                        <p><strong>Admins Count:</strong> {admins.length}</p>
                        <p><strong>Admins State:</strong> {loadingAdmins ? 'Loading...' : (admins.length > 0 ? 'Loaded' : 'Empty')}</p>
                      </div>
                    </div>

                    {/* Warning for non-first admins */}
                    {!isFirstAdmin && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-red-900">Access Restricted</h4>
                            <p className="text-sm text-red-700 mt-1">
                              Only the superadmin can manage other admin accounts. You can view this tab for debugging purposes.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Admins List */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Current Admins</h4>
                      {loadingAdmins ? (
                        <div className="text-center py-8 text-gray-500">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                          <p>Loading admins...</p>
                        </div>
                      ) : admins.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No admins found. Click "Create Admin" to add the first admin.</p>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {admins.map((admin) => (
                            <Card key={admin.id} className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Shield className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <h5 className="font-medium">{admin.full_name}</h5>
                                      {admin.is_first_admin && (
                                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                          Superadmin
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600">{admin.email}</p>
                                    <p className="text-xs text-gray-500">
                                      Created: {new Date(admin.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {!admin.is_first_admin && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedAdmin(admin);
                                          setShowChangePasswordDialog(true);
                                        }}
                                        disabled={!isFirstAdmin}
                                      >
                                        Change Password
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => deleteAdmin(admin.id, admin.email)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        disabled={!isFirstAdmin}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={deleteDialog.isForce ? "text-red-700" : ""}>
              {deleteDialog.isForce ? (
                <>
                  <AlertTriangle className="h-5 w-5 inline mr-2" />
                  Force Delete Test
                </>
              ) : (
                "Delete Test"
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {deleteDialog.isForce ? (
                <>
                  <p>Are you sure you want to <strong className="text-red-700">force delete</strong> "{deleteDialog.testTitle}"?</p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 font-medium mb-2">⚠️ This will permanently delete:</p>
                    <ul className="text-red-700 text-sm space-y-1 ml-4 list-disc">
                      <li>The test and all its questions</li>
                      <li>All test invitations (including active ones)</li>
                      <li>All test submissions and answers</li>
                      <li>All video monitoring sessions</li>
                      <li>All associated data</li>
                    </ul>
                    <p className="text-red-800 font-medium mt-2">This action cannot be undone!</p>
                  </div>
                </>
              ) : (
                <p>Are you sure you want to delete "{deleteDialog.testTitle}"? This action cannot be undone.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialog({ open: false, testId: null, testTitle: '', isForce: false })}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteTest} 
              className={deleteDialog.isForce ? "bg-red-700 hover:bg-red-800" : "bg-red-600 hover:bg-red-700"}
            >
              {deleteDialog.isForce ? (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Force Delete Everything
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Applicant Confirmation Dialog */}
      <AlertDialog open={deleteApplicantDialog.open} onOpenChange={(open) => setDeleteApplicantDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Applicant Completely</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to <strong>permanently delete</strong> "{deleteApplicantDialog.applicantName}" ({deleteApplicantDialog.applicantEmail})?</p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                <p className="text-red-800 font-medium">⚠️ This action will completely remove:</p>
                <ul className="text-red-700 text-sm mt-1 ml-4 list-disc">
                  <li>User account and profile</li>
                  <li>All test invitations sent to this applicant</li>
                  <li>All test submissions and answers</li>
                  <li>All video monitoring sessions</li>
                  <li>All associated data</li>
                </ul>
                <p className="text-red-800 font-medium mt-2">This action cannot be undone!</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteApplicantDialog({ open: false, applicantId: null, applicantName: '', applicantEmail: '' })}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteApplicantCompletely(deleteApplicantDialog.applicantId)} 
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Scoring Answer Card Component
const ScoringAnswerCard = ({ answer, submissionId, onScore }) => {
  const [selectedScore, setSelectedScore] = useState(answer.manual_score || 0);
  const [scoreStatus, setScoreStatus] = useState(answer.manual_score_status || 'pending');
  const [comments, setComments] = useState(answer.review_comments || '');
  const [isScoring, setIsScoring] = useState(false);

  const handleScore = async (status) => {
    setIsScoring(true);
    try {
      let score = 0;
      if (status === 'correct') {
        score = answer.points;
      } else if (status === 'partial') {
        score = selectedScore;
      } else {
        score = 0;
      }

      await onScore(submissionId, answer.id, {
        score_status: status,
        manual_score: score,
        comments: comments
      });

      setScoreStatus(status);
    } catch (error) {
      console.error('Failed to score answer:', error);
    } finally {
      setIsScoring(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'correct': return 'bg-green-100 text-green-800 border-green-200';
      case 'wrong': return 'bg-red-100 text-red-800 border-red-200';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="glass-effect border-0 shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{answer.question}</CardTitle>
            <div className="flex items-center space-x-4 mt-2">
              <Badge variant="outline" className="text-xs">
                {answer.question_type.toUpperCase()}
              </Badge>
              <span className="text-sm text-gray-600">
                {answer.points} points
              </span>
              {answer.expected_language && (
                <Badge variant="secondary" className="text-xs">
                  {answer.expected_language}
                </Badge>
              )}
            </div>
          </div>
          <Badge className={`${getStatusColor(scoreStatus)} border`}>
            {scoreStatus === 'pending' ? 'Not Scored' : 
             scoreStatus === 'correct' ? 'Correct' :
             scoreStatus === 'wrong' ? 'Wrong' : 'Partial'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Answer Display */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Applicant's Answer:</Label>
          <div className="mt-2 p-4 bg-gray-50 rounded-lg border">
            <pre className="whitespace-pre-wrap text-sm font-mono text-gray-900">
              {answer.answer}
            </pre>
          </div>
        </div>

        {/* Scoring Controls */}
        <div className="border-t pt-4">
          <Label className="text-sm font-medium text-gray-700 mb-3 block">Score this answer:</Label>
          
          <div className="flex flex-wrap gap-3 mb-4">
            <Button
              onClick={() => handleScore('correct')}
              disabled={isScoring}
              variant={scoreStatus === 'correct' ? 'default' : 'outline'}
              className={`${scoreStatus === 'correct' ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50 hover:border-green-300'}`}
            >
              ✓ Correct ({answer.points} pts)
            </Button>
            
            <Button
              onClick={() => handleScore('wrong')}
              disabled={isScoring}
              variant={scoreStatus === 'wrong' ? 'default' : 'outline'}
              className={`${scoreStatus === 'wrong' ? 'bg-red-600 hover:bg-red-700' : 'hover:bg-red-50 hover:border-red-300'}`}
            >
              ✗ Wrong (0 pts)
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => handleScore('partial')}
                disabled={isScoring}
                variant={scoreStatus === 'partial' ? 'default' : 'outline'}
                className={`${scoreStatus === 'partial' ? 'bg-yellow-600 hover:bg-yellow-700' : 'hover:bg-yellow-50 hover:border-yellow-300'}`}
              >
                ⚠ Partial
              </Button>
              <Input
                type="number"
                min="0"
                max={answer.points}
                step="0.5"
                value={selectedScore}
                onChange={(e) => setSelectedScore(parseFloat(e.target.value) || 0)}
                className="w-20"
                placeholder="0"
              />
              <span className="text-sm text-gray-600">/ {answer.points} pts</span>
            </div>
          </div>

          {/* Comments */}
          <div>
            <Label className="text-sm font-medium text-gray-700">Comments (optional):</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add feedback for the applicant..."
              className="mt-2"
              rows={2}
            />
          </div>

          {answer.reviewed_at && (
            <div className="text-xs text-gray-500 mt-2">
              Last reviewed: {new Date(answer.reviewed_at).toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminDashboard;