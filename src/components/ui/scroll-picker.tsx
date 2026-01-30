import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ScrollPickerProps {
  values: (string | number)[];
  value?: string | number;
  onChange: (value: string | number) => void;
  label?: string;
  unit?: string;
  className?: string;
}

export const ScrollPicker = ({
  values,
  value,
  onChange,
  label,
  unit,
  className,
}: ScrollPickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout>();
  const itemHeight = 40;
  const visibleItems = 3;

  const selectedIndex = value !== undefined ? values.indexOf(value) : -1;

  useEffect(() => {
    if (containerRef.current && selectedIndex >= 0 && !isScrolling) {
      containerRef.current.scrollTop = selectedIndex * itemHeight;
    }
  }, [selectedIndex, isScrolling]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    setIsScrolling(true);
    
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    
    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return;
      
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
      
      containerRef.current.scrollTo({
        top: clampedIndex * itemHeight,
        behavior: 'smooth',
      });
      
      if (values[clampedIndex] !== value) {
        onChange(values[clampedIndex]);
      }
      
      setTimeout(() => setIsScrolling(false), 100);
    }, 80);
  };

  const handleItemClick = (index: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth',
      });
      onChange(values[index]);
    }
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {label && (
        <span className="text-[10px] uppercase tracking-luxury text-muted-foreground mb-1">
          {label}
        </span>
      )}
      <div className="relative w-20">
        {/* Selection highlight */}
        <div 
          className="absolute left-0 right-0 pointer-events-none z-10"
          style={{ 
            top: itemHeight, 
            height: itemHeight,
          }}
        >
          <div className="h-full border-y border-primary/40 bg-primary/5 rounded" />
        </div>
        
        {/* Gradient overlays */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-background to-transparent pointer-events-none z-20" />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />
        
        {/* Scrollable container */}
        <div
          ref={containerRef}
          className="overflow-y-auto scrollbar-hide"
          style={{ 
            height: itemHeight * visibleItems,
            scrollSnapType: 'y mandatory',
          }}
          onScroll={handleScroll}
        >
          {/* Padding items for centering */}
          <div style={{ height: itemHeight }} />
          
          {values.map((v, index) => {
            const isSelected = v === value;
            return (
              <div
                key={`${v}-${index}`}
                className={cn(
                  "flex items-center justify-center cursor-pointer transition-all duration-150",
                  isSelected 
                    ? "text-foreground font-semibold scale-110" 
                    : "text-muted-foreground/60 scale-90"
                )}
                style={{ 
                  height: itemHeight,
                  scrollSnapAlign: 'center',
                }}
                onClick={() => handleItemClick(index)}
              >
                <span className="text-lg">{v}</span>
                {isSelected && unit && (
                  <span className="text-xs text-primary ml-1">{unit}</span>
                )}
              </div>
            );
          })}
          
          {/* Padding items for centering */}
          <div style={{ height: itemHeight }} />
        </div>
      </div>
    </div>
  );
};
