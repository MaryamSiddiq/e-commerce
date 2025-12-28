const nodemailer = require('nodemailer');

exports.sendEmail = async ({ to, subject, text, html }) => {
  try {
    // Create transporter with proper configuration
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false // For local development
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"E-Commerce App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};