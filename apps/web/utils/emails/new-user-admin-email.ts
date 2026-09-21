// utils/emails/new-user-admin-email.ts
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

interface NewUserEmailData {
    email: string;
    firstName: string;
    lastName: string;
    confirmationToken: string;
    accountType: string;
    verificationCode: string;
    adminSender?: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

export const sendNewUserEmail = async ({
    email,
    firstName,
    lastName,
    confirmationToken,
    accountType,
    verificationCode,
    adminSender
}: NewUserEmailData) => {
    try {
        const environmentLabel = getEnvironmentLabel();

        let greeting;
        if (accountType === 'Doctor') {
            greeting = `Hello Dr. ${lastName},`;
        } else {
            greeting = `Hello ${firstName},`;
        }

        const senderInfo = adminSender
            ? `This account was created by ${adminSender.firstName} ${adminSender.lastName} (${adminSender.email}) from the admin dashboard.`
            : 'This account was created by an administrator.';

        const subject = environmentLabel ? `[${environmentLabel}] Welcome to Fajr MedFlow - Complete Your Account Setup` : 'Welcome to Fajr MedFlow - Complete Your Account Setup';
        const verifyUrl = process.env.NODE_ENV === 'production'
            ? `https://fajrmission.org/admin-signup/verify?email=${encodeURIComponent(email)}`
            : `http://localhost:3000/admin-signup/verify?email=${encodeURIComponent(email)}`;

        await sendEmail({
            to: email,
            subject,
            html: `
        <div style="background-color: #ffffff; padding: 20px; color: #ffffff;">
          <h3 style="color: #ff5722; background-color: #ffffff; padding: 10px 20px; border-radius: 5px;">
            ${greeting}
          </h3>
          <p style="font-size: 16px; line-height: 1.6; color: #120f0b;">
            Welcome to Fajr MedFlow! Your ${accountType} account has been created.
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #120f0b;">
            ${senderInfo}
          </p>
          <div style="background-color: #1f1f1f; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #ff5722; margin-top: 0;">Your Account Details:</h4>
            <p style="font-size: 16px; color: #ff5722;"><strong>Email:</strong> ${email}</p>
            <p style="font-size: 16px; color: #ff5722;"><strong>Account Type:</strong> ${accountType}</p>
          </div>
          <div style="background-color: #fff4ed; padding: 15px; border-radius: 5px; margin: 20px 0; border: 2px solid #ff5722;">
            <h4 style="color: #ff5722; margin-top: 0;">Security Verification Code:</h4>
            <p style="font-size: 24px; font-weight: bold; color: #ff5722; text-align: center; letter-spacing: 3px; margin: 10px 0; border: 2px dashed #ff5722; padding: 10px; border-radius: 5px;">${verificationCode}</p>
            <p style="font-size: 14px; line-height: 1.6;">
                <strong style="color: #ff5722;">This verification code expires in 24 hours.</strong>
            </p>
          </div>
          <p style="font-size: 16px; line-height: 1.6;">
            <strong>Next Steps:</strong> Click the button below and enter your verification code to complete your account setup.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background-color: #ff5722; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; border: none; cursor: pointer;" target="_blank" rel="noopener noreferrer">
              Verify & Complete Setup
            </a>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #666666; text-align: center;">
            If the button above doesn't work, copy and paste this link into your browser:<br>
            <a href="${verifyUrl}" style="color: #ff5722; word-break: break-all;">${verifyUrl}</a>
          </p>

          <div style="background-color: #1f1f1f; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #333;">
            <h4 style="color: #ff5722; margin-top: 0;">Download the Mobile App (Beta)</h4>
            <p style="color: #cccccc; font-size: 14px; line-height: 1.6;">
              The Fajr EMR mobile app is currently in beta testing via Apple TestFlight.
            </p>
            <ol style="color: #cccccc; font-size: 14px; line-height: 1.8;">
              <li>Install <a href="https://apps.apple.com/us/app/testflight/id899247664" style="color: #ff5722;">TestFlight</a> from the App Store</li>
              <li>Open <a href="https://testflight.apple.com/join/Arz6Fn8F" style="color: #ff5722;">this TestFlight invite link</a> to join the beta</li>
              <li>Install the Fajr EMR app from TestFlight</li>
            </ol>
            <p style="color: #999999; font-size: 12px;">
              Android version coming soon. iOS only for now.
            </p>
          </div>

          <p style="font-size: 14px; color: #B9343B; line-height: 1.6;">
            If you have any questions or need assistance, please contact your administrator or our support team.
          </p>
          <hr style="border: none; border-top: 1px solid #333; margin: 20px 0;">
          <p style="font-size: 12px; color: #999999;">
            This email was sent from Fajr MedFlow. Please do not reply to this email.
          </p>
        </div>
      `
        });

        console.log(`New user welcome email sent successfully to ${email}`);
    } catch (error) {
        console.error('Error sending new user email:', error);
        throw error;
    }
};
