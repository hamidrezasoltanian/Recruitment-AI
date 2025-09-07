import React from 'react';
import { useCandidates } from '../../contexts/CandidatesContext';
import { Candidate } from '../../types';
import StarRating from '../ui/StarRating';

interface ArchiveViewProps {
  onViewDetails: (candidate: Candidate) => void;
}

const ArchiveView: React.FC<ArchiveViewProps> = ({ onViewDetails }) => {
  const { candidates, unarchiveCandidate } = useCandidates();

  const archivedCandidates = candidates.filter(c => c.stage === 'archived');

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">آرشیو متقاضیان</h2>
      {archivedCandidates.length === 0 ? (
        <p className="text-center text-gray-500 py-10">هیچ متقاضی آرشیو شده‌ای وجود ندارد.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">منبع</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">امتیاز</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {archivedCandidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{candidate.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{candidate.source}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StarRating rating={candidate.rating} readOnly />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4 space-x-reverse">
                    <button onClick={() => onViewDetails(candidate)} className="text-[var(--color-primary-600)] hover:text-[var(--color-primary-900)]">مشاهده جزئیات</button>
                    <button onClick={() => unarchiveCandidate(candidate.id)} className="text-green-600 hover:text-green-900">خروج از آرشیو</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ArchiveView;