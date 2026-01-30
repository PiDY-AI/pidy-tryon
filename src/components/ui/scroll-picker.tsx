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
  const itemHeight = 36;
  const visibleItems = 5;

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
        <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70 mb-2 font-medium">
          {label}
        </span>
      )}
      <div className="relative">
        {/* Selection indicator - subtle line markers */}
        <div 
          className="absolute left-0 right-0 pointer-events-none z-10"
          style={{ 
            top: itemHeight * 2, 
            height: itemHeight,
          }}
        >
          <div className="h-full relative">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          </div>
        </div>
        
        {/* Gradient overlays - softer */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-20" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-20" />
        
        {/* Scrollable container */}
        <div
          ref={containerRef}
          className="overflow-y-auto scrollbar-hide w-16"
          style={{ 
            height: itemHeight * visibleItems,
            scrollSnapType: 'y mandatory',
          }}
          onScroll={handleScroll}
        >
          {/* Top padding */}
          <div style={{ height: itemHeight * 2 }} />
          
          {values.map((v, index) => {
            const isSelected = v === value;
            const distance = Math.abs(index - selectedIndex);
            const opacity = isSelected ? 1 : distance === 1 ? 0.5 : 0.25;
            
            return (
              <div
                key={`${v}-${index}`}
                className={cn(
                  "flex items-center justify-center cursor-pointer transition-all duration-200",
                  isSelected && "text-foreground"
                )}
                style={{ 
                  height: itemHeight,
                  scrollSnapAlign: 'center',
                  opacity,
                  transform: isSelected ? 'scale(1.1)' : 'scale(0.9)',
                }}
                onClick={() => handleItemClick(index)}
              >
                <span className={cn(
                  "font-display transition-all duration-200",
                  isSelected ? "text-xl font-medium" : "text-base"
                )}>
                  {v}
                </span>
              </div>
            );
          })}
          
          {/* Bottom padding */}
          <div style={{ height: itemHeight * 2 }} />
        </div>
        
        {/* Unit label - positioned right of selection */}
        {unit && value !== '-' && (
          <div 
            className="absolute right-0 pointer-events-none z-30 pr-1"
            style={{ 
              top: itemHeight * 2,
              height: itemHeight,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span className="text-[10px] text-primary/60 font-medium">{unit}</span>
          </div>
        )}
      </div>
    </div>
  );
};
