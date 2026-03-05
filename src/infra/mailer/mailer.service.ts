import nodemailer from "nodemailer";
import { env } from "@config/env";

const transporter = nodemailer.createTransport({
  host:   env.SMTP_HOST,
  port:   env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export interface SendInviteEmailParams {
  to:            string;
  workspaceName: string;
  inviterName:   string;
  inviteToken:   string;
}

export async function sendInviteEmail(params: SendInviteEmailParams) {
  const { to, workspaceName, inviterName, inviteToken } = params;

  const acceptUrl = `${env.FRONTEND_URL}/invites/accept?token=${inviteToken}`;

  await transporter.sendMail({
    from:    env.SMTP_FROM,
    to,
    subject: `${inviterName} te convidou para o workspace "${workspaceName}"`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Você foi convidado!</h2>
        <p>
          <strong>${inviterName}</strong> te convidou para participar do workspace
          <strong>${workspaceName}</strong>.
        </p>
        <a
          href="${acceptUrl}"
          style="
            display:inline-block;
            margin-top:16px;
            padding:12px 24px;
            background:#4f46e5;
            color:#fff;
            border-radius:6px;
            text-decoration:none;
            font-weight:600;
          "
        >
          Aceitar convite
        </a>
        <p style="margin-top:24px;font-size:12px;color:#888">
          Este link expira em 7 dias. Se você não esperava este convite, ignore este e-mail.
        </p>
      </div>
    `,
  });
}