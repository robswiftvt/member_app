const mongoose = require('mongoose');

const fileImportRowSchema = new mongoose.Schema(
  {
    fileImport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileImport',
      required: true,
      index: true,
    },
    rowId: {
      type: String,
      trim: true,
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: false,
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: false,
    },
    rowImportResult: {
      type: String,
      enum: ['Created', 'Updated', 'Unchanged', 'Skipped'],
      required: true,
    },
    exception: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FileImportRow', fileImportRowSchema);
