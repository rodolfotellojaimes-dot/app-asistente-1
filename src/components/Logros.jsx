
import React, { useState } from 'react';
import { Search, TrendingUp, Save, Trash2, CheckCircle, FileDown, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

const Logros = () => {
    const [filterGrado, setFilterGrado] = useState('');
    const [filterSeccion, setFilterSeccion] = useState('');
    const [filterArea, setFilterArea] = useState('');

    const [alumnos, setAlumnos] = useState([]);
    const [logrosData, setLogrosData] = useState({});
    const [isConsulted, setIsConsulted] = useState(false);
    const [loading, setLoading] = useState(false);

    const areas = [
        'Matemática', 'Comunicación', 'Inglés', 'Arte y Cultura',
        'Ciencias Sociales', 'Desarrollo Personal, Ciudadanía y Cívica (DPCC)',
        'Educación Física', 'Educación Religiosa', 'Ciencia y Tecnología',
        'Educación para el Trabajo'
    ];

    const niveles = [
        { label: 'L', value: 'Logrado', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.1)' },
        { label: 'P', value: 'Proceso', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)' },
        { label: 'I', value: 'Inicio', color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)' },
        { label: 'AD', value: 'Destacado', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)' } // Agregado AD por si acaso
    ];

    const handleConsultar = async () => {
        if (!filterGrado || !filterSeccion || !filterArea) {
            alert('Por favor complete los filtros: Grado, Sección y Área');
            return;
        }

        setLoading(true);
        setIsConsulted(false);
        setAlumnos([]);
        setLogrosData({});

        try {
            // 1. Obtener Alumnos
            const { data: alumnosData, error: errAlumnos } = await supabase
                .from('students')
                .select('*')
                .eq('grade', filterGrado)
                .eq('section', filterSeccion);

            if (errAlumnos) throw errAlumnos;

            const alumnosMapeados = alumnosData.map(a => ({
                id: a.id,
                nombres: a.name.split(', ')[1] || a.name,
                apellidos: a.name.split(', ')[0] || ''
            }));

            // Ordenar por Apellido
            alumnosMapeados.sort((a, b) => {
                const nombreCompletoA = `${a.apellidos} ${a.nombres}`.toLowerCase();
                const nombreCompletoB = `${b.apellidos} ${b.nombres}`.toLowerCase();
                return nombreCompletoA.localeCompare(nombreCompletoB);
            });

            setAlumnos(alumnosMapeados);

            // 2. Obtener Logros Existentes (por ÁREA)
            const idsAlumnos = alumnosData.map(a => a.id);
            if (idsAlumnos.length > 0) {
                const { data: logrosDb, error: errLogros } = await supabase
                    .from('achievements')
                    .select('student_id, period, level')
                    .in('student_id', idsAlumnos)
                    .eq('area', filterArea);

                if (errLogros) throw errLogros;

                // Transformar DB -> Matriz { student_id: { 'S1': 'L', 'S2': 'P' } }
                const matriz = {};
                logrosDb.forEach(reg => {
                    // period guardará 'S1', 'S2', etc.
                    // Extraemos el número de la sesión del string 'S1' -> 1
                    const sesionNum = parseInt(reg.period.replace('S', ''));
                    if (!isNaN(sesionNum)) {
                        if (!matriz[reg.student_id]) matriz[reg.student_id] = {};
                        matriz[reg.student_id][sesionNum] = reg.level;
                    }
                });
                setLogrosData(matriz);
            }

            setIsConsulted(true);

        } catch (error) {
            console.error("Error consultando:", error);
            alert("Error al cargar datos: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateLogro = (alumnoId, sesion, valor) => {
        const newData = { ...logrosData };
        if (!newData[alumnoId]) newData[alumnoId] = {};
        newData[alumnoId][sesion] = valor;
        setLogrosData(newData);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const upsertData = [];

            alumnos.forEach(alumno => {
                const logrosAlumno = logrosData[alumno.id] || {};
                Object.entries(logrosAlumno).forEach(([sesion, nivel]) => {
                    if (nivel) {
                        upsertData.push({
                            student_id: alumno.id,
                            period: `S${sesion}`, // Guardamos como 'S1', 'S2'
                            level: nivel,
                            area: filterArea,
                            competencia: 'General' // Valor por defecto ya que UI no tiene selector de competencia
                        });
                    }
                });
            });

            if (upsertData.length > 0) {
                const { error } = await supabase
                    .from('achievements')
                    .upsert(upsertData, { onConflict: 'student_id, period, area' });

                if (error) throw error;
                alert('Avances de logro grabados exitosamente.');
            } else {
                alert('No hay datos nuevos para guardar.');
            }
        } catch (error) {
            console.error("Error guardando:", error);
            alert("Error al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const setAllInicio = () => {
        if (!window.confirm('¿Deseas marcar todas las sesiones vacías visualmente como "Inicio" (I)?')) return;
        const newData = { ...logrosData };
        alumnos.forEach(alumno => {
            if (!newData[alumno.id]) newData[alumno.id] = {};
            for (let s = 1; s <= 10; s++) {
                if (!newData[alumno.id][s]) {
                    newData[alumno.id][s] = 'I';
                }
            }
        });
        setLogrosData(newData);
    };

    const exportToExcel = () => {
        const reportData = alumnos.map((a, idx) => {
            const row = { 'Nro': idx + 1, 'Estudiante': `${a.apellidos}, ${a.nombres}` };
            for (let s = 1; s <= 10; s++) {
                row[`Sesión ${s}`] = logrosData[a.id]?.[s] || '';
            }
            return row;
        });
        const ws = XLSX.utils.json_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Logros");
        XLSX.writeFile(wb, `Logros_${filterArea}_${filterGrado}${filterSeccion}.xlsx`);
    };

    const sesiones = Array.from({ length: 10 }, (_, i) => i + 1);

    return (
        <div className="animate-fade">
            <div className="glass" style={{ padding: '25px', marginBottom: '20px', borderLeft: '4px solid hsl(var(--accent-hsl))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ padding: '10px', borderRadius: '12px', background: 'hsla(var(--accent-hsl), 0.1)', color: 'hsl(var(--accent-hsl))' }}>
                        <TrendingUp size={24} />
                    </div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>Avance de Logros por Sesión</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Grado</label>
                        <select value={filterGrado} onChange={(e) => setFilterGrado(e.target.value)}>
                            <option value="">Seleccione...</option>
                            {[1, 2, 3, 4, 5].map(g => <option key={g} value={g}>{g}°</option>)}
                        </select>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Sección</label>
                        <select value={filterSeccion} onChange={(e) => setFilterSeccion(e.target.value)}>
                            <option value="">Seleccione...</option>
                            {['A', 'B', 'C'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Área Curricular</label>
                        <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)}>
                            <option value="">Seleccione Área...</option>
                            {areas.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                    <button onClick={handleConsultar} className="btn btn-primary" style={{ height: '45px', background: 'linear-gradient(135deg, hsl(var(--accent-hsl)), hsl(var(--primary-hsl)))' }} disabled={loading}>
                        <Filter size={18} /> {loading ? 'Cargando...' : 'Cargar Lista'}
                    </button>
                </div>
            </div>

            {isConsulted && (
                <>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <button onClick={handleSave} className="btn btn-primary" style={{ background: '#2d5a27' }} disabled={loading}><Save size={18} /> {loading ? 'Guardando...' : 'Grabar Avances'}</button>
                        <button onClick={setAllInicio} className="btn" style={{ background: 'var(--glass-bg)', color: '#f87171' }}><CheckCircle size={18} /> Llenar Inicio (I)</button>
                        <button onClick={exportToExcel} className="btn" style={{ background: 'var(--glass-bg)', color: '#10b981' }}><FileDown size={18} /> Exportar</button>
                    </div>

                    <div className="glass" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="asistencia-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'hsla(var(--accent-hsl), 0.1)' }}>
                                        <th style={{ padding: '15px', textAlign: 'left', border: '1px solid var(--glass-border)', position: 'sticky', left: 0, background: 'var(--card-bg)', zIndex: 10, minWidth: '220px' }}>Estudiante</th>
                                        {sesiones.map(s => (
                                            <th key={s} style={{ padding: '10px', border: '1px solid var(--glass-border)', textAlign: 'center', minWidth: '50px' }}>S{s}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {alumnos.map((alumno, idx) => (
                                        <tr key={alumno.id}>
                                            <td style={{ padding: '10px 15px', border: '1px solid var(--glass-border)', position: 'sticky', left: 0, background: 'var(--card-bg)', zIndex: 5, fontSize: '0.85rem' }}>
                                                {idx + 1}. {alumno.apellidos}, {alumno.nombres}
                                            </td>
                                            {sesiones.map(s => {
                                                const currentVal = logrosData[alumno.id]?.[s] || '';
                                                const nivelActivo = niveles.find(n => n.label === currentVal);
                                                return (
                                                    <td key={s} style={{ padding: '0', border: '1px solid var(--glass-border)' }}>
                                                        <select
                                                            value={currentVal}
                                                            onChange={(e) => updateLogro(alumno.id, s, e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                height: '40px',
                                                                border: 'none',
                                                                background: nivelActivo ? nivelActivo.bg : 'transparent',
                                                                textAlign: 'center',
                                                                color: nivelActivo ? nivelActivo.color : 'var(--text-primary)',
                                                                fontWeight: 'bold',
                                                                cursor: 'pointer',
                                                                outline: 'none',
                                                                textAlignLast: 'center'
                                                            }}
                                                        >
                                                            <option value=""></option>
                                                            {niveles.map(n => <option key={n.label} value={n.label}>{n.label}</option>)}
                                                        </select>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                    {alumnos.length === 0 && (
                                        <tr><td colSpan="11" style={{ padding: '20px', textAlign: 'center' }}>No hay alumnos</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Legend */}
                        <div style={{ padding: '15px 25px', display: 'flex', justifyContent: 'center', gap: '20px', borderTop: '1px solid var(--glass-border)' }}>
                            {niveles.map(n => (
                                <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                                    <span style={{ fontWeight: 'bold', color: n.color, background: n.bg, padding: '2px 8px', borderRadius: '4px' }}>{n.label}</span>
                                    <span style={{ opacity: 0.7 }}>{n.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Logros;
