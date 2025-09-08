const nodemailer = require('nodemailer');

// Create persistent transporter with optimized settings
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  pool: true,
  maxConnections: 10,
  maxMessages: 100,
  rateLimit: 14,
  socketTimeout: 30000,
  greetingTimeout: 10000,
  connectionTimeout: 10000
});

// Send password reset email (optimized for speed)
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  try {
    if (!email || !resetToken || !userName) {
      throw new Error('Missing required parameters');
    }
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?reset=${resetToken}`;
    
    const result = await transporter.sendMail({
      from: `"HostelWork" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - HostelWork',
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;padding:20px">
        <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:white;padding:25px;text-align:center;border-radius:8px">
          <h1 style="margin:0;font-size:24px">🏠 HostelWork</h1>
          <h2 style="margin:10px 0 0 0;font-size:18px;font-weight:normal">Password Reset Request</h2>
        </div>
        <div style="background:white;padding:25px;margin-top:0">
          <p style="color:#333;margin:0 0 15px 0">Hello <strong>${userName}</strong>,</p>
          <p style="color:#666;line-height:1.5;margin:15px 0">We received a request to reset your password for your HostelWork account.</p>
          <div style="background:#e3f2fd;border-left:4px solid #2196f3;padding:15px;margin:20px 0">
            <h3 style="margin:0 0 10px 0;color:#1976d2">🔑 Reset Token:</h3>
            <div style="background:white;padding:12px;border-radius:4px;font-family:monospace;font-size:14px;color:#1976d2;word-break:break-all;border:1px solid #ddd">
              ${resetToken}
            </div>
          </div>
          <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:15px;margin:20px 0">
            <p style="margin:0;color:#856404">⚠️ This token expires in 10 minutes for your security</p>
          </div>
          <div style="text-align:center;margin:25px 0">
            <a href="${resetUrl}" style="background:#6366f1;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block">🔄 Reset Password Now</a>
          </div>
          <p style="color:#666;margin:20px 0 0 0">Best regards,</p>
          <p style="color:#666;margin:5px 0 0 0"><strong>HostelWork Support Team</strong></p>
          <div style="margin-top:30px;padding-top:20px;border-top:1px solid #eee;text-align:center">
            <p style="color:#999;font-size:12px;margin:0">This is an automated password reset email. Please do not reply.</p>
            <p style="color:#999;font-size:12px;margin:5px 0 0 0">© 2025 HostelWork. All rights reserved.</p>
          </div>
        </div>
      </div>`
    });
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Send welcome email (optimized for speed)
const sendWelcomeEmail = async (email, userName, password, role) => {
  try {
    if (!email || !userName || !password || !role) {
      throw new Error('Missing required parameters');
    }
    
    const result = await transporter.sendMail({
      from: `"HostelWork" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to HostelWork!',
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;padding:20px">
        <div style="background:#1db584;color:white;padding:20px;text-align:center;border-radius:8px">
          <h1 style="margin:0;font-size:24px">🏠 HostelWork</h1>
          <h2 style="margin:10px 0 0 0;font-size:18px;font-weight:normal">Welcome to HostelWork!</h2>
        </div>
        <div style="background:white;padding:20px;margin-top:0">
          <p style="color:#333;margin:0 0 15px 0">Hello ${userName},</p>
          <div style="background:#e3f2fd;border-left:4px solid #2196f3;padding:12px;margin:15px 0">
            <p style="margin:0;color:#1976d2">⚡ Your ${role} account has been successfully created!</p>
          </div>
          <div style="background:#f0f8f0;border:2px solid #4caf50;border-radius:8px;padding:15px;margin:20px 0">
            <h3 style="margin:0 0 10px 0;color:#2e7d32">🔑 Your Login Credentials</h3>
            <div style="margin:10px 0">
              <strong>Email:</strong><br>
              <div style="background:white;padding:8px;border:1px solid #ddd;border-radius:4px;margin:5px 0;font-family:monospace">${email}</div>
            </div>
            <div style="margin:10px 0">
              <strong>Temporary Password:</strong><br>
              <div style="background:white;padding:8px;border:1px solid #ddd;border-radius:4px;margin:5px 0;font-family:monospace">${password}</div>
            </div>
          </div>
          <div style="background:#fff3cd;border:2px solid #ffc107;border-radius:8px;padding:15px;margin:20px 0">
            <p style="margin:0;color:#856404"><strong>🛡️ IMPORTANT:</strong> Change your password after first login.</p>
          </div>
          <div style="text-align:center;margin:15px 0">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background:#28a745;color:white;padding:10px 25px;text-decoration:none">Login Now</a>
          </div>
          <p style="color:#666;margin:20px 0 0 0">Welcome aboard!</p>
          <p style="color:#666;margin:5px 0 0 0"><strong>The HostelWork Team</strong></p>
          <div style="margin-top:30px;padding-top:20px;border-top:1px solid #eee;text-align:center">
            <p style="color:#999;font-size:12px;margin:0">This is an automated welcome email. Please do not reply.</p>
            <p style="color:#999;font-size:12px;margin:5px 0 0 0">© 2025 HostelWork. All rights reserved.</p>
          </div>
        </div>
      </div>`
    });
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Send account deletion email (optimized for speed)
const sendAccountDeletionEmail = async (email, userName, role) => {
  try {
    if (!email || !userName || !role) {
      throw new Error('Missing required parameters');
    }
    
    const result = await transporter.sendMail({
      from: `"HostelWork" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Account Deletion Notice - HostelWork',
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;padding:20px">
        <div style="background:#dc3545;color:white;padding:25px;text-align:center;border-radius:8px">
          <h1 style="margin:0;font-size:24px">🏠 HostelWork</h1>
          <h2 style="margin:10px 0 0 0;font-size:18px;font-weight:normal">Account Deletion Notice</h2>
        </div>
        <div style="background:white;padding:25px;margin-top:0">
          <p style="color:#333;margin:0 0 15px 0">Hello <strong>${userName}</strong>,</p>
          <div style="background:#ffebee;border:2px solid #f44336;border-radius:8px;padding:15px;margin:20px 0">
            <p style="margin:0;color:#c62828;font-weight:bold">⚠️ Your ${role} account has been deleted</p>
          </div>
          <p style="color:#666;line-height:1.5;margin:15px 0">Your HostelWork ${role} account has been permanently deleted by the administrator.</p>
          <div style="background:#e3f2fd;border:1px solid #2196f3;border-radius:8px;padding:15px;margin:20px 0;text-align:center">
            <p style="margin:0;color:#1976d2">📞 Need assistance? Contact <a href="mailto:support@hostelwork.com" style="color:#1976d2">support@hostelwork.com</a></p>
          </div>
          <p style="color:#666;margin:20px 0 0 0">Thank you for using HostelWork.</p>
          <p style="color:#666;margin:5px 0 0 0"><strong>The HostelWork Team</strong></p>
          <div style="margin-top:30px;padding-top:20px;border-top:1px solid #eee;text-align:center">
            <p style="color:#999;font-size:12px;margin:0">This is an automated notification email. Please do not reply.</p>
            <p style="color:#999;font-size:12px;margin:5px 0 0 0">© 2025 HostelWork. All rights reserved.</p>
          </div>
        </div>
      </div>`
    });
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendAccountDeletionEmail
};