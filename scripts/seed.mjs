import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("Checking database initialization...");

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (existingAdmin) {
    console.log(`[OK] Admin user already exists: ${existingAdmin.name} (${existingAdmin.email})`);
  } else {
    // Create Default Admin User
    const adminPassword = hashPassword("admin123");
    const admin = await prisma.user.create({
      data: {
        name: "Gaurav (Admin)",
        userId: "admin",
        email: "gaurav141@gmail.com",
        password: adminPassword,
        role: "ADMIN",
        designation: "Chief Administrator",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=gaurav141",
      },
    });
    console.log(`[PASS] Admin user initialized: ${admin.name} (${admin.userId} / ${admin.email})`);
  }

  // Ensure Admin notification email setting exists
  await prisma.systemSetting.upsert({
    where: { key: "ADMIN_NOTIFICATION_EMAIL" },
    update: {},
    create: {
      key: "ADMIN_NOTIFICATION_EMAIL",
      value: "gaurav141@gmail.com",
    },
  });

  console.log("[PASS] System setting ADMIN_NOTIFICATION_EMAIL verified.");
  console.log("Database ready.");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
