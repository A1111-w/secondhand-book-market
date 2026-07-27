import process from "node:process";

if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(".env");
  } catch {
    // Production operators normally inject DATABASE_URL instead of creating .env.
  }
}

const phone = process.env.ADMIN_PHONE?.trim() ?? "";
if (!/^\+?[0-9]{6,20}$/.test(phone)) {
  throw new Error("ADMIN_PHONE must contain a registered phone number");
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

try {
  const result = await prisma.user.updateMany({
    where: { phone },
    data: { role: "admin" },
  });
  if (result.count !== 1) throw new Error("Registered user was not found");
  console.log("Administrator role granted to the selected user.");
} finally {
  await prisma.$disconnect();
}
