const express = require('express');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');
const FileExport = require('../models/FileExport');
const FileImport = require('../models/FileImport');
const FileImportRow = require('../models/FileImportRow');
const Club = require('../models/Club');
const Member = require('../models/Member');

let XLSX = null;
try {
  XLSX = require('xlsx');
} catch (err) {
  console.warn('Optional dependency "xlsx" not installed. Export processing will be disabled.');
}

const router = express.Router();

// GET /api/file-exports - List all file exports
router.get('/', authMiddleware, async (req, res) => {
  try {
    const exports = await FileExport.find()
      .populate('fileImport', 'filename originalName exportSetId')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json(exports);
  } catch (err) {
    console.error('Error fetching file exports:', err);
    res.status(500).json({ error: 'Failed to fetch file exports' });
  }
});

// GET /api/file-exports/:id - Get single file export
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const fileExport = await FileExport.findById(req.params.id)
      .populate('fileImport', 'filename originalName exportSetId')
      .populate('createdBy', 'firstName lastName email');
    
    if (!fileExport) {
      return res.status(404).json({ error: 'File export not found' });
    }
    
    res.json(fileExport);
  } catch (err) {
    console.error('Error fetching file export:', err);
    res.status(500).json({ error: 'Failed to fetch file export' });
  }
});

// POST /api/file-exports - Create new file export
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { fileImportId, filename } = req.body;

    if (!fileImportId || !filename) {
      return res.status(400).json({ error: 'fileImportId and filename are required' });
    }

    // Verify fileImport exists
    const fileImport = await FileImport.findById(fileImportId);
    if (!fileImport) {
      return res.status(404).json({ error: 'File import not found' });
    }

    const fileExport = new FileExport({
      fileImport: fileImportId,
      filename: filename.trim(),
      createdBy: req.user.memberId,
      status: 'Pending',
    });

    await fileExport.save();

    const populated = await FileExport.findById(fileExport._id)
      .populate('fileImport', 'filename originalName exportSetId')
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      message: 'File export created successfully',
      fileExport: populated,
    });
  } catch (err) {
    console.error('Create export error:', err);
    res.status(500).json({ error: 'Failed to create file export' });
  }
});

// DELETE /api/file-exports/:id - Delete file export record
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const role = req.user?.adminType || '';
    if (!['System Admin', 'Club Admin', 'System', 'Club'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const fileExport = await FileExport.findById(req.params.id);
    if (!fileExport) {
      return res.status(404).json({ error: 'File export not found' });
    }

    await FileExport.findByIdAndDelete(req.params.id);
    res.json({ message: 'File export deleted successfully' });
  } catch (err) {
    console.error('Error deleting file export:', err);
    res.status(500).json({ error: 'Failed to delete file export' });
  }
});

// POST /api/file-exports/:id/process - Process export and generate Excel file
router.post('/:id/process', authMiddleware, async (req, res) => {
  try {
    const role = req.user?.adminType || '';
    if (!['System Admin', 'Club Admin', 'System', 'Club'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to process exports' });
    }

    const fileExport = await FileExport.findById(req.params.id)
      .populate('fileImport');
    
    if (!fileExport) {
      return res.status(404).json({ error: 'File export not found' });
    }

    if (!XLSX) {
      return res.status(500).json({ error: 'Excel processing library not available' });
    }

    // Update status to Processing
    fileExport.status = 'Processing';
    await fileExport.save();

    try {
      // Get all FileImportRows for this import
      const importRows = await FileImportRow.find({ fileImport: fileExport.fileImport._id })
        .populate('club')
        .populate('member')
        .sort({ createdAt: 1 });

      // Prepare Excel data
      const rows = [];
      
      for (const importRow of importRows) {
        const club = importRow.club;
        const member = importRow.member;
        
        // Format dates
        const formatDate = (date) => {
          if (!date) return '';
          const d = new Date(date);
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const year = d.getFullYear();
          return `${month}/${day}/${year}`;
        };

        const row = {
          'RowID': importRow.rowId || '',
          'Exception': importRow.exception || '',
          'NFRWContact': member?.nfrwContactId || '',
          'ClubName': club?.name || '',
          'CharterNumber': club?.charterNumber || '',
          'ClubState': club?.state || '',
          'Prefix': member?.prefix || '',
          'LastName': member?.lastName || '',
          'FirstName': member?.firstName || '',
          'MiddleName': member?.middleName || '',
          'BadgeNickName': member?.badgeNickname || '',
          'Suffix': member?.suffix || '',
          'Address_Line_1': member?.streetAddress || '',
          'Address_Line_2': member?.address2 || '',
          'City': member?.city || '',
          'State': member?.state || '',
          'Zip': member?.zip || '',
          'PrimaryPhone': member?.phone || '',
          'PhoneType': member?.phoneType || '',
          'Email': member?.email || '',
          'MemberExpirationDate': formatDate(member?.membershipExpiration),
          'MembershipType': member?.membershipType || '',
          'Associate_PrimaryMbrInfo': member?.associatePrimaryMember || '',
          'Gender': member?.gender || '',
          'Occupation': member?.occupation || '',
          'Employer': member?.employer || '',
          'PaidThruYear': '', // Unmapped
          'ReportNumber': '', // Unmapped
          'CheckNumber': '', // Unmapped
          'AmountPaid': '', // Unmapped
          'DateOfBirth': formatDate(member?.dateOfBirth),
          'Deceased?': member?.deceased ? 'Yes' : 'No',
          'LocalClubMemberID': '', // Unmapped
          'ExportSetID': fileExport.fileImport.exportSetId || '',
        };

        rows.push(row);
      }

      // Create Excel workbook
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');

      // Create export directory
      const exportDir = path.join(__dirname, '..', 'uploads', 'nfrw_export');
      fs.mkdirSync(exportDir, { recursive: true });

      // Generate filename with timestamp
      const timestamp = Date.now();
      const cleanFilename = fileExport.filename.replace(/[^a-zA-Z0-9\.\-\_]/g, '_');
      const filename = `${timestamp}-${cleanFilename}`;
      const fullFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
      const filePath = path.join(exportDir, fullFilename);

      // Write Excel file
      XLSX.writeFile(workbook, filePath);

      // Update FileExport record
      fileExport.status = 'Completed';
      fileExport.filePath = `/uploads/nfrw_export/${fullFilename}`;
      fileExport.recordsExported = rows.length;
      await fileExport.save();

      const populated = await FileExport.findById(fileExport._id)
        .populate('fileImport', 'filename originalName exportSetId')
        .populate('createdBy', 'firstName lastName email');

      res.json({
        message: 'Export processed successfully',
        fileExport: populated,
      });
    } catch (err) {
      // Update status to Failed
      fileExport.status = 'Failed';
      fileExport.errors = [err.message || String(err)];
      await fileExport.save();
      throw err;
    }
  } catch (err) {
    console.error('Export processing error:', err);
    res.status(500).json({ error: 'Failed to process export', details: err.message });
  }
});

module.exports = router;
