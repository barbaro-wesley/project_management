import { InviteStatus, WorkspaceRole } from "@prisma/client";
import { prisma } from "@infra/database/prisma.client";
import { sendInviteEmail } from "@infra/mailer/mailer.service";
import { AppError, NotFoundError, ForbiddenError } from "@shared/errors/app.error";
import type { CreateInviteDto } from "./invite.dto";

const INVITE_EXPIRY_DAYS = 7;

// ─── Criar convite ────────────────────────────────────────────────────────────

export async function createInvite(
  workspaceId: string,
  senderId: string,
  dto: CreateInviteDto
) {
  const workspace = await prisma.workspace.findUnique({
    where:  { id: workspaceId },
    select: { id: true, name: true },
  });
  if (!workspace) throw new NotFoundError("Workspace");

  const sender = await prisma.user.findUnique({
    where:  { id: senderId },
    select: { name: true },
  });
  if (!sender) throw new NotFoundError("Usuário");

  // Bloqueia convidar quem já é membro
  const alreadyMember = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      user: { email: dto.email },
    },
  });
  if (alreadyMember) {
    throw new AppError("Usuário já é membro do workspace", 409, "ALREADY_MEMBER");
  }

  // Cancela convites pendentes anteriores para o mesmo e-mail
  await prisma.invite.updateMany({
    where: {
      workspaceId,
      email:  dto.email,
      status: InviteStatus.PENDING,
    },
    data: { status: InviteStatus.EXPIRED },
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const invite = await prisma.invite.create({
    data: {
      workspaceId,
      senderId,
      email:    dto.email,
      role:     dto.role,
      expiresAt,
    },
    select: {
      id:        true,
      email:     true,
      role:      true,
      status:    true,
      expiresAt: true,
      token:     true,
    },
  });

  // Envia e-mail de forma não-bloqueante
  sendInviteEmail({
    to:            dto.email,
    workspaceName: workspace.name,
    inviterName:   sender.name,
    inviteToken:   invite.token,
  }).catch((err) => {
    console.error("[Mailer] Falha ao enviar convite:", err);
  });

  // Não retorna o token para o cliente — ele só vai por e-mail
  const { token: _, ...safeInvite } = invite;
  return safeInvite;
}

// ─── Aceitar convite ──────────────────────────────────────────────────────────

export async function acceptInvite(token: string, userId: string) {
  const invite = await prisma.invite.findUnique({
    where:  { token },
    include: { workspace: { select: { id: true, name: true } } },
  });

  if (!invite) throw new NotFoundError("Convite");

  if (invite.status !== InviteStatus.PENDING) {
    throw new AppError("Este convite não está mais disponível", 400, "INVITE_UNAVAILABLE");
  }

  if (invite.expiresAt < new Date()) {
    await prisma.invite.update({
      where: { token },
      data:  { status: InviteStatus.EXPIRED },
    });
    throw new AppError("Este convite expirou", 400, "INVITE_EXPIRED");
  }

  // Valida que o e-mail do usuário logado bate com o convite
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { email: true },
  });

  if (!user || user.email !== invite.email) {
    throw new ForbiddenError("Este convite pertence a outro e-mail");
  }

  // Aceita em transação: atualiza convite + cria membro
  await prisma.$transaction([
    prisma.invite.update({
      where: { token },
      data:  { status: InviteStatus.ACCEPTED },
    }),
    prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId: invite.workspaceId, userId },
      },
      create: { workspaceId: invite.workspaceId, userId, role: invite.role },
      update: { role: invite.role }, // atualiza papel se já era membro
    }),
  ]);

  return { workspaceId: invite.workspaceId, workspaceName: invite.workspace.name };
}

// ─── Listar convites do workspace ─────────────────────────────────────────────

export async function listInvites(workspaceId: string) {
  return prisma.invite.findMany({
    where:   { workspaceId },
    select: {
      id:        true,
      email:     true,
      role:      true,
      status:    true,
      expiresAt: true,
      createdAt: true,
      sender: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Revogar convite ──────────────────────────────────────────────────────────

export async function revokeInvite(inviteId: string, workspaceId: string) {
  const invite = await prisma.invite.findFirst({
    where: { id: inviteId, workspaceId },
  });

  if (!invite) throw new NotFoundError("Convite");

  if (invite.status !== InviteStatus.PENDING) {
    throw new AppError("Apenas convites pendentes podem ser revogados", 400, "INVITE_NOT_PENDING");
  }

  return prisma.invite.update({
    where: { id: inviteId },
    data:  { status: InviteStatus.EXPIRED },
    select: { id: true, status: true },
  });
}