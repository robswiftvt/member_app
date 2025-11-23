import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiCall from '../utils/apiCall';
import './NewPaymentPage.css';

export default function NewPaymentPage2() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');

  const [clubFeeAmountDefault, setClubFeeAmountDefault] = useState(15);
  const [clubYear] = useState(new Date().getFullYear());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unpaidMembers, setUnpaidMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [memberFeeAmount, setMemberFeeAmount] = useState(25);
  const [honoraryFeeAmount, setHonoraryFeeAmount] = useState(20);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await apiCall('/config');
        if (res.ok) {
          const cfg = await res.json();
          setMemberFeeAmount(Number(cfg.memberFeeAmount || 25));
          setHonoraryFeeAmount(Number(cfg.honoraryFeeAmount || 20));
          const cfgClubFee = Number(cfg.clubFeeAmount || 15);
          // If club already has a club payment for this year with a non-zero clubFeeAmount,
          // show $0 for the club fee in the UI.
          if (clubId) {
            try {
              const payRes = await apiCall(`/payments?clubId=${encodeURIComponent(clubId)}&clubYear=${encodeURIComponent(clubYear)}`);
              if (payRes.ok) {
                const payments = await payRes.json();
                const hasClubFee = (payments || []).some((p) => Number(p.clubFeeAmount || 0) > 0);
                setClubFeeAmountDefault(hasClubFee ? 0 : cfgClubFee);
              } else {
                setClubFeeAmountDefault(cfgClubFee);
              }
            } catch (e) {
              setClubFeeAmountDefault(cfgClubFee);
            }
          } else {
            setClubFeeAmountDefault(cfgClubFee);
          }
        }
      } catch (e) {
        // ignore
      }
    }
    loadConfig();
  }, [clubId]);

  useEffect(() => {
    if (!clubId) return;
    async function loadUnpaid() {
      try {
        const res = await apiCall(`/member-payments/unpaid?clubId=${encodeURIComponent(clubId)}&clubYear=${encodeURIComponent(clubYear)}`);
        if (!res.ok) throw new Error('Failed to fetch unpaid members');
        const data = await res.json();
        setUnpaidMembers(data || []);
        setSelectedMembers(new Set((data || []).map((m) => m._id)));
      } catch (err) {
        console.error('Fetch unpaid members error:', err);
        setUnpaidMembers([]);
        setSelectedMembers(new Set());
      }
    }
    loadUnpaid();
  }, [clubId, clubYear]);

  const toggleSelectMember = (memberId) => setSelectedMembers((prev) => {
    const n = new Set(prev); if (n.has(memberId)) n.delete(memberId); else n.add(memberId); return n;
  });

  const createMemberPayment = async (memberId, amt, clubPaymentId) => {
    const payload = { member: memberId, club: clubId, clubPayment: clubPaymentId, amount: Number(amt || 0), clubYear };
    const res = await apiCall('/member-payments', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to create member payment');
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      const payload = { club: clubId, clubFeeAmount: Number(clubFeeAmountDefault || 0), date: new Date().toISOString(), clubYear, status: 'Pending' };
      const res = await apiCall('/payments', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create club payment');
      const created = await res.json();
      for (const id of Array.from(selectedMembers)) {
        const member = unpaidMembers.find((m) => m._id === id) || {};
        const mType = member.membershipType || 'Full';
        const amt = mType === 'Full' ? Number(memberFeeAmount || 0) : (mType === 'Honorary' ? Number(honoraryFeeAmount || 0) : 0);
        await createMemberPayment(id, amt, created._id);
      }
      navigate(`/club-overview?id=${clubId}&tab=payments`);
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally { setSubmitting(false); }
  };

  const summary = (() => {
    let sumFull = 0, sumHonorary = 0;
    for (const m of unpaidMembers) {
      if (!selectedMembers.has(m._id)) continue;
      const mt = m.membershipType || 'Full';
      if (mt === 'Full') sumFull += Number(memberFeeAmount || 0);
      else if (mt === 'Honorary') sumHonorary += Number(honoraryFeeAmount || 0);
    }
    return { sumFull, sumHonorary, total: Number(clubFeeAmountDefault || 0) + sumFull + sumHonorary };
  })();

  return (
    <div className="form-container">
      <div className="form-card">
        <h1>New Payment</h1>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginTop: 12 }}>
            <h2>Payment Summary</h2>
            <div className="payment-summary" style={{ marginBottom: 12 }}>
              <div className="summary-row">
                <div className="summary-label">Club Fee Amount</div>
                <div className="summary-amount">${Number(clubFeeAmountDefault || 0).toFixed(2)}</div>
              </div>
              {
                (() => {
                  // compute counts and display per-member format: "Full Members (N @ $Y)"
                  let countFull = 0;
                  let countHonorary = 0;
                  for (const m of unpaidMembers) {
                    if (!selectedMembers.has(m._id)) continue;
                    const mt = m.membershipType || 'Full';
                    if (mt === 'Full') countFull += 1;
                    else if (mt === 'Honorary') countHonorary += 1;
                  }
                  return (
                    <>
                      <div className="summary-row">
                        <div className="summary-label">Full Members ({countFull} @ ${Number(memberFeeAmount || 0).toFixed(2)})</div>
                        <div className="summary-amount">${Number(summary.sumFull).toFixed(2)}</div>
                      </div>
                      <div className="summary-row">
                        <div className="summary-label">Honorary Members ({countHonorary} @ ${Number(honoraryFeeAmount || 0).toFixed(2)})</div>
                        <div className="summary-amount">${Number(summary.sumHonorary).toFixed(2)}</div>
                      </div>
                    </>
                  );
                })()
              }
              <div className="summary-separator" />
              <div className="summary-total">
                <div className="summary-label">Total</div>
                <div className="summary-amount">${Number(summary.total).toFixed(2)}</div>
              </div>
            </div>
            <h2>Unpaid Members for {clubYear}</h2>
            <div className="table-responsive">
              <table className="data-grid">
                <thead>
                  <tr><th></th><th>Name</th><th>Membership Type</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {unpaidMembers.length === 0 && <tr><td colSpan={4}>No unpaid members for this club/year</td></tr>}
                  {unpaidMembers.map((m) => {
                    const mType = m.membershipType || 'Full';
                    const amt = mType === 'Full' ? Number(memberFeeAmount || 0) : (mType === 'Honorary' ? Number(honoraryFeeAmount || 0) : 0);
                    return (
                      <tr key={m._id}>
                        <td><input type="checkbox" checked={selectedMembers.has(m._id)} onChange={() => toggleSelectMember(m._id)} /></td>
                        <td>{m.firstName} {m.lastName}</td>
                        <td>{mType}</td>
                        <td>${amt.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-cancel" onClick={() => navigate(-1)} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Create Payment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
