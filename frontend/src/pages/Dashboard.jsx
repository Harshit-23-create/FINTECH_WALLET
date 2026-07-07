import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Bell, LogOut, Send, Plus, ArrowUpRight, ArrowDownLeft, AlertTriangle, Shield, X, QrCode, CreditCard, LayoutDashboard, Settings, Download, HandCoins, Lock, Unlock, Check, Trash2 } from 'lucide-react';

const CURRENCY_SYMBOLS = {
  USD: '$',
  INR: '₹',
  AED: 'د.إ',
  EUR: '€'
};

const CATEGORY_COLORS = {
  GENERAL: '#8c52ff',
  FOOD: '#10b981',
  ENTERTAINMENT: '#f59e0b',
  SUBSCRIPTIONS: '#ef4444',
  TRANSFERS: '#3b82f6'
};

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { addToast } = useContext(ToastContext);
  
  const [activeTab, setActiveTab] = useState('overview'); // overview, cards, settings

  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [transactions, setTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [cards, setCards] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Dropdowns state
  const [showTransfer, setShowTransfer] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  // Transfer Form state
  const [transferEmail, setTransferEmail] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferCategory, setTransferCategory] = useState('TRANSFERS');
  
  // Request Form state
  const [requestEmail, setRequestEmail] = useState('');
  const [requestAmount, setRequestAmount] = useState('');
  const [requestDescription, setRequestDescription] = useState('');

  // Top Up Form state
  const [topUpAmount, setTopUpAmount] = useState('');

  // 2FA state
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [otpVerify, setOtpVerify] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      
      const [walletRes, txRes, analyticsRes, directoryRes, cardsRes, requestsRes] = await Promise.all([
        fetch('http://localhost:5000/api/wallet', { headers }),
        fetch('http://localhost:5000/api/transactions', { headers }),
        fetch('http://localhost:5000/api/analytics/summary', { headers }),
        fetch('http://localhost:5000/api/auth/users', { headers }),
        fetch('http://localhost:5000/api/cards', { headers }),
        fetch('http://localhost:5000/api/requests', { headers })
      ]);

      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setBalance(walletData.balance);
        setCurrency(walletData.currency || 'USD');
      }

      if (txRes.ok) setTransactions(await txRes.json());
      if (cardsRes.ok) setCards(await cardsRes.json());
      if (requestsRes.ok) setPaymentRequests(await requestsRes.json());
      if (directoryRes.ok) setDirectoryUsers(await directoryRes.json());

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAlerts(analyticsData.alerts.filter(a => !a.isRead));
        setChartData(analyticsData.chartData);
        setCategoryData(analyticsData.categoryData || []);
      }

    } catch (err) {
      addToast('Failed to load dashboard data', 'danger');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/transactions/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ receiverEmail: transferEmail, amount: parseFloat(transferAmount), description: 'Transfer', category: transferCategory })
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Transfer successful!', 'success');
        setShowTransfer(false);
        setTransferEmail('');
        setTransferAmount('');
        fetchData();
      } else { addToast(data.message || 'Transfer failed', 'danger'); }
    } catch (err) { addToast('Network error', 'danger'); }
  };
  
  const handleRequestMoney = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ email: requestEmail, amount: parseFloat(requestAmount), description: requestDescription })
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Payment request sent!', 'success');
        setShowRequest(false);
        setRequestEmail('');
        setRequestAmount('');
        setRequestDescription('');
        fetchData();
      } else { addToast(data.message || 'Request failed', 'danger'); }
    } catch (err) { addToast('Network error', 'danger'); }
  };
  
  const handleProcessRequest = async (id, action) => {
    try {
      const res = await fetch(`http://localhost:5000/api/requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        addToast(action === 'PAID' ? 'Payment sent successfully!' : 'Request declined.', 'info');
        fetchData();
      } else { addToast(data.message || 'Action failed', 'danger'); }
    } catch (err) { addToast('Network error', 'danger'); }
  };

  const handleTopUp = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ amount: parseFloat(topUpAmount) })
      });
      if (res.ok) {
        addToast(`Successfully topped up ${CURRENCY_SYMBOLS[currency] || ''}${topUpAmount}`, 'success');
        setShowTopUp(false);
        setTopUpAmount('');
        fetchData();
      }
    } catch (err) {}
  };

  const handleChangeCurrency = async (newCurrency) => {
    try {
      const res = await fetch('http://localhost:5000/api/wallet/currency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ currency: newCurrency })
      });
      if (res.ok) {
        setCurrency(newCurrency);
        addToast(`Currency updated to ${newCurrency}`, 'success');
      }
    } catch (err) {}
  };

  const dismissAlert = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/analytics/alerts/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setAlerts(prev => prev.filter(a => a.id !== id));
      addToast('Alert dismissed', 'info');
    } catch (err) {}
  };

  const setup2FA = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/setup-2fa', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setQrCodeUrl(data.qrCode);
        setTwoFactorSecret(data.secret);
      }
    } catch (err) {}
  };

  const verify2FA = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ otp: otpVerify })
      });
      if (res.ok) {
        addToast('2FA enabled successfully!', 'success');
        user.isTwoFactorEnabled = true; 
        setQrCodeUrl('');
      } else { addToast('Invalid OTP', 'danger'); }
    } catch (err) {}
  };

  const issueVirtualCard = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/cards/issue', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        addToast('Virtual card issued successfully', 'success');
        fetchData();
      }
    } catch (err) {}
  };
  
  const toggleCardFreeze = async (cardId, currentStatus) => {
    const endpoint = currentStatus === 'FROZEN' ? 'unfreeze' : 'freeze';
    try {
      const res = await fetch(`http://localhost:5000/api/cards/${cardId}/${endpoint}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        addToast(`Card ${endpoint === 'freeze' ? 'frozen' : 'unfrozen'} successfully`, 'info');
        fetchData();
      }
    } catch (err) {}
  };

  const downloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,Date,Counterpart,Category,Type,Amount\n";
    transactions.forEach(tx => {
      const isReceived = tx.receiverId === user.id;
      const counterpart = isReceived ? tx.sender?.email || 'External' : tx.receiver?.email || 'External';
      const dateStr = new Date(tx.createdAt).toLocaleDateString();
      const amountStr = `${isReceived ? '+' : '-'}${tx.amount}`;
      csvContent += `${dateStr},${counterpart},${tx.category || 'GENERAL'},${isReceived ? 'Received' : 'Sent'},${amountStr}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p className="text-secondary">Loading your FinTech universe...</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const sym = CURRENCY_SYMBOLS[currency] || '$';
  
  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const counterpart = tx.receiverId === user.id ? (tx.sender?.email || 'External') : (tx.receiver?.email || 'External');
    return counterpart.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  // Filter incoming pending requests
  const pendingRequests = paymentRequests.filter(r => r.receiverId === user.id && r.status === 'PENDING');
  const mySentRequests = paymentRequests.filter(r => r.senderId === user.id);

  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      
      {/* Header */}
      <header className="nav-header" style={{ padding: '1rem 2rem' }}>
        <div className="container flex-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/favicon.svg" alt="Logo" style={{ width: 32, height: 32 }} />
            <h2 className="heading-3 text-gradient">FinTech Wallet</h2>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}>
              <Bell size={20} className="text-secondary" />
              {(alerts.length > 0 || pendingRequests.length > 0) && <span style={{ position: 'absolute', top: -2, right: -2, background: 'var(--danger)', width: 8, height: 8, borderRadius: '50%' }}></span>}
              
              {showAlertsDropdown && (
                <div className="glass-card animate-fade-in" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '1rem', width: '350px', padding: '1rem', zIndex: 60, cursor: 'default' }} onClick={e => e.stopPropagation()}>
                  <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Notifications</h4>
                  
                  {pendingRequests.map(req => (
                    <div key={req.id} style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', marginBottom: '0.5rem', borderLeft: '3px solid var(--accent-primary)' }}>
                      <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>{req.sender?.email}</strong> requested <strong>{sym}{req.amount}</strong></p>
                      {req.description && <p className="text-small text-secondary" style={{ marginBottom: '0.5rem' }}>"{req.description}"</p>}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleProcessRequest(req.id, 'PAID')}>Pay Now</button>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleProcessRequest(req.id, 'REJECTED')}>Decline</button>
                      </div>
                    </div>
                  ))}
                  
                  {alerts.map(alert => (
                    <div key={alert.id} className="bg-warning text-warning" style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}><AlertTriangle size={16} /> <strong>{alert.type}</strong></div>
                      <p>{alert.message}</p>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', marginTop: '0.5rem' }} onClick={() => dismissAlert(alert.id)}>Dismiss</button>
                    </div>
                  ))}
                  
                  {alerts.length === 0 && pendingRequests.length === 0 && <p className="text-small text-secondary">No new notifications.</p>}
                </div>
              )}
            </div>
            <span className="text-small" style={{ fontWeight: 500 }}>{user?.email}</span>
            <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.5rem', border: 'none' }} title="Log Out"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Sidebar */}
        <aside style={{ width: '250px', borderRight: '1px solid var(--border-color)', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} style={{ justifyContent: 'flex-start', border: 'none', background: activeTab === 'overview' ? 'var(--accent-primary)' : 'transparent' }} onClick={() => setActiveTab('overview')}>
            <LayoutDashboard size={18} /> Overview
          </button>
          <button className={`btn ${activeTab === 'cards' ? 'btn-primary' : 'btn-secondary'}`} style={{ justifyContent: 'flex-start', border: 'none', background: activeTab === 'cards' ? 'var(--accent-primary)' : 'transparent' }} onClick={() => setActiveTab('cards')}>
            <CreditCard size={18} /> Virtual Cards
          </button>
          <button className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`} style={{ justifyContent: 'flex-start', border: 'none', background: activeTab === 'settings' ? 'var(--accent-primary)' : 'transparent' }} onClick={() => setActiveTab('settings')}>
            <Settings size={18} /> Settings
          </button>
        </aside>

        {/* Tab Content */}
        <main className="container animate-fade-in" style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
          
          {activeTab === 'overview' && (
            <div className="grid-cols-2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(82, 113, 255, 0.1) 0%, rgba(140, 82, 255, 0.1) 100%)', borderColor: 'rgba(140, 82, 255, 0.2)' }}>
                  <p className="text-secondary">Total Balance ({currency})</p>
                  <h1 className="heading-1" style={{ margin: '0.5rem 0 1.5rem 0' }}>{sym}{balance.toLocaleString('en-US', {minimumFractionDigits: 2})}</h1>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={() => { setShowTransfer(!showTransfer); setShowRequest(false); setShowTopUp(false); setShowReceive(false); }}>
                      <Send size={16} /> Send 
                    </button>
                    <button className="btn btn-secondary" onClick={() => { setShowRequest(!showRequest); setShowTransfer(false); setShowTopUp(false); setShowReceive(false); }}>
                      <HandCoins size={16} /> Request
                    </button>
                    <button className="btn btn-secondary" onClick={() => { setShowTopUp(!showTopUp); setShowTransfer(false); setShowRequest(false); setShowReceive(false); }}>
                      <Plus size={16} /> Top Up
                    </button>
                    <button className="btn btn-secondary" onClick={() => { setShowReceive(!showReceive); setShowTransfer(false); setShowRequest(false); setShowTopUp(false); }}>
                      <QrCode size={16} /> Receive
                    </button>
                  </div>
                </div>

                {showReceive && (
                  <div className="glass-card animate-fade-in">
                    <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                      <h3 className="heading-3">Receive Funds</h3>
                      <button onClick={() => setShowReceive(false)} className="btn btn-secondary" style={{ padding: '0.25rem', border: 'none' }}><X size={16}/></button>
                    </div>
                    <div className="text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                      <p className="text-secondary">Show this QR code to others to receive funds</p>
                      <div style={{ background: 'white', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(user.email)}`} alt="Receive QR Code" style={{ width: '200px', height: '200px' }} />
                      </div>
                      <h4 style={{ fontWeight: 600 }}>{user.email}</h4>
                    </div>
                  </div>
                )}

                {showRequest && (
                  <div className="glass-card animate-fade-in">
                    <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                      <h3 className="heading-3">Request Money</h3>
                      <button onClick={() => setShowRequest(false)} className="btn btn-secondary" style={{ padding: '0.25rem', border: 'none' }}><X size={16}/></button>
                    </div>
                    <form onSubmit={handleRequestMoney}>
                      <div className="input-group">
                        <label className="input-label">Request From</label>
                        <select className="input-field" value={requestEmail} onChange={e => setRequestEmail(e.target.value)} required style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                          <option value="" disabled>Select user...</option>
                          {directoryUsers.map(u => <option key={u.id} value={u.email}>{u.email}</option>)}
                        </select>
                      </div>
                      <div className="input-group">
                        <label className="input-label">Amount ({sym})</label>
                        <input type="number" step="0.01" min="0.01" className="input-field" placeholder="0.00" value={requestAmount} onChange={e => setRequestAmount(e.target.value)} required />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Note (Optional)</label>
                        <input type="text" className="input-field" placeholder="For dinner..." value={requestDescription} onChange={e => setRequestDescription(e.target.value)} />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><HandCoins size={16} /> Send Request</button>
                    </form>
                  </div>
                )}

                {showTransfer && (
                  <div className="glass-card animate-fade-in">
                    <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                      <h3 className="heading-3">Transfer Funds</h3>
                      <button onClick={() => setShowTransfer(false)} className="btn btn-secondary" style={{ padding: '0.25rem', border: 'none' }}><X size={16}/></button>
                    </div>
                    <form onSubmit={handleTransfer}>
                      <div className="input-group">
                        <label className="input-label">Recipient</label>
                        <select className="input-field" value={transferEmail} onChange={e => setTransferEmail(e.target.value)} required style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                          <option value="" disabled>Select user...</option>
                          {directoryUsers.map(u => <option key={u.id} value={u.email}>{u.email}</option>)}
                        </select>
                      </div>
                      <div className="input-group">
                        <label className="input-label">Category</label>
                        <select className="input-field" value={transferCategory} onChange={e => setTransferCategory(e.target.value)} required style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                          {Object.keys(CATEGORY_COLORS).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                      <div className="input-group">
                        <label className="input-label">Amount ({sym})</label>
                        <input type="number" step="0.01" min="0.01" className="input-field" placeholder="0.00" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} required />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Confirm Transfer</button>
                    </form>
                  </div>
                )}

                {showTopUp && (
                  <div className="glass-card animate-fade-in">
                    <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                      <h3 className="heading-3">Top Up Wallet</h3>
                      <button onClick={() => setShowTopUp(false)} className="btn btn-secondary" style={{ padding: '0.25rem', border: 'none' }}><X size={16}/></button>
                    </div>
                    <form onSubmit={handleTopUp}>
                      <div className="input-group">
                        <label className="input-label">Amount ({sym})</label>
                        <input type="number" step="0.01" min="1" className="input-field" placeholder="100.00" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} required />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                        <Plus size={16} /> Add Funds
                      </button>
                    </form>
                  </div>
                )}

                <div className="glass-card" style={{ flex: 1, minHeight: '300px' }}>
                  <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                    <h3 className="heading-3">Recent Transactions</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" className="input-field" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ padding: '0.25rem 0.5rem', width: '150px' }} />
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={downloadCSV} title="Export CSV">
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {filteredTransactions.length === 0 ? (
                    <div className="flex-center" style={{ flexDirection: 'column', height: '200px', opacity: 0.5, gap: '1rem' }}>
                      <LogOut size={48} />
                      <p>No transactions found.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {filteredTransactions.map(tx => {
                        const isReceived = tx.receiverId === user.id;
                        const counterpart = isReceived ? tx.sender?.email || 'External' : tx.receiver?.email || 'External';
                        const dateStr = new Date(tx.createdAt).toLocaleString();
                        const txSym = CURRENCY_SYMBOLS[tx.currency] || '$';
                        const categoryColor = CATEGORY_COLORS[tx.category] || CATEGORY_COLORS.GENERAL;
                        
                        return (
                          <div key={tx.id} className="flex-between" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div className="flex-center" style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', background: isReceived ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: isReceived ? 'var(--success)' : 'var(--danger)' }}>
                                {isReceived ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                              </div>
                              <div>
                                <p style={{ fontWeight: 500 }}>{counterpart}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: `${categoryColor}33`, color: categoryColor, fontWeight: 600 }}>{tx.category || 'GENERAL'}</span>
                                  <span className="text-small text-secondary">{dateStr}</span>
                                </div>
                              </div>
                            </div>
                            <p style={{ fontWeight: 600 }} className={isReceived ? 'text-success' : ''}>
                              {isReceived ? '+' : '-'}{txSym}{tx.amount.toLocaleString(undefined, {minimumFractionDigits:2})}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Analytics Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
                  <h3 className="heading-3" style={{ marginBottom: '1.5rem' }}>Cash Flow</h3>
                  <div style={{ height: 250, width: '100%' }}>
                    {chartData.length === 0 ? (
                      <div className="flex-center" style={{ height: '100%', opacity: 0.5 }}><p>Not enough data.</p></div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${sym}${val}`} />
                          <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'var(--glass-border)', borderRadius: 'var(--radius-md)' }} itemStyle={{ color: 'var(--text-primary)' }} formatter={(value) => [`${sym}${value}`, 'Amount']} />
                          <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" />
                          <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
                
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
                  <h3 className="heading-3" style={{ marginBottom: '1.5rem' }}>Spending Breakdown</h3>
                  <div style={{ height: 250, width: '100%' }}>
                    {categoryData.length === 0 ? (
                      <div className="flex-center" style={{ height: '100%', opacity: 0.5 }}><p>No spending data.</p></div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || CATEGORY_COLORS.GENERAL} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value) => `${sym}${value.toLocaleString(undefined, {minimumFractionDigits: 2})}`} contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'var(--glass-border)', borderRadius: 'var(--radius-md)', color: '#fff' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
                    {categoryData.map(cat => (
                      <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: CATEGORY_COLORS[cat.name] || CATEGORY_COLORS.GENERAL }}></div>
                        {cat.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cards' && (
            <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div className="flex-between" style={{ marginBottom: '2rem' }}>
                <div>
                  <h2 className="heading-2">Virtual Cards</h2>
                  <p className="text-secondary">Manage your active digital debit cards.</p>
                </div>
                <button className="btn btn-primary" onClick={issueVirtualCard}>
                  <Plus size={16} /> Issue New Card
                </button>
              </div>

              {cards.length === 0 ? (
                <div className="glass-card flex-center" style={{ height: '300px', flexDirection: 'column', gap: '1rem', opacity: 0.7 }}>
                  <CreditCard size={64} />
                  <p>You have no active virtual cards.</p>
                  <button className="btn btn-primary" onClick={issueVirtualCard}>Issue your first card</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                  {cards.map(card => {
                    const isFrozen = card.status === 'FROZEN';
                    return (
                    <div key={card.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{
                        width: '350px',
                        height: '220px',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        background: isFrozen ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)' : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        position: 'relative',
                        overflow: 'hidden',
                        filter: isFrozen ? 'grayscale(100%) opacity(0.7)' : 'none',
                        transition: 'all 0.3s ease'
                      }}>
                        <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, background: 'var(--accent-primary)', opacity: 0.3, filter: 'blur(40px)', borderRadius: '50%' }}></div>
                        <div className="flex-between">
                          <img src="/favicon.svg" alt="Logo" style={{ width: 24, height: 24 }} />
                          <span style={{ fontWeight: 600, letterSpacing: '2px' }}>{isFrozen ? 'FROZEN' : 'Virtual Debit'}</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', letterSpacing: '4px', fontFamily: 'monospace', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                          {card.cardNumber.match(/.{1,4}/g).join(' ')}
                        </div>
                        <div className="flex-between">
                          <div>
                            <p className="text-small text-secondary" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Cardholder</p>
                            <p style={{ fontWeight: 500 }}>{user.email.split('@')[0].toUpperCase()}</p>
                          </div>
                          <div>
                            <p className="text-small text-secondary" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Expires</p>
                            <p style={{ fontWeight: 500 }}>{card.expiry}</p>
                          </div>
                          <div>
                            <p className="text-small text-secondary" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>CVV</p>
                            <p style={{ fontWeight: 500 }}>{card.cvv}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-between" style={{ padding: '0 1rem' }}>
                        <button className="btn btn-secondary" style={{ flex: 1, marginRight: '1rem', background: isFrozen ? 'var(--accent-primary)' : 'transparent', color: isFrozen ? 'white' : 'var(--text-primary)' }} onClick={() => toggleCardFreeze(card.id, card.status)}>
                          {isFrozen ? <><Unlock size={16}/> Unfreeze Card</> : <><Lock size={16}/> Freeze Card</>}
                        </button>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h2 className="heading-2" style={{ marginBottom: '0.5rem' }}>Preferences</h2>
                <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>Manage your account settings and regional preferences.</p>
                <div className="glass-card">
                  <h3 className="heading-3" style={{ marginBottom: '1rem' }}>Display Currency</h3>
                  <p className="text-secondary" style={{ marginBottom: '1rem' }}>Select the default currency for your wallet.</p>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {Object.keys(CURRENCY_SYMBOLS).map(c => (
                      <button key={c} className={`btn ${c === currency ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleChangeCurrency(c)}>
                        {c} ({CURRENCY_SYMBOLS[c]})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="heading-2" style={{ marginBottom: '0.5rem' }}>Security</h2>
                <div className="glass-card">
                  <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className={`flex-center ${user?.isTwoFactorEnabled ? 'bg-success text-success' : 'bg-warning text-warning'}`} style={{ width: 48, height: 48, borderRadius: '50%' }}>
                        <Shield size={24} />
                      </div>
                      <div>
                        <h3 className="heading-3">Two-Factor Authentication</h3>
                        <p className="text-secondary">{user?.isTwoFactorEnabled ? 'Your account is secured.' : 'Not enabled. Highly recommended.'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {user?.isTwoFactorEnabled ? (
                    <div className="text-success" style={{ fontWeight: 500 }}>✓ 2FA is active and protecting your account.</div>
                  ) : (
                    <div>
                      {!qrCodeUrl ? (
                        <button className="btn btn-primary" onClick={setup2FA}>Set up 2FA</button>
                      ) : (
                        <form onSubmit={verify2FA} className="animate-fade-in" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                          <div style={{ background: 'white', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                            <img src={qrCodeUrl} alt="2FA QR Code" style={{ width: '150px', height: '150px' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="input-group">
                              <label className="input-label">Enter Authenticator Code</label>
                              <input type="text" className="input-field" placeholder="123456" value={otpVerify} onChange={e => setOtpVerify(e.target.value)} required />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Verify & Enable</button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default Dashboard;
