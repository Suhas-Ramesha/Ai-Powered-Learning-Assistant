"use client";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

interface LoginButtonProps {
  variant?: 'default' | 'landing' | 'cta';
  className?: string;
}

export default function LoginButton({ variant = 'default', className = '' }: LoginButtonProps) {
  const { user } = useAuth();

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getButtonStyles = () => {
    switch (variant) {
      case 'landing':
        return user 
          ? "px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          : "px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl";
      case 'cta':
        return user
          ? "px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 shadow-lg"
          : "bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-all duration-200 shadow-lg";
      default:
        return user
          ? "px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          : "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors";
    }
  };

  const getButtonText = () => {
    if (user) {
      return variant === 'default' ? `Logout (${user.displayName})` : 'Logout';
    }
    switch (variant) {
      case 'landing':
        return 'Get Started Free';
      case 'cta':
        return 'Start Learning Today';
      default:
        return 'Login with Google';
    }
  };

  return (
    <div className={className}>
      {user ? (
        <button onClick={logout} className={getButtonStyles()}>
          {getButtonText()}
        </button>
      ) : (
        <button onClick={login} className={getButtonStyles()}>
          {getButtonText()}
        </button>
      )}
    </div>
  );
}
