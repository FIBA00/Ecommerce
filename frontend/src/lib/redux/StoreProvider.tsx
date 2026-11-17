/**
 * [EDUCATIONAL NOTE: Client StoreProvider Component]
 * 
 * 1. Architecture Role:
 *    Next.js Client Component wrapper (`'use client'`) providing Redux context
 *    to all App Router server and client components.
 * 
 * 2. Session Rehydration:
 *    - On first mount (`useEffect`), checks browser `localStorage` for `accessToken` and `user`.
 *    - If present, dispatches `setCredentials` to re-establish the user session immediately.
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { setCredentials } from './slices/authSlice';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        const userStr = localStorage.getItem('user');
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            store.dispatch(setCredentials({ user, accessToken: token }));
          } catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
          }
        }
      }
    }
  }, []);

  return <Provider store={store}>{children}</Provider>;
}

export default StoreProvider;
