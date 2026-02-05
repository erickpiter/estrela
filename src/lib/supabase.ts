import { createClient } from '@supabase/supabase-js';
import { Database } from '../types';

const supabaseUrl = (window as any).ENV?.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = (window as any).ENV?.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables. Env:", (window as any).ENV);
    // throw new Error('Missing Supabase environment variables'); // Don't crash immediately to allow logging
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
    }
});
