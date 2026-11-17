'use client';

/**
 * [EDUCATIONAL NOTE: User Registration Page Component]
 * 
 * 1. Architecture Role:
 *    User registration screen collecting name, email, and password credentials, creating
 *    a new customer account, and initializing an empty shopping cart on the backend.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Form Validation: `registerSchema` via `@hookform/resolvers/zod`.
 *    - Mutation: `authApi.useRegisterMutation({ name, email, password })` -> `POST /api/auth/register`.
 *    - NestJS Controller: `AuthController.register()` -> `AuthService.register()`:
 *      * Hashes password via `bcrypt`.
 *      * Inserts row into `users` table.
 *      * Automatically provisions new `cart` row associated with the user ID.
 *      * Returns signed JWT `accessToken`.
 *    - Cache Invalidation: Invalidates `['Auth', 'Cart', 'Order', 'User']`.
 * 
 * 3. State & Validation Mechanics:
 *    - Enforces 6-character password constraint and RFC-compliant email formatting.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { registerSchema, RegisterFormData } from '../../../lib/schemas/auth.schema';
import { useRegisterMutation } from '../../../lib/redux/api/authApi';
import { useAppDispatch } from '../../../lib/redux/store';
import { setCredentials } from '../../../lib/redux/slices/authSlice';

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [registerUser, { isLoading }] = useRegisterMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMessage(null);
    try {
      const res = await registerUser({
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
      }).unwrap();

      dispatch(setCredentials({ user: res.user, accessToken: res.accessToken }));
      router.push('/');
    } catch (err: any) {
      console.error('Registration failed:', err);
      setErrorMessage(
        err?.data?.message || 'Registration failed. A user with this email may already exist.'
      );
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
          <UserPlus className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Create Your Account
        </h1>
        <p className="text-xs text-gray-500">
          Sign up to test user isolation, shopping cart provisioning, and order tracking
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Register Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <input
              type="text"
              autoComplete="name"
              {...register('name')}
              placeholder="Jane Doe"
              className="w-full text-sm pl-9 pr-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
          {errors.name && (
            <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
          )}
        </div>

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
            Password (min 6 characters)
          </label>
          <div className="relative">
            <input
              type="password"
              autoComplete="new-password"
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
            <span>Creating account...</span>
          ) : (
            <>
              <span>Register</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-xs text-gray-500">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-semibold text-blue-600 hover:text-blue-700">
          Sign In
        </Link>
      </div>
    </div>
  );
}
