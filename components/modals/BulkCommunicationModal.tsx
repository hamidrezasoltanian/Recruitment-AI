import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Candidate } from '../../types';
import { useTemplates } from '../../contexts/TemplateContext';
import { templateService } from '../../services/templateService';
import { useToast } from '../../contexts/ToastContext';
import { useSettings } from '../../contexts/SettingsContext';
import { EmailIcon, WhatsappIcon } from '../ui/Icons';

interface BulkCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
}

const BulkCommunicationModal: React.FC<BulkCommunicationModalProps> = ({
  isOpen,
  onClose,
  candidates,
}) => {
  const { templates } = useTemplates();
  const { companyProfile } = useSettings();
  const { addToast } = useToast();
  
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [message, setMessage] = useState('');
  
  // Find reminder templates first
  useEffect(() => {
    if (isOpen) {
      const reminderWhatsapp = templates.find(t => t.id === 'tpl_whatsapp_invite_reminder');
      const reminderEmail = templates.find(t => t.id === 'tpl_email_invite_reminder');
      if (reminderWhatsapp) {
        setSelectedTemplateId(reminderWhatsapp.id);
      } else if (reminderEmail) {
        setSelectedTemplateId(reminderEmail.id);
      } else if (templates.length > 0) {
        setSelectedTemplateId(templates[0].id);
      } else {
        setSelectedTemplateId('');
      }
      setMessage('');
    }
  }, [isOpen, templates]);

  useEffect(() => {
    if (!selectedTemplateId) {
      setMessage('');
      return;
    }
    const template = templates.find(t => t.id === selectedTemplateId);
    if (template) {
      // Show the message with placeholders for preview
      setMessage(template.content);
    }
  }, [selectedTemplateId, templates]);

  const handleSend = async (platform: 'email' | 'whatsapp') => {
    if (!message.trim()) {
        addToast("پیام نمی‌تواند خالی باشد.", "error");
        return;
    }
    if (candidates.length === 0) {
        addToast("هیچ متقاضی برای ارسال پیام انتخاب نشده.", "error");
        return;
    }

    addToast(`در حال آماده‌سازی ${candidates.length} پیام. لطفاً منتظر بمانید...`, 'success');
    
    let successCount = 0;
    
    // Use a loop with a delay to avoid browser popup blockers
    for (const candidate of candidates) {
        const placeholders = {
            companyName: companyProfile.name,
            companyAddress: companyProfile.address,
            companyWebsite: companyProfile.website,
        };
        const personalizedMessage = templateService.replacePlaceholders(message, candidate, placeholders);

        if (platform === 'email') {
            const subject = `یادآوری مصاحبه از طرف ${companyProfile.name}`;
            window.open(`mailto:${candidate.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(personalizedMessage)}`, '_blank');
            successCount++;
        } else { // whatsapp
            const whatsappNumber = candidate.phone ? candidate.phone.replace(/[^0-9]/g, '').replace(/^0/, '98') : '';
            if (whatsappNumber) {
                window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(personalizedMessage)}`, '_blank');
                successCount++;
            } else {
                addToast(`ارسال برای ${candidate.name} ناموفق بود (شماره واتسپ نامعتبر).`, 'error');
            }
        }
        // Wait for half a second before opening the next one
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (successCount > 0) {
        addToast(`${successCount} پیام با موفقیت آماده ارسال شد.`, 'success');
    }
    
    onClose();
  };
  
  const title = `ارسال پیام گروهی (${candidates.length} نفر)`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <div>
          <h4 className="font-bold text-gray-800 mb-2">دریافت‌کنندگان:</h4>
          <div className="max-h-28 overflow-y-auto bg-gray-100 p-2 rounded-md text-sm text-gray-700">
            {candidates.map(c => c.name).join('، ')}
          </div>
        </div>
        <div>
          <label htmlFor="template-select" className="block text-sm font-medium text-gray-700">انتخاب قالب</label>
          <select 
            id="template-select" 
            value={selectedTemplateId} 
            onChange={e => setSelectedTemplateId(e.target.value)}
            className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="" disabled>یک قالب انتخاب کنید...</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.type === 'email' ? 'ایمیل' : 'واتسپ'})</option>
            ))}
          </select>
          {templates.length === 0 && <p className="text-xs text-red-500 mt-1">هیچ قالبی یافت نشد. لطفا از تنظیمات اضافه کنید.</p>}
        </div>

        <div>
            <label htmlFor="message-content" className="block text-sm font-medium text-gray-700">متن پیام (متغیرها برای هر فرد جایگزین خواهند شد)</label>
            <textarea
              id="message-content"
              rows={8}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm"
            />
        </div>
        
        <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-md">
           <strong>توجه:</strong> این عملیات چندین پنجره/تب جدید باز خواهد کرد. لطفاً مطمئن شوید مرورگر شما اجازه باز شدن پاپ‌آپ‌ها را می‌دهد.
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors">انصراف</button>
          <button type="button" onClick={() => handleSend('whatsapp')} className="bg-teal-600 text-white py-2 px-6 rounded-lg hover:bg-teal-700 flex items-center gap-2">
            <WhatsappIcon className="w-5 h-5"/>
            <span>ارسال با واتسپ</span>
          </button>
          <button type="button" onClick={() => handleSend('email')} className="bg-sky-600 text-white py-2 px-6 rounded-lg hover:bg-sky-700 flex items-center gap-2">
            <EmailIcon className="w-5 h-5"/>
            <span>ارسال با ایمیل</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkCommunicationModal;