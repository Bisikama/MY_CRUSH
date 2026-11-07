ALTER TABLE "Player" ALTER COLUMN "tokenHash" DROP NOT NULL;

CREATE TYPE "AccountRole" AS ENUM ('PLAYER', 'ADMIN');

CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3) NOT NULL,
    "role" "AccountRole" NOT NULL DEFAULT 'PLAYER',
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Account_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "playerId" UUID NOT NULL,
    "accountId" UUID,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AuthSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuthSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "EmailChallenge" (
    "id" UUID NOT NULL,
    "flowHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "playerId" UUID,
    "digest" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3) NOT NULL,
    "sendId" UUID,
    CONSTRAINT "EmailChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuthRateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "Account_playerId_key" ON "Account"("playerId");
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE INDEX "AuthSession_accountId_idx" ON "AuthSession"("accountId");
CREATE INDEX "AuthSession_playerId_idx" ON "AuthSession"("playerId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE UNIQUE INDEX "EmailChallenge_flowHash_purpose_key" ON "EmailChallenge"("flowHash", "purpose");
CREATE INDEX "EmailChallenge_expiresAt_idx" ON "EmailChallenge"("expiresAt");
CREATE INDEX "AuthRateLimit_expiresAt_idx" ON "AuthRateLimit"("expiresAt");
