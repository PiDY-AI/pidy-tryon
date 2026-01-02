import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://owipkfsjnmydsjhbfjqu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_m9E_wkaJKaJQ6lSyZXfnZg_9pS_G5VX";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
