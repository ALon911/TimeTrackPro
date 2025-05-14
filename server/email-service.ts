import nodemailer from 'nodemailer';
import { TeamInvitation, User, Team } from '@shared/schema';

// נקודות חיבור
interface EmailServiceConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromAddress: string;
  private isConfigured: boolean = false;

  constructor(config?: EmailServiceConfig) {
    if (config) {
      this.configure(config);
    } else {
      this.isConfigured = false;
      this.fromAddress = '';
      this.transporter = nodemailer.createTransport({});
    }
  }

  // מתודה לקונפיגורציה של שירות המייל
  configure(config: EmailServiceConfig): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: config.host || 'smtp.gmail.com',
        port: config.port || 587,
        secure: config.secure || false,
        auth: {
          user: config.auth.user,
          pass: config.auth.pass
        }
      });
      this.fromAddress = config.from;
      this.isConfigured = true;
    } catch (error) {
      console.error('Error configuring email service:', error);
      this.isConfigured = false;
    }
  }

  // האם השירות מוגדר נכון
  isReady(): boolean {
    return this.isConfigured;
  }

  // שליחת מייל כללי
  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('Email service not configured');
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html
      });
      console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  // שליחת הזמנה לצוות
  async sendTeamInvitation(
    invitation: TeamInvitation,
    inviter: User,
    team: Team, 
    inviteLink: string
  ): Promise<boolean> {
    const subject = `הזמנה להצטרף לצוות ${team.name} באפליקציית מעקב הזמן`;
    
    const html = `
      <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
        <h2>הזמנה להצטרף לצוות ${team.name}</h2>
        <p>שלום,</p>
        <p>${inviter.email} הזמין אותך להצטרף לצוות ${team.name} באפליקציית מעקב הזמן.</p>
        
        <div style="margin: 20px 0;">
          <a href="${inviteLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            אישור הצטרפות לצוות
          </a>
        </div>
        
        <p>קישור זה יהיה בתוקף למשך 7 ימים.</p>
        <p>אם אינך מכיר את השולח, ניתן להתעלם מהודעה זו.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 12px;">
          <p>הודעה זו נשלחה באופן אוטומטי, נא לא להשיב.</p>
        </div>
      </div>
    `;
    
    return this.sendMail(invitation.email, subject, html);
  }

  // שליחת הודעת רישום למשתמשים חדשים שהוזמנו
  async sendInvitationWithRegistration(
    invitation: TeamInvitation,
    inviter: User,
    team: Team,
    registerLink: string
  ): Promise<boolean> {
    const subject = `הזמנה להירשם ולהצטרף לצוות ${team.name} באפליקציית מעקב הזמן`;
    
    const html = `
      <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
        <h2>הזמנה להצטרף לצוות ${team.name}</h2>
        <p>שלום,</p>
        <p>${inviter.email} הזמין אותך להצטרף לצוות ${team.name} באפליקציית מעקב הזמן.</p>
        <p>כדי להצטרף לצוות, תצטרך להירשם ראשית למערכת.</p>
        
        <div style="margin: 20px 0;">
          <a href="${registerLink}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            הרשמה והצטרפות לצוות
          </a>
        </div>
        
        <p>קישור זה יהיה בתוקף למשך 7 ימים.</p>
        <p>אם אינך מכיר את השולח, ניתן להתעלם מהודעה זו.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 12px;">
          <p>הודעה זו נשלחה באופן אוטומטי, נא לא להשיב.</p>
        </div>
      </div>
    `;
    
    return this.sendMail(invitation.email, subject, html);
  }
}

// יצירת מופע יחיד של שירות המייל
export const emailService = new EmailService();