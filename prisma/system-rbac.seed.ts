/**
 * prisma/seeds/system-rbac.seed.ts
 *
 * Popula as permissões e roles de sistema padrão.
 * Execute com: npx ts-node prisma/seeds/system-rbac.seed.ts
 * Ou integre ao prisma/seed.ts principal.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Definição das permissões ─────────────────────────────────────────────────

const PERMISSIONS = [
  // Usuários
  { action: "users:read",        group: "users",      description: "Listar e visualizar usuários" },
  { action: "users:create",      group: "users",      description: "Criar novos usuários" },
  { action: "users:update",      group: "users",      description: "Editar dados de usuários" },
  { action: "users:delete",      group: "users",      description: "Deletar usuários" },
  { action: "users:impersonate", group: "users",      description: "Logar como outro usuário (suporte)" },
  // Workspaces
  { action: "workspaces:read",   group: "workspaces", description: "Visualizar todos os workspaces" },
  { action: "workspaces:delete", group: "workspaces", description: "Deletar workspaces" },
  // Roles
  { action: "roles:manage",      group: "roles",      description: "Criar, editar e deletar system roles" },
  { action: "roles:assign",      group: "roles",      description: "Atribuir e revogar roles de usuários" },
  // Sistema
  { action: "system:audit",      group: "system",     description: "Visualizar logs de auditoria globais" },
] as const;

// ─── Definição dos roles padrão ───────────────────────────────────────────────

type PermissionAction = typeof PERMISSIONS[number]["action"];

const DEFAULT_ROLES: Array<{
  name:        string;
  description: string;
  isSystem:    boolean;
  permissions: PermissionAction[];
}> = [
  {
    name:        "SUPER_ADMIN",
    description: "Acesso total ao sistema. Não pode ser modificado.",
    isSystem:    true,
    // SUPER_ADMIN recebe todas as permissões automaticamente no seed
    permissions: PERMISSIONS.map((p) => p.action),
  },
  {
    name:        "SUPPORT",
    description: "Equipe de suporte. Pode visualizar e editar usuários e workspaces.",
    isSystem:    true,
    permissions: [
      "users:read",
      "users:update",
      "users:impersonate",
      "workspaces:read",
      "system:audit",
    ],
  },
  {
    name:        "USER",
    description: "Usuário padrão do sistema. Sem permissões administrativas.",
    isSystem:    true,
    permissions: [], // nenhuma permissão sistêmica
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Iniciando seed de system RBAC...\n");

  // 1. Upsert de todas as permissões
  console.log("📋 Criando permissões...");
  for (const perm of PERMISSIONS) {
    await prisma.systemPermission.upsert({
      where:  { action: perm.action },
      create: perm,
      update: { description: perm.description, group: perm.group },
    });
    console.log(`   ✓ ${perm.action}`);
  }

  // 2. Upsert de cada role e suas permissões
  console.log("\n🔑 Criando roles...");
  for (const roleDef of DEFAULT_ROLES) {
    const role = await prisma.systemRole.upsert({
      where:  { name: roleDef.name },
      create: {
        name:        roleDef.name,
        description: roleDef.description,
        isSystem:    roleDef.isSystem,
      },
      update: {
        description: roleDef.description,
        isSystem:    roleDef.isSystem,
      },
    });

    console.log(`   ✓ ${role.name} (${roleDef.permissions.length} permissões)`);

    // Vincula as permissões ao role
    for (const action of roleDef.permissions) {
      const permission = await prisma.systemPermission.findUnique({
        where: { action },
      });

      if (!permission) {
        console.warn(`   ⚠ Permissão "${action}" não encontrada, pulando...`);
        continue;
      }

      await prisma.systemRolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
    }
  }

  // 3. Atribui SUPER_ADMIN ao primeiro usuário (se existir e ainda não tiver o role)
  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select:  { id: true, email: true },
  });

  if (firstUser) {
    const superAdminRole = await prisma.systemRole.findUnique({
      where: { name: "SUPER_ADMIN" },
    });

    if (superAdminRole) {
      await prisma.userSystemRole.upsert({
        where: {
          userId_roleId: { userId: firstUser.id, roleId: superAdminRole.id },
        },
        create: { userId: firstUser.id, roleId: superAdminRole.id },
        update: {},
      });
      console.log(`\n👑 SUPER_ADMIN atribuído a: ${firstUser.email}`);
    }
  } else {
    console.log("\n⚠  Nenhum usuário encontrado. SUPER_ADMIN não foi atribuído.");
    console.log("   Crie um usuário e execute o seed novamente, ou atribua manualmente.");
  }

  console.log("\n✅ Seed de system RBAC concluído!");
}

main()
  .catch((err) => {
    console.error("❌ Erro no seed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
