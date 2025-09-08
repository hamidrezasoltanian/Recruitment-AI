import { apiClient, ApiResponse } from './api';
import { Candidate, Comment, TestResult } from '../types';

export interface CandidateFilters {
  stage?: string;
  position?: string;
  source?: string;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  archived?: boolean;
}

export interface CandidateListResponse {
  candidates: Candidate[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

class CandidateService {
  private basePath = '/candidates';

  /**
   * Get all candidates with optional filters
   */
  async getCandidates(filters?: CandidateFilters): Promise<CandidateListResponse> {
    const response = await apiClient.get<CandidateListResponse>(this.basePath, filters);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch candidates');
    }
    return response.data;
  }

  /**
   * Get single candidate by ID
   */
  async getCandidate(id: string): Promise<Candidate> {
    const response = await apiClient.get<Candidate>(`${this.basePath}/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch candidate');
    }
    return response.data;
  }

  /**
   * Create new candidate
   */
  async createCandidate(candidateData: Partial<Candidate>, resumeFile?: File): Promise<Candidate> {
    let candidate: Candidate;
    
    // First create the candidate
    const response = await apiClient.post<Candidate>(this.basePath, candidateData);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create candidate');
    }
    candidate = response.data;
    
    // Then upload resume if provided
    if (resumeFile && candidate.id) {
      try {
        await this.uploadResume(candidate.id, resumeFile);
        candidate.hasResume = true;
      } catch (error) {
        console.error('Failed to upload resume:', error);
        // Don't fail the whole operation if resume upload fails
      }
    }
    
    return candidate;
  }

  /**
   * Update candidate
   */
  async updateCandidate(id: string, updates: Partial<Candidate>, resumeFile?: File): Promise<Candidate> {
    const response = await apiClient.put<Candidate>(`${this.basePath}/${id}`, updates);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update candidate');
    }
    
    const candidate = response.data;
    
    // Upload new resume if provided
    if (resumeFile) {
      try {
        await this.uploadResume(id, resumeFile);
        candidate.hasResume = true;
      } catch (error) {
        console.error('Failed to upload resume:', error);
      }
    }
    
    return candidate;
  }

  /**
   * Delete candidate
   */
  async deleteCandidate(id: string): Promise<void> {
    const response = await apiClient.delete(`${this.basePath}/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete candidate');
    }
  }

  /**
   * Update candidate stage
   */
  async updateCandidateStage(id: string, newStage: string): Promise<Candidate> {
    const response = await apiClient.put<Candidate>(`${this.basePath}/${id}/stage`, { stage: newStage });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update stage');
    }
    return response.data;
  }

  /**
   * Add comment to candidate
   */
  async addComment(candidateId: string, text: string): Promise<Candidate> {
    const response = await apiClient.post<Candidate>(`${this.basePath}/${candidateId}/comments`, { text });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to add comment');
    }
    return response.data;
  }

  /**
   * Archive or unarchive candidate
   */
  async toggleArchive(id: string): Promise<Candidate> {
    const response = await apiClient.put<Candidate>(`${this.basePath}/${id}/archive`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to toggle archive status');
    }
    return response.data;
  }

  /**
   * Upload resume for candidate
   */
  async uploadResume(candidateId: string, file: File): Promise<{ url: string }> {
    const response = await apiClient.upload<{ url: string }>(
      `/files/resume/${candidateId}`,
      file
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to upload resume');
    }
    return response.data;
  }

  /**
   * Upload test result file
   */
  async uploadTestResult(candidateId: string, testId: string, file: File): Promise<{ url: string }> {
    const response = await apiClient.upload<{ url: string }>(
      `/files/test-result/${candidateId}/${testId}`,
      file
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to upload test result');
    }
    return response.data;
  }

  /**
   * Update test result
   */
  async updateTestResult(candidateId: string, testId: string, resultData: Partial<TestResult>): Promise<Candidate> {
    const response = await apiClient.put<Candidate>(
      `${this.basePath}/${candidateId}/test-results/${testId}`,
      resultData
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update test result');
    }
    return response.data;
  }

  /**
   * Bulk update candidates
   */
  async bulkUpdate(candidateIds: string[], updates: Partial<Candidate>): Promise<{ updated: number }> {
    const response = await apiClient.put<{ updated: number }>(
      `${this.basePath}/bulk`,
      { ids: candidateIds, updates }
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to bulk update candidates');
    }
    return response.data;
  }

  /**
   * Export candidates to CSV
   */
  async exportToCsv(filters?: CandidateFilters): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      `${this.basePath}/export/csv`,
      { ...filters, responseType: 'blob' }
    );
    if (!response.data) {
      throw new Error('Failed to export candidates');
    }
    return response.data;
  }

  /**
   * Import candidates from CSV
   */
  async importFromCsv(file: File): Promise<{ imported: number; failed: number; errors?: string[] }> {
    const response = await apiClient.upload<{ imported: number; failed: number; errors?: string[] }>(
      `${this.basePath}/import/csv`,
      file
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to import candidates');
    }
    return response.data;
  }
}

export const candidateService = new CandidateService();