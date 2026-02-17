import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter: nodemailer.Transporter | null = null;

/**
 * Ethereal (fake SMTP) transporter. Create once and reuse.
 */
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: env.etherealUser && env.etherealPass
        ? { user: env.etherealUser, pass: env.etherealPass }
        : undefined,
    });
  }
  return transporter;
}

export type SendMailOptions = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendMail(options: SendMailOptions): Promise<void> {
  const transport = getTransporter();
  await transport.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html ?? options.text,
  });
}
