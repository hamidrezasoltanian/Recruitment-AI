import React, { useState, useRef, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useCandidates } from '../../contexts/CandidatesContext';
import { aiService, isApiKeySet } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import { SparklesIcon } from '../ui/Icons';

interface AiInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AiInsightsModal: React.FC<AiInsightsModalProps> = ({ isOpen, onClose }) => {
  const { candidates } = useCandidates();
  const { addToast } = useToast();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const responseEndRef = useRef<HTMLDivElement>(null);
  const apiKeySet = isApiKeySet();

  useEffect(() => {
    // Scroll to the bottom of the response as it streams in
    responseEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [response]);

  useEffect(() => {
    // Reset state when modal is opened
    if (isOpen) {
        setQuery('');
        setResponse('');
        setIsLoading(false);
    }
  }, [isOpen]);

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setResponse('');

    try {
      const stream = await aiService.getInsightsStream(candidates, query);
      for await (const chunk of stream) {
        setResponse(prev => prev + chunk.text);
      }
    } catch (error: any) {
      addToast(error.message || 'خطا در دریافت تحلیل از هوش مصنوعی.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const exampleQueries = [
    "بهترین متقاضیان برای موقعیت React چه کسانی هستند؟",
    "نقاط قوت و ضعف اصلی در بین متقاضیان فعال چیست؟",
    "کدام متقاضیان امتیاز بالایی دارند اما در مراحل اولیه هستند؟"
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تحلیل متقاضیان با هوش مصنوعی" size="large">
      <div className="flex flex-col h-[70vh]">
        {/* Response Area */}
        <div className="flex-grow bg-gray-100 rounded-lg p-4 overflow-y-auto mb-4">
          {response ? (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-800" dangerouslySetInnerHTML={{ __html: response.replace(/\n/g, '<br />') }} />
          ) : (
            <div className="text-center text-gray-500 h-full flex flex-col justify-center items-center">
                <SparklesIcon className="h-12 w-12 text-purple-400 mb-4" />
                <h3 className="font-bold text-lg">از دستیار هوش مصنوعی خود بپرسید!</h3>
                <p className="mt-2">می‌توانید سوالاتی در مورد کل متقاضیان خود بپرسید.</p>
                <div className="mt-6 text-sm text-left w-full max-w-md">
                    <p className="font-semibold mb-2">مثال:</p>
                    <ul className="space-y-2">
                       {exampleQueries.map((q, i) => (
                           <li key={i}><button onClick={() => setQuery(q)} className="text-purple-600 hover:underline text-right" disabled={!apiKeySet}>{q}</button></li>
                       ))}
                    </ul>
                </div>
            </div>
          )}
          <div ref={responseEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleQuerySubmit} className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={apiKeySet ? "سوال خود را در مورد متقاضیان بپرسید..." : "ویژگی هوش مصنوعی غیرفعال است. لطفاً کلید API را تنظیم کنید."}
              className="flex-grow border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] sm:text-sm"
              disabled={isLoading || !apiKeySet}
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim() || !apiKeySet}
              className="bg-[var(--color-primary-600)] text-white font-bold py-2 px-6 rounded-lg hover:bg-[var(--color-primary-700)] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : 'ارسال'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AiInsightsModal;