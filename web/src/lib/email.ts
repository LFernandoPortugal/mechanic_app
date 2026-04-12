/**
 * Email Notification Helper (EmailJS)
 * Sends transactional emails to clients without a backend server.
 * Free tier: 200 emails/month.
 * 
 * Setup required:
 * 1. Create account at https://www.emailjs.com
 * 2. Create an Email Service (Gmail/Outlook/etc)
 * 3. Create a Template with variables: {{client_name}}, {{vehicle_id}}, {{quote_url}}, {{total_estimate}}
 * 4. Add credentials to .env.local:
 *    NEXT_PUBLIC_EMAILJS_SERVICE_ID=...
 *    NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=...
 *    NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=...
 */

import emailjs from '@emailjs/browser';

const SERVICE_ID  = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID  || '';
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY  = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY  || '';

/** Returns true if EmailJS is configured */
export function isEmailConfigured(): boolean {
  return Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
}

export interface QuoteEmailParams {
  clientEmail: string;
  clientName: string;
  vehicleId: string;
  quoteUrl: string;
  totalEstimate: number;
}

/**
 * Sends a quote email to the client.
 * Must match your EmailJS template variable names.
 */
export async function sendQuoteEmail(params: QuoteEmailParams): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error('EmailJS is not configured. Add credentials to .env.local');
  }

  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      to_email:       params.clientEmail,
      client_name:    params.clientName,
      vehicle_id:     params.vehicleId,
      quote_url:      params.quoteUrl,
      total_estimate: `$${params.totalEstimate.toFixed(2)}`,
    },
    PUBLIC_KEY
  );
}
