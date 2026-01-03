import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/measurements';

interface UseProductsReturn {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useProducts = (): UseProductsReturn => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('id, name, category, images, sizes')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Map database columns to Product interface
      const mappedProducts: Product[] = (data || []).map((item) => {
        // images is a jsonb array - get first image for preview
        const imagesArray = item.images as string[] | null;
        const previewImage = imagesArray && imagesArray.length > 0 ? imagesArray[0] : '';
        
        // sizes is a jsonb array
        const sizesArray = item.sizes as string[] | null;

        return {
          id: item.id,
          name: item.name || 'Unnamed Product',
          category: item.category || 'Uncategorized',
          image: previewImage,
          price: 0, // Not in your schema, using default
          sizes: sizesArray || ['S', 'M', 'L', 'XL'],
        };
      });

      setProducts(mappedProducts);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(message);
      console.error('Error fetching products:', message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    isLoading,
    error,
    refetch: fetchProducts,
  };
};
