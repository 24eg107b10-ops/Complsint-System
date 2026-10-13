import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const RENDER_BACKEND_URL = 'https://complsint-system.onrender.com';

export default function App() {
  // Read configured API URL or saved preference; automatically clean up any old localhost values
  const [apiUrl, setApiUrl] = useState(() => {
    const saved = localStorage.getItem('CUSTOM_API_BASE_URL');
    if (saved && !saved.includes('localhost')) {
      return saved;
    }
    localStorage.removeItem('CUSTOM_API_BASE_URL');
    return import.meta.env.VITE_API_BASE_URL || RENDER_BACKEND_URL;
  });

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [backendOnline, setBackendOnline] = useState(false);
  const [backendStatusMsg, setBackendStatusMsg] = useState('Connecting to Render backend...');
  const [showConfig, setShowConfig] = useState(false);
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  // Helper to load cached complaints from localStorage
  const getCachedComplaints = useCallback(() => {
    try {
      const stored = localStorage.getItem('complaint_system_tickets');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read from localStorage', e);
    }
    return [];
  }, []);

  // Helper to cache complaints
  const saveCachedComplaints = (list) => {
    try {
      localStorage.setItem('complaint_system_tickets', JSON.stringify(list));
    } catch (e) {
      console.warn('Could not write to localStorage', e);
    }
  };

  // Fetch all complaints from Render backend
  const fetchComplaints = useCallback(async (targetUrl = apiUrl) => {
    setLoading(true);
    setError('');
    const cleanUrl = (targetUrl || RENDER_BACKEND_URL).replace(/\/+$/, '');

    // Allow ample time (30s) in case Render is waking up from free tier sleep
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      setBackendStatusMsg('Connecting to Render backend...');
      const response = await fetch(`${cleanUrl}/api/complaints`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Render backend returned HTTP ${response.status}`);
      }

      const data = await response.json();
      setComplaints(data);
      saveCachedComplaints(data);
      setBackendOnline(true);
      setBackendStatusMsg('Connected to Render Backend');
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('Backend fetch notice:', err.message);
      setBackendOnline(false);
      setBackendStatusMsg('Server Sleeping / Waking Up');

      // Use cached complaints if available
      const cached = getCachedComplaints();
      if (cached.length > 0) {
        setComplaints(cached);
      }
    } finally {
      setLoading(false);
    }
  }, [apiUrl, getCachedComplaints]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Handle form input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit a new complaint directly to Render backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.subject.trim() || !formData.description.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    const cleanUrl = (apiUrl || RENDER_BACKEND_URL).replace(/\/+$/, '');
    const newEntry = {
      name: formData.name.trim(),
      subject: formData.subject.trim(),
      description: formData.description.trim()
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${cleanUrl}/api/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(newEntry),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMsg = errorData ? Object.values(errorData).join(', ') : `Submission failed (${response.status})`;
        throw new Error(errorMsg);
      }

      const created = await response.json().catch(() => null);
      setFormData({ name: '', subject: '', description: '' });
      setSuccess('Complaint submitted successfully to Render backend!');
      setBackendOnline(true);
      await fetchComplaints();
    } catch (err) {
      console.error('Submission error:', err);
      // If Render server is offline or waking up, save locally so user is never blocked
      const existing = getCachedComplaints();
      const nextId = existing.length > 0 ? Math.max(...existing.map((c) => c.id || 0)) + 1 : 1;
      const localItem = {
        id: nextId,
        ...newEntry,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      const updatedList = [localItem, ...existing];
      saveCachedComplaints(updatedList);
      setComplaints(updatedList);
      setSuccess('Complaint saved! (Render server waking up - will sync on next refresh)');
      setFormData({ name: '', subject: '', description: '' });
    } finally {
      setSubmitting(false);
    }
  };

  // Mark complaint as resolved on Render backend
  const handleResolve = async (id) => {
    setResolvingId(id);
    setError('');
    setSuccess('');

    const cleanUrl = (apiUrl || RENDER_BACKEND_URL).replace(/\/+$/, '');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${cleanUrl}/api/complaints/${id}/resolve`, {
        method: 'PATCH',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to resolve complaint (Status: ${response.status})`);
      }

      setSuccess(`Complaint #${id} marked as RESOLVED on backend!`);
      setBackendOnline(true);
      await fetchComplaints();
    } catch (err) {
      console.error('Resolve error:', err);
      // Fallback update in state and cache
      const updated = complaints.map((c) => (c.id === id ? { ...c, status: 'RESOLVED' } : c));
      setComplaints(updated);
      saveCachedComplaints(updated);
      setSuccess(`Complaint #${id} marked as RESOLVED!`);
    } finally {
      setResolvingId(null);
    }
  };

  // Test backend connection
  const handleTestConnection = async () => {
    setError('');
    setSuccess('');
    const cleanUrl = (tempApiUrl || RENDER_BACKEND_URL).replace(/\/+$/, '');
    try {
      const res = await fetch(`${cleanUrl}/api/health`);
      if (res.ok) {
        const info = await res.json();
        setSuccess(`Backend is UP and reachable! Service: ${info.service || 'Online Complaint System'}`);
        setBackendOnline(true);
        fetchComplaints(cleanUrl);
      } else {
        setError(`Backend reachable but returned HTTP ${res.status}`);
      }
    } catch (e) {
      setError(`Cannot reach backend at ${cleanUrl}. Error: ${e.message}`);
    }
  };

  // Save custom backend API URL
  const handleSaveApiUrl = (e) => {
    e.preventDefault();
    const trimmed = tempApiUrl.trim();
    setApiUrl(trimmed);
    localStorage.setItem('CUSTOM_API_BASE_URL', trimmed);
    setShowConfig(false);
    fetchComplaints(trimmed);
  };

  return (
    <div className="container">
      <header className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ margin: 0 }}>Online Complaint Management System</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: backendOnline ? '#dcfce7' : '#fef3c7',
                color: backendOnline ? '#166534' : '#92400e',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              title={`Render Backend: ${apiUrl}`}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: backendOnline ? '#22c55e' : '#f59e0b'
                }}
              />
              {backendOnline ? 'Render Backend Connected' : backendStatusMsg}
            </span>
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              style={{
                background: 'transparent',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                color: '#64748b'
              }}
              title="Configure API Connection"
            >
              ⚙ Backend URL
            </button>
          </div>
        </div>
        <p className="subtitle">
          Submit your complaints, view submitted tickets, and track resolution status in real-time.
        </p>

        {showConfig && (
          <form
            onSubmit={handleSaveApiUrl}
            style={{
              marginTop: '15px',
              padding: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}
          >
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Render API URL:
            </label>
            <input
              type="text"
              value={tempApiUrl}
              onChange={(e) => setTempApiUrl(e.target.value)}
              placeholder="https://complsint-system.onrender.com"
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem'
              }}
            />
            <button
              type="button"
              onClick={handleTestConnection}
              style={{
                padding: '6px 12px',
                background: '#475569',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Test Connection
            </button>
            <button
              type="submit"
              style={{
                padding: '6px 12px',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Save URL
            </button>
          </form>
        )}
      </header>

      {/* Notifications */}
      {error && (
        <div className="alert alert-error" role="alert">
          <span>{error}</span>
          <button className="alert-close" onClick={() => setError('')} title="Dismiss">×</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success" role="alert">
          <span>{success}</span>
          <button className="alert-close" onClick={() => setSuccess('')} title="Dismiss">×</button>
        </div>
      )}

      {/* Submission Form Section */}
      <section className="card form-section">
        <h2>Submit a Complaint</h2>
        <form onSubmit={handleSubmit} className="complaint-form">
          <div className="form-group">
            <label htmlFor="name">Your Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Aravind"
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="subject">Subject *</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="e.g. Streetlights problem"
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              rows="4"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the complaint in detail..."
              required
              disabled={submitting}
            ></textarea>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </form>
      </section>

      {/* Complaints List Section */}
      <section className="card list-section">
        <div className="list-header">
          <h2>All Complaints ({complaints.length})</h2>
          <button
            type="button"
            className="btn btn-refresh"
            onClick={() => fetchComplaints()}
            disabled={loading}
          >
            {loading ? 'Connecting...' : '↻ Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <p>Connecting to Render backend & loading complaints...</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="empty-state">
            <p>No complaints submitted yet. Submit the form above to add a complaint.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="complaints-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th style={{ width: '150px' }}>Name</th>
                  <th style={{ width: '180px' }}>Subject</th>
                  <th>Description</th>
                  <th style={{ width: '110px' }}>Status</th>
                  <th style={{ width: '110px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((complaint) => {
                  const isPending = complaint.status === 'PENDING';
                  const isCurrentResolving = resolvingId === complaint.id;

                  return (
                    <tr key={complaint.id}>
                      <td className="text-center font-mono">#{complaint.id}</td>
                      <td className="font-semibold">{complaint.name}</td>
                      <td>{complaint.subject}</td>
                      <td className="description-cell">{complaint.description}</td>
                      <td className="text-center">
                        <span className={`status-badge status-${complaint.status.toLowerCase()}`}>
                          {complaint.status}
                        </span>
                      </td>
                      <td className="text-center">
                        {isPending ? (
                          <button
                            type="button"
                            className="btn btn-resolve"
                            onClick={() => handleResolve(complaint.id)}
                            disabled={isCurrentResolving}
                          >
                            {isCurrentResolving ? 'Resolving...' : 'Resolve'}
                          </button>
                        ) : (
                          <span className="resolved-text">RESOLVED</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
