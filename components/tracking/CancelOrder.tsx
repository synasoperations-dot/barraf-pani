'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Dialog';
import { TextArea } from '@/components/ui/form';
import { toast } from '@/components/ui/Toast';
import { useCancelOrder } from '@/features/tracking/hooks';
import { isApiError } from '@/lib/api';
import { useErrorMessage } from '@/lib/errors';
import { CallShopLink } from './screens';

/**
 * Cancel while `placed` (order.canCancel), with a confirm Sheet and an optional reason.
 * Keep it mounted when canCancel turns false: only the button hides, so an open Sheet can
 * still show TOO_LATE_TO_CANCEL and a successful cancel still closes + toasts.
 */
export function CancelOrder({
  token,
  shopPhone,
  canCancel,
  className,
}: {
  token: string;
  shopPhone: string;
  canCancel: boolean;
  className?: string;
}) {
  const t = useTranslations('tracking.cancel');
  const tc = useTranslations('common');
  const message = useErrorMessage();
  const cancel = useCancelOrder(token);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const err = cancel.error;
  // TOO_LATE_TO_CANCEL carries the shop phone in details (§3.5).
  const tooLate = isApiError(err) && err.code === 'TOO_LATE_TO_CANCEL';
  const phone =
    (tooLate && typeof err.details?.shopPhone === 'string' && err.details.shopPhone) || shopPhone;

  const close = () => {
    setOpen(false);
    cancel.reset();
  };

  return (
    <>
      {canCancel && (
        <div className={className}>
          <Button variant="ghost" onClick={() => setOpen(true)}>
            {t('open')}
          </Button>
        </div>
      )}
      <Sheet
        open={open}
        onClose={close}
        title={t('title')}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={close}>
              {t('keep')}
            </Button>
            {!tooLate && (
              <Button
                loading={cancel.isPending}
                onClick={() =>
                  cancel.mutate(reason.trim() || null, {
                    onSuccess: () => {
                      // Toasts sit under an open <dialog> (top layer): close first.
                      setOpen(false);
                      toast(t('done'));
                    },
                  })
                }
              >
                {t('confirm')}
              </Button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <p>{t('body')}</p>
          {!tooLate && (
            <TextArea
              label={t('reason')}
              hint={t('reasonHint')}
              optionalLabel={tc('optional')}
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          )}
          {err && (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="flex gap-2 font-bold">
                <span aria-hidden="true" className="text-orange-deep">
                  !
                </span>
                {message(err)}
              </p>
              {tooLate && <CallShopLink phone={phone} />}
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}
