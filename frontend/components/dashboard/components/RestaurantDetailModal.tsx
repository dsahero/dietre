import React from 'react';
import { RestaurantCardData } from '../types';
import { RestaurantDetailContent } from './RestaurantDetailContent';
import { useBodyScrollLock } from '@/frontend/lib/use-body-scroll-lock';
import { ModalPortal } from '@/frontend/components/ui/modal-portal';

interface RestaurantDetailModalProps {
  isOpen: boolean;
  restaurant: RestaurantCardData | null;
  aiSummary?: string;
  isShortlisted: boolean;
  onToggleShortlist: (id: string) => void;
  onClose: () => void;
  onSelectResponse: (responseId: string) => void;
  eventId?: string;
  onMenuUploaded?: () => void;
}

export const RestaurantDetailModal: React.FC<RestaurantDetailModalProps> = ({
  isOpen,
  restaurant,
  aiSummary,
  isShortlisted,
  onToggleShortlist,
  onClose,
  onSelectResponse,
  eventId,
  onMenuUploaded,
}) => {
  useBodyScrollLock(isOpen && Boolean(restaurant));

  if (!isOpen || !restaurant) return null;

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[8000] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/70 p-3 backdrop-blur-xs sm:p-5"
      onClick={onClose}
    >
      <div
        className="relative my-auto flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <RestaurantDetailContent
          restaurant={restaurant}
          aiSummary={aiSummary}
          isShortlisted={isShortlisted}
          onToggleShortlist={onToggleShortlist}
          onClose={onClose}
          onSelectResponse={onSelectResponse}
          eventId={eventId}
          onMenuUploaded={onMenuUploaded}
        />
      </div>
    </div>
    </ModalPortal>
  );
};
