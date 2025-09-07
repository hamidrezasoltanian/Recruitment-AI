import React, { useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import { useCandidates } from '../../contexts/CandidatesContext';

interface SelectCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (candidateId: string) => void;
}

const SelectCandidateModal: React.FC<SelectCandidateModalProps> = ({ isOpen, onClose, onSelect }) => {
  const { candidates } = useCandidates();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.position.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [candidates, searchTerm]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="انتخاب متقاضی">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="جستجوی نام یا موقعیت شغلی..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
        />
        <div className="max-h-80 overflow-y-auto space-y-2">
          {filteredCandidates.length > 0 ? (
            filteredCandidates.map(candidate => (
              <div
                key={candidate.id}
                onClick={() => onSelect(candidate.id)}
                className="p-3 bg-gray-100 rounded-md hover:bg-indigo-100 cursor-pointer"
              >
                <p className="font-bold">{candidate.name}</p>
                <p className="text-sm text-gray-600">{candidate.position}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">متقاضی یافت نشد.</p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SelectCandidateModal;
