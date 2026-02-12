
import React, { useState } from 'react';
import { Search, Calendar, Printer, FileDown, CheckCircle, Save, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

const Asistencia = () => {
    const [filterGrado, setFilterGrado] = useState('');
    const [filterSeccion, setFilterSeccion] = useState('');
    const [filterArea, setFilterArea] = useState('');
    const [filterMes, setFilterMes] = useState(new Date().getMonth());

    const [alumnos, setAlumnos] = useState([]);
    const [asistenciaData, setAsistenciaData] = useState({});
    const [isConsulted, setIsConsulted] = useState(false);
    const [loading, setLoading] = useState(false);

    const areas = [
        'Matemática', 'Comunicación', 'Inglés', 'Arte y Cultura',
        'Ciencias Sociales', 'Desarrollo Personal, Ciudadanía y Cívica (DPCC)',
        'Educación Física', 'Educación Religiosa', 'Ciencia y Tecnología',
        'Educación para el Trabajo'
    ];

    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const estados = [
        { label: '.', value: 'Presente', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.1)' },
        { label: 'F', value: 'Falta', color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)' },
        { label: 'J', value: 'Justificada', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)' },
        { label: 'T', value: 'Tardanza', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)' }
    ];

    const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

    const getDaysInMonth = (month) => {
        const year = new Date().getFullYear();
        return new Date(year, month + 1, 0).getDate();
    };

    const handleConsultar = async () => {
        if (!filterGrado || !filterSeccion || !filterArea) {
            alert('Por favor complete todos los filtros: Grado, Sección y Área');
            return;
        }

        setLoading(true);
        setIsConsulted(false);
        setAlumnos([]);
        setAsistenciaData({});

        try {
            // 1. Obtener Alumnos
            const { data: alumnosData, error: errAlumnos } = await supabase
                .from('students')
                .select('*')
                .eq('grade', filterGrado)
                .eq('section', filterSeccion);

            if (errAlumnos) throw errAlumnos;

            /* Mapeo para normalizar nombres */
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

            // 2. Obtener Asistencia (filtrado por ÁREA)
            const year = new Date().getFullYear();
            const startDate = `${year}-${String(filterMes + 1).padStart(2, '0')}-01`;
            const endDate = `${year}-${String(filterMes + 1).padStart(2, '0')}-${getDaysInMonth(filterMes)}`;

            const idsAlumnos = alumnosData.map(a => a.id);
            if (idsAlumnos.length > 0) {
                const { data: attData, error: errAtt } = await supabase
                    .from('attendance')
                    .select('student_id, date, status')
                    .in('student_id', idsAlumnos)
                    .eq('area', filterArea) // FILTRO POR ÁREA
                    .gte('date', startDate)
                    .lte('date', endDate);

                if (errAtt) throw errAtt;

                const matriz = {};
                attData.forEach(reg => {
                    const dia = new Date(reg.date + 'T12:00:00').getDate();
                    if (!matriz[reg.student_id]) matriz[reg.student_id] = {};
                    matriz[reg.student_id][dia] = reg.status;
                });
                setAsistenciaData(matriz);
            }

            setIsConsulted(true);
        } catch (error) {
            console.error("Error consultando:", error);
            alert("Error al cargar datos: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateAsistencia = (alumnoId, dia, valor) => {
        const newData = { ...asistenciaData };
        if (!newData[alumnoId]) newData[alumnoId] = {};
        newData[alumnoId][dia] = valor;
        setAsistenciaData(newData);
    };

    const handleSave = async () => {
        if (!filterArea) {
            alert("Seleccione un área");
            return;
        }
        setLoading(true);
        try {
            const year = new Date().getFullYear();
            const month = String(filterMes + 1).padStart(2, '0');
            const upsertData = [];

            alumnos.forEach(alumno => {
                const asistenciaAlumno = asistenciaData[alumno.id] || {};
                Object.entries(asistenciaAlumno).forEach(([dia, estado]) => {
                    if (estado) {
                        const diaStr = String(dia).padStart(2, '0');
                        upsertData.push({
                            student_id: alumno.id,
                            date: `${year}-${month}-${diaStr}`,
                            status: estado,
                            area: filterArea // GUARDAR ÁREA
                        });
                    }
                });
            });

            if (upsertData.length > 0) {
                const { error } = await supabase
                    .from('attendance')
                    .upsert(upsertData, { onConflict: 'student_id, date, area' }); // CONSTRAINT NUEVA

                if (error) throw error;
                alert('Datos para el área ' + filterArea + ' grabados correctamente.');
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

    const clearRegisters = async () => {
        if (window.confirm(`¿Deseas limpiar todos los registros de ${filterArea} de este mes? ATENCIÓN: Esto es irreversible.`)) {
            setLoading(true);
            try {
                const year = new Date().getFullYear();
                const startDate = `${year}-${String(filterMes + 1).padStart(2, '0')}-01`;
                const endDate = `${year}-${String(filterMes + 1).padStart(2, '0')}-${getDaysInMonth(filterMes)}`;
                const idsAlumnos = alumnos.map(a => a.id);

                const { error } = await supabase
                    .from('attendance')
                    .delete()
                    .in('student_id', idsAlumnos)
                    .eq('area', filterArea) // SOLO BORRAR DEL ÁREA ACTUAL
                    .gte('date', startDate)
                    .lte('date', endDate);

                if (error) throw error;

                setAsistenciaData({});
                alert('Registros eliminados del sistema.');
            } catch (error) {
                console.error("Error eliminando:", error);
                alert("Error al eliminar: " + error.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const setAllPresent = () => {
        if (!window.confirm('¿Llenar asistencia con "Presente" (.) para los días laborables vacíos visualmente?')) return;

        const newData = { ...asistenciaData };
        const diasDelMes = getDaysInMonth(filterMes);
        const year = new Date().getFullYear();

        alumnos.forEach(alumno => {
            if (!newData[alumno.id]) newData[alumno.id] = {};
            for (let d = 1; d <= diasDelMes; d++) {
                const date = new Date(year, filterMes, d);
                const dayOfWeek = date.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !newData[alumno.id][d]) {
                    newData[alumno.id][d] = '.';
                }
            }
        });

        setAsistenciaData(newData);
    };

    const exportToExcel = () => {
        const diasDelMes = getDaysInMonth(filterMes);
        const reportData = alumnos.map((a, idx) => {
            const row = {
                'Nro. Orden': idx + 1,
                'Nombres y Apellidos': `${a.apellidos}, ${a.nombres}`
            };
            for (let d = 1; d <= diasDelMes; d++) {
                row[d] = asistenciaData[a.id]?.[d] || '';
            }
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
        XLSX.writeFile(wb, `Asistencia_${filterArea}_${meses[filterMes]}.xlsx`);
    };

    const diasDelMes = getDaysInMonth(filterMes);
    const diasArray = Array.from({ length: diasDelMes }, (_, i) => i + 1);
    const currentYear = new Date().getFullYear();

    return (
        <div className="animate-fade no-print" style={{ color: 'var(--text-primary)' }}>
            {/* Header SIAGIE Style */}
            <div className="glass" style={{ padding: '20px', marginBottom: '20px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div>
                        <h1 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0 }}>REGISTRO DE ASISTENCIA - {meses[filterMes].toUpperCase()}</h1>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Área: <strong style={{ color: 'var(--text-primary)' }}>{filterArea || '---'}</strong></p>
                        <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>IE: 1423615 0 COLEGIO MAYOR SECUNDARIO PRESIDENTE DEL PERU</p>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                        <div>Grado: {filterGrado ? filterGrado + '°' : '---'}</div>
                        <div>Sección: {filterSeccion || '---'}</div>
                    </div>
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <button onClick={handleSave} className="btn" style={{ background: '#2d5a27', color: 'white', padding: '8px 15px', fontSize: '0.85rem' }} disabled={!isConsulted || loading}>
                        <Save size={16} /> {loading ? 'Guardando...' : 'Grabar'}
                    </button>
                    <button onClick={clearRegisters} className="btn" style={{ background: '#2d5a27', color: 'white', padding: '8px 15px', fontSize: '0.85rem' }} disabled={!isConsulted || loading}>
                        <Trash2 size={16} /> Limpiar registros
                    </button>
                    <button onClick={() => window.print()} className="btn" style={{ background: '#2d5a27', color: 'white', padding: '8px 15px', fontSize: '0.85rem' }}>
                        <Printer size={16} /> Imprimir
                    </button>
                    <button onClick={setAllPresent} className="btn" style={{ background: '#2d5a27', color: 'white', padding: '8px 15px', fontSize: '0.85rem' }} disabled={!isConsulted}>
                        <CheckCircle size={16} /> Llenar (.)
                    </button>
                    <button onClick={exportToExcel} className="btn" style={{ background: '#2d5a27', color: 'white', padding: '8px 15px', fontSize: '0.85rem' }} disabled={!isConsulted}>
                        <FileDown size={16} /> Excel
                    </button>
                </div>

                {/* Filtros Internos */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', alignItems: 'end', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Grado</label>
                        <select value={filterGrado} onChange={(e) => setFilterGrado(e.target.value)} style={{ padding: '8px' }}>
                            <option value="">Seleccione...</option>
                            {[1, 2, 3, 4, 5].map(g => <option key={g} value={g}>{g}°</option>)}
                        </select>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Sección</label>
                        <select value={filterSeccion} onChange={(e) => setFilterSeccion(e.target.value)} style={{ padding: '8px' }}>
                            <option value="">Seleccione...</option>
                            {['A', 'B', 'C'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Área</label>
                        <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} style={{ padding: '8px' }}>
                            <option value="">Seleccione...</option>
                            {areas.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Mes</label>
                        <select value={filterMes} onChange={(e) => setFilterMes(parseInt(e.target.value))} style={{ padding: '8px' }}>
                            {meses.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
                        </select>
                    </div>
                    <button onClick={handleConsultar} className="btn btn-primary" style={{ height: '38px' }} disabled={loading}>
                        <Search size={16} /> {loading ? '...' : 'Consultar'}
                    </button>
                </div>
            </div>

            {isConsulted && alumnos.length > 0 && (
                <div className="glass" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                            <thead>
                                <tr style={{ background: '#2d5a27', color: 'white' }}>
                                    <th rowSpan="2" style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.1)', minWidth: '60px' }}>Nro. Orden</th>
                                    <th rowSpan="2" style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.1)', minWidth: '250px', textAlign: 'left', position: 'sticky', left: 0, background: '#2d5a27', zIndex: 10 }}>Nombres</th>
                                    {diasArray.map(d => {
                                        const date = new Date(currentYear, filterMes, d);
                                        const wd = weekDays[date.getDay()];
                                        const isWeekend = wd === 'S' || wd === 'D';
                                        return (
                                            <th key={`wd-${d}`} style={{
                                                padding: '5px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                textAlign: 'center',
                                                minWidth: '30px',
                                                background: isWeekend ? '#444' : '#2d5a27'
                                            }}>
                                                {wd}
                                            </th>
                                        );
                                    })}
                                </tr>
                                <tr style={{ background: '#2d5a27', color: 'white' }}>
                                    {diasArray.map(d => {
                                        const date = new Date(currentYear, filterMes, d);
                                        const wd = weekDays[date.getDay()];
                                        const isWeekend = wd === 'S' || wd === 'D';
                                        return (
                                            <th key={`dn-${d}`} style={{
                                                padding: '5px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                textAlign: 'center',
                                                background: isWeekend ? '#555' : '#2d5a27'
                                            }}>
                                                {d}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {alumnos.map((alumno, idx) => (
                                    <tr key={alumno.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <td style={{ padding: '8px', borderRight: '1px solid var(--glass-border)', textAlign: 'center' }}>{idx + 1}</td>
                                        <td style={{ padding: '8px', borderRight: '1px solid var(--glass-border)', position: 'sticky', left: 0, background: 'var(--card-bg)', zIndex: 5 }}>
                                            {alumno.apellidos}, {alumno.nombres}
                                        </td>
                                        {diasArray.map(d => {
                                            const date = new Date(currentYear, filterMes, d);
                                            const wd = weekDays[date.getDay()];
                                            const isWeekend = wd === 'S' || wd === 'D';
                                            const currentVal = asistenciaData[alumno.id]?.[d] || '';
                                            const estadoActivo = estados.find(e => e.label === currentVal);

                                            return (
                                                <td key={`cell-${d}`} style={{
                                                    padding: '0',
                                                    borderRight: '1px solid var(--glass-border)',
                                                    textAlign: 'center',
                                                    background: isWeekend ? 'rgba(0,0,0,0.05)' : 'transparent'
                                                }}>
                                                    <select
                                                        value={currentVal}
                                                        onChange={(e) => updateAsistencia(alumno.id, d, e.target.value)}
                                                        disabled={isWeekend}
                                                        style={{
                                                            width: '100%',
                                                            height: '35px',
                                                            border: 'none',
                                                            background: isWeekend ? 'transparent' : (estadoActivo ? estadoActivo.bg : 'transparent'),
                                                            textAlign: 'center',
                                                            cursor: isWeekend ? 'default' : 'pointer',
                                                            color: estadoActivo ? estadoActivo.color : 'var(--text-primary)',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.9rem',
                                                            outline: 'none',
                                                            textAlignLast: 'center',
                                                            opacity: isWeekend ? 0.3 : 1
                                                        }}
                                                    >
                                                        <option value=""></option>
                                                        {estados.map(e => <option key={e.label} value={e.label}>{e.label}</option>)}
                                                    </select>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Legend */}
                    <div style={{ padding: '15px 25px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.01)' }}>
                        {estados.map(e => (
                            <div key={e.label} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.7rem'
                            }}>
                                <span style={{ fontWeight: '800', color: e.color, background: e.bg, padding: '2px 8px', borderRadius: '4px' }}>{e.label}</span>
                                <span style={{ opacity: 0.7 }}>{e.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isConsulted && alumnos.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No se encontraron alumnos para los filtros seleccionados.
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    .no-print { display: block !important; }
                    .btn, .input-group, button { display: none !important; }
                    body { background: white !important; color: black !important; }
                    .glass { border: none !important; box-shadow: none !important; }
                    th, td { border: 1px solid #333 !important; color: black !important; }
                    select { appearance: none; border: none !important; }
                }
            `}} />
        </div>
    );
};

export default Asistencia;
