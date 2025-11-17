import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiCall from '../utils/apiCall';
import './AddAdminPage.css';

const AddAdminPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    adminType: 'Club Admin',
    member: '',
  });
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchNonAdminMembers();
  }, []);

  const fetchNonAdminMembers = async () => {
    try {
      const response = await apiCall('/members?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch members');
      const allMembers = await response.json();

      // Get all admins to filter them out
      const adminsRes = await apiCall('/admins');
      const admins = adminsRes.ok ? await adminsRes.json() : [];
      const adminMemberIds = admins.map((a) => a.member._id);

      // Filter to members not already admins
      const nonAdminMembers = allMembers.filter((m) => !adminMemberIds.includes(m._id));
      setMembers(nonAdminMembers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        password: formData.password,
        adminType: formData.adminType,
        member: formData.member,
      };

      const response = await apiCall('/admins', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create admin');
      }

      navigate('/admins');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="form-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="form-container">
      <div className="form-card">
        <h1>Add Administrator</h1>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="member">Member *</label>
            <select
              id="member"
              name="member"
              value={formData.member}
              onChange={handleChange}
              required
              disabled={submitting}
            >
              <option value="">Select Member</option>
              {members.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.firstName} {member.lastName} ({member.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              minLength="6"
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="adminType">Admin Type *</label>
            <select
              id="adminType"
              name="adminType"
              value={formData.adminType}
              onChange={handleChange}
              required
              disabled={submitting}
            >
              <option value="System Admin">System Admin</option>
              <option value="Club Admin">Club Admin</option>
            </select>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-cancel"
              onClick={() => navigate('/admins')}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAdminPage;
