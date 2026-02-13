import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('--- DIAGNÓSTICO DE CONEXIÓN ---');
console.log('Fecha/Hora:', new Date().toISOString());

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ ERROR FATAL: Faltan las variables de entorno.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function keepAlive() {
    console.log('Enviando ping a Supabase...');

    // Realizamos una consulta a una tabla que probablemente no exista.
    // El simple hecho de que Supabase responda "No encuentro la tabla"
    // ya cuenta como actividad y evita que el proyecto se pause.
    const { error } = await supabase
        .from('_ping_actividad_automatica')
        .select('*')
        .limit(1);

    if (error) {
        // Si el error es sobre la tabla (no existe, no hay permisos, etc.),
        // lo consideramos ÉXITO porque hubo comunicación con la base de datos.
        console.log('Respuesta recibida de Supabase:', error.message);
        console.log('✅ ÉXITO: El ping generó actividad correctamente.');
    } else {
        console.log('✅ ÉXITO: Actividad registrada correctamente.');
    }
}

keepAlive();
