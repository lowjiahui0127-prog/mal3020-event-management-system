const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Name must be 100 characters or fewer']
    },

    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address']
    },

    // select:false means normal queries never return the hash
    password: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: ['attendee', 'organiser'],
      default: 'attendee'
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Hash only when the password is new or changed (lower cost in tests for speed)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const rounds = process.env.NODE_ENV === 'test' ? 4 : 12;
  this.password = await bcrypt.hash(this.password, rounds);
});

userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

// Safety net: the password hash never leaves the server
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);