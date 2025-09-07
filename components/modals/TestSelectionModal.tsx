import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { useSettings } from '../../contexts/SettingsContext';
import { useCandidates } from '../../contexts/CandidatesContext';
import { useToast } from '../../contexts/ToastContext';
import { EmailIcon, WhatsappIcon } from '../ui/Icons';

interface TestSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
}

const TestSelectionModal: React.FC<TestSelectionModalProps> = ({ isOpen, onClose, candidateId }) => {
  const { testLibrary } = useSettings();
  const { candidates, updateTestResult } = useCandidates();
  const { addToast } = useToast();
  
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [deadlineHours, setDeadlineHours] = useState('48');

  const candidate = candidates.find(c => c.id === candidateId);

  const handleTestSelection = (testId: string) => {
    setSelectedTestIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  };

  const handleSend = async (platform: 'email' | 'whatsapp') => {
    if (!candidate) return;
    if (selectedTestIds.size === 0) {
      addToast('لطفا حداقل یک آزمون را انتخاب کنید.', 'error');
      return;
    }

    const selectedTests = testLibrary.filter(t => selectedTestIds.has(t.id));
    
    let body = `سلام ${candidate.name}،\nلطفاً آزمون‌های زیر را انجام دهید:\n\n`;
    selectedTests.forEach(test => { body += `- ${test.name}:\n${test.url}\n\n`; });
    if (deadlineHours) { body += `مهلت شما برای انجام این آزمون‌ها ${deadlineHours} ساعت می‌باشد.\n`; }
    body += `مهم: لطفاً نتیجه را به ایمیل ما ارسال فرمایید.\n\nبا تشکر`;

    if (platform === 'email') {
      window.location.href = `mailto:${candidate.email}?subject=آزمون‌های استخدامی&body=${encodeURIComponent(body)}`;
    } else if (platform === 'whatsapp') {
      const whatsappNumber = candidate.phone ? candidate.phone.replace(/[^0-9]/g, '').replace(/^0/, '98') : '';
      if (whatsappNumber) {
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(body)}`, '_blank');
      } else {
        addToast("شماره واتس‌اپ برای این متقاضی ثبت نشده.", "error");
        return;
      }
    }

    // Update candidate data sequentially to ensure each save completes
    const sentDate = new Date().toISOString();
    for (const testId of selectedTestIds) {
      await updateTestResult(candidate.id, testId, {
        status: 'pending',
        sentDate,
        deadlineHours: deadlineHours ? parseInt(deadlineHours) : undefined,
      });
    }

    addToast(`${selectedTestIds.size} آزمون برای متقاضی ارسال شد.`, 'success');
    onClose();
  };

  if (!candidate) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`ارسال آزمون برای ${candidate.name}`}>
      <div className="space-y-6">
        <div>
          <h4 className="font-bold mb-2">آزمون‌های موجود</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 bg-gray-50 rounded-md">
            {testLibrary.map(test => (
              <label key={test.id} className="flex items-center space-x-2 space-x-reverse p-2 hover:bg-gray-200 rounded-md cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTestIds.has(test.id)}
                  onChange={() => handleTestSelection(test.id)}
                  className="h-4 w-4 text-[var(--color-primary-600)] border-gray-300 rounded focus:ring-[var(--color-primary-500)]"
                />
                <span>{test.name}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div>
          <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">مهلت انجام (به ساعت)</label>
          <input
            type="number"
            id="deadline"
            value={deadlineHours}
            onChange={e => setDeadlineHours(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] sm:text-sm"
          />
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 py-2 px-6 rounded-lg hover:bg-gray-300">انصراف</button>
          <button type="button" onClick={() => handleSend('whatsapp')} className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
            <WhatsappIcon className="h-5 w-5" />
            <span>ارسال با واتس‌اپ</span>
          </button>
          <button type="button" onClick={() => handleSend('email')} className="bg-[var(--color-primary-600)] text-white py-2 px-6 rounded-lg hover:bg-[var(--color-primary-700)] flex items-center justify-center gap-2">
            <EmailIcon className="h-5 w-5" />
            <span>ارسال با ایمیل</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TestSelectionModal;