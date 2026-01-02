import { Product } from '@/types/measurements';

import productTshirt from '@/assets/product-tshirt.jpg';
import productJeans from '@/assets/product-jeans.jpg';
import productJacket from '@/assets/product-jacket.jpg';
import productHoodie from '@/assets/product-hoodie.jpg';

export const sampleProducts: Product[] = [
  {
    id: '1',
    name: 'Essential Black Tee',
    category: 'T-Shirts',
    image: productTshirt,
    price: 49.99,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  },
  {
    id: '2',
    name: 'Slim Fit Dark Jeans',
    category: 'Pants',
    image: productJeans,
    price: 89.99,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    id: '3',
    name: 'Urban Bomber Jacket',
    category: 'Outerwear',
    image: productJacket,
    price: 159.99,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  },
  {
    id: '4',
    name: 'Comfort Fleece Hoodie',
    category: 'Hoodies',
    image: productHoodie,
    price: 79.99,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
];
