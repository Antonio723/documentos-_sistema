import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../logger/logger';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  if (!env.SMTP_ENABLED) {
    logger.debug({ msg: 'SMTP disabled — e-mail not sent', subject: options.subject, to: options.to });
    return;
  }

  try {
    await getTransporter().sendMail({
      from: env.SMTP_FROM,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    logger.info({ msg: 'E-mail sent', subject: options.subject, to: options.to });
  } catch (err) {
    logger.error({ msg: 'Failed to send e-mail', subject: options.subject, to: options.to, err });
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function approvalReminderTemplate(data: {
  documentTitle: string;
  stepName: string;
  approvalRequestId: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const link = `${data.appUrl}/approvals/${data.approvalRequestId}`;
  return {
    subject: `[Aprovação pendente] ${data.documentTitle}`,
    text: `Você tem uma aprovação pendente para o documento "${data.documentTitle}" na etapa "${data.stepName}".\n\nAcesse: ${link}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#1e40af">Aprovação pendente</h2>
        <p>Você tem uma aprovação pendente:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;font-weight:bold;width:140px">Documento</td><td style="padding:8px">${data.documentTitle}</td></tr>
          <tr style="background:#f8fafc"><td style="padding:8px;font-weight:bold">Etapa</td><td style="padding:8px">${data.stepName}</td></tr>
        </table>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#1e40af;color:#fff;text-decoration:none;border-radius:6px">Ver aprovação</a>
        <p style="color:#64748b;font-size:12px;margin-top:24px">Este e-mail foi enviado automaticamente pelo DocManager.</p>
      </div>`,
  };
}

export function documentExpiryTemplate(data: {
  documentTitle: string;
  documentCode: string;
  label: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: `[Validade] ${data.documentTitle} expira em ${data.label}`,
    text: `O documento "${data.documentTitle}" (${data.documentCode}) expira em ${data.label}.\n\nAcesse o sistema para revisar: ${data.appUrl}/documents`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#b45309">Documento prestes a expirar</h2>
        <p>Um documento sob sua responsabilidade está próximo do vencimento:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;font-weight:bold;width:140px">Documento</td><td style="padding:8px">${data.documentTitle}</td></tr>
          <tr style="background:#f8fafc"><td style="padding:8px;font-weight:bold">Código</td><td style="padding:8px">${data.documentCode}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Expira em</td><td style="padding:8px;color:#b45309;font-weight:bold">${data.label}</td></tr>
        </table>
        <a href="${data.appUrl}/documents" style="display:inline-block;padding:12px 24px;background:#b45309;color:#fff;text-decoration:none;border-radius:6px">Ver documentos</a>
        <p style="color:#64748b;font-size:12px;margin-top:24px">Este e-mail foi enviado automaticamente pelo DocManager.</p>
      </div>`,
  };
}

export function overdueReadingTemplate(data: {
  documentTitle: string;
  documentCode: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: `[Leitura em atraso] ${data.documentTitle}`,
    text: `Você ainda não confirmou a leitura do documento "${data.documentTitle}" (${data.documentCode}). Acesse: ${data.appUrl}/my-readings`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#dc2626">Leitura de documento em atraso</h2>
        <p>Você ainda não confirmou a leitura do seguinte documento:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;font-weight:bold;width:140px">Documento</td><td style="padding:8px">${data.documentTitle}</td></tr>
          <tr style="background:#f8fafc"><td style="padding:8px;font-weight:bold">Código</td><td style="padding:8px">${data.documentCode}</td></tr>
        </table>
        <a href="${data.appUrl}/my-readings" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px">Confirmar leitura</a>
        <p style="color:#64748b;font-size:12px;margin-top:24px">Este e-mail foi enviado automaticamente pelo DocManager.</p>
      </div>`,
  };
}
