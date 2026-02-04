export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  sizes: string[];
}

export const products: Product[] = [
  // Original 5 products
  {
    id: 'OVO-STAN-VRS-2025-001',
    name: 'Stanford Varsity Jacket',
    price: 12999,
    category: 'Jackets',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=1000&fit=crop',
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    id: 'KITH-LAX-PKT-2025-002',
    name: 'Essential Pocket Tee',
    price: 2499,
    category: 'Crews',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=1000&fit=crop',
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    id: 'KNIT-POLO-JNY-2025-003',
    name: 'Knit Polo Sweater',
    price: 3499,
    category: 'Crews',
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&h=1000&fit=crop',
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    id: 'W-LEG-DENIM-2025-004',
    name: 'Wide Leg Denim',
    price: 4999,
    category: 'Pants',
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&h=1000&fit=crop',
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    id: 'BTN-DWN-BRW-2025-005',
    name: 'Button Down Oxford Shirt',
    price: 2999,
    category: 'Crews',
    image: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=800&h=1000&fit=crop',
    sizes: ['S', 'M', 'L', 'XL'],
  },
  // Women's apparel - 6 new products
  {
    id: 'JCREW-STRIPE-DRS-2026-006',
    name: 'J.Crew Striped Smocked Dress',
    price: 2999,
    category: 'Dresses',
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=1000&fit=crop',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    id: 'AEO-LACE-CUL-2026-007',
    name: 'AEO Lace Trim Culottes',
    price: 2999,
    category: 'Pants',
    image: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=800&h=1000&fit=crop',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    id: 'NEXT-CP-BTN-2026-008',
    name: 'Next Lemon Print Shirt',
    price: 2999,
    category: 'Tops',
    image: 'https://images.unsplash.com/photo-1551854838-7b93ca27c249?w=800&h=1000&fit=crop',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    id: 'NEXT-CRM-SHRT-2026-009',
    name: 'Next Braided Belt Shorts',
    price: 2999,
    category: 'Shorts',
    image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&h=1000&fit=crop',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    id: 'SHEIN-RIB-TNK-2026-010',
    name: 'SHEIN Ribbed Square Neck Tank',
    price: 2999,
    category: 'Tops',
    image: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&h=1000&fit=crop',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    id: 'SWIM-FLOR-BKN-2026-011',
    name: 'Floral Print Bikini Set',
    price: 2999,
    category: 'Swimwear',
    image: 'https://images.unsplash.com/photo-1629380940819-18e40c60290b?w=800&h=1000&fit=crop',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
];

export const categories = ["All", "Crews", "Pants", "Jackets", "Dresses", "Tops", "Shorts", "Swimwear"];

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getProductsByCategory(category: string): Product[] {
  if (category === "All") return products;
  return products.filter((p) => p.category === category);
}
