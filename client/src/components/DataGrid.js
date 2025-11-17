import React, { useState } from 'react';
import './DataGrid.css';

const DataGrid = ({ 
  columns, 
  rows, 
  loading = false, 
  onEdit, 
  onDelete,
  pageSize = 10 
}) => {
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.ceil(rows.length / pageSize);
  const startIdx = currentPage * pageSize;
  const paginatedRows = rows.slice(startIdx, startIdx + pageSize);

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  if (loading) {
    return <div className="grid-container"><div className="loading">Loading...</div></div>;
  }

  if (rows.length === 0) {
    return <div className="grid-container"><div className="empty-state">No data available</div></div>;
  }

  return (
    <div className="grid-container">
      <div className="table-wrapper">
        <table className="data-grid">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
              {(onEdit || onDelete) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, idx) => (
              <tr key={row.id || idx}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="actions-cell">
                    {onEdit && (
                      <button className="action-btn edit-btn" onClick={() => onEdit(row)}>
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button className="action-btn delete-btn" onClick={() => onDelete(row)}>
                        Remove
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="pagination-btn" 
            onClick={handlePrevious} 
            disabled={currentPage === 0}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button 
            className="pagination-btn" 
            onClick={handleNext} 
            disabled={currentPage === totalPages - 1}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default DataGrid;
