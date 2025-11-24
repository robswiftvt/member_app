import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiCall from '../utils/apiCall';
import './MemberForm.css';

const NewExportPage = () => {
  const navigate = useNavigate();
  const [fileImports, setFileImports] = useState([]);
  const [selectedImportId, setSelectedImportId] = useState('');
  const [filename, setFilename] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFileImports();
  }, []);

  const fetchFileImports = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiCall('/file-imports');
      if (!response.ok) throw new Error('Failed to fetch file imports');
      const data = await response.json();
      
      // Sort by createdAt descending (latest first)
      const sorted = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setFileImports(sorted);
      
      // Default to the latest import
      if (sorted.length > 0) {
        setSelectedImportId(sorted[0]._id);
      }
    } catch (err) {
      setError(err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedImportId) {
      setError('Please select a file import');
      return;
    }
    
    if (!filename.trim()) {
      setError('Please enter a file name');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await apiCall('/file-exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileImportId: selectedImportId,
          filename: filename.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create export');
      }

      navigate('/home?tab=exports');
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/home?tab=exports');
  };

  if (loading) {
    return (
      <div className="form-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>New Export</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="fileImport">
            File Import <span className="required">*</span>
          </label>
          <select
            id="fileImport"
            value={selectedImportId}
            onChange={(e) => setSelectedImportId(e.target.value)}
            disabled={submitting}
            required
          >
            {fileImports.length === 0 && (
              <option value="">No imports available</option>
            )}
            {fileImports.map((imp) => (
              <option key={imp._id} value={imp._id}>
                {imp.originalName || imp.filename} - {new Date(imp.createdAt).toLocaleString()}
                {imp.exportSetId ? ` (${imp.exportSetId})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="filename">
            File Name <span className="required">*</span>
          </label>
          <input
            id="filename"
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Enter export file name"
            disabled={submitting}
            required
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-cancel"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !selectedImportId || !filename.trim()}
          >
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewExportPage;
