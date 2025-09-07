import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserWithPassword } from '../types';
import { authService } from '../services/authService';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  users: Record<string, UserWithPassword>;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => void;
  addUser: (user: UserWithPassword) => Promise<void>;
  updateUser: (username: string, userData: Partial<UserWithPassword>) => void;
  deleteUser: (username: string) => void;
  changePassword: (username: string, oldPass: string, newPass: string, isAdminOverride?: boolean) => Promise<void>;
  isAuthLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<Record<string, UserWithPassword>>({});
  const [isAuthLoading, setAuthLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const initializeAuth = async () => {
      setAuthLoading(true);
      await authService._ensureUsersLoaded();
      setUsers(authService.getLoadedUsers());
      const loggedInUser = authService.getCurrentUser();
      if (loggedInUser) {
        setUser(loggedInUser);
      }
      setAuthLoading(false);
    };
    initializeAuth();
  }, []);
  
  const login = async (username: string, pass: string) => {
     try {
      const loggedInUser = await authService.login(username, pass);
      setUser(loggedInUser);
      setUsers(authService.getLoadedUsers()); // Refresh users just in case
      addToast(`خوش آمدید، ${loggedInUser.name}!`, 'success');
    } catch (e: any) {
      addToast(e.message, 'error');
      // Re-throw for the login form to catch
      throw e;
    }
  };

  const logout = () => {
     authService.logout();
     setUser(null);
     addToast('با موفقیت خارج شدید.', 'success');
  };
  
  const addUser = async (userData: UserWithPassword) => {
      try {
        await authService.addUser(userData);
        setUsers(authService.getLoadedUsers());
        addToast('کاربر جدید با موفقیت اضافه شد.', 'success');
      } catch (e: any) {
        addToast(e.message, 'error');
        throw e;
      }
  }
  
  const updateUser = (username: string, userData: Partial<UserWithPassword>) => {
      const currentUsers = authService.getLoadedUsers();
      const updatedUsers = {...currentUsers, [username]: { ...currentUsers[username], ...userData }};
      authService.saveUsers(updatedUsers);
      setUsers(updatedUsers);
      addToast('اطلاعات کاربر به‌روزرسانی شد.', 'success');
  }
  
  const deleteUser = (username: string) => {
      if (username.toLowerCase() === 'admin') {
        addToast('شما نمی‌توانید کاربر پیش‌فرض سیستم را حذف کنید.', 'error');
        return;
      }
      const currentUsers = authService.getLoadedUsers();
      const newUsers = {...currentUsers};
      delete newUsers[username.toLowerCase()];
      authService.saveUsers(newUsers);
      setUsers(newUsers);
      addToast('کاربر حذف شد.', 'success');
  }

  const changePassword = async (username: string, oldPass: string, newPass: string, isAdminOverride: boolean = false) => {
      try {
          await authService.changePassword(username, oldPass, newPass, isAdminOverride);
          setUsers(authService.getLoadedUsers());
          // Toast is shown by the modal upon successful completion
      } catch(e: any) {
          addToast(e.message, 'error');
          throw e; // Re-throw to let modal know about the error
      }
  }

  const value = { user, users, login, logout, addUser, updateUser, deleteUser, changePassword, isAuthLoading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
