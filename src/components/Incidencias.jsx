
import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    AlertTriangle,
    FileText,
    User,
    Calendar,
    Clock,
    ShieldAlert,
    ChevronRight,
    Printer,
    Trash2,
    CheckCircle,
    XCircle,
    Eye,
    ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Incidencias = ({ currentUser }) => {
    const [view, setView] = useState('summary'); // summary, register, detail
    const [incidencias, setIncidencias] = useState([]);
    const [alumnos, setAlumnos] = useState([]);
    const [selectedIncidencia, setSelectedIncidencia] = useState(null);
    const [loading, setLoading] = useState(false);

    // Registration Filters
    const [regGrado, setRegGrado] = useState('');
    const [regSeccion, setRegSeccion] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        alumnoId: '',
        tipo: 'Conducta',
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), // Formato HH:mm
        descripcion: '',
        compromisos: '',
        registradoPor: currentUser?.email || 'Docente' // Usar email si name no existe
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Cargar Alumnos para el selector
            const { data: alumnosData, error: errAlumnos } = await supabase
                .from('students')
                .select('*')
                .order('name');

            if (errAlumnos) throw errAlumnos;

            const alumnosMapeados = alumnosData.map(a => ({
                id: a.id,
                nombres: a.name.split(', ')[1] || a.name,
                apellidos: a.name.split(', ')[0] || '',
                grado: a.grade,
                seccion: a.section
            })).sort((a, b) => { // Ordenar A-Z
                const nA = `${a.apellidos} ${a.nombres}`.toLowerCase();
                const nB = `${b.apellidos} ${b.nombres}`.toLowerCase();
                return nA.localeCompare(nB);
            });
            setAlumnos(alumnosMapeados);

            // 2. Cargar Incidencias Históricas
            const { data: incidentesData, error: errInc } = await supabase
                .from('incidents')
                .select(`
                    *,
                    students (
                        name,
                        grade,
                        section
                    )
                `)
                .order('date', { ascending: false });

            if (errInc) throw errInc;

            const incidenciasMapeadas = incidentesData.map(inc => ({
                id: inc.id,
                alumnoId: inc.student_id,
                alumnoNombre: inc.students ? inc.students.name : 'Estudiante eliminado',
                grado: inc.students?.grade,
                seccion: inc.students?.section,
                tipo: inc.type || 'Conducta',
                fecha: inc.date,
                hora: inc.time || '00:00',
                descripcion: inc.description,
                compromisos: inc.action_taken, // Mapeamos 'action_taken' a 'compromisos'
                registradoPor: inc.registered_by || 'Sistema'
            }));

            setIncidencias(incidenciasMapeadas);

        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    };

    const saveIncidencia = async (e) => {
        e.preventDefault();
        if (!formData.alumnoId || !formData.descripcion) {
            alert('Por favor complete todos los campos obligatorios.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('incidents')
                .insert([{
                    student_id: formData.alumnoId,
                    type: formData.tipo,
                    severity: 'Leve',
                    date: formData.fecha,
                    time: formData.hora,
                    description: formData.descripcion,
                    action_taken: formData.compromisos,
                    registered_by: formData.registradoPor,
                    user_id: (await supabase.auth.getUser()).data.user?.id // Asociar al usuario actual
                }]);

            if (error) throw error;

            alert('Incidencia registrada correctamente.');

            // Recargar datos y volver
            await fetchData();
            setFormData({
                alumnoId: '',
                tipo: 'Conducta',
                fecha: new Date().toISOString().split('T')[0],
                hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                descripcion: '',
                compromisos: '',
                registradoPor: currentUser?.email || 'Docente'
            });
            setRegGrado('');
            setRegSeccion('');
            setView('summary');

        } catch (error) {
            console.error("Error guardando:", error);
            alert("Error al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteIncidencia = async (id) => {
        if (window.confirm('¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.')) {
            setLoading(true);
            try {
                const { error } = await supabase
                    .from('incidents')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                // Actualizar UI localmente o recargar
                setIncidencias(incidencias.filter(inc => inc.id !== id));
                if (view === 'detail') setView('summary');

            } catch (error) {
                console.error("Error eliminando:", error);
                alert("Error al eliminar: " + error.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const getTypeColor = (tipo) => {
        switch (tipo) {
            case 'Conducta': return '#fbbf24';
            case 'Salud': return '#4ade80';
            case 'Logros Positivos': return '#60a5fa';
            case 'Compromisos Incumplidos': return '#ff4d4d';
            default: return 'var(--text-secondary)';
        }
    };

    const getTypeIcon = (tipo) => {
        switch (tipo) {
            case 'Conducta': return <ShieldAlert size={18} />;
            case 'Salud': return <AlertTriangle size={18} />;
            case 'Logros Positivos': return <CheckCircle size={18} />;
            case 'Compromisos Incumplidos': return <XCircle size={18} />;
            default: return <FileText size={18} />;
        }
    };

    // Filter students for the registration dropdown
    const filteredAlumnosSelection = alumnos.filter(a => {
        const matchesGrado = regGrado ? a.grado.toString() === regGrado : true;
        const matchesSeccion = regSeccion ? a.seccion === regSeccion : true;
        return matchesGrado && matchesSeccion;
    });

    return (
        <div className="animate-fade">
            {/* View Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="btn-primary" style={{ padding: '10px', borderRadius: '12px' }}>
                        <AlertTriangle size={24} />
                    </div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>Registro de Incidencias</h2>
                </div>
                {view === 'summary' && (
                    <button onClick={() => setView('register')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={20} /> Nueva Incidencia
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
                <div className="glass" style={{ padding: '25px' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', opacity: 0.8 }}>Resumen de últimas incidencias</h3>

                    {loading && incidencias.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center' }}>Cargando incidencias...</div>
                    ) : incidencias.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                            <FileText size={48} style={{ marginBottom: '15px', opacity: 0.3 }} />
                            <p>No hay incidencias registradas recientemente.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {incidencias.map(inc => (
                                <div key={inc.id} className="glass" style={{
                                    padding: '16px 20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderLeft: `4px solid ${getTypeColor(inc.tipo)}`
                                }}>
                                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                        <div style={{ color: getTypeColor(inc.tipo) }}>
                                            {getTypeIcon(inc.tipo)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{inc.alumnoNombre}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {inc.tipo} • {inc.fecha} • {inc.grado}° "{inc.seccion}"
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => { setSelectedIncidencia(inc); setView('detail'); }}
                                            className="btn"
                                            style={{ padding: '8px', background: 'rgba(255,255,255,0.05)' }}
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => deleteIncidencia(inc.id)}
                                            className="btn"
                                            style={{ padding: '8px', background: 'rgba(255,0,0,0.05)', color: '#ff4d4d' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Registration Form View */}
            {view === 'register' && (
                <div className="glass" style={{ padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
                    <form onSubmit={saveIncidencia}>
                        {/* Student Selection Filters */}
                        <div style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '25px', border: '1px solid var(--glass-border)' }}>
                            <p style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '10px', opacity: 0.7 }}>Filtrar Estudiante:</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '15px' }}>
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label>Grado</label>
                                    <select value={regGrado} onChange={(e) => { setRegGrado(e.target.value); setFormData({ ...formData, alumnoId: '' }); }}>
                                        <option value="">Todos</option>
                                        {[1, 2, 3, 4, 5].map(g => <option key={g} value={g}>{g}°</option>)}
                                    </select>
                                </div>
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label>Sección</label>
                                    <select value={regSeccion} onChange={(e) => { setRegSeccion(e.target.value); setFormData({ ...formData, alumnoId: '' }); }}>
                                        <option value="">Todas</option>
                                        {['A', 'B', 'C'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label>Estudiante * (Mostrando {filteredAlumnosSelection.length})</label>
                                    <select
                                        value={formData.alumnoId}
                                        onChange={(e) => setFormData({ ...formData, alumnoId: e.target.value })}
                                        required
                                        disabled={filteredAlumnosSelection.length === 0}
                                    >
                                        <option value="">Seleccione...</option>
                                        {filteredAlumnosSelection.map(a => (
                                            <option key={a.id} value={a.id}>{a.apellidos}, {a.nombres}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
                            <div className="input-group">
                                <label>Tipo de Incidencia</label>
                                <select
                                    value={formData.tipo}
                                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                >
                                    <option value="Conducta">Conducta</option>
                                    <option value="Salud">Salud</option>
                                    <option value="Logros Positivos">Logros Positivos</option>
                                    <option value="Compromisos Incumplidos">Compromisos Incumplidos</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Registrado por</label>
                                <input type="text" value={formData.registradoPor} readOnly style={{ background: 'rgba(255,255,255,0.05)', opacity: 0.7 }} />
                            </div>
                            <div className="input-group">
                                <label>Fecha</label>
                                <input
                                    type="date"
                                    value={formData.fecha}
                                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Hora</label>
                                <input
                                    type="time"
                                    value={formData.hora}
                                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Descripción de la Incidencia *</label>
                            <textarea
                                rows="4"
                                value={formData.descripcion}
                                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                placeholder="Detalle los hechos ocurridos..."
                                required
                            ></textarea>
                        </div>

                        <div className="input-group">
                            <label>Compromisos Asumidos</label>
                            <textarea
                                rows="3"
                                value={formData.compromisos}
                                onChange={(e) => setFormData({ ...formData, compromisos: e.target.value })}
                                placeholder="Acciones o promesas acordadas..."
                            ></textarea>
                        </div>

                        <div style={{ marginTop: '30px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                Nota: Este registro será archivado permanentemente.
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ padding: '12px 40px', width: '100%' }} disabled={loading}>
                                {loading ? 'Grabando...' : 'Grabar Incidencia'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Detail View */}
            {view === 'detail' && selectedIncidencia && (
                <div className="glass" style={{ padding: '40px', maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
                    <div style={{ borderBottom: '2px solid var(--glass-border)', paddingBottom: '30px', marginBottom: '30px' }}>
                        <h3 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>DETALLE DE INCIDENCIA</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Expediente #{selectedIncidencia.id} (Base de Datos)</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px' }}>
                        <div>
                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.6, display: 'block', marginBottom: '5px' }}>Estudiante</label>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedIncidencia.alumnoNombre}</div>
                                <div style={{ color: 'var(--text-secondary)' }}>{selectedIncidencia.grado}° Grado - Sección "{selectedIncidencia.seccion}"</div>
                            </div>

                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.6, display: 'block', marginBottom: '5px' }}>Descripción de los Hechos</label>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', lineHeight: '1.6' }}>
                                    {selectedIncidencia.descripcion}
                                </div>
                            </div>

                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.6, display: 'block', marginBottom: '5px' }}>Compromisos Asumidos</label>
                                <div style={{ background: 'hsla(var(--primary-hsl), 0.05)', padding: '20px', borderRadius: '12px', lineHeight: '1.6', color: 'hsl(var(--primary-hsl))' }}>
                                    {selectedIncidencia.compromisos || 'No se registraron compromisos específicos.'}
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="glass" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Calendar size={18} className="text-gradient" />
                                    <span>{selectedIncidencia.fecha}</span>
                                </div>
                                <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Clock size={18} className="text-gradient" />
                                    <span>{selectedIncidencia.hora}</span>
                                </div>
                                <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <User size={18} className="text-gradient" />
                                    <span>Registrado por: <br /><small>{selectedIncidencia.registradoPor}</small></span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <ShieldAlert size={18} className="text-gradient" />
                                    <span>Categoría: {selectedIncidencia.tipo}</span>
                                </div>
                            </div>

                            <div style={{ marginTop: '40px', textAlign: 'center' }}>
                                <div style={{ height: '80px', borderBottom: '1px solid var(--text-primary)', marginBottom: '10px', width: '200px', margin: '0 auto' }}></div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Firma del Docente / Tutor</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '5px' }}>VO.BO. DIRECCIÓN</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '40px' }}>
                                <button onClick={() => window.print()} className="btn btn-primary" style={{ width: '100%' }}>
                                    <Printer size={18} /> Imprimir Acta
                                </button>
                                <button onClick={() => deleteIncidencia(selectedIncidencia.id)} className="btn" style={{ width: '100%', color: '#ff4d4d', background: 'rgba(255,0,0,0.05)' }}>
                                    <Trash2 size={18} /> Eliminar Registro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Styles */}
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

export default Incidencias;
