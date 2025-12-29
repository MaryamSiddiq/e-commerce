const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username '],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  contact: {
    type: String,
    required: [true, 'Please provide a contact number'],
    match: [/^[0-9]{10,15}$/, 'Please provide a valid contact number']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: [true, 'Please select gender']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true
});

// OPTION 1: Use async function without next parameter (recommended)
userSchema.pre('save', async function() {
  // Only hash the password if it's modified or new
  if (!this.isModified('password')) {
    return;
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// OPTION 2: If Option 1 doesn't work, try this Promise-based approach
// userSchema.pre('save', function() {
//   if (!this.isModified('password')) {
//     return Promise.resolve();
//   }
  
//   return bcrypt.genSalt(10)
//     .then(salt => bcrypt.hash(this.password, salt))
//     .then(hash => {
//       this.password = hash;
//     })
//     .catch(err => {
//       throw err;
//     });
// });

// OPTION 3: If both above don't work, try this callback-based approach
// userSchema.pre('save', function(next) {
//   const user = this;
  
//   // Only hash the password if it's modified or new
//   if (!user.isModified('password')) {
//     return next();
//   }
  
//   bcrypt.genSalt(10, function(err, salt) {
//     if (err) return next(err);
    
//     bcrypt.hash(user.password, salt, function(err, hash) {
//       if (err) return next(err);
      
//       user.password = hash;
//       next();
//     });
//   });
// });

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Optional: Add a method to hash password manually (for password reset)
userSchema.methods.hashPassword = async function(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

module.exports = mongoose.model('User', userSchema);