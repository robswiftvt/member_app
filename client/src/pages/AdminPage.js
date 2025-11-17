import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiCall from '../utils/apiCall';
import DataGrid from '../components/DataGrid';
import ConfirmModal from '../components/ConfirmModal';
import './AdminPage.css';

const AdminPage = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, admin: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiCall('/admins');
      if (!response.ok) throw new Error('Failed to fetch admins');
      const data = await response.json();
      setAdmins(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (admin) => {
    setDeleteModal({ isOpen: true, admin });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.admin) return;

    setDeleting(true);
    try {
      const response = await apiCall(`/admins/${deleteModal.admin._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete admin');

      setAdmins(admins.filter((a) => a._id !== deleteModal.admin._id));
      setDeleteModal({ isOpen: false, admin: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'adminType', label: 'Admin Type' },
    {
      key: 'member',
      label: 'Member',
      render: (value) => value ? `${value.firstName} ${value.lastName}` : 'Unknown',
    },
    {
      key: 'member',
      label: 'Email',
      render: (value) => value?.email || '-',
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Admin Administration</h1>
          <p>Manage system administrators</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/add')}>
          + Add Administrator
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <DataGrid
        columns={columns}
        rows={admins}
        loading={loading}
        onDelete={handleDeleteClick}
        pageSize={10}
      />

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Remove Admin"
        message={`Are you sure you want to remove admin access for ${deleteModal.admin?.member?.firstName} ${deleteModal.admin?.member?.lastName}? They will still be a member.`}
        confirmText="Yes, Remove"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ isOpen: false, admin: null })}
        isLoading={deleting}
      />
    </div>
  );
};

export default AdminPage;
