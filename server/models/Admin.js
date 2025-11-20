/*
  Legacy Admin model shim.
  The legacy Admin schema has been archived to `Admin.legacy.js`.
  Keep this shim so any scripts still requiring `models/Admin` continue to work,
  but prefer importing `models/Admin.legacy` explicitly for clarity.
*/
console.warn('Warning: using legacy Admin model shim (models/Admin.js). Use models/Admin.legacy.js instead.');
module.exports = require('./Admin.legacy');
