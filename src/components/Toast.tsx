import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  return (
    <div className="toast-banner">
      <CheckCircle2 className="toast-icon" size={18} />
      <div className="toast-content">
        <div className="toast-title">
          <span>In Zwischenablage kopiert!</span>
        </div>
        <div className="toast-msg">{message}</div>
        <div className="toast-hint">Im GW2-Chat: [Enter] ➔ [Strg+V] ➔ [Enter] drücken</div>
      </div>
      <button className="icon-btn" onClick={onDismiss} style={{ width: '20px', height: '20px' }}>
        <X size={12} />
      </button>
    </div>
  );
};
