import { useRef } from 'react';

import { categories } from '../data/seed';
import { useImageUrl } from '../hooks/use-image-url';
import { cn } from '../utils/cn';

interface CategoryChipsProps {
  activeCategory: string;
  onSelect: (categoryId: string) => void;
}

function CategoryChip({
  id,
  label,
  imagePath,
  fallbackImageUrl,
  isActive,
  onSelect,
}: {
  id: string;
  label: string;
  imagePath: string;
  fallbackImageUrl: string;
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  const imageUrl = useImageUrl(imagePath, fallbackImageUrl);

  return (
    <li className="shrink-0">
      <button
        type="button"
        onClick={() => onSelect(id)}
        aria-pressed={isActive}
        title={label}
        className={cn(
          'flex w-24 flex-col items-center gap-2 rounded-xl p-2 transition',
          'hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none',
          isActive && 'bg-neutral-100',
        )}
      >
        <span
          className={cn(
            'grid size-16 place-items-center overflow-hidden rounded-full border-2 bg-white transition',
            isActive ? 'border-brand-500' : 'border-transparent',
          )}
        >
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            width={64}
            height={64}
            className="size-full object-cover"
          />
        </span>
        <span
          className={cn(
            'line-clamp-1 text-center text-[13px] leading-tight font-medium',
            isActive ? 'text-brand-600' : 'text-neutral-700',
          )}
        >
          {label}
        </span>
      </button>
    </li>
  );
}

export function CategoryChips({ activeCategory, onSelect }: CategoryChipsProps) {
  // Horizontal scroll without a visible scrollbar — matches Zomato's chip rail.
  const railRef = useRef<HTMLUListElement>(null);

  return (
    <div className="relative">
      <ul
        ref={railRef}
        aria-label="Food categories"
        className="flex gap-1 overflow-x-auto scroll-smooth px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((category) => (
          <CategoryChip
            key={category.id}
            id={category.id}
            label={category.label}
            imagePath={category.imagePath}
            fallbackImageUrl={category.fallbackImageUrl}
            isActive={category.id === activeCategory}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </div>
  );
}
