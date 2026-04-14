/**
 * Email validation utility
 * Validates email format according to RFC 5322 simplified pattern
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 max email length

const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmedEmail = email.trim();
  
  // Check length
  if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
    return false;
  }

  // Check format
  return EMAIL_REGEX.test(trimmedEmail);
};

const validateEmailField = (email, fieldName = 'email') => {
  if (!email) {
    throw new Error(`${fieldName} is required`);
  }

  if (!validateEmail(email)) {
    throw new Error(`${fieldName} must be a valid email address`);
  }
};

const validateSenderReceiverEmails = (sender_info, receiver_info) => {
  if (!sender_info || typeof sender_info !== 'object') {
    throw new Error('sender_info must be an object');
  }

  if (!receiver_info || typeof receiver_info !== 'object') {
    throw new Error('receiver_info must be an object');
  }

  // Validate sender email
  if (sender_info.email) {
    validateEmailField(sender_info.email, 'sender_email');
  }

  // Validate receiver email
  if (receiver_info.email) {
    validateEmailField(receiver_info.email, 'receiver_email');
  }

  // At least one (receiver or sender) should have an email for notifications
  if (!sender_info.email && !receiver_info.email) {
    throw new Error('At least one of sender_email or receiver_email is required');
  }
};

module.exports = { validateEmail, validateEmailField, validateSenderReceiverEmails };
