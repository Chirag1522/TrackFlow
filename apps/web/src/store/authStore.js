import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),

      setToken: (accessToken, refreshToken) =>
        set((state) => ({ accessToken, refreshToken: refreshToken || state.refreshToken })),
    }),
    { name: 'courier-auth' }
  )
);

export default useAuthStore;
