-- CreateEnum
CREATE TYPE "AppOpenMode" AS ENUM ('EMBED', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('REQUESTED', 'APPROVED', 'ORDERED', 'DELIVERED');

-- AlterEnum
ALTER TYPE "MetricOrigin" ADD VALUE 'WEBHOOK';

-- CreateTable
CREATE TABLE "ModuleSetting" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "ModuleSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "UserModuleGrant" (
    "userId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,

    CONSTRAINT "UserModuleGrant_pkey" PRIMARY KEY ("userId","moduleKey")
);

-- CreateTable
CREATE TABLE "LeadSourceDefinition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadSourceDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadRecord" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "marketId" TEXT,
    "occurredOn" DATE NOT NULL,
    "leads" INTEGER NOT NULL,
    "spendCents" INTEGER NOT NULL DEFAULT 0,
    "appointments" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "externalId" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "notes" TEXT,
    "origin" "MetricOrigin" NOT NULL DEFAULT 'MANUAL',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "unitPriceCents" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOrder" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "requesterId" TEXT NOT NULL,
    "marketId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'REQUESTED',
    "notes" TEXT,
    "adminNote" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalApp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "openMode" "AppOpenMode" NOT NULL DEFAULT 'EXTERNAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "visibleToAdmins" BOOLEAN NOT NULL DEFAULT true,
    "visibleToVas" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAppGrant" (
    "userId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,

    CONSTRAINT "UserAppGrant_pkey" PRIMARY KEY ("userId","appId")
);

-- CreateTable
CREATE TABLE "AuditTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assignRole" "Role",
    "sortOrder" INTEGER NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditAssignee" (
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AuditAssignee_pkey" PRIMARY KEY ("templateId","userId")
);

-- CreateTable
CREATE TABLE "AuditCheck" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AuditCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "userId" TEXT,
    "scopes" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadSourceDefinition_slug_key" ON "LeadSourceDefinition"("slug");

-- CreateIndex
CREATE INDEX "LeadRecord_occurredOn_idx" ON "LeadRecord"("occurredOn");

-- CreateIndex
CREATE UNIQUE INDEX "LeadRecord_sourceId_externalId_key" ON "LeadRecord"("sourceId", "externalId");

-- CreateIndex
CREATE INDEX "ProductOrder_status_idx" ON "ProductOrder"("status");

-- CreateIndex
CREATE INDEX "ProductOrder_requesterId_idx" ON "ProductOrder"("requesterId");

-- CreateIndex
CREATE INDEX "AuditCheck_day_idx" ON "AuditCheck"("day");

-- CreateIndex
CREATE UNIQUE INDEX "AuditCheck_templateId_userId_day_key" ON "AuditCheck"("templateId", "userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiToken_userId_idx" ON "ApiToken"("userId");

-- AddForeignKey
ALTER TABLE "UserModuleGrant" ADD CONSTRAINT "UserModuleGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleGrant" ADD CONSTRAINT "UserModuleGrant_moduleKey_fkey" FOREIGN KEY ("moduleKey") REFERENCES "ModuleSetting"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadRecord" ADD CONSTRAINT "LeadRecord_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "LeadSourceDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadRecord" ADD CONSTRAINT "LeadRecord_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOrder" ADD CONSTRAINT "ProductOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CatalogProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOrder" ADD CONSTRAINT "ProductOrder_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOrder" ADD CONSTRAINT "ProductOrder_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAppGrant" ADD CONSTRAINT "UserAppGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAppGrant" ADD CONSTRAINT "UserAppGrant_appId_fkey" FOREIGN KEY ("appId") REFERENCES "ExternalApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditAssignee" ADD CONSTRAINT "AuditAssignee_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AuditTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditAssignee" ADD CONSTRAINT "AuditAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditCheck" ADD CONSTRAINT "AuditCheck_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AuditTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditCheck" ADD CONSTRAINT "AuditCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

