import React from 'react';
import { View } from '../../types';

interface TabsProps {
  activeView: View;
  setActiveView: (view: View) => void;
}

const Tabs: React.FC<TabsProps> = ({ activeView, setActiveView }) => {
  const tabs: { id: View; label: string }[] = [
    { id: 'dashboard', label: 'داشبورد' },
    { id: 'tests', label: 'آزمون‌ها' },
    { id: 'calendar', label: 'تقویم' },
    { id: 'archive', label: 'آرشیو' },
  ];

  const baseClasses = 'whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200';
  const activeClasses = 'border-[var(--color-primary-500)] text-[var(--color-primary-600)]';
  const inactiveClasses = 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';

  return (
    <div className="px-4 md:px-6 lg:px-8 pt-4 bg-white/50 backdrop-blur-sm">
      <nav className="-mb-px flex space-x-4 space-x-reverse" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`${baseClasses} ${activeView === tab.id ? activeClasses : inactiveClasses}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;