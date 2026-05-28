import crypto from "crypto";

import { Prisma } from "@prisma/client";

import { db } from "@/lib/prisma";

interface SendWebhookPayload {
  userId: string;
  event: "generation.success" | "generation.failed";
  data: Prisma.InputJsonValue;
}

export async function sendWebhook({ userId, event, data }: SendWebhookPayload) {
  try {
    // Get all active webhooks
    const webhooks = await db.webhook.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    // No webhooks registered
    if (!webhooks.length) {
      return;
    }

    // Send to each webhook
    for (const webhook of webhooks) {
      const isSuccess = event === "generation.success";
      const safeData = (data as Record<string, unknown>) || {};

      const payload: Prisma.InputJsonValue = {
        event,
        timestamp: new Date().toISOString(),
        content: isSuccess
          ? `✅ archmindAI: System generation successful for "${safeData.userInput || safeData.repository || "N/A"}"`
          : `❌ archmindAI: System generation failed: ${safeData.error || "Unknown error"}`,
        data,
      };

      // Generate signature
      const signature = crypto
        .createHmac("sha256", webhook.secret)
        .update(JSON.stringify(payload))
        .digest("hex");

      let success = false;
      let responseStatus: number | null = null;
      let responseBody: string | null = null;

      let attempts = 0;

      while (attempts < 3 && !success) {
        attempts++;

        try {
          const response = await fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-webhook-signature": signature,
            },
            body: JSON.stringify(payload),
          });

          responseStatus = response.status;
          responseBody = await response.text();

          if (response.ok) {
            success = true;
            break;
          }
        } catch (error) {
          console.error(`Webhook attempt ${attempts} failed:`, error);

          responseBody = "Network error";
        }

        // Retry delay (1s → 2s → 3s)
        if (!success && attempts < 3) {
          await new Promise((resolve) => setTimeout(resolve, attempts * 1000));
        }
      }

      // Save delivery log
      await db.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload,
          attempts,
          success,
          responseStatus,
          responseBody,
        },
      });
    }
  } catch (error) {
    console.error("Webhook sending error:", error);
  }
}
