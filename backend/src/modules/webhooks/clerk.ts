import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHmac } from 'crypto';
import { prisma } from '../../shared/prisma/client.js';

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string;
    last_name?: string;
  };
}

async function verifyWebhookSignature(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<boolean> {
  const svixId = request.headers['svix-id'] as string;
  const svixTimestamp = request.headers['svix-timestamp'] as string;
  const svixSignature = request.headers['svix-signature'] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    await reply.status(400).send({ error: 'Missing required svix headers' });
    return false;
  }

  const webhookSecret = process.env['CLERK_WEBHOOK_SECRET'] ?? '';
  if (!webhookSecret) {
    await reply.status(500).send({ error: 'Webhook secret not configured' });
    return false;
  }

  // Decode the secret: remove "whsec_" prefix and base64 decode
  const secret = webhookSecret.startsWith('whsec_')
    ? Buffer.from(webhookSecret.slice(6), 'base64')
    : Buffer.from(webhookSecret, 'base64');

  const rawBody = JSON.stringify(request.body);
  const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
  const hmac = createHmac('sha256', secret).update(toSign).digest('base64');

  // Extract all signatures from the header (format: v1,signature1 v1,signature2 ...)
  const signatures = svixSignature
    .split(' ')
    .map((sig) => {
      const parts = sig.split(',');
      return parts.length === 2 ? parts[1] : null;
    })
    .filter((sig) => sig !== null);

  if (!signatures.some((sig) => sig === hmac)) {
    await reply.status(401).send({ error: 'Invalid webhook signature' });
    return false;
  }

  return true;
}

async function handleUserCreated(event: ClerkWebhookEvent): Promise<void> {
  const clerkId = event.data.id;
  const email = event.data.email_addresses?.[0]?.email_address;
  const firstName = event.data.first_name ?? '';
  const lastName = event.data.last_name ?? '';
  const fullName = `${firstName} ${lastName}`.trim();

  if (!email || !clerkId) {
    console.warn('Clerk user.created event missing email or clerkId', event.data);
    return;
  }

  // Check if email is from aritth.com domain
  if (email.endsWith('@aritth.com')) {
    await prisma.aritthUser.upsert({
      where: { clerkId },
      update: {
        name: fullName || email,
        isActive: true,
      },
      create: {
        clerkId,
        email,
        name: fullName || email,
        role: 'SUPPORT',
        isActive: true,
      },
    });
    console.log(`[Clerk Webhook] AritthUser created/updated: ${email}`);
    return;
  }

  // Extract domain from email (e.g., usuario@empresa.com → empresa.com)
  const emailDomain = email.split('@')[1];
  if (!emailDomain) {
    console.warn('Could not extract domain from email', email);
    return;
  }

  // Try to find company with matching email domain
  const company = await prisma.company.findFirst({
    where: {
      OR: [
        { invoiceEmail: { endsWith: `@${emailDomain}` } },
        { quoteEmail: { endsWith: `@${emailDomain}` } },
      ],
    },
  });

  if (!company) {
    console.log(
      `[Clerk Webhook] No company found for domain ${emailDomain}, deferring user creation for ${email}`
    );
    return;
  }

  // Create or update User for this company
  await prisma.user.upsert({
    where: { clerkId },
    update: {
      name: fullName || email,
      isActive: true,
    },
    create: {
      clerkId,
      email,
      name: fullName || email,
      companyId: company.id,
      role: 'PURCHASER',
      isActive: true,
    },
  });

  console.log(`[Clerk Webhook] User created/updated: ${email} for company ${company.id}`);
}

async function handleUserUpdated(event: ClerkWebhookEvent): Promise<void> {
  const clerkId = event.data.id;
  const firstName = event.data.first_name ?? '';
  const lastName = event.data.last_name ?? '';
  const fullName = `${firstName} ${lastName}`.trim();

  if (!clerkId) {
    console.warn('Clerk user.updated event missing clerkId', event.data);
    return;
  }

  // Update User if exists
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (user && fullName) {
    await prisma.user.update({
      where: { clerkId },
      data: { name: fullName },
    });
    console.log(`[Clerk Webhook] User updated: ${clerkId}`);
  }

  // Update AritthUser if exists
  const aritthUser = await prisma.aritthUser.findUnique({ where: { clerkId } });
  if (aritthUser && fullName) {
    await prisma.aritthUser.update({
      where: { clerkId },
      data: { name: fullName },
    });
    console.log(`[Clerk Webhook] AritthUser updated: ${clerkId}`);
  }
}

async function handleUserDeleted(event: ClerkWebhookEvent): Promise<void> {
  const clerkId = event.data.id;

  if (!clerkId) {
    console.warn('Clerk user.deleted event missing clerkId', event.data);
    return;
  }

  // Mark User as inactive
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (user) {
    await prisma.user.update({
      where: { clerkId },
      data: { isActive: false },
    });
    console.log(`[Clerk Webhook] User marked inactive: ${clerkId}`);
  }

  // Mark AritthUser as inactive
  const aritthUser = await prisma.aritthUser.findUnique({ where: { clerkId } });
  if (aritthUser) {
    await prisma.aritthUser.update({
      where: { clerkId },
      data: { isActive: false },
    });
    console.log(`[Clerk Webhook] AritthUser marked inactive: ${clerkId}`);
  }
}

export async function clerkWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: ClerkWebhookEvent }>(
    '/clerk',
    async (request: FastifyRequest<{ Body: ClerkWebhookEvent }>, reply: FastifyReply) => {
      // Verify SVIX signature
      const isValid = await verifyWebhookSignature(request, reply);
      if (!isValid) {
        return;
      }

      const event = request.body;
      console.log(`[Clerk Webhook] Received event: ${event.type}`);

      try {
        switch (event.type) {
          case 'user.created':
            await handleUserCreated(event);
            break;

          case 'user.updated':
            await handleUserUpdated(event);
            break;

          case 'user.deleted':
            await handleUserDeleted(event);
            break;

          default:
            console.log(`[Clerk Webhook] Unhandled event type: ${event.type}`);
        }

        // Always return 200 to acknowledge receipt (prevents Clerk from retrying)
        return reply.status(200).send({ received: true });
      } catch (error) {
        console.error("[Clerk Webhook] Error processing event:", error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
}
