import React, { useState, useMemo } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useCandidates } from './contexts/CandidatesContext';
import { Candidate, StageId, View, StageChangeInfo } from './types';

import Header from './components/layout/Header';
import Tabs from './components/layout/Tabs';
import KanbanBoard from './components/kanban/KanbanBoard';
import CalendarView from './components/calendar/CalendarView';
import ArchiveView from './components/archive/ArchiveView';
import TestView from './components/views/TestView';
import AddEditCandidateModal from './components/modals/AddEditCandidateModal';
import CandidateDetailsModal from './components/modals/CandidateDetailsModal';
import SettingsModal from './components/modals/SettingsModal';
import StageChangeCommunicationModal from './components/modals/StageChangeCommunicationModal';
import DashboardSummary from './components/dashboard/DashboardSummary';
import LoginScreen from './components/auth/LoginScreen';
import KanbanControls from './components/kanban/KanbanControls';
import CommunicationModal from './components/modals/CommunicationModal';
import ResumeViewerModal from './components/modals/ResumeViewerModal';
import BulkCommunicationModal from './components/modals/BulkCommunicationModal';
import AiInsightsModal from './components/modals/AiInsightsModal';
import ChangePasswordModal from './components/modals/ChangePasswordModal';
import { useSettings } from './contexts/SettingsContext';


