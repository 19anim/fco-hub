import mongoose from 'mongoose';

const adminUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['owner', 'manager'], required: true },
    permissions: [{ type: String }],
    status: {
      type: String,
      enum: ['active', 'disabled', 'pending_password_change'],
      default: 'active',
    },
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  {
    timestamps: true,
  }
);

adminUserSchema.index({ role: 1, status: 1 });

const AdminUser = mongoose.model('AdminUser', adminUserSchema);
export default AdminUser;
