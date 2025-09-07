import React, { useRef, useEffect, ReactNode } from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
  size?: 'default' | 'large' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title, size = 'default' }) => {
  const modalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const modalElement = modalRef.current;
    if (modalElement) {
      if (isOpen) {
        modalElement.showModal();
      } else {
        modalElement.close();
      }
    }
  }, [isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };
  
  const sizeClasses = {
    default: 'w-11/12 max-w-2xl',
    large: 'w-11/12 max-w-4xl',
    xl: 'w-11/12 max-w-7xl',
  };

  const modalContent = (
    <dialog ref={modalRef} onKeyDown={handleKeyDown} onClose={onClose} className={`p-0 rounded-xl shadow-2xl bg-gray-50 backdrop:bg-black/50 ${sizeClasses[size]}`}>
      <div className="sticky top-0 bg-gray-50 z-10 p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-6">
        {children}
      </div>
    </dialog>
  );

  return ReactDOM.createPortal(modalContent, document.getElementById('modal-root')!);
};

export default Modal;