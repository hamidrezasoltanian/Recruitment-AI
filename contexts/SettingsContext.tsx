import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DEFAULT_SOURCES, SETTINGS_KEY_SOURCES, COMPANY_PROFILE_KEY, DEFAULT_COMPANY_PROFILE, STAGES_KEY, DEFAULT_STAGES, TEST_LIBRARY_KEY, DEFAULT_TEST_LIBRARY } from '../constants';
import { CompanyProfile, JobPosition, KanbanStage, TestLibraryItem } from '../types';
import { useToast } from './ToastContext';

interface SettingsContextType {
  sources: string[];
  addSource: (source: string) => void;
  deleteSource: (source: string) => void;
  stages: KanbanStage[];
  setStageOrder: (orderedStages: KanbanStage[]) => void;
  addStage: (title: string) => void;
  updateStage: (id: string, title: string) => void;
  deleteStage: (id: string) => void;
  companyProfile: CompanyProfile;
  updateCompanyDetails: (details: Partial<Omit<CompanyProfile, 'jobPositions'>>) => void;
  addJobPosition: (title: string) => void;
  updateJobPosition: (id: string, title: string) => void;
  deleteJobPosition: (id: string) => void;
  testLibrary: TestLibraryItem[];
  addTest: (test: Omit<TestLibraryItem, 'id'>) => void;
  updateTest: (test: TestLibraryItem) => void;
  deleteTest: (id: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { addToast } = useToast();

  const [sources, setSources] = useState<string[]>(() => {
    try {
      const storedSources = localStorage.getItem(SETTINGS_KEY_SOURCES);
      return storedSources ? JSON.parse(storedSources) : DEFAULT_SOURCES;
    } catch (error) {
      console.error("Failed to load sources from localStorage", error);
      return DEFAULT_SOURCES;
    }
  });

  const [stages, setStages] = useState<KanbanStage[]>(() => {
    try {
      const storedStages = localStorage.getItem(STAGES_KEY);
      return storedStages ? JSON.parse(storedStages) : DEFAULT_STAGES;
    } catch (error) {
      console.error("Failed to load stages from localStorage", error);
      return DEFAULT_STAGES;
    }
  });

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    try {
      const storedProfile = localStorage.getItem(COMPANY_PROFILE_KEY);
      return storedProfile ? JSON.parse(storedProfile) : DEFAULT_COMPANY_PROFILE;
    } catch (error) {
      console.error("Failed to load company profile from localStorage", error);
      return DEFAULT_COMPANY_PROFILE;
    }
  });

  const [testLibrary, setTestLibrary] = useState<TestLibraryItem[]>(() => {
    try {
        const storedLibrary = localStorage.getItem(TEST_LIBRARY_KEY);
        return storedLibrary ? JSON.parse(storedLibrary) : DEFAULT_TEST_LIBRARY;
    } catch (error) {
        console.error("Failed to load test library from localStorage", error);
        return DEFAULT_TEST_LIBRARY;
    }
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY_SOURCES, JSON.stringify(sources));
  }, [sources]);

  useEffect(() => {
    localStorage.setItem(STAGES_KEY, JSON.stringify(stages));
  }, [stages]);

  useEffect(() => {
    localStorage.setItem(COMPANY_PROFILE_KEY, JSON.stringify(companyProfile));
  }, [companyProfile]);

  useEffect(() => {
    localStorage.setItem(TEST_LIBRARY_KEY, JSON.stringify(testLibrary));
  }, [testLibrary]);

  const addSource = (source: string) => {
    const trimmedSource = source.trim();
    if (trimmedSource && !sources.find(s => s.toLowerCase() === trimmedSource.toLowerCase())) {
      setSources(prev => [...prev, trimmedSource]);
      addToast(`منبع "${trimmedSource}" اضافه شد.`, 'success');
    } else {
      addToast('منبع تکراری یا خالی است.', 'error');
    }
  };

  const deleteSource = (sourceToDelete: string) => {
    setSources(prev => prev.filter(s => s !== sourceToDelete));
    addToast(`منبع "${sourceToDelete}" حذف شد.`, 'success');
  };

  const setStageOrder = (orderedStages: KanbanStage[]) => {
    setStages(orderedStages);
    addToast("ترتیب مراحل ذخیره شد.", "success");
  };

  const addStage = (title: string) => {
    const trimmedTitle = title.trim();
    if (trimmedTitle && !stages.find(s => s.title.toLowerCase() === trimmedTitle.toLowerCase())) {
        const newStage: KanbanStage = {
            id: `stage_${Date.now()}`,
            title: trimmedTitle,
            isCore: false
        };
        setStages(prev => [...prev, newStage]);
        addToast(`مرحله "${trimmedTitle}" اضافه شد.`, 'success');
    } else {
        addToast('عنوان مرحله تکراری یا خالی است.', 'error');
    }
  };

  const updateStage = (id: string, title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
        addToast('عنوان مرحله نمی‌تواند خالی باشد.', 'error');
        return;
    }
    setStages(prev => prev.map(s => s.id === id ? { ...s, title: trimmedTitle } : s));
    addToast('مرحله به‌روزرسانی شد.', 'success');
  };

  const deleteStage = (id: string) => {
      const stageToDelete = stages.find(s => s.id === id);
      if (!stageToDelete) return;
      if (stageToDelete.isCore) {
          addToast('نمی‌توان مراحل اصلی سیستم را حذف کرد.', 'error');
          return;
      }
      setStages(prev => prev.filter(s => s.id !== id));
      addToast(`مرحله "${stageToDelete.title}" حذف شد.`, 'success');
  };

  const updateCompanyDetails = (details: Partial<Omit<CompanyProfile, 'jobPositions'>>) => {
    setCompanyProfile(prev => ({ ...prev, ...details }));
    addToast('اطلاعات شرکت به‌روزرسانی شد.', 'success');
  };

  const addJobPosition = (title: string) => {
    const trimmedTitle = title.trim();
    if (trimmedTitle && !companyProfile.jobPositions.find(j => j.title.toLowerCase() === trimmedTitle.toLowerCase())) {
      const newJob: JobPosition = { id: `job_${Date.now()}`, title: trimmedTitle };
      setCompanyProfile(prev => ({ ...prev, jobPositions: [...prev.jobPositions, newJob] }));
      addToast(`موقعیت شغلی "${trimmedTitle}" اضافه شد.`, 'success');
    } else {
      addToast('موقعیت شغلی تکراری یا خالی است.', 'error');
    }
  };

  const updateJobPosition = (id: string, title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      addToast('عنوان نمی‌تواند خالی باشد.', 'error');
      return;
    }
    setCompanyProfile(prev => ({
      ...prev,
      jobPositions: prev.jobPositions.map(j => j.id === id ? { ...j, title: trimmedTitle } : j),
    }));
    addToast('موقعیت شغلی به‌روزرسانی شد.', 'success');
  };

  const deleteJobPosition = (id: string) => {
    setCompanyProfile(prev => ({
      ...prev,
      jobPositions: prev.jobPositions.filter(j => j.id !== id),
    }));
    addToast('موقعیت شغلی حذف شد.', 'success');
  };
  
  const addTest = (test: Omit<TestLibraryItem, 'id'>) => {
    if (!test.name.trim() || !test.url.trim()) {
        addToast("نام و لینک آزمون نمی‌تواند خالی باشد.", 'error');
        return;
    }
    const newTest = { ...test, id: `test_${Date.now()}` };
    setTestLibrary(prev => [...prev, newTest]);
    addToast(`آزمون "${test.name}" اضافه شد.`, 'success');
  };

  const updateTest = (updatedTest: TestLibraryItem) => {
    if (!updatedTest.name.trim() || !updatedTest.url.trim()) {
        addToast("نام و لینک آزمون نمی‌تواند خالی باشد.", 'error');
        return;
    }
    setTestLibrary(prev => prev.map(t => t.id === updatedTest.id ? updatedTest : t));
    addToast(`آزمون "${updatedTest.name}" به‌روزرسانی شد.`, 'success');
  };

  const deleteTest = (id: string) => {
    setTestLibrary(prev => prev.filter(t => t.id !== id));
    addToast("آزمون حذف شد.", 'success');
  };

  const value = { sources, addSource, deleteSource, stages, setStageOrder, addStage, updateStage, deleteStage, companyProfile, updateCompanyDetails, addJobPosition, updateJobPosition, deleteJobPosition, testLibrary, addTest, updateTest, deleteTest };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};