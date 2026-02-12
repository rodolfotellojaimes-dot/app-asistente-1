import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Edit2, Save, X, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Sedes = () => {
    const [sedes, setSedes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', address: '' });
    const [showAddForm, setShowAddForm] = useState(false);
    const [newSede, setNewSede] = useState({ name: '', address: '' });

    useEffect(() => {
        fetchSedes();
    }, []);

    const fetchSedes = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sedes')
                .select('*')
                .order('name');

            if (error) {
                console.error("Error fetching sedes:", error);
                // Fallback to empty if table doesn't exist
                setSedes([]);
            } else {
                setSedes(data);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase
                .from('sedes')
                .insert([newSede]);

            if (error) throw error;

            alert('Sede agregada correctamente');
            setShowAddForm(false);
            setNewSede({ name: '', address: '' });
            fetchSedes();
        } catch (error) {
            alert('Error al agregar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (id) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('sedes')
                .update(editForm)
                .eq('id', id);

            if (error) throw error;

            alert('Sede actualizada');
            setIsEditing(null);
            fetchSedes();
        } catch (error) {
            alert('Error al actualizar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar esta sede?')) return;

        try {
            const { error } = await supabase
                .from('sedes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSedes(sedes.filter(s => s.id !== id));
            alert('Sede eliminada');
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    };

    const startEdit = (sede) => {
        setIsEditing(sede.id);
        setEditForm({ name: sede.name, address: sede.address });
    };

    return (
        <div className="animate-fade" style={{ color: 'var(--text-primary)' }}>
            <div className="glass" style={{ padding: '30px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ background: 'hsla(20, 80%, 60%, 0.1)', color: 'hsl(20, 80%, 60%)', padding: '12px', borderRadius: '15px' }}>
                            <MapPin size={28} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Registro de Sedes</h1>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Gestionar ubicaciones de la institución</p>
                        </div>
                    </div>
                    <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-primary" style={{ background: 'var(--primary-gradient)' }}>
                        <Plus size={18} /> {showAddForm ? 'Cancelar' : 'Nueva Sede'}
                    </button>
                </div>

                {showAddForm && (
                    <div className="animate-fade" style={{ marginTop: '25px', padding: '20px', background: 'rgba(0,0,0,0.02)', borderRadius: '15px', border: '1px dashed var(--glass-border)' }}>
                        <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Nombre de la Sede</label>
                                <input
                                    type="text"
                                    required
                                    value={newSede.name}
                                    onChange={(e) => setNewSede({ ...newSede, name: e.target.value })}
                                    placeholder="Ej: Sede Central"
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Dirección / Ubicación</label>
                                <input
                                    type="text"
                                    required
                                    value={newSede.address}
                                    onChange={(e) => setNewSede({ ...newSede, address: e.target.value })}
                                    placeholder="Ej: Av. Universitaria 123"
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ height: '48px' }} disabled={loading}>
                                Guardar Sede
                            </button>
                        </form>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {loading && sedes.length === 0 ? (
                    <div className="glass" style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1' }}>
                        Cargando sedes...
                    </div>
                ) : sedes.length === 0 ? (
                    <div className="glass" style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1', color: 'var(--text-secondary)' }}>
                        No hay sedes registradas.
                    </div>
                ) : (
                    sedes.map(s => (
                        <div key={s.id} className="glass card-hover" style={{ padding: '25px', position: 'relative' }}>
                            {isEditing === s.id ? (
                                <div className="animate-fade">
                                    <div className="input-group">
                                        <label>Nombre</label>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Dirección</label>
                                        <input
                                            type="text"
                                            value={editForm.address}
                                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => handleUpdate(s.id)} className="btn btn-primary" style={{ flex: 1, padding: '8px' }}>
                                            <Save size={16} /> Guardar
                                        </button>
                                        <button onClick={() => setIsEditing(null)} className="btn" style={{ background: 'rgba(0,0,0,0.05)', padding: '8px' }}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                                        <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                            <Building2 size={24} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '1.2rem', marginBottom: '5px' }}>{s.name}</h3>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <MapPin size={14} /> {s.address}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
                                        <button onClick={() => startEdit(s)} className="btn" style={{ padding: '8px', background: 'none', color: 'var(--text-secondary)' }}>
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(s.id)} className="btn" style={{ padding: '8px', background: 'none', color: '#ff4d4d' }}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Sedes;
