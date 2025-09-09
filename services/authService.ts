import { User, UserWithPassword } from '../types';

const USERS_KEY = 'recruitment_users';
const CURRENT_USER_KEY = 'recruitment_current_user';

// Helper to hash passwords using SHA-256
const hashPassword = async (password: string): Promise<string> => {
  // The SubtleCrypto API is only available in secure contexts (HTTPS).
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API (crypto.subtle) is not available. This feature requires a secure context (HTTPS).');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// This service is now designed to be initialized asynchronously.
let users: Record<string, UserWithPassword> | null = null;

const getUsers = async (): Promise<Record<string, UserWithPassword>> => {
  if (users) return users;

  try {
    const storedUsers = localStorage.getItem(USERS_KEY);
    if (storedUsers) {
      users = JSON.parse(storedUsers);
      return users!;
    }
  } catch (e) {
    console.error('Failed to parse users from localStorage', e);
  }

  // If no users in localStorage, create defaults with hashed passwords
  console.log("Initializing default users with hashed passwords...");
  const defaultAdminPass = await hashPassword('adminpassword');
  const defaultHrPass = await hashPassword('hrpassword');
  users = {
    'admin': {
      username: 'admin', name: 'ادمین سیستم', isAdmin: true, password: defaultAdminPass,
    },
    'hr': {
      username: 'hr', name: 'کارشناس استخدام', isAdmin: false, password: defaultHrPass,
    },
  };
  authService.saveUsers(users);
  return users;
};


export const authService = {
  // Use this to ensure users are loaded before any operation
  _ensureUsersLoaded: async (): Promise<Record<string, UserWithPassword>> => {
      return await getUsers();
  },

  getLoadedUsers: (): Record<string, UserWithPassword> => {
      if (!users) {
          console.warn("Attempted to get users before they were loaded asynchronously.");
          return {};
      }
      return users;
  },

  saveUsers: (updatedUsers: Record<string, UserWithPassword>) => {
    try {
        localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
        users = updatedUsers; // Keep in-memory copy in sync
    } catch(e) {
        console.error('Failed to save users to localStorage', e);
    }
  },

  getCurrentUser: (): User | null => {
    try {
        const userJson = sessionStorage.getItem(CURRENT_USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
        console.error('Failed to parse current user from sessionStorage', e);
        return null;
    }
  },

  login: async (username: string, pass: string): Promise<User> => {
    const allUsers = await getUsers();
    const user = allUsers[username.toLowerCase()];
    const hashedPass = await hashPassword(pass);
    
    if (user && user.password === hashedPass) {
      const { password, ...userToStore } = user;
      sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userToStore));
      return userToStore;
    }
    throw new Error('نام کاربری یا رمز عبور اشتباه است.');
  },

  logout: () => {
    sessionStorage.removeItem(CURRENT_USER_KEY);
  },
  
  addUser: async (userData: UserWithPassword): Promise<void> => {
      const allUsers = await getUsers();
      if (allUsers[userData.username.toLowerCase()]) {
          throw new Error('کاربر با این نام کاربری وجود دارد.');
      }
      if (!userData.password) {
          throw new Error('رمز عبور برای کاربر جدید الزامی است.');
      }
      const hashedPassword = await hashPassword(userData.password);
      const newUser = { ...userData, password: hashedPassword };
      const updatedUsers = { ...allUsers, [userData.username.toLowerCase()]: newUser };
      authService.saveUsers(updatedUsers);
  },

  changePassword: async (username: string, oldPass: string, newPass: string, isAdminOverride: boolean = false) => {
    const allUsers = await getUsers();
    const userToChange = allUsers[username.toLowerCase()];
    if (!userToChange) {
      throw new Error('کاربر یافت نشد.');
    }
    
    if (!isAdminOverride) {
        const hashedOldPass = await hashPassword(oldPass);
        if (userToChange.password !== hashedOldPass) {
            throw new Error('رمز عبور فعلی اشتباه است.');
        }
    }
    
    userToChange.password = await hashPassword(newPass);
    authService.saveUsers(allUsers);
  },
};