import React, { useState } from 'react';
import { 
  DndContext, 
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { useSettings } from '../../contexts/SettingsContext';
import { Candidate, StageId, StageChangeInfo, KanbanStage } from '../../types';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';

interface KanbanBoardProps {
  candidates: Candidate[];
  onViewDetails: (candidate: Candidate) => void;
  onEdit: (candidate: Candidate) => void;
  onStageChangeRequest: (info: StageChangeInfo) => void;
}

const SortableKanbanColumn: React.FC<{ stage: KanbanStage; children: React.ReactNode }> = ({ stage, children }) => {
    // FIX: Added data property to useSortable to correctly identify this item as a column during drag operations.
    // This provides necessary context for drag-end logic without incorrectly modifying props.
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
        id: stage.id,
        data: {
            type: 'column',
        }
    });
    
    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
    };
    
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`${isDragging ? 'opacity-50' : ''}`}>
            {children}
        </div>
    );
};


const KanbanBoard: React.FC<KanbanBoardProps> = ({ candidates, onViewDetails, onEdit, onStageChangeRequest }) => {
  const { stages, setStageOrder } = useSettings();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  const kanbanStages = stages.filter(s => s.id !== 'archived');

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle Column Dragging
    if (active.data.current?.type === 'column' && over.data.current?.type === 'column') {
      if (activeId !== overId) {
        const oldIndex = kanbanStages.findIndex(s => s.id === activeId);
        const newIndex = kanbanStages.findIndex(s => s.id === overId);
        const reorderedStages = arrayMove(kanbanStages, oldIndex, newIndex);
        setStageOrder(reorderedStages);
      }
      return;
    }

    // Handle Card Dragging
    const candidate = active.data.current?.candidate as Candidate | undefined;
    const newStageId = over.id as StageId;
    const newStage = stages.find(s => s.id === newStageId);

    if (candidate && newStage && candidate.stage !== newStageId) {
      onStageChangeRequest({ candidate, newStage });
    }
  };

  const candidatesByStage = kanbanStages.reduce((acc, stage) => {
    acc[stage.id] = candidates.filter((c) => c.stage === stage.id);
    return acc;
  }, {} as Record<StageId, Candidate[]>);

  const activeCandidate = activeId && activeId.startsWith('cand_') ? candidates.find(c => c.id === activeId) : null;
  const activeStage = activeId && !activeId.startsWith('cand_') ? kanbanStages.find(s => s.id === activeId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="pb-4 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {/* FIX: Removed the problematic .map() which caused a TypeScript error. 
              The drag-and-drop data is now correctly supplied via the useSortable hook in SortableKanbanColumn. */}
          <SortableContext items={kanbanStages} strategy={horizontalListSortingStrategy}>
            {kanbanStages.map((stage) => (
              <SortableKanbanColumn key={stage.id} stage={stage}>
                <KanbanColumn
                  id={stage.id}
                  title={stage.title}
                  candidates={candidatesByStage[stage.id] || []}
                  onViewDetails={onViewDetails}
                  onEdit={onEdit}
                />
              </SortableKanbanColumn>
            ))}
          </SortableContext>
        </div>
      </div>
      <DragOverlay>
        {activeCandidate ? (
          <KanbanCard candidate={activeCandidate} onViewDetails={() => {}} onEdit={() => {}} />
        ) : activeStage ? (
           <KanbanColumn
              id={activeStage.id}
              title={activeStage.title}
              candidates={candidatesByStage[activeStage.id] || []}
              onViewDetails={() => {}}
              onEdit={() => {}}
            />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
