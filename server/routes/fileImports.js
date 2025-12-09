const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const FileImport = require('../models/FileImport');
const FileImportRow = require('../models/FileImportRow');
const Club = require('../models/Club');
const Member = require('../models/Member');

let XLSX = null;
try {
  XLSX = require('xlsx');
} catch (err) {
  console.warn('Optional dependency "xlsx" not installed. ExportSetID extraction will be skipped.');
}

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const clubId = req.query.clubId || 'system';
      const dir = path.join(__dirname, '..', 'uploads', 'nfrw_import', String(clubId));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: function (req, file, cb) {
    const ts = Date.now();
    const clean = file.originalname.replace(/[^a-zA-Z0-9\.\-\_]/g, '_');
    cb(null, `${ts}-${clean}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/file-imports - List all file imports
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { clubId } = req.query;
    const query = clubId ? { club: clubId } : {};
    
    const imports = await FileImport.find(query)
      .populate('club', 'name')
      .populate('uploadedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json(imports);
  } catch (err) {
    console.error('Error fetching file imports:', err);
    res.status(500).json({ error: 'Failed to fetch file imports' });
  }
});

// GET /api/file-imports/:id - Get single file import
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const fileImport = await FileImport.findById(req.params.id)
      .populate('club', 'name')
      .populate('uploadedBy', 'firstName lastName email');
    
    if (!fileImport) {
      return res.status(404).json({ error: 'File import not found' });
    }
    
    res.json(fileImport);
  } catch (err) {
    console.error('Error fetching file import:', err);
    res.status(500).json({ error: 'Failed to fetch file import' });
  }
});

// POST /api/file-imports - Upload new file
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    // Basic role check - allow System Admin or Club Admin
    const role = req.user?.adminType || '';
    if (!['System Admin', 'Club Admin', 'System', 'Club'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to upload files' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const clubId = req.query.clubId || null;
    const relPath = clubId 
      ? `/uploads/nfrw_import/${clubId}/${req.file.filename}`
      : `/uploads/nfrw_import/system/${req.file.filename}`;

    // Extract ExportSetID from the file if xlsx is available
    let exportSetId = null;
    if (XLSX) {
      try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        
        if (rows.length > 0) {
          const firstRow = rows[0];
          // Look for ExportSetID column (try various name variants)
          const exportSetKeys = ['ExportSetID', 'ExportSetId', 'exportSetId', 'exportSetID', 'Export Set ID', 'ExportSet'];
          for (const key of exportSetKeys) {
            if (firstRow[key]) {
              exportSetId = String(firstRow[key]).trim();
              break;
            }
          }
        }
      } catch (err) {
        console.warn('Failed to extract ExportSetID from file:', err.message);
      }
    }

    // Create FileImport record
    const fileImport = new FileImport({
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: relPath,
      exportSetId,
      club: clubId,
      uploadedBy: req.user.memberId,
      status: 'Uploaded',
    });

    await fileImport.save();

    res.status(201).json({
      message: 'File uploaded successfully',
      fileImport,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// DELETE /api/file-imports/:id - Delete file import record
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const role = req.user?.adminType || '';
    if (!['System Admin', 'Club Admin', 'System', 'Club'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const fileImport = await FileImport.findById(req.params.id);
    if (!fileImport) {
      return res.status(404).json({ error: 'File import not found' });
    }

    await FileImport.findByIdAndDelete(req.params.id);
    res.json({ message: 'File import deleted successfully' });
  } catch (err) {
    console.error('Error deleting file import:', err);
    res.status(500).json({ error: 'Failed to delete file import' });
  }
});

// POST /api/file-imports/:id/process - Process uploaded file
router.post('/:id/process', authMiddleware, async (req, res) => {
  try {
    const role = req.user?.adminType || '';
    if (!['System Admin', 'Club Admin', 'System', 'Club'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to process files' });
    }

    const fileImport = await FileImport.findById(req.params.id);
    if (!fileImport) {
      return res.status(404).json({ error: 'File import not found' });
    }

    if (!XLSX) {
      return res.status(500).json({ error: 'Excel processing library not available' });
    }

    // Update status to Processing
    fileImport.status = 'Processing';
    await fileImport.save();

    // Read and parse the Excel file
    const filePath = path.join(__dirname, '..', fileImport.filePath.replace(/^\//, ''));
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

    const results = { created: 0, updated: 0, unchanged: 0, skipped: 0, errors: [] };

    // Helper to get field value from row with multiple possible column names
    const getField = (row, variants) => {
      for (const k of variants) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
          return String(row[k]).trim();
        }
      }
      return '';
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let rowImportResult = 'Skipped';
      let exception = null;
      let clubId = null;
      let memberId = null;

      try {
        // Extract RowID
        const rowId = getField(row, ['RowID', 'Row ID', 'rowId', 'ID']);

        // Extract Club info
        const clubName = getField(row, ['ClubName', 'Club Name', 'clubName']);
        const charterNumber = getField(row, ['CharterNumber', 'Charter Number', 'charterNumber']);
        const clubState = getField(row, ['ClubState', 'Club State', 'State', 'clubState']);

        if (!charterNumber) {
          results.skipped++;
          exception = 'Missing CharterNumber';
          results.errors.push({ row: i + 2, reason: exception });
          
          // Create FileImportRow for skipped row
          await FileImportRow.create({
            fileImport: fileImport._id,
            rowId,
            rowImportResult: 'Skipped',
            exception,
          });
          continue;
        }

        // Find or create Club by CharterNumber
        let club = await Club.findOne({ charterNumber });
        if (!club) {
          club = new Club({
            name: clubName || `Club ${charterNumber}`,
            charterNumber,
            state: clubState,
            location: clubState,
            status: 'Active',
          });
          await club.save();
          console.log(`Created new club: ${club.name} (${charterNumber})`);
        }

        clubId = club._id;

        // Extract Member info
        const nfrwContactId = getField(row, ['NFRWContact', 'NFRW Contact', 'nfrwContact']);
        const prefix = getField(row, ['Prefix', 'prefix']);
        const firstName = getField(row, ['FirstName', 'First Name', 'firstName']);
        const middleName = getField(row, ['MiddleName', 'Middle Name', 'middleName']);
        const lastName = getField(row, ['LastName', 'Last Name', 'lastName']);
        const badgeNickname = getField(row, ['BadgeNickName', 'Badge Nickname', 'badgeNickname']);
        const suffix = getField(row, ['Suffix', 'suffix']);
        const streetAddress = getField(row, ['Address_Line_1', 'Address Line 1', 'Address1', 'streetAddress']);
        const address2 = getField(row, ['Address_Line_2', 'Address Line 2', 'Address2', 'address2']);
        const city = getField(row, ['City', 'city']);
        const state = getField(row, ['State', 'state']);
        const zip = getField(row, ['Zip', 'ZipCode', 'zip']);
        const phone = getField(row, ['PrimaryPhone', 'Primary Phone', 'Phone', 'phone']);
        const phoneType = getField(row, ['PhoneType', 'Phone Type', 'phoneType']);
        const emailRaw = getField(row, ['Email', 'email']);
        const membershipExpirationRaw = getField(row, ['MemberExpirationDate', 'Member Expiration Date', 'Expiration', 'membershipExpiration']);
        const membershipType = getField(row, ['MembershipType', 'Membership Type', 'membershipType']);
        const associatePrimaryMember = getField(row, ['Associate_PrimaryMbrInfo', 'Associate Primary Member', 'associatePrimary']);
        const gender = getField(row, ['Gender', 'gender']);
        const occupation = getField(row, ['Occupation', 'occupation']);
        const employer = getField(row, ['Employer', 'employer']);
        const dateOfBirthRaw = getField(row, ['DateOfBirth', 'Date Of Birth', 'DOB', 'dateOfBirth']);
        const deceasedRaw = getField(row, ['Deceased?', 'Deceased', 'deceased']);

        if (!firstName || !lastName) {
          results.skipped++;
          exception = 'Missing required firstName/lastName';
          results.errors.push({ row: i + 2, reason: exception });
          
          // Create FileImportRow for skipped row
          await FileImportRow.create({
            fileImport: fileImport._id,
            rowId,
            club: clubId,
            rowImportResult: 'Skipped',
            exception,
          });
          continue;
        }

        const email = emailRaw ? emailRaw.toLowerCase() : null;
        const phoneNormalized = phone ? phone.replace(/\D/g, '') : null;

        // Parse dates
        let membershipExpiration = undefined;
        if (membershipExpirationRaw) {
          const d = new Date(membershipExpirationRaw);
          if (!isNaN(d.getTime())) membershipExpiration = d;
        }

        let dateOfBirth = undefined;
        if (dateOfBirthRaw) {
          const d = new Date(dateOfBirthRaw);
          if (!isNaN(d.getTime())) dateOfBirth = d;
        }

        // Parse deceased
        const deceased = ['yes', 'y', 'true', '1'].includes(String(deceasedRaw).toLowerCase());

        // Normalize membership type
        let normalizedMembershipType = 'Full';
        const mt = membershipType.toLowerCase();
        if (mt.includes('honor')) normalizedMembershipType = 'Honorary';
        else if (mt.includes('assoc')) normalizedMembershipType = 'Associate';
        else if (mt.includes('inactive')) normalizedMembershipType = 'Inactive';

        // Normalize phone type
        let normalizedPhoneType = undefined;
        if (phoneType) {
          const pt = phoneType.toLowerCase();
          if (pt.includes('cell') || pt.includes('mobile')) normalizedPhoneType = 'Cell';
          else if (pt.includes('work') || pt.includes('office')) normalizedPhoneType = 'Work';
          else if (pt.includes('home')) normalizedPhoneType = 'Home';
        }

        // Find existing member
        let existing = null;

        // 1. Try to find by NFRWContactId
        if (nfrwContactId) {
          existing = await Member.findOne({ nfrwContactId });
        }

        // 2. If not found, try to find by firstName, lastName, and (email OR phone)
        if (!existing) {
          const candidates = await Member.find({ firstName, lastName, club: club._id });
          for (const cand of candidates) {
            // Match by email
            if (email && cand.email && String(cand.email).toLowerCase() === email) {
              existing = cand;
              break;
            }
            // Match by phone
            if (phoneNormalized && cand.phoneNormalized && cand.phoneNormalized === phoneNormalized) {
              existing = cand;
              break;
            }
          }
        }

        if (existing) {
          // Check if any fields have changed
          let hasChanges = false;
          
          const newNfrwContactId = nfrwContactId || existing.nfrwContactId;
          const newPrefix = prefix || existing.prefix;
          const newFirstName = firstName;
          const newLastName = lastName;
          const newMiddleName = middleName || existing.middleName;
          const newBadgeNickname = badgeNickname || existing.badgeNickname;
          const newSuffix = suffix || existing.suffix;
          const newStreetAddress = streetAddress || existing.streetAddress;
          const newAddress2 = address2 || existing.address2;
          const newCity = city || existing.city;
          const newState = state || existing.state;
          const newZip = zip || existing.zip;
          const newPhone = phone || existing.phone;
          const newPhoneType = normalizedPhoneType || existing.phoneType;
          const newMembershipType = normalizedMembershipType || existing.membershipType;
          const newAssociatePrimaryMember = associatePrimaryMember || existing.associatePrimaryMember;
          const newGender = gender || existing.gender;
          const newOccupation = occupation || existing.occupation;
          const newEmployer = employer || existing.employer;
          const newDeceased = deceased;
          const newEmail = email || existing.email;
          const newMembershipExpiration = membershipExpiration || existing.membershipExpiration;
          const newDateOfBirth = dateOfBirth || existing.dateOfBirth;
          const newClub = club._id;
          
          // Helper to compare dates
          const datesEqual = (d1, d2) => {
            if (!d1 && !d2) return true;
            if (!d1 || !d2) return false;
            return new Date(d1).getTime() === new Date(d2).getTime();
          };
          
          // Check each field for changes
          if (existing.nfrwContactId !== newNfrwContactId) hasChanges = true;
          if (existing.prefix !== newPrefix) hasChanges = true;
          if (existing.firstName !== newFirstName) hasChanges = true;
          if (existing.lastName !== newLastName) hasChanges = true;
          if (existing.middleName !== newMiddleName) hasChanges = true;
          if (existing.badgeNickname !== newBadgeNickname) hasChanges = true;
          if (existing.suffix !== newSuffix) hasChanges = true;
          if (existing.streetAddress !== newStreetAddress) hasChanges = true;
          if (existing.address2 !== newAddress2) hasChanges = true;
          if (existing.city !== newCity) hasChanges = true;
          if (existing.state !== newState) hasChanges = true;
          if (existing.zip !== newZip) hasChanges = true;
          if (existing.phone !== newPhone) hasChanges = true;
          if (existing.phoneType !== newPhoneType) hasChanges = true;
          if (existing.membershipType !== newMembershipType) hasChanges = true;
          if (existing.associatePrimaryMember !== newAssociatePrimaryMember) hasChanges = true;
          if (existing.gender !== newGender) hasChanges = true;
          if (existing.occupation !== newOccupation) hasChanges = true;
          if (existing.employer !== newEmployer) hasChanges = true;
          if (existing.deceased !== newDeceased) hasChanges = true;
          if (existing.email !== newEmail) hasChanges = true;
          if (!datesEqual(existing.membershipExpiration, newMembershipExpiration)) hasChanges = true;
          if (!datesEqual(existing.dateOfBirth, newDateOfBirth)) hasChanges = true;
          if (existing.club.toString() !== newClub.toString()) hasChanges = true;
          
          memberId = existing._id;
          
          if (hasChanges) {
            // Update existing member with data from import
            existing.nfrwContactId = newNfrwContactId;
            existing.prefix = newPrefix;
            existing.firstName = newFirstName;
            existing.lastName = newLastName;
            existing.middleName = newMiddleName;
            existing.badgeNickname = newBadgeNickname;
            existing.suffix = newSuffix;
            existing.streetAddress = newStreetAddress;
            existing.address2 = newAddress2;
            existing.city = newCity;
            existing.state = newState;
            existing.zip = newZip;
            existing.phone = newPhone;
            existing.phoneType = newPhoneType;
            existing.membershipType = newMembershipType;
            existing.associatePrimaryMember = newAssociatePrimaryMember;
            existing.gender = newGender;
            existing.occupation = newOccupation;
            existing.employer = newEmployer;
            existing.deceased = newDeceased;
            existing.email = newEmail;
            existing.membershipExpiration = newMembershipExpiration;
            existing.dateOfBirth = newDateOfBirth;
            existing.club = newClub;
            
            await existing.save();
            rowImportResult = 'Updated';
            results.updated++;
          } else {
            // No changes detected
            rowImportResult = 'Unchanged';
            results.unchanged++;
          }
        } else {
          // Create new member
          const memberData = {
            nfrwContactId,
            firstName,
            lastName,
            prefix,
            middleName,
            badgeNickname,
            suffix,
            streetAddress,
            address2,
            city,
            state,
            zip,
            phone,
            phoneType: normalizedPhoneType,
            membershipType: normalizedMembershipType,
            membershipExpiration,
            associatePrimaryMember,
            gender,
            occupation,
            employer,
            dateOfBirth,
            deceased,
            club: club._id,
          };

          if (email) memberData.email = email;

          const member = new Member(memberData);
          await member.save();
          memberId = member._id;
          rowImportResult = 'Created';
          results.created++;
        }

        // Create FileImportRow for successful processing
        await FileImportRow.create({
          fileImport: fileImport._id,
          rowId,
          club: clubId,
          member: memberId,
          rowImportResult,
          exception: getField(row, ['Exception', 'exception']),
        });
      } catch (err) {
        results.skipped++;
        exception = err.message || String(err);
        results.errors.push({ row: i + 2, reason: exception });
        
        // Create FileImportRow for error
        await FileImportRow.create({
          fileImport: fileImport._id,
          rowId: getField(row, ['RowID', 'Row ID', 'rowId', 'ID']),
          club: clubId,
          member: memberId,
          rowImportResult: 'Skipped',
          exception,
        });
      }
    }

    // Update FileImport with results
    fileImport.status = 'Completed';
    fileImport.recordsProcessed = rows.length;
    fileImport.recordsCreated = results.created;
    fileImport.recordsUpdated = results.updated;
    fileImport.recordsSkipped = results.skipped;
    fileImport.errors = results.errors.map(e => `Row ${e.row}: ${e.reason}`);
    await fileImport.save();

    res.json({
      message: 'File processing completed',
      fileImport,
      results,
    });
  } catch (err) {
    console.error('Processing error:', err);
    
    // Update status to Failed if we have the fileImport
    try {
      const fileImport = await FileImport.findById(req.params.id);
      if (fileImport) {
        fileImport.status = 'Failed';
        fileImport.errors = [err.message || String(err)];
        await fileImport.save();
      }
    } catch (updateErr) {
      console.error('Failed to update import status:', updateErr);
    }

    res.status(500).json({ error: 'Failed to process file', details: err.message });
  }
});

module.exports = router;
