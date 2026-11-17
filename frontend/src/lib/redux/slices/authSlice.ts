/**
 * [EDUCATIONAL NOTE: Redux Toolkit Auth Slice]
 * 
 * 1. Architecture Role:
 *    Manages client-side authentication state, tokens, and active user credentials.
 *    Synchronizes session state between memory and browser `localStorage`.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Holds JWT `accessToken` returned by NestJS `AuthService.login()` or `register()`.
 *    - Token is consumed by `apiSlice.prepareHeaders` to authorize subsequent HTTP requests.
 * 
 * 3. State Mechanics:
 *    - `setCredentials`: Sets active session and writes token to `localStorage`.
 *    - `logOut`: Wipes active session and removes token from `localStorage`.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: string;
  address?: string | null;
}

export interface AuthState {
  user: UserSummary | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: UserSummary; accessToken: string }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', action.payload.accessToken);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      }
    },
    logOut: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
      }
    },
    updateUser: (state, action: PayloadAction<Partial<UserSummary>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(state.user));
        }
      }
    },
  },
});

export const { setCredentials, logOut, updateUser } = authSlice.actions;

export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectCurrentToken = (state: { auth: AuthState }) => state.auth.accessToken;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;

export default authSlice.reducer;
