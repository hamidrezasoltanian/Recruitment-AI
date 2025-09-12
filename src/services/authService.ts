import { apiClient, tokenManager } from './api';
import { User } from '../types';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  organizationName: string;
  name: string;
  username: string;
  email: string;
  password: string;
  website?: string;
  address?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
  organization: {
    id: string;
    name: string;
  };
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

class AuthService {
  private currentUser: User | null = null;
  private organization: { id: string; name: string } | null = null;

  /**
   * Register new organization and admin user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Registration failed');
    }
    
    const authData = response.data;
    
    // Store tokens
    tokenManager.setToken(authData.token);
    if (authData.refreshToken) {
      tokenManager.setRefreshToken(authData.refreshToken);
    }
    
    // Store user and organization info
    this.currentUser = authData.user;
    this.organization = authData.organization;
    localStorage.setItem('user', JSON.stringify(authData.user));
    localStorage.setItem('organization', JSON.stringify(authData.organization));
    
    return authData;
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Login failed');
    }
    
    const authData = response.data;
    
    // Store tokens
    tokenManager.setToken(authData.token);
    if (authData.refreshToken) {
      tokenManager.setRefreshToken(authData.refreshToken);
    }
    
    // Store user and organization info
    this.currentUser = authData.user;
    this.organization = authData.organization;
    localStorage.setItem('user', JSON.stringify(authData.user));
    localStorage.setItem('organization', JSON.stringify(authData.organization));
    
    return authData;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
    
    // Clear local data
    tokenManager.removeToken();
    this.currentUser = null;
    this.organization = null;
    localStorage.removeItem('user');
    localStorage.removeItem('organization');
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User | null> {
    // Try to get from memory first
    if (this.currentUser) {
      return this.currentUser;
    }
    
    // Try to get from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      this.currentUser = JSON.parse(storedUser);
      return this.currentUser;
    }
    
    // If token exists, fetch from API
    const token = tokenManager.getToken();
    if (!token) {
      return null;
    }
    
    try {
      const response = await apiClient.get<{ user: User; organization: any }>('/auth/me');
      
      if (response.success && response.data) {
        this.currentUser = response.data.user;
        this.organization = response.data.organization;
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('organization', JSON.stringify(response.data.organization));
        return this.currentUser;
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      // Token might be invalid, clear it
      this.logout();
    }
    
    return null;
  }

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordData): Promise<void> {
    const response = await apiClient.put('/auth/change-password', data);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to change password');
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const response = await apiClient.post('/auth/forgot-password', { email });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to request password reset');
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const response = await apiClient.post('/auth/reset-password', { token, newPassword });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to reset password');
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    const response = await apiClient.post('/auth/verify-email', { token });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to verify email');
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!tokenManager.getToken();
  }

  /**
   * Get current organization
   */
  getOrganization(): { id: string; name: string } | null {
    if (this.organization) {
      return this.organization;
    }
    
    const storedOrg = localStorage.getItem('organization');
    if (storedOrg) {
      this.organization = JSON.parse(storedOrg);
      return this.organization;
    }
    
    return null;
  }

  /**
   * Check if current user is admin
   */
  isAdmin(): boolean {
    const user = this.currentUser || JSON.parse(localStorage.getItem('user') || '{}');
    return user.isAdmin === true;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.currentUser || JSON.parse(localStorage.getItem('user') || '{}');
    return user.role === role;
  }
}

export const authService = new AuthService();