import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Template } from '../types';
import { DEFAULT_TEMPLATES, TEMPLATES_KEY } from '../constants';
import { useToast } from './ToastContext';

interface TemplateContextType {
  templates: Template[];
  addTemplate: (template: Omit<Template, 'id'>) => void;
  updateTemplate: (template: Template) => void;
  deleteTemplate: (id: string) => void;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

export const useTemplates = () => {
  const context = useContext(TemplateContext);
  if (!context) throw new Error('useTemplates must be used within a TemplateProvider');
  return context;
};

export const TemplateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [templates, setTemplates] = useState<Template[]>(() => {
    try {
      const storedTemplates = localStorage.getItem(TEMPLATES_KEY);
      return storedTemplates ? JSON.parse(storedTemplates) : DEFAULT_TEMPLATES;
    } catch (error) {
      console.error("Failed to load templates from localStorage", error);
      return DEFAULT_TEMPLATES;
    }
  });
  const { addToast } = useToast();

  useEffect(() => {
    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    } catch (error) {
      console.error("Failed to save templates to localStorage", error);
    }
  }, [templates]);

  const addTemplate = (templateData: Omit<Template, 'id'>) => {
    if (!templateData.name.trim() || !templateData.content.trim()) {
      addToast('نام و محتوای قالب نمی‌تواند خالی باشد.', 'error');
      return;
    }
    const newTemplate: Template = {
      id: `tpl_${Date.now()}`,
      ...templateData,
    };
    setTemplates(prev => [...prev, newTemplate]);
    addToast(`قالب "${newTemplate.name}" اضافه شد.`, 'success');
  };

  const updateTemplate = (updatedTemplate: Template) => {
    if (!updatedTemplate.name.trim() || !updatedTemplate.content.trim()) {
      addToast('نام و محتوای قالب نمی‌تواند خالی باشد.', 'error');
      return;
    }
    setTemplates(prev => prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
    addToast(`قالب "${updatedTemplate.name}" به‌روزرسانی شد.`, 'success');
  };

  const deleteTemplate = (id: string) => {
    const templateToDelete = templates.find(t => t.id === id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (templateToDelete) {
        addToast(`قالب "${templateToDelete.name}" حذف شد.`, 'success');
    }
  };
  
  const value = { templates, addTemplate, updateTemplate, deleteTemplate };

  return <TemplateContext.Provider value={value}>{children}</TemplateContext.Provider>;
};
