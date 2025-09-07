import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { user, changePassword } = useAuth();
  const { addToast } = useToast();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      addToast('لطفا تمام فیلدها را پر کنید.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('رمز عبور جدید و تایید آن مطابقت ندارند.', 'error');
      return;
    }
    if (newPassword.length < 6) {
        addToast('رمز عبور جدید باید حداقل ۶ کاراکتر باشد.', 'error');
        return;
    }
    if (!user) return;

    setIsChanging(true);
    try {
      await changePassword(user.username, oldPassword, newPassword);
      addToast('رمز عبور با موفقیت تغییر کرد.', 'success');
      onClose();
    } catch (err) {
      // Toast for error is already shown in context
    } finally {
      setIsChanging(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };
  
  // Reset fields when modal is opened/closed
  React.useEffect(() => {
    if (!isOpen) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChanging(false);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تغییر رمز عبور">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">رمز عبور فعلی</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">رمز عبور جدید</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">تکرار رمز عبور جدید</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
          />
        </div>
        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 py-2 px-6 rounded-lg hover:bg-gray-300">انصراف</button>
          <button type="submit" disabled={isChanging} className="bg-[var(--color-primary-600)] text-white py-2 px-6 rounded-lg disabled:bg-gray-400">
            {isChanging ? 'در حال تغییر...' : 'تغییر رمز'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;
