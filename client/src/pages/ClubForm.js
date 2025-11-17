import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiCall from '../utils/apiCall';
import './ClubForm.css';

const ClubForm = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [formData, setFormData] = useState({ name: '', location: '', homePage: '', status: 'Active', memberAdmin: '' });
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      fetchClub();
    }
    fetchMembers();
  }, []);

  const fetchClub = async () => {
    try {
      const response = await apiCall(`/clubs/${id}`);
      if (!response.ok) throw new Error('Failed to fetch club');
      const data = await response.json();
      setFormData({
        name: data.name,
        location: data.location || '',
        homePage: data.homePage || '',
        status: data.status,
        memberAdmin: data.memberAdmin?._id || '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await apiCall('/members?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch members');
      const data = await response.json();
      setMembers(data);
    } catch (err) {
      console.error('Fetch members error:', err);
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
        name: formData.name,
        location: formData.location,
        status: formData.status,
      };

      // Only include homePage when user entered a non-empty URL
      if (formData.homePage && formData.homePage.trim() !== '') {
        payload.homePage = formData.homePage.trim();
      }

      // Only include memberAdmin when a selection was made.
      if (formData.memberAdmin && formData.memberAdmin !== '') {
        payload.memberAdmin = formData.memberAdmin;
      }

      const response = await apiCall(
        isEdit ? `/clubs/${id}` : '/clubs',
        {
          method: isEdit ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save club');
      }

      navigate('/home');
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
        <h1>{isEdit ? 'Edit Club' : 'Add Club'}</h1>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Club Name *</label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter club name"
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Enter club location"
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="homePage">Home Page (URL)</label>
            <input
              id="homePage"
              type="url"
              name="homePage"
              value={formData.homePage}
              onChange={handleChange}
              placeholder="https://example.com"
              disabled={submitting}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={submitting}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="memberAdmin">Member Admin</label>
              <select
                id="memberAdmin"
                name="memberAdmin"
                value={formData.memberAdmin}
                onChange={handleChange}
                disabled={submitting}
              >
                <option value="">Select Member Admin</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-cancel"
              onClick={() => navigate('/home')}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Club'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClubForm;
