import { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react';
import privateApi, {
  publicApi,
  setAccessToken,
  clearAccessToken,
} from '../utils/axios';

// ─── State ─────────────────────────────────────────────────────────────────────
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,   // true on first load (checking session)
  error: null,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_LOADING':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS':
      return { ...state, user: action.payload, isAuthenticated: true, isLoading: false, error: null };
    case 'AUTH_FAILURE':
      return { ...state, user: null, isAuthenticated: false, isLoading: false, error: action.payload };
    case 'AUTH_LOGOUT':
      return { ...state, user: null, isAuthenticated: false, isLoading: false, error: null };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

// ─── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const initRef = useRef(false);

  // ── Initialize: try to restore session via refresh token cookie ──────────────
  const initializeAuth = useCallback(async () => {
    if (initRef.current) return;
    initRef.current = true;

    try {
      dispatch({ type: 'AUTH_LOADING' });
      const response = await publicApi.post('/auth/refresh');
      setAccessToken(response.data.accessToken);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.data.user });
    } catch {
      // No valid refresh token → user is not authenticated
      clearAccessToken();
      dispatch({ type: 'AUTH_FAILURE', payload: null });
    }
  }, []);

  useEffect(() => {
    initializeAuth();

    // Listen for forced logout events (from axios interceptor)
    const handleForceLogout = () => {
      clearAccessToken();
      dispatch({ type: 'AUTH_LOGOUT' });
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, [initializeAuth]);

  // ── Register ──────────────────────────────────────────────────────────────────
  const register = async (name, email, password) => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const response = await publicApi.post('/auth/register', { name, email, password });
      setAccessToken(response.data.accessToken);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.data.user });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      const errors = error.response?.data?.errors;
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      return { success: false, message, errors };
    }
  };

  // ── Login ─────────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const response = await publicApi.post('/auth/login', { email, password });
      setAccessToken(response.data.accessToken);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.data.user });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      return { success: false, message };
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await privateApi.post('/auth/logout');
    } catch {
      // Continue logout even if API call fails
    } finally {
      clearAccessToken();
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  // ── Update user in state ───────────────────────────────────────────────────────
  const updateUser = (updates) => {
    dispatch({ type: 'UPDATE_USER', payload: updates });
  };

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' });

  return (
    <AuthContext.Provider
      value={{
        ...state,
        register,
        login,
        logout,
        updateUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ──────────────────────────────────────────────────────────────────────
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
