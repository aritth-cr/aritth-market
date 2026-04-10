#!/usr/bin/env tsx
import { prisma } from '../../shared/prisma/client.js';

interface SeedOptions {
  clerkId: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'INVOICE_REVIEWER' | 'FINANCE' | 'OPERATIONS' | 'SUPPORT';
}

function parseArgs(): SeedOptions {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    if (key && value) {
      options[key] = value;
    }
  }

  const clerkId = options['clerkId'];
  const email = options['email'];
  const name = options['name'];
  const role = (options['role'] ?? 'SUPER_ADMIN') as SeedOptions['role'];

  if (!clerkId || !email || !name) {
    console.error('Usage: tsx seed-admin.ts --clerkId <id> --email <email> --name <name> [--role <role>]');
    console.error('Roles: SUPER_ADMIN, ADMIN, INVOICE_REVIEWER, FINANCE, OPERATIONS, SUPPORT');
    console.error('Default role: SUPER_ADMIN');
    process.exit(1);
  }

  return { clerkId, email, name, role };
}

async function seedAdmin(): Promise<void> {
  try {
    const options = parseArgs();

    // Check if a SUPER_ADMIN already exists
    const existingSuperAdmin = await prisma.aritthUser.findFirst({
      where: {
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });

    if (existingSuperAdmin) {
      console.warn(
        `Warning: A SUPER_ADMIN already exists (${existingSuperAdmin.email}). Proceeding with upsert.`
      );
    }

    // Upsert the AritthUser
    const aritthUser = await prisma.aritthUser.upsert({
      where: { clerkId: options.clerkId },
      update: {
        email: options.email,
        name: options.name,
        role: options.role,
        isActive: true,
      },
      create: {
        clerkId: options.clerkId,
        email: options.email,
        name: options.name,
        role: options.role,
        isActive: true,
      },
    });

    console.log(`✓ AritthUser created/updated successfully`);
    console.log(`  ID: ${aritthUser.id}`);
    console.log(`  Email: ${aritthUser.email}`);
    console.log(`  Name: ${aritthUser.name}`);
    console.log(`  Role: ${aritthUser.role}`);
    console.log(`  Active: ${aritthUser.isActive}`);
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
 