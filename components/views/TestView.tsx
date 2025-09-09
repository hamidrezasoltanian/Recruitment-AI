import React, { useState, useEffect, useMemo } from 'react';
import { useCandidates } from '../../contexts/CandidatesContext';
import { useSettings } from '../../contexts/SettingsContext';
import { TestResult, TestLibraryItem } from '../../types';
import { dbService } from '../../services/dbService';
import { useToast } from '../../contexts/ToastContext';
import SelectCandidateModal from '../modals/SelectCandidateModal';
import TestSelectionModal from '../modals/TestSelectionModal';
import { aiService } from '../../services/aiService';
import { SparklesIcon } from '../ui/Icons';

interface TestResultGroupProps {
  test: TestLibraryItem;
  result: TestResult | undefined;
  candidateId: string;
}

const TestResultGroup: React.FC<TestResultGroupProps> = ({ test, result, candidateId }) => {
    const { updateTestResult } = useCandidates();
    const { geminiApiKey } = useSettings();
    const { addToast } = useToast();

    const [score, setScore] = useState(result?.score || '');
    const [notes, setNotes] = useState(result?.notes || '');
    const [status, setStatus] = useState(result?.status || 'not_sent');
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const apiKeySet = !!geminiApiKey;

    const testFileId = `${candidateId}_${test.id}`;

    useEffect(() => {
        const loadPreview = async () => {
            if (result?.file) {
                try {
                    const fileBlob = await dbService.getTestFile(testFileId);
                    if (fileBlob) {
                        setFilePreview(URL.createObjectURL(fileBlob));
                    }
                } catch (e) {
                    console.error("Failed to load test file preview", e);
                }
            } else {
                setFilePreview(null);
            }
        };
        loadPreview();
        // Clean up object URL
        return () => {
            if (filePreview) {
                URL.revokeObjectURL(filePreview);
            }
        }
    }, [result?.file, testFileId]);
    
    // Update local state if result prop changes
    useEffect(() => {
        setScore(result?.score || '');
        setNotes(result?.notes || '');
        setStatus(result?.status || 'not_sent');
    }, [result]);


    const handleSave = (newStatus?: TestResult['status']) => {
        const resultData: Partial<TestResult> = {
            score: score ? Number(score) : undefined,
            notes,
            status: newStatus || status,
        };
        updateTestResult(candidateId, test.id, resultData);
        // Toast is shown in context
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                await dbService.saveTestFile(testFileId, file);
                await updateTestResult(candidateId, test.id, {
                    file: { name: file.name, type: file.type },
                    status: 'review' // Automatically set status to review on upload
                });
                addToast(`فایل آپلود و وضعیت به "نیاز به بررسی" تغییر کرد.`, 'success');
                if (filePreview) URL.revokeObjectURL(filePreview);
                setFilePreview(URL.createObjectURL(file));
            } catch (err) {
                addToast('خطا در ذخیره فایل آزمون.', 'error');
            }
        }
    };

    const handleAnalyze = async () => {
        if (!geminiApiKey) return;
        setIsAnalyzing(true);
        addToast('در حال تحلیل با هوش مصنوعی...', 'success');
        try {
            let summary: string;
            if (result?.file) {
                const file = await dbService.getTestFile(testFileId);
                if (!file) throw new Error('فایل نتیجه آزمون یافت نشد.');
                summary = await aiService.summarizeTestResult(geminiApiKey, file);
            } else {
                summary = await aiService.summarizeTestLink(geminiApiKey, test.name, test.url);
            }
            await updateTestResult(candidateId, test.id, { aiSummary: summary });
            addToast('تحلیل با موفقیت ایجاد و ذخیره شد.', 'success');
        } catch (error: any) {
            addToast(error.message || 'خطا در تحلیل.', 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const statusClasses: Record<string, string> = {
        not_sent: 'bg-gray-100 text-gray-800',
        pending: 'bg-yellow-100 text-yellow-800',
        passed: 'bg-green-100 text-green-800',
        failed: 'bg-red-100 text-red-800',
        review: 'bg-blue-100 text-blue-800',
    };

    const statusText: Record<string, string> = {
        not_sent: 'ارسال نشده',
        pending: 'در انتظار نتیجه',
        passed: 'قبول',
        failed: 'مردود',
        review: 'نیاز به بررسی',
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-bold text-lg mb-3">{test.name}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">وضعیت</label>
                    <select 
                        value={status} 
                        onChange={e => {
                            const newStatus = e.target.value as TestResult['status'];
                            setStatus(newStatus);
                            handleSave(newStatus);
                        }}
                        className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] ${statusClasses[status]}`}>
                        <option value="not_sent">{statusText.not_sent}</option>
                        <option value="pending">{statusText.pending}</option>
                        <option value="passed">{statusText.passed}</option>
                        <option value="failed">{statusText.failed}</option>
                        <option value="review">{statusText.review}</option>
                    </select>
                </div>

                {/* Score */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">نمره</label>
                    <input type="number" value={score} onChange={e => setScore(e.target.value)} onBlur={() => handleSave()} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" />
                </div>
                
                {/* File Upload / Preview */}
                 <div>
                    <label className="block text-sm font-medium text-gray-700">فایل نتیجه (PDF)</label>
                    {filePreview ? (
                        <div className="mt-1">
                            <a href={filePreview} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary-600)] hover:underline truncate block">
                                {result?.file?.name}
                            </a>
                        </div>
                    ) : (
                        <input type="file" onChange={handleFileChange} accept=".pdf" className="mt-1 text-sm text-gray-500 w-full file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary-50)] file:text-[var(--color-primary-700)] hover:file:bg-[var(--color-primary-100)]"/>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-end justify-end gap-2">
                     <button onClick={handleAnalyze} disabled={isAnalyzing || !apiKeySet} title={!apiKeySet ? "ویژگی هوش مصنوعی غیرفعال است. لطفاً کلید API را تنظیم کنید." : "تحلیل با هوش مصنوعی"} className="p-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed">
                       <SparklesIcon className="h-5 w-5"/>
                    </button>
                </div>

                {/* Notes */}
                <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block text-sm font-medium text-gray-700">یادداشت</label>
                    <input type="text" value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => handleSave()} placeholder="تحلیل یا نکات کلیدی..." className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" />
                </div>
            </div>

            {/* AI Summary Display */}
            {result?.aiSummary && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="text-sm font-bold text-purple-800 mb-2 flex items-center gap-2">
                        <SparklesIcon className="h-4 w-4" />
                        خلاصه تحلیل AI
                    </h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.aiSummary}</p>
                </div>
            )}
        </div>
    )
}

interface TestViewProps {
  initialExpandedCandidateId: string | null;
}

const TestView: React.FC<TestViewProps> = ({ initialExpandedCandidateId }) => {
  const { candidates } = useCandidates();
  const { testLibrary } = useSettings();
  
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(initialExpandedCandidateId);
  const [isSelectCandidateModalOpen, setSelectCandidateModalOpen] = useState(false);
  const [candidateToSendTest, setCandidateToSendTest] = useState<string | null>(null);
  
  useEffect(() => {
    setExpandedCandidateId(initialExpandedCandidateId);
  }, [initialExpandedCandidateId]);

  const candidatesWithSentTests = useMemo(() => {
    const activeStages = ['hired', 'rejected', 'archived'];
    return candidates.filter(c => {
        const hasSentTest = c.testResults?.some(r => r.status !== 'not_sent');
        return hasSentTest && !activeStages.includes(c.stage)
    });
  }, [candidates]);
  
  const handleSelectCandidateForNewTest = (candidateId: string) => {
    setCandidateToSendTest(candidateId);
    setSelectCandidateModalOpen(false);
  };
  
  const toggleExpand = (candidateId: string) => {
    setExpandedCandidateId(prevId => prevId === candidateId ? null : candidateId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">مدیریت آزمون‌ها</h2>
          <p className="text-sm text-gray-500">مشاهده و ثبت نتایج آزمون‌های ارسال شده برای متقاضیان فعال.</p>
        </div>
        <div>
          <button 
            onClick={() => setSelectCandidateModalOpen(true)} 
            className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600"
          >
            ارسال آزمون به متقاضی
          </button>
        </div>
      </div>

      {candidatesWithSentTests.length === 0 ? (
        <div className="text-center p-10 bg-white rounded-lg shadow-sm">
          <h3 className="text-xl font-bold text-gray-700">هیچ آزمونی ارسال نشده است</h3>
          <p className="mt-2 text-gray-500">برای ارسال آزمون به یک متقاضی، از دکمه "ارسال آزمون به متقاضی" استفاده کنید.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {candidatesWithSentTests.map(candidate => {
            const sentTests = candidate.testResults?.filter(r => r.status !== 'not_sent') || [];
            const pendingCount = sentTests.filter(r => r.status === 'pending').length;
            const totalSentCount = sentTests.length;

            return (
              <div key={candidate.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div 
                  onClick={() => toggleExpand(candidate.id)} 
                  className="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-lg text-[var(--color-primary-700)]">{candidate.name}</p>
                    <p className="text-sm text-gray-600">{candidate.position}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700">
                      {totalSentCount} آزمون ارسال شده
                      {pendingCount > 0 && ` (${pendingCount} در انتظار)`}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 transition-transform ${expandedCandidateId === candidate.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                {expandedCandidateId === candidate.id && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-4">
                    {testLibrary.length > 0 ? (
                        testLibrary.map(testItem => {
                            const result = candidate.testResults?.find(r => r.testId === testItem.id);
                            // Only show if test has been sent
                            if (result?.status !== 'not_sent') {
                                return (
                                    <TestResultGroup
                                        key={testItem.id}
                                        test={testItem}
                                        result={result}
                                        candidateId={candidate.id}
                                    />
                                );
                            }
                            return null;
                        })
                    ) : (
                        <p className="text-center text-gray-500 py-4">هیچ آزمونی در کتابخانه آزمون‌ها تعریف نشده است. لطفاً از تنظیمات اضافه کنید.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      <SelectCandidateModal
        isOpen={isSelectCandidateModalOpen}
        onClose={() => setSelectCandidateModalOpen(false)}
        onSelect={handleSelectCandidateForNewTest}
      />
      {candidateToSendTest && (
        <TestSelectionModal
          isOpen={!!candidateToSendTest}
          onClose={() => setCandidateToSendTest(null)}
          candidateId={candidateToSendTest}
        />
      )}
    </div>
  );
};

export default TestView;