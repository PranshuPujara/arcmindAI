import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";

import { db } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  // @ts-expect-error custom session user id
  if (!session?.user?.id) {
    return null;
  }
  // @ts-expect-error custom session user id
  return session.user.id;
}

function validateWebhookUrl(url: string) {
  try {
    const parsedUrl = new URL(url);

    // Only allow HTTPS
    if (parsedUrl.protocol !== "https:") {
      return {
        valid: false,
        error: "Webhook URL must use HTTPS",
      };
    }

    const hostname = parsedUrl.hostname;

    // SSRF protection
    if (
      hostname === "localhost" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.")
    ) {
      return {
        valid: false,
        error: "Internal URLs are not allowed",
      };
    }

    return {
      valid: true,
    };
  } catch {
    return {
      valid: false,
      error: "Invalid webhook URL",
    };
  }
}

// CREATE WEBHOOK
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUser();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "Webhook URL is required" },
        { status: 400 },
      );
    }

    const validation = validateWebhookUrl(url);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Prevent duplicate webhooks
    const existingWebhook = await db.webhook.findFirst({
      where: {
        userId,
        url,
      },
    });

    if (existingWebhook) {
      return NextResponse.json(
        { error: "Webhook already registered" },
        { status: 409 },
      );
    }

    const secret = crypto.randomBytes(32).toString("hex");

    const webhook = await db.webhook.create({
      data: {
        url,
        secret,
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      webhook,
    });
  } catch (error) {
    console.error("Error creating webhook:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// GET USER WEBHOOKS + DELIVERIES
export async function GET() {
  try {
    const userId = await getAuthenticatedUser();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const webhooks = await db.webhook.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const deliveries = await db.webhookDelivery.findMany({
      where: {
        webhook: {
          userId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      webhooks,
      deliveries,
    });
  } catch (error) {
    console.error("Error fetching webhooks:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE WEBHOOK
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUser();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const { webhookId } = body;

    if (!webhookId) {
      return NextResponse.json(
        { error: "Webhook ID is required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const webhook = await db.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
    });

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    await db.webhookDelivery.deleteMany({
      where: {
        webhookId,
      },
    });

    await db.webhook.delete({
      where: {
        id: webhookId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Webhook deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting webhook:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// ENABLE / DISABLE WEBHOOK
export async function PATCH(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUser();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const { id, isActive } = body;

    if (!id || typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verify ownership
    const webhook = await db.webhook.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const updatedWebhook = await db.webhook.update({
      where: {
        id,
      },
      data: {
        isActive,
      },
    });

    return NextResponse.json({
      success: true,
      webhook: updatedWebhook,
    });
  } catch (error) {
    console.error("Error updating webhook:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
