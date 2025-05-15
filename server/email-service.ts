import nodemailer from 'nodemailer';
import { TeamInvitation, User, Team } from '@shared/schema';
import { emailConfig, isEmailConfigured } from './config';

// Set debug level for nodemailer
process.env.NODE_DEBUG = 'nodemailer';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromAddress: string;
  private isConfigured: boolean = false;

  constructor() {
    this.fromAddress = emailConfig.from;
    
    console.log('=== EMAIL SERVICE CONFIG DETAILS ===');
    console.log('Host:', emailConfig.host);
    console.log('Port:', emailConfig.port);
    console.log('Secure:', emailConfig.secure);
    console.log('Auth User:', emailConfig.auth.user ? 'Set (hidden)' : 'Not set');
    console.log('Auth Pass:', emailConfig.auth.pass ? 'Set (hidden)' : 'Not set');
    console.log('From Address:', emailConfig.from);
    console.log('Is Email Configured:', isEmailConfigured());
    
    // Log exact values for further debugging (hide password)
    console.log('EMAIL_USER exact value:', emailConfig.auth.user);
    console.log('EMAIL_FROM exact value:', emailConfig.from);
    
    if (isEmailConfigured()) {
      try {
        const transportConfig = {
          host: emailConfig.host,
          port: emailConfig.port,
          secure: emailConfig.secure,
          auth: {
            user: emailConfig.auth.user,
            pass: emailConfig.auth.pass
          },
          logger: true, // Enable logging
          debug: true   // Include debug information
        };
        
        console.log('Creating transporter with config:', JSON.stringify({
          ...transportConfig,
          auth: {
            user: transportConfig.auth.user ? 'Set (hidden)' : 'Not set',
            pass: transportConfig.auth.pass ? 'Set (hidden)' : 'Not set'
          }
        }));
        
        this.transporter = nodemailer.createTransport(transportConfig);
        this.isConfigured = true;
        console.log('Email service configured successfully');
      } catch (error) {
        console.error('Error configuring email service:', error);
        this.isConfigured = false;
        this.transporter = nodemailer.createTransport({});
      }
    } else {
      console.warn('Email service not configured. Check EMAIL_USER, EMAIL_PASS and EMAIL_FROM environment variables.');
      this.isConfigured = false;
      this.transporter = nodemailer.createTransport({});
    }
  }

  // מתודה ליצירת חיבור חדש אם נוספו פרטי הקונפיגורציה
  refreshConfiguration(): boolean {
    if (isEmailConfigured()) {
      try {
        this.transporter = nodemailer.createTransport({
          host: emailConfig.host,
          port: emailConfig.port,
          secure: emailConfig.secure,
          auth: {
            user: emailConfig.auth.user,
            pass: emailConfig.auth.pass
          }
        });
        this.fromAddress = emailConfig.from;
        this.isConfigured = true;
        console.log('Email service reconfigured successfully');
        return true;
      } catch (error) {
        console.error('Error reconfiguring email service:', error);
        this.isConfigured = false;
        return false;
      }
    }
    return false;
  }

  // האם השירות מוגדר נכון
  isReady(): boolean {
    return this.isConfigured;
  }

  // שליחת מייל כללי
  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('Email service not configured for sending mail');
      return false;
    }

    console.log('=== SENDING EMAIL ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('From:', this.fromAddress);
    
    try {
      console.log('Attempting to send email via transporter...');
      const mailOptions = {
        from: this.fromAddress,
        to,
        subject,
        html
      };
      console.log('Mail options:', JSON.stringify({
        ...mailOptions,
        html: '(HTML content not shown for brevity)'
      }));
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully!');
      console.log('Message ID:', info.messageId);
      console.log('Response:', info.response);
      if (info.accepted) console.log('Accepted by:', info.accepted);
      if (info.rejected) console.log('Rejected by:', info.rejected);
      
      return true;
    } catch (error) {
      console.error('=== ERROR SENDING EMAIL ===');
      console.error('Error name:', (error as Error).name);
      console.error('Error message:', (error as Error).message);
      console.error('Error stack:', (error as Error).stack);
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
    // הכנת קישורים
    const viewLink = inviteLink; // קישור לצפייה בהזמנה
    const acceptLink = inviteLink.replace("/invitation/", "/invitation/accept/");
    const directAcceptLink = inviteLink.replace("/invitation/", "/invitations/accept/");
    
    const subject = `הזמנה להצטרף לצוות ${team.name} באפליקציית מעקב הזמן`;
    
    const html = `
      <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
        <h2>הזמנה להצטרף לצוות ${team.name}</h2>
        <p>שלום,</p>
        <p>${inviter.email} הזמין אותך להצטרף לצוות ${team.name} באפליקציית מעקב הזמן.</p>
        
        <div style="margin: 20px 0;">
          <!-- כפתור אישור רגיל דרך הממשק -->
          <a href="${viewLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-left: 10px;">
            צפייה בהזמנה
          </a>
          
          <!-- כפתור לאישור ישיר מהמייל -->
          <a href="${directAcceptLink}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            אישור מיידי
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