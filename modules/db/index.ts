// Prisma client singleton (Prisma 7 + node-postgres driver adapter).
//
// Initialised lazily via a Proxy so the DB connection is only created on first
// actual query — never at import time. This keeps `next build` and prerender
// safe even when DATABASE_URL isn't available in that environment.
//
// The global guard keeps a single instance across Next.js dev hot-reloads.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  const adapter = new PrismaPg({ connectionString });
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

function getClient(): PrismaClient {
  return globalForPrisma.prisma ?? createClient();
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
}) as PrismaClient;

export type { Patient, Call, CallType, PatientStatus, CallStatus } from "@prisma/client";
