import React, { useState, useMemo } from 'react';
import { useCandidates } from '../../contexts/CandidatesContext';
import { Candidate } from '../../types';
import { getJobColor } from '../../utils/colorUtils';

// Let TypeScript know about the global persianDate object
declare const persianDate: any;

interface CalendarViewProps {
  onViewDetails: (candidate: Candidate) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onViewDetails }) => {
  const { candidates } = useCandidates();
  const [currentDate, setCurrentDate] = useState(() => new persianDate());

  const candidatesWithInterview = useMemo(() => 
    candidates.filter(c => c.interviewDate && (c.stage.includes('interview') || c.stage === 'hired')),
    [candidates]
  );

  const monthData = useMemo(() => {
    const month = currentDate.month();
    const year = currentDate.year();
    const firstDay = new persianDate([year, month, 1]);
    const lastDay = new persianDate([year, month]).daysInMonth();
    const firstDayOfWeek = firstDay.day(); // 0:Shanbeh, ..., 6:Jomeh
    
    const days = Array.from({ length: lastDay }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => i);

    return { year, month, days, blanks };
  }, [currentDate]);

  const changeMonth = (amount: number) => {
    setCurrentDate(currentDate.clone().add('months', amount));
  };
  
  const getCandidatesForDay = (day: number) => {
      const dateStr = `${monthData.year}/${String(monthData.month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
      return candidatesWithInterview
        .filter(c => c.interviewDate === dateStr)
        .sort((a, b) => {
          // Sort by interview time, putting candidates without a time at the end
          if (a.interviewTime && b.interviewTime) {
            return a.interviewTime.localeCompare(b.interviewTime);
          }
          return a.interviewTime ? -1 : 1;
        });
  };

  const weekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <h2 className="text-xl font-bold text-gray-800">{currentDate.format('MMMM YYYY')}</h2>
        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map(day => <div key={day} className="font-bold text-gray-600 p-2">{day}</div>)}
        {monthData.blanks.map(blank => <div key={`blank-${blank}`} className="border rounded-md border-gray-100"></div>)}
        {monthData.days.map(day => {
            const dayCandidates = getCandidatesForDay(day);
            const isToday = new persianDate().format('YYYY/MM/DD') === `${monthData.year}/${String(monthData.month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
            return (
                <div key={day} className="border rounded-md border-gray-200 bg-gray-50 p-2 min-h-[120px] flex flex-col">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm ${isToday ? 'bg-[var(--color-primary-600)] text-white font-bold' : ''}`}>{day}</span>
                    <div className="flex-grow mt-1 space-y-1 overflow-y-auto kanban-cards pr-1"> {/* Re-using kanban-cards for custom scrollbar */}
                        {dayCandidates.map(c => {
                          const jobColor = getJobColor(c.position);
                          return (
                            <div 
                              key={c.id} 
                              onClick={() => onViewDetails(c)} 
                              className="bg-white text-right p-1.5 rounded-md cursor-pointer hover:shadow-md transition-shadow border-r-4"
                              style={{ borderColor: jobColor }}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-800 truncate pr-1">{c.name}</span>
                                    {c.interviewTime && <span className="text-xs font-semibold text-white bg-[var(--color-primary-500)] px-1.5 py-0.5 rounded">{c.interviewTime}</span>}
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1 truncate pr-1">{c.position}</p>
                            </div>
                          )
                        })}
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
};

export default CalendarView;