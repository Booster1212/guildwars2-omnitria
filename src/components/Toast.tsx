import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useTranslation } from '../i18n';

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  const { t } = useTranslation();

  return (
    <div className="toast-banner" role="status" aria-live="polite">
      <CheckCircle2 className="toast-icon" size={18} aria-hidden="true" />
      <div className="toast-content">
        <div className="toast-title">
          <span>{t('toast.copiedTitle')}</span>
        </div>
        <div className="toast-msg">{message}</div>
        <div className="toast-hint">{t('toast.copiedHint')}</div>
      </div>
      <button
        type="button"
        className="toast-close-btn"
        onClick={onDismiss}
        aria-label={t('toast.dismissAria')}
        title={t('toast.dismissAria')}
      >
        <X size={13} aria-hidden="true" />
      </button>
    </div>
  );
};
