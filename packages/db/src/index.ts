import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __vigiaGovPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__vigiaGovPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__vigiaGovPrisma = prisma;
}

export * from "@prisma/client";
