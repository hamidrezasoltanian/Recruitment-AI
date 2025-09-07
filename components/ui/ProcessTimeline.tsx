import React from 'react';
import { DndContext, useDraggable, useDroppable, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { KanbanStage, Candidate, StageChangeInfo } from '../../types';
import { UserIcon } from './Icons';

interface ProcessTimelineProps {
    stages: KanbanStage[];
    candidate: Candidate;
    onStageChangeRequest: (info: StageChangeInfo) => void;
}

const DraggableCandidate: React.FC<{ candidateId: string }> = ({ candidateId }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `timeline-drag-${candidateId}`,
    });
    
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`z-20 cursor-grab ${isDragging ? 'opacity-50' : ''}`}>
             <UserIcon className="h-8 w-8 text-white bg-[var(--color-primary-600)] p-1 rounded-full shadow-lg" />
        </div>
    );
};

const StageDropzone: React.FC<{ stage: KanbanStage, isCurrent: boolean, isFirst: boolean, isLast: boolean }> = ({ stage, isCurrent, isFirst, isLast }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: stage.id,
    });
    return (
        <div ref={setNodeRef} className="relative flex-1 flex flex-col items-center">
            {/* Line */}
            <div className={`absolute top-4 w-full h-1 ${isCurrent || isOver ? 'bg-[var(--color-primary-500)]' : 'bg-gray-300'} 
                ${isFirst ? 'right-1/2' : ''} ${isLast ? 'left-1/2' : ''}`}>
            </div>
            {/* Circle */}
            <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center transition-colors
                ${isCurrent ? 'bg-[var(--color-primary-600)] ring-4 ring-[var(--color-primary-200)]' : 'bg-gray-300'}
                ${isOver ? 'bg-green-400' : ''}
            `}>
                {isCurrent && <DraggableCandidate candidateId={stage.id} />}
            </div>
            <p className="text-xs text-center mt-2 font-medium w-20 truncate">{stage.title}</p>
        </div>
    );
};


const ProcessTimeline: React.FC<ProcessTimelineProps> = ({ stages, candidate, onStageChangeRequest }) => {
    
    const sensors = useSensors(
        useSensor(PointerSensor, {
          activationConstraint: {
            distance: 5,
          },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { over } = event;
        if (over) {
            const newStageId = over.id as string;
            const currentStageId = candidate.stage;
            
            if (newStageId !== currentStageId) {
                const newStage = stages.find(s => s.id === newStageId);
                if (newStage) {
                    onStageChangeRequest({ candidate, newStage });
                }
            }
        }
    };
    
    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex justify-between items-start pt-4">
                {stages.map((stage, index) => (
                    <StageDropzone 
                        key={stage.id} 
                        stage={stage} 
                        isCurrent={candidate.stage === stage.id}
                        isFirst={index === 0}
                        isLast={index === stages.length - 1}
                    />
                ))}
            </div>
        </DndContext>
    );
};

export default ProcessTimeline;