import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiCall from '../utils/apiCall';
import DataGrid from '../components/DataGrid';
import './FileImportPage.css';

const FileImportPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [fileImport, setFileImport] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchFileImportDetails();
    }
  }, [id]);

  const fetchFileImportDetails = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch file import
      const importRes = await apiCall(`/file-imports/${id}`);
      if (!importRes.ok) throw new Error('Failed to fetch file import');
      const importData = await importRes.json();
      setFileImport(importData);

      // Fetch import rows
      const rowsRes = await apiCall(`/file-import-rows?fileImportId=${id}`);
      if (!rowsRes.ok) throw new Error('Failed to fetch import rows');
      const rowsData = await rowsRes.json();
      setImportRows(rowsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
      key: 'rowId', 
      label: 'Row ID',
      render: (v) => v || '-'
    },
    { 
      key: 'club', 
      label: 'Club',
      render: (v) => v ? v.name : '-'
    },
    { 
      key: 'member', 
      label: 'Member',
      render: (v) => v ? `${v.firstName} ${v.lastName}` : '-'
    },
    { 
      key: 'rowImportResult', 
      label: 'Result',
      render: (value) => {
        const statusClass = value === 'Created' ? 'created' : value === 'Updated' ? 'updated' : value === 'Unchanged' ? 'unchanged' : 'skipped';
        return <span className={`status-badge ${statusClass}`}>{value}</span>;
      }
    },
    { 
      key: 'exception', 
      label: 'Exception',
      render: (v) => v || '-'
    },
  ];

  if (loading) {
    return <div className="page-container"><div className="loading">Loading...</div></div>;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-banner">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/home?tab=imports')}>
          Back to Imports
        </button>
      </div>
    );
  }

  if (!fileImport) {
    return (
      <div className="page-container">
        <div className="error-banner">File import not found</div>
        <button className="btn btn-secondary" onClick={() => navigate('/home?tab=imports')}>
          Back to Imports
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>File Import Details</h1>
          <p>View import summary and individual row results</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/home?tab=imports')}>
          Back to Imports
        </button>
      </div>

      <div className="import-summary">
        <h2>Import Summary</h2>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">File Name:</span>
            <span className="summary-value">{fileImport.originalName}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Export Set ID:</span>
            <span className="summary-value">{fileImport.exportSetId || '-'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Club:</span>
            <span className="summary-value">{fileImport.club ? fileImport.club.name : 'System'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Uploaded By:</span>
            <span className="summary-value">
              {fileImport.uploadedBy ? `${fileImport.uploadedBy.firstName} ${fileImport.uploadedBy.lastName}` : '-'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Upload Date:</span>
            <span className="summary-value">{new Date(fileImport.createdAt).toLocaleString()}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Status:</span>
            <span className={`status-badge ${fileImport.status.toLowerCase()}`}>{fileImport.status}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Records Processed:</span>
            <span className="summary-value">{fileImport.recordsProcessed || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Records Created:</span>
            <span className="summary-value">{fileImport.recordsCreated || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Records Updated:</span>
            <span className="summary-value">{fileImport.recordsUpdated || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Records Skipped:</span>
            <span className="summary-value">{fileImport.recordsSkipped || 0}</span>
          </div>
        </div>
      </div>

      <div className="import-rows-section">
        <h2>Import Rows ({importRows.length})</h2>
        <DataGrid
          columns={columns}
          rows={importRows}
          loading={false}
          pageSize={25}
        />
      </div>
    </div>
  );
};

export default FileImportPage;
