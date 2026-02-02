import { Product } from '@/types/measurements';
import { Button } from '@/components/ui/button';
import { Shirt } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onTryOn: (product: Product) => void;
  isSelected?: boolean;
}

export const ProductCard = ({ product, onTryOn, isSelected }: ProductCardProps) => {
  return (
    <div 
      className={`glass-card rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
        isSelected ? 'glow-border' : ''
      }`}
    >
      <div className="aspect-[3/4] relative overflow-hidden bg-secondary">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            onError={(e) => e.currentTarget.style.display = 'none'}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Shirt className="w-12 h-12 opacity-50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs text-primary uppercase tracking-wider font-medium">
            {product.category}
          </p>
          <h3 className="font-semibold text-foreground mt-1">{product.name}</h3>
          <p className="text-lg font-bold text-foreground mt-1">
            ${product.price.toFixed(2)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {product.sizes.map(size => (
            <span 
              key={size}
              className="px-2 py-0.5 text-xs bg-secondary rounded-md text-muted-foreground"
            >
              {size}
            </span>
          ))}
        </div>
        <Button 
          onClick={() => onTryOn(product)} 
          variant="glass" 
          className="w-full gap-2"
        >
          <Shirt className="w-4 h-4" />
          Try On
        </Button>
      </div>
    </div>
  );
};
