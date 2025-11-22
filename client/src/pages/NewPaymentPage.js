import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiCall from '../utils/apiCall';
import './NewPaymentPage.css';

const NewPaymentPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');

  const [club, setClub] = useState(null);
  const [clubFeeAmount, setClubFeeAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [clubYear, setClubYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState('Pending');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (clubId) fetchClub();
  }, [clubId]);

  const fetchClub = async () => {
    try {
      const res = await apiCall(`/clubs/${clubId}`);
      if (!res.ok) throw new Error('Failed to fetch club');
      const data = await res.json();
      setClub(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        club: clubId,
        clubFeeAmount: parseFloat(clubFeeAmount),
        date,
        clubYear: parseInt(clubYear, 10),
        status,
      };

      const res = await apiCall('/payments', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create payment');
      }

      // navigate back to club overview and open payments tab
      navigate(`/club-overview?id=${clubId}&tab=payments`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h1>New Payment</h1>
        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Club</label>
            <input value={club ? club.name : clubId || ''} readOnly disabled />
          </div>

          <div className="form-group">
            <label>Club Fee Amount *</label>
            <input type="number" step="0.01" value={clubFeeAmount} onChange={(e) => setClubFeeAmount(e.target.value)} required disabled={submitting} />
          </div>

          <div className="form-group">
            <label>Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required disabled={submitting} />
          </div>

          <div className="form-group">
            <label>Club Year *</label>
            <input type="number" value={clubYear} onChange={(e) => setClubYear(e.target.value)} required disabled={submitting} />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={submitting}>
              <option value="Pending">Pending</option>
              <option value="Received">Received</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-cancel" onClick={() => navigate(-1)} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Create Payment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPaymentPage;
