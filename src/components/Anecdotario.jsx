import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    BookOpen,
    FileText,
    Calendar,
    User,
    Printer,
    Trash2,
    Eye,
    ArrowLeft,
    FileDown,
    Edit2,
    CheckCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import logo from '../assets/logo.png';
import { supabase } from '../lib/supabase';

const Anecdotario = ({ currentUser }) => {
    const [view, setView] = useState('summary'); // summary, register, detail
    const [records, setRecords] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Filters for summary view
    const [filterGrado, setFilterGrado] = useState('');
    const [filterSeccion, setFilterSeccion] = useState('');
    const [filterFechaDesde, setFilterFechaDesde] = useState('');
    const [filterFechaHasta, setFilterFechaHasta] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        grado: '',
        seccion: '',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: '',
        solucion: ''
    });

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('anecdotario')
                .select('*')
                .order('fecha', { ascending: false });

            if (error) throw error;
            setRecords(data || []);
        } catch (error) {
            console.error('Error al cargar anécdotas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.grado || !formData.seccion || !formData.fecha || !formData.descripcion) {
            alert('Por favor complete todos los campos obligatorios (*).');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                grado: formData.grado,
                seccion: formData.seccion,
                fecha: formData.fecha,
                descripcion: formData.descripcion,
                solucion: formData.solucion,
                registrado_por: currentUser?.email || 'Docente'
            };

            let error;
            if (editingId) {
                // Update
                const { error: updateError } = await supabase
                    .from('anecdotario')
                    .update(payload)
                    .eq('id', editingId);
                error = updateError;
            } else {
                // Insert
                const { error: insertError } = await supabase
                    .from('anecdotario')
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            alert(editingId ? 'Anécdota actualizada con éxito.' : 'Anécdota guardada con éxito.');
            setFormData({
                grado: '',
                seccion: '',
                fecha: new Date().toISOString().split('T')[0],
                descripcion: '',
                solucion: ''
            });
            setEditingId(null);
            await fetchRecords();
            setView('summary');
        } catch (error) {
            console.error('Error al guardar:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (record) => {
        setEditingId(record.id);
        setFormData({
            grado: record.grado,
            seccion: record.seccion,
            fecha: record.fecha,
            descripcion: record.descripcion,
            solucion: record.solucion || ''
        });
        setView('register');
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar esta anécdota?')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('anecdotario')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setRecords(records.filter(r => r.id !== id));
            if (view === 'detail') setView('summary');
        } catch (error) {
            console.error('Error al eliminar:', error);
            alert('Error al eliminar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter logic
    const filteredRecords = records.filter(rec => {
        const matchesGrado = filterGrado === '' || rec.grado.toString() === filterGrado;
        const matchesSeccion = filterSeccion === '' || rec.seccion.toLowerCase() === filterSeccion.toLowerCase();
        
        let matchesFecha = true;
        if (filterFechaDesde) {
            matchesFecha = matchesFecha && rec.fecha >= filterFechaDesde;
        }
        if (filterFechaHasta) {
            matchesFecha = matchesFecha && rec.fecha <= filterFechaHasta;
        }

        const matchesSearch = searchTerm === '' || 
            rec.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (rec.solucion && rec.solucion.toLowerCase().includes(searchTerm.toLowerCase()));

        return matchesGrado && matchesSeccion && matchesFecha && matchesSearch;
    });

    // Individual PDF Export
    const exportToPDF = (record = selectedRecord) => {
        if (!record) return;
        const doc = new jsPDF('p', 'mm', 'a4');

        try {
            doc.addImage(logo, 'PNG', 14, 10, 20, 20);
        } catch (e) {
            console.error("Logo error:", e);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(45, 90, 80);
        doc.text('ASISTENTE DOCENTE DIGITAL', 40, 18);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text('IEI Pedro Sánchez Gavidia - Huánuco', 40, 24);

        doc.setDrawColor(200);
        doc.line(14, 32, 196, 32);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('REGISTRO DE ANÉCDOTA', 105, 45, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`ID Registro: ${record.id.substring(0, 8).toUpperCase()}`, 105, 52, { align: 'center' });

        autoTable(doc, {
            startY: 60,
            body: [
                ['FECHA:', record.fecha],
                ['GRADO Y SECCIÓN:', `${record.grado}° "${record.seccion}"`],
                ['REGISTRADO POR:', record.registrado_por || 'Docente']
            ],
            theme: 'plain',
            styles: { fontSize: 11, cellPadding: 4 },
            columnStyles: { 0: { fontStyle: 'bold', width: 50 } }
        });

        let finalY = doc.lastAutoTable.finalY + 10;

        doc.setFont('helvetica', 'bold');
        doc.text('DESCRIPCIÓN DE LA ANÉCDOTA:', 14, finalY);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(record.descripcion || 'Sin descripción', 180);
        doc.text(descLines, 14, finalY + 7);
        finalY += (descLines.length * 7) + 15;

        doc.setFont('helvetica', 'bold');
        doc.text('SOLUCIÓN PROPUESTA:', 14, finalY);
        doc.setFont('helvetica', 'normal');
        const solLines = doc.splitTextToSize(record.solucion || 'Sin solución propuesta', 180);
        doc.text(solLines, 14, finalY + 7);

        // Footer lines for signatures
        const signY = 260;
        doc.line(30, signY, 80, signY);
        doc.text('Firma del Docente', 55, signY + 5, { align: 'center' });
        doc.line(130, signY, 180, signY);
        doc.text('V°B° Dirección', 155, signY + 5, { align: 'center' });

        doc.save(`Anecdota_${record.id.substring(0, 5)}.pdf`);
    };

    // Bulk PDF Export
    const exportAllToPDF = () => {
        if (filteredRecords.length === 0) {
            alert('No hay registros filtrados para exportar.');
            return;
        }

        const doc = new jsPDF('p', 'mm', 'a4');

        try {
            doc.addImage(logo, 'PNG', 14, 10, 20, 20);
        } catch (e) {
            console.error("Logo error:", e);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(45, 90, 80);
        doc.text('ASISTENTE DOCENTE DIGITAL', 40, 18);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text('IEI Pedro Sánchez Gavidia - Huánuco', 40, 24);

        doc.setDrawColor(200);
        doc.line(14, 32, 196, 32);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('REPORTE GENERAL DE ANECDOTARIO', 105, 45, { align: 'center' });

        const tableBody = filteredRecords.map(r => [
            r.fecha,
            `${r.grado}° "${r.seccion}"`,
            r.descripcion,
            r.solucion || 'Sin solución registrada',
            r.registrado_por || 'Docente'
        ]);

        autoTable(doc, {
            startY: 55,
            head: [['Fecha', 'Grado/Secc', 'Descripción', 'Solución Propuesta', 'Registrado Por']],
            body: tableBody,
            theme: 'striped',
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { width: 22 },
                1: { width: 22 },
                2: { width: 70 },
                3: { width: 50 },
                4: { width: 26 }
            }
        });

        doc.save(`Anecdotario_General_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // Bulk Excel (XLSX) Export
    const exportToExcel = () => {
        if (filteredRecords.length === 0) {
            alert('No hay registros filtrados para exportar.');
            return;
        }

        const finalContent = [
            ['ID', 'Fecha', 'Grado', 'Sección', 'Descripción', 'Solución Propuesta', 'Registrado Por']
        ];
        filteredRecords.forEach(rec => {
            finalContent.push([
                rec.id,
                rec.fecha,
                `${rec.grado}°`,
                rec.seccion,
                rec.descripcion,
                rec.solucion || '',
                rec.registrado_por || ''
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(finalContent);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Anecdotas");
        XLSX.writeFile(wb, `Anecdotario_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Bulk CSV Export
    const exportToCSV = () => {
        if (filteredRecords.length === 0) {
            alert('No hay registros filtrados para exportar.');
            return;
        }

        const headers = ['ID', 'Fecha', 'Grado', 'Seccion', 'Descripcion', 'Solucion', 'Registrado Por'];
        const rows = filteredRecords.map(rec => [
            rec.id,
            rec.fecha,
            `${rec.grado}°`,
            rec.seccion,
            `"${(rec.descripcion || '').replace(/"/g, '""')}"`,
            `"${(rec.solucion || '').replace(/"/g, '""')}"`,
            rec.registrado_por || ''
        ]);
        
        const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Anecdotario_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="animate-fade">
            {/* View Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="btn-primary" style={{ padding: '10px', borderRadius: '12px' }}>
                        <BookOpen size={24} />
                    </div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>Anecdotario</h2>
                </div>
                {view === 'summary' && (
                    <button onClick={() => { setEditingId(null); setFormData({ grado: '', seccion: '', fecha: new Date().toISOString().split('T')[0], descripcion: '', solucion: '' }); setView('register'); }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={20} /> Nueva Anécdota
                    </button>
                )}
                {view !== 'summary' && (
                    <button onClick={() => setView('summary')} className="btn" style={{ background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowLeft size={20} /> Volver al Resumen
                    </button>
                )}
            </div>

            {/* Summary View */}
            {view === 'summary' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    {/* Filters card */}
                    <div className="glass" style={{ padding: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', alignItems: 'end' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem', opacity: 0.8 }}>Grado</label>
                                <select value={filterGrado} onChange={(e) => setFilterGrado(e.target.value)}>
                                    <option value="">Todos</option>
                                    {[1, 2, 3, 4, 5].map(g => <option key={g} value={g}>{g}°</option>)}
                                </select>
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem', opacity: 0.8 }}>Sección</label>
                                <select value={filterSeccion} onChange={(e) => setFilterSeccion(e.target.value)}>
                                    <option value="">Todas</option>
                                    {['A', 'B', 'C'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem', opacity: 0.8 }}>Desde</label>
                                <input type="date" value={filterFechaDesde} onChange={(e) => setFilterFechaDesde(e.target.value)} />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem', opacity: 0.8 }}>Hasta</label>
                                <input type="date" value={filterFechaHasta} onChange={(e) => setFilterFechaHasta(e.target.value)} />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem', opacity: 0.8 }}>Buscar</label>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '15px', opacity: 0.5 }} />
                                    <input 
                                        type="text" 
                                        placeholder="Descripción/solución..." 
                                        value={searchTerm} 
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{ paddingLeft: '35px' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bulk Exports Row */}
                        {filteredRecords.length > 0 && (
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
                                <span style={{ fontSize: '0.85rem', opacity: 0.7, display: 'flex', alignItems: 'center', marginRight: 'auto' }}>
                                    Encontrados: {filteredRecords.length} registro(s)
                                </span>
                                <button onClick={exportAllToPDF} className="btn" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                                    <FileDown size={16} /> Exportar PDF
                                </button>
                                <button onClick={exportToExcel} className="btn" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                                    <FileDown size={16} /> Exportar Excel
                                </button>
                                <button onClick={exportToCSV} className="btn" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                                    <FileDown size={16} /> Exportar CSV
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Records List */}
                    <div className="glass" style={{ padding: '25px' }}>
                        {loading && records.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center' }}>Cargando datos...</div>
                        ) : filteredRecords.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                <BookOpen size={48} style={{ marginBottom: '15px', opacity: 0.3 }} />
                                <p>No hay registros que coincidan con los filtros.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {filteredRecords.map(rec => (
                                    <div key={rec.id} className="glass" style={{
                                        padding: '16px 20px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderLeft: '4px solid #10b981'
                                    }}>
                                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                            <div style={{ color: '#10b981', flexShrink: 0 }}>
                                                <BookOpen size={18} />
                                            </div>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ fontWeight: '600', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                    <span>Grado y Sección: {rec.grado}° "{rec.seccion}"</span>
                                                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '50px', background: 'rgba(255,255,255,0.08)', fontWeight: 'normal' }}>
                                                        {rec.fecha}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                    <strong>Anécdota:</strong> {rec.descripcion}
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', flexShrink: 0, marginLeft: '15px' }}>
                                            <button onClick={() => { setSelectedRecord(rec); setView('detail'); }} className="btn" style={{ padding: '8px', background: 'rgba(255,255,255,0.05)' }} title="Ver Detalle">
                                                <Eye size={18} />
                                            </button>
                                            <button onClick={() => handleEdit(rec)} className="btn" style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', color: '#fbbf24' }} title="Editar">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(rec.id)} className="btn" style={{ padding: '8px', background: 'rgba(255,0,0,0.05)', color: '#ff4d4d' }} title="Eliminar">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Registration/Edit Form View */}
            {view === 'register' && (
                <div className="glass animate-fade" style={{ padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {editingId ? 'Editar Anécdota' : 'Registrar Nueva Anécdota'}
                    </h3>
                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                            <div className="input-group">
                                <label>Grado *</label>
                                <select 
                                    value={formData.grado} 
                                    onChange={(e) => setFormData({ ...formData, grado: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccione...</option>
                                    {[1, 2, 3, 4, 5].map(g => <option key={g} value={g}>{g}°</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Sección *</label>
                                <select 
                                    value={formData.seccion} 
                                    onChange={(e) => setFormData({ ...formData, seccion: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccione...</option>
                                    {['A', 'B', 'C'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Fecha *</label>
                                <input 
                                    type="date" 
                                    value={formData.fecha} 
                                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Descripción de la Anécdota *</label>
                            <textarea
                                rows="6"
                                value={formData.descripcion}
                                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                placeholder="Describe brevemente el comportamiento, suceso o anécdota ocurrida..."
                                required
                            ></textarea>
                        </div>

                        <div className="input-group">
                            <label>Solución Propuesta</label>
                            <textarea
                                rows="4"
                                value={formData.solucion}
                                onChange={(e) => setFormData({ ...formData, solucion: e.target.value })}
                                placeholder="Indica la acción, acuerdo, compromiso o solución planteada..."
                            ></textarea>
                        </div>

                        <div style={{ marginTop: '30px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                Todos los campos con (*) son obligatorios.
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ padding: '12px 40px', width: '200px' }} disabled={loading}>
                                {loading ? 'Guardando...' : editingId ? 'Actualizar Anécdota' : 'Guardar Registro'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Detail View */}
            {view === 'detail' && selectedRecord && (
                <div className="glass animate-fade" style={{ padding: '40px', maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
                    <div style={{ borderBottom: '2px solid var(--glass-border)', paddingBottom: '30px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>REGISTRO DE ANÉCDOTA</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>Nro. Registro: {selectedRecord.id.substring(0, 8).toUpperCase()}</p>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.8rem', opacity: 0.7 }}>
                            IEI. Pedro Sánchez Gavidia<br />Huánuco
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>
                        <div>
                            <div style={{ marginBottom: '25px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.6, display: 'block', marginBottom: '5px' }}>Grado y Sección</label>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{selectedRecord.grado}° Grado - Sección "{selectedRecord.seccion}"</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.6, display: 'block', marginBottom: '5px' }}>Fecha</label>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{selectedRecord.fecha}</div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.6, display: 'block', marginBottom: '5px' }}>Descripción de la Anécdota</label>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', lineHeight: '1.6' }}>
                                    {selectedRecord.descripcion}
                                </div>
                            </div>

                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.6, display: 'block', marginBottom: '5px' }}>Solución Propuesta</label>
                                <div style={{ background: 'hsla(160, 80%, 40%, 0.05)', padding: '20px', borderRadius: '12px', lineHeight: '1.6', color: '#10b981', borderLeft: '3px solid #10b981' }}>
                                    {selectedRecord.solucion || 'Sin solución propuesta registrada.'}
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="glass" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Calendar size={18} className="text-gradient" />
                                    <span>{selectedRecord.fecha}</span>
                                </div>
                                <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <User size={18} className="text-gradient" />
                                    <span>Docente: <br /><small style={{ wordBreak: 'break-all' }}>{selectedRecord.registrado_por}</small></span>
                                </div>
                            </div>

                            <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '40px' }}>
                                <button onClick={() => exportToPDF()} className="btn" style={{ width: '100%', background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                                    <FileDown size={18} /> Exportar PDF
                                </button>
                                <button onClick={() => window.print()} className="btn btn-primary" style={{ width: '100%' }}>
                                    <Printer size={18} /> Imprimir Acta
                                </button>
                                <button onClick={() => handleEdit(selectedRecord)} className="btn" style={{ width: '100%', color: '#fbbf24', background: 'rgba(251,191,36,0.05)' }}>
                                    <Edit2 size={18} /> Editar Registro
                                </button>
                                <button onClick={() => handleDelete(selectedRecord.id)} className="btn" style={{ width: '100%', color: '#ff4d4d', background: 'rgba(255,0,0,0.05)' }}>
                                    <Trash2 size={18} /> Eliminar Registro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  .nav, nav, .btn, .no-print, header, .app-container > nav { display: none !important; }
                  body, .app-container { background: white !important; color: black !important; padding: 0 !important; }
                  .glass { border: 1px solid #eee !important; box-shadow: none !important; background: white !important; }
                  .text-gradient { -webkit-text-fill-color: black !important; color: black !important; }
                  .animate-fade { animation: none !important; }
                  main { padding: 0 !important; width: 100% !important; max-width: 100% !important; }
                }
              `}} />
        </div>
    );
};

export default Anecdotario;
