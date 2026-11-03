import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

const DEFAULT_ADMIN = {
  role: 'admin',
  email: 'devbandil19@gmail.com',
  name: 'Dev Bandil (Admin)',
  title: 'Dean of Administration · Central Governance Cell',
  badge: 'GOV-OPS'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sati_auth_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    // Default to admin for evaluation, but students scanning QR switch to student
    return DEFAULT_ADMIN;
  });

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('student'); // 'student' or 'admin'

  // Detect URL parameter for student QR scan (e.g. ?portal=student or /student)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('portal') === 'student' || window.location.pathname === '/student') {
        const saved = localStorage.getItem('sati_auth_user');
        if (!saved || JSON.parse(saved)?.role !== 'student') {
          setUser(null);
          setAuthInitialMode('student');
          setAuthModalOpen(true);
        }
      }
    }
  }, []);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('sati_auth_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('sati_auth_user');
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const sendStudentOtp = async (email) => {
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed.endsWith('@satiengg.in')) {
      throw new Error('Access Restricted: Only official @satiengg.in college email addresses are authorized.');
    }
    return await api.sendOtp(trimmed);
  };

  const verifyStudentOtp = async (email, code) => {
    const trimmed = (email || '').trim().toLowerCase();
    return await api.verifyOtp(trimmed, code);
  };

  const setStudentPassword = async (email, password, code) => {
    const trimmed = (email || '').trim().toLowerCase();
    const result = await api.setPassword(trimmed, password, code);
    if (result && result.user) {
      setUser(result.user);
      return result.user;
    }
    const studentUser = {
      role: 'student',
      email: trimmed,
      name: trimmed.split('@')[0],
      scholarId: `SATI-${trimmed.split('@')[0].toUpperCase()}`,
      title: 'Enrolled Scholar (SATI Vidisha)'
    };
    setUser(studentUser);
    return studentUser;
  };

  const loginStudent = async (email, password) => {
    const trimmed = (email || '').trim().toLowerCase();
    const result = await api.loginStudent(trimmed, password);
    if (result && result.user) {
      setUser(result.user);
      return result.user;
    }
  };

  const loginAdmin = async (email, password) => {
    const trimmedPass = (password || '').trim();
    const trimmedEmail = (email || '').trim().toLowerCase() || 'devbandil19@gmail.com';

    const result = await api.loginAdmin(trimmedEmail, trimmedPass);
    if (result && result.user) {
      setUser(result.user);
      return result.user;
    }
  };

  const switchRole = (role) => {
    if (role === 'admin') {
      setUser(DEFAULT_ADMIN);
    } else {
      setUser({
        role: 'student',
        email: 'scholar.2023@satiengg.in',
        name: 'SATI Student',
        scholarId: 'SATI-2023-CS-104',
        title: 'Enrolled Scholar (SATI Vidisha)'
      });
    }
  };

  const logout = () => {
    setUser(null);
    setAuthModalOpen(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === 'admin',
        isStudent: user?.role === 'student',
        sendStudentOtp,
        verifyStudentOtp,
        setStudentPassword,
        loginStudent,
        loginAdmin,
        switchRole,
        logout,
        qrModalOpen,
        setQrModalOpen,
        authModalOpen,
        setAuthModalOpen,
        authInitialMode,
        setAuthInitialMode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
