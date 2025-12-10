import React from 'react';
import './ConfirmModal.css';

const AddMembersToPaymentModal = ({ 
  isOpen, 
  mode, // 'confirm-existing' | 'confirm-create' | 'success'
  memberCount,
  addedCount,
  onConfirm, 
  onCancel, 
  isLoading 
}) => {
  if (!isOpen) return null;

  const getTitle = () => {
    if (mode === 'success') return 'Success';
    if (mode === 'confirm-existing') return 'Add to Existing Draft Payment';
    return 'Create New Draft Payment';
  };

  const getMessage = () => {
    if (mode === 'success') {
      return `Successfully added ${addedCount} member${addedCount !== 1 ? 's' : ''} to the payment.`;
    }
    if (mode === 'confirm-existing') {
      return 'There is already a Draft Payment. The selected members will be added to that Payment.';
    }
    return 'Would you like to create a new Draft Payment and add the selected users to that payment?';
  };

  const getButtons = () => {
    if (mode === 'success') {
      return (
        <div className="modal-actions">
          <button 
            className="btn btn-primary" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Ok
          </button>
        </div>
      );
    }
    
    return (
      <div className="modal-actions">
        <button 
          className="btn btn-cancel" 
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button 
          className="btn btn-primary" 
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Yes'}
        </button>
      </div>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{getTitle()}</h2>
        <p>{getMessage()}</p>
        {getButtons()}
      </div>
    </div>
  );
};

export default AddMembersToPaymentModal;
