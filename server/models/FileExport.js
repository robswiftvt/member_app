const mongoose = require('mongoose');

const fileExportSchema = new mongoose.Schema(
  {
    fileImport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileImport',
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    filePath: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Completed', 'Failed'],
      default: 'Pending',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    recordsExported: {
      type: Number,
      default: 0,
    },
    errors: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FileExport', fileExportSchema);
