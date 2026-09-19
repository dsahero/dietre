import React from 'react';
import { RestaurantCardData } from '../types';
import { RestaurantDetailContent } from './RestaurantDetailContent';

interface RestaurantDetailModalProps {
  isOpen: boolean;
  restaurant: RestaurantCardData | null;
  isShortlisted: boolean;
  onToggleShortlist: (id: string) => void;
  onClose: () => void;
  onSelectResponse: (responseId: string) => void;
}

export const RestaurantDetailModal: React.FC<RestaurantDetailModalProps> = ({
  isOpen,
  restaurant,
  isShortlisted,
  onToggleShortlist,
  onClose,
  onSelectResponse,
}) => {
  if (!isOpen || !restaurant) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-md sm:p-5"
      onClick={onClose}
    >
      <div
        className="relative my-auto flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <RestaurantDetailContent
          restaurant={restaurant}
          isShortlisted={isShortlisted}
          onToggleShortlist={onToggleShortlist}
          onClose={onClose}
          onSelectResponse={onSelectResponse}
        />
      </div>
    </div>
  );
};
