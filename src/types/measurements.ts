export interface Measurements {
  height: number;
  weight: number;
  chest: number;
  waist: number;
  hips: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  image: string;
  price: number;
  sizes: string[];
}

export interface TryOnResult {
  recommendedSize: string;
  fitScore: number;
  fitNotes: string[];
  images?: string[];
  prompt?: string;
}
