import React from 'react';
import { useNavigate } from 'react-router-dom';
import './UnauthorizedPage.css';

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="unauthorized-container">
      <div className="unauthorized-box">
        <h1>403</h1>
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
        <button className="btn-home" onClick={() => navigate('/home')}>
          Go to Home
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
