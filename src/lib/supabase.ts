import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://negclsyrkflhurfjhtan.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_p_dx-bPEiqT0HjyU08ikNQ_tqHuOYJM";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