const App: React.FC = () => {
  const { user, isAuthLoading } = useAuth();
  const { candidates, addCandidate, updateCandidate, updateCandidateStage } = useCandidates();
  const { geminiApiKey } = useSettings();
  const [activeView, setActiveView] = useState<View>('dashboard');
  
  // Modal States
  const [isAddEditModalOpen, setAddEditModalOpen] = useState(false);
  const [candidateToEdit, setCandidateToEdit] = useState<Candidate | null>(null);
  const [initialStage, setInitialStage] = useState<StageId>('inbox');
  
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [candidateToViewId, setCandidateToViewId] = useState<string | null>(null);

  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  
  const [stageChangeInfo, setStageChangeInfo] = useState<StageChangeInfo | null>(null);

  const [communicationConfig, setCommunicationConfig] = useState<{
    isOpen: boolean;
    candidate: Candidate | null;
  }>({ isOpen: false, candidate: null });
  
  const [resumeViewerState, setResumeViewerState] = useState<{isOpen: boolean, file: File | null}>({ isOpen: false, file: null });

  const [bulkCommConfig, setBulkCommConfig] = useState<{ isOpen: boolean; candidates: Candidate[] }>({ isOpen: false, candidates: [] });
  const [isAiInsightsModalOpen, setAiInsightsModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);

  // State to auto-expand a candidate in TestView
  const [initialExpandedInTests, setInitialExpandedInTests] = useState<string | null>(null);
  
  // Filter and Sort States
  const [filters, setFilters] = useState({ search: '', position: '', source: '' });
  const [sortBy, setSortBy] = useState('createdAt');

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
      setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const filteredAndSortedCandidates = useMemo(() => {
    let processedCandidates = [...candidates];

    // Filtering
    if (filters.search) {
        processedCandidates = processedCandidates.filter(c => 
            c.name.toLowerCase().includes(filters.search.toLowerCase())
        );
    }
    if (filters.position) {
        processedCandidates = processedCandidates.filter(c => c.position === filters.position);
    }
    if (filters.source) {
        processedCandidates = processedCandidates.filter(c => c.source === filters.source);
    }

    // Sorting
    processedCandidates.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name, 'fa');
            case 'rating':
                return b.rating - a.rating;
            case 'createdAt':
            default:
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
    });
    
    return processedCandidates;
}, [candidates, filters, sortBy]);

  const candidateToView = useMemo(() => {
    return candidateToViewId ? candidates.find(c => c.id === candidateToViewId) : null;
  }, [candidates, candidateToViewId]);


  const handleOpenAddModal = (stage?: StageId) => {
    setCandidateToEdit(null);
    setInitialStage(stage || 'inbox');
    setAddEditModalOpen(true);
  };

  const handleOpenEditModal = (candidate: Candidate) => {
    setCandidateToViewId(null);
    setDetailsModalOpen(false);
    setCandidateToEdit(candidate);
    setAddEditModalOpen(true);
  };
  
  const handleOpenDetailsModal = (candidate: Candidate) => {
    setCandidateToViewId(candidate.id);
    setDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setDetailsModalOpen(false);
    setCandidateToViewId(null);
  }

  const handleSaveCandidate = (candidate: Candidate, resumeFile?: File) => {
    if (candidateToEdit) {
      updateCandidate(candidate, resumeFile);
    } else {
      addCandidate(candidate, resumeFile);
    }
  };

  const handleStageChangeRequest = (info: StageChangeInfo) => {
    setStageChangeInfo(info);
  };

  const handleConfirmStageChange = () => {
    if (stageChangeInfo) {
      updateCandidateStage(stageChangeInfo.candidate.id, stageChangeInfo.newStage.id);
    }
    setStageChangeInfo(null); // Close modal
  };
  
  const handleNavigateToTests = (candidateId: string) => {
    setInitialExpandedInTests(candidateId);
    setActiveView('tests');
    setDetailsModalOpen(false); // Close details modal if open
  };

  const handleOpenCommunicationModal = (candidate: Candidate) => {
    setCommunicationConfig({ isOpen: true, candidate });
    setDetailsModalOpen(false);
  };
  
  const handleOpenResumeViewer = (file: File) => {
    setDetailsModalOpen(false); // Close details modal
    setResumeViewerState({ isOpen: true, file: file });
  };

  const handleViewChange = (view: View) => {
    if (activeView === 'tests' && view !== 'tests') {
        setInitialExpandedInTests(null);
    }
    setActiveView(view);
  };

  const handleOpenBulkCommModal = (candidates: Candidate[]) => {
    setBulkCommConfig({ isOpen: true, candidates: candidates });
  };

  const renderView = () => {
    switch (activeView) {
      case 'tests':
        return <TestView initialExpandedCandidateId={initialExpandedInTests} />;
      case 'calendar':
        return <CalendarView onViewDetails={handleOpenDetailsModal} />;
      case 'archive':
        return <ArchiveView onViewDetails={handleOpenDetailsModal} />;
      case 'dashboard':
      default:
        return (
          <>
            <KanbanControls 
              filters={filters}
              onFilterChange={handleFilterChange}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
            <KanbanBoard 
              candidates={filteredAndSortedCandidates}
              onEdit={handleOpenEditModal} 
              onViewDetails={handleOpenDetailsModal} 
              onStageChangeRequest={handleStageChangeRequest}
            />
          </>
        );
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl font-semibold text-gray-700">در حال بارگذاری...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // A safe way to get the version, defaulting if not defined during build
  const appVersion = process.env.APP_VERSION || '1.1.0';

  return (
    <>
      <div className="min-h-screen flex flex-col">
        {!geminiApiKey && (
            <div className="bg-yellow-400 border-b-2 border-yellow-500 text-yellow-900 p-3 text-center text-sm font-semibold">
                ⚠️ کلید API برای Gemini پیکربندی نشده است. قابلیت‌های هوش مصنوعی غیرفعال هستند. لطفاً{' '}
                <button onClick={() => setSettingsModalOpen(true)} className="underline font-bold hover:text-yellow-800">
                    تنظیمات
                </button>
                {' '}را برای راهنمایی بررسی کنید.
            </div>
        )}
        <Header 
          onSettingsClick={() => setSettingsModalOpen(true)} 
          onAddCandidateClick={() => handleOpenAddModal()}
          onOpenBulkCommModal={handleOpenBulkCommModal}
          onChangePasswordClick={() => setChangePasswordModalOpen(true)}
        />
        <Tabs activeView={activeView} setActiveView={handleViewChange} />
        <main className="p-4 md:p-6 lg:p-8 flex-grow">
            {activeView === 'dashboard' && <DashboardSummary candidates={candidates} onOpenAiInsights={() => setAiInsightsModalOpen(true)} />}
            {renderView()}
        </main>
      </div>

      {/* Version Display */}
      <div className="fixed bottom-2 left-2 text-xs text-gray-400 font-mono z-50">
        v{appVersion}
      </div>

      {/* Modals */}
      <AddEditCandidateModal
        isOpen={isAddEditModalOpen}
        onClose={() => setAddEditModalOpen(false)}
        onSave={handleSaveCandidate}
        candidateToEdit={candidateToEdit}
        initialStage={initialStage}
      />
      <CandidateDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
        candidate={candidateToView}
        onEdit={handleOpenEditModal}
        onStageChangeRequest={handleStageChangeRequest}
        onNavigateToTests={handleNavigateToTests}
        onOpenCommunicationModal={handleOpenCommunicationModal}
        onViewResume={handleOpenResumeViewer}
      />
      {user?.isAdmin && (
        <SettingsModal 
            isOpen={isSettingsModalOpen}
            onClose={() => setSettingsModalOpen(false)}
        />
      )}
      {stageChangeInfo && (
        <StageChangeCommunicationModal
          isOpen={!!stageChangeInfo}
          onClose={() => setStageChangeInfo(null)}
          stageChangeInfo={stageChangeInfo}
          onConfirm={handleConfirmStageChange}
        />
      )}
      {communicationConfig.candidate && (
        <CommunicationModal
            isOpen={communicationConfig.isOpen}
            onClose={() => setCommunicationConfig({ isOpen: false, candidate: null })}
            candidate={communicationConfig.candidate}
        />
      )}
      <ResumeViewerModal
        isOpen={resumeViewerState.isOpen}
        onClose={() => setResumeViewerState({ isOpen: false, file: null })}
        file={resumeViewerState.file}
      />
      <BulkCommunicationModal
        isOpen={bulkCommConfig.isOpen}
        onClose={() => setBulkCommConfig({ isOpen: false, candidates: [] })}
        candidates={bulkCommConfig.candidates}
      />
       <AiInsightsModal
        isOpen={isAiInsightsModalOpen}
        onClose={() => setAiInsightsModalOpen(false)}
      />
      <ChangePasswordModal 
        isOpen={isChangePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
    </>
  );
};

export default App;