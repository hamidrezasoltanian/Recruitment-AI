
import React, { useState } from 'react';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onRatingChange, readOnly = false }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const displayRating = hoverRating || rating;

  return (
    <div 
      className="flex flex-row-reverse justify-end items-center"
      onMouseLeave={() => !readOnly && setHoverRating(0)}
    >
      {[5, 4, 3, 2, 1].map((star) => (
        <span
          key={star}
          className={`text-2xl transition-colors duration-150 ${!readOnly ? 'cursor-pointer' : ''} ${displayRating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
          onClick={() => !readOnly && onRatingChange?.(star)}
          onMouseEnter={() => !readOnly && setHoverRating(star)}
        >
          ★
        </span>
      ))}
    </div>
  );
};

export default StarRating;
