-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('follow_up', 'reminder');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('pending', 'calling', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('calling', 'completed', 'failed');

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "callType" "CallType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "doctorName" TEXT,
    "medicineName" TEXT,
    "lastVisitDate" TIMESTAMP(3),
    "status" "PatientStatus" NOT NULL DEFAULT 'pending',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "callType" "CallType" NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'calling',
    "vapiCallId" TEXT,
    "summary" TEXT,
    "transcriptUrl" TEXT,
    "recordingUrl" TEXT,
    "structuredData" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Patient_status_scheduledAt_idx" ON "Patient"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Call_vapiCallId_key" ON "Call"("vapiCallId");

-- CreateIndex
CREATE INDEX "Call_patientId_idx" ON "Call"("patientId");

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
