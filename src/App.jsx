// Iniciando despliegue en Vercel con variables de entorno
import React, { useState, useEffect } from 'react';

import Login from './components/Login';
import Alumnos from './components/Alumnos';
import Asistencia from './components/Asistencia';
import Logros from './components/Logros';
import Incidencias from './components/Incidencias';
import AtencionPadres from './components/AtencionPadres';
import Usuarios from './components/Usuarios';
import Sedes from './components/Sedes';
import { Users, ClipboardCheck, TrendingUp, AlertCircle, Home, LogOut, UserCog, MapPin, Handshake } from 'lucide-react';
import logo from './assets/logo.png';
import './index.css';

import { supabase } from './lib/supabase';

function App() {
  const [user, setUser] = useState(null);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setActiveModule('dashboard');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        Cargando...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const modules = [
    { id: 'alumnos', name: 'Alumnos', icon: <Users size={32} />, color: '250, 84%, 60%' },
    { id: 'asistencia', name: 'Asistencia', icon: <ClipboardCheck size={32} />, color: '280, 80%, 65%' },
    { id: 'logros', name: 'Avances de Logro', icon: <TrendingUp size={32} />, color: '190, 90%, 50%' },
    { id: 'incidencias', name: 'Registro de Incidencias', icon: <AlertCircle size={32} />, color: '20, 80%, 60%' },
    { id: 'atencion-padres', name: 'Atención a Padres', icon: <Handshake size={32} />, color: '150, 70%, 50%' },
    { id: 'usuarios', name: 'Gestión de Usuarios', icon: <UserCog size={32} />, color: '220, 70%, 50%' },
    { id: 'sedes', name: 'Registro de Sedes', icon: <MapPin size={32} />, color: '30, 80%, 55%' },
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'alumnos':
        return <Alumnos />;
      case 'asistencia':
        return <Asistencia />;
      case 'logros':
        return <Logros />;
      case 'incidencias':
        return <Incidencias currentUser={user} />;
      case 'atencion-padres':
        return <AtencionPadres currentUser={user} />;
      case 'usuarios':
        return <Usuarios />;
      case 'sedes':
        return <Sedes />;
      default:
        return (
          <div className="glass animate-fade" style={{ padding: '40px', minHeight: '60vh', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '20px' }}>
              {modules.find(m => m.id === activeModule)?.icon}
              <h2 style={{ fontSize: '1.8rem' }}>{modules.find(m => m.id === activeModule)?.name}</h2>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              Módulo de {modules.find(m => m.id === activeModule)?.name} en desarrollo...
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-container" style={{ paddingBottom: '40px' }}>
      <nav className="glass" style={{ margin: '20px', padding: '10px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: '20px', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div onClick={() => setActiveModule('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <img src={logo} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
            <h2 className="text-gradient" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              ASISTENTE DOCENTE
            </h2>
          </div>
          {activeModule !== 'dashboard' && (
            <button onClick={() => setActiveModule('dashboard')} className="btn" style={{ padding: '4px 8px', background: 'var(--glass-bg)' }}>
              <Home size={18} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{user.email}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Docente</div>
          </div>
          <button onClick={handleLogout} className="btn" style={{ padding: '8px', borderRadius: '50%', background: 'rgba(255,0,0,0.1)', color: '#ff4d4d' }}>
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main style={{ padding: '0 20px', maxWidth: '1200px', margin: '0 auto' }}>
        {activeModule === 'dashboard' ? (
          <div className="animate-fade">
            <header style={{ marginBottom: '40px', textAlign: 'center' }}>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Panel Principal</h1>
              <p style={{ color: 'var(--text-secondary)' }}>IEI Pedro Sánchez Gavidia - Huánuco</p>
            </header>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '24px'
            }}>
              {modules.map((m) => (
                <div
                  key={m.id}
                  className="glass"
                  onClick={() => setActiveModule(m.id)}
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.borderColor = `hsl(${m.color})`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                  }}
                >
                  <div style={{
                    width: '70px',
                    height: '70px',
                    background: `hsla(${m.color}, 0.1)`,
                    color: `hsl(${m.color})`,
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    border: `1px solid hsla(${m.color}, 0.2)`
                  }}>
                    {m.icon}
                  </div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{m.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Acceder a la gestión de {m.name.toLowerCase()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          renderModule()
        )}
      </main>
    </div>
  );
}

export default App;
