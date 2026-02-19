
import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    MessageSquare,
    FileText,
    User,
    Calendar,
    Clock,
    UserPlus,
    ChevronRight,
    Printer,
    Trash2,
    CheckCircle,
    Info,
    Eye,
    ArrowLeft,
    Handshake
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const AtencionPadres = ({ currentUser }) => {
    const [view, setView] = useState('summary'); // summary, register, detail
    const [atenciones, setAtenciones] = useState([]);
    const [alumnos, setAlumnos] = useState([]);
    const [selectedAtencion, setSelectedAtencion] = useState(null);
    const [loading, setLoading] = useState(false);

    // Registration Filters
    const [regGrado, setRegGrado] = useState('');
    const [regSeccion, setRegSeccion] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        alumnoId: '',
        parentName: '',
        parentDni: '',
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        motivo: '',
        descripcion: '',
        acuerdos: '',
        registradoPor: currentUser?.email || 'Docente'
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
            })).sort((a, b) => {
                const nA = `${a.apellidos} ${a.nombres}`.toLowerCase();
                const nB = `${b.apellidos} ${b.nombres}`.toLowerCase();
                return nA.localeCompare(nB);
            });
            setAlumnos(alumnosMapeados);

            // 2. Cargar Atenciones Históricas
            const { data: atencionesData, error: errAt } = await supabase
                .from('parent_meetings')
                .select(`
                    *,
                    students (
                        name,
                        grade,
                        section
                    )
                `)
                .order('date', { ascending: false });

            if (errAt) throw errAt;

            const atencionesMapeadas = atencionesData.map(at => ({
                id: at.id,
                alumnoId: at.student_id,
                alumnoNombre: at.students ? at.students.name : 'Estudiante eliminado',
                grado: at.students?.grade,
                seccion: at.students?.section,
                parentName: at.parent_name,
                parentDni: at.parent_dni,
                motivo: at.reason,
                fecha: at.date,
                hora: at.time || '00:00',
                descripcion: at.description,
                acuerdos: at.agreements,
                registradoPor: at.registered_by || 'Sistema'
            }));

            setAtenciones(atencionesMapeadas);

        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    };

    const saveAtencion = async (e) => {
        e.preventDefault();
        if (!formData.alumnoId || !formData.parentName || !formData.motivo) {
            alert('Por favor complete los campos obligatorios (*).');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('parent_meetings')
                .insert([{
                    student_id: formData.alumnoId,
                    parent_name: formData.parentName,
                    parent_dni: formData.parentDni,
                    date: formData.fecha,
                    time: formData.hora,
                    reason: formData.motivo,
                    description: formData.descripcion,
                    agreements: formData.acuerdos,
                    registered_by: formData.registradoPor,
                    user_id: (await supabase.auth.getUser()).data.user?.id
                }]);

            if (error) throw error;

            alert('Atención registrada correctamente.');

            // Recargar datos y volver
            await fetchData();
            setFormData({
                alumnoId: '',
                parentName: '',
                parentDni: '',
                fecha: new Date().toISOString().split('T')[0],
                hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                motivo: '',
                descripcion: '',
                acuerdos: '',
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

    const deleteAtencion = async (id) => {
        if (window.confirm('¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.')) {
            setLoading(true);
            try {
                const { error } = await supabase
                    .from('parent_meetings')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                setAtenciones(atenciones.filter(at => at.id !== id));
                if (view === 'detail') setView('summary');

            } catch (error) {
                console.error("Error eliminando:", error);
                alert("Error al eliminar: " + error.message);
            } finally {
                setLoading(false);
            }
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
                        <MessageSquare size={24} />
                    </div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>Atención a Padres</h2>
                </div>
                {view === 'summary' && (
                    <button onClick={() => setView('register')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={20} /> Nueva Atención
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
                    <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', opacity: 0.8 }}>Últimas entrevistas y reuniones</h3>

                    {loading && atenciones.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center' }}>Cargando datos...</div>
                    ) : atenciones.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                            <MessageSquare size={48} style={{ marginBottom: '15px', opacity: 0.3 }} />
                            <p>No hay registros de atención recientes.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {atenciones.map(at => (
                                <div key={at.id} className="glass" style={{
                                    padding: '16px 20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderLeft: `4px solid hsl(var(--primary-hsl))`
                                }}>
                                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                        <div style={{ color: 'hsl(var(--primary-hsl))' }}>
                                            <UserPlus size={18} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{at.parentName} <small style={{ fontWeight: 'normal', opacity: 0.7 }}>(Padre de {at.alumnoNombre})</small></div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {at.motivo} • {at.fecha} • {at.grado}° "{at.seccion}"
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => { setSelectedAtencion(at); setView('detail'); }}
                                            className="btn"
                                            style={{ padding: '8px', background: 'rgba(255,255,255,0.05)' }}
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => deleteAtencion(at.id)}
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
                    <form onSubmit={saveAtencion}>
                        {/* Student Selection Filters */}
                        <div style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '25px', border: '1px solid var(--glass-border)' }}>
                            <p style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '10px', opacity: 0.7 }}>Vincular con Estudiante:</p>
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
                                    <label>Estudiante *</label>
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
                                <label>Nombre del Padre/Apoderado *</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{ position: 'absolute', left: '12px', top: '15px', opacity: 0.5 }} />
                                    <input
                                        type="text"
                                        placeholder="Nombres y Apellidos"
                                        value={formData.parentName}
                                        onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                                        style={{ paddingLeft: '40px' }}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>DNI del Padre (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Número de DNI"
                                    value={formData.parentDni}
                                    onChange={(e) => setFormData({ ...formData, parentDni: e.target.value })}
                                />
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
                            <label>Motivo de la Entrevista *</label>
                            <input
                                type="text"
                                placeholder="Ej: Citación por conducta, consulta académica..."
                                value={formData.motivo}
                                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>Descripción / Observaciones</label>
                            <textarea
                                rows="4"
                                value={formData.descripcion}
                                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                placeholder="Detalles de lo conversado..."
                            ></textarea>
                        </div>

                        <div className="input-group">
                            <label>Acuerdos y Compromisos</label>
                            <textarea
                                rows="3"
                                value={formData.acuerdos}
                                onChange={(e) => setFormData({ ...formData, acuerdos: e.target.value })}
                                placeholder="Acuerdos llegados con el padre de familia..."
                            ></textarea>
                        </div>

                        <div style={{ marginTop: '30px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                El registro quedará asociado a tu cuenta.
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ padding: '12px 40px', width: '200px' }} disabled={loading}>
                                {loading ? 'Cargando...' : 'Guardar Registro'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Detail View */}
            {view === 'detail' && selectedAtencion && (
                <div className="glass" style={{ padding: '40px', maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
                    <div style={{ borderBottom: '2px solid var(--glass-border)', paddingBottom: '30px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>ACTA DE ATENCIÓN A PADRES</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>Nro. Registro: {selectedAtencion.id.substring(0, 8).toUpperCase()}</p>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.8rem', opacity: 0.7 }}>
                            IEI. Pedro Sánchez Gavidia<br />Huánuco
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px' }}>
                        <div>
                            <div style={{ marginBottom: '25px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.6, display: 'block', marginBottom: '5px' }}>Padre/Apoderado</label>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{selectedAtencion.parentName}</div>
                                    <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>DNI: {selectedAtencion.parentDni || '---'}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.6, display: 'block', marginBottom: '5px' }}>Estudiante</label>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{selectedAtencion.alumnoNombre}</div>
                                    <div style={{ color: 'var(--text-secondary)' }}>{selectedAtencion.grado}° Grado - Sección "{selectedAtencion.seccion}"</div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.6, display: 'block', marginBottom: '5px' }}>Motivo de la Atención</label>
                                <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'hsl(var(--primary-hsl))' }}>
                                    {selectedAtencion.motivo}
                                </div>
                            </div>

                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.6, display: 'block', marginBottom: '5px' }}>Descripción de la Entrevista</label>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', lineHeight: '1.6' }}>
                                    {selectedAtencion.descripcion || 'Sin descripción detallada.'}
                                </div>
                            </div>

                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.6, display: 'block', marginBottom: '5px' }}>Acuerdos y Compromisos</label>
                                <div style={{ background: 'hsla(var(--primary-hsl), 0.05)', padding: '20px', borderRadius: '12px', lineHeight: '1.6', color: 'hsl(var(--primary-hsl))', borderLeft: '3px solid hsl(var(--primary-hsl))' }}>
                                    {selectedAtencion.acuerdos || 'No se registraron acuerdos específicos.'}
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="glass" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Calendar size={18} className="text-gradient" />
                                    <span>{selectedAtencion.fecha}</span>
                                </div>
                                <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Clock size={18} className="text-gradient" />
                                    <span>{selectedAtencion.hora}</span>
                                </div>
                                <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <User size={18} className="text-gradient" />
                                    <span>Docente: <br /><small>{selectedAtencion.registradoPor}</small></span>
                                </div>
                            </div>

                            <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '50px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ height: '60px', borderBottom: '1px solid var(--text-primary)', marginBottom: '10px', width: '150px', margin: '0 auto' }}></div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Firma del Padre / Apoderado</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ height: '60px', borderBottom: '1px solid var(--text-primary)', marginBottom: '10px', width: '150px', margin: '0 auto' }}></div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Firma del Docente</div>
                                </div>
                            </div>

                            <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '40px' }}>
                                <button onClick={() => window.print()} className="btn btn-primary" style={{ width: '100%' }}>
                                    <Printer size={18} /> Imprimir Acta
                                </button>
                                <button onClick={() => deleteAtencion(selectedAtencion.id)} className="btn" style={{ width: '100%', color: '#ff4d4d', background: 'rgba(255,0,0,0.05)' }}>
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

export default AtencionPadres;
