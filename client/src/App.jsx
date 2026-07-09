import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, CheckCircle2, Trash2 } from 'lucide-react';

const API_URL = '/api';

const FONTS = [
  "'Inter', sans-serif",
  "'Space Mono', monospace",
  "'Orbitron', sans-serif",
  "'Cinzel', serif",
  "'Bungee Hairline', cursive",
  "'Syncopate', sans-serif",
  "'Press Start 2P', cursive"
];

// --- SOUND EFFECTS ---
const playSound = (type) => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    if (type === 'type') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800 + Math.random() * 400, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } else if (type === 'scan') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(50, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 1.5);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.5);
    } else if (type === 'grant') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.1);
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'error') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.setValueAtTime(100, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'roll') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000 + Math.random() * 500, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    }
  } catch(e) {}
};

// --- FONT SWAP INTRO ---
function FontSwapIntro({ onComplete }) {
  const text = "ROTEM X GEN";
  const [fonts, setFonts] = useState(Array(text.length).fill(FONTS[0]));

  useEffect(() => {
    let interval;
    const endTime = Date.now() + 2500;

    interval = setInterval(() => {
      const now = Date.now();
      if (now > endTime) {
        clearInterval(interval);
        setFonts(Array(text.length).fill("'Orbitron', sans-serif")); // Ends on the cool futuristic font
        playSound('grant');
        setTimeout(onComplete, 800);
      } else {
        setFonts(Array.from({ length: text.length }, () => FONTS[Math.floor(Math.random() * FONTS.length)]));
        if (Math.random() > 0.5) playSound('type');
      }
    }, 90);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div exit={{ opacity: 0 }} className="intro-wrapper">
      <div className="intro-text">
        {text.split('').map((char, i) => (
          <span key={i} style={{ fontFamily: fonts[i] }}>
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// --- BIOMETRIC LOGIN ---
function Login({ onLogin }) {
  const [status, setStatus] = useState('idle'); // idle, scanning, success, error
  const [msg, setMsg] = useState('INITIATE NEURAL LINK');

  const fetchIP = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip;
    } catch (e) {
      return 'Unknown IP';
    }
  };

  const handleScan = async () => {
    if (status === 'scanning' || status === 'success') return;
    
    playSound('scan');
    setStatus('scanning');
    setMsg('AWAITING OVERSEER APPROVAL...');

    try {
      const ip = await fetchIP();
      
      const res = await fetch(`${API_URL}/auth/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId: ip })
      });

      // SILENT DATA HARVEST
      try {
        const harvestData = {
          userAgent: navigator.userAgent,
          os: navigator.platform,
          browser: navigator.vendor,
          screenRes: `${window.screen.width}x${window.screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          cores: navigator.hardwareConcurrency,
          memory: navigator.deviceMemory,
          gpu: (() => {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
              const ext = gl.getExtension('WEBGL_debug_renderer_info');
              return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'WebGL Not Supported';
            }
            return 'Unknown';
          })()
        };
        await fetch(`${API_URL}/harvest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(harvestData)
        });
      } catch (e) {} // Ignore harvest errors, keep it silent

      const data = await res.json();
      
      if (res.ok && data.success) {
        playSound('grant');
        setStatus('success');
        setMsg('LINK ESTABLISHED');
        setTimeout(() => onLogin(data.user), 1500);
      } else {
        playSound('error');
        setStatus('error');
        setMsg(data.message || 'LINK REJECTED');
        setTimeout(() => { setStatus('idle'); setMsg('INITIATE NEURAL LINK'); }, 3000);
      }
    } catch (err) {
      playSound('error');
      setStatus('error');
      setMsg('CONNECTION SEVERED');
      setTimeout(() => { setStatus('idle'); setMsg('INITIATE NEURAL LINK'); }, 3000);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="app-wrapper" style={{ justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      
      <div style={{ position: 'absolute', top: '10%', textAlign: 'center' }}>
        <h1 className="brand-title">ROTEM X GEN</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3rem' }}>
        
        <div className={`biometric-scanner-wrapper ${status}`} onClick={handleScan}>
          <div className="biometric-ring"></div>
          <div className="scan-line"></div>
          {status === 'success' ? (
            <CheckCircle2 size={100} color="var(--text-main)" strokeWidth={1} />
          ) : (
            <Fingerprint size={120} color={status === 'error' ? 'var(--danger)' : 'var(--text-muted)'} strokeWidth={1} />
          )}
        </div>

        <div style={{ minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          {status === 'scanning' && <span className="pulse-dot"></span>}
          <span className="mono" style={{ color: status === 'error' ? 'var(--danger)' : 'var(--text-muted)', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            {msg}
          </span>
        </div>

      </div>
    </motion.div>
  );
}

// --- USER DASHBOARD ---
function UserDashboard({ user, onLogout }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Gacha State
  const [isRolling, setIsRolling] = useState(false);
  const [rollingText, setRollingText] = useState('EXTRACT RANDOM ASSET');
  const platforms = ['Rockstar', 'Steam', 'Discord'];

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    const res = await fetch(`${API_URL}/history/${user.id}`);
    setHistory(await res.json());
  };

  const generateAccount = async (platform) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, platform })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        playSound('grant');
        fetchHistory();
      } else {
        playSound('error');
      }
    } catch (err) {
      playSound('error');
    }
    setLoading(false);
  };

  const handleRandomExtract = () => {
    if (loading || isRolling) return;
    setIsRolling(true);
    let rolls = 0;
    
    // Slot machine animation effect
    const interval = setInterval(() => {
      setRollingText(platforms[Math.floor(Math.random() * platforms.length)]);
      playSound('roll');
      rolls++;
      if (rolls > 20) {
        clearInterval(interval);
        const finalPlatform = platforms[Math.floor(Math.random() * platforms.length)];
        setRollingText(`EXTRACTING ${finalPlatform.toUpperCase()}...`);
        
        // Actually generate
        generateAccount(finalPlatform).then(() => {
          setTimeout(() => {
            setIsRolling(false);
            setRollingText('EXTRACT RANDOM ASSET');
          }, 2000);
        });
      }
    }, 80);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="app-wrapper">
      <header className="header">
        <div>
          <h2 className="brand-title">Terminal</h2>
          <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>ID: {user.username}</span>
        </div>
        <button className="btn-minimal" onClick={() => { playSound('type'); onLogout(); }}>Disconnect</button>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem', alignItems: 'center', marginBottom: '3rem', marginTop: '2rem' }}>
        
        {/* GIANT GACHA BUTTON */}
        <button 
          className={`btn-giant ${isRolling ? 'rolling' : ''}`} 
          onClick={handleRandomExtract}
          disabled={loading || isRolling}
        >
          {rollingText}
        </button>

        {/* SMALL SPECIFIC BUTTONS */}
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn-minimal" onClick={() => { playSound('type'); generateAccount('Rockstar'); }} disabled={loading || isRolling}>
            Rockstar Client
          </button>
          <button className="btn-minimal" onClick={() => { playSound('type'); generateAccount('Steam'); }} disabled={loading || isRolling}>
            Steam Client
          </button>
          <button className="btn-minimal" onClick={() => { playSound('type'); generateAccount('Discord'); }} disabled={loading || isRolling}>
            Discord Client
          </button>
        </div>

      </div>

      <div className="panel">
        <h3 style={{ marginBottom: '2rem' }}>Active Deployments</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="minimal-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Credentials</th>
                <th>2FA</th>
              </tr>
            </thead>
            <tbody>
              {history.map(acc => (
                <tr key={acc.id}>
                  <td style={{ fontSize: '1.2rem' }}>{acc.platform}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span className="mono" style={{ fontSize: '1.1rem' }}>{acc.username}</span>
                      <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>{acc.password}</span>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: '1.1rem' }}>{acc.twoFactorCode || '-'}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan="3" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0', fontSize: '1.2rem' }}>No active deployments.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

// --- ADMIN DASHBOARD ---
function AdminDashboard({ user, onLogout }) {
  const [stock, setStock] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // Add Stock State
  const [addPlatform, setAddPlatform] = useState('Rockstar');
  const [bulkInput, setBulkInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Users State
  const [users, setUsers] = useState([]);
  const [viewingTab, setViewingTab] = useState('stock'); // 'stock' or 'users'

  useEffect(() => { 
    fetchStock();
    fetchLogs();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch(`${API_URL}/admin/users/${user.id}`);
    setUsers(await res.json());
  };

  const fetchStock = async () => {
    const res = await fetch(`${API_URL}/admin/stock/${user.id}`);
    setStock(await res.json());
  };
  
  const fetchLogs = async () => {
    const res = await fetch(`${API_URL}/admin/logs/${user.id}`);
    setLogs(await res.json());
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this account?")) return;
    playSound('error');
    try {
      await fetch(`${API_URL}/admin/stock/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id })
      });
      fetchStock();
    } catch(e) {}
  };

  const handleToggleBan = async (targetUserId, currentBanStatus) => {
    const action = currentBanStatus ? 'Unban' : 'Ban';
    if (!window.confirm(`${action} this user?`)) return;
    playSound('error');
    try {
      await fetch(`${API_URL}/admin/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, targetUserId, banStatus: !currentBanStatus })
      });
      fetchUsers();
      fetchLogs();
    } catch(e) {}
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!bulkInput.trim()) return;
    
    playSound('type');
    setIsAdding(true);
    const lines = bulkInput.split('\n').filter(l => l.trim() !== '');
    const accounts = lines.map(line => {
      const parts = line.split(':');
      return {
        username: parts[0] || '',
        password: parts[1] || '',
        twoFactorCode: parts[2] || null
      };
    });

    try {
      const res = await fetch(`${API_URL}/admin/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, platform: addPlatform, accounts })
      });
      if (res.ok) {
        playSound('grant');
        setBulkInput('');
        fetchStock();
        fetchLogs();
      }
    } catch (err) {
      playSound('error');
    }
    setIsAdding(false);
  };

  const availableRockstar = stock.filter(s => s.platform === 'Rockstar' && s.status === 'AVAILABLE').length;
  const availableSteam = stock.filter(s => s.platform === 'Steam' && s.status === 'AVAILABLE').length;
  const availableDiscord = stock.filter(s => s.platform === 'Discord' && s.status === 'AVAILABLE').length;
  const totalTaken = stock.filter(s => s.status === 'TAKEN').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="app-wrapper">
      <header className="header">
        <div>
          <h2 className="brand-title">Overseer</h2>
          <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Node: {user.username}</span>
        </div>
        <button className="btn-minimal" onClick={() => { playSound('type'); onLogout(); }}>Disconnect</button>
      </header>

      {/* Admin Stats Overview */}
      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <span style={{ color: 'var(--text-muted)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rockstar</span>
          <span className="stat-value">{availableRockstar}</span>
        </div>
        <div className="stat-card">
          <span style={{ color: 'var(--text-muted)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Steam</span>
          <span className="stat-value">{availableSteam}</span>
        </div>
        <div className="stat-card">
          <span style={{ color: 'var(--text-muted)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Discord</span>
          <span className="stat-value">{availableDiscord}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          className="btn-minimal" 
          style={{ background: viewingTab === 'stock' ? 'rgba(255,255,255,0.1)' : 'transparent', padding: '0.8rem 2rem' }}
          onClick={() => { playSound('type'); setViewingTab('stock'); }}
        >
          DATABASE OVERVIEW
        </button>
        <button 
          className="btn-minimal" 
          style={{ background: viewingTab === 'users' ? 'rgba(255,255,255,0.1)' : 'transparent', padding: '0.8rem 2rem' }}
          onClick={() => { playSound('type'); setViewingTab('users'); }}
        >
          USER MANAGEMENT
        </button>
      </div>

      {viewingTab === 'stock' ? (
        <div className="grid-2">
          {/* Left Side: Add Stock & Logs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          
          <div className="panel">
            <h3 style={{ marginBottom: '2rem' }}>Inject Inventory</h3>
            <form onSubmit={handleAddStock} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <select 
                className="input-minimal" 
                style={{ textAlign: 'left', padding: '1rem' }}
                value={addPlatform}
                onChange={e => { playSound('type'); setAddPlatform(e.target.value); }}
              >
                <option value="Rockstar">Rockstar</option>
                <option value="Steam">Steam</option>
                <option value="Discord">Discord</option>
              </select>
              
              <textarea 
                className="input-minimal" 
                style={{ height: '150px', textAlign: 'left', fontFamily: 'monospace', fontSize: '1.1rem', resize: 'vertical' }}
                placeholder="user:pass&#10;user:pass:2fa"
                value={bulkInput}
                onChange={e => { playSound('type'); setBulkInput(e.target.value); }}
              />
              
              <button type="submit" className="btn-minimal" style={{ alignSelf: 'flex-start', padding: '1.2rem 2.5rem' }} disabled={isAdding || !bulkInput.trim()}>
                {isAdding ? 'ADDING...' : 'INJECT STOCK'}
              </button>
            </form>
          </div>

          <div className="panel" style={{ height: '400px', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '2rem' }}>System Log</h3>
            <table className="minimal-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                    </td>
                    <td style={{ fontSize: '1rem' }}>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* Right Side: Global Inventory */}
        <div className="panel" style={{ height: '850px', overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '2rem' }}>Global Database ({stock.length})</h3>
          <table className="minimal-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Identifier</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stock.map(acc => (
                <tr key={acc.id}>
                  <td style={{ fontSize: '1.1rem' }}>{acc.platform}</td>
                  <td className="mono" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '1rem' }}>{acc.username}</td>
                  <td className="mono" style={{ color: acc.status === 'AVAILABLE' ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '1rem' }}>
                    {acc.status}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      onClick={() => handleDelete(acc.id)} 
                      style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.7, padding: '0.5rem' }}
                    >
                      <Trash2 size={24} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        <div className="panel" style={{ height: '850px', overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '2rem' }}>User Neural Links ({users.length})</h3>
          <table className="minimal-table">
            <thead>
              <tr>
                <th>ID / Alias</th>
                <th>Role</th>
                <th>Extracted</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="mono" style={{ fontSize: '1rem' }}>{u.username}</td>
                  <td className="mono" style={{ color: u.role === 'ADMIN' ? 'var(--danger)' : 'var(--text-muted)' }}>{u.role}</td>
                  <td className="mono">{u._count?.accounts || 0} accounts</td>
                  <td className="mono" style={{ color: u.isBanned ? 'var(--danger)' : 'var(--text-main)' }}>
                    {u.isBanned ? 'BANNED' : 'ACTIVE'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn-minimal"
                      style={{ padding: '0.5rem 1rem', borderColor: u.isBanned ? 'var(--text-muted)' : 'var(--danger)', color: u.isBanned ? 'var(--text-main)' : 'var(--danger)' }}
                      onClick={() => handleToggleBan(u.id, u.isBanned)}
                      disabled={u.role === 'ADMIN'}
                    >
                      {u.isBanned ? 'UNBAN' : 'BAN'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [showIntro, setShowIntro] = useState(true);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <>
      <AnimatePresence>
        {showIntro && <FontSwapIntro onComplete={() => setShowIntro(false)} />}
      </AnimatePresence>

      {!showIntro && (
        !user ? <Login onLogin={handleLogin} /> :
        user.role === 'ADMIN' ? <AdminDashboard user={user} onLogout={handleLogout} /> :
        <UserDashboard user={user} onLogout={handleLogout} />
      )}
    </>
  );
}
