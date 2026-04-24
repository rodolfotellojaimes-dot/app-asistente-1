-- Crear tabla para Trabajo Colegiado
CREATE TABLE IF NOT EXISTS trabajo_colegiado (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha DATE DEFAULT CURRENT_DATE,
    hora_inicio TIME,
    hora_fin TIME,
    tema TEXT NOT NULL,
    participantes TEXT, -- Lista de nombres o descripción
    acuerdos TEXT,
    compromisos TEXT,
    registrado_por TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla para Reuniones Docentes
CREATE TABLE IF NOT EXISTS reuniones_docentes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha DATE DEFAULT CURRENT_DATE,
    tipo_reunion TEXT, -- Ordinaria, Extraordinaria, Técnico-Pedagógica, etc.
    agenda TEXT NOT NULL,
    participantes TEXT,
    acuerdos TEXT,
    registrado_por TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla para Actividades Institucionales
CREATE TABLE IF NOT EXISTS actividades_institucionales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha DATE DEFAULT CURRENT_DATE,
    actividad_nombre TEXT NOT NULL,
    responsable TEXT,
    descripcion TEXT,
    resultados_impacto TEXT,
    registrado_por TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (opcional si ya manejas políticas globales)
ALTER TABLE trabajo_colegiado ENABLE ROW LEVEL SECURITY;
ALTER TABLE reuniones_docentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividades_institucionales ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (permitir todo por ahora para coincidir con el flujo actual si no hay roles complejos)
CREATE POLICY "Permitir todo a usuarios autenticados" ON trabajo_colegiado FOR ALL USING (true);
CREATE POLICY "Permitir todo a usuarios autenticados" ON reuniones_docentes FOR ALL USING (true);
CREATE POLICY "Permitir todo a usuarios autenticados" ON actividades_institucionales FOR ALL USING (true);
