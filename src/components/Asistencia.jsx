
import React, { useState, useEffect } from 'react';
import { Search, Calendar, Printer, FileDown, CheckCircle, Save, Trash2, Layout, FileText, FileBadge } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

const Asistencia = () => {
    // Tab State
    const [activeTab, setActiveTab] = useState('registro'); // 'registro' | 'informe'

    // Shared Filters
    const [filterGrado, setFilterGrado] = useState('');
    const [filterSeccion, setFilterSeccion] = useState('');
    const [filterArea, setFilterArea] = useState('');

    // Panel 1: Registro Diario Filters
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Panel 2: Informe Filters
    const [filterMes, setFilterMes] = useState(new Date().getMonth());

    // Data State
    const [alumnos, setAlumnos] = useState([]);
    const [asistenciaData, setAsistenciaData] = useState({}); // For Panel 2 { student_id: { day: status } }
    const [asistenciaDiaria, setAsistenciaDiaria] = useState({}); // For Panel 1 { student_id: status }
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

    const handleConsultarRegistro = async () => {
        if (!filterGrado || !filterSeccion || !filterArea || !selectedDate) {
            alert('Por favor complete todos los filtros: Grado, Sección, Área y Fecha');
            return;
        }

        setLoading(true);
        setIsConsulted(false);
        setAlumnos([]);
        setAsistenciaDiaria({});

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
            })).sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`));

            setAlumnos(alumnosMapeados);

            // 2. Obtener Asistencia de ese día
            const idsAlumnos = alumnosData.map(a => a.id);
            if (idsAlumnos.length > 0) {
                const { data: attData, error: errAtt } = await supabase
                    .from('attendance')
                    .select('student_id, status')
                    .in('student_id', idsAlumnos)
                    .eq('area', filterArea)
                    .eq('date', selectedDate);

                if (errAtt) throw errAtt;

                const dailyMap = {};
                attData.forEach(reg => {
                    dailyMap[reg.student_id] = reg.status;
                });
                setAsistenciaDiaria(dailyMap);
            }
            setIsConsulted(true);
        } catch (error) {
            console.error("Error consultando diario:", error);
            alert("Error al cargar datos: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConsultarInforme = async () => {
        if (!filterGrado || !filterSeccion || !filterArea) {
            alert('Por favor complete todos los filtros: Grado, Sección y Área');
            return;
        }

        setLoading(true);
        setIsConsulted(false);
        setAlumnos([]);
        setAsistenciaData({});

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

            const year = new Date().getFullYear();
            const startDate = `${year}-${String(filterMes + 1).padStart(2, '0')}-01`;
            const endDate = `${year}-${String(filterMes + 1).padStart(2, '0')}-${getDaysInMonth(filterMes)}`;

            const idsAlumnos = alumnosData.map(a => a.id);
            if (idsAlumnos.length > 0) {
                const { data: attData, error: errAtt } = await supabase
                    .from('attendance')
                    .select('student_id, date, status')
                    .in('student_id', idsAlumnos)
                    .eq('area', filterArea)
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
            console.error("Error consultando informe:", error);
            alert("Error al cargar datos: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDaily = async () => {
        if (!filterArea || !selectedDate) {
            alert("Seleccione área y fecha");
            return;
        }
        setLoading(true);
        try {
            const upsertData = alumnos.map(alumno => ({
                student_id: alumno.id,
                date: selectedDate,
                status: asistenciaDiaria[alumno.id] || '.', // Default to Presente if empty? Or just filter out?
                area: filterArea
            })).filter(d => d.status); // Only save if has status

            if (upsertData.length > 0) {
                const { error } = await supabase
                    .from('attendance')
                    .upsert(upsertData, { onConflict: 'student_id, date, area' });

                if (error) throw error;
                alert('Asistencia del ' + selectedDate + ' guardada correctamente.');
            }
        } catch (error) {
            console.error("Error guardando diario:", error);
            alert("Error al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateDailyStatus = (alumnoId, status) => {
        setAsistenciaDiaria(prev => ({ ...prev, [alumnoId]: status }));
    };

    const setAllDailyPresent = () => {
        const newData = {};
        alumnos.forEach(a => {
            newData[a.id] = '.';
        });
        setAsistenciaDiaria(newData);
    };

    const exportToExcel = () => {
        const isDaily = activeTab === 'registro';
        
        // Estructura de encabezado institucional
        const headerInfo = [
            ["ASISTENTE DOCENTE - SISTEMA DE GESTIÓN ESCOLAR"],
            ["IEI PEDRO SÁNCHEZ GAVIDIA - HUÁNUCO"],
            [],
            [isDaily ? `REPORTE DIARIO DE ASISTENCIA - ${selectedDate}` : `REPORTE MENSUAL DE ASISTENCIA - ${meses[filterMes].toUpperCase()}`],
            ["GRADO:", `${filterGrado}°`, "SECCIÓN:", filterSeccion, "ÁREA:", filterArea],
            []
        ];

        let tableHeaders, studentData;

        if (isDaily) {
            tableHeaders = ["N°", "APELLIDOS Y NOMBRES", "ESTADO"];
            studentData = alumnos.map((a, idx) => [
                idx + 1,
                `${a.apellidos}, ${a.nombres}`,
                asistenciaDiaria[a.id] || ''
            ]);
        } else {
            const diasDelMes = getDaysInMonth(filterMes);
            tableHeaders = ["N°", "APELLIDOS Y NOMBRES", ...Array.from({ length: diasDelMes }, (_, i) => i + 1)];
            studentData = alumnos.map((a, idx) => [
                idx + 1,
                `${a.apellidos}, ${a.nombres}`,
                ...Array.from({ length: diasDelMes }, (_, i) => asistenciaData[a.id]?.[i + 1] || '')
            ]);
        }

        const legend = [
            [],
            ["LEYENDA:"],
            [".", "Presente"],
            ["F", "Falta"],
            ["J", "Justificada"],
            ["T", "Tardanza"]
        ];

        const finalContent = [...headerInfo, tableHeaders, ...studentData, ...legend];
        const ws = XLSX.utils.aoa_to_sheet(finalContent);

        const colWidths = [
            { wch: 4 },   // N°
            { wch: 45 },  // Nombres
            ...(isDaily ? [{ wch: 15 }] : Array.from({ length: getDaysInMonth(filterMes) }, () => ({ wch: 3 })))
        ];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
        XLSX.writeFile(wb, `Asistencia_${isDaily ? selectedDate : meses[filterMes]}_${filterArea}.xlsx`);
    };

    const exportToPDF = () => {
        const isDaily = activeTab === 'registro';
        const doc = new jsPDF(isDaily ? 'p' : 'l', 'mm', 'a4'); // Retrato para diario, Paisaje para mensual
        
        const title = isDaily 
            ? `REPORTE DIARIO DE ASISTENCIA - ${selectedDate}`
            : `REPORTE MENSUAL DE ASISTENCIA - ${meses[filterMes].toUpperCase()} (${new Date().getFullYear()})`;
        
        const subtitle = `Grado: ${filterGrado}° | Sección: ${filterSeccion} | Área: ${filterArea}`;

        doc.setFontSize(16);
        doc.text(title, 14, 15);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(subtitle, 14, 22);

        let headers, data, styles;

        if (isDaily) {
            headers = [['N°', 'Nombres y Apellidos', 'Estado']];
            data = alumnos.map((a, idx) => [
                idx + 1,
                `${a.apellidos}, ${a.nombres}`,
                asistenciaDiaria[a.id] || ''
            ]);
            styles = { fontSize: 10, cellPadding: 3 };
        } else {
            const diasDelMes = getDaysInMonth(filterMes);
            headers = [['N°', 'Nombres y Apellidos', ...Array.from({ length: diasDelMes }, (_, i) => i + 1)]];
            data = alumnos.map((a, idx) => [
                idx + 1,
                `${a.apellidos}, ${a.nombres}`,
                ...Array.from({ length: diasDelMes }, (_, i) => asistenciaData[a.id]?.[i + 1] || '')
            ]);
            styles = { fontSize: 6, cellPadding: 1 };
        }

        autoTable(doc, {
            startY: 28,
            head: headers,
            body: data,
            theme: 'grid',
            styles: { ...styles, halign: 'center' },
            headStyles: { fillColor: [45, 90, 39], halign: 'center' },
            columnStyles: { 1: { halign: 'left', minWidth: isDaily ? 80 : 40 } },
            didParseCell: (data) => {
                if (data.section === 'body' && (isDaily ? data.column.index === 2 : data.column.index > 1)) {
                    const status = data.cell.raw;
                    if (status === 'F') data.cell.styles.textColor = [248, 113, 113];
                    if (status === 'J') data.cell.styles.textColor = [251, 191, 36];
                    if (status === 'T') data.cell.styles.textColor = [96, 165, 250];
                    if (status === '.') data.cell.styles.textColor = [74, 222, 128];
                }
                
                if (!isDaily && data.column.index > 1) {
                    const dayStr = data.column.index - 1;
                    const date = new Date(new Date().getFullYear(), filterMes, dayStr);
                    if (date.getDay() === 0 || date.getDay() === 6) {
                        data.cell.styles.fillColor = [240, 240, 240];
                    }
                }
            }
        });

        doc.save(`Asistencia_${isDaily ? selectedDate : meses[filterMes]}_${filterArea}.pdf`);
    };

    const currentYear = new Date().getFullYear();
    const diasDelMes = getDaysInMonth(filterMes);
    const diasArray = Array.from({ length: diasDelMes }, (_, i) => i + 1);

    return (
        <div className="animate-fade no-print" style={{ color: 'var(--text-primary)' }}>
            {/* Main Tabs Container */}
            <div className="glass" style={{ padding: '0px', marginBottom: '20px', display: 'flex', overflow: 'hidden' }}>
                <button 
                  onClick={() => { setActiveTab('registro'); setIsConsulted(false); }}
                  className="tab-btn" 
                  style={{ 
                    flex: 1, 
                    padding: '15px', 
                    border: 'none', 
                    background: activeTab === 'registro' ? 'rgba(45, 90, 39, 0.2)' : 'transparent',
                    color: activeTab === 'registro' ? '#4ade80' : 'var(--text-secondary)',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    borderBottom: activeTab === 'registro' ? '2px solid #4ade80' : 'none',
                    transition: 'all 0.3s'
                  }}
                >
                    <Layout size={20} />
                    Panel 1: Registro de Asistencia
                </button>
                <button 
                  onClick={() => { setActiveTab('informe'); setIsConsulted(false); }}
                  className="tab-btn" 
                  style={{ 
                    flex: 1, 
                    padding: '15px', 
                    border: 'none', 
                    background: activeTab === 'informe' ? 'rgba(45, 90, 39, 0.2)' : 'transparent',
                    color: activeTab === 'informe' ? '#4ade80' : 'var(--text-secondary)',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    borderBottom: activeTab === 'informe' ? '2px solid #4ade80' : 'none',
                    transition: 'all 0.3s'
                  }}
                >
                    <FileText size={20} />
                    Panel 2: Informe de Asistencia
                </button>
            </div>

            {/* Filter Section (Adapted to Active Tab) */}
            <div className="glass" style={{ padding: '20px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#4ade80' }}>
                    {activeTab === 'registro' ? 'Registro Diario Estudiantes' : 'Informe de Asistencia por Filtro'}
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
                            <option value="">Seleccione...</option>
                            {areas.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>

                    {activeTab === 'registro' ? (
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Fecha (Día/Mes/Año)</label>
                            <input 
                                type="date" 
                                value={selectedDate} 
                                onChange={(e) => setSelectedDate(e.target.value)}
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>
                    ) : (
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Mes Informe</label>
                            <select value={filterMes} onChange={(e) => setFilterMes(parseInt(e.target.value))}>
                                {meses.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
                            </select>
                        </div>
                    )}

                    <button 
                        onClick={activeTab === 'registro' ? handleConsultarRegistro : handleConsultarInforme} 
                        className="btn btn-primary" 
                        style={{ height: '42px', background: '#2d5a27' }} 
                        disabled={loading}
                    >
                        <Search size={18} /> {loading ? 'Cargando...' : 'Consultar'}
                    </button>

                    {/* Botones de Exportación SIEMPRE VISIBLES en el filtro si hay datos */}
                    {isConsulted && (
                        <div style={{ display: 'flex', gap: '8px', gridColumn: '1 / -1', marginTop: '10px', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
                            <button onClick={exportToExcel} className="btn" style={{ background: '#1d6f42', color: 'white', fontSize: '0.85rem' }}>
                                <FileDown size={16} /> Excel
                            </button>
                            <button onClick={exportToPDF} className="btn" style={{ background: '#c43e3e', color: 'white', fontSize: '0.85rem' }}>
                                <FileText size={16} /> Exportar PDF
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Panel 1: Registro Diario View */}
            {activeTab === 'registro' && isConsulted && (
                <div className="glass animate-fade" style={{ padding: '0px', overflow: 'hidden' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ color: 'var(--text-secondary)' }}>Lista de Estudiantes </span>
                            <strong>{filterGrado}° {filterSeccion}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={setAllDailyPresent} className="btn" style={{ background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' }}>
                                <CheckCircle size={16} /> Todos Presentes
                            </button>
                            <button onClick={handleSaveDaily} className="btn" style={{ background: '#2d5a27', color: 'white' }}>
                                <Save size={16} /> Guardar Registro
                            </button>
                        </div>
                    </div>
                    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'left' }}>
                                    <th style={{ padding: '15px', borderBottom: '1px solid var(--glass-border)', width: '80px' }}>Orden</th>
                                    <th style={{ padding: '15px', borderBottom: '1px solid var(--glass-border)' }}>Estudiante</th>
                                    <th style={{ padding: '15px', borderBottom: '1px solid var(--glass-border)', textAlign: 'center' }}>Estado de Asistencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alumnos.map((a, idx) => (
                                    <tr key={a.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <td style={{ padding: '12px 15px', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                                        <td style={{ padding: '12px 15px', fontWeight: '500' }}>{a.apellidos}, {a.nombres}</td>
                                        <td style={{ padding: '12px 15px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                {estados.map(e => (
                                                    <button
                                                        key={e.label}
                                                        onClick={() => updateDailyStatus(a.id, e.label)}
                                                        style={{
                                                            width: '35px',
                                                            height: '35px',
                                                            borderRadius: '8px',
                                                            border: '1px solid',
                                                            borderColor: asistenciaDiaria[a.id] === e.label ? e.color : 'var(--glass-border)',
                                                            background: asistenciaDiaria[a.id] === e.label ? e.bg : 'transparent',
                                                            color: asistenciaDiaria[a.id] === e.label ? e.color : 'var(--text-secondary)',
                                                            fontWeight: 'bold',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        title={e.value}
                                                    >
                                                        {e.label}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => updateDailyStatus(a.id, '')}
                                                    style={{
                                                        width: '35px',
                                                        height: '35px',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--glass-border)',
                                                        background: !asistenciaDiaria[a.id] ? 'rgba(255,255,255,0.05)' : 'transparent',
                                                        color: 'var(--text-secondary)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Panel 2: Informe Mensual View */}
            {activeTab === 'informe' && isConsulted && (
                <div className="glass animate-fade" style={{ padding: '0px', overflow: 'hidden' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>RESUMEN MENSUAL - {meses[filterMes].toUpperCase()}</h3>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{filterGrado}° {filterSeccion} - Area: {filterArea}</span>
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                            <thead>
                                <tr style={{ background: 'rgba(45, 90, 39, 0.4)', color: 'white' }}>
                                    <th rowSpan="2" style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>Nro</th>
                                    <th rowSpan="2" style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.1)', minWidth: '200px', textAlign: 'left', position: 'sticky', left: 0, background: '#1a2b16', zIndex: 10 }}>Estudiantes</th>
                                    {diasArray.map(d => {
                                        const date = new Date(currentYear, filterMes, d);
                                        const wd = weekDays[date.getDay()];
                                        const isWeekend = wd === 'S' || wd === 'D';
                                        return (
                                            <th key={`wd-${d}`} style={{
                                                padding: '5px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                textAlign: 'center',
                                                minWidth: '25px',
                                                background: isWeekend ? 'rgba(0,0,0,0.3)' : 'transparent'
                                            }}>
                                                {wd}
                                            </th>
                                        );
                                    })}
                                </tr>
                                <tr style={{ background: 'rgba(45, 90, 39, 0.4)', color: 'white' }}>
                                    {diasArray.map(d => (
                                        <th key={`dn-${d}`} style={{ padding: '5px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                                            {d}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {alumnos.map((a, idx) => (
                                    <tr key={a.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <td style={{ padding: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                                        <td style={{ padding: '8px', borderRight: '1px solid var(--glass-border)', position: 'sticky', left: 0, background: 'var(--card-bg)', zIndex: 5, fontWeight: '500' }}>
                                            {a.apellidos}, {a.nombres}
                                        </td>
                                        {diasArray.map(d => {
                                            const status = asistenciaData[a.id]?.[d] || '';
                                            const est = estados.find(e => e.label === status);
                                            const date = new Date(currentYear, filterMes, d);
                                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                            return (
                                                <td key={`c-${d}`} style={{ 
                                                    textAlign: 'center', 
                                                    borderRight: '1px solid rgba(255,255,255,0.05)',
                                                    background: isWeekend ? 'rgba(0,0,0,0.1)' : 'transparent',
                                                    color: est ? est.color : 'inherit',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {status}
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
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Search size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
                    <p>No se encontraron alumnos para los filtros seleccionados.</p>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .tab-btn:hover { background: rgba(255,255,255,0.05) !important; }
                input[type="date"]::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    cursor: pointer;
                }
                @media print {
                    .no-print { display: block !important; }
                    .tab-btn, .btn, .input-group, button, nav { display: none !important; }
                    body { background: white !important; color: black !important; padding: 0 !important; }
                    .glass { border: none !important; box-shadow: none !important; background: transparent !important; }
                    th, td { border: 1px solid #000 !important; color: black !important; }
                    .animate-fade { animation: none !important; }
                }
            `}} />
        </div>
    );
};

export default Asistencia;
