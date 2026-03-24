import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaUser, FaEnvelope, FaLock, FaPhone } from 'react-icons/fa';
import { login, register, googleAuth } from '../services/api';
import './AuthPage.css';

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  // Register state
  const [registerData, setRegisterData] = useState({ 
    username: '', 
    email: '', 
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    role: 'cashier'
  });
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const googleActionRef = useRef('login');
  const googleLoginBtnRef = useRef(null);
  const googleRegisterBtnRef = useRef(null);

  // CORRECTED: Backend URL set to 5000
  const backendUrl = 'http://localhost:5000';
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const form = searchParams.get('form');
    setIsLogin(form !== 'register');
    
    // Clear forms when component mounts or URL changes
    setLoginData({ username: '', password: '' });
    setRegisterData({ 
      username: '', 
      email: '', 
      password: '',
      confirmPassword: '',
      full_name: '',
      phone: '',
      role: 'cashier'
    });
    setError('');
    setSuccess('');
  }, [searchParams]);

  useEffect(() => {
    if (!googleClientId) {
      setGoogleReady(false);
      return;
    }

    const existingScript = document.getElementById('google-identity-script');
    if (existingScript && window.google?.accounts?.id) {
      setGoogleReady(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(Boolean(window.google?.accounts?.id));
    script.onerror = () => setGoogleReady(false);
    document.body.appendChild(script);
  }, [googleClientId]);

  // Render Google buttons when SDK is ready or form switches
  useEffect(() => {
    if (!googleReady || !googleClientId || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (credentialResponse) => {
        handleGoogleCredential(credentialResponse, googleActionRef.current);
      }
    });

    // Render login button
    if (googleLoginBtnRef.current) {
      googleLoginBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleLoginBtnRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 280
      });
    }

    // Render register button
    if (googleRegisterBtnRef.current) {
      googleRegisterBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleRegisterBtnRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signup_with',
        shape: 'rectangular',
        width: 280
      });
    }
  }, [googleReady, googleClientId, isLogin]);

  const handleGoogleCredential = async (credentialResponse, action) => {
    if (!credentialResponse?.credential) {
      setError('Google authentication failed. Please try again.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await googleAuth({
        credential: credentialResponse.credential,
        action,
        role: action === 'register' ? registerData.role : undefined,
        phone: action === 'register' ? registerData.phone : undefined
      });

      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));

      setSuccess(
        action === 'register'
          ? 'Google registration successful! Redirecting...'
          : 'Google login successful! Redirecting...'
      );

      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.request) {
        setError(`Cannot connect to server at ${backendUrl}. Please check if Flask server is running.`);
      } else {
        setError('Google authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleForm = (type) => {
    setIsLogin(type === 'login');
    setSearchParams({ form: type });
    setError('');
    setSuccess('');
    
    // Clear form data when switching forms
    if (type === 'login') {
      setLoginData({ username: '', password: '' });
      setShowLoginPwd(false);
    } else {
      setRegisterData({ 
        username: '', 
        email: '', 
        password: '',
        confirmPassword: '',
        full_name: '',
        phone: '',
        role: 'cashier'
      });
      setShowRegPwd(false);
      setShowConfirmPwd(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    if (!loginData.username || !loginData.password) {
      setError('Please enter both username and password');
      setLoading(false);
      return;
    }

    try {
      console.log('Logging in with:', loginData);
      
      const response = await login(loginData);
      console.log('Login response:', response);
      
      // Store user data
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setSuccess(`Welcome back, ${response.user.full_name}! Redirecting...`);
      
      // Show success message and redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);

    } catch (err) {
      console.error('Login failed:', err);
      
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.request) {
        setError(`Cannot connect to server at ${backendUrl}. Please check if Flask server is running.`);
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate passwords match
    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Basic validation
    if (!registerData.username || !registerData.email || !registerData.password || 
        !registerData.full_name || !registerData.phone) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      // Prepare registration data - match your backend schema
      const registrationData = {
        username: registerData.username,
        email: registerData.email,
        password: registerData.password,
        full_name: registerData.full_name,
        phone: registerData.phone,
        role: registerData.role
      };
      
      console.log('Sending registration data:', registrationData);
      
      const response = await register(registrationData);
      
      setSuccess(`Registered successfully as ${registerData.role}! Please log in.`);
      
      // Store token if provided (auto-login after registration)
      if (response.access_token) {
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // If token is provided, redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        // If no token (requires manual login), switch to login form
        setTimeout(() => {
          toggleForm('login');
        }, 2000);
      }
      
      // Reset form
      setRegisterData({ 
        username: '', 
        email: '', 
        password: '',
        confirmPassword: '',
        full_name: '',
        phone: '',
        role: 'cashier'
      });
      
    } catch (err) {
      console.error('Registration failed:', err);
      
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.request) {
        setError(`Cannot connect to server at ${backendUrl}. Please check if Flask server is running.`);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterInputChange = (e) => {
    setRegisterData({ 
      ...registerData, 
      [e.target.name]: e.target.value 
    });
  };

  const handleForgotPassword = () => {
    alert('Forgot password feature coming soon!');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="pt-16">
        <h1 className="text-center text-3xl font-bold text-gray-800">HNj Store</h1>
        <p className="text-center text-gray-600 mt-2">Inventory Management System</p>
      </div>

      {/* Main Auth Content - Fixed structure */}
      <div className="flex-grow">
        <div className="auth-container">
          <div className={`form-container ${isLogin ? '' : 'right-panel-active'}`}>

            {/* ---------- MOBILE TAB SWITCHER (hidden on desktop) ---------- */}
            <div className="mobile-auth-tabs">
              <button
                type="button"
                className={`mobile-tab ${isLogin ? 'active' : ''}`}
                onClick={() => toggleForm('login')}
                disabled={loading}
              >
                Login
              </button>
              <button
                type="button"
                className={`mobile-tab ${!isLogin ? 'active' : ''}`}
                onClick={() => toggleForm('register')}
                disabled={loading}
              >
                Register
              </button>
            </div>

            {/* ---------- LOGIN FORM ---------- */}
            <form className="form login-form" onSubmit={handleLogin}>
              <h2>Login</h2>
              <p className="form-subtitle">Welcome back to HNj Store!</p>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <div className="field-group">
                <label className="field-label">Username</label>
                <div className="input-wrapper">
                  <FaUser className="input-icon" />
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Password</label>
                <div className="password-wrapper">
                  <FaLock className="input-icon" />
                  <input
                    type={showLoginPwd ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    disabled={loading}
                  />
                  <span
                    className="password-toggle"
                    onClick={() => setShowLoginPwd(!showLoginPwd)}
                  >
                    {showLoginPwd ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>

              <button type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <button 
                type="button" 
                className="forgot-password" 
                onClick={handleForgotPassword}
                disabled={loading}
              >
                Forgot Password?
              </button>

              <div className="social-login">
                <p>or continue with</p>
                <div
                  ref={googleLoginBtnRef}
                  onClick={() => { googleActionRef.current = 'login'; }}
                  className="google-btn-container"
                />
                {!googleReady && googleClientId && (
                  <p className="text-xs text-gray-400 mt-2">Loading Google Sign-In...</p>
                )}
              </div>

            </form>

            {/* ---------- REGISTER FORM ---------- */}
            <form className="form register-form" onSubmit={handleRegister}>
              <h2>Register</h2>
              <p className="form-subtitle">Create your HNj Store account</p>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <div className="field-group">
                <label className="field-label">Full Name</label>
                <div className="input-wrapper">
                  <FaUser className="input-icon" />
                  <input
                    type="text"
                    name="full_name"
                    placeholder="Enter your full name"
                    value={registerData.full_name}
                    onChange={handleRegisterInputChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Username</label>
                <div className="input-wrapper">
                  <FaUser className="input-icon" />
                  <input
                    type="text"
                    name="username"
                    placeholder="Choose a username"
                    value={registerData.username}
                    onChange={handleRegisterInputChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Email</label>
                <div className="input-wrapper">
                  <FaEnvelope className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={registerData.email}
                    onChange={handleRegisterInputChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Phone Number</label>
                <div className="input-wrapper">
                  <FaPhone className="input-icon" />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="0712345678"
                    value={registerData.phone}
                    onChange={handleRegisterInputChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Password</label>
                <div className="password-wrapper">
                  <FaLock className="input-icon" />
                  <input
                    type={showRegPwd ? 'text' : 'password'}
                    name="password"
                    placeholder="Create a password"
                    value={registerData.password}
                    onChange={handleRegisterInputChange}
                    required
                    disabled={loading}
                  />
                  <span
                    className="password-toggle"
                    onClick={() => setShowRegPwd(!showRegPwd)}
                  >
                    {showRegPwd ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Confirm Password</label>
                <div className="password-wrapper">
                  <FaLock className="input-icon" />
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Confirm your password"
                    value={registerData.confirmPassword}
                    onChange={handleRegisterInputChange}
                    required
                    disabled={loading}
                  />
                  <span
                    className="password-toggle"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  >
                    {showConfirmPwd ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Role</label>
                <div className="select-wrapper">
                  <select
                    name="role"
                    value={registerData.role}
                    onChange={handleRegisterInputChange}
                    className="role-select"
                    disabled={loading}
                  >
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading}>
                {loading ? 'Creating Account...' : 'Register'}
              </button>

              <div className="social-login">
                <p>or continue with</p>
                <div
                  ref={googleRegisterBtnRef}
                  onClick={() => { googleActionRef.current = 'register'; }}
                  className="google-btn-container"
                />
                {!googleReady && googleClientId && (
                  <p className="text-xs text-gray-400 mt-2">Loading Google Sign-In...</p>
                )}
              </div>
            </form>

            {/* ---------- OVERLAY ---------- */}
            <div className="overlay-container">
              <div className="overlay">
                <div className="overlay-panel overlay-left">
                  <h2>Welcome Back!</h2>
                  <p>Already have an HNj Store account?</p>
                  <button className="ghost" onClick={() => toggleForm('login')} disabled={loading}>
                    Login
                  </button>
                </div>

                <div className="overlay-panel overlay-right">
                  <h2>Hello, Friend!</h2>
                  <p>New to HNj Store? Register to manage your inventory</p>
                  <button className="ghost" onClick={() => toggleForm('register')} disabled={loading}>
                    Register
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-6 text-center text-xs text-gray-500">
        <p>HNj Store Management System © 2024</p>
      </div>
    </div>
  );
};

export default AuthPage;