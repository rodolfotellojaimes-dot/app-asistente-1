import { createClient } from '@supabase/supabase-js';

// Leer de variables de entorno (GitHub Secrets)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('--- DIAGNÓSTICO DE CONEXIÓN (MÓDULO ESM) ---');
console.log('Fecha/Hora:', new Date().toISOString());

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ ERROR FATAL: Faltan las variables de entorno necesarias.');
    process.exit(1);
}

try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log('Enviando ping a Supabase...');
    const { error } = await supabase
        .from('_keep_alive_ping')
        .select('*')
        .limit(1);

    if (error && !['PGRST116', '42P01'].includes(error.code)) {
        console.error('❌ ERROR DE SUPABASE:', error.message);
        process.exit(1);
    }

    console.log('✅ ÉXITO: Actividad registrada correctamente.');
} catch (err) {
    console.error('❌ ERROR INESPERADO:', err.message);
    process.exit(1);
}
