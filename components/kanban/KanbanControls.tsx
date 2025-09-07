import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';

interface KanbanControlsProps {
  filters: { search: string; position: string; source: string; };
  onFilterChange: (newFilters: Partial<{ search: string; position: string; source: string; }>) => void;
  sortBy: string;
  onSortChange: (newSortBy: string) => void;
}

const KanbanControls: React.FC<KanbanControlsProps> = ({ filters, onFilterChange, sortBy, onSortChange }) => {
  const { sources, companyProfile } = useSettings();
  const jobPositions = companyProfile.jobPositions;

  return (
    <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
      <input
        type="text"
        placeholder="جستجوی نام..."
        value={filters.search}
        onChange={(e) => onFilterChange({ search: e.target.value })}
        className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] sm:text-sm"
      />
      <select
        value={filters.position}
        onChange={(e) => onFilterChange({ position: e.target.value })}
        className="w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] sm:text-sm"
      >
        <option value="">همه موقعیت‌ها</option>
        {jobPositions.map(job => <option key={job.id} value={job.title}>{job.title}</option>)}
      </select>
      <select
        value={filters.source}
        onChange={(e) => onFilterChange({ source: e.target.value })}
        className="w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] sm:text-sm"
      >
        <option value="">همه منابع</option>
        {sources.map(source => <option key={source} value={source}>{source}</option>)}
      </select>
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] sm:text-sm"
      >
        <option value="createdAt">جدیدترین</option>
        <option value="name">نام (الفبا)</option>
        <option value="rating">بیشترین امتیاز</option>
      </select>
    </div>
  );
};

export default KanbanControls;
