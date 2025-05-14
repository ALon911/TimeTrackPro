// Configuration module to load environment variables
import * as fs from 'fs';
import * as path from 'path';

// Read .env file directly and parse it
function readEnvFile(): Record<string, string> {
  try {
    // Find the .env file starting from the current directory
    console.log('Looking for .env file');
    const envPath = path.resolve('.env');
    console.log('Env path:', envPath);
    if (!fs.existsSync(envPath)) {
      console.error('Could not find .env file');
      return {};
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envVars: Record<string, string> = {};
    
    // Parse each line in the .env file
    envContent.split('\n').forEach(line => {
      // Skip comments and empty lines
      if (!line || line.startsWith('#')) {
        return;
      }
      
      // Split at the first equals sign
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        
        envVars[key] = value;
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('Error reading .env file:', error);
    return {};
  }
}

// Read the environment variables from the .env file
const envVars = readEnvFile();

// Email configuration
export const emailConfig = {
  // SMTP settings for Gmail
  host: envVars.EMAIL_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: envVars.EMAIL_PORT ? parseInt(envVars.EMAIL_PORT) : (process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587),
  secure: envVars.EMAIL_SECURE === 'true' || process.env.EMAIL_SECURE === 'true',
  auth: {
    user: envVars.EMAIL_USER || process.env.EMAIL_USER || '',  // Gmail address
    pass: envVars.EMAIL_PASS || process.env.EMAIL_PASS || '',  // Gmail app password
  },
  from: envVars.EMAIL_FROM || process.env.EMAIL_FROM || '',    // Gmail address for "From" field
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
export const appBaseUrl = envVars.APP_URL || process.env.APP_URL || '';

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