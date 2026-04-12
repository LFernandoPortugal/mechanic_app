/**
 * WhatsApp Deep Link Helpers
 * Opens WhatsApp with a pre-filled message using the wa.me protocol.
 * No API key required. Works on iOS, Android, and WhatsApp Web.
 */

/** Strips non-numeric characters from a phone number */
function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Opens WhatsApp with a message containing the quote link.
 * Called by the Advisor after generating a quote.
 */
export function openWhatsAppQuote(
  phone: string,
  clientName: string,
  vehicleId: string,
  quoteUrl: string,
  totalEstimate?: number
): void {
  const cleanPhone = sanitizePhone(phone);
  
  const totalLine = totalEstimate
    ? `\n💰 *Estimado total:* $${totalEstimate.toFixed(2)}`
    : '';

  const message = [
    `🔧 *Estimado/a ${clientName}*`,
    ``,
    `Le informamos que la cotización de su vehículo *${vehicleId}* ya está lista para su revisión y aprobación.`,
    `${totalLine}`,
    ``,
    `📋 *Revise y apruebe su cotización aquí:*`,
    quoteUrl,
    ``,
    `Puede aceptar o declinar reparaciones individuales según su presupuesto.`,
    ``,
    `_SGA — Sistema de Gestión Automotriz_`,
  ].join('\n');

  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

/**
 * Opens WhatsApp with a status update message.
 * Called by the Technician after submitting a diagnosis.
 */
export function openWhatsAppStatusUpdate(
  phone: string,
  clientName: string,
  vehicleId: string,
  status: 'diagnosis' | 'ready' | 'approved' | 'delivered'
): void {
  const cleanPhone = sanitizePhone(phone);

  const statusMessages: Record<string, string> = {
    diagnosis: `Su vehículo *${vehicleId}* ha sido diagnosticado. Nuestro asesor está preparando la cotización y se la enviará en breve.`,
    ready: `La cotización de su vehículo *${vehicleId}* ya está lista. Por favor revise el enlace que le fue enviado.`,
    approved: `Hemos recibido su aprobación para el vehículo *${vehicleId}*. Comenzaremos con las reparaciones de inmediato.`,
    delivered: `Su vehículo *${vehicleId}* ha sido entregado. ¡Gracias por confiar en nosotros! 🚗✨`,
  };

  const message = [
    `🔧 *Estimado/a ${clientName}*`,
    ``,
    statusMessages[status],
    ``,
    `_SGA — Sistema de Gestión Automotriz_`,
  ].join('\n');

  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}
