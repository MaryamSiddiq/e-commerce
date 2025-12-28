const User = require('../models/User');
const OTP = require('../models/OTP');
const { generateToken } = require('../utils/generateToken');
const { generateOTP } = require('../utils/generateOTP');
const { sendEmail } = require('../utils/sendEmail');

// Validation helper
const validateSignup = (data) => {
  const errors = {};
  
  if (!data.username || data.username.trim().length < 3) {
    errors.username = 'Username must be at least 3 characters';
  }
  
  if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) {
    errors.email = 'Please provide a valid email';
  }
  
  if (!data.password || data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }
  
  if (!data.contact || !/^[0-9]{10,15}$/.test(data.contact)) {
    errors.contact = 'Please provide a valid contact number (10-15 digits)';
  }
  
  if (!data.gender || !['male', 'female', 'other'].includes(data.gender)) {
    errors.gender = 'Please select a valid gender';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
// @desc    Register user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res, next) => {
  try {
    const { username, email, password, contact, gender } = req.body;

    // Validate input
    const validation = validateSignup(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ 
      $or: [{ email }, { username }, { contact }] 
    });
    
    if (userExists) {
      let message = 'User already exists';
      if (userExists.email === email) message = 'Email already registered';
      else if (userExists.username === username) message = 'Username already taken';
      else if (userExists.contact === contact) message = 'Contact number already registered';
      
      return res.status(400).json({
        success: false,
        message
      });
    }

    // Create user (email not verified yet)
    const user = await User.create({
      username,
      email,
      password,
      contact,
      gender,
      isEmailVerified: false
    });

    // Generate OTP for email verification
    const otp = generateOTP();
    await OTP.create({
      email,
      otp,
      type: 'email_verification'
    });

    // Send OTP email
    await sendEmail({
      to: email,
      subject: 'Email Verification OTP',
      text: `Welcome ${username}! Your OTP for email verification is: ${otp}. Valid for 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Our Platform!</h2>
          <p>Hello ${username},</p>
          <p>Thank you for registering. Please use the OTP below to verify your email address:</p>
          <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <p>Best regards,<br>The Team</p>
        </div>
      `
    });

    // Generate token (restricted access until email verification)
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email with the OTP sent.',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          contact: user.contact,
          gender: user.gender,
          isEmailVerified: user.isEmailVerified
        },
        token
      }
    });
  } catch (error) {
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
      
      return res.status(400).json({
        success: false,
        message
      });
    }
    
    // Handle bcrypt or other errors
    if (error.message && error.message.includes('password')) {
      return res.status(400).json({
        success: false,
        message: 'Password hashing failed'
      });
    }
    
    // Pass to error handler middleware for other errors
    next(error);
  }
};
// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if email and password provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check if password matches
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      // Optionally resend verification OTP
      const otp = generateOTP();
      await OTP.deleteMany({ email, type: 'email_verification' });
      await OTP.create({ email, otp, type: 'email_verification' });
      
      await sendEmail({
        to: email,
        subject: 'Email Verification Required',
        text: `Your OTP for email verification is: ${otp}. Valid for 10 minutes.`
      });

      return res.status(403).json({
        success: false,
        message: 'Email not verified. A new verification OTP has been sent to your email.',
        requiresVerification: true
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          contact: user.contact,
          gender: user.gender,
          isEmailVerified: user.isEmailVerified,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp, type } = req.body;

    // Find OTP record
    const otpRecord = await OTP.findOne({
      email,
      otp,
      type,
      isUsed: false,
      expiresAt: { $gt: Date.now() }
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Update user verification status
    if (type === 'email_verification') {
      const user = await User.findOneAndUpdate(
        { email },
        { isEmailVerified: true },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Generate new token with verified status
      const token = generateToken(user._id);

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            contact: user.contact,
            gender: user.gender,
            isEmailVerified: user.isEmailVerified,
          },
          token
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res, next) => {
  try {
    const { email, type } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    
    // Delete old OTPs for this email and type
    await OTP.deleteMany({ email, type });

    // Create new OTP record
    await OTP.create({
      email,
      otp,
      type
    });

    // Send OTP email
    const subject = type === 'email_verification' 
      ? 'Email Verification OTP' 
      : 'Password Reset OTP';
    
    const text = type === 'email_verification'
      ? `Hello ${user.username}! Your email verification OTP is: ${otp}. Valid for 10 minutes.`
      : `Your password reset OTP is: ${otp}. Valid for 10 minutes.`;

    await sendEmail({
      to: email,
      subject,
      text
    });

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password - send reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email'
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Delete old password reset OTPs
    await OTP.deleteMany({ email, type: 'password_reset' });

    // Create new OTP record
    await OTP.create({
      email,
      otp,
      type: 'password_reset'
    });

    // Send OTP email
    await sendEmail({
      to: email,
      subject: 'Password Reset OTP',
      text: `Hello ${user.username}! Your password reset OTP is: ${otp}. Valid for 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello ${user.username},</p>
          <p>We received a request to reset your password. Use the OTP below to proceed:</p>
          <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
          <p>Best regards,<br>The Team</p>
        </div>
      `
    });

    res.status(200).json({
      success: true,
      message: 'Password reset OTP sent to your email'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Verify OTP
    const otpRecord = await OTP.findOne({
      email,
      otp,
      type: 'password_reset',
      isUsed: false,
      expiresAt: { $gt: Date.now() }
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Find user and update password
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.password = newPassword;
    await user.save();

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Send confirmation email
    await sendEmail({
      to: email,
      subject: 'Password Reset Successful',
      text: `Hello ${user.username}! Your password has been reset successfully. If you didn't make this change, please contact support immediately.`
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    next(error);
  }
};