// Compatibility shim. The codebase uses both `useAuthStore` (zustand) and a
// `useAuth()` hook style. Re-expose the store as a `useAuth` hook so all
// screens keep working without rewrites.
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);
  const logout = useAuthStore((s) => s.logout);

  return { user, token, isLoading, isAuthenticated, setUser, setToken, logout };
};

export default useAuth;
