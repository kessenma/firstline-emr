// utils/emails/resend-config.ts
import { Resend } from 'resend';
import { BRAND_NAME, BRAND_DOMAIN } from '@firstline/shared/constants';

let _resend: Resend | null = null;
const getResend = () => {
    if (!_resend) {
        _resend = new Resend(process.env.RESEND_API_KEY);
    }
    return _resend;
};

// The sending domain must have SPF/DKIM configured in Resend before this is
// switched, or outbound mail silently fails rather than erroring.
const FROM_ADDRESS =
    process.env.EMAIL_FROM_ADDRESS ?? `${BRAND_NAME} <noreply@alert.${BRAND_DOMAIN}>`;

export interface EmailParams {
    to: string;
    subject: string;
    html: string;
}

export const sendEmail = async ({ to, subject, html }: EmailParams) => {
    const { data, error } = await getResend().emails.send({
        from: FROM_ADDRESS,
        to: [to],
        subject,
        html,
    });

    if (error) {
        console.error(`Error sending email to ${to}:`, error);
        throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log(`Email sent successfully to ${to}`, data);
    return data;
};
