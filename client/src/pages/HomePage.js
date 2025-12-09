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
  const [members, setMembers] = useState([]);
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
    } else if (activeTab === 'members') {
      fetchMembers();
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

  const fetchMembers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiCall('/members');
      if (!response.ok) throw new Error('Failed to fetch members');
      const data = await response.json();
      setMembers(data);
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

  const handleMemberEdit = (member) => {
    navigate(`/member/edit/${member._id}`);
  };

  const handleMemberDelete = (member) => {
    setDeleteModal({ isOpen: true, club: member, isMember: true });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.club) return;
    
    setDeleting(true);
    try {
      const endpoint = deleteModal.isMember ? `/members/${deleteModal.club._id}` : `/clubs/${deleteModal.club._id}`;
      const response = await apiCall(endpoint, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error(deleteModal.isMember ? 'Failed to delete member' : 'Failed to delete club');
      
      if (deleteModal.isMember) {
        setMembers(members.filter((m) => m._id !== deleteModal.club._id));
      } else {
        setClubs(clubs.filter((c) => c._id !== deleteModal.club._id));
      }
      setDeleteModal({ isOpen: false, club: null, isMember: false });
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

  const memberColumns = [
    { key: 'firstName', label: 'First Name', render: (v) => v || '-', visible: true },
    { key: 'lastName', label: 'Last Name', render: (v) => v || '-', visible: true },
    { key: 'email', label: 'Email', render: (v) => v || '-', visible: true },
    { key: 'club', label: 'Club', render: (v) => (v && v.name ? v.name : '-'), visible: true },
    { key: 'membershipType', label: 'Member Type', render: (v) => v || '-', visible: true },
    { key: 'adminType', label: 'Admin Type', render: (v) => v || '-', visible: true },
    { key: 'nfrwContactId', label: 'NFRW ID', render: (v) => v || '-', visible: false },
    { key: 'charterNumber', label: 'Charter Number', render: (v, row) => (row.club && row.club.charterNumber ? row.club.charterNumber : '-'), visible: false },
    { key: 'streetAddress', label: 'Address', render: (v) => v || '-', visible: false },
    { key: 'address2', label: 'Address 2', render: (v) => v || '-', visible: false },
    { key: 'city', label: 'City', render: (v) => v || '-', visible: false },
    { key: 'state', label: 'State', render: (v) => v || '-', visible: false },
    { key: 'zip', label: 'Zip', render: (v) => v || '-', visible: false },
    { key: 'phone', label: 'Phone Number', render: (v) => v || '-', visible: false },
    { 
      key: 'membershipExpiration', 
      label: 'Member Expiration', 
      render: (v) => {
        if (!v) return '-';
        const date = new Date(v);
        return date.toLocaleDateString();
      },
      visible: false
    },
    { key: 'deceased', label: 'Deceased', render: (v) => v ? 'Yes' : 'No', visible: false },
  ];

  const importColumns = [
    { 
      key: 'originalName', 
      label: 'File Name',
      render: (value, row) => {
        if (row.filePath) {
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
        return (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => navigate(`/file-import/${row._id}`)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              View
            </button>
            {canProcess && (
              <button 
                className="btn btn-primary"
                onClick={() => handleProcessImport(row._id)}
                disabled={processingId === row._id}
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                {processingId === row._id ? 'Processing...' : 'Process'}
              </button>
            )}
          </div>
        );
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
          <h1>{activeTab === 'clubs' ? 'Clubs' : activeTab === 'members' ? 'Member Administration' : activeTab === 'imports' ? 'File Imports' : 'File Exports'}</h1>
          <p>{activeTab === 'clubs' ? 'Manage all clubs and their members' : activeTab === 'members' ? 'Manage system and club administrators' : activeTab === 'imports' ? 'View and manage file imports' : 'View and manage file exports'}</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="tabs">
        <div className="tab-list">
          <button 
            className={`tab ${activeTab === 'clubs' ? 'active' : ''}`}
            onClick={() => setActiveTab('clubs')}
          >
            Clubs
          </button>
          {user?.adminType === 'System Admin' && (
            <button 
              className={`tab ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              Members
            </button>
          )}
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
      </div>

      {activeTab === 'clubs' && (
        <div className="tab-section">
          <div className="section-header">
            <h2>Clubs ({clubs.length})</h2>
            <button className="btn btn-primary" onClick={() => navigate('/club/add')}>
              + Add Club
            </button>
          </div>
          <DataGrid
            columns={clubColumns}
            rows={clubs}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            pageSize={10}
          />
        </div>
      )}

      {activeTab === 'members' && (
        <div className="tab-section">
          <div className="section-header">
            <h2>Members ({members.length})</h2>
            <button className="btn btn-primary" onClick={() => navigate('/member/add')}>
              + Add Member
            </button>
          </div>
          <DataGrid
            columns={memberColumns}
            rows={members}
            loading={loading}
            onEdit={handleMemberEdit}
            onDelete={handleMemberDelete}
            pageSize={10}
            enableColumnSelect={true}
            enableFilter={true}
            enableSort={true}
          />
        </div>
      )}

      {activeTab === 'imports' && (
        <div className="tab-section">
          <div className="section-header">
            <h2>File Imports ({fileImports.length})</h2>
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
          </div>
          <DataGrid
            columns={importColumns}
            rows={fileImports}
            loading={loading}
            pageSize={10}
          />
        </div>
      )}

      {activeTab === 'exports' && (
        <div className="tab-section">
          <div className="section-header">
            <h2>File Exports ({fileExports.length})</h2>
            <button className="btn btn-primary" onClick={() => navigate('/exports/new')}>
              + New Export
            </button>
          </div>
          <DataGrid
            columns={exportColumns}
            rows={fileExports}
            loading={loading}
            pageSize={10}
          />
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.isMember ? "Delete Member" : "Remove Club"}
        message={deleteModal.isMember 
          ? `Are you sure you want to delete ${deleteModal.club?.firstName} ${deleteModal.club?.lastName}? This action cannot be undone.`
          : `Are you sure you want to remove the club "${deleteModal.club?.name}"? This will also remove all Members and cannot be undone.`}
        confirmText={deleteModal.isMember ? "Yes, Delete" : "Yes, Remove"}
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ isOpen: false, club: null, isMember: false })}
        isLoading={deleting}
      />
    </div>
  );
};

export default HomePage;
