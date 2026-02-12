import React, { useState, useEffect } from 'react';
import { UserCog, UserPlus, Trash2, Search, Mail, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Usuarios = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterSearch, setFilterSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const fetchUsuarios = async () => {
        setLoading(true);
        try {
            // Note: Since we don't have a specific profiles table yet, 
            // we'll try to fetch from a 'profiles' table which is standard in Supabase templates.
            // If it doesn't exist, we might need to handle the error or create it.
            const { data, error } = await supabase
                .from('profiles')
                .select('*');

            if (error) {
                console.error("Error fetching profiles:", error);
                // Fallback to empty if table doesn't exist
                setUsuarios([]);
            } else {
                setUsuarios(data);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: newEmail,
                password: newPassword,
            });

            if (error) throw error;

            alert('Usuario registrado. Se ha enviado un email de confirmación.');
            setShowAddModal(false);
            setNewEmail('');
            setNewPassword('');
            fetchUsuarios();
        } catch (error) {
            alert('Error al registrar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setUsuarios(usuarios.filter(u => u.id !== id));
            alert('Usuario eliminado del sistema local.');
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    };

    const filteredUsers = usuarios.filter(u =>
        u.email?.toLowerCase().includes(filterSearch.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(filterSearch.toLowerCase())
    );

    return (
        <div className="animate-fade" style={{ color: 'var(--text-primary)' }}>
            <div className="glass" style={{ padding: '30px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ background: 'hsla(var(--primary-hsl), 0.1)', color: 'hsl(var(--primary-hsl))', padding: '12px', borderRadius: '15px' }}>
                            <UserCog size={28} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Gestión de Usuarios</h1>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Administrar accesos de docentes</p>
                        </div>
                    </div>
                    <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
                        <UserPlus size={18} /> Nuevo Usuario
                    </button>
                </div>

                <div className="input-group" style={{ marginBottom: 0, maxWidth: '400px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
                            style={{ paddingLeft: '45px' }}
                        />
                    </div>
                </div>
            </div>

            <div className="glass" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.02)' }}>
                                <th style={{ padding: '20px' }}>Usuario</th>
                                <th style={{ padding: '20px' }}>Rol</th>
                                <th style={{ padding: '20px' }}>Fecha Registro</th>
                                <th style={{ padding: '20px', textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando usuarios...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No se encontraron usuarios</td>
                                </tr>
                            ) : (
                                filteredUsers.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <td style={{ padding: '15px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'hsla(var(--primary-hsl), 0.1)', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: 'hsl(var(--primary-hsl))', fontWeight: 'bold' }}>
                                                    {u.email?.[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '600' }}>{u.full_name || 'Sin nombre'}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Mail size={12} /> {u.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                background: u.role === 'admin' ? 'rgba(255, 215, 0, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                                color: u.role === 'admin' ? '#d4af37' : 'inherit',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                <Shield size={12} /> {u.role === 'admin' ? 'Administrador' : 'Docente'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '---'}
                                        </td>
                                        <td style={{ padding: '20px', textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleDeleteUser(u.id)}
                                                style={{ color: '#ff4d4d', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAddModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="glass" style={{ width: '100%', maxWidth: '400px', padding: '30px' }}>
                        <h2 style={{ marginBottom: '20px' }}>Nuevo Docente</h2>
                        <form onSubmit={handleAddUser}>
                            <div className="input-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="ejemplo@correo.com"
                                />
                            </div>
                            <div className="input-group">
                                <label>Contraseña Temporal</label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn" style={{ flex: 1, background: 'rgba(0,0,0,0.05)' }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                                    {loading ? '...' : 'Registrar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Usuarios;
