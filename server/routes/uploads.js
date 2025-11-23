const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
let XLSX = null;
try {
  XLSX = require('xlsx');
} catch (err) {
  console.warn('Optional dependency "xlsx" not installed. Upload parsing will be skipped. Run `npm install xlsx` to enable.');
}
const Member = require('../models/Member');

const router = express.Router();

const storage = multer.diskStorage({
  // destination depends on clubId query param; create per-club directory under uploads/nfrw_import/<clubId>
  destination: function (req, file, cb) {
    try {
      const clubId = req.query.clubId;
      if (!clubId) return cb(new Error('clubId query param required'));
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

// POST /api/uploads/nfrw_import?clubId=...  -> accepts single file field 'file'
router.post('/nfrw_import', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    // basic role check - allow System Admin or Club Admin
    const role = req.user?.adminType || '';
    if (!['System Admin', 'Club Admin', 'System', 'Club'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to import members' });
    }

    const clubId = req.query.clubId;
    if (!clubId) return res.status(400).json({ error: 'clubId query param required' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Parse uploaded Excel file and import members (basic mapping)
    const relPath = `/uploads/nfrw_import/${clubId}/${req.file.filename}`;
    const filePath = req.file.path;
    if (!XLSX) {
      console.warn('Skipping Excel parsing because xlsx module is not available.');
      return res.status(201).json({
        message: 'File uploaded (parsing skipped - xlsx not installed)',
        file: { filename: req.file.filename, path: relPath, originalName: req.file.originalname },
        clubId,
      });
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    const getField = (row, variants) => {
      for (const k of variants) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return row[k];
      }
      return '';
    };

    const firstKeys = ['First Name', 'FirstName', 'first_name', 'first', 'Given Name', 'GivenName', 'First'];
    const lastKeys = ['Last Name', 'LastName', 'last_name', 'last', 'Surname', 'Last'];
    const emailKeys = ['Email', 'email', 'E-mail', 'E-mail Address'];
    const phoneKeys = ['Phone', 'phone', 'Phone Number', 'Mobile', 'Mobile Phone'];
    const prefixKeys = ['Prefix', 'Title', 'Salutation'];
    const middleKeys = ['Middle Name', 'MiddleName', 'middle_name', 'Middle'];
    const badgeKeys = ['Badge Nickname', 'Badge', 'Nickname'];
    const suffixKeys = ['Suffix', 'Jr', 'Sr'];
    const streetKeys = ['Street Address', 'Address', 'Address1', 'address', 'Street'];
    const address2Keys = ['Address2', 'Address 2', 'Address Line 2', 'Addr2'];
    const cityKeys = ['City', 'Town'];
    const stateKeys = ['State', 'Region', 'Province'];
    const zipKeys = ['Zip', 'ZipCode', 'Postal Code', 'PostalCode', 'Postcode'];
    const membershipTypeKeys = ['Membership Type', 'membershipType', 'Type'];
    const membershipExpirationKeys = ['Membership Expiration', 'membershipExpiration', 'Expiration', 'Expiry', 'Membership Expiry'];
    const occupationKeys = ['Occupation', 'Job', 'Job Title', 'Title'];
    const employerKeys = ['Employer', 'Company', 'Organization', 'Organisation'];
    const deceasedKeys = ['Deceased', 'Dead', 'Is Deceased', 'Died'];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const firstName = String(getField(row, firstKeys) || '').trim();
        const lastName = String(getField(row, lastKeys) || '').trim();
        const emailRaw = String(getField(row, emailKeys) || '').trim();
        const phone = String(getField(row, phoneKeys) || '').trim();
        const prefix = String(getField(row, prefixKeys) || '').trim();
        const middleName = String(getField(row, middleKeys) || '').trim();
        const badgeNickname = String(getField(row, badgeKeys) || '').trim();
        const suffix = String(getField(row, suffixKeys) || '').trim();
        const streetAddress = String(getField(row, streetKeys) || '').trim();
        const address2 = String(getField(row, address2Keys) || '').trim();
        const city = String(getField(row, cityKeys) || '').trim();
        const state = String(getField(row, stateKeys) || '').trim();
        const zip = String(getField(row, zipKeys) || '').trim();
        let membershipType = String(getField(row, membershipTypeKeys) || '').trim();
        let membershipExpirationRaw = getField(row, membershipExpirationKeys) || '';
        const occupation = String(getField(row, occupationKeys) || '').trim();
        const employer = String(getField(row, employerKeys) || '').trim();
        const deceasedRaw = String(getField(row, deceasedKeys) || '').trim();

        if (!firstName || !lastName) {
          results.skipped++;
          results.errors.push({ row: i + 2, reason: 'missing required firstName/lastName' });
          continue;
        }

        const email = emailRaw ? emailRaw.toLowerCase() : null;

        // normalize membershipType
        const mt = (membershipType || '').toLowerCase();
        if (mt.includes('honor')) membershipType = 'Honorary';
        else if (mt.includes('assoc')) membershipType = 'Associate';
        else if (mt.includes('inactive')) membershipType = 'Inactive';
        else membershipType = 'Full';

        // parse expiration
        let membershipExpiration = undefined;
        if (membershipExpirationRaw) {
          if (membershipExpirationRaw instanceof Date) membershipExpiration = membershipExpirationRaw;
          else {
            const d = new Date(String(membershipExpirationRaw));
            if (!isNaN(d.getTime())) membershipExpiration = d;
          }
        }

        // check existing: only consider a duplicate when firstName+lastName match AND
        // either email or phone also match. Prefer email match, then phone match.
        let existing = null;
        const normalizedPhone = phone ? String(phone).replace(/\D/g, '') : null;

        if (email) {
          existing = await Member.findOne({ email });
        }

        if (!existing && (normalizedPhone || true)) {
          // find potential candidates with same first+last+club
          const candidates = await Member.find({ firstName, lastName, club: clubId });
          for (const cand of candidates) {
            // email match
            if (email && cand.email && String(cand.email).toLowerCase() === String(email).toLowerCase()) {
              existing = cand;
              break;
            }

            // phone match (normalize both, compare full digits)
            if (normalizedPhone && cand.phone) {
              const candPhoneNorm = String(cand.phone).replace(/\D/g, '');
              if (candPhoneNorm && candPhoneNorm === normalizedPhone) {
                existing = cand;
                break;
              }
            }
          }
        }
        if (existing) {
          // update some fields
          let changed = false;
          if (!existing.firstName && firstName) { existing.firstName = firstName; changed = true; }
          if (!existing.lastName && lastName) { existing.lastName = lastName; changed = true; }
          if (!existing.phone && phone) { existing.phone = phone; changed = true; }
          if (!existing.membershipType && membershipType) { existing.membershipType = membershipType; changed = true; }
          if (!existing.membershipExpiration && membershipExpiration) { existing.membershipExpiration = membershipExpiration; changed = true; }
          if (!existing.club) { existing.club = clubId; changed = true; }
          if (!existing.prefix && prefix) { existing.prefix = prefix; changed = true; }
          if (!existing.middleName && middleName) { existing.middleName = middleName; changed = true; }
          if (!existing.badgeNickname && badgeNickname) { existing.badgeNickname = badgeNickname; changed = true; }
          if (!existing.suffix && suffix) { existing.suffix = suffix; changed = true; }
          if (!existing.streetAddress && streetAddress) { existing.streetAddress = streetAddress; changed = true; }
          if (!existing.address2 && address2) { existing.address2 = address2; changed = true; }
          if (!existing.city && city) { existing.city = city; changed = true; }
          if (!existing.state && state) { existing.state = state; changed = true; }
          if (!existing.zip && zip) { existing.zip = zip; changed = true; }
          if (!existing.occupation && occupation) { existing.occupation = occupation; changed = true; }
          if (!existing.employer && employer) { existing.employer = employer; changed = true; }
          if (typeof existing.deceased === 'undefined' && deceasedRaw) {
            const d = String(deceasedRaw).toLowerCase();
            if (['yes','y','true','1'].includes(d)) { existing.deceased = true; changed = true; }
            else if (['no','n','false','0'].includes(d)) { existing.deceased = false; changed = true; }
          }
          if (changed) {
            await existing.save();
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          const docData = { firstName, lastName, phone, membershipType, membershipExpiration, club: clubId };
          if (email) docData.email = email;
          if (prefix) docData.prefix = prefix;
          if (middleName) docData.middleName = middleName;
          if (badgeNickname) docData.badgeNickname = badgeNickname;
          if (suffix) docData.suffix = suffix;
          if (streetAddress) docData.streetAddress = streetAddress;
          if (address2) docData.address2 = address2;
          if (city) docData.city = city;
          if (state) docData.state = state;
          if (zip) docData.zip = zip;
          if (occupation) docData.occupation = occupation;
          if (employer) docData.employer = employer;
          if (deceasedRaw) {
            const d = String(deceasedRaw).toLowerCase();
            if (['yes','y','true','1'].includes(d)) docData.deceased = true;
            else if (['no','n','false','0'].includes(d)) docData.deceased = false;
          }
          const doc = new Member(docData);
          await doc.save();
          results.created++;
        }
      } catch (errRow) {
        results.skipped++;
        results.errors.push({ row: i + 2, reason: errRow.message || String(errRow) });
      }
    }

    res.status(201).json({
      message: 'File uploaded and processed',
      file: { filename: req.file.filename, path: relPath, originalName: req.file.originalname },
      clubId,
      results,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

module.exports = router;
