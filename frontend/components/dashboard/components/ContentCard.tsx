import React from 'react';
import { RestaurantCard } from './RestaurantCard';
import { RestaurantCardData } from '../types';

interface ContentCardProps {
  card?: RestaurantCardData;
  restaurant?: RestaurantCardData;
}

export const ContentCard: React.FC<ContentCardProps> = ({ card, restaurant }) => {
  const data = restaurant || card;
  if (!data) return null;
  return <RestaurantCard restaurant={data} />;
};

export default ContentCard;
