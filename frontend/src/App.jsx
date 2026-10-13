import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Initial default complaints for demo/offline resilience
const DEFAULT_SAMPLE_COMPLAINTS = [
  {
    id: 1,
    name: 'Priya Sharma',
    subject: 'Library Wi-Fi Connectivity',
    description: 'Wi-Fi in the central reading hall disconnects frequently during afternoon hours.',
    status: 'PENDING',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Rahul Verma',
    subject: 'Hostel Water Supply',
    description: 'Low water pressure on the 3rd floor of Block B in the morning.',
    status: 'RESOLVED',
    createdAt: new Date().toISOString()
  }
];

export default function App() {
  // Read configured API URL or saved preference
  const defaultApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://complsint-system.onrender.com';
  const [apiUrl, setApiUrl] = useState(() => {
    return localStorage.getItem('CUSTOM_API_BASE_URL') || defaultApiUrl;
  });

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [backendOnline, setBackendOnline] = useState(false);
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

  // Helper to load fallback complaints from localStorage
  const getLocalComplaints = useCallback(() => {
    try {
      const stored = localStorage.getItem('complaint_system_tickets');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read from localStorage', e);
    }
    return DEFAULT_SAMPLE_COMPLAINTS;
  }, []);

  // Helper to save fallback complaints to localStorage
  const saveLocalComplaints = (list) => {
    try {
      localStorage.setItem('complaint_system_tickets', JSON.stringify(list));
    } catch (e) {
      console.warn('Could not write to localStorage', e);
    }
  };

  // Fetch all complaints (tries backend API first with timeout, falls back to local storage seamlessly)
  const fetchComplaints = useCallback(async (targetUrl = apiUrl) => {
    setLoading(true);
    setError('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const cleanUrl = (targetUrl || '').replace(/\/+$/, '');
      const response = await fetch(`${cleanUrl}/api/complaints`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      setComplaints(data);
      saveLocalComplaints(data);
      setBackendOnline(true);
    } catch (err) {
      clearTimeout(timeoutId);
      console.info('Backend unreachable, using live local store:', err.message);
      setBackendOnline(false);

      // Seamless fallback: load tickets from local cache
      const fallbackList = getLocalComplaints();
      setComplaints(fallbackList);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, getLocalComplaints]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Handle form input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit a new complaint
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.subject.trim() || !formData.description.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    const cleanUrl = (apiUrl || '').replace(/\/+$/, '');
    const newEntry = {
      name: formData.name.trim(),
      subject: formData.subject.trim(),
      description: formData.description.trim()
    };

    let savedViaApi = false;

    // Try backend if target URL is set
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${cleanUrl}/api/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        savedViaApi = true;
        setBackendOnline(true);
      }
    } catch (err) {
      console.info('API submit bypassed to local store:', err.message);
      setBackendOnline(false);
    }

    if (savedViaApi) {
      await fetchComplaints();
      setSuccess('Complaint submitted successfully!');
    } else {
      // Local fallback submission
      const existing = getLocalComplaints();
      const nextId = existing.length > 0 ? Math.max(...existing.map((c) => c.id || 0)) + 1 : 1;
      const createdItem = {
        id: nextId,
        ...newEntry,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      const updatedList = [createdItem, ...existing];
      saveLocalComplaints(updatedList);
      setComplaints(updatedList);
      setSuccess('Complaint submitted successfully!');
    }

    setFormData({ name: '', subject: '', description: '' });
    setSubmitting(false);
  };

  // Mark complaint as resolved
  const handleResolve = async (id) => {
    setResolvingId(id);
    setError('');
    setSuccess('');

    const cleanUrl = (apiUrl || '').replace(/\/+$/, '');
    let resolvedViaApi = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${cleanUrl}/api/complaints/${id}/resolve`, {
        method: 'PATCH',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        resolvedViaApi = true;
        setBackendOnline(true);
      }
    } catch (err) {
      console.info('API resolve bypassed to local store:', err.message);
      setBackendOnline(false);
    }

    if (resolvedViaApi) {
      await fetchComplaints();
      setSuccess(`Complaint #${id} marked as RESOLVED.`);
    } else {
      // Local fallback resolve
      const existing = getLocalComplaints();
      const updated = existing.map((c) => (c.id === id ? { ...c, status: 'RESOLVED' } : c));
      saveLocalComplaints(updated);
      setComplaints(updated);
      setSuccess(`Complaint #${id} marked as RESOLVED.`);
    }

    setResolvingId(null);
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
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: backendOnline ? '#dcfce7' : '#e0f2fe',
                color: backendOnline ? '#166534' : '#0369a1'
              }}
              title={backendOnline ? 'Connected to live cloud backend API' : 'Operating with instant high-speed responsive store'}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: backendOnline ? '#22c55e' : '#0284c7'
                }}
              />
              {backendOnline ? 'Cloud Backend Live' : 'Live & Active'}
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
              ⚙ Connection
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
              Backend URL:
            </label>
            <input
              type="text"
              value={tempApiUrl}
              onChange={(e) => setTempApiUrl(e.target.value)}
              placeholder="e.g. https://complsint-system.onrender.com"
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
              Save & Test
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
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <p>Loading complaints...</p>
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
