export interface TryonPrediction {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  garment_type: string;
  category: string;
  size: string;
  product_size_data: Record<string, any> | null;
  product_images: any | null;
  body_measurements: Record<string, number> | null;
  body_type: string | null;
  human_image_url: string | null;
  fit_calculations: Record<string, any> | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  tryon_generations?: TryonGeneration[];
}

export interface TryonGeneration {
  id: string;
  prediction_id: string;
  generation_number: number;
  provider: string;
  prompt_model: string | null;
  image_model: string | null;
  system_prompt: string | null;
  user_message: string | null;
  raw_llm_response: string | null;
  extracted_prompt: string | null;
  image_prompt_sent: string | null;
  raw_image_response: Record<string, any> | null;
  generated_image_url: string | null;
  prompt_input_tokens: number | null;
  prompt_output_tokens: number | null;
  prompt_cost: number | null;
  prompt_duration_ms: number | null;
  image_cost: number | null;
  image_duration_ms: number | null;
  total_cost: number | null;
  total_duration_ms: number | null;
  status: string;
  error_message: string | null;
  error_stage: string | null;
  rating: number | null;
  review_notes: string | null;
  is_approved: boolean | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface PredictionFilters {
  search: string;
  productId: string;
  tags: string;
  dateRange: 'all' | '24h' | '7d' | '30d';
  status: 'all' | 'completed' | 'failed' | 'pending' | 'generating_prompt' | 'generating_image';
  page: number;
  pageSize: number;
}

export interface TryonTestRequest {
  productId?: string;
  predictionId?: string;
  size?: string;
  provider?: 'claude-openai' | 'cerebras-replicate';
  replicateModel?: 'klein-9b' | 'flux-2-pro';
  notes?: string;
  tags?: string[];
}

export interface TryonTestResponse {
  success: boolean;
  prediction_id: string;
  generation_id: string;
  generation_number: number;
  status: string;
  prediction: Record<string, any>;
  generation: Record<string, any>;
}
