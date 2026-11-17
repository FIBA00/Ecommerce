'use client';

/**
 * [EDUCATIONAL NOTE: User Login Page Component]
 * 
 * 1. Architecture Role:
 *    User sign-in screen validating email and password credentials, invoking the backend JWT
 *    issuance endpoint, and synchronizing auth state into Redux Toolkit and browser `localStorage`.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Form Validation: `loginSchema` via `@hookform/resolvers/zod`.
 *    - Mutation: `authApi.useLoginMutation({ email, password })` -> `POST /api/auth/login`.
 *    - NestJS Controller: `AuthController.login()` -> `AuthService.login()` -> validates bcrypt hash.
 *    - Redux Action: `setCredentials({ user, accessToken })` -> saves token for subsequent API requests.
 *    - Cache Invalidation: Invalidates `['Auth', 'Cart', 'Order', 'User']` to load pristine session data.
 * 
 * 3. State & Validation Mechanics:
 *    - Handles 401 Unauthorized by displaying clear inline feedback.
 *    - Provides quick demo account filling for educational testing.
 */

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { loginSchema, LoginFormData } from '../../../lib/schemas/auth.schema';
import { useLoginMutation } from '../../../lib/redux/api/authApi';
import { useAppDispatch } from '../../../lib/redux/store';
import { setCredentials } from '../../../lib/redux/slices/authSlice';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const dispatch = useAppDispatch();

  const [login, { isLoading }] = useLoginMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    try {
      const res = await login({
        email: data.email.trim(),
        password: data.password,
      }).unwrap();

      dispatch(setCredentials({ user: res.user, accessToken: res.accessToken }));
      router.push(redirectUrl);
    } catch (err: any) {
      console.error('Login failed:', err);
      setErrorMessage(
        err?.data?.message || 'Invalid email or password. Please verify your credentials.'
      );
    }
  };

  const handleQuickFill = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    setErrorMessage(null);
  };

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Sign In to Your Account
        </h1>
        <p className="text-xs text-gray-500">
          Enter your credentials to manage your cart, orders, and profile
        </p>
      </div>

      {/* Quick Fill Demo Accounts */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs space-y-2">
        <span className="font-bold text-blue-900 block">Quick Demo Credentials:</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('user@example.com', 'password123')}
            className="flex-1 py-1.5 px-2.5 bg-white border border-blue-200 rounded-lg text-blue-700 font-medium hover:bg-blue-100/50 transition text-center"
          >
            Shopper Demo
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('admin@example.com', 'admin123')}
            className="flex-1 py-1.5 px-2.5 bg-white border border-blue-200 rounded-lg text-blue-700 font-medium hover:bg-blue-100/50 transition text-center"
          >
            Admin Demo
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              autoComplete="email"
              {...register('email')}
              placeholder="user@example.com"
              className="w-full text-sm pl-9 pr-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
          {errors.email && (
            <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type="password"
              autoComplete="current-password"
              {...register('password')}
              placeholder="••••••••"
              className="w-full text-sm pl-9 pr-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
          {errors.password && (
            <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
        >
          {isLoading ? (
            <span>Signing in...</span>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-xs text-gray-500">
        Don&apos;t have an account yet?{' '}
        <Link href="/auth/register" className="font-semibold text-blue-600 hover:text-blue-700">
          Create one now
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-xs text-gray-400">Loading sign in...</div>}>
      <LoginContent />
    </Suspense>
  );
}
