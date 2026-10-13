import React, { useState, useEffect } from 'react';
import './App.css';

// Read backend API URL from environment variable with fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export default function App() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  // Fetch all complaints from backend
  const fetchComplaints = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/complaints`);
      if (!response.ok) {
        throw new Error(`Failed to load complaints (Status: ${response.status})`);
      }
      const data = await response.json();
      setComplaints(data);
    } catch (err) {
      console.error('Fetch complaints error:', err);
      setError('Unable to connect to the backend server. Please verify the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

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

    try {
      const response = await fetch(`${API_BASE_URL}/api/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          subject: formData.subject.trim(),
          description: formData.description.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMsg = errorData ? Object.values(errorData).join(', ') : `Submission failed (${response.status})`;
        throw new Error(errorMsg);
      }

      setFormData({ name: '', subject: '', description: '' });
      setSuccess('Complaint submitted successfully!');
      await fetchComplaints();
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Mark complaint as resolved
  const handleResolve = async (id) => {
    setResolvingId(id);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/complaints/${id}/resolve`, {
        method: 'PATCH'
      });

      if (!response.ok) {
        throw new Error(`Failed to resolve complaint (Status: ${response.status})`);
      }

      setSuccess(`Complaint #${id} marked as RESOLVED.`);
      await fetchComplaints();
    } catch (err) {
      console.error('Resolve error:', err);
      setError(err.message || 'Failed to update complaint status.');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Online Complaint Management System</h1>
        <p className="subtitle">
          Submit your complaints, view submitted tickets, and track resolution status in real-time.
        </p>
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
              placeholder="e.g. Arun Kumar"
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
              placeholder="e.g. Classroom Projector Issue"
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
          <h2>All Complaints</h2>
          <button
            type="button"
            className="btn btn-refresh"
            onClick={fetchComplaints}
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
