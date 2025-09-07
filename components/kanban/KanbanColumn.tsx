import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { StageId, Candidate } from '../../types';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
  id: StageId;
  title: string;
  candidates: Candidate[];
  onViewDetails: (candidate: Candidate) => void;
  onEdit: (candidate: Candidate) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, candidates, onViewDetails, onEdit }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="w-[320px] flex-shrink-0">
      <div className="bg-gray-200/80 backdrop-blur-sm rounded-xl p-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-extrabold text-gray-700">{title}</h2>
          <span className="bg-gray-300 text-gray-700 font-bold text-sm px-2 py-1 rounded-full">{candidates.length}</span>
        </div>
        <div 
          ref={setNodeRef} 
          className={`kanban-cards flex-grow overflow-y-auto pr-2 -mr-2 ${isOver ? 'bg-[var(--color-primary-100)]' : ''} rounded-lg transition-colors duration-200 min-h-[200px]`}
        >
          {candidates.map((candidate) => (
            <KanbanCard key={candidate.id} candidate={candidate} onViewDetails={onViewDetails} onEdit={onEdit} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default KanbanColumn;
