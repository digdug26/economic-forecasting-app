import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Users, Award, Settings, Plus, Eye, EyeOff, Lock, User, BarChart3, Clock, Target, Trophy, Globe, AlertCircle, Check } from 'lucide-react';
import { supabase, getCurrentUser, isAdmin } from './supabase';

const ForecastingApp = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState('login');
  const [questions, setQuestions] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Initialize app - check auth and load data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        
        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const userData = await getCurrentUser();
          if (userData) {
            setCurrentUser(userData);
            setActiveView('dashboard');
            await loadAppData();
          }
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        setError('Failed to initialize app');
      } finally {
        setLoading(false);
      }
    };

    initializeApp();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const userData = await getCurrentUser();
        if (userData) {
          setCurrentUser(userData);
          setActiveView('dashboard');
          await loadAppData();
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setActiveView('login');
        setQuestions([]);
        setForecasts([]);
        setUsers([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load all app data
  const loadAppData = async () => {
    try {
      const [questionsResult, forecastsResult, usersResult] = await Promise.all([
        supabase.from('questions').select('*').order('created_at', { ascending: false }),
        supabase.from('forecasts').select('*'),
        supabase.from('users').select('*')
      ]);

      if (questionsResult.error) throw questionsResult.error;
      if (forecastsResult.error) throw forecastsResult.error;
      if (usersResult.error) throw usersResult.error;

      setQuestions(questionsResult.data || []);
      setForecasts(forecastsResult.data || []);
      setUsers(usersResult.data || []);
    } catch (error) {
      console.error('Error loading app data:', error);
      setError('Failed to load data');
    }
  };

  // Sample questions
  useEffect(() => {
    const sampleQuestions = [
      {
        id: 1,
        title: "Will the Federal Reserve raise interest rates by June 30, 2025?",
        type: "binary",
        description: "Based on FOMC decisions and official announcements",
        createdDate: "2025-05-01",
        resolvedDate: null,
        resolution: null,
        isResolved: false
      },
      {
        id: 2,
        title: "What will happen to US unemployment rate in July 2025?",
        type: "three-category",
        description: "Compared to June 2025 rate, rounded to nearest tenth of one percent",
        categories: ["Increase", "Remain Unchanged", "Decrease"],
        createdDate: "2025-05-15",
        resolvedDate: null,
        resolution: null,
        isResolved: false
      },
      {
        id: 3,
        title: "Which sector will have the highest GDP growth in Q2 2025?",
        type: "multiple-choice",
        description: "Based on BEA sector-specific GDP data",
        options: ["Technology", "Healthcare", "Financial Services", "Manufacturing", "Energy"],
        createdDate: "2025-05-20",
        resolvedDate: null,
        resolution: null,
        isResolved: false
      }
    ];
    setQuestions(sampleQuestions);
  }, []);

  // Sample news feed
  const newsFeed = [
    { title: "Fed Officials Signal Cautious Approach to Rate Changes", source: "Reuters", url: "#" },
    { title: "Unemployment Claims Drop to Lowest Level This Year", source: "Bloomberg", url: "#" },
    { title: "Q1 GDP Growth Exceeds Expectations at 3.2%", source: "Wall Street Journal", url: "#" },
    { title: "Tech Sector Leads Market Rally Amid AI Optimism", source: "Financial Times", url: "#" }
  ];

 // Authentication functions
  const login = async (email, password) => {
    try {
      setError('');
      
      // Try demo account first (for testing)
      const demoAccounts = [
        { email: 'admin@company.com', password: 'admin123', role: 'admin', name: 'Demo Admin' },
        { email: 'forecaster1@company.com', password: 'forecast123', role: 'forecaster', name: 'Demo Forecaster 1' },
        { email: 'forecaster2@company.com', password: 'forecast123', role: 'forecaster', name: 'Demo Forecaster 2' }
      ];
      
      const demoUser = demoAccounts.find(u => u.email === email && u.password === password);
      if (demoUser) {
        // Create a demo user object that matches our database structure
        const demoUserData = {
          id: `demo-${demoUser.role}`,
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.role,
          must_change_password: false
        };
        setCurrentUser(demoUserData);
        setActiveView('dashboard');
        await loadAppData();
        return true;
      }

      // Try Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setError(error.message);
        return false;
      }

      // User data will be set by the auth state change listener
      return true;
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
      return false;
    }
  };

  const logout = async () => {
    try {
      // Handle demo users
      if (currentUser?.id?.startsWith('demo-')) {
        setCurrentUser(null);
        setActiveView('login');
        return;
      }

      await supabase.auth.signOut();
      // Cleanup will be handled by the auth state change listener
    } catch (error) {
      console.error('Logout error:', error);
      setError('Logout failed');
    }
  };

  const createUser = async (userData) => {
    console.log('createUser called with:', userData);
    console.log('Current user role:', currentUser.role);
    
    try {
      setError('');
      
      // Check if current user is admin
      if (currentUser.role !== 'admin') {
        setError('Only admins can create users');
        return false;
      }
      
      // Call our database function to create the user
      const { data, error } = await supabase.rpc('create_new_user', {
        user_email: userData.email,
        user_password: userData.password,
        user_name: userData.name,
        user_role: userData.role
      });

      if (error) throw error;

      // Check if the function returned an error
      if (!data.success) {
        setError(data.error);
        return false;
      }

      await loadAppData(); // Refresh users list
      return true;
    } catch (error) {
      console.error('Create user error:', error);
      setError(error.message);
      return false;
    }
  };

  const resetPassword = async (email) => {
    try {
      setError('');
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });

      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Reset password error:', error);
      setError(error.message);
      return false;
    }
  };
  







  // Data manipulation functions
  const createQuestion = async (questionData) => {
    try {
      setError('');
      
      // Check if current user is admin before allowing question creation
      if (currentUser.role !== 'admin') {
        setError('Only admins can create questions');
        return false;
      }
      
      const { data, error } = await supabase
        .from('questions')
        .insert([{
          title: questionData.title,
          description: questionData.description,
          type: questionData.type,
          categories: questionData.type === 'three-category' ? questionData.categories : null,
          options: questionData.type === 'multiple-choice' ? questionData.options : null,
          created_by: currentUser.id
        }])
        .select();

      if (error) throw error;

      await loadAppData(); // Refresh questions list
      return true;
    } catch (error) {
      console.error('Create question error:', error);
      setError(error.message);
      return false;
    }
  };

  const resolveQuestion = async (questionId, resolution) => {
    try {
      setError('');
      
      // Check if current user is admin before allowing question resolution
      if (currentUser.role !== 'admin') {
        setError('Only admins can resolve questions');
        return false;
      }
      
      const { data, error } = await supabase
        .from('questions')
        .update({
          is_resolved: true,
          resolution: resolution,
          resolved_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', questionId)
        .select();

      if (error) throw error;

      await loadAppData(); // Refresh questions list
      return true;
    } catch (error) {
      console.error('Resolve question error:', error);
      setError(error.message);
      return false;
    }
  };

 // Calculation functions (mostly unchanged)
 const calculateBrierScore = (forecast, resolution, questionType) => {
    if (questionType === 'binary') {
      const p = forecast.probability / 100;
      const outcome = resolution ? 1 : 0;
      return Math.pow(p - outcome, 2) + Math.pow((1-p) - (1-outcome), 2);
    } else if (questionType === 'three-category') {
      const probs = [
        forecast.increase / 100,
        forecast.unchanged / 100,
        forecast.decrease / 100
      ];
      const outcomes = [0, 0, 0];
      if (resolution === 'increase') outcomes[0] = 1;
      else if (resolution === 'unchanged') outcomes[1] = 1;
      else if (resolution === 'decrease') outcomes[2] = 1;
      
      return probs.reduce((sum, prob, i) => sum + Math.pow(prob - outcomes[i], 2), 0);
    }
    return 0;
  };

  const getUserStats = (userId) => {
    const userForecasts = forecasts.filter(f => f.user_id === userId);
    const resolvedQuestions = questions.filter(q => q.is_resolved);
    const userResolvedForecasts = userForecasts.filter(f => 
      resolvedQuestions.some(q => q.id === f.question_id)
    );

    if (userResolvedForecasts.length === 0) {
      return { brierScore: 0, questionsAnswered: 0, accuracy: 0 };
    }

    let totalBrierScore = 0;
    let correctPredictions = 0;

    userResolvedForecasts.forEach(forecast => {
      const question = resolvedQuestions.find(q => q.id === forecast.question_id);
      if (question) {
        const brierScore = calculateBrierScore(forecast.forecast, question.resolution, question.type);
        totalBrierScore += brierScore;
        
        if (question.type === 'binary') {
          const predicted = forecast.forecast.probability > 50;
          const actual = question.resolution;
          if (predicted === actual) correctPredictions++;
        }
      }
    });

    return {
      brierScore: (totalBrierScore / userResolvedForecasts.length).toFixed(3),
      questionsAnswered: userResolvedForecasts.length,
      accuracy: userResolvedForecasts.length > 0 ? ((correctPredictions / userResolvedForecasts.length) * 100).toFixed(1) : 0
    };
  };

  const getLeaderboard = () => {
    return users
      .filter(u => u.role === 'forecaster')
      .map(user => ({
        ...user,
        stats: getUserStats(user.id)
      }))
      .sort((a, b) => parseFloat(a.stats.brierScore) - parseFloat(b.stats.brierScore));
  };
  
  const onSubmitForecast = async (questionId, forecastVector) => {
    try {
      // Clear any previous error message
      setError('');
  
      // 1️⃣ Insert or upsert the forecast into the `forecasts` table
      //    We use upsert so that if the user already has a forecast for this question,
      //    it overwrites rather than creating a duplicate.
      const { error } = await supabase
        .from('forecasts')
        .upsert(
          {
            question_id: questionId,
            user_id: currentUser.id,
            forecast: forecastVector,
            updated_at: new Date().toISOString()
          },
          { onConflict: ['user_id', 'question_id'] }
        );
  
      if (error) {
        throw error;
      }
  
      // 2️⃣ Reload all app data (questions, forecasts, users, etc.)
      //    so the UI (like your leaderboard or dashboard) reflects the new forecast immediately.
      await loadAppData();
  
      return true;
    } catch (e) {
      console.error('Submit forecast failed:', e);
      setError(e.message || 'Submit failed');
      return false;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!currentUser) {
    return <LoginScreen onLogin={login} onResetPassword={resetPassword} error={error} />;
  }

  // Show login screen if not authenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button 
                onClick={() => setError('')}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-slate-900">Economic Forecasting Platform</h1>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-4">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${activeView === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveView('questions')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${activeView === 'questions' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Questions
                </button>
                <button
                  onClick={() => setActiveView('leaderboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${activeView === 'leaderboard' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Leaderboard
                </button>
                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => setActiveView('admin')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${activeView === 'admin' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Admin
                  </button>
                )}
              </nav>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-slate-400" />
                <span className="text-sm text-slate-700">{currentUser.name}</span>
                {currentUser.id?.startsWith('demo-') && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Demo</span>
                )}
                <button
                  onClick={logout}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeView === 'dashboard' && (
          <DashboardView 
            currentUser={currentUser}
            questions={questions}
            forecasts={forecasts}
            getUserStats={getUserStats}
            newsFeed={newsFeed}
          />
        )}
        {activeView === 'questions' && (
          <QuestionsView 
            questions={questions}
            forecasts={forecasts}
            currentUser={currentUser}
            onSubmitForecast={onSubmitForecast }
          />
        )}
        {activeView === 'leaderboard' && (
          <LeaderboardView leaderboard={getLeaderboard()} />
        )}
        {activeView === 'admin' && currentUser.role === 'admin' && (
          <AdminView 
            questions={questions}
            users={users}
            onCreateQuestion={createQuestion}
            onCreateUser={createUser}
            onResolveQuestion={resolveQuestion}
            forecasts={forecasts}
          />
        )}
      </main>
    </div>
  );
};

const LoginScreen = ({ onLogin, onResetPassword, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await onLogin(email, password);
    setLoading(false);
    if (!success) {
      // Error is handled by parent component
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await onResetPassword(email);
    setLoading(false);
    if (success) {
      setResetSuccess(true);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <TrendingUp className="mx-auto h-12 w-12 text-blue-600" />
            <h2 className="mt-6 text-3xl font-bold text-gray-900">Reset Password</h2>
            <p className="mt-2 text-sm text-gray-600">Enter your email to receive reset instructions</p>
          </div>
          
          {resetSuccess ? (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-center">
                <Check className="mx-auto h-12 w-12 text-green-600" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Check your email</h3>
                <p className="mt-2 text-sm text-gray-600">
                  We've sent password reset instructions to your email address.
                </p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSuccess(false);
                  }}
                  className="mt-4 text-blue-600 hover:text-blue-800 underline"
                >
                  Back to Login
                </button>
              </div>
            </div>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Email'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="mt-2 w-full text-sm text-gray-600 hover:text-gray-800"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Economic Forecasting Platform</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to start forecasting</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Password"
                  required
                />
              </div>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="mt-2 w-full text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Forgot Password?
            </button>
            <div className="mt-4 text-xs text-gray-500">
              <p><strong>Demo Accounts (for testing):</strong></p>
              <p>Admin: admin@company.com / admin123</p>
              <p>Forecaster: forecaster1@company.com / forecast123</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const DashboardView = ({ currentUser, questions, forecasts, getUserStats, newsFeed }) => {
  const stats = getUserStats(currentUser.id);
  const activeQuestions = questions.filter(q => !q.isResolved);
  const userForecasts = forecasts.filter(f => f.userId === currentUser.id);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center">
            <Target className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Brier Score</p>
              <p className="text-2xl font-bold text-slate-900">{stats.brierScore}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Accuracy</p>
              <p className="text-2xl font-bold text-slate-900">{stats.accuracy}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Questions Answered</p>
              <p className="text-2xl font-bold text-slate-900">{stats.questionsAnswered}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center">
            <Trophy className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Active Questions</p>
              <p className="text-2xl font-bold text-slate-900">{activeQuestions.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-medium text-slate-900">Recent Questions</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {activeQuestions.slice(0, 5).map(question => {
                  const userForecast = userForecasts.find(f => f.questionId === question.id);
                  return (
                    <div key={question.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{question.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{question.description}</p>
                        <div className="flex items-center mt-2 text-xs text-slate-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          Created {question.createdDate}
                        </div>
                      </div>
                      <div className="ml-4">
                        {userForecast ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Forecast Submitted
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center">
              <Globe className="h-5 w-5 text-slate-400 mr-2" />
              <h3 className="text-lg font-medium text-slate-900">Economic News</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {newsFeed.map((item, index) => (
                <div key={index} className="border-b border-slate-100 pb-3 last:border-b-0">
                  <a href={item.url} className="text-sm font-medium text-slate-900 hover:text-blue-600 line-clamp-2">
                    {item.title}
                  </a>
                  <p className="text-xs text-slate-500 mt-1">{item.source}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuestionsView = ({ questions, forecasts, currentUser, onSubmitForecast }) => {
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [filter, setFilter] = useState('active');

  const filteredQuestions = questions.filter(q => 
    filter === 'active' ? !q.isResolved : q.isResolved
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Questions</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'active' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-slate-700 border border-slate-300'
            }`}
          >
            Active ({questions.filter(q => !q.isResolved).length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'resolved' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-slate-700 border border-slate-300'
            }`}
          >
            Resolved ({questions.filter(q => q.isResolved).length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {filteredQuestions.map(question => (
            <QuestionCard
              key={question.id}
              question={question}
              forecasts={forecasts}
              currentUser={currentUser}
              onSelect={() => setSelectedQuestion(question)}
              isSelected={selectedQuestion?.id === question.id}
            />
          ))}
        </div>
        <div>
          {selectedQuestion && (
            <ForecastForm
              question={selectedQuestion}
              forecasts={forecasts}
              currentUser={currentUser}
              onSubmitForecast={onSubmitForecast}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const QuestionCard = ({ question, forecasts, currentUser, onSelect, isSelected }) => {
  const userForecast = forecasts.find(f => f.questionId === question.id && f.userId === currentUser.id);
  
  return (
    <div 
      className={`bg-white p-6 rounded-lg shadow-sm border cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-200' : 'border-slate-200 hover:border-slate-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-slate-900 mb-2">{question.title}</h3>
          <p className="text-sm text-slate-600 mb-3">{question.description}</p>
          <div className="flex items-center space-x-4 text-xs text-slate-500">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {question.createdDate}
            </div>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              question.type === 'binary' ? 'bg-blue-100 text-blue-800' :
              question.type === 'three-category' ? 'bg-green-100 text-green-800' :
              'bg-purple-100 text-purple-800'
            }`}>
              {question.type.replace('-', ' ')}
            </span>
          </div>
        </div>
        <div className="ml-4">
          {question.isResolved ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <Lock className="h-3 w-3 mr-1" />
              Resolved
            </span>
          ) : userForecast ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Forecasted
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Open
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const ForecastForm = ({ question, forecasts, currentUser, onSubmitForecast }) => {
  const existingForecast = forecasts.find(f => f.questionId === question.id && f.userId === currentUser.id);
  
  const [forecast, setForecast] = useState(() => {
    if (existingForecast) {
      return existingForecast.forecast;
    }
    if (question.type === 'binary') {
      return { probability: 50 };
    } else if (question.type === 'three-category') {
      return { increase: 33, unchanged: 34, decrease: 33 };
    } else if (question.type === 'multiple-choice') {
      const evenSplit = Math.floor(100 / question.options.length);
      const remainder = 100 - (evenSplit * question.options.length);
      const initial = {};
      question.options.forEach((option, index) => {
        initial[option] = index === 0 ? evenSplit + remainder : evenSplit;
      });
      return initial;
    }
    return {};
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmitForecast(question.id, forecast);
  };

  if (question.isResolved) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-lg font-medium text-slate-900 mb-4">Question Resolved</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Resolution:</p>
          <p className="font-medium text-gray-900">{String(question.resolution)}</p>
          <p className="text-xs text-gray-500 mt-2">Resolved on {question.resolvedDate}</p>
        </div>
        {existingForecast && (
          <div className="mt-4 bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 mb-2">Your Forecast:</p>
            {question.type === 'binary' && (
              <p className="font-medium text-blue-900">{existingForecast.forecast.probability}%</p>
            )}
            {question.type === 'three-category' && (
              <div className="space-y-1">
                <p className="text-sm">Increase: {existingForecast.forecast.increase}%</p>
                <p className="text-sm">Unchanged: {existingForecast.forecast.unchanged}%</p>
                <p className="text-sm">Decrease: {existingForecast.forecast.decrease}%</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h3 className="text-lg font-medium text-slate-900 mb-4">
        {existingForecast ? 'Update Forecast' : 'Make Forecast'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {question.type === 'binary' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Probability (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={forecast.probability}
              onChange={(e) => setForecast({ probability: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {question.type === 'three-category' && (
          <div className="space-y-3">
            {question.categories.map((category, index) => {
              const key = category.toLowerCase();
              return (
                <div key={category}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {category} (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={forecast[key]}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value) || 0;
                      setForecast({ ...forecast, [key]: newValue });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              );
            })}
            <div className="text-sm text-slate-600">
              Total: {Object.values(forecast).reduce((sum, val) => sum + (val || 0), 0)}%
            </div>
          </div>
        )}

        {question.type === 'multiple-choice' && (
          <div className="space-y-3">
            {question.options.map(option => (
              <div key={option}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {option} (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={forecast[option] || 0}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    setForecast({ ...forecast, [option]: newValue });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
            <div className="text-sm text-slate-600">
              Total: {Object.values(forecast).reduce((sum, val) => sum + (val || 0), 0)}%
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {existingForecast ? 'Update Forecast' : 'Submit Forecast'}
        </button>
      </form>

      {existingForecast && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-600">
            Last updated: {new Date(existingForecast.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};

const LeaderboardView = ({ leaderboard }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Leaderboard</h2>
      
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-medium text-slate-900">Forecaster Rankings</h3>
          <p className="text-sm text-slate-600 mt-1">Ranked by Brier Score (lower is better)</p>
        </div>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Forecaster
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Brier Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Accuracy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Questions Answered
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {leaderboard.map((user, index) => (
                <tr key={user.id} className={index < 3 ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {index === 0 && <Trophy className="h-5 w-5 text-yellow-500 mr-2" />}
                      {index === 1 && <Award className="h-5 w-5 text-gray-400 mr-2" />}
                      {index === 2 && <Award className="h-5 w-5 text-amber-600 mr-2" />}
                      <span className="text-sm font-medium text-slate-900">#{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{user.name}</div>
                    <div className="text-sm text-slate-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-900">{user.stats.brierScore}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-900">{user.stats.accuracy}%</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-900">{user.stats.questionsAnswered}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">About the Scoring System</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Brier Score:</strong> Measures forecast accuracy. Lower scores are better (0 = perfect, 2 = worst possible).</p>
          <p><strong>Calculation:</strong> For each forecast, we calculate the squared difference between your prediction and the actual outcome, then average across all your forecasts.</p>
          <p><strong>Example:</strong> If you forecast 70% for an event that happened, your Brier score for that question would be (1-0.7)² + (0-0.3)² = 0.18</p>
        </div>
      </div>
    </div>
  );
};

const AdminView = ({ questions, users, onCreateQuestion, onCreateUser, onResolveQuestion, forecasts }) => {
  const [activeTab, setActiveTab] = useState('create');
  const [newQuestion, setNewQuestion] = useState({
    title: '',
    description: '',
    type: 'binary',
    categories: ['Increase', 'Remain Unchanged', 'Decrease'],
    options: ['Option A', 'Option B', 'Option C']
  });
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'forecaster'
  });
  const [showCreateUser, setShowCreateUser] = useState(false);

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    const success = await onCreateQuestion(newQuestion);
    if (success) {
      setNewQuestion({
        title: '',
        description: '',
        type: 'binary',
        categories: ['Increase', 'Remain Unchanged', 'Decrease'],
        options: ['Option A', 'Option B', 'Option C']
      });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const success = await onCreateUser(newUser);
    if (success) {
      setNewUser({
        email: '',
        password: '',
        name: '',
        role: 'forecaster'
      });
      setShowCreateUser(false);
    }
  };

  const handleResolveQuestion = async (questionId, resolution) => {
    await onResolveQuestion(questionId, resolution);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Admin Panel</h2>
        <button
          onClick={() => setShowCreateUser(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <Plus className="h-4 w-4 inline mr-2" />
          Create User
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('create')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'create'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Create Question
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Manage Questions
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Manage Users
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Analytics
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'create' && (
            <form onSubmit={handleCreateQuestion} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Question Title
                </label>
                <input
                  type="text"
                  value={newQuestion.title}
                  onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Will the Federal Reserve raise interest rates by June 30, 2025?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newQuestion.description}
                  onChange={(e) => setNewQuestion({ ...newQuestion, description: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Provide additional context, resolution criteria, data sources, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Question Type
                </label>
                <select
                  value={newQuestion.type}
                  onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="binary">Binary (Yes/No)</option>
                  <option value="three-category">Three Category (Increase/Unchanged/Decrease)</option>
                  <option value="multiple-choice">Multiple Choice</option>
                </select>
              </div>

              {newQuestion.type === 'three-category' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Categories
                  </label>
                  <div className="space-y-2">
                    {newQuestion.categories.map((category, index) => (
                      <input
                        key={index}
                        type="text"
                        value={category}
                        onChange={(e) => {
                          const newCategories = [...newQuestion.categories];
                          newCategories[index] = e.target.value;
                          setNewQuestion({ ...newQuestion, categories: newCategories });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    ))}
                  </div>
                </div>
              )}

              {newQuestion.type === 'multiple-choice' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Options
                  </label>
                  <div className="space-y-2">
                    {newQuestion.options.map((option, index) => (
                      <div key={index} className="flex space-x-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...newQuestion.options];
                            newOptions[index] = e.target.value;
                            setNewQuestion({ ...newQuestion, options: newOptions });
                          }}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        {newQuestion.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newOptions = newQuestion.options.filter((_, i) => i !== index);
                              setNewQuestion({ ...newQuestion, options: newOptions });
                            }}
                            className="px-3 py-2 text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setNewQuestion({
                          ...newQuestion,
                          options: [...newQuestion.options, `Option ${String.fromCharCode(65 + newQuestion.options.length)}`]
                        });
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add Option
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Create Question
              </button>
            </form>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900">Question Management</h3>
              {questions.map(question => (
                <QuestionManagementCard
                  key={question.id}
                  question={question}
                  forecasts={forecasts}
                  onResolve={handleResolveQuestion}
                />
              ))}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900">User Management</h3>
              <div className="bg-slate-50 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{user.name}</div>
                            <div className="text-sm text-slate-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.must_change_password ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Must Change Password
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-slate-900">Platform Analytics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600">Total Questions</p>
                  <p className="text-2xl font-bold text-slate-900">{questions.length}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600">Active Questions</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {questions.filter(q => !q.is_resolved).length}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600">Total Users</p>
                  <p className="text-2xl font-bold text-slate-900">{users.length}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600">Total Forecasts</p>
                  <p className="text-2xl font-bold text-slate-900">{forecasts.length}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-3">Recent Activity</h4>
                <div className="space-y-2">
                  {forecasts.slice(-5).reverse().map((forecast, index) => {
                    const question = questions.find(q => q.id === forecast.question_id);
                    const user = users.find(u => u.id === forecast.user_id);
                    return (
                      <div key={index} className="text-sm text-slate-600">
                        {user?.name} submitted forecast for "{question?.title}" on{' '}
                        {new Date(forecast.created_at).toLocaleDateString()}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New User</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Temporary Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  minLength="6"
                />
                <p className="text-xs text-gray-500 mt-1">User will be required to change this on first login</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="forecaster">Forecaster</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Create User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateUser(false);
                    setNewUser({ email: '', password: '', name: '', role: 'forecaster' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const QuestionManagementCard = ({ question, forecasts, onResolve }) => {
  const [showResolve, setShowResolve] = useState(false);
  const [resolution, setResolution] = useState('');
  const questionForecasts = forecasts.filter(f => f.questionId === question.id);

  const handleResolve = () => {
    if (resolution) {
      onResolve(question.id, resolution);
      setShowResolve(false);
      setResolution('');
    }
  };

  return (
    <div className="bg-slate-50 p-4 rounded-lg">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-medium text-slate-900">{question.title}</h4>
          <p className="text-sm text-slate-600 mt-1">{question.description}</p>
          <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
            <span>Type: {question.type}</span>
            <span>Created: {question.createdDate}</span>
            <span>Forecasts: {questionForecasts.length}</span>
          </div>
        </div>
        <div className="ml-4">
          {question.isResolved ? (
            <div className="text-right">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Resolved
              </span>
              <p className="text-xs text-slate-500 mt-1">Result: {String(question.resolution)}</p>
            </div>
          ) : (
            <button
              onClick={() => setShowResolve(!showResolve)}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              Resolve
            </button>
          )}
        </div>
      </div>

      {showResolve && !question.isResolved && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <h5 className="text-sm font-medium text-slate-700 mb-2">Resolve Question</h5>
          
          {question.type === 'binary' && (
            <div className="flex space-x-2">
              <button
                onClick={() => setResolution(true)}
                className={`px-3 py-1 rounded text-sm ${
                  resolution === true ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => setResolution(false)}
                className={`px-3 py-1 rounded text-sm ${
                  resolution === false ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                No
              </button>
            </div>
          )}

          {question.type === 'three-category' && (
            <div className="flex space-x-2">
              {question.categories.map(category => (
                <button
                  key={category}
                  onClick={() => setResolution(category.toLowerCase())}
                  className={`px-3 py-1 rounded text-sm ${
                    resolution === category.toLowerCase() ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          {question.type === 'multiple-choice' && (
            <div className="space-y-1">
              {question.options.map(option => (
                <button
                  key={option}
                  onClick={() => setResolution(option)}
                  className={`block w-full text-left px-3 py-1 rounded text-sm ${
                    resolution === option ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {resolution && (
            <button
              onClick={handleResolve}
              className="mt-2 bg-green-600 text-white px-4 py-1 rounded text-sm hover:bg-green-700"
            >
              Confirm Resolution
            </button>
          )}
        </div>
      )}
    </div>
  );
};

function App() {
  return <ForecastingApp />;
}

export default App;