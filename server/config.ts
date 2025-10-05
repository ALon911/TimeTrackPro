// Configuration module to load environment variables
// Since dotenv is already loaded in index.ts, we can rely on process.env

// Email configuration - lazy loaded to ensure dotenv has run
let _emailConfig: any = null;

export const emailConfig = {
  get host() { return this.getConfig().host; },
  get port() { return this.getConfig().port; },
  get secure() { return this.getConfig().secure; },
  get auth() { return this.getConfig().auth; },
  get from() { return this.getConfig().from; },
  
  getConfig() {
    if (!_emailConfig) {
      _emailConfig = {
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
    }
    return _emailConfig;
  }
};

// Check if email is properly configured
export const isEmailConfigured = (): boolean => {
  const hasUser = !!emailConfig.auth.user;
  const hasPass = !!emailConfig.auth.pass;
  const hasFrom = !!emailConfig.from;
  
  // Debug logging to help troubleshoot
  if (process.env.NODE_ENV === 'development') {
    console.log('Email configuration debug:');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM ? 'SET' : 'NOT SET');
    console.log('Has user:', hasUser);
    console.log('Has pass:', hasPass);
    console.log('Has from:', hasFrom);
  }
  
  return !!(hasUser && hasPass && hasFrom);
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