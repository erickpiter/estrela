import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from parent directory (Site root)
// In production (Docker), .env is likely at the root /app level or passed as env vars.
// We try multiple paths for compatibility (dev vs prod)
dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Dev
dotenv.config({ path: path.resolve(__dirname, '../.env') });    // Prod/Docker root

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials. Check .env file.");
    process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
