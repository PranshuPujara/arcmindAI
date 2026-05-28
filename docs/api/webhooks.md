# Webhook API Documentation

archmindAI supports webhooks for real-time event notifications when AI generations complete or fail.

---

# Base Endpoint

```txt
/api/webhooks
```

---

# Supported Events

## generation.success

Triggered when a generation completes successfully.

## generation.failed

Triggered when a generation fails due to parsing issues, AI failures, rate limits, or internal errors.

---

# Webhook Payload Structure

Every webhook request sends a JSON payload in the following format:

```json
{
  "event": "generation.success",
  "timestamp": "2026-05-24T10:00:00.000Z",
  "data": {
    "userInput": "Build a scalable chat application",
    "output": "{ ... AI generated system design ... }"
  }
}
```

---

# Failed Generation Payload Example

```json
{
  "event": "generation.failed",
  "timestamp": "2026-05-24T10:00:00.000Z",
  "data": {
    "error": "Failed to parse AI response JSON"
  }
}
```

---

# Security

All webhook requests include an HMAC SHA256 signature header:

```txt
x-webhook-signature
```

The signature is generated using your webhook secret.

Example verification flow:

```ts
import crypto from "crypto";

const expectedSignature = crypto
  .createHmac("sha256", WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest("hex");

const isValid = expectedSignature === req.headers["x-webhook-signature"];
```

---

# Retry Policy

If webhook delivery fails, archmindAI automatically retries delivery up to 3 times.

Retry delays:

- Retry 1 → 1 second
- Retry 2 → 2 seconds
- Retry 3 → 3 seconds

Delivery attempts are logged in the webhook delivery history.

---

# Expected Response

Your webhook endpoint should return a successful HTTP status code:

```txt
2xx
```

Example:

```txt
200 OK
```

Non-2xx responses are treated as failed deliveries and may trigger retries.

---

# Webhook URL Requirements

Webhook endpoints must:

- Use HTTPS
- Be publicly accessible
- Not point to internal/private networks

Blocked examples:

```txt
http://localhost:3000
http://127.0.0.1
http://192.168.x.x
```

---

# Delivery History

Webhook delivery attempts store:

- Event type
- Payload
- Response status
- Response body
- Retry attempts
- Success/failure state
- Timestamp

---

# Example Express.js Webhook Receiver

```ts
import express from "express";

const app = express();

app.use(express.json());

app.post("/webhook", (req, res) => {
  console.log("Webhook received:", req.body);

  res.status(200).json({
    success: true,
  });
});

app.listen(3000, () => {
  console.log("Webhook server running");
});
```
