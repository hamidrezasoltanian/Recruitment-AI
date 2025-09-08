import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Candidate, StageId, Comment, TestResult } from '../types';
import { candidateService, CandidateFilters } from '../services/candidateService';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { io, Socket } from 'socket.io-client';

interface CandidatesContextType {
  candidates: Candidate[];
  loading: boolean;
  error: string | null;
  filters: CandidateFilters;
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
  setCandidates: (candidates: Candidate[]) => void;
  fetchCandidates: (filters?: CandidateFilters) => Promise<void>;
  addCandidate: (candidate: Partial<Candidate>, resumeFile?: File) => Promise<void>;
  updateCandidate: (id: string, updates: Partial<Candidate>, resumeFile?: File) => Promise<void>;
  deleteCandidate: (id: string) => Promise<void>;
  updateCandidateStage: (id: string, newStage: StageId) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
  addComment: (id: string, text: string) => Promise<void>;
  updateTestResult: (candidateId: string, testId: string, resultData: Partial<TestResult>) => Promise<void>;
  setFilters: (filters: CandidateFilters) => void;
  refreshCandidates: () => Promise<void>;
}

const CandidatesContext = createContext<CandidatesContextType | undefined>(undefined);

export const useCandidates = () => {
  const context = useContext(CandidatesContext);
  if (!context) {
    throw new Error('useCandidates must be used within a CandidatesProvider');
  }
  return context;
};

export const CandidatesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [candidates, setCandidatesState] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CandidateFilters>({
    sortBy: 'createdAt',
    order: 'desc',
    page: 1,
    limit: 50,
    archived: false
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const { addToast } = useToast();
  const { user, organization } = useAuth();

  // Initialize WebSocket connection
  useEffect(() => {
    if (!organization?.id) return;

    const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      auth: {
        token: localStorage.getItem('auth_token')
      }
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      newSocket.emit('join-organization', organization.id);
    });

    // Real-time event handlers
    newSocket.on('candidate:created', (data) => {
      addToast(`متقاضی جدید توسط ${data.createdBy} اضافه شد`, 'info');
      fetchCandidates(filters);
    });

    newSocket.on('candidate:updated', (data) => {
      fetchCandidates(filters);
    });

    newSocket.on('candidate:deleted', (data) => {
      setCandidatesState(prev => prev.filter(c => c.id !== data.candidateId));
      addToast(`متقاضی توسط ${data.deletedBy} حذف شد`, 'info');
    });

    newSocket.on('candidate:stageChanged', (data) => {
      setCandidatesState(prev => prev.map(c => 
        c.id === data.candidateId 
          ? { ...c, stage: data.newStage }
          : c
      ));
    });

    newSocket.on('candidate:commentAdded', (data) => {
      setCandidatesState(prev => prev.map(c => 
        c.id === data.candidateId 
          ? { ...c, comments: [...(c.comments || []), data.comment] }
          : c
      ));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [organization?.id]);

  // Fetch candidates from API
  const fetchCandidates = useCallback(async (newFilters?: CandidateFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      const filtersToUse = newFilters || filters;
      const response = await candidateService.getCandidates(filtersToUse);
      
      setCandidatesState(response.candidates);
      setPagination(response.pagination);
      
      if (newFilters) {
        setFilters(newFilters);
      }
    } catch (err: any) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, addToast]);

  // Initial load
  useEffect(() => {
    if (user && organization) {
      fetchCandidates();
    }
  }, [user, organization]);

  const setCandidates = async (newCandidates: Candidate[]) => {
    // This is mainly for import functionality
    setCandidatesState(newCandidates);
    addToast('داده‌ها با موفقیت بارگذاری شدند', 'success');
  };

  const addCandidate = async (candidateData: Partial<Candidate>, resumeFile?: File) => {
    try {
      const newCandidate = await candidateService.createCandidate(candidateData, resumeFile);
      setCandidatesState(prev => [newCandidate, ...prev]);
      addToast('متقاضی با موفقیت اضافه شد', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const updateCandidate = async (id: string, updates: Partial<Candidate>, resumeFile?: File) => {
    try {
      const updatedCandidate = await candidateService.updateCandidate(id, updates, resumeFile);
      setCandidatesState(prev => prev.map(c => c.id === id ? updatedCandidate : c));
      addToast('اطلاعات با موفقیت به‌روزرسانی شد', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const deleteCandidate = async (id: string) => {
    try {
      await candidateService.deleteCandidate(id);
      setCandidatesState(prev => prev.filter(c => c.id !== id));
      addToast('متقاضی حذف شد', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const updateCandidateStage = async (id: string, newStage: StageId) => {
    try {
      const updatedCandidate = await candidateService.updateCandidateStage(id, newStage);
      setCandidatesState(prev => prev.map(c => c.id === id ? updatedCandidate : c));
      addToast(`مرحله به ${newStage} تغییر کرد`, 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const toggleArchive = async (id: string) => {
    try {
      const updatedCandidate = await candidateService.toggleArchive(id);
      setCandidatesState(prev => prev.map(c => c.id === id ? updatedCandidate : c));
      addToast(
        updatedCandidate.isArchived ? 'متقاضی آرشیو شد' : 'متقاضی از آرشیو خارج شد',
        'success'
      );
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const addComment = async (id: string, text: string) => {
    try {
      const updatedCandidate = await candidateService.addComment(id, text);
      setCandidatesState(prev => prev.map(c => c.id === id ? updatedCandidate : c));
      addToast('یادداشت اضافه شد', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const updateTestResult = async (candidateId: string, testId: string, resultData: Partial<TestResult>) => {
    try {
      const updatedCandidate = await candidateService.updateTestResult(candidateId, testId, resultData);
      setCandidatesState(prev => prev.map(c => c.id === candidateId ? updatedCandidate : c));
      addToast('نتیجه آزمون به‌روزرسانی شد', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const refreshCandidates = async () => {
    await fetchCandidates(filters);
  };

  const value = {
    candidates,
    loading,
    error,
    filters,
    pagination,
    setCandidates,
    fetchCandidates,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    updateCandidateStage,
    toggleArchive,
    addComment,
    updateTestResult,
    setFilters,
    refreshCandidates
  };

  return <CandidatesContext.Provider value={value}>{children}</CandidatesContext.Provider>;
};