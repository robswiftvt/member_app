const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const FileImportRow = require('../models/FileImportRow');

const router = express.Router();

// GET /api/file-import-rows - List file import rows
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { fileImportId } = req.query;
    
    if (!fileImportId) {
      return res.status(400).json({ error: 'fileImportId is required' });
    }
    
    const rows = await FileImportRow.find({ fileImport: fileImportId })
      .populate('club', 'name charterNumber')
      .populate('member', 'firstName lastName email')
      .sort({ createdAt: 1 });
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching file import rows:', err);
    res.status(500).json({ error: 'Failed to fetch file import rows' });
  }
});

module.exports = router;
