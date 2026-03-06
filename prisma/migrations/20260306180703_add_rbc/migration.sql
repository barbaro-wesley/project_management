-- CreateTable
CREATE TABLE "system_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_permissions" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "group" TEXT,

    CONSTRAINT "system_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "system_role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "user_system_roles" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,

    CONSTRAINT "user_system_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_roles_name_key" ON "system_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "system_permissions_action_key" ON "system_permissions"("action");

-- AddForeignKey
ALTER TABLE "system_role_permissions" ADD CONSTRAINT "system_role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "system_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_role_permissions" ADD CONSTRAINT "system_role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "system_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_system_roles" ADD CONSTRAINT "user_system_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_system_roles" ADD CONSTRAINT "user_system_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "system_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
