import { createClient } from '@supabase/supabase-js';

// Intentar leer de variables con y sin prefijo VITE_
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('--- DIAGNÓSTICO DE CONEXIÓN ---');
console.log('Fecha/Hora:', new Date().toISOString());
console.log('SUPABASE_URL configurada:', supabaseUrl ? 'SÍ' : 'NO');
console.log('SUPABASE_ANON_KEY configurada:', supabaseAnonKey ? 'SÍ' : 'NO (Longitud: ' + (supabaseAnonKey?.length || 0) + ')');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ ERROR FATAL: Faltan las variables de entorno necesarias.');
    console.log('Por favor, asegúrate de que los nombres en GitHub Secrets coincidan con SUPABASE_URL o VITE_SUPABASE_URL.');
    process.exit(1);
}

try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    async function keepAlive() {
        console.log('Enviando ping a Supabase...');

        // Consulta que cuenta como actividad incluso si la tabla no existe
        const { data, error } = await supabase
            .from('_keep_alive_activity_check')
            .select('*')
            .limit(1);

        if (error) {
            // Ignoramos errores de "tabla no encontrada" porque indican que la conexión fue exitosa
            const okErrors = ['PGRST116', '42P01'];
            if (okErrors.includes(error.code)) {
                console.log('✅ ÉXITO: Conexión establecida (el error de tabla inexistente es normal y cuenta como actividad).');
            } else {
                console.error('❌ ERROR DE SUPABASE:', error.message);
                console.error('Código de error:', error.code);
                process.exit(1);
            }
        } else {
            console.log('✅ ÉXITO: Respuesta recibida de la base de datos.');
        }
    }

    await keepAlive();
} catch (err) {
    console.error('❌ ERROR INESPERADO:', err.message);
    process.exit(1);
}
