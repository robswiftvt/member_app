import React, { useEffect, useState } from 'react';
import apiCall from '../utils/apiCall';
import './ChangeMemberAdminModal.css';

const ChangeMemberAdminModal = ({ isOpen, onClose, clubId, currentAdminMember, onUpdated }) => {
  const [members, setMembers] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSelectedMember('');
    setPassword('');
    setShowPassword(false);
    fetchMembersAndAdmins();
  }, [isOpen]);

  const fetchMembersAndAdmins = async () => {
    setLoading(true);
    try {
      const res = await apiCall(`/members?clubId=${clubId}&limit=1000`);
      if (!res.ok) throw new Error('Failed to fetch members');
      const membersData = await res.json();
      setMembers(membersData);

      // get existing admins to filter out
      const adminsRes = await apiCall('/admins');
      const admins = adminsRes.ok ? await adminsRes.json() : [];
      const adminMemberIds = admins.map((a) => (a.member ? a.member._id : null)).filter(Boolean);

      // Exclude existing admins except allow currentAdminMember
      const avail = membersData.filter((m) => {
        if (!m._id) return false;
        if (currentAdminMember && m._id === currentAdminMember._id) return false; // don't select current
        return !adminMemberIds.includes(m._id);
      });

      setAvailableMembers(avail);
    } catch (err) {
      setError(err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedMember) {
      setError('Please select a member to assign as Member Admin');
      return;
    }
    if (!password || password.length < 6) {
      setError('Please provide a password of at least 6 characters for the new admin');
      return;
    }

    setSubmitting(true);
    try {
      // 1) Create the new admin (Member Admin)
      const createRes = await apiCall('/admins', {
        method: 'POST',
        body: JSON.stringify({ member: selectedMember, password, adminType: 'Member Admin' }),
      });
      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error || 'Failed to create admin');
      }
      const newAdmin = await createRes.json();

      // 2) Update club to point to new memberAdmin
      const updateRes = await apiCall(`/clubs/${clubId}`, {
        method: 'PUT',
        body: JSON.stringify({ memberAdmin: selectedMember }),
      });
      if (!updateRes.ok) {
        const data = await updateRes.json();
        throw new Error(data.error || 'Failed to update club');
      }

      // 3) Remove previous member admin admin record (if present and different)
      if (currentAdminMember && currentAdminMember._id) {
        // find admin record for the previous member
        const adminsRes = await apiCall('/admins');
        if (adminsRes.ok) {
          const admins = await adminsRes.json();
          const prevAdmin = admins.find((a) => a.member?._id === currentAdminMember._id);
          if (prevAdmin) {
            await apiCall(`/admins/${prevAdmin._id}`, { method: 'DELETE' });
          }
        }
      }

      onUpdated && onUpdated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to change member admin');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cmam-overlay">
      <div className="cmam-card">
        <h2>Change Member Admin</h2>
        <p className="cmam-help">A club can only have one Member Admin. Select the new Member Admin and provide an initial password.</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="cmam-form">
          <div className="form-group">
            <label htmlFor="newMember">Select Member</label>
            <select id="newMember" value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} required>
              <option value="">Select a member</option>
              {availableMembers.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.firstName} {m.lastName} ({m.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="initialPassword">Initial Password</label>
            <div className="password-input-wrapper">
              <input
                id="initialPassword"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a password (min 6 chars)"
              />
              <button type="button" className="show-password-btn" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="cmam-actions">
            <button type="button" className="btn btn-cancel" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Change Member Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangeMemberAdminModal;
