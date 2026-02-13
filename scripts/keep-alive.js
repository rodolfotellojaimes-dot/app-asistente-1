import { createClient } from '@supabase/supabase-js';

// Leer de variables de entorno (GitHub Secrets)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: SUPABASE_URL y SUPABASE_ANON_KEY son requeridos.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function keepAlive() {
    console.log('Iniciando keep-alive ping (ESM)...');

    const { data, error } = await supabase
        .from('_keep_alive_ping')
        .select('*')
        .limit(1);

    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
        console.error('Error al realizar el ping:', error.message);
        process.exit(1);
    }

    console.log('Ping completado con éxito.');
}

keepAlive();
