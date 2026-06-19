import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";

  const existing = await prisma.admin.findUnique({
    where: { username: adminUsername },
  });

  if (!existing) {
    await prisma.admin.create({
      data: {
        username: adminUsername,
        passwordHash: await hashPassword(adminPassword),
      },
    });
    console.log(`Admin created: ${adminUsername}`);
  } else {
    console.log(`Admin already exists: ${adminUsername}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
