import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

function App() {
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [balance, setBalance] = useState({ ingresos: 0, egresos: 0, balance: 0 })
  const [mensaje, setMensaje] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false);
  const [transacciones, setTransacciones] = useState([]);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().slice(0, 7));
  const [gastosFijos, setGastosFijos] = useState([]); 
  const [mostrarNuevoFijo, setMostrarNuevoFijo] = useState(false);
  const [nuevoFijo, setNuevoFijo] = useState({ nombre: '', monto: '' });
  const [tasaBCV, setTasaBCV] = useState(60.00); 
  const [nuevoMovimiento, setNuevoMovimiento] = useState({
    monto: '',
    descripcion: '',
    tipo: 'egreso',
    categoria_id: 1,
    fecha: new Date().toISOString().split('T')[0]
  });

  const CATEGORIAS = {
    1: { nombre: 'Comida', icono: '🍔', color: 'text-orange-400' },
    2: { nombre: 'Hogar', icono: '🏠', color: 'text-blue-400' },
    3: { nombre: 'Transporte', icono: '🚗', color: 'text-purple-400' },
    4: { nombre: 'Ingresos', icono: '💰', color: 'text-green-400' },
    5: { nombre: 'Ocio', icono: '🎮', color: 'text-pink-400' }
  };

  // 1. Único efecto de carga inicial
  useEffect(() => {
    const inicializarApp = async () => {
      const usuarioGuardado = localStorage.getItem('usuarioGestor');
      if (usuarioGuardado) {
        const u = JSON.parse(usuarioGuardado);
        setUser(u);
        obtenerBalance(u.id);
        obtenerTransacciones(u.id);
      }
      
      try {
        const resTasa = await axios.get('https://gestor-gastos-back.onrender.com/api/tasa-bcv');
        if (resTasa.data.tasa) setTasaBCV(resTasa.data.tasa);
      } catch (err) {
        console.error("Error obteniendo tasa BCV:", err);
      }
    };
    inicializarApp();
  }, []);

  // 2. Efecto para cambio de mes/filtro
  useEffect(() => {
    if (user) {
      obtenerBalance(user.id);
      obtenerTransacciones(user.id);
    }
  }, [fechaFiltro]);

  const obtenerBalance = async (userId) => {
    try {
      const res = await axios.get(`https://gestor-gastos-back.onrender.com/api/transacciones/${userId}/balance`);
      setBalance(res.data);
    } catch (err) { console.error(err); }
  };

  const obtenerTransacciones = async (userId) => {
    try {
      const [anio, mes] = fechaFiltro.split('-');
      const res = await axios.get(`https://gestor-gastos-back.onrender.com/api/usuarios/${userId}/transacciones`, {
        params: { mes, anio }
      });
      setTransacciones(res.data);
    } catch (err) { console.error(err); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://gestor-gastos-back.onrender.com/api/usuarios/login', { email, password });
      const u = res.data.usuario;
      localStorage.setItem('usuarioGestor', JSON.stringify(u));
      setUser(u);
      obtenerBalance(u.id);
      obtenerTransacciones(u.id);
    } catch (err) { setMensaje('Error: Credenciales incorrectas'); }
  };

  const cerrarSesion = () => {
    localStorage.removeItem('usuarioGestor');
    setMostrarPerfil(false);
    setUser(null);
  };

  const guardarMovimiento = async (e) => {
    if (e) e.preventDefault();
    try {
      await axios.post('https://gestor-gastos-back.onrender.com/api/transacciones', {
        ...nuevoMovimiento,
        usuario_id: user.id,
        monto: Number(nuevoMovimiento.monto),
        categoria_id: Number(nuevoMovimiento.categoria_id)
      });
      setMostrarForm(false);
      setNuevoMovimiento({ monto: '', descripcion: '', tipo: 'egreso', categoria_id: 1, fecha: new Date().toISOString().split('T')[0] });
      obtenerBalance(user.id);
      obtenerTransacciones(user.id);
    } catch (err) { alert("Error al guardar"); }
  };

  const eliminarTransaccion = async (id) => {
    if (window.confirm("¿Borrar este movimiento?")) {
      try {
        await axios.delete(`https://gestor-gastos-back.onrender.com/api/transacciones/${id}`);
        obtenerBalance(user.id);
        obtenerTransacciones(user.id);
      } catch (err) { alert("Error"); }
    }
  };

  const exportarCSV = () => {
    const encabezados = "Fecha,Descripcion,Tipo,Monto\n";
    const filas = transacciones.map(t => `${t.fecha},${t.descripcion},${t.tipo},${t.monto}`).join("\n");
    const blob = new Blob([encabezados + filas], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_${fechaFiltro}.csv`;
    link.click();
  };

  if (user) {
    const datosGrafico = transacciones
      .filter(t => t.tipo === 'egreso')
      .reduce((acc, t) => {
        const nombreCat = CATEGORIAS[t.categoria_id]?.nombre || 'Otros';
        const existente = acc.find(item => item.name === nombreCat);
        if (existente) existente.value += Number(t.monto);
        else acc.push({ name: nombreCat, value: Number(t.monto) });
        return acc;
      }, []);

    const COLORES = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
    const transaccionesFiltradas = filtroCategoria === 'todas' 
      ? transacciones 
      : transacciones.filter(t => t.categoria_id === Number(filtroCategoria));

    return (
      <div className="min-h-screen bg-slate-900 text-white p-6 font-sans">
        <div className="max-w-4xl mx-auto">
          <header className="flex justify-between items-center mb-8">
            <div onClick={() => setMostrarPerfil(true)} className="cursor-pointer">
              <h1 className="text-2xl font-bold">Hola, {user.nombre} 👋</h1>
              <p className="text-slate-400 text-sm">Ver mi perfil</p>
            </div>
            <button onClick={() => setMostrarPerfil(true)} className="bg-slate-800 p-2 rounded-full border border-slate-700">👤</button>
          </header>

          <div className="flex justify-between items-center mb-6 bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
            <h3 className="text-sm font-bold text-slate-400 uppercase">Periodo</h3>
            <input type="month" className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none text-sm" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} />
          </div>

          {/* BALANCE DUAL */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl shadow-2xl mb-6 border border-slate-700 text-center relative overflow-hidden">
            <div className="absolute top-4 right-4 flex flex-col items-end">
              <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <p className="text-[10px] text-slate-400 font-bold">BCV: <span className="text-white">Bs. {tasaBCV.toFixed(2)}</span></p>
              </div>
              <p className="text-[8px] text-slate-600 mt-1 uppercase italic tracking-tighter">Actualizado</p>
            </div>
            <p className="text-slate-400 text-sm uppercase font-semibold tracking-widest">Balance Total</p>
            <h2 className="text-5xl font-black mt-2 text-white">
              Bs. {Number(balance.balance).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </h2>
            <div className="mt-2 inline-block px-4 py-1 bg-blue-600/10 border border-blue-500/20 rounded-full">
              <p className="text-blue-400 font-bold text-lg">$ {(Number(balance.balance) / tasaBCV).toFixed(2)} <span className="text-[10px] ml-1">USD</span></p>
            </div>
          </div>

          {/* TARJETAS INGRESOS/GASTOS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-green-500/20">
              <p className="text-slate-400 text-xs font-bold uppercase mb-1">Ingresos</p>
              <p className="text-2xl font-bold text-green-400">Bs. {Number(balance.ingresos).toLocaleString()}</p>
              <p className="text-[10px] text-green-500/60 font-medium">≈ ${(Number(balance.ingresos) / tasaBCV).toFixed(2)} USD</p>
            </div>
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-red-500/20">
              <p className="text-slate-400 text-xs font-bold uppercase mb-1">Gastos</p>
              <p className="text-2xl font-bold text-red-400">Bs. {Number(balance.egresos).toLocaleString()}</p>
              <p className="text-[10px] text-red-500/60 font-medium">≈ ${(Number(balance.egresos) / tasaBCV).toFixed(2)} USD</p>
            </div>
          </div>

          {/* GASTOS MENSUALES FIJOS */}
          <div className="mt-8 bg-slate-800/40 rounded-3xl p-6 border border-slate-700 shadow-inner">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold">📌 Gastos Mensuales Fijos</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Compromisos en USD</p>
              </div>
              <button onClick={() => setMostrarNuevoFijo(!mostrarNuevoFijo)} className={`text-xs px-4 py-2 rounded-xl border transition-all ${mostrarNuevoFijo ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white'}`}>
                {mostrarNuevoFijo ? 'Cancelar' : '+ Nuevo Fijo'}
              </button>
            </div>

            {mostrarNuevoFijo && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 p-4 bg-slate-900/50 rounded-2xl border border-slate-700 animate-in slide-in-from-top-2">
                <input type="text" placeholder="Nombre (ej: Alquiler)" className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm outline-none" value={nuevoFijo.nombre} onChange={(e) => setNuevoFijo({...nuevoFijo, nombre: e.target.value})} />
                <input type="number" placeholder="Monto ($)" className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm outline-none" value={nuevoFijo.monto} onChange={(e) => setNuevoFijo({...nuevoFijo, monto: e.target.value})} />
                <button onClick={() => { if(nuevoFijo.nombre && nuevoFijo.monto) { setGastosFijos([...gastosFijos, { ...nuevoFijo, id: Date.now() }]); setNuevoFijo({ nombre: '', monto: '' }); setMostrarNuevoFijo(false); } }} className="bg-blue-600 text-white font-bold rounded-xl text-sm py-3">Guardar</button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {gastosFijos.length === 0 ? (
                <p className="text-slate-600 text-xs italic py-4 col-span-2 text-center">No hay gastos fijos configurados.</p>
              ) : (
                gastosFijos.map(gasto => (
                  <div key={gasto.id} className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 flex justify-between items-center group">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{gasto.nombre}</span>
                      <span className="text-xs font-bold text-blue-400">${Number(gasto.monto).toLocaleString()} USD</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setNuevoMovimiento({
                            ...nuevoMovimiento,
                            monto: (Number(gasto.monto) * tasaBCV).toFixed(2),
                            descripcion: `Pago fijo: ${gasto.nombre}`,
                            tipo: 'egreso'
                          });
                          setMostrarForm(true);
                          window.scrollTo({ top: 400, behavior: 'smooth' });
                        }}
                        className="text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-2 rounded-lg hover:bg-green-500 hover:text-white"
                      >Pagar en Bs.</button>
                      <button onClick={() => setGastosFijos(gastosFijos.filter(item => item.id !== gasto.id))} className="text-slate-600 hover:text-red-500 px-1">✕</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* GRÁFICO */}
          <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 mt-6 h-80">
            <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Distribución de Gastos</h3>
            {datosGrafico.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={datosGrafico} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {datosGrafico.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '10px' }} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-full text-slate-500 italic text-sm">Sin gastos registrados este mes</div>}
          </div>

          {/* BOTÓN Y FORMULARIO */}
          {!mostrarForm ? (
            <button onClick={() => setMostrarForm(true)} className="w-full mt-8 bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/40">+ Nuevo Movimiento</button>
          ) : (
            <form onSubmit={guardarMovimiento} className="mt-8 bg-slate-800 p-6 rounded-2xl border border-blue-500/30 space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                <h3 className="font-bold text-lg text-blue-400">Registrar en Bolívares</h3>
                <button type="button" onClick={() => setMostrarForm(false)} className="text-slate-500">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setNuevoMovimiento({...nuevoMovimiento, tipo: 'ingreso'})} className={`py-3 rounded-xl font-bold transition-all ${nuevoMovimiento.tipo === 'ingreso' ? 'bg-green-600 text-white' : 'bg-slate-900 text-slate-500'}`}>Ingreso</button>
                <button type="button" onClick={() => setNuevoMovimiento({...nuevoMovimiento, tipo: 'egreso'})} className={`py-3 rounded-xl font-bold transition-all ${nuevoMovimiento.tipo === 'egreso' ? 'bg-red-600 text-white' : 'bg-slate-900 text-slate-500'}`}>Egreso</button>
              </div>
              <input type="number" step="0.01" placeholder="Monto en Bs." className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500" value={nuevoMovimiento.monto} onChange={(e) => setNuevoMovimiento({...nuevoMovimiento, monto: e.target.value})} required />
              <input type="text" placeholder="Descripción" className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500" value={nuevoMovimiento.descripcion} onChange={(e) => setNuevoMovimiento({...nuevoMovimiento, descripcion: e.target.value})} required />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-sm outline-none" value={nuevoMovimiento.fecha} onChange={(e) => setNuevoMovimiento({...nuevoMovimiento, fecha: e.target.value})} />
                <select className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-sm outline-none" value={nuevoMovimiento.categoria_id} onChange={(e) => setNuevoMovimiento({...nuevoMovimiento, categoria_id: Number(e.target.value)})}>
                  {Object.entries(CATEGORIAS).map(([id, cat]) => <option key={id} value={id}>{cat.icono} {cat.nombre}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 py-4 rounded-xl font-bold hover:bg-blue-500 transition-colors">Guardar Movimiento</button>
            </form>
          )}

          {/* HISTORIAL */}
          <div className="mt-10 mb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h3 className="text-xl font-bold">📜 Historial</h3>
              <div className="flex gap-2 w-full sm:w-auto">
                <select className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs outline-none flex-grow" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
                  <option value="todas">Todas las categorías</option>
                  {Object.entries(CATEGORIAS).map(([id, cat]) => <option key={id} value={id}>{cat.nombre}</option>)}
                </select>
                <button onClick={exportarCSV} className="bg-slate-800 border border-slate-700 p-2 rounded-lg text-xs hover:bg-slate-700">📥 CSV</button>
              </div>
            </div>

            <div className="space-y-3">
              {transaccionesFiltradas.length === 0 ? (
                <p className="text-slate-500 italic text-center py-10 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700 text-sm">No hay movimientos registrados.</p>
              ) : (
                transaccionesFiltradas.map((t) => (
                  <div key={t.id} className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 flex justify-between items-center group hover:border-slate-500 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl bg-slate-900 w-12 h-12 flex items-center justify-center rounded-xl border border-slate-700">
                        {CATEGORIAS[t.categoria_id]?.icono || '❓'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-100 text-sm">{t.descripcion}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                          {CATEGORIAS[t.categoria_id]?.nombre} • {new Date(t.fecha).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`font-bold ${t.tipo === 'ingreso' ? 'text-green-400' : 'text-red-400'}`}>
                          {t.tipo === 'ingreso' ? '+' : '-'} Bs. {Number(t.monto).toLocaleString()}
                        </p>
                        <p className="text-[9px] text-slate-500">≈ ${(Number(t.monto) / tasaBCV).toFixed(2)}</p>
                      </div>
                      <button onClick={() => eliminarTransaccion(t.id)} className="text-slate-600 hover:text-red-500 p-2 transition-colors">🗑️</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* MODAL PERFIL */}
        {mostrarPerfil && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-3xl p-8 relative animate-in zoom-in duration-200">
              <button onClick={() => setMostrarPerfil(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto flex items-center justify-center text-3xl font-bold mb-4">{user.nombre.charAt(0)}</div>
                <h3 className="text-2xl font-bold">{user.nombre}</h3>
                <p className="text-slate-400 text-sm">{user.email}</p>
              </div>
              <button onClick={cerrarSesion} className="w-full mt-8 bg-red-500/10 text-red-500 font-bold py-3 rounded-xl hover:bg-red-500 hover:text-white transition-all">Cerrar Sesión</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // LOGIN VIEW
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-10 rounded-3xl shadow-2xl border border-slate-700 w-full max-w-md text-center">
        <h2 className="text-4xl font-black mb-2 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent italic tracking-tighter">GEST-APP</h2>
        <p className="text-slate-500 mb-8 text-sm">Controla tu dinero con inteligencia</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="Email" className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500" onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Contraseña" className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500" onChange={(e) => setPassword(e.target.value)} required />
          <button className="w-full bg-blue-600 py-4 rounded-xl font-bold text-white shadow-xl shadow-blue-900/40 mt-4 uppercase hover:bg-blue-500 transition-all">Entrar</button>
        </form>
        {mensaje && <p className="mt-4 text-red-400 text-sm font-medium">{mensaje}</p>}
      </div>
    </div>
  )
}

export default App