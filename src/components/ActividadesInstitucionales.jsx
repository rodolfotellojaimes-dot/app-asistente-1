import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    FileText,
    Calendar,
    User,
    CheckCircle,
    Eye,
    ArrowLeft,
    Trash2,
    FileDown,
    Flag,
    Award,
    Printer
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo.png';
import { supabase } from '../lib/supabase';

const ActividadesInstitucionales = ({ currentUser }) => {
    const [view, setView] = useState('summary');
    const [records, setRecords] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        fecha: new Date().toISOString().split('T')[0],
        actividad_nombre: '',
        responsable: '',
        descripcion: '',
        resultados_impacto: ''
    });

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('actividades_institucionales')
            .select('*')
            .order('fecha', { ascending: false });

        if (error) console.error('Error fetching records:', error);
        else setRecords(data || []);
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase
            .from('actividades_institucionales')
            .insert([{
                ...formData,
                registrado_por: currentUser.email
            }]);

        if (error) {
            alert('Error al guardar: ' + error.message);
        } else {
            setFormData({
                fecha: new Date().toISOString().split('T')[0],
                actividad_nombre: '',
                responsable: '',
                descripcion: '',
                resultados_impacto: ''
            });
            await fetchRecords();
            setView('summary');
        }
        setLoading(false);
    };

    const deleteRecord = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este registro?')) return;
        const { error } = await supabase.from('actividades_institucionales').delete().eq('id', id);
        if (error) alert('Error: ' + error.message);
        else fetchRecords();
    };

    const exportToPDF = (record = selectedRecord) => {
        if (!record) return;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        try { doc.addImage(logo, 'PNG', 14, 10, 20, 20); } catch (e) {}
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(45, 90, 80);
        doc.text('ASISTENTE DOCENTE DIGITAL', 40, 18);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text('IEI Pedro Sánchez Gavidia - Huánuco', 40, 24);
        
        doc.line(14, 32, 196, 32);
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('REPORTE DE ACTIVIDAD INSTITUCIONAL', 105, 45, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`Registro No: ${record.id.substring(0, 8).toUpperCase()}`, 105, 52, { align: 'center' });

        autoTable(doc, {
            startY: 60,
            body: [
                ['ACTIVIDAD:', record.actividad_nombre],
                ['FECHA:', record.fecha],
                ['RESPONSABLE:', record.responsable],
                ['REGISTRADO POR:', record.registrado_por]
            ],
            theme: 'plain',
            styles: { fontSize: 11 },
            columnStyles: { 0: { fontStyle: 'bold', width: 50 } }
        });

        let finalY = doc.lastAutoTable.finalY + 10;
        doc.setFont('helvetica', 'bold');
        doc.text('DESCRIPCIÓN DE LA ACTIVIDAD:', 14, finalY);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(record.descripcion, 180);
        doc.text(descLines, 14, finalY + 7);
        finalY += (descLines.length * 7) + 10;

        doc.setFont('helvetica', 'bold');
        doc.text('RESULTADOS E IMPACTO:', 14, finalY);
        doc.setFont('helvetica', 'normal');
        const resLines = doc.splitTextToSize(record.resultados_impacto || 'S/N', 180);
        doc.text(resLines, 14, finalY + 7);

        const signY = 260;
        doc.line(30, signY, 80, signY); doc.text('Firma Responsable', 55, signY + 5, { align: 'center' });
        doc.line(130, signY, 180, signY); doc.text('V°B° Dirección', 155, signY + 5, { align: 'center' });

        doc.save(`Actividad_${record.fecha}.pdf`);
    };

    return (
        <div className="animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                {view === 'summary' ? (
                    <button onClick={() => setView('register')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={20} /> Registrar Actividad
                    </button>
                ) : (
                    <button onClick={() => setView('summary')} className="btn" style={{ background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowLeft size={20} /> Volver
                    </button>
                )}
            </div>

            {view === 'summary' && (
                <div className="glass" style={{ padding: '25px' }}>
                    <h3 style={{ marginBottom: '20px', opacity: 0.8 }}>Relación de Actividades</h3>
                    {loading ? <div style={{textAlign:'center'}}>Cargando...</div> : records.length === 0 ? <div style={{opacity:0.5, textAlign:'center'}}>No hay actividades registradas.</div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {records.map(rec => (
                                <div key={rec.id} className="glass" style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ color: 'hsl(var(--primary-hsl))' }}><Flag size={24} /></div>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{rec.actividad_nombre}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{rec.fecha} • {rec.responsable}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => { setSelectedRecord(rec); setView('detail'); }} className="btn" style={{ padding: '8px' }}><Eye size={18} /></button>
                                        <button onClick={() => exportToPDF(rec)} className="btn" style={{ padding: '8px', color: '#60a5fa' }}><FileDown size={18} /></button>
                                        <button onClick={() => deleteRecord(rec.id)} className="btn" style={{ padding: '8px', color: '#ff4d4d' }}><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === 'register' && (
                <div className="glass" style={{ padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', marginBottom: '20px' }}>
                            <div className="input-group">
                                <label>Fecha</label>
                                <input type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} required />
                            </div>
                            <div className="input-group">
                                <label>Nombre de la Actividad</label>
                                <input type="text" value={formData.actividad_nombre} onChange={e => setFormData({...formData, actividad_nombre: e.target.value})} required placeholder="Ej. Día del Logro, Aniversario" />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Docente / Comisión Responsable</label>
                            <input type="text" value={formData.responsable} onChange={e => setFormData({...formData, responsable: e.target.value})} required />
                        </div>
                        <div className="input-group">
                            <label>Descripción / Desarrollo</label>
                            <textarea value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} required rows={4}></textarea>
                        </div>
                        <div className="input-group">
                            <label>Resultados / Logros e Impacto</label>
                            <textarea value={formData.resultados_impacto} onChange={e => setFormData({...formData, resultados_impacto: e.target.value})} rows={3}></textarea>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                            {loading ? 'Guardando...' : 'Registrar Actividad Institucional'}
                        </button>
                    </form>
                </div>
            )}

            {view === 'detail' && selectedRecord && (
                <div className="glass" style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '20px' }}>
                        <Award size={32} className="text-gradient" />
                        <h2 style={{ fontSize: '1.8rem' }}>{selectedRecord.actividad_nombre}</h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px' }}>
                        <div>
                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>DESCRIPCIÓN</label>
                                <p style={{ lineHeight: '1.6' }}>{selectedRecord.descripcion}</p>
                            </div>
                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>RESULTADOS</label>
                                <div style={{ background: 'hsla(var(--primary-hsl), 0.05)', padding: '20px', borderRadius: '12px' }}>{selectedRecord.resultados_impacto}</div>
                            </div>
                        </div>
                        <div>
                            <div className="glass" style={{ padding: '20px', fontSize: '0.9rem' }}>
                                <p><strong>Fecha:</strong> {selectedRecord.fecha}</p>
                                <p><strong>Responsable:</strong> {selectedRecord.responsable}</p>
                                <p><strong>Registrado:</strong> {selectedRecord.registrado_por}</p>
                            </div>
                            <button onClick={() => exportToPDF()} className="btn" style={{ width: '100%', marginTop: '20px', display: 'flex', gap: '8px', justifyContent: 'center', background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                                <FileDown size={20} /> Descargar Reporte
                            </button>
                            <button onClick={() => window.print()} className="btn btn-primary" style={{ width: '100%', marginTop: '10px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <Printer size={20} /> Imprimir Reporte
                            </button>
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

export default ActividadesInstitucionales;
