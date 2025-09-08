import React, { useState, useCallback } from 'react';
import ConfirmModal from '../components/ConfirmModal';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    onConfirm: () => void;
  }>({
    isOpen: false,
    options: { title: '', message: '' },
    onConfirm: () => {}
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        onConfirm: () => resolve(true)
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const ConfirmComponent = useCallback(() => (
    <ConfirmModal
      isOpen={confirmState.isOpen}
      onClose={handleClose}
      onConfirm={confirmState.onConfirm}
      title={confirmState.options.title}
      message={confirmState.options.message}
      confirmText={confirmState.options.confirmText}
      cancelText={confirmState.options.cancelText}
      type={confirmState.options.type}
    />
  ), [confirmState, handleClose]);

  return { confirm, ConfirmComponent };
};