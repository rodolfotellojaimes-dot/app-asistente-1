
import React, { useState, useEffect } from 'react';
import { Search, UserPlus, FileUp, Download, Trash2, Edit2, User } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

const Alumnos = () => {
    const [activeTab, setActiveTab] = useState('ver');
    const [alumnos, setAlumnos] = useState([]);
    const [editingAlumno, setEditingAlumno] = useState(null);
    const [loading, setLoading] = useState(false); // Nuevo estado de carga

    // --- CARGA DE DATOS DESDE SUPABASE ---
    const fetchAlumnos = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Mapeo de datos (Supabase -> Frontend State)
            const mappedData = data.map(item => ({
                id: item.id,
                nombres: item.name.split(', ')[1] || item.name, // Intentar separar si guardamos como "Apellido, Nombre"
                apellidos: item.name.split(', ')[0] || '',
                grado: item.grade,
                seccion: item.section,
                dni: item.dni || '',
                ncelular: item.parent_phone || '',
                apoderado: item.apoderado || '',
                ncelular2: item.phone2 || '',
                direccion: item.direccion || ''
            }));
            setAlumnos(mappedData);
        } catch (error) {
            console.error('Error cargando alumnos:', error.message);
            alert('Error al cargar la lista de alumnos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlumnos();
    }, []);

    // --- ESTADOS DE FORMULARIO Y FILTROS ---
    const [formData, setFormData] = useState({
        apellidos: '', nombres: '', grado: '', seccion: '', dni: '',
        ncelular: '', apoderado: '', ncelular2: '', direccion: ''
    });

    const [filterGrado, setFilterGrado] = useState('');
    const [filterSeccion, setFilterSeccion] = useState('');
    const [busquedaTexto, setBusquedaTexto] = useState('');
    const [appliedFilters, setAppliedFilters] = useState({ grado: '', seccion: '', search: '' });

    // --- MANEJADORES ---
    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const startEdit = (alumno) => {
        setEditingAlumno(alumno.id);
        setFormData({ ...alumno });
        setActiveTab('registro');
    };

    const cancelEdit = () => {
        setEditingAlumno(null);
        setFormData({
            apellidos: '', nombres: '', grado: '', seccion: '', dni: '',
            ncelular: '', apoderado: '', ncelular2: '', direccion: ''
        });
        setActiveTab('ver');
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);

        const fullName = `${formData.apellidos}, ${formData.nombres}`;
        const dbData = {
            name: fullName, // Guardamos nombre completo
            grade: formData.grado.toString(),
            section: formData.seccion,
            parent_phone: formData.ncelular,
            dni: formData.dni,
            apoderado: formData.apoderado,
            phone2: formData.ncelular2,
            direccion: formData.direccion,
            status: 'active'
        };

        try {
            if (editingAlumno) {
                // Actualizar
                const { error } = await supabase
                    .from('students')
                    .update(dbData)
                    .eq('id', editingAlumno);

                if (error) throw error;
                alert('Alumno actualizado con éxito');
            } else {
                // Crear
                const { error } = await supabase
                    .from('students')
                    .insert([dbData]);

                if (error) throw error;
                alert('Alumno registrado con éxito');
            }

            // Recargar lista y limpiar
            await fetchAlumnos();
            setEditingAlumno(null);
            setFormData({
                apellidos: '', nombres: '', grado: '', seccion: '', dni: '',
                ncelular: '', apoderado: '', ncelular2: '', direccion: ''
            });
            setActiveTab('ver');

        } catch (error) {
            console.error('Error guardando alumno:', error.message);
            alert('Error al guardar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConsultar = () => {
        setAppliedFilters({ grado: filterGrado, seccion: filterSeccion, search: busquedaTexto });
    };

    const deleteAlumno = async (id) => {
        if (window.confirm('¿Eliminar este estudiante?')) {
            try {
                const { error } = await supabase
                    .from('students')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                fetchAlumnos(); // Recargar lista
            } catch (error) {
                console.error('Error eliminando:', error);
                alert('No se pudo eliminar el alumno');
            }
        }
    };

    // --- XLSX LOGIC (CARGA MASIVA) ---
    const downloadTemplate = () => {
        const template = [{ apellidos: '', nombres: '', grado: '', seccion: '', dni: '', ncelular: '', apoderado: '', ncelular2: '', direccion: '' }];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
        XLSX.writeFile(wb, "plantilla_alumnos.xlsx");
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            setLoading(true);
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

                if (data.length === 0) {
                    throw new Error("El archivo Excel está vacío.");
                }

                // 1. Obtener DNIs existentes para validación de duplicados
                const { data: existingStudents } = await supabase.from('students').select('dni');
                const existingDnis = new Set(existingStudents.map(s => s.dni));

                // 2. Preparar y Validar Datos
                const nuevos = [];
                const duplicados = [];
                const incompletos = [];

                data.forEach((item, index) => {
                    const dni = item.dni ? item.dni.toString().trim() : null;
                    const apellidos = item.apellidos || '';
                    const nombres = item.nombres || '';
                    const grado = item.grado ? item.grado.toString() : '';
                    const seccion = item.seccion || '';

                    if (!apellidos || !nombres || !grado || !seccion) {
                        incompletos.push(index + 2); // +2 por fila Excel
                        return;
                    }

                    if (dni && existingDnis.has(dni)) {
                        duplicados.push(dni);
                        return;
                    }

                    nuevos.push({
                        name: `${apellidos}, ${nombres}`,
                        grade: grado,
                        section: seccion,
                        dni: dni,
                        parent_phone: item.ncelular ? item.ncelular.toString() : null,
                        apoderado: item.apoderado || null,
                        phone2: item.ncelular2 ? item.ncelular2.toString() : null,
                        direccion: item.direccion || null,
                        status: 'active'
                    });
                });

                // 3. Informar y Guardar
                let msg = `Se encontraron ${nuevos.length} alumnos nuevos.`;
                if (duplicados.length > 0) msg += `\n- ${duplicados.length} ya existen (DNI duplicado).`;
                if (incompletos.length > 0) msg += `\n- ${incompletos.length} filas incompletas (filas: ${incompletos.join(', ')}).`;

                if (nuevos.length === 0) {
                    alert(msg + "\nNo hay datos nuevos para importar.");
                    return;
                }

                if (window.confirm(msg + "\n\n¿Desea proceder con la importación?")) {
                    const { error } = await supabase.from('students').insert(nuevos);
                    if (error) throw error;
                    alert(`¡Éxito! ${nuevos.length} alumnos importados.`);
                    fetchAlumnos();
                    setActiveTab('ver');
                }

            } catch (err) {
                console.error("Error importando Excel:", err);
                alert("Error: " + err.message);
            } finally {
                setLoading(false);
                e.target.value = null; // Reset input
            }
        };
        reader.readAsBinaryString(file);
    };

    // Filtrado (en cliente por ahora, para mantener rapidez en UX)
    const filteredAlumnos = alumnos.filter(a => {
        const fullName = `${a.nombres} ${a.apellidos}`.toLowerCase();
        const matchesSearch = fullName.includes(appliedFilters.search.toLowerCase()) ||
            (a.dni && a.dni.includes(appliedFilters.search));
        const matchesGrado = appliedFilters.grado === '' || a.grado.toString() === appliedFilters.grado;
        const matchesSeccion = appliedFilters.seccion === '' || a.seccion.toLowerCase() === appliedFilters.seccion.toLowerCase();
        return matchesSearch && matchesGrado && matchesSeccion;
    });

    const gradosOpciones = [1, 2, 3, 4, 5];
    const seccionesOpciones = ['A', 'B', 'C'];

    return (
        <div className="animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setActiveTab('ver')} className={`btn ${activeTab === 'ver' ? 'btn-primary' : ''}`} style={{ background: activeTab !== 'ver' ? 'var(--glass-bg)' : '' }}>
                        <User size={18} /> Ver Estudiantes
                    </button>
                    <button onClick={() => setActiveTab('registro')} className={`btn ${activeTab === 'registro' ? 'btn-primary' : ''}`} style={{ background: activeTab !== 'registro' ? 'var(--glass-bg)' : '' }}>
                        <UserPlus size={18} /> {editingAlumno ? 'Editar Estudiante' : 'Registro Individual'}
                    </button>
                    <button onClick={() => setActiveTab('masivo')} className={`btn ${activeTab === 'masivo' ? 'btn-primary' : ''}`} style={{ background: activeTab !== 'masivo' ? 'var(--glass-bg)' : '' }}>
                        <FileUp size={18} /> Registro Masivo
                    </button>
                </div>
            </div>

            <div className="glass" style={{ padding: '30px' }}>
                {activeTab === 'ver' && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '30px', background: 'var(--glass-bg)', padding: '20px', borderRadius: 'var(--radius-md)', alignItems: 'end' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Grado</label>
                                <select value={filterGrado} onChange={(e) => setFilterGrado(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
                                    <option value="">Todos los grados</option>
                                    {gradosOpciones.map(g => <option key={g} value={g}>{g}°</option>)}
                                </select>
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Sección</label>
                                <select value={filterSeccion} onChange={(e) => setFilterSeccion(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
                                    <option value="">Todas las secciones</option>
                                    {seccionesOpciones.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label><Search size={14} /> Búsqueda rápida</label>
                                <input type="text" placeholder="Nombre o DNI..." value={busquedaTexto} onChange={(e) => setBusquedaTexto(e.target.value)} style={{ width: '100%' }} />
                            </div>
                            <button onClick={handleConsultar} className="btn btn-primary" style={{ padding: '12px', height: '45px' }}>
                                <Search size={18} /> Consultar
                            </button>
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Cargando datos...</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            <th style={{ padding: '15px' }}>DNI</th>
                                            <th style={{ padding: '15px' }}>Apellidos y Nombres</th>
                                            <th style={{ padding: '15px' }}>Grado/Sección</th>
                                            <th style={{ padding: '15px' }}>Celular</th>
                                            <th style={{ padding: '15px' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAlumnos.map(a => (
                                            <tr key={a.id} style={{ borderBottom: '1px solid var(--glass-border)', fontSize: '0.9rem' }}>
                                                <td style={{ padding: '15px' }}>{a.dni}</td>
                                                <td style={{ padding: '15px' }}>{a.apellidos}, {a.nombres}</td>
                                                <td style={{ padding: '15px' }}>{a.grado}° "{a.seccion}"</td>
                                                <td style={{ padding: '15px' }}>{a.ncelular}</td>
                                                <td style={{ padding: '15px', display: 'flex', gap: '10px' }}>
                                                    <button onClick={() => startEdit(a)} className="btn" style={{ padding: '5px', background: 'rgba(0,0,255,0.05)', color: '#4d4dff' }}><Edit2 size={14} /></button>
                                                    <button onClick={() => deleteAlumno(a.id)} className="btn" style={{ padding: '5px', background: 'rgba(255,0,0,0.05)', color: '#ff4d4d' }}><Trash2 size={14} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredAlumnos.length === 0 && (
                                            <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No se encontraron estudiantes.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'registro' && (
                    <form onSubmit={handleRegister} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        <div className="input-group"><label>Apellidos</label><input name="apellidos" value={formData.apellidos} onChange={handleInputChange} required /></div>
                        <div className="input-group"><label>Nombres</label><input name="nombres" value={formData.nombres} onChange={handleInputChange} required /></div>
                        <div className="input-group"><label>Grado</label>
                            <select name="grado" value={formData.grado} onChange={handleInputChange} required style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
                                <option value="">Seleccione grado</option>
                                {gradosOpciones.map(g => <option key={g} value={g}>{g}°</option>)}
                            </select>
                        </div>
                        <div className="input-group"><label>Sección</label>
                            <select name="seccion" value={formData.seccion} onChange={handleInputChange} required style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
                                <option value="">Seleccione sección</option>
                                {seccionesOpciones.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="input-group"><label>DNI</label><input name="dni" value={formData.dni} onChange={handleInputChange} required /></div>
                        <div className="input-group"><label>Celular</label><input name="ncelular" value={formData.ncelular} onChange={handleInputChange} required /></div>
                        <div className="input-group"><label>Apoderado</label><input name="apoderado" value={formData.apoderado} onChange={handleInputChange} required /></div>
                        <div className="input-group"><label>Celular 2</label><input name="ncelular2" value={formData.ncelular2} onChange={handleInputChange} /></div>
                        <div className="input-group" style={{ gridColumn: '1 / -1' }}><label>Dirección</label><input name="direccion" value={formData.direccion} onChange={handleInputChange} /></div>
                        <div style={{ gridColumn: '1 / -1', marginTop: '10px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                            <button type="submit" className="btn btn-primary" style={{ padding: '12px 30px' }} disabled={loading}>
                                {loading ? 'Guardando...' : (editingAlumno ? 'Actualizar' : 'Guardar')}
                            </button>

                            {editingAlumno && (
                                <>
                                    <button type="button" onClick={() => deleteAlumno(editingAlumno)} className="btn" style={{ padding: '12px 30px', background: 'rgba(255,0,0,0.1)', color: '#ff4d4d' }}>
                                        <Trash2 size={18} /> Eliminar Estudiante
                                    </button>
                                    <button type="button" onClick={cancelEdit} className="btn" style={{ padding: '12px 30px', background: 'var(--glass-bg)' }}>
                                        Cancelar
                                    </button>
                                </>
                            )}
                        </div>
                    </form>
                )}

                {activeTab === 'masivo' && (
                    <div style={{ textAlign: 'center', padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
                        <div style={{ marginBottom: '30px', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '15px', border: '1px dashed var(--glass-border)' }}>
                            <FileUp size={48} className="text-gradient" style={{ marginBottom: '15px', opacity: 0.5 }} />
                            <h3 style={{ marginBottom: '10px' }}>Carga Masiva de Alumnos</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                Sube archivos Excel (.xlsx) con los datos de tus estudiantes.
                                Asegúrate de usar los nombres de columnas correctos.
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileUpload}
                                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 2 }}
                                    disabled={loading}
                                />
                                <button className="btn btn-primary" style={{ width: '100%', padding: '15px' }} disabled={loading}>
                                    <FileUp size={20} /> {loading ? 'Procesando...' : 'Seleccionar Archivo Excel'}
                                </button>
                            </div>

                            <button onClick={downloadTemplate} className="btn" style={{ background: 'var(--glass-bg)', width: '100%' }}>
                                <Download size={20} /> Descargar Plantilla Sugerida
                            </button>
                        </div>

                        <div style={{ marginTop: '30px', textAlign: 'left', fontSize: '0.8rem', opacity: 0.6 }}>
                            <p><strong>Columnas aceptadas:</strong> apellidos, nombres, grado, seccion, dni, ncelular, apoderado, ncelular2, direccion.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Alumnos;
