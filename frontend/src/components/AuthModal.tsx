import { useState } from 'react';
import { api, type UserResponse } from '../apiClient';
import { LogIn, UserPlus, X, Loader } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onAuth: (user: UserResponse) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onAuth }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = mode === 'login'
        ? await api.login(email, password)
        : await api.register(email, password, name);
      onAuth(result.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <input className="form-input" type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required style={{ padding: '8px 10px', fontSize: '0.8rem' }} />
          )}
          <input className="form-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '8px 10px', fontSize: '0.8rem' }} />
          <input className="form-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} style={{ padding: '8px 10px', fontSize: '0.8rem' }} />

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="glow-btn auth-submit" disabled={loading}>
            {loading ? <Loader size={14} className="spin" /> : mode === 'login' ? <LogIn size={14} /> : <UserPlus size={14} />}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <span>No account? <button onClick={() => { setMode('register'); setError(''); }}>Register</button></span>
          ) : (
            <span>Already registered? <button onClick={() => { setMode('login'); setError(''); }}>Sign in</button></span>
          )}
        </div>
      </div>
    </div>
  );
};
