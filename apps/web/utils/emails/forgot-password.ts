// utils/emails/forgot-password.ts
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

export const sendVerificationEmail = async (email: string | undefined, verificationCode: string) => {
    if (!email) {
        throw new Error('Email is required to send the verification email.');
    }

    try {
        const environmentLabel = getEnvironmentLabel();

        const subject = environmentLabel
            ? `[${environmentLabel}] Password Reset Verification Code`
            : 'Password Reset Verification Code';

        await sendEmail({
            to: email,
            subject,
            html: `
        <div style="font-family: Arial, sans-serif;">
          <h3>Password Reset Request</h3>
          <p>You have requested to reset your password. Please use the following verification code:</p>
          <h2 style="color: #ff5722;">${verificationCode}</h2>
          <p>This code will expire in 30 minutes. If you did not request this, please ignore this email.</p>
          ${environmentLabel ? `<p style="color: gray; font-size: 0.9em;">This email was sent from the ${environmentLabel}.</p>` : ''}
        </div>
      `,
        });
        console.log(`Verification email sent to ${email}`);
    } catch (error) {
        if (error instanceof Error) {
            console.error('Error sending verification email:', error.message);
        } else {
            console.error('Unexpected error:', error);
        }
        throw error;
    }
};

