// utils/emails/user-signup.ts
import { sendEmail } from './resend-config';

const getEnvironmentLabel = () => {
    const env = process.env.NODE_ENV || 'production';
    switch (env) {
        case 'development':
            return 'Development Environment';
        case 'test':
            return 'Staging / Test Environment';
        case 'production':
        default:
            return '';
    }
};

export const sendWelcomeEmail = async (email: string, firstName: string, lastName: string, accountType: string) => {
    try {
        const environmentLabel = getEnvironmentLabel();

        let greeting;
        if (accountType === 'Doctor-Pending') {
            greeting = `Hello Dr. ${lastName},`;
        } else {
            greeting = `Hello ${firstName},`;
        }

        const subject = environmentLabel ? `[${environmentLabel}] Welcome to Fajr MedFlow` : 'Welcome to Fajr MedFlow';

        await sendEmail({
            to: email,
            subject,
            html: `
        <div style="background-color: #120f0b; padding: 20px; color: #ffffff;">
          <h3 style="color: #ff5722; background-color: #ffffff; padding: 10px 20px; border-radius: 5px;">
            ${greeting}
          </h3>
          <p style="color: #ffffff; font-size: 16px; line-height: 1.6;">
            Thank you for signing up for Fajr MedFlow!<br><br>
            We're excited to have you on board. Your account has been created successfully.<br><br>
            Your account is pending administrator approval. You will receive a notification once you've been authorized.
          </p>

          <div style="background-color: #1f1f1f; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #333;">
            <h4 style="color: #ff5722; margin-top: 0;">Download the Mobile App:</h4>
            <p style="color: #cccccc; font-size: 14px; line-height: 1.6;">
              The Fajr Mission EMR mobile app is currently on the Apple App Store and available via an APK file for Android.
            </p>
            <p style="color: #cccccc; font-size: 14px; line-height: 1.6;">
              <strong>To get started:</strong>
            </p>
            <ol style="color: #cccccc; font-size: 14px; line-height: 1.8;">
              <li>Apple App Store link <a href="https://apps.apple.com/us/app/fajr-mission-emr/id6755454120" style="color: #ff5722;">Fajr Mission EMR</a> (if you don't have it already)</li>
              <li>For Android, please reach out to an admin for the latest apk file</li>
            </ol>
            <p style="color: #cccccc; font-size: 14px; line-height: 1.6;">
            </p>
          </div>

          <p style="color: #ffffff; font-size: 16px; line-height: 1.6;">
            <strong>Best regards,</strong><br>
            <strong>The Fajr EMR Mission Team</strong>
          </p>
          ${environmentLabel ? `<p style="color: gray; font-size: 0.9em;">This email was sent from the ${environmentLabel}.</p>` : ''}
        </div>
      `,
        });
        console.log(`Welcome email sent successfully to: ${email}`);
    } catch (error) {
        console.error('Error sending welcome email:', error);
        throw error;
    }
};
