'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginError {
  message: string;
  field?: string;
}

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<LoginError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // TODO: Validate token with server
      const redirectUrl = searchParams.get('redirect') || '/dashboard';
      router.push(redirectUrl);
    }
  }, [router, searchParams]);

  const validateForm = (): boolean => {
    const newErrors: LoginError[] = [];

    if (!formData.email.trim()) {
      newErrors.push({ message: 'Email is required', field: 'email' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.push({ message: 'Please enter a valid email address', field: 'email' });
    }

    if (!formData.password.trim()) {
      newErrors.push({ message: 'Password is required', field: 'password' });
    } else if (formData.password.length < 6) {
      newErrors.push({ message: 'Password must be at least 6 characters long', field: 'password' });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include', // Include cookies for CSRF protection
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific error types
        if (response.status === 401) {
          setErrors([{ message: 'Invalid email or password. Please try again.' }]);
        } else if (response.status === 429) {
          setErrors([{ message: 'Too many login attempts. Please try again later.' }]);
        } else if (response.status === 422) {
          // Handle validation errors
          const fieldErrors = errorData.errors || {};
          const newErrors: LoginError[] = [];
          
          Object.entries(fieldErrors).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              messages.forEach(message => {
                newErrors.push({ message: message as string, field });
              });
            }
          });
          
          if (newErrors.length === 0) {
            newErrors.push({ message: 'Please check your input and try again.' });
          }
          
          setErrors(newErrors);
        } else {
          setErrors([{ message: errorData.message || 'Login failed. Please try again.' }]);
        }
        return;
      }

      const data = await response.json();
      
      // Store auth token if provided
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      // Success - redirect to dashboard or intended destination
      const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
      router.push(redirectUrl);
    } catch (error) {
      console.error('Login error:', error);
      setErrors([{ message: 'An unexpected error occurred. Please check your connection and try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
    
    // Clear field-specific errors when user starts typing
    setErrors(prev => prev.filter(error => error.field !== field));
  };

  const getFieldError = (field: string): string | undefined => {
    return errors.find(error => error.field === field)?.message;
  };

  const generalErrors = errors.filter(error => !error.field);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            RFID Field Capture + Sync SaaS
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          {generalErrors.length > 0 && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">
                {generalErrors.map((error, index) => (
                  <p key={index}>{error.message}</p>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange('email')}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                  getFieldError('email') 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300'
                }`}
                placeholder="Email address"
                aria-invalid={getFieldError('email') ? 'true' : 'false'}
                aria-describedby={getFieldError('email') ? 'email-error' : undefined}
              />
              {getFieldError('email') && (
                <p id="email-error" className="mt-1 text-sm text-red-600">
                  {getFieldError('email')}
                </p>
              )}
            </div>
            
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleInputChange('password')}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                  getFieldError('password') 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300'
                }`}
                placeholder="Password"
                aria-invalid={getFieldError('password') ? 'true' : 'false'}
                aria-describedby={getFieldError('password') ? 'password-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
              {getFieldError('password') && (
                <p id="password-error" className="mt-1 text-sm text-red-600">
                  {getFieldError('password')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <a
                href="/forgot-password"
                className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a
                href="/register"
                className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Sign up
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}