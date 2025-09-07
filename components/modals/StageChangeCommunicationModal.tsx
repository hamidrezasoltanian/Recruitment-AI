import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { StageChangeInfo } from '../../types';
import { useTemplates } from '../../contexts/TemplateContext';
import { templateService } from '../../services/templateService';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { EmailIcon, WhatsappIcon } from '../ui/Icons';

interface StageChangeCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageChangeInfo: StageChangeInfo;
  onConfirm: () => void;
}

const StageChangeCommunicationModal: React.FC<StageChangeCommunicationModalProps> = ({
  isOpen,
  onClose,
  stageChangeInfo,
  onConfirm,
}) => {
  const { templates } = useTemplates();
  const { companyProfile } = useSettings();
  const { addToast } = useToast();

  const { candidate, newStage } = stageChangeInfo;

  // States for non-interview stages
  const [sendNotification, setSendNotification] = useState(true);
  const [communicationType, setCommunicationType] = useState<'email' | 'whatsapp'>('email');

  // States for interview stages
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(true);

  const emailTemplate = useMemo(() => {
    return templates.find(t => t.stageId === newStage.id && t.type === 'email');
  }, [templates, newStage.id]);

  const whatsappTemplate = useMemo(() => {
    return templates.find(t => t.stageId === newStage.id && t.type === 'whatsapp');
  }, [templates, newStage.id]);
  
  const isInterviewStage = useMemo(() => newStage.id.startsWith('interview-'), [newStage.id]);
  const hasAnyTemplate = useMemo(() => !!emailTemplate || !!whatsappTemplate, [emailTemplate, whatsappTemplate]);

  useEffect(() => {
    if (isOpen) {
      if (isInterviewStage) {
        setSendEmail(!!emailTemplate);
        setSendWhatsapp(!!whatsappTemplate);
      } else {
        if (emailTemplate) setCommunicationType('email');
        else if (whatsappTemplate) setCommunicationType('whatsapp');
        setSendNotification(hasAnyTemplate);
      }
    }
  }, [isOpen, isInterviewStage, emailTemplate, whatsappTemplate, hasAnyTemplate]);

  const handleConfirm = () => {
    let notificationsSent = false;
    // FIX: Destructure companyProfile to exclude 'jobPositions' which is not a string and causes a type error.
    const { jobPositions, ...companyDetails } = companyProfile;
    
    if (isInterviewStage) {
      if (sendEmail && emailTemplate) {
        const message = templateService.replacePlaceholders(emailTemplate.content, candidate, { stageName: newStage.title, ...companyDetails });
        window.open(`mailto:${candidate.email}?subject=اطلاع رسانی فرآیند استخدام&body=${encodeURIComponent(message)}`, '_blank');
        notificationsSent = true;
      }
      if (sendWhatsapp && whatsappTemplate) {
        const whatsappNumber = candidate.phone ? candidate.phone.replace(/[^0-9]/g, '').replace(/^0/, '98') : '';
        if (whatsappNumber) {
          const message = templateService.replacePlaceholders(whatsappTemplate.content, candidate, { stageName: newStage.title, ...companyDetails });
          window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
          notificationsSent = true;
        } else {
          addToast("ارسال واتسپ ناموفق: شماره تلفن نامعتبر است.", "error");
        }
      }
      if (notificationsSent) addToast(`پیام‌های اطلاع‌رسانی برای ${candidate.name} آماده ارسال شدند.`, 'success');

    } else if (sendNotification && hasAnyTemplate) {
      const template = communicationType === 'email' ? emailTemplate : whatsappTemplate;
      if (!template) {
        addToast('قالب پیام یافت نشد.', 'error');
        return;
      }
      const message = templateService.replacePlaceholders(template.content, candidate, { stageName: newStage.title, ...companyDetails });

      if (communicationType === 'email') {
        window.open(`mailto:${candidate.email}?subject=اطلاع رسانی فرآیند استخدام&body=${encodeURIComponent(message)}`, '_blank');
        addToast(`ایمیل اطلاع‌رسانی برای ${candidate.name} آماده ارسال شد.`, 'success');
      } else {
        const whatsappNumber = candidate.phone ? candidate.phone.replace(/[^0-9]/g, '').replace(/^0/, '98') : '';
        if (whatsappNumber) {
          window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
          addToast(`پیام واتسپ برای ${candidate.name} آماده ارسال شد.`, 'success');
        } else {
          addToast("شماره واتس‌اپ برای این متقاضی ثبت نشده.", "error");
          return;
        }
      }
    }
    
    onConfirm();
  };

  const renderInterviewOptions = () => (
    <div className="space-y-4 p-4 bg-gray-50 rounded-md border">
        <p className="font-medium text-gray-800">ارسال پیام اطلاع رسانی به متقاضی:</p>
        <div className="space-y-3">
            {emailTemplate && (
                <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="h-4 w-4 text-[var(--color-primary-600)] border-gray-300 rounded" />
                    <span>ارسال ایمیل دعوت به مصاحبه</span>
                </label>
            )}
            {whatsappTemplate && (
                <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={sendWhatsapp} onChange={e => setSendWhatsapp(e.target.checked)} className="h-4 w-4 text-[var(--color-primary-600)] border-gray-300 rounded" />
                    <span>ارسال پیام واتسپ دعوت به مصاحبه</span>
                </label>
            )}
            {!emailTemplate && !whatsappTemplate && (
                 <p className="text-sm text-gray-500">قالبی برای ارسال ایمیل یا واتسپ برای این مرحله یافت نشد.</p>
            )}
        </div>
    </div>
  );

  const renderStandardOptions = () => {
    const relevantTemplate = communicationType === 'email' ? emailTemplate : whatsappTemplate;
    // FIX: Destructure companyProfile to exclude 'jobPositions' which is not a string and causes a type error.
    const { jobPositions, ...companyDetails } = companyProfile;
    const message = relevantTemplate ? templateService.replacePlaceholders(relevantTemplate.content, candidate, { stageName: newStage.title, ...companyDetails }) : '';
    
    return hasAnyTemplate ? (
      <div className="space-y-4">
        <div className="flex items-center">
          <input id="send-notification-checkbox" type="checkbox" checked={sendNotification} onChange={(e) => setSendNotification(e.target.checked)} className="h-4 w-4 text-[var(--color-primary-600)] border-gray-300 rounded" />
          <label htmlFor="send-notification-checkbox" className="mr-2 block text-sm text-gray-900">ارسال پیام اطلاع‌رسانی به متقاضی</label>
        </div>

        {sendNotification && (
          <>
            {emailTemplate && whatsappTemplate && (
              <div>
                <span className="text-sm font-medium text-gray-700">روش ارسال:</span>
                <div className="mt-2 inline-flex rounded-md shadow-sm">
                  <button type="button" onClick={() => setCommunicationType('email')} className={`relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 text-sm font-medium transition-colors ${communicationType === 'email' ? 'bg-[var(--color-primary-600)] text-white z-10' : 'bg-white text-gray-700 hover:bg-gray-50'}`}><EmailIcon className="h-5 w-5" /></button>
                  <button type="button" onClick={() => setCommunicationType('whatsapp')} className={`-ml-px relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium transition-colors ${communicationType === 'whatsapp' ? 'bg-[var(--color-primary-600)] text-white z-10' : 'bg-white text-gray-700 hover:bg-gray-50'}`}><WhatsappIcon className="h-5 w-5" /></button>
                </div>
              </div>
            )}
            {relevantTemplate && <textarea id="message-preview" rows={8} value={message} readOnly className="mt-1 block w-full border border-gray-200 bg-gray-50 rounded-md shadow-sm py-2 px-3 sm:text-sm" />}
          </>
        )}
      </div>
    ) : (
      <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-md">
        هیچ قالب پیامی (ایمیل یا واتسپ) برای مرحله "{newStage.title}" تعریف نشده است.
      </div>
    );
  };

  const title = `تغییر مرحله به "${newStage.title}"`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <p>شما در حال انتقال متقاضی <strong className="font-bold">{candidate.name}</strong> به مرحله <strong className="font-bold">{newStage.title}</strong> هستید.</p>
        
        {isInterviewStage ? renderInterviewOptions() : renderStandardOptions()}

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors">انصراف</button>
          <button type="button" onClick={handleConfirm} className="bg-[var(--color-primary-600)] text-white py-2 px-6 rounded-lg hover:bg-[var(--color-primary-700)] transition-colors">
            تایید و انتقال
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default StageChangeCommunicationModal;
