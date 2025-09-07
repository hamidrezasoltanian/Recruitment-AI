import React, { useState, useEffect, useRef } from 'react';
import { Candidate, StageId } from '../../types';
import { DEFAULT_SOURCES } from '../../constants';
import Modal from '../ui/Modal';
import StarRating from '../ui/StarRating';
import { useSettings } from '../../contexts/SettingsContext';
import KamaDatePicker from '../ui/KamaDatePicker';
import { aiService } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';

interface AddEditCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (candidate: Candidate, resumeFile?: File) => void;
  candidateToEdit?: Candidate | null;
  initialStage?: StageId;
}

const AddEditCandidateModal: React.FC<AddEditCandidateModalProps> = ({ isOpen, onClose, onSave, candidateToEdit, initialStage }) => {
  const { sources, companyProfile, stages } = useSettings();
  const { addToast } = useToast();
  const availableSources = sources.length > 0 ? sources : DEFAULT_SOURCES;
  const kanbanStages = stages.filter(s => s.id !== 'archived');
  const resumeInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [source, setSource] = useState(availableSources[0]);
  const [stage, setStage] = useState<StageId>('inbox');
  const [rating, setRating] = useState(0);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [resumeFile, setResumeFile] = useState<File | undefined>();
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    if (candidateToEdit) {
      setName(candidateToEdit.name);
      setEmail(candidateToEdit.email);
      setPhone(candidateToEdit.phone);
      setPosition(candidateToEdit.position);
      setSource(candidateToEdit.source);
      setStage(candidateToEdit.stage);
      setRating(candidateToEdit.rating);
      setInterviewDate(candidateToEdit.interviewDate || '');
      setInterviewTime(candidateToEdit.interviewTime || '');
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setPosition(companyProfile.jobPositions.length > 0 ? companyProfile.jobPositions[0].title : '');
      setSource(availableSources[0]);
      setStage(initialStage || 'inbox');
      setRating(0);
      setInterviewDate('');
      setInterviewTime('');
    }
    setResumeFile(undefined);
    setIsParsing(false);
    if (resumeInputRef.current) {
        resumeInputRef.current.value = '';
    }
  }, [candidateToEdit, initialStage, isOpen, availableSources, companyProfile]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCandidate: Candidate = {
      id: candidateToEdit?.id || `cand_${Date.now()}`,
      createdAt: candidateToEdit?.createdAt || new Date().toISOString(),
      history: candidateToEdit?.history || [],
      comments: candidateToEdit?.comments || [],
      ...candidateToEdit,
      name, email, phone, position, source, stage, rating,
      interviewDate: interviewDate || undefined,
      interviewTime: interviewTime || undefined,
      hasResume: !!resumeFile || candidateToEdit?.hasResume,
    };
    onSave(newCandidate, resumeFile);
    onClose();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setResumeFile(e.target.files[0]);
      }
  };

  const handleDateChange = (date: string) => {
    setInterviewDate(date);
  };

  const handleParseResume = async () => {
    if (!resumeFile) return;
    setIsParsing(true);
    addToast('در حال تحلیل رزومه با هوش مصنوعی...', 'success');
    try {
        const parsedData = await aiService.parseResume(resumeFile);
        if (parsedData.name) setName(parsedData.name);
        if (parsedData.email) setEmail(parsedData.email);
        if (parsedData.phone) setPhone(parsedData.phone);
        addToast('اطلاعات با موفقیت از رزومه استخراج شد.', 'success');
    } catch (error: any) {
        addToast(error.message || 'خطا در تحلیل رزومه.', 'error');
    } finally {
        setIsParsing(false);
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={candidateToEdit ? 'ویرایش متقاضی' : 'افزودن متقاضی'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form fields */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">نام کامل</label>
            <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] sm:text-sm" />
          </div>
          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700">موقعیت شغلی</label>
            <select id="position" value={position} onChange={e => setPosition(e.target.value)} required className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] sm:text-sm">
                <option value="" disabled>یک موقعیت انتخاب کنید</option>
                {companyProfile.jobPositions.map(job => (
                    <option key={job.id} value={job.title}>{job.title}</option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">ایمیل</label>
            <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] sm:text-sm" />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">شماره تلفن</label>
            <input type="tel" id="phone" value={phone} onChange={e => setPhone(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] sm:text-sm" />
          </div>
          <div>
            <label htmlFor="source" className="block text-sm font-medium text-gray-700">منبع</label>
            <select id="source" value={source} onChange={e => setSource(e.target.value)} className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] sm:text-sm">
              {availableSources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="stage" className="block text-sm font-medium text-gray-700">مرحله</label>
            <select id="stage" value={stage} onChange={e => setStage(e.target.value as StageId)} className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] sm:text-sm">
              {kanbanStages.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
           <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ مصاحبه</label>
                  <KamaDatePicker value={interviewDate} onChange={handleDateChange} />
              </div>
              <div>
                  <label htmlFor="interviewTime" className="block text-sm font-medium text-gray-700 mb-1">ساعت مصاحبه</label>
                  <input type="time" id="interviewTime" value={interviewTime} onChange={e => setInterviewTime(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-3 px-3 focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] sm:text-sm" />
              </div>
           </div>
           <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">رزومه (PDF)</label>
                <div className="mt-1 flex items-center gap-4">
                    <input ref={resumeInputRef} type="file" onChange={handleFileChange} accept=".pdf" className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary-50)] file:text-[var(--color-primary-700)] hover:file:bg-[var(--color-primary-100)]"/>
                    <button type="button" onClick={handleParseResume} disabled={!resumeFile || isParsing} className="px-4 py-2 text-sm font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {isParsing ? 'در حال پردازش...' : 'تکمیل خودکار با AI ✨'}
                    </button>
                </div>
                {candidateToEdit?.hasResume && !resumeFile && <p className="text-xs text-green-600 mt-1">رزومه قبلا آپلود شده است.</p>}
           </div>
           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">امتیاز</label>
              <StarRating rating={rating} onRatingChange={setRating} />
           </div>
        </div>
        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors">انصراف</button>
          <button type="submit" className="bg-[var(--color-primary-600)] text-white py-2 px-6 rounded-lg hover:bg-[var(--color-primary-700)] transition-colors">ذخیره</button>
        </div>
      </form>
    </Modal>
  );
};

export default AddEditCandidateModal;