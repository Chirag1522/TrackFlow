const nodemailer = require('nodemailer');

const createTransport = () => {
  if (process.env.NODE_ENV === 'development') {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: process.env.SMTP_USER || 'test', pass: process.env.SMTP_PASS || 'test' },
    });
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
};

const sendEmail = async ({ to, subject, html }, { throwOnError = false } = {}) => {
  try {
    const transporter = createTransport();
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    console.log(`✉️  Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error('Email send failed:', err.message);
    if (throwOnError) throw err;
  }
};

const shipmentCreatedEmail = (to, trackingId, frontendUrl, options = {}) => sendEmail({
  to, subject: `🎉 Your Shipment is Confirmed - ${trackingId}`,
  html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #FF6B35 0%, #F74B25 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { font-size: 28px; margin-bottom: 5px; }
    .header p { font-size: 14px; opacity: 0.9; }
    .content { padding: 30px; }
    .status-badge { display: inline-block; background: #4CAF50; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 13px; margin: 15px 0; }
    .tracking-card { background: #f9f9f9; border-left: 4px solid #FF6B35; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .tracking-card label { display: block; font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 5px; }
    .tracking-card .tracking-id { font-size: 20px; font-weight: bold; color: #333; font-family: monospace; }
    .details-row { display: flex; justify-content: space-between; margin: 15px 0; padding: 12px 0; border-bottom: 1px solid #eee; }
    .details-row:last-child { border-bottom: none; }
    .detail-label { color: #666; font-size: 13px; }
    .detail-value { font-weight: 600; color: #333; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #F74B25 100%); color: white; padding: 14px 40px; border-radius: 5px; text-decoration: none; font-weight: bold; font-size: 16px; margin-top: 20px; transition: transform 0.2s; }
    .cta-button:hover { transform: scale(1.02); }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px; font-size: 12px; color: #999; }
    .footer a { color: #FF6B35; text-decoration: none; }
    .info-box { background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50; }
    .info-box p { color: #2e7d32; font-size: 13px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 Shipment Confirmed!</h1>
      <p>Your package is ready to be delivered</p>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi there,</p>
      <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">Great news! Your package has been successfully created and is now in our system. You can track your shipment in real-time using the tracking ID below.</p>
      
      <div class="status-badge">✓ SHIPMENT CREATED</div>
      
      <div class="tracking-card">
        <label>Your Tracking ID</label>
        <div class="tracking-id">${trackingId}</div>
      </div>

      <div class="info-box">
        <p><strong>📍 What's Next?</strong><br>Your shipment will be picked up from our nearest hub and dispatched to the delivery location. You'll receive updates at each stage of delivery.</p>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${frontendUrl}/track/${trackingId}" class="cta-button">🔍 Track Your Shipment</a>
      </div>

      <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin-top: 30px; font-size: 13px; color: #666; line-height: 1.6;">
        <p><strong>💡 Tip:</strong> Save this tracking ID <strong>${trackingId}</strong> for future reference. You can also use it to track your shipment on our website anytime.</p>
      </div>
    </div>
    <div class="footer">
      <p>© 2026 CourierSaaS. All rights reserved.<br>This is an automated message, please do not reply to this email.</p>
      <p><a href="${frontendUrl}">Visit Our Website</a></p>
    </div>
  </div>
</body>
</html>`,
}, options);

const statusUpdateEmail = (to, trackingId, status, frontendUrl, options = {}) => sendEmail({
  to, subject: `📦 Shipment Update - ${trackingId} - ${status.replace(/_/g, ' ')}`,
  html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { font-size: 28px; margin-bottom: 5px; }
    .header p { font-size: 14px; opacity: 0.9; }
    .content { padding: 30px; }
    .status-badge { display: inline-block; background: #2196F3; color: white; padding: 10px 20px; border-radius: 20px; font-weight: bold; font-size: 14px; margin: 15px 0; }
    .status-badge.created { background: #9C27B0; }
    .status-badge.in-transit { background: #FF9800; }
    .status-badge.out-for-delivery { background: #F44336; }
    .status-badge.delivered { background: #4CAF50; }
    .status-badge.failed { background: #f44336; }
    .tracking-card { background: #f9f9f9; border-left: 4px solid #2196F3; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .tracking-card label { display: block; font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 5px; }
    .tracking-card .tracking-id { font-size: 20px; font-weight: bold; color: #333; font-family: monospace; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .detail-item { background: #f0f7ff; padding: 15px; border-radius: 5px; }
    .detail-label { color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
    .detail-value { font-weight: 600; color: #1976D2; font-size: 15px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 14px 40px; border-radius: 5px; text-decoration: none; font-weight: bold; font-size: 16px; margin-top: 20px; transition: transform 0.2s; }
    .cta-button:hover { transform: scale(1.02); }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px; font-size: 12px; color: #999; }
    .footer a { color: #2196F3; text-decoration: none; }
    .timeline { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 5px; }
    .timeline-item { padding: 10px 0; border-bottom: 1px solid #eee; }
    .timeline-item:last-child { border-bottom: none; }
    .timeline-icon { display: inline-block; width: 20px; height: 20px; background: #2196F3; color: white; border-radius: 50%; text-align: center; line-height: 20px; font-size: 12px; margin-right: 10px; }
    .alert-box { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2196F3; }
    .alert-box p { color: #1565c0; font-size: 13px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📍 Shipment Status Update</h1>
      <p>${trackingId}</p>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Your shipment is on the move!</p>
      
      <div class="status-badge ${status.toLowerCase().replace(/_/g, '-')}">${status.replace(/_/g, ' ').toUpperCase()}</div>

      <div class="tracking-card">
        <label>Tracking ID</label>
        <div class="tracking-id">${trackingId}</div>
      </div>

      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">Current Status</div>
          <div class="detail-value" style="color: #FF6B35;">${status.replace(/_/g, ' ')}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Updated</div>
          <div class="detail-value">${new Date().toLocaleDateString()}</div>
        </div>
      </div>

      <div class="alert-box">
        <p><strong>📦 What Does This Mean?</strong><br>
        ${getStatusDescription(status)}</p>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${frontendUrl}/track/${trackingId}" class="cta-button">VIEW FULL TRACKING</a>
      </div>

      <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin-top: 30px; font-size: 13px; color: #666; line-height: 1.6;">
        <p><strong>💡 Need Help?</strong><br>If you have any questions about your shipment, you can always track it using your tracking ID or contact our support team.</p>
      </div>
    </div>
    <div class="footer">
      <p>© 2026 CourierSaaS. All rights reserved.<br>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`,
}, options);

const shipmentReturnEmail = (to, trackingId, frontendUrl, options = {}) => sendEmail({
  to, subject: `↩️ Shipment Returned - ${trackingId}`,
  html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { font-size: 28px; margin-bottom: 5px; }
    .header p { font-size: 14px; opacity: 0.9; }
    .content { padding: 30px; }
    .tracking-card { background: #f9f9f9; border-left: 4px solid #9C27B0; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .tracking-card label { display: block; font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 5px; }
    .tracking-card .tracking-id { font-size: 20px; font-weight: bold; color: #333; font-family: monospace; }
    .alert-box { background: #f3e5f5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #9C27B0; }
    .alert-box p { color: #6A1B9A; font-size: 13px; line-height: 1.6; }
    .success-box { background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50; }
    .success-box p { color: #2e7d32; font-size: 13px; line-height: 1.6; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%); color: white; padding: 14px 40px; border-radius: 5px; text-decoration: none; font-weight: bold; font-size: 16px; margin-top: 20px; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>↩️ Shipment Returned to Sender</h1>
      <p>${trackingId}</p>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">We're sorry, but your shipment could not be delivered and has been initiated for return.</p>
      
      <div class="tracking-card">
        <label>Tracking ID</label>
        <div class="tracking-id">${trackingId}</div>
      </div>

      <div class="alert-box">
        <p><strong>📦 What Happened?</strong><br>
        Your package was unable to be delivered to the recipient multiple times and has been marked for return to sender. It will be dispatched back through our warehouse network.</p>
      </div>

      <div class="success-box">
        <p><strong>🔄 Next Steps:</strong><br>
        • Your package will be transported back through our hubs<br>
        • You'll receive email updates as it progresses<br>
        • Once it reaches you, the status will show "Returned to Sender"<br>
        • Use your tracking ID to monitor the return journey</p>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${frontendUrl}/track/${trackingId}" class="cta-button">TRACK RETURN STATUS</a>
      </div>

      <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin-top: 30px; font-size: 13px; color: #666; line-height: 1.6;">
        <p><strong>📞 Questions?</strong><br>If you need more information about this return, please contact our support team with your tracking ID.</p>
      </div>
    </div>
    <div class="footer">
      <p>© 2026 CourierSaaS. All rights reserved.<br>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`,
}, options);

const getStatusDescription = (status) => {
  const descriptions = {
    'Created': '✅ Your shipment has been created and entered into our system.',
    'Picked_Up': '🚚 Your package has been picked up from the sender location.',
    'At_Sorting_Facility': '📦 Your package is at our sorting facility for processing.',
    'In_Transit': '🛣️ Your package is on the way to the delivery location.',
    'Out_for_Delivery': '🚪 Your package is out for delivery and will arrive soon!',
    'Delivered': '✨ Your package has been delivered successfully!',
    'Failed': '⚠️ Delivery attempt failed. We will retry soon.',
    'Retry': '🔄 We are retrying the delivery of your package.',
    'Returned': '↩️ Your package has been returned to sender.'
  };
  return descriptions[status] || 'Your shipment status has been updated.';
};

const agentCredentialsEmail = (to, agentName, email, password, frontendUrl, options = {}) => sendEmail({
  to, subject: `🔐 Your Agent Account - Login Credentials`,
  html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { font-size: 28px; margin-bottom: 5px; }
    .header p { font-size: 14px; opacity: 0.9; }
    .content { padding: 30px; }
    .welcome { font-size: 16px; color: #333; margin-bottom: 25px; line-height: 1.6; }
    .credentials-box { background: #f0f7f0; border: 2px solid #4CAF50; border-radius: 8px; padding: 25px; margin: 25px 0; }
    .credential-item { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #ddd; }
    .credential-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .credential-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; font-weight: 600; }
    .credential-value { font-size: 16px; font-weight: bold; color: #1B5E20; font-family: 'Courier New', monospace; background: white; padding: 12px; border-radius: 4px; word-break: break-all; border: 1px solid #ddd; }
    .warning-box { background: #fff3e0; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .warning-box p { color: #E65100; font-size: 13px; line-height: 1.6; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 14px 40px; border-radius: 5px; text-decoration: none; font-weight: bold; font-size: 16px; margin-top: 20px; transition: transform 0.2s; }
    .cta-button:hover { transform: scale(1.02); }
    .info-box { background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .info-box p { color: #1565c0; font-size: 13px; line-height: 1.6; }
    .next-steps { margin-top: 25px; }
    .next-steps h3 { color: #333; font-size: 15px; margin-bottom: 12px; }
    .next-steps ol { color: #666; font-size: 13px; line-height: 2; margin-left: 20px; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px; font-size: 12px; color: #999; }
    .footer a { color: #4CAF50; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👤 Welcome to the Team!</h1>
      <p>Your agent account has been created</p>
    </div>
    <div class="content">
      <p class="welcome">Hi <strong>${agentName}</strong>,</p>
      <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">Welcome! Your delivery agent account has been successfully created. Use the credentials below to log in and start managing shipments.</p>
      
      <div class="credentials-box">
        <div class="credential-item">
          <div class="credential-label">📧 Email Address</div>
          <div class="credential-value">${email}</div>
        </div>
        <div class="credential-item">
          <div class="credential-label">🔐 Password</div>
          <div class="credential-value">${password}</div>
        </div>
      </div>

      <div class="warning-box">
        <p><strong>⚠️ Important Security Notice:</strong><br>
        • Keep your credentials safe and do not share them with anyone<br>
        • We recommend changing your password after your first login<br>
        • Never provide your password to anyone, including administrators</p>
      </div>

      <div class="info-box">
        <p><strong>🚀 What You Can Do:</strong><br>
        As a delivery agent, you can view assigned shipments, update delivery status, upload proof of delivery, and track your workitems in real-time.</p>
      </div>

      <div class="next-steps">
        <h3>📋 Getting Started:</h3>
        <ol>
          <li>Log in using your email and password</li>
          <li>Visit the "My Workitems" section to see your assigned deliveries</li>
          <li>Update shipment status as you complete deliveries</li>
          <li>Upload delivery proof when required</li>
          <li>Check your dashboard for daily updates</li>
        </ol>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${frontendUrl}/login" class="cta-button">LOGIN TO YOUR ACCOUNT</a>
      </div>

      <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin-top: 30px; font-size: 13px; color: #666; line-height: 1.6;">
        <p><strong>💡 Need Help?</strong><br>If you have any questions or need assistance, please use the support option in your account dashboard or contact your team administrator.</p>
      </div>
    </div>
    <div class="footer">
      <p>© 2026 CourierSaaS. All rights reserved.<br>This is an automated message, please do not reply to this email.</p>
      <p><a href="${frontendUrl}">Visit CourierSaaS</a></p>
    </div>
  </div>
</body>
</html>`,
}, options);

module.exports = { sendEmail, shipmentCreatedEmail, statusUpdateEmail, shipmentReturnEmail, agentCredentialsEmail };
