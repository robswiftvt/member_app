import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiCall from '../utils/apiCall';
import DataGrid from '../components/DataGrid';
import ConfirmModal from '../components/ConfirmModal';
import ChangeMemberAdminModal from '../components/ChangeMemberAdminModal';
import './ClubOverviewPage.css';

const ClubOverviewPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id');
  const clubId = id || queryId || user?.clubId;

  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, member: null });
  const [deleting, setDeleting] = useState(false);
  const [changeAdminModalOpen, setChangeAdminModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('members');

  useEffect(() => {
    if (clubId) {
      fetchClubAndMembers();
    }
  }, [clubId]);

  const fetchClubAndMembers = async () => {
    setLoading(true);
    setError('');
    try {
      const clubRes = await apiCall(`/clubs/${clubId}`);
      if (!clubRes.ok) throw new Error('Failed to fetch club');
      const clubData = await clubRes.json();
      setClub(clubData);

      const membersRes = await apiCall(`/members`);
      if (!membersRes.ok) throw new Error('Failed to fetch members');
      const membersData = await membersRes.json();
      setMembers(membersData.filter((m) => m.club._id === clubId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClub = () => {
    navigate(`/club/edit/${clubId}`);
  };

  const handleEditMember = (member) => {
    navigate(`/member/edit/${member._id}`);
  };

  const handleDeleteMember = (member) => {
    setDeleteModal({ isOpen: true, member });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.member) return;

    setDeleting(true);
    try {
      const response = await apiCall(`/members/${deleteModal.member._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete member');

      setMembers(members.filter((m) => m._id !== deleteModal.member._id));
      setDeleteModal({ isOpen: false, member: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="club-overview-container"><div className="loading">Loading...</div></div>;
  }

  if (!club) {
    return <div className="club-overview-container"><div className="error-banner">Club not found</div></div>;
  }

  const memberColumns = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'membershipType',
      label: 'Membership Type',
      render: (value) => <span className={`badge ${value.toLowerCase()}`}>{value}</span>,
    },
  ];

  return (
    <div className="club-overview-container">
      <div className="club-header">
        <div className="club-info">
          <h1>{club.name}</h1>
          <p className="club-location">{club.location}</p>
        </div>
        <div className="club-actions">
          <button className="btn btn-secondary" onClick={handleEditClub}>
            Edit Club
          </button>
          {club.memberAdmin && (
            <button
              className="btn btn-secondary"
              onClick={() => setChangeAdminModalOpen(true)}
            >
              Change Admin
            </button>
          )}
          {user?.adminType !== 'Member Admin' && (
            <button className="btn btn-secondary" onClick={() => navigate('/home')}>
              Back to Home
            </button>
          )}
        </div>
      </div>

      <div className="club-details">
        <div className="detail-row">
          <span className="detail-label">Status:</span>
          <span className={`status-badge ${club.status.toLowerCase()}`}>{club.status}</span>
        </div>
        {club.homePage && (
          <div className="detail-row">
            <span className="detail-label">Home Page:</span>
            <a href={club.homePage} target="_blank" rel="noopener noreferrer">
              {club.homePage}
            </a>
          </div>
        )}
        {club.memberAdmin && (
          <div className="detail-row">
            <span className="detail-label">Member Admin:</span>
            <span className="member-admin-block">
              <span className="member-admin-name">{club.memberAdmin.firstName} {club.memberAdmin.lastName}</span>
            </span>
          </div>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="club-tabs">
        <div className="tab-list">
          <button className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>Members</button>
          <button className={`tab ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>Club Payments</button>
        </div>

        {activeTab === 'members' && (
          <div className="members-section">
            <div className="members-header">
              <h2>Members ({members.length})</h2>
              <button className="btn btn-primary" onClick={() => navigate(`/member/add?clubId=${clubId}`)}>
                + Add Member
              </button>
            </div>

            <DataGrid
              columns={memberColumns}
              rows={members}
              onEdit={handleEditMember}
              onDelete={handleDeleteMember}
              pageSize={10}
            />
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="payments-section">
            <div className="members-header">
              <h2>Club Payments</h2>
            </div>
            <div className="placeholder">Club Payments UI will be added here.</div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Remove Member"
        message={`Are you sure you want to remove ${deleteModal.member?.firstName} ${deleteModal.member?.lastName}? This action cannot be undone.`}
        confirmText="Yes, Remove"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ isOpen: false, member: null })}
        isLoading={deleting}
      />
      <ChangeMemberAdminModal
        isOpen={changeAdminModalOpen}
        onClose={() => setChangeAdminModalOpen(false)}
        clubId={clubId}
        currentAdminMember={club.memberAdmin}
        onUpdated={() => fetchClubAndMembers()}
      />
    </div>
  );
};

export default ClubOverviewPage;
