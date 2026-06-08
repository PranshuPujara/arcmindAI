"use server";

import { sendMail } from "@/lib/mailer";
import { contactFormSchema } from "@/lib/validation/contactFormSchema";
import { getContactEmailTemplate } from "@/components/email-template/contactEmailTemplate";
import { headers } from "next/headers";
import { contactRateLimitIP } from "@/lib/rateLimit";

export async function submitContactForm(formData: FormData) {
  // Get client IP for rate limiting
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const realIp = headerList.get("x-real-ip");
  const ip =
    (forwardedFor ? forwardedFor.split(",")[0].trim() : realIp) || "unknown";

  // Check rate limit: 3 requests per IP per hour
  const { success } = await contactRateLimitIP.limit(`contact:${ip}`);
  if (!success) {
    return {
      success: false,
      error: "Too many contact form submissions. Please try again in an hour.",
    };
  }

  const data = {
    firstname: formData.get("firstname") as string,
    lastname: formData.get("lastname") as string,
    email: formData.get("email") as string,
    message: formData.get("message") as string,
    agree: formData.get("agree") === "on",
  };

  const validation = contactFormSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: "Validation failed. Please check your inputs.",
    };
  }

  try {
    const emailPayload = getContactEmailTemplate(validation.data);
    await sendMail({
      to: process.env.ADMIN_EMAIL!,
      ...emailPayload,
    });
    return { success: true };
  } catch (err) {
    console.error("Error sending email:", err);
    return { success: false, error: "Failed to send email. Please try again." };
  }
}
