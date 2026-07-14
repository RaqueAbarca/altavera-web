import { createBrowserClient } from '@supabase/ssr';

// Jalar las variables de entorno de tu archivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// createBrowserClient gestiona automáticamente las cookies en el frontend
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);