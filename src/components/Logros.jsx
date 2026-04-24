
import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Save, Trash2, CheckCircle, FileDown, Filter, Layout, FileText, FileBadge } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import logo from '../assets/logo.png';
import { supabase } from '../lib/supabase';

const Logros = () => {
    // Tab State
    const [activeTab, setActiveTab] = useState('sesion'); // 'sesion' | 'informe'

    // Shared Filters
    const [filterGrado, setFilterGrado] = useState('');
    const [filterSeccion, setFilterSeccion] = useState('');
    const [filterArea, setFilterArea] = useState('');

    // Panel 1: Registro por Sesión
    const [filterSesionNum, setFilterSesionNum] = useState(1);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Panel 2: Informe Filters
    const [filterMes, setFilterMes] = useState(new Date().getMonth());

    // Data State
    const [alumnos, setAlumnos] = useState([]);
    const [logrosData, setLogrosData] = useState({}); // For Panel 2 { student_id: { session: level } }
    const [logrosSesion, setLogrosSesion] = useState({}); // For Panel 1 { student_id: level }
    const [loading, setLoading] = useState(false);
    const [isConsulted, setIsConsulted] = useState(false);

    const areas = [
        'Matemática', 'Comunicación', 'Inglés', 'Arte y Cultura',
        'Ciencias Sociales', 'Desarrollo Personal, Ciudadanía y Cívica (DPCC)',
        'Educación Física', 'Educación Religiosa', 'Ciencia y Tecnología',
        'Educación para el Trabajo', 'Tutoría', 'Registro Auxiliar'
    ];

    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const niveles = [
        { label: 'L', value: 'Logrado', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.1)' },
        { label: 'P', value: 'Proceso', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)' },
        { label: 'I', value: 'Inicio', color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)' },
        { label: 'AD', value: 'Destacado', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)' }
    ];

    const sesionesArray = Array.from({ length: 40 }, (_, i) => i + 1);

    const handleConsultarSesion = async () => {
        if (!filterGrado || !filterSeccion || !filterArea || !filterSesionNum) {
            alert('Complete todos los filtros para continuar');
            return;
        }

        setLoading(true);
        setIsConsulted(false);
        setAlumnos([]);
        setLogrosSesion({});

        try {
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
            })).sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`));

            setAlumnos(alumnosMapeados);

            const idsAlumnos = alumnosData.map(a => a.id);
            if (idsAlumnos.length > 0) {
                const { data: logData, error: errLog } = await supabase
                    .from('achievements')
                    .select('student_id, level')
                    .in('student_id', idsAlumnos)
                    .eq('area', filterArea)
                    .eq('period', `S${filterSesionNum}`);

                if (errLog) throw errLog;

                const dailyMap = {};
                logData.forEach(reg => {
                    dailyMap[reg.student_id] = reg.level;
                });
                setLogrosSesion(dailyMap);
            }
            setIsConsulted(true);
        } catch (error) {
            console.error("Error consultando sesión:", error);
            alert("Error al cargar datos: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConsultarInforme = async () => {
        if (!filterGrado || !filterSeccion || !filterArea) {
            alert('Por favor complete los filtros básicos');
            return;
        }

        setLoading(true);
        setIsConsulted(false);
        setAlumnos([]);
        setLogrosData({});

        try {
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
            })).sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`));

            setAlumnos(alumnosMapeados);

            const idsAlumnos = alumnosData.map(a => a.id);
            if (idsAlumnos.length > 0) {
                // For the report, we usually fetch all sessions or those in a month range
                // Since 'achievements' doesn't seem to have a date for all, we fetch by area
                const { data: logData, error: errLog } = await supabase
                    .from('achievements')
                    .select('student_id, period, level')
                    .in('student_id', idsAlumnos)
                    .eq('area', filterArea);

                if (errLog) throw errLog;

                const matriz = {};
                logData.forEach(reg => {
                    const sNum = parseInt(reg.period.replace('S', ''));
                    if (!matriz[reg.student_id]) matriz[reg.student_id] = {};
                    if (!isNaN(sNum)) matriz[reg.student_id][sNum] = reg.level;
                });
                setLogrosData(matriz);
            }
            setIsConsulted(true);
        } catch (error) {
            console.error("Error consultando informe:", error);
            alert("Error al cargar datos: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSesion = async () => {
        setLoading(true);
        try {
            const upsertData = alumnos.map(alumno => ({
                student_id: alumno.id,
                period: `S${filterSesionNum}`,
                level: logrosSesion[alumno.id] || 'I',
                area: filterArea,
                competencia: 'General',
                date: selectedDate
            }));

            if (upsertData.length > 0) {
                const { error } = await supabase
                    .from('achievements')
                    .upsert(upsertData, { onConflict: 'student_id, period, area' });

                if (error) throw error;
                alert(`Avances de la Sesión ${filterSesionNum} guardados.`);
            }
        } catch (error) {
            console.error("Error guardando sesión:", error);
            alert("Error al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateSesionLevel = (alumnoId, level) => {
        setLogrosSesion(prev => ({ ...prev, [alumnoId]: level }));
    };

    const setAllSesionValue = (val) => {
        const newData = {};
        alumnos.forEach(a => {
            newData[a.id] = val;
        });
        setLogrosSesion(newData);
    };

    const exportToExcel = () => {
        const isSesion = activeTab === 'sesion';
        
        const headerInfo = [
            ["ASISTENTE DOCENTE - AVANCES DE LOGRO"],
            ["IEI PEDRO SÁNCHEZ GAVIDIA - HUÁNUCO"],
            [],
            [isSesion ? `REPORTE DE SESIÓN ${filterSesionNum} - FECHA: ${selectedDate}` : `INFORME MENSUAL DE AVANCES - MES: ${meses[filterMes].toUpperCase()}`],
            ["GRADO:", `${filterGrado}°`, "SECCIÓN:", filterSeccion, "ÁREA:", filterArea],
            []
        ];

        let tableHeaders, studentData;

        if (isSesion) {
            tableHeaders = ["N°", "APELLIDOS Y NOMBRES", "NIVEL DE LOGRO"];
            studentData = alumnos.map((a, idx) => [
                idx + 1,
                `${a.apellidos}, ${a.nombres}`,
                logrosSesion[a.id] || ''
            ]);
        } else {
            tableHeaders = ["N°", "APELLIDOS Y NOMBRES", ...Array.from({ length: 15 }, (_, i) => `S${i + 1}`)];
            studentData = alumnos.map((a, idx) => [
                idx + 1,
                `${a.apellidos}, ${a.nombres}`,
                ...Array.from({ length: 15 }, (_, i) => logrosData[a.id]?.[i + 1] || '')
            ]);
        }

        const legend = [
            [],
            ["LEYENDA:"],
            ["L", "Logrado"],
            ["P", "Proceso"],
            ["I", "Inicio"],
            ["AD", "Destacado"]
        ];

        const finalContent = [...headerInfo, tableHeaders, ...studentData, ...legend];
        const ws = XLSX.utils.aoa_to_sheet(finalContent);
        ws['!cols'] = [{ wch: 4 }, { wch: 45 }, ...Array.from({ length: 15 }, () => ({ wch: 5 }))];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Logros");
        XLSX.writeFile(wb, `Logros_${isSesion ? 'S' + filterSesionNum : meses[filterMes]}.xlsx`);
    };

    const exportToPDF = () => {
        const isSesion = activeTab === 'sesion';
        const doc = new jsPDF(isSesion ? 'p' : 'l', 'mm', 'a4');
        
        // --- BRANDED HEADER ---
        try {
            doc.addImage(logo, 'PNG', 14, 10, 15, 15);
        } catch (e) {
            console.error("Logo error:", e);
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(45, 90, 80);
        doc.text('ASISTENTE DOCENTE DIGITAL', 35, 16);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text('IEI Pedro Sánchez Gavidia - Huánuco', 35, 22);
        
        const title = isSesion 
            ? `REPORTE DE SESIÓN ${filterSesionNum} - ${selectedDate}`
            : `INFORME DE AVANCES DE LOGRO - ${meses[filterMes].toUpperCase()} (${new Date().getFullYear()})`;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text(title, 14, 35);
        
        const subtitle = `Grado: ${filterGrado}° | Sección: ${filterSeccion} | Área: ${filterArea}`;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(subtitle, 14, 42);
        // ----------------------

        let headers, data;

        if (isSesion) {
            headers = [['N°', 'Estudiante', 'Nivel de Logro']];
            data = alumnos.map((a, idx) => [idx + 1, `${a.apellidos}, ${a.nombres}`, logrosSesion[a.id] || '']);
        } else {
            headers = [['N°', 'Estudiante', ...Array.from({ length: 15 }, (_, i) => `S${i + 1}`)]];
            data = alumnos.map((a, idx) => [
                idx + 1, 
                `${a.apellidos}, ${a.nombres}`,
                ...Array.from({ length: 15 }, (_, i) => logrosData[a.id]?.[i + 1] || '')
            ]);
        }

        autoTable(doc, {
            startY: 48,
            head: headers,
            body: data,
            theme: 'grid',
            styles: { fontSize: isSesion ? 10 : 7, halign: 'center' },
            headStyles: { fillColor: [45, 90, 80], textColor: 255 },
            columnStyles: { 1: { halign: 'left', minWidth: isSesion ? 80 : 50 } },
            didParseCell: (data) => {
                if (data.section === 'body' && (isSesion ? data.column.index === 2 : data.column.index > 1)) {
                    const val = data.cell.raw;
                    if (val === 'I') data.cell.styles.textColor = [248, 113, 113];
                    if (val === 'P') data.cell.styles.textColor = [251, 191, 36];
                    if (val === 'L') data.cell.styles.textColor = [74, 222, 128];
                    if (val === 'AD') data.cell.styles.textColor = [96, 165, 250];
                }
            }
        });

        doc.save(`Logros_${isSesion ? 'S' + filterSesionNum : meses[filterMes]}.pdf`);
    };

    return (
        <div className="animate-fade" style={{ color: 'var(--text-primary)' }}>
            {/* Main Tabs */}
            <div className="glass" style={{ padding: '0px', marginBottom: '20px', display: 'flex', overflow: 'hidden' }}>
                <button 
                  onClick={() => { setActiveTab('sesion'); setIsConsulted(false); }}
                  className="tab-btn" 
                  style={{ 
                    flex: 1, padding: '15px', border: 'none', 
                    background: activeTab === 'sesion' ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                    color: activeTab === 'sesion' ? '#4ade80' : 'var(--text-secondary)',
                    fontWeight: 'bold', borderBottom: activeTab === 'sesion' ? '2px solid #4ade80' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                    <Layout size={20} /> Panel 1: Avance por Sesión
                </button>
                <button 
                  onClick={() => { setActiveTab('informe'); setIsConsulted(false); }}
                  className="tab-btn" 
                  style={{ 
                    flex: 1, padding: '15px', border: 'none', 
                    background: activeTab === 'informe' ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                    color: activeTab === 'informe' ? '#4ade80' : 'var(--text-secondary)',
                    fontWeight: 'bold', borderBottom: activeTab === 'informe' ? '2px solid #4ade80' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                    <FileBadge size={20} /> Panel 2: Informe de Avances
                </button>
            </div>

            {/* Filter Section */}
            <div className="glass" style={{ padding: '25px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <TrendingUp size={24} /> {activeTab === 'sesion' ? 'Registro Logro por Sesión' : 'Resumen Mensual de Avances'}
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', alignItems: 'end' }}>
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
                        <label>Área</label>
                        <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)}>
                            <option value="">Seleccione Área...</option>
                            {areas.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>

                    {activeTab === 'sesion' ? (
                        <>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Nro. Sesión</label>
                                <select value={filterSesionNum} onChange={(e) => setFilterSesionNum(parseInt(e.target.value))}>
                                    {sesionesArray.map(s => <option key={s} value={s}>Sesión {s}</option>)}
                                </select>
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Fecha</label>
                                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ colorScheme: 'dark' }} />
                            </div>
                        </>
                    ) : (
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Mes Informe</label>
                            <select value={filterMes} onChange={(e) => setFilterMes(parseInt(e.target.value))}>
                                {meses.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
                            </select>
                        </div>
                    )}

                    <button 
                        onClick={activeTab === 'sesion' ? handleConsultarSesion : handleConsultarInforme} 
                        className="btn btn-primary" style={{ height: '42px', background: '#2d5a50' }} disabled={loading}
                    >
                        <Search size={18} /> {loading ? '...' : 'Consultar'}
                    </button>

                    {isConsulted && (
                        <div style={{ display: 'flex', gap: '8px', gridColumn: '1 / -1', marginTop: '10px', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
                            <button onClick={exportToExcel} className="btn" style={{ background: '#1d6f42', color: 'white' }}>
                                <FileDown size={14} /> Excel
                            </button>
                            <button onClick={exportToPDF} className="btn" style={{ background: '#c43e3e', color: 'white' }}>
                                <FileText size={14} /> PDF
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Panel 1: Sesion View */}
            {activeTab === 'sesion' && isConsulted && (
                <div className="glass animate-fade" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span>Registro de Logro para </span>
                            <strong>Sesión {filterSesionNum} ({selectedDate})</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setAllSesionValue('L')} className="btn" style={{ background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' }}>
                                Todos Logrado
                            </button>
                            <button onClick={handleSaveSesion} className="btn" style={{ background: '#2d5a50', color: 'white' }}>
                                <Save size={16} /> Guardar
                            </button>
                        </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'left' }}>
                                <th style={{ padding: '15px' }}>Estudiante</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>Nivel de Logro</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alumnos.map((a) => (
                                <tr key={a.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                    <td style={{ padding: '12px 15px' }}>{a.apellidos}, {a.nombres}</td>
                                    <td style={{ padding: '12px 15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                            {niveles.map(n => (
                                                <button
                                                    key={n.label}
                                                    onClick={() => updateSesionLevel(a.id, n.label)}
                                                    style={{
                                                        width: '40px', height: '40px', borderRadius: '10px',
                                                        border: '1px solid',
                                                        borderColor: logrosSesion[a.id] === n.label ? n.color : 'var(--glass-border)',
                                                        background: logrosSesion[a.id] === n.label ? n.bg : 'transparent',
                                                        color: logrosSesion[a.id] === n.label ? n.color : 'var(--text-secondary)',
                                                        fontWeight: 'bold', cursor: 'pointer'
                                                    }}
                                                    title={n.value}
                                                >
                                                    {n.label}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Panel 2: Informe View */}
            {activeTab === 'informe' && isConsulted && (
                <div className="glass animate-fade" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead>
                                <tr style={{ background: '#2d5a50', color: 'white' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', position: 'sticky', left: 0, background: '#1a332e' }}>Estudiante</th>
                                    {Array.from({ length: 15 }, (_, i) => i + 1).map(s => (
                                        <th key={s} style={{ padding: '10px', textAlign: 'center' }}>S{s}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {alumnos.map((a) => (
                                    <tr key={a.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <td style={{ padding: '10px', position: 'sticky', left: 0, background: 'var(--card-bg)' }}>
                                            {a.apellidos}, {a.nombres}
                                        </td>
                                        {Array.from({ length: 15 }, (_, i) => i + 1).map(s => {
                                            const val = logrosData[a.id]?.[s] || '';
                                            const n = niveles.find(x => x.label === val);
                                            return (
                                                <td key={s} style={{ 
                                                    textAlign: 'center', 
                                                    color: n ? n.color : 'inherit',
                                                    fontWeight: 'bold',
                                                    background: n ? n.bg : 'transparent'
                                                }}>
                                                    {val}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isConsulted && alumnos.length === 0 && (
                <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>
                    <Search size={48} />
                    <p>No se encontraron resultados.</p>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .tab-btn:hover { background: rgba(255,255,255,0.05) !important; }
                @media print {
                    .no-print, .tab-btn, .btn, .input-group, nav { display: none !important; }
                    body { background: white !important; color: black !important; }
                    .glass { border: none !important; box-shadow: none !important; }
                    th, td { border: 1px solid #000 !important; color: black !important; }
                }
            `}} />
        </div>
    );
};

export default Logros;
