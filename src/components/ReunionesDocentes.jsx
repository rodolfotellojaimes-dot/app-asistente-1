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

const ReunionesDocentes = ({ currentUser }) => {
    const [view, setView] = useState('summary');
    const [records, setRecords] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        fecha: new Date().toISOString().split('T')[0],
        tipo_reunion: 'Ordinaria',
        agenda: '',
        participantes: '',
        acuerdos: ''
    });

    const tipos = ['Ordinaria', 'Extraordinaria', 'Técnico-Pedagógica', 'Informativa', 'Capacitación'];

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('reuniones_docentes')
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
            .from('reuniones_docentes')
            .insert([{
                ...formData,
                registrado_por: currentUser.email
            }]);

        if (error) {
            alert('Error al guardar: ' + error.message);
        } else {
            setFormData({
                fecha: new Date().toISOString().split('T')[0],
                tipo_reunion: 'Ordinaria',
                agenda: '',
                participantes: '',
                acuerdos: ''
            });
            await fetchRecords();
            setView('summary');
        }
        setLoading(false);
    };

    const deleteRecord = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este registro?')) return;
        const { error } = await supabase.from('reuniones_docentes').delete().eq('id', id);
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
        doc.text('ACTA DE REUNIÓN DOCENTE', 105, 45, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`Expediente: ${record.id.substring(0, 8).toUpperCase()}`, 105, 52, { align: 'center' });

        autoTable(doc, {
            startY: 60,
            body: [
                ['FECHA:', record.fecha],
                ['TIPO DE REUNIÓN:', record.tipo_reunion],
                ['REGISTRADO POR:', record.registrado_por]
            ],
            theme: 'plain',
            styles: { fontSize: 11 },
            columnStyles: { 0: { fontStyle: 'bold', width: 50 } }
        });

        let finalY = doc.lastAutoTable.finalY + 10;
        doc.setFont('helvetica', 'bold');
        doc.text('AGENDA / TEMAS TRATADOS:', 14, finalY);
        doc.setFont('helvetica', 'normal');
        const agendaLines = doc.splitTextToSize(record.agenda, 180);
        doc.text(agendaLines, 14, finalY + 7);
        finalY += (agendaLines.length * 7) + 10;

        doc.setFont('helvetica', 'bold');
        doc.text('PARTICIPANTES:', 14, finalY);
        doc.setFont('helvetica', 'normal');
        const partLines = doc.splitTextToSize(record.participantes || 'Personal docente y administrativo', 180);
        doc.text(partLines, 14, finalY + 7);
        finalY += (partLines.length * 7) + 10;

        doc.setFont('helvetica', 'bold');
        doc.text('ACUERDOS TOMADOS:', 14, finalY);
        doc.setFont('helvetica', 'normal');
        const acLines = doc.splitTextToSize(record.acuerdos || 'Ninguno registrado', 180);
        doc.text(acLines, 14, finalY + 7);

        const signY = 260;
        doc.line(30, signY, 80, signY); doc.text('Firma del Facilitador', 55, signY + 5, { align: 'center' });
        doc.line(130, signY, 180, signY); doc.text('V°B° Dirección', 155, signY + 5, { align: 'center' });

        doc.save(`Reunion_${record.fecha}.pdf`);
    };

    return (
        <div className="animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                {view === 'summary' ? (
                    <button onClick={() => setView('register')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={20} /> Registrar Nueva Reunión
                    </button>
                ) : (
                    <button onClick={() => setView('summary')} className="btn" style={{ background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowLeft size={20} /> Volver
                    </button>
                )}
            </div>

            {view === 'summary' && (
                <div className="glass" style={{ padding: '25px' }}>
                    <h3 style={{ marginBottom: '20px', opacity: 0.8 }}>Bitácora de Reuniones</h3>
                    {loading ? <div style={{textAlign:'center'}}>Cargando...</div> : records.length === 0 ? <div style={{opacity:0.5, textAlign:'center'}}>No hay reuniones registradas.</div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {records.map(rec => (
                                <div key={rec.id} className="glass" style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                    <div>
                                        <div style={{ fontWeight: '600' }}>{rec.tipo_reunion} - {rec.fecha}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.agenda}</div>
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                            <div className="input-group">
                                <label>Fecha</label>
                                <input type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} required />
                            </div>
                            <div className="input-group">
                                <label>Tipo de Reunión</label>
                                <select value={formData.tipo_reunion} onChange={e => setFormData({...formData, tipo_reunion: e.target.value})}>
                                    {tipos.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Agenda / Puntos a Tratar</label>
                            <textarea value={formData.agenda} onChange={e => setFormData({...formData, agenda: e.target.value})} required rows={3}></textarea>
                        </div>
                        <div className="input-group">
                            <label>Participantes</label>
                            <textarea value={formData.participantes} onChange={e => setFormData({...formData, participantes: e.target.value})} placeholder="Nombres o cargos" rows={2}></textarea>
                        </div>
                        <div className="input-group">
                            <label>Acuerdos</label>
                            <textarea value={formData.acuerdos} onChange={e => setFormData({...formData, acuerdos: e.target.value})} rows={4}></textarea>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                            {loading ? 'Guardando...' : 'Grabar Registro de Reunión'}
                        </button>
                    </form>
                </div>
            )}

            {view === 'detail' && selectedRecord && (
                <div className="glass" style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
                    <h2 style={{ marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>DETALLES DE REUNIÓN</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
                        <div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>AGENDA</label>
                                <p>{selectedRecord.agenda}</p>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>ACUERDOS</label>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '10px' }}>{selectedRecord.acuerdos}</div>
                            </div>
                        </div>
                        <div>
                            <div className="glass" style={{ padding: '20px' }}>
                                <p><strong>Fecha:</strong> {selectedRecord.fecha}</p>
                                <p><strong>Tipo:</strong> {selectedRecord.tipo_reunion}</p>
                            </div>
                            <button onClick={() => exportToPDF()} className="btn" style={{ width: '100%', marginTop: '20px', display: 'flex', gap: '8px', justifyContent: 'center', background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                                <FileDown size={20} /> Exportar Acta
                            </button>
                            <button onClick={() => window.print()} className="btn btn-primary" style={{ width: '100%', marginTop: '10px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
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

export default ReunionesDocentes;
