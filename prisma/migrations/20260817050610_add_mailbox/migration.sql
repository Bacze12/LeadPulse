-- CreateTable
CREATE TABLE "mailboxes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Mi casilla',
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "imapHost" TEXT NOT NULL DEFAULT 'imap.titan.email',
    "imapPort" INTEGER NOT NULL DEFAULT 993,
    "smtpHost" TEXT NOT NULL DEFAULT 'smtp.titan.email',
    "smtpPort" INTEGER NOT NULL DEFAULT 465,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mailboxes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mailboxes_userId_key" ON "mailboxes"("userId");

-- AddForeignKey
ALTER TABLE "mailboxes" ADD CONSTRAINT "mailboxes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
