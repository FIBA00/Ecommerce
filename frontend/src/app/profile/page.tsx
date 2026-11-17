'use client';

/**
 * [EDUCATIONAL NOTE: User Profile Page Component]
 * 
 * 1. Architecture Role:
 *    User account management screen showing identity information, role badges,
 *    order count metrics, and default shipping address modification form.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Query: `usersApi.useGetProfileQuery()` -> `GET /api/users/profile`.
 *    - Mutation: `usersApi.useUpdateProfileMutation({ name, address })` -> `PATCH /api/users/profile`.
 *    - NestJS Controller: `UsersController.updateProfile()` -> updates `users` table record.
 *    - Cache Invalidation: Invalidates `['User']` tag, refreshing profile state across the application.
 * 
 * 3. State & Validation Mechanics:
 *    - Uses `profileSchema` for client validation.
 *    - Synchronizes updated name and address with Redux `authSlice` and browser `localStorage`.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, MapPin, Shield, Package, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { profileSchema, ProfileFormData } from '../../lib/schemas/profile.schema';
import { useGetProfileQuery, useUpdateProfileMutation } from '../../lib/redux/api/usersApi';
import { useAppDispatch, useAppSelector } from '../../lib/redux/store';
import { selectIsAuthenticated, updateUser } from '../../lib/redux/slices/authSlice';

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const { data: profile, isLoading } = useGetProfileQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [updateProfileMutation, { isLoading: isSaving }] = useUpdateProfileMutation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      address: '',
    },
  });

  useEffect(() => {
    if (profile) {
      if (profile.name) setValue('name', profile.name);
      if (profile.address) setValue('address', profile.address);
    }
  }, [profile, setValue]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Sign in to view your profile</h2>
        <p className="text-sm text-gray-500">
          Manage your account information and default shipping addresses.
        </p>
        <Link
          href="/auth/login?redirect=/profile"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow transition"
        >
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8 animate-pulse space-y-6">
        <div className="h-8 w-40 bg-gray-200 rounded" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  const onSubmit = async (data: ProfileFormData) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const updated = await updateProfileMutation({
        name: data.name ? data.name.trim() : undefined,
        address: data.address ? data.address.trim() : undefined,
      }).unwrap();

      dispatch(updateUser({ name: updated.name, address: updated.address }));
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Update failed:', err);
      setErrorMessage(err?.data?.message || 'Failed to update profile. Please try again.');
    }
  };

  const orderCount = profile?.orders?.length || 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          My Profile
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Manage your account credentials and default delivery address
        </p>
      </div>

      {/* Account Overview Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow">
            {profile?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{profile?.name}</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{profile?.email}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
            <Shield className="w-3.5 h-3.5" />
            <span className="capitalize">{profile?.role || 'user'}</span>
          </span>

          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-full transition"
          >
            <Package className="w-3.5 h-3.5" />
            <span>{orderCount} {orderCount === 1 ? 'Order' : 'Orders'}</span>
          </Link>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2.5 text-green-700 text-xs">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Edit Profile Form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
          Edit Profile Information
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
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
              Default Shipping Address
            </label>
            <div className="relative">
              <textarea
                rows={3}
                {...register('address')}
                placeholder="123 Educational Blvd, Tech City, TC 10001"
                className="w-full text-sm pl-9 pr-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
            {errors.address && (
              <p className="text-xs text-red-600 mt-1">{errors.address.message}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              This address will be automatically populated into checkout for fast orders.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition"
            >
              {isSaving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
