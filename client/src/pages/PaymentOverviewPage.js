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
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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

  const handleCheckSent = async () => {
    try {
      const response = await apiCall(`/payments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Pending' })
      });

      if (!response.ok) throw new Error('Failed to update payment status');
      
      const updatedPayment = await response.json();
      setPayment(updatedPayment);
      setShowCheckModal(false);
      setSuccessMessage('Thank you for sending your payment. The payment has been updated to Pending. Once the check has been received, the status will be updated.');
      
      // Clear success message after 10 seconds
      setTimeout(() => setSuccessMessage(''), 10000);
    } catch (err) {
      setError(err.message || 'Failed to update payment status');
      setShowCheckModal(false);
    }
  };

  const handleOnlinePaymentSent = async () => {
    try {
      const response = await apiCall(`/payments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Pending' })
      });

      if (!response.ok) throw new Error('Failed to update payment status');
      
      const updatedPayment = await response.json();
      setPayment(updatedPayment);
      setShowOnlineModal(false);
      setSuccessMessage('Thank you for submitting your payment online. The payment has been updated to Pending. Once the payment has been received, the status will be updated.');
      
      // Clear success message after 10 seconds
      setTimeout(() => setSuccessMessage(''), 10000);
    } catch (err) {
      setError(err.message || 'Failed to update payment status');
      setShowOnlineModal(false);
    }
  };

  const summary = (() => {
    const clubFee = payment ? Number(payment.clubFeeAmount || 0) : 0;
    
    // Count and sum from the actual members grid
    let fullCount = 0;
    let honoraryCount = 0;
    let sumFull = 0;
    let sumHonorary = 0;
    
    for (const mp of memberPayments) {
      const mt = mp.member?.membershipType || 'Full';
      const amt = Number(mp.amount || 0);
      if (mt === 'Full') {
        fullCount++;
        sumFull += amt;
      } else if (mt === 'Honorary') {
        honoraryCount++;
        sumHonorary += amt;
      }
    }
    
    // Calculate average amounts, or use default if no members
    const avgFull = fullCount > 0 ? sumFull / fullCount : 25.00;
    const avgHonorary = honoraryCount > 0 ? sumHonorary / honoraryCount : 20.00;
    
    return { 
      clubFee, 
      fullCount, 
      honoraryCount, 
      avgFull, 
      avgHonorary, 
      sumFull, 
      sumHonorary, 
      total: clubFee + sumFull + sumHonorary 
    };
  })();

  if (loading) return <div className="form-container"><div className="loading">Loading...</div></div>;
  if (error) return <div className="form-container"><div className="error-banner">{error}</div></div>;
  if (!payment) return <div className="form-container"><div className="error-banner">Payment not found</div></div>;

  return (
    <div className="form-container">
      <div className="form-card">
        <h1>Payment Overview</h1>
        
        {successMessage && (
          <div className="success-banner" style={{ marginBottom: '1rem' }}>{successMessage}</div>
        )}
        
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
          <div className="summary-row"><div className="summary-label">Full Members ({summary.fullCount} @ ${summary.avgFull.toFixed(2)})</div><div className="summary-amount">${summary.sumFull.toFixed(2)}</div></div>
          <div className="summary-row"><div className="summary-label">Honorary Members ({summary.honoraryCount} @ ${summary.avgHonorary.toFixed(2)})</div><div className="summary-amount">${summary.sumHonorary.toFixed(2)}</div></div>
          <div className="summary-separator" />
          <div className="summary-total"><div className="summary-label">Total</div><div className="summary-amount">${summary.total.toFixed(2)}</div></div>
        </div>

        <h2>Members ({memberPayments.length})</h2>
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

        <div style={{ marginTop: 12, display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>Back</button>
          {payment.status === 'Draft' && (
            <>
              <button className="btn btn-primary" onClick={() => setShowCheckModal(true)}>
                Pay by Check
              </button>
              <button className="btn btn-primary" onClick={() => setShowOnlineModal(true)}>
                Pay Online
              </button>
            </>
          )}
        </div>
      </div>

      {showCheckModal && (
        <div className="modal-overlay" onClick={() => setShowCheckModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Pay by Check</h2>
            <p>
              Please send a check for <strong>${summary.total.toFixed(2)}</strong> made payable to <strong>NCFWC</strong> and send to the following address:
            </p>
            <div style={{ marginLeft: '1rem', marginBottom: '1rem' }}>
              <div>Heather Swift</div>
              <div>301 Russo Valley Dr.</div>
              <div>Cary, NC 27519</div>
            </div>
            <p>Once the check has been sent, click <strong>Sent</strong>. Click <strong>Ok</strong> if you have not sent the check.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCheckModal(false)}>
                Ok
              </button>
              <button className="btn btn-primary" onClick={handleCheckSent}>
                Sent
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnlineModal && (
        <div className="modal-overlay" onClick={() => setShowOnlineModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Pay Online</h2>
            <p>
              Please click the link below to submit your payment online. The link will open in a new window.
            </p>
            <div style={{ margin: '1rem 0', textAlign: 'center' }}>
              <a 
                href="https://payment-link-here.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ display: 'inline-block', textDecoration: 'none' }}
              >
                Open Payment Portal
              </a>
            </div>
            <p>Once you have completed the payment, please click <strong>Sent</strong>. Click <strong>Ok</strong> if you will pay at a later time.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowOnlineModal(false)}>
                Ok
              </button>
              <button className="btn btn-primary" onClick={handleOnlinePaymentSent}>
                Sent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
