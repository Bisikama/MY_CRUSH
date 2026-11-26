'use client';

import { createPortal } from 'react-dom';
import { useI18n } from '../../../i18n';
import type { ShopPurchaseToastState } from '../hooks/use-shop-controller';
import styles from './shop.module.css';

interface ShopPurchaseToastProps {
  toast: ShopPurchaseToastState | null;
  onDismiss: () => void;
}

export function ShopPurchaseToast({ toast, onDismiss }: ShopPurchaseToastProps) {
  const { t } = useI18n();
  const toastAnchor =
    toast && typeof document !== 'undefined' ? document.getElementById('site-header') : null;

  return (
    <>
      <div className="sr-only" role="status" aria-atomic="true">
        {toast ? `${t('shop.toast.title')}. ${toast.subtitle}` : ''}
      </div>
      {toast &&
        toastAnchor &&
        createPortal(
          <div className={styles.toast}>
            <span className={styles.toastIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="m5 12 4 4L19 6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className={styles.toastCopy} aria-hidden="true">
              <strong>{t('shop.toast.title')}</strong>
              <span>{toast.subtitle}</span>
            </div>
            <button
              className={styles.toastDismiss}
              type="button"
              aria-label={t('shop.toast.dismissAria')}
              onClick={onDismiss}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>,
          toastAnchor,
        )}
    </>
  );
}
