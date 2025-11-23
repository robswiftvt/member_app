import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiCall from '../utils/apiCall';
import './NewPaymentPage.css';

export default function PaymentOverviewPage() {
  const { id } = useParams(); // clubPayment id
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [memberPayments, setMemberPayments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const pRes = await apiCall(`/payments/${id}`);
        if (!pRes.ok) throw new Error('Failed to fetch club payment');
        const p = await pRes.json();
        setPayment(p);

        const mpRes = await apiCall(`/member-payments?clubPayment=${id}`);
        if (!mpRes.ok) throw new Error('Failed to fetch member payments');
        const mps = await mpRes.json();
        setMemberPayments(mps || []);
      } catch (err) {
        setError(err.message || 'Failed to load payment');
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  const summary = (() => {
    const clubFee = payment ? Number(payment.clubFeeAmount || 0) : 0;
    let sumFull = 0;
    let sumHonorary = 0;
    for (const mp of memberPayments) {
      const mt = mp.member?.membershipType || 'Full';
      const amt = Number(mp.amount || 0);
      if (mt === 'Full') sumFull += amt;
      else if (mt === 'Honorary') sumHonorary += amt;
    }
    return { clubFee, sumFull, sumHonorary, total: clubFee + sumFull + sumHonorary };
  })();

  if (loading) return <div className="form-container"><div className="loading">Loading...</div></div>;
  if (error) return <div className="form-container"><div className="error-banner">{error}</div></div>;
  if (!payment) return <div className="form-container"><div className="error-banner">Payment not found</div></div>;

  return (
    <div className="form-container">
      <div className="form-card">
        <h1>Payment Overview</h1>
        <div style={{ marginBottom: 12 }} className="payment-meta">
          <div style={{ marginBottom: 8 }}>
            <strong>Status:</strong> <span className={`status-badge ${payment.status?.toLowerCase()}`}>{payment.status}</span>
          </div>
          {payment.status === 'Received' && payment.receivedByMember && (
            <div style={{ marginBottom: 8 }}>
              <strong>Received By:</strong> {payment.receivedByMember.firstName} {payment.receivedByMember.lastName}
              {payment.receivedAt && (<span style={{ marginLeft: 8, color: '#666' }}>at {new Date(payment.receivedAt).toLocaleString()}</span>)}
            </div>
          )}

        </div>

        <div className="payment-summary">
          <div className="summary-row"><div className="summary-label">Club Fee Amount</div><div className="summary-amount">${summary.clubFee.toFixed(2)}</div></div>
          <div className="summary-row"><div className="summary-label">Full Members ({memberPayments.filter(m => (m.member?.membershipType || 'Full') === 'Full').length} @ ${payment ? Number(payment.clubFeeAmount || 0).toFixed(2) : '0.00'})</div><div className="summary-amount">${summary.sumFull.toFixed(2)}</div></div>
          <div className="summary-row"><div className="summary-label">Honorary Members ({memberPayments.filter(m => (m.member?.membershipType || 'Full') === 'Honorary').length} @ ${payment ? Number(payment.clubFeeAmount || 0).toFixed(2) : '0.00'})</div><div className="summary-amount">${summary.sumHonorary.toFixed(2)}</div></div>
          <div className="summary-separator" />
          <div className="summary-total"><div className="summary-label">Total</div><div className="summary-amount">${summary.total.toFixed(2)}</div></div>
        </div>

        <h2>Members Paid ({memberPayments.length})</h2>
        <div className="table-responsive">
          <table className="data-grid">
            <thead>
              <tr><th>Name</th><th>Membership Type</th><th>Amount</th><th>Club Year</th></tr>
            </thead>
            <tbody>
              {memberPayments.length === 0 && <tr><td colSpan={4}>No member payments for this club payment</td></tr>}
              {memberPayments.map((mp) => (
                <tr key={mp._id}>
                  <td>{mp.member?.firstName} {mp.member?.lastName}</td>
                  <td>{mp.member?.membershipType || 'Full'}</td>
                  <td>${Number(mp.amount || 0).toFixed(2)}</td>
                  <td>{mp.clubYear}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>
    </div>
  );
}
