import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Users,
    FileText,
    Calendar,
    Clock,
    User,
    CheckCircle,
    Eye,
    ArrowLeft,
    Trash2,
    FileDown,
    MapPin,
    Handshake,
    Printer
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo.png';
import { supabase } from '../lib/supabase';

const TrabajoColegiado = ({ currentUser }) => {
    const [view, setView] = useState('summary'); // summary, register, detail
    const [records, setRecords] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        fecha: new Date().toISOString().split('T')[0],
        hora_inicio: '',
        hora_fin: '',
        tema: '',
        participantes: '',
        acuerdos: '',
        compromisos: ''
    });

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('trabajo_colegiado')
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
            .from('trabajo_colegiado')
            .insert([{
                ...formData,
                registrado_por: currentUser.email
            }]);

        if (error) {
            alert('Error al guardar: ' + error.message);
        } else {
            setFormData({
                fecha: new Date().toISOString().split('T')[0],
                hora_inicio: '',
                hora_fin: '',
                tema: '',
                participantes: '',
                acuerdos: '',
                compromisos: ''
            });
            await fetchRecords();
            setView('summary');
        }
        setLoading(false);
    };

    const deleteRecord = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este registro?')) return;
        
        const { error } = await supabase
            .from('trabajo_colegiado')
            .delete()
            .eq('id', id);

        if (error) alert('Error: ' + error.message);
        else fetchRecords();
    };

    const exportToPDF = (record = selectedRecord) => {
        if (!record) return;
        
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // --- BRANDED HEADER ---
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
        doc.text('ACTA DE TRABAJO COLEGIADO', 105, 45, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`ID Registro: ${record.id.substring(0, 8).toUpperCase()}`, 105, 52, { align: 'center' });

        autoTable(doc, {
            startY: 60,
            body: [
                ['FECHA:', record.fecha],
                ['HORARIO:', `${record.hora_inicio} - ${record.hora_fin}`],
                ['TEMA / AGENDA:', record.tema],
                ['REGISTRADO POR:', record.registrado_por]
            ],
            theme: 'plain',
            styles: { fontSize: 11, cellPadding: 4 },
            columnStyles: { 0: { fontStyle: 'bold', width: 50 } }
        });

        let finalY = doc.lastAutoTable.finalY + 10;

        doc.setFont('helvetica', 'bold');
        doc.text('PARTICIPANTES:', 14, finalY);
        doc.setFont('helvetica', 'normal');
        const partLines = doc.splitTextToSize(record.participantes || 'No especificados', 180);
        doc.text(partLines, 14, finalY + 7);
        finalY += (partLines.length * 7) + 10;

        doc.setFont('helvetica', 'bold');
        doc.text('ACUERDOS:', 14, finalY);
        doc.setFont('helvetica', 'normal');
        const acLines = doc.splitTextToSize(record.acuerdos || 'S/A', 180);
        doc.text(acLines, 14, finalY + 7);
        finalY += (acLines.length * 7) + 10;

        doc.setFont('helvetica', 'bold');
        doc.text('COMPROMISOS:', 14, finalY);
        doc.setFont('helvetica', 'normal');
        const compLines = doc.splitTextToSize(record.compromisos || 'S/C', 180);
        doc.text(compLines, 14, finalY + 7);

        // Footer lines for signatures
        const signY = 260;
        doc.line(30, signY, 80, signY);
        doc.text('Firma Responsable', 55, signY + 5, { align: 'center' });
        doc.line(130, signY, 180, signY);
        doc.text('V°B° Dirección', 155, signY + 5, { align: 'center' });

        doc.save(`TrabajoColegiado_${record.id.substring(0, 5)}.pdf`);
    };

    return (
        <div className="animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                {view === 'summary' ? (
                    <button onClick={() => setView('register')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={20} /> Nuevo Trabajo Colegiado
                    </button>
                ) : (
                    <button onClick={() => setView('summary')} className="btn" style={{ background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowLeft size={20} /> Volver al Resumen
                    </button>
                )}
            </div>

            {view === 'summary' && (
                <div className="glass" style={{ padding: '25px' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', opacity: 0.8 }}>Registros de Trabajo Colegiado</h3>
                    
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>Cargando...</div>
                    ) : records.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>No hay registros.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {records.map(rec => (
                                <div key={rec.id} className="glass" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                    <div>
                                        <div style={{ fontWeight: '600' }}>{rec.tema}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {rec.fecha} • {rec.hora_inicio} - {rec.hora_fin}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                            <div className="input-group">
                                <label>Fecha</label>
                                <input type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} required />
                            </div>
                            <div className="input-group">
                                <label>Hora Inicio</label>
                                <input type="time" value={formData.hora_inicio} onChange={e => setFormData({...formData, hora_inicio: e.target.value})} required />
                            </div>
                            <div className="input-group">
                                <label>Hora Fin</label>
                                <input type="time" value={formData.hora_fin} onChange={e => setFormData({...formData, hora_fin: e.target.value})} required />
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Tema / Agenda</label>
                            <input type="text" value={formData.tema} onChange={e => setFormData({...formData, tema: e.target.value})} required placeholder="Ej. Planificación Trimestral" />
                        </div>

                        <div className="input-group">
                            <label>Participantes</label>
                            <textarea value={formData.participantes} onChange={e => setFormData({...formData, participantes: e.target.value})} placeholder="Nombres de los docentes participantes" rows={3}></textarea>
                        </div>

                        <div className="input-group">
                            <label>Acuerdos</label>
                            <textarea value={formData.acuerdos} onChange={e => setFormData({...formData, acuerdos: e.target.value})} placeholder="Puntos acordados" rows={4}></textarea>
                        </div>

                        <div className="input-group">
                            <label>Compromisos</label>
                            <textarea value={formData.compromisos} onChange={e => setFormData({...formData, compromisos: e.target.value})} placeholder="Compromisos individuales o grupales" rows={3}></textarea>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
                            {loading ? 'Guardando...' : 'Registrar Trabajo Colegiado'}
                        </button>
                    </form>
                </div>
            )}

            {view === 'detail' && selectedRecord && (
                <div className="glass" style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{ borderBottom: '2px solid var(--glass-border)', paddingBottom: '20px', marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '1.8rem' }}>ACTA DE TRABAJO COLEGIADO</h2>
                        <div style={{ color: 'var(--text-secondary)' }}>ID: {selectedRecord.id}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>
                        <div>
                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ fontSize: '0.75rem', opacity: 0.6 }}>TEMA / AGENDA</label>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedRecord.tema}</div>
                            </div>
                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ fontSize: '0.75rem', opacity: 0.6 }}>ACUERDOS</label>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '10px' }}>{selectedRecord.acuerdos}</div>
                            </div>
                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ fontSize: '0.75rem', opacity: 0.6 }}>COMPROMISOS</label>
                                <div style={{ background: 'rgba(96,165,250,0.05)', padding: '15px', borderRadius: '10px', color: '#60a5fa' }}>{selectedRecord.compromisos}</div>
                            </div>
                        </div>
                        <div>
                            <div className="glass" style={{ padding: '20px', fontSize: '0.9rem' }}>
                                <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={16} /> {selectedRecord.fecha}</div>
                                <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={16} /> {selectedRecord.hora_inicio} - {selectedRecord.hora_fin}</div>
                                <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><User size={16} /> {selectedRecord.registrado_por}</div>
                            </div>
                            <button onClick={() => exportToPDF()} className="btn" style={{ width: '100%', marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                                <FileDown size={20} /> Exportar Acta (PDF)
                            </button>
                            <button onClick={() => window.print()} className="btn btn-primary" style={{ width: '100%', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                <Printer size={20} /> Imprimir Acta
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

export default TrabajoColegiado;
