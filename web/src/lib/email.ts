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

const getEmailConfig = () => ({
  serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID?.trim() || '',
  templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID?.trim() || '',
  publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY?.trim() || '',
});

/** Returns true if EmailJS is configured */
export function isEmailConfigured(): boolean {
  const config = getEmailConfig();
  return Boolean(config.serviceId && config.templateId && config.publicKey);
}

export interface QuoteEmailParams {
  clientEmail: string;
  clientName: string;
  vehicleId: string;
  quoteUrl: string;
  totalEstimate: number;
  currencySymbol?: string;
}

export interface QuoteEmailTemplateParams {
  [key: string]: string;
  to_email: string;
  client_name: string;
  vehicle_id: string;
  quote_url: string;
  total_estimate: string;
}

/** Builds and validates the variables expected by the EmailJS template. */
export function buildQuoteEmailTemplateParams(
  params: QuoteEmailParams,
): QuoteEmailTemplateParams {
  const recipient = params.clientEmail.trim();
  const clientName = params.clientName.trim();
  const vehicleId = params.vehicleId.trim();
  const quoteUrl = params.quoteUrl.trim();

  if (!recipient || !clientName || !vehicleId || !quoteUrl) {
    throw new Error('Email notification data is incomplete');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new Error('Email recipient address is invalid');
  }
  if (!Number.isFinite(params.totalEstimate) || params.totalEstimate < 0) {
    throw new Error('Email total estimate must be a non-negative number');
  }

  const symbol = params.currencySymbol?.trim() || '$';
  const separator = /[A-Za-z./]$/.test(symbol) ? ' ' : '';

  return {
    to_email: recipient,
    client_name: clientName,
    vehicle_id: vehicleId,
    quote_url: quoteUrl,
    total_estimate: `${symbol}${separator}${params.totalEstimate.toFixed(2)}`,
  };
}

/**
 * Sends a quote email to the client.
 * Must match your EmailJS template variable names.
 */
export async function sendQuoteEmail(params: QuoteEmailParams): Promise<void> {
  const config = getEmailConfig();
  if (!config.serviceId || !config.templateId || !config.publicKey) {
    throw new Error('EmailJS is not configured. Add credentials to .env.local');
  }

  await emailjs.send(
    config.serviceId,
    config.templateId,
    buildQuoteEmailTemplateParams(params),
    {
      publicKey: config.publicKey,
      limitRate: {
        id: 'quote-email',
        throttle: 10_000,
      },
    },
  );
}
