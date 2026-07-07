import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Wallet, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [requireOtp, setRequireOtp] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, otp })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (isRegistering) {
          // If registered, switch to login
          setIsRegistering(false);
          setPassword('');
          setError('Registration successful! Please login.');
        } else {
          login(data.token, data.user);
          navigate('/');
        }
      } else if (response.status === 403 && data.require2fa) {
        setRequireOtp(true);
      } else {
        setError(data.message || (isRegistering ? 'Registration failed' : 'Login failed'));
      }
    } catch (err) {
      setError('Server connection error. Ensure backend is running.');
    }
  };

  return (
    <div className="container flex-center" style={{ minHeight: '100vh' }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="flex-center" style={{ marginBottom: '2rem', gap: '0.5rem' }}>
          <div style={{ background: 'var(--accent-gradient)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
            <Wallet color="white" size={24} />
          </div>
          <h1 className="heading-2">{isRegistering ? 'Create Account' : 'FinTech Wallet'}</h1>
        </div>
        
        {error && <div className={`text-${error.includes('successful') ? 'success' : 'danger'} bg-${error.includes('successful') ? 'success' : 'danger'}`} style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input 
              type="email" 
              className="input-field" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required 
            />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input 
              type="password" 
              className="input-field" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
            />
          </div>
          
          {requireOtp && !isRegistering && (
            <div className="input-group animate-fade-in">
              <label className="input-label flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
                <ShieldCheck size={16} className="text-warning" />
                Authenticator Code (2FA)
              </label>
              <input 
                type="text" 
                className="input-field" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                required={requireOtp}
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            {isRegistering ? 'Register' : (requireOtp ? 'Verify & Login' : 'Sign In')}
          </button>
        </form>
        
        <p className="text-small" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          {isRegistering ? "Already have an account? " : "Don't have an account? "}
          <button 
            type="button"
            style={{ color: 'var(--accent-primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: 'inherit' }}
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setRequireOtp(false);
            }}
          >
            {isRegistering ? 'Login here' : 'Register here'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
