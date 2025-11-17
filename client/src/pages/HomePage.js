import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiCall from '../utils/apiCall';
import DataGrid from '../components/DataGrid';
import ConfirmModal from '../components/ConfirmModal';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, club: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchClubs();
  }, []);

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

  const columns = [
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

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Clubs</h1>
          <p>Manage all clubs and their members</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => navigate('/club/add')}>
            + Add Club
          </button>
          {user?.adminType === 'System Admin' && (
            <button className="btn btn-secondary" onClick={() => navigate('/admins')}>
              Admin Administration
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <DataGrid
        columns={columns}
        rows={clubs}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        pageSize={10}
      />

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
