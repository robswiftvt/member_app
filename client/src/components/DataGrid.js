import React, { useState } from 'react';
import './DataGrid.css';

const DataGrid = ({ 
  columns, 
  rows, 
  loading = false, 
  onEdit, 
  onDelete,
  pageSize = 10,
  enableColumnSelect = false,
  enableFilter = false,
  enableSort = false,
  enableCheckbox = false,
  onSelectionChange
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [visibleColumns, setVisibleColumns] = useState(
    columns.filter(c => c.visible !== false).map(c => c.key)
  );
  const [columnOrder, setColumnOrder] = useState(columns.map(c => c.key));
  const [filterText, setFilterText] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);

  // Filter rows
  let filteredRows = rows;
  if (enableFilter && filterText) {
    const lowerFilter = filterText.toLowerCase();
    filteredRows = rows.filter(row => {
      return columns.some(col => {
        if (!visibleColumns.includes(col.key)) return false;
        const value = row[col.key];
        if (value === null || value === undefined) return false;
        // Handle nested objects (like club.name)
        if (typeof value === 'object' && value.name) {
          return String(value.name).toLowerCase().includes(lowerFilter);
        }
        return String(value).toLowerCase().includes(lowerFilter);
      });
    });
  }

  // Sort rows
  if (enableSort && sortConfig.key) {
    filteredRows = [...filteredRows].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Handle nested objects
      if (aVal && typeof aVal === 'object' && aVal.name) aVal = aVal.name;
      if (bVal && typeof bVal === 'object' && bVal.name) bVal = bVal.name;
      
      // Handle null/undefined
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      // Compare
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const startIdx = currentPage * pageSize;
  const paginatedRows = filteredRows.slice(startIdx, startIdx + pageSize);

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  const handleSort = (key) => {
    if (!enableSort) return;
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(0);
  };

  const toggleColumn = (key) => {
    if (visibleColumns.includes(key)) {
      setVisibleColumns(visibleColumns.filter(k => k !== key));
    } else {
      setVisibleColumns([...visibleColumns, key]);
    }
  };

  const handleDragStart = (e, columnKey) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, columnKey) => {
    e.preventDefault();
    if (draggedColumn === columnKey) return;
    
    const newOrder = [...columnOrder];
    const draggedIdx = newOrder.indexOf(draggedColumn);
    const targetIdx = newOrder.indexOf(columnKey);
    
    // Remove dragged column and insert at target position
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedColumn);
    
    setColumnOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = paginatedRows.map(row => row._id || row.id);
      setSelectedRows(allIds);
      if (onSelectionChange) onSelectionChange(allIds);
    } else {
      setSelectedRows([]);
      if (onSelectionChange) onSelectionChange([]);
    }
  };

  const handleSelectRow = (rowId) => {
    const newSelection = selectedRows.includes(rowId)
      ? selectedRows.filter(id => id !== rowId)
      : [...selectedRows, rowId];
    setSelectedRows(newSelection);
    if (onSelectionChange) onSelectionChange(newSelection);
  };

  // Create ordered column definitions based on columnOrder
  const orderedColumns = columnOrder
    .map(key => columns.find(col => col.key === key))
    .filter(col => col && visibleColumns.includes(col.key));

  const visibleColumnDefs = orderedColumns;

  if (loading) {
    return <div className="grid-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="grid-container">
      {(enableColumnSelect || enableFilter) && (
        <div className="grid-toolbar">
          {enableFilter && (
            <input
              type="text"
              placeholder="Filter..."
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                setCurrentPage(0);
              }}
              className="filter-input"
            />
          )}
          {enableColumnSelect && (
            <div className="column-selector">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowColumnMenu(!showColumnMenu)}
              >
                Columns ▼
              </button>
              {showColumnMenu && (
                <div className="column-menu">
                  {columns.map(col => (
                    <label key={col.key} className="column-menu-item">
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {filteredRows.length === 0 ? (
        <div className="empty-state">No data available</div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="data-grid">
              <thead>
                <tr>
                  {enableCheckbox && (
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={paginatedRows.length > 0 && selectedRows.length === paginatedRows.length}
                      />
                    </th>
                  )}
                  {visibleColumnDefs.map((col) => (
                    <th 
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={enableSort ? 'sortable' : ''}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, col.key)}
                      onDragOver={(e) => handleDragOver(e, col.key)}
                      onDragEnd={handleDragEnd}
                      style={{ cursor: 'move' }}
                    >
                      {col.label}
                      {enableSort && sortConfig.key === col.key && (
                        <span className="sort-indicator">
                          {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </th>
                  ))}
                  {(onEdit || onDelete) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, idx) => (
                  <tr key={row.id || idx}>
                    {enableCheckbox && (
                      <td style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row._id || row.id)}
                          onChange={() => handleSelectRow(row._id || row.id)}
                        />
                      </td>
                    )}
                    {visibleColumnDefs.map((col) => (
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
                            Delete
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
                Page {currentPage + 1} of {totalPages} ({filteredRows.length} {filteredRows.length === 1 ? 'record' : 'records'})
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
        </>
      )}
    </div>
  );
};

export default DataGrid;
