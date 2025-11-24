const mongoose = require('mongoose');

const fileImportSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    filePath: {
      type: String,
      required: true,
      trim: true,
    },
    exportSetId: {
      type: String,
      trim: true,
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: false,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    status: {
      type: String,
      enum: ['Uploaded', 'Processing', 'Completed', 'Failed'],
      default: 'Uploaded',
    },
    recordsProcessed: {
      type: Number,
      default: 0,
    },
    recordsCreated: {
      type: Number,
      default: 0,
    },
    recordsUpdated: {
      type: Number,
      default: 0,
    },
    recordsSkipped: {
      type: Number,
      default: 0,
    },
    errors: {
      type: [String],
      default: [],
    },
    processingNotes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FileImport', fileImportSchema);
