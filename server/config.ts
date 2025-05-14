// Configuration module to load environment variables

// Email configuration
export const emailConfig = {
  // SMTP settings for Gmail
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || '',  // Gmail address
    pass: process.env.EMAIL_PASS || '',  // Gmail app password
  },
  from: process.env.EMAIL_FROM || '',    // Gmail address for "From" field
};

// Check if email is properly configured
export const isEmailConfigured = (): boolean => {
  return !!(
    emailConfig.auth.user &&
    emailConfig.auth.pass &&
    emailConfig.from
  );
};

// Application URL for links in emails
export const appBaseUrl = process.env.APP_URL || '';

// Session secret for Express sessions
export const sessionSecret = process.env.SESSION_SECRET || 'timetracker-secret';

// JWT secret for authentication tokens
export const jwtSecret = process.env.JWT_SECRET || 'timetracker-jwt-secret';

// Default expiration for invitations (in days)
export const invitationExpiryDays = process.env.INVITATION_EXPIRY_DAYS 
  ? parseInt(process.env.INVITATION_EXPIRY_DAYS) 
  : 7;

// Debug mode
export const isDebugMode = process.env.DEBUG_MODE === 'true';