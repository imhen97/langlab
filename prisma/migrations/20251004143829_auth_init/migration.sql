-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "credits" INTEGER NOT NULL DEFAULT 3,
    "referredBy" TEXT,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "passwordHash" TEXT
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "transcript" TEXT,
    "duration" INTEGER,
    "thumbnail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "thumbnail" TEXT,
    "duration" INTEGER,
    "summary" JSONB NOT NULL,
    "vocab" JSONB NOT NULL,
    "patterns" JSONB NOT NULL,
    "script" JSONB NOT NULL,
    "quizzes" JSONB NOT NULL,
    "speaking" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lessons_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "lessons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "score" INTEGER,
    "state" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "detail" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'TRIAL',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wordbook_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "translation" TEXT NOT NULL DEFAULT '',
    "context" TEXT NOT NULL,
    "timestamp" REAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'caption',
    "mastery" INTEGER NOT NULL DEFAULT 0,
    "isLearned" BOOLEAN NOT NULL DEFAULT false,
    "nextReview" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "wordbook_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "wordbook_items_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "streaks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "streaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "referral_rewards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "referral_rewards_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "referral_rewards_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "progress_userId_lessonId_key" ON "progress"("userId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wordbook_items_userId_word_lessonId_key" ON "wordbook_items"("userId", "word", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "streaks_userId_key" ON "streaks"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
