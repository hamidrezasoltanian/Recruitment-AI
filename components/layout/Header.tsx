import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCandidates } from '../../contexts/CandidatesContext';
import { useToast } from '../../contexts/ToastContext';
import { Candidate } from '../../types';
import { migrationService } from '../../services/migrationService';

declare const persianDate: any;

interface HeaderProps {
    onSettingsClick: () => void;
    onAddCandidateClick: () => void;
    onOpenBulkCommModal: (candidates: Candidate[]) => void;
    onChangePasswordClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSettingsClick, onAddCandidateClick, onOpenBulkCommModal, onChangePasswordClick }) => {
  const { user, logout } = useAuth();
  const { candidates, setCandidates } = useCandidates();
  const { addToast } = useToast();
  const restoreInputRef = React.useRef<HTMLInputElement>(null);

  const handleBackup = () => {
    if (candidates.length === 0) {
      addToast('هیچ داده‌ای برای پشتیبان‌گیری وجود ندارد.', 'error');
      return;
    }
    const appVersion = process.env.APP_VERSION || '1.1.0';
    const backupData = {
        version: appVersion,
        createdAt: new Date().toISOString(),
        candidates: candidates
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().slice(0, 10);
    link.download = `recruitment_backup_v${appVersion}_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('پشتیبان‌گیری با موفقیت انجام شد.', 'success');
  };

  const handleRestoreClick = () => {
    restoreInputRef.current?.click();
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error('File content is not valid');
        
        const data = JSON.parse(text);
        let candidatesToRestore: Candidate[];
        let backupVersion = '1.0.0'; // Default for old format

        if (Array.isArray(data)) {
            // Old backup format: just an array of candidates
            candidatesToRestore = data;
        } else if (data && data.candidates && data.version) {
            // New backup format with metadata
            candidatesToRestore = data.candidates;
            backupVersion = data.version;
        } else {
            throw new Error('فرمت فایل پشتیبان ناشناخته است.');
        }

        // Migrate data structure to the current version if needed
        const migratedCandidates = migrationService.migrate(candidatesToRestore, backupVersion);

        // Basic validation after potential migration
        if (!Array.isArray(migratedCandidates) || !migratedCandidates.every(c => c.id && c.name && c.stage)) {
            throw new Error('فایل پشتیبان پس از مهاجرت، معتبر نیست.');
        }

        setCandidates(migratedCandidates);
        // Toast is shown within the setCandidates function from the context
        
      } catch (error: any) {
        addToast(error.message || 'خطا در بازیابی فایل. لطفاً از معتبر بودن فایل اطمینان حاصل کنید.', 'error');
        console.error("Restore error:", error);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };
  
  // Helper function to convert Persian/Arabic numerals to Latin, making date parsing reliable.
  const toLatinDigits = (s: string) => {
    if (!s) return '';
    return s.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
            .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  };

  const handleBulkReminder = () => {
    try {
        // Use string comparison for robustness, as persianDate object comparison can be tricky.
        const todayStr = new persianDate().format('YYYY/MM/DD');
        const tomorrowStr = new persianDate().add('days', 1).format('YYYY/MM/DD');

        const nonActiveStages = ['hired', 'rejected', 'archived'];

        const upcomingInterviews = candidates.filter(c => {
            if (!c.interviewDate || nonActiveStages.includes(c.stage)) {
                return false;
            }
            try {
                // 1. Convert any non-Latin digits to Latin digits.
                const latinDateStr = toLatinDigits(c.interviewDate);

                // 2. Parse the cleaned string into a date object.
                const interviewPDate = new persianDate(latinDateStr.split('/').map(Number));
                
                // 3. Format it to a standard YYYY/MM/DD format for reliable comparison.
                const formattedInterviewDate = interviewPDate.format('YYYY/MM/DD');

                // 4. Compare strings.
                return formattedInterviewDate === todayStr || formattedInterviewDate === tomorrowStr;
            } catch (e) {
                // This catch block will handle errors if the date string is fundamentally malformed (e.g., "abc/def/ghi").
                console.error(`Could not parse date for candidate ${c.name}: '${c.interviewDate}'`, e);
                return false;
            }
        });

        if (upcomingInterviews.length > 0) {
            onOpenBulkCommModal(upcomingInterviews);
        } else {
            addToast('هیچ مصاحبه‌ای برای امروز یا فردا وجود ندارد.', 'success');
        }
    } catch (e) {
        console.error("Error in handleBulkReminder:", e);
        addToast('خطا در بررسی یادآورها.', 'error');
    }
  };


  return (
    <header className="bg-white shadow-md p-4 flex flex-wrap justify-between items-center sticky top-0 z-30 gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">داشبورد استخدام</h1>
        <button onClick={onAddCandidateClick} className="text-sm bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            <span>افزودن سریع</span>
        </button>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={handleBulkReminder} className="text-sm bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">یادآور گروهی</button>
        <button onClick={handleBackup} className="text-sm bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">پشتیبان‌گیری</button>
        <input type="file" id="restore-input" ref={restoreInputRef} className="hidden" accept=".json" onChange={handleRestore} />
        <button onClick={handleRestoreClick} className="text-sm bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">بازیابی</button>
      </div>
      
      <div className="flex items-center gap-4">
        {user && <span className="text-sm text-gray-600 font-medium">خوش آمدید، {user.name}</span>}
        <button onClick={onChangePasswordClick} className="text-sm text-gray-600 hover:text-gray-900 font-medium p-2 rounded-lg hover:bg-gray-100 transition-colors">تغییر رمز</button>
        {user?.isAdmin && (
            <button onClick={onSettingsClick} className="text-sm bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">تنظیمات</button>
        )}
        <button onClick={logout} className="text-sm bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">خروج</button>
      </div>
    </header>
  );
};

export default Header;
