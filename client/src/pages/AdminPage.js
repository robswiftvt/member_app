import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiCall from '../utils/apiCall';
import DataGrid from '../components/DataGrid';
import ConfirmModal from '../components/ConfirmModal';
import './AdminPage.css';

const AdminPage = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, admin: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (member) => {
    setDeleteModal({ isOpen: true, admin: member });
  };

  const handleEditClick = (member) => {
    if (!member || !member._id) return;
    navigate(`/member/edit/${member._id}`);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.admin) return;

    setDeleting(true);
    try {
      const response = await apiCall(`/members/${deleteModal.admin._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete member');

      // Remove member from local state
      setMembers(members.filter((m) => m._id !== deleteModal.admin._id));
      setDeleteModal({ isOpen: false, admin: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'firstName', label: 'First Name', render: (v) => v || '-' },
    { key: 'lastName', label: 'Last Name', render: (v) => v || '-' },
    { key: 'email', label: 'Email', render: (v) => v || '-' },
    { key: 'club', label: 'Club', render: (v) => (v && v.name ? v.name : '-') },
    { key: 'membershipType', label: 'Member Type', render: (v) => v || '-' },
    { key: 'adminType', label: 'Admin Type', render: (v) => v || '-' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Member Administration</h1>
          <p>This page allows you to add or remove System and Club administrators. Removing an administrator does not delete the member record; it only revokes their ability to log into this site. Member Admins are managed on the Club page.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/member/add')}>
          + Add Member
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <DataGrid
        columns={columns}
        rows={members}
        loading={loading}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        pageSize={10}
      />

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Member"
        message={`Are you sure you want to delete ${deleteModal.admin?.firstName} ${deleteModal.admin?.lastName}? This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ isOpen: false, admin: null })}
        isLoading={deleting}
      />
    </div>
  );
};

export default AdminPage;
