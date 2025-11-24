import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiCall from '../utils/apiCall';
import DataGrid from '../components/DataGrid';
import ConfirmModal from '../components/ConfirmModal';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [clubs, setClubs] = useState([]);
  const [fileImports, setFileImports] = useState([]);
  const [fileExports, setFileExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, club: null });
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('clubs');

  const [processingId, setProcessingId] = useState(null);
  const [processingExportId, setProcessingExportId] = useState(null);

  useEffect(() => {
    // Check for tab query param on mount
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'clubs') {
      fetchClubs();
    } else if (activeTab === 'imports') {
      fetchFileImports();
    } else if (activeTab === 'exports') {
      fetchFileExports();
    }
  }, [activeTab]);

  const fetchClubs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiCall('/clubs');
      if (!response.ok) throw new Error('Failed to fetch clubs');
      const data = await response.json();
      setClubs(data);
    } catch (err) {
      setError(err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFileImports = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiCall('/file-imports');
      if (!response.ok) throw new Error('Failed to fetch file imports');
      const data = await response.json();
      setFileImports(data);
    } catch (err) {
      setError(err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFileExports = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiCall('/file-exports');
      if (!response.ok) throw new Error('Failed to fetch file exports');
      const data = await response.json();
      setFileExports(data);
    } catch (err) {
      setError(err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/file-imports', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        const serverMsg = data?.error || data?.message || JSON.stringify(data) || res.statusText;
        console.error('Upload failed', res.status, serverMsg, data);
        setError(`Upload failed: ${res.status} ${serverMsg}`);
      } else {
        await fetchFileImports();
        e.target.value = '';
        setError('');
        console.log('Upload successful', data);
      }
    } catch (err) {
      console.error('Upload exception', err);
      setError(`Upload error: ${err.message}`);
    }
  };

  const handleProcessImport = async (importId) => {
    setProcessingId(importId);
    setError('');
    try {
      const res = await apiCall(`/file-imports/${importId}/process`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to process import');
      }

      const data = await res.json();
      console.log('Processing completed:', data);
      await fetchFileImports();
    } catch (err) {
      setError(err.message || 'Failed to process import');
    } finally {
      setProcessingId(null);
    }
  };

  const handleProcessExport = async (exportId) => {
    setProcessingExportId(exportId);
    setError('');
    try {
      const res = await apiCall(`/file-exports/${exportId}/process`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to process export');
      }

      const data = await res.json();
      console.log('Export processing completed:', data);
      await fetchFileExports();
    } catch (err) {
      setError(err.message || 'Failed to process export');
    } finally {
      setProcessingExportId(null);
    }
  };

  const handleEdit = (club) => {
    navigate(`/club/edit/${club._id}`);
  };

  const handleDeleteClick = (club) => {
    setDeleteModal({ isOpen: true, club });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.club) return;
    
    setDeleting(true);
    try {
      const response = await apiCall(`/clubs/${deleteModal.club._id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete club');
      
      setClubs(clubs.filter((c) => c._id !== deleteModal.club._id));
      setDeleteModal({ isOpen: false, club: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const clubColumns = [
    { 
      key: 'name', 
      label: 'Club Name',
      render: (value, row) => (
        <button 
          onClick={() => navigate(`/club-overview?id=${row._id}`)}
          className="link-button"
        >
          {value}
        </button>
      )
    },
    { key: 'location', label: 'Location' },
    { 
      key: 'status', 
      label: 'Status',
      render: (value) => <span className={`status-badge ${value.toLowerCase()}`}>{value}</span>
    },
    {
      key: 'memberAdmin',
      label: 'Member Admin',
      render: (value) => value ? `${value.firstName} ${value.lastName}` : 'Unassigned'
    },
  ];

  const importColumns = [
    { 
      key: 'originalName', 
      label: 'File Name'
    },
    { 
      key: 'exportSetId', 
      label: 'Export Set ID'
    },
    { 
      key: 'club', 
      label: 'Club',
      render: (value) => value ? value.name : 'System'
    },
    { 
      key: 'uploadedBy', 
      label: 'Uploaded By',
      render: (value) => value ? `${value.firstName} ${value.lastName}` : ''
    },
    { 
      key: 'createdAt', 
      label: 'Import Date',
      render: (value) => value ? new Date(value).toLocaleString() : ''
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value) => <span className={`status-badge ${value.toLowerCase()}`}>{value}</span>
    },
    {
      key: 'recordsProcessed',
      label: 'Records',
      render: (value, row) => `${row.recordsCreated || 0} created, ${row.recordsUpdated || 0} updated`
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, row) => {
        const canProcess = row.status === 'Uploaded' || row.status === 'Failed';
        return canProcess ? (
          <button 
            className="btn btn-primary"
            onClick={() => handleProcessImport(row._id)}
            disabled={processingId === row._id}
          >
            {processingId === row._id ? 'Processing...' : 'Process'}
          </button>
        ) : null;
      }
    },
  ];

  const exportColumns = [
    { 
      key: 'filename', 
      label: 'File Name',
      render: (value, row) => {
        if (row.status === 'Completed' && row.filePath) {
          const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
          const downloadUrl = `${apiUrl}${row.filePath}`;
          return (
            <a href={downloadUrl} download target="_blank" rel="noopener noreferrer">
              {value}
            </a>
          );
        }
        return value;
      }
    },
    { 
      key: 'fileImport', 
      label: 'Source Import',
      render: (value) => value ? value.originalName || value.filename : ''
    },
    { 
      key: 'createdBy', 
      label: 'Created By',
      render: (value) => value ? `${value.firstName} ${value.lastName}` : ''
    },
    { 
      key: 'createdAt', 
      label: 'Export Date',
      render: (value) => value ? new Date(value).toLocaleString() : ''
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value) => <span className={`status-badge ${value.toLowerCase()}`}>{value}</span>
    },
    {
      key: 'recordsExported',
      label: 'Records Exported',
      render: (value) => value || 0
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, row) => {
        const canProcess = row.status === 'Pending' || row.status === 'Failed';
        return canProcess ? (
          <button 
            className="btn btn-primary"
            onClick={() => handleProcessExport(row._id)}
            disabled={processingExportId === row._id}
          >
            {processingExportId === row._id ? 'Processing...' : 'Process'}
          </button>
        ) : null;
      }
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>{activeTab === 'clubs' ? 'Clubs' : activeTab === 'imports' ? 'File Imports' : 'File Exports'}</h1>
          <p>{activeTab === 'clubs' ? 'Manage all clubs and their members' : activeTab === 'imports' ? 'View and manage file imports' : 'View and manage file exports'}</p>
        </div>
        <div className="header-actions">
          {activeTab === 'clubs' && (
            <>
              <button className="btn btn-primary" onClick={() => navigate('/club/add')}>
                + Add Club
              </button>
              {user?.adminType === 'System Admin' && (
                <button className="btn btn-secondary" onClick={() => navigate('/admins')}>
                  Member Administration
                </button>
              )}
            </>
          )}
          {activeTab === 'imports' && (
            <>
              <button className="btn btn-primary" onClick={() => document.getElementById('import-file-input')?.click()}>
                + New Import
              </button>
              <input 
                id="import-file-input" 
                type="file" 
                accept=".xlsx,.xls" 
                style={{ display: 'none' }} 
                onChange={handleFileUpload}
              />
            </>
          )}
          {activeTab === 'exports' && (
            <button className="btn btn-primary" onClick={() => navigate('/exports/new')}>
              + New Export
            </button>
          )}
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'clubs' ? 'active' : ''}`}
          onClick={() => setActiveTab('clubs')}
        >
          Clubs
        </button>
        <button 
          className={`tab ${activeTab === 'imports' ? 'active' : ''}`}
          onClick={() => setActiveTab('imports')}
        >
          Imports
        </button>
        <button 
          className={`tab ${activeTab === 'exports' ? 'active' : ''}`}
          onClick={() => setActiveTab('exports')}
        >
          Exports
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {activeTab === 'clubs' && (
        <DataGrid
          columns={clubColumns}
          rows={clubs}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          pageSize={10}
        />
      )}

      {activeTab === 'imports' && (
        <DataGrid
          columns={importColumns}
          rows={fileImports}
          loading={loading}
          pageSize={10}
        />
      )}

      {activeTab === 'exports' && (
        <DataGrid
          columns={exportColumns}
          rows={fileExports}
          loading={loading}
          pageSize={10}
        />
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Remove Club"
        message={`Are you sure you want to remove the club "${deleteModal.club?.name}"? This will also remove all Members and cannot be undone.`}
        confirmText="Yes, Remove"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ isOpen: false, club: null })}
        isLoading={deleting}
      />
    </div>
  );
};

export default HomePage;
