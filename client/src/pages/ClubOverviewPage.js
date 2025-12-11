import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiCall from '../utils/apiCall';
import DataGrid from '../components/DataGrid';
import ConfirmModal from '../components/ConfirmModal';
import ChangeMemberAdminModal from '../components/ChangeMemberAdminModal';
import AddMembersToPaymentModal from '../components/AddMembersToPaymentModal';
import './ClubOverviewPage.css';

const ClubOverviewPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id');
  const clubId = id || queryId || user?.clubId;
  const queryTab = searchParams.get('tab');

  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedClubPayment, setSelectedClubPayment] = useState(null);
  const [unpaidMembers, setUnpaidMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, member: null });
  const [deleting, setDeleting] = useState(false);
  const [changeAdminModalOpen, setChangeAdminModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('members');
  const [updatingPaymentId, setUpdatingPaymentId] = useState(null);
  const [confirmPaymentModal, setConfirmPaymentModal] = useState({ isOpen: false, payment: null });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [paymentModal, setPaymentModal] = useState({ 
    isOpen: false, 
    mode: null, // 'confirm-existing' | 'confirm-create' | 'success'
    draftPayment: null,
    addedCount: 0 
  });

  useEffect(() => {
    if (clubId) {
      fetchClubAndMembers();
    }
    if (queryTab) setActiveTab(queryTab);
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
      const clubMembers = membersData.filter((m) => m.club && m.club._id === clubId);
      
      // fetch payments for this club as well
      try {
        const paymentsRes = await apiCall(`/payments?clubId=${clubId}`);
        if (paymentsRes && paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          // fetch member payments for this club so we can compute member fees per clubPayment
          try {
            const mpRes = await apiCall(`/member-payments?clubId=${clubId}`);
            let mpData = [];
            if (mpRes && mpRes.ok) mpData = await mpRes.json();

            // Group member payments by member ID and find latest
            const latestPaymentByMember = {};
            mpData.forEach(mp => {
              const memberId = mp.member?._id || mp.member;
              if (!latestPaymentByMember[memberId] || 
                  (mp.clubPayment?.clubYear > latestPaymentByMember[memberId].clubPayment?.clubYear)) {
                latestPaymentByMember[memberId] = mp;
              }
            });
            
            // Enrich members with payment status
            const enrichedMembers = clubMembers.map(member => ({
              ...member,
              latestPayment: latestPaymentByMember[member._id]
            }));
            
            setMembers(enrichedMembers);

            // group sums by clubPayment id
            const sums = {};
            for (const mp of mpData) {
              // clubPayment may be populated as an object or just an id string
              const raw = mp.clubPayment;
              const key = raw ? (raw._id ? String(raw._id) : String(raw)) : 'none';
              sums[key] = sums[key] || 0;
              sums[key] += Number(mp.amount || 0);
            }

            const enriched = (paymentsData || []).map((p) => {
              const memberFees = sums[p._id] || 0;
              return { ...p, memberFees, total: (Number(p.clubFeeAmount || 0) + memberFees) };
            });

            setPayments(enriched);
          } catch (err) {
            setPayments(paymentsData);
            setMembers(clubMembers);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch payments:', err.message || err);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markPaymentReceived = async (paymentId) => {
    if (!paymentId) return;
    setUpdatingPaymentId(paymentId);
    try {
      const res = await apiCall(`/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Received' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update payment');
      }
      // refresh payments
      await fetchClubAndMembers();
    } catch (err) {
      setError(err.message || 'Failed to mark payment received');
    } finally {
      setUpdatingPaymentId(null);
      setConfirmPaymentModal({ isOpen: false, payment: null });
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

  const handleAddToPayment = async () => {
    if (selectedMembers.length === 0) return;

    try {
      // Check if there's a Draft payment for this club
      const response = await apiCall(`/payments?clubId=${clubId}`);
      if (!response.ok) throw new Error('Failed to fetch payments');
      
      const allPayments = await response.json();
      const draftPayment = allPayments.find(p => p.status === 'Draft');

      if (draftPayment) {
        // Show modal to confirm adding to existing draft
        setPaymentModal({ 
          isOpen: true, 
          mode: 'confirm-existing', 
          draftPayment,
          addedCount: 0 
        });
      } else {
        // Show modal to confirm creating new draft
        setPaymentModal({ 
          isOpen: true, 
          mode: 'confirm-create', 
          draftPayment: null,
          addedCount: 0 
        });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConfirmAddToPayment = async () => {
    try {
      const { draftPayment, mode } = paymentModal;
      let paymentId = draftPayment?._id;

      // If no draft exists, create one
      if (mode === 'confirm-create') {
        const today = new Date();
        const currentYear = today.getFullYear();
        // If after October 31st, use next year
        const month = today.getMonth(); // 0-indexed, so October = 9
        const day = today.getDate();
        const clubYear = (month === 9 && day > 31) || month > 9 ? currentYear + 1 : currentYear;
        
        // Fetch config to get default club fee amount
        let clubFeeAmount = 15; // Default fallback
        try {
          const configRes = await apiCall('/config');
          if (configRes.ok) {
            const config = await configRes.json();
            clubFeeAmount = Number(config.clubFeeAmount || 15);
          }
        } catch (err) {
          console.warn('Failed to fetch config, using default club fee:', err);
        }
        
        const createResponse = await apiCall('/payments', {
          method: 'POST',
          body: JSON.stringify({
            club: clubId,
            clubFeeAmount: clubFeeAmount,
            date: new Date().toISOString(),
            clubYear: clubYear,
            status: 'Draft'
          })
        });

        if (!createResponse.ok) throw new Error('Failed to create payment');
        const newPayment = await createResponse.json();
        paymentId = newPayment._id;
      }

      // Add members to the payment
      const currentYear = draftPayment?.clubYear || new Date().getFullYear();
      
      // Get member details to determine amounts based on membership type
      const membersWithAmounts = selectedMembers.map(memberId => {
        const member = members.find(m => m._id === memberId);
        let amount = 25.00; // Default for Full members
        
        if (member?.membershipType === 'Honorary') {
          amount = 20.00;
        } else if (member?.membershipType === 'Full') {
          amount = 25.00;
        }
        
        return {
          memberId,
          amount
        };
      });
      
      const addResponse = await apiCall('/member-payments/bulk-add', {
        method: 'POST',
        body: JSON.stringify({
          members: membersWithAmounts,
          clubPayment: paymentId,
          club: clubId,
          clubYear: currentYear
        })
      });

      if (!addResponse.ok) throw new Error('Failed to add members to payment');
      const result = await addResponse.json();

      // Show success modal
      setPaymentModal({ 
        isOpen: true, 
        mode: 'success', 
        draftPayment: null,
        addedCount: result.addedCount 
      });

      // Refresh data
      await fetchClubAndMembers();
      setSelectedMembers([]);
    } catch (err) {
      setError(err.message);
      setPaymentModal({ isOpen: false, mode: null, draftPayment: null, addedCount: 0 });
    }
  };

  const handleCancelAddToPayment = () => {
    setPaymentModal({ isOpen: false, mode: null, draftPayment: null, addedCount: 0 });
  };

  const handleNewPayment = async () => {
    try {
      const today = new Date();
      const currentYear = today.getFullYear();
      // If after October 31st, use next year
      const month = today.getMonth(); // 0-indexed, so October = 9
      const day = today.getDate();
      const clubYear = (month === 9 && day > 31) || month > 9 ? currentYear + 1 : currentYear;
      
      // Fetch config to get default club fee amount
      let clubFeeAmount = 15; // Default fallback
      try {
        const configRes = await apiCall('/config');
        if (configRes.ok) {
          const config = await configRes.json();
          clubFeeAmount = Number(config.clubFeeAmount || 15);
        }
      } catch (err) {
        console.warn('Failed to fetch config, using default club fee:', err);
      }
      
      const createResponse = await apiCall('/payments', {
        method: 'POST',
        body: JSON.stringify({
          club: clubId,
          clubFeeAmount: clubFeeAmount,
          date: new Date().toISOString(),
          clubYear: clubYear,
          status: 'Draft'
        })
      });

      if (!createResponse.ok) throw new Error('Failed to create payment');
      const newPayment = await createResponse.json();
      
      // Navigate to the payment overview page
      navigate(`/payments/view/${newPayment._id}`);
    } catch (err) {
      setError(err.message || 'Failed to create payment');
    }
  };

  if (loading) {
    return <div className="club-overview-container"><div className="loading">Loading...</div></div>;
  }

  if (!club) {
    return <div className="club-overview-container"><div className="error-banner">Club not found</div></div>;
  }

  const memberColumns = [
    { key: 'firstName', label: 'First Name', visible: true },
    { key: 'lastName', label: 'Last Name', visible: true },
    { key: 'email', label: 'Email', visible: true },
    {
      key: 'membershipType',
      label: 'Membership Type',
      render: (value) => <span className={`badge ${value.toLowerCase()}`}>{value}</span>,
      visible: true
    },
    { 
      key: 'memberStatus', 
      label: 'Member Status', 
      render: (v, row) => {
        const payment = row.latestPayment?.clubPayment;
        if (!payment) return '-';
        return `${payment.status || 'Unknown'} (${payment.clubYear || ''})`;
      },
      visible: true
    },
    { key: 'nfrwContactId', label: 'NFRW ID', render: (v) => v || '-', visible: false },
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
      visible: true
    },
    { key: 'deceased', label: 'Deceased', render: (v) => v ? 'Yes' : 'No', visible: false },
  ];

  const paymentColumns = [
    { key: 'date', label: 'Date', render: (v) => (v ? new Date(v).toLocaleDateString() : '') },
    { key: 'clubYear', label: 'Year' },
    { key: 'clubFeeAmount', label: 'Club Fee', render: (v) => (v || v === 0 ? `$${Number(v).toFixed(2)}` : '') },
    { key: 'memberFees', label: 'Member Fees', render: (v) => (v || v === 0 ? `$${Number(v).toFixed(2)}` : '$0.00') },
    { key: 'total', label: 'Total', render: (v) => (v || v === 0 ? `$${Number(v).toFixed(2)}` : '') },
    { key: 'status', label: 'Status' },
    {
      key: 'actions',
      label: 'Actions',
      render: (v, row) => {
        const canMark = (user?.adminType === 'System Admin' || user?.adminType === 'Club Admin') && row.status === 'Pending';
        return (
          <>
            <button className="btn btn-secondary" onClick={() => navigate(`/payments/view/${row._id}`)}>View</button>
            {canMark && (
              <button
                className="btn btn-success"
                style={{ marginLeft: '0.5rem' }}
                onClick={() => setConfirmPaymentModal({ isOpen: true, payment: row })}
                disabled={updatingPaymentId === row._id}
              >
                {updatingPaymentId === row._id ? 'Saving...' : 'Payment Received'}
              </button>
            )}
          </>
        );
      },
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
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" onClick={() => navigate(`/member/add?clubId=${clubId}`)}>
                    + Add Member
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleAddToPayment}
                    disabled={selectedMembers.length === 0}
                    title={selectedMembers.length === 0 ? 'Please select users to add to the Payment' : ''}
                    style={{ 
                      opacity: selectedMembers.length === 0 ? 0.5 : 1,
                      cursor: selectedMembers.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Renew/Add to Payment
                  </button>
                  <div>
                    <button className="btn btn-secondary" onClick={() => document.getElementById('import-xls-input')?.click()}>
                      Import from XLS
                    </button>
                    <input id="import-xls-input" type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      // simple client-side validation
                      const token = localStorage.getItem('token');
                      const form = new FormData();
                      form.append('file', f);
                      const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
                      try {
                        const res = await fetch(`${API_BASE_URL}/uploads/nfrw_import?clubId=${encodeURIComponent(clubId)}`, {
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
                          // refresh club and members list
                          await fetchClubAndMembers();
                          // clear file input and any prior errors
                          e.target.value = '';
                          setError('');
                          console.log('Upload successful', data);
                        }
                      } catch (err) {
                        console.error('Upload exception', err);
                        setError(`Upload error: ${err.message}`);
                      }
                    }} />
                  </div>
                </div>
            </div>

            <DataGrid
              columns={memberColumns}
              rows={members}
              onEdit={handleEditMember}
              onDelete={handleDeleteMember}
              pageSize={10}
              enableColumnSelect={true}
              enableFilter={true}
              enableSort={true}
              enableCheckbox={true}
              onSelectionChange={setSelectedMembers}
            />
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="payments-section">
            <div className="members-header">
              <h2>Club Payments</h2>
              {!payments.find(p => p.status === 'Draft') && (
                <button className="btn btn-primary" onClick={handleNewPayment}>
                  + New Payment
                </button>
              )}
            </div>

              <div style={{ marginTop: '1rem' }}>
                {/* Select Club Payment removed per UI change request */}

                <DataGrid columns={paymentColumns} rows={payments} pageSize={10} />
              </div>
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
      <ConfirmModal
        isOpen={confirmPaymentModal.isOpen}
        title="Confirm Payment Received"
        message={`Mark payment for ${confirmPaymentModal.payment?.clubYear || ''} as received? This will record who marked it and the timestamp.`}
        confirmText="Yes, Mark Received"
        cancelText="Cancel"
        onConfirm={() => markPaymentReceived(confirmPaymentModal.payment?._id)}
        onCancel={() => setConfirmPaymentModal({ isOpen: false, payment: null })}
        isLoading={Boolean(updatingPaymentId)}
      />
      <ChangeMemberAdminModal
        isOpen={changeAdminModalOpen}
        onClose={() => setChangeAdminModalOpen(false)}
        clubId={clubId}
        currentAdminMember={club.memberAdmin}
        onUpdated={() => fetchClubAndMembers()}
      />
      <AddMembersToPaymentModal
        isOpen={paymentModal.isOpen}
        mode={paymentModal.mode}
        memberCount={selectedMembers.length}
        addedCount={paymentModal.addedCount}
        onConfirm={handleConfirmAddToPayment}
        onCancel={handleCancelAddToPayment}
        isLoading={false}
      />
    </div>
  );
};

export default ClubOverviewPage;
