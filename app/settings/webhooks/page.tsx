"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

import {
  Plus,
  Trash2,
  Globe,
  Activity,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { Background } from "@/components/background";
import { Navbar } from "@/components/blocks/navbar";
import { Footer } from "@/components/blocks/footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Webhook {
  id: string;
  url: string;
  isActive: boolean;
  createdAt: string;
}

interface Delivery {
  id: string;
  event: string;
  success: boolean;
  responseStatus: number | null;
  createdAt: string;
}

export default function WebhooksPage() {
  const { status } = useSession();

  const [webhookUrl, setWebhookUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  const fetchWebhooks = async () => {
    try {
      setPageLoading(true);

      const response = await fetch("/api/webhooks");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch webhooks");
      }

      setWebhooks(data.webhooks || []);
      setDeliveries(data.deliveries || []);
    } catch (error) {
      console.error(error);
      setWebhooks([]);
      setDeliveries([]);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") {
      setPageLoading(true);
      return;
    }

    if (status === "unauthenticated") {
      setPageLoading(false);
      setWebhooks([]);
      setDeliveries([]);
      return;
    }

    fetchWebhooks();
  }, [status]);

  const handleAddWebhook = async () => {
    if (!webhookUrl.trim()) return;

    try {
      setLoading(true);

      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhookUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to create webhook");
        return;
      }

      setWebhookUrl("");
      fetchWebhooks();
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (webhookId: string) => {
    try {
      const response = await fetch("/api/webhooks", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhookId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to delete webhook");
        return;
      }

      fetchWebhooks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch("/api/webhooks", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          isActive: !isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to update webhook");
        return;
      }

      fetchWebhooks();
    } catch (error) {
      console.error(error);
    }
  };

  const showSkeleton = status === "loading" || pageLoading;

  const isAuthenticated = status === "authenticated";

  return (
    <div>
      <Background variant="top" className="from-muted/80 via-muted to-muted/80">
        <div className="flex min-h-screen flex-col">
          <Navbar />

          <main className="flex-1 py-28 px-4 md:px-8">
            {/* HERO */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mx-auto max-w-4xl text-center"
            >
              <div className="mb-6 flex justify-center">
                <div className="bg-primary/10 border-primary/20 flex items-center gap-2 rounded-full border px-5 py-2 backdrop-blur">
                  <Activity className="text-primary size-4" />

                  <span className="text-sm font-medium">
                    Real-time Event Integrations
                  </span>
                </div>
              </div>

              <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
                Webhook Management
              </h1>

              <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg leading-relaxed italic">
                Configure secure webhook endpoints to instantly receive
                generation success and failure events from archmindAI.
              </p>
            </motion.div>

            {/* ADD WEBHOOK */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mx-auto mt-14 w-full max-w-4xl px-4"
            >
              <div className="border-border/50 bg-background/60 rounded-3xl border p-8 shadow-2xl backdrop-blur-xl">
                <div className="mb-6 flex items-center gap-3">
                  <div className="bg-primary/10 rounded-2xl p-3">
                    <Globe className="text-primary size-6" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-semibold">
                      Add Webhook Endpoint
                    </h2>

                    <p className="text-muted-foreground mt-1 text-sm">
                      Receive POST requests whenever a generation completes.
                    </p>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-4 md:flex-row md:items-center">
                  <input
                    type="text"
                    placeholder={
                      isAuthenticated
                        ? "https://yourdomain.com/webhook"
                        : "Login to add webhook endpoints"
                    }
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    disabled={!isAuthenticated}
                    className=" w-full min-w-0 border-border bg-background/80 focus:ring-primary/30 h-14 flex-1 rounded-2xl border px-5 outline-none transition-all focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50"
                  />

                  <Button
                    size="lg"
                    onClick={handleAddWebhook}
                    disabled={loading || !isAuthenticated}
                    className="h-14 shrink-0 rounded-2xl px-8 text-base"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 size-5 animate-spin" />
                    ) : (
                      <Plus className="mr-2 size-5" />
                    )}

                    {loading ? "Adding..." : "Add Webhook"}
                  </Button>
                </div>

                {!isAuthenticated && (
                  <p className="mt-4 text-sm text-amber-500">
                    You must be logged in to manage webhooks.
                  </p>
                )}

                <div className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
                  <ShieldCheck className="size-4" />
                  Only secure HTTPS webhook endpoints are allowed.
                </div>
              </div>
            </motion.div>

            {/* WEBHOOKS */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mx-auto mt-14 w-full max-w-4xl px-4"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-3xl font-bold">Registered Webhooks</h2>

                {!showSkeleton && isAuthenticated && (
                  <div className="text-muted-foreground text-sm">
                    {webhooks.length} endpoints configured
                  </div>
                )}
              </div>

              <div className="space-y-5">
                {showSkeleton &&
                  Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="border-border/40 bg-background/50 rounded-3xl border p-6 backdrop-blur-xl"
                    >
                      <div className="space-y-4">
                        <Skeleton className="h-5 w-28 rounded-full" />

                        <Skeleton className="h-4 w-full rounded-xl" />

                        <Skeleton className="h-4 w-1/2 rounded-xl" />

                        <div className="flex gap-3 pt-2">
                          <Skeleton className="h-10 w-24 rounded-xl" />

                          <Skeleton className="h-10 w-10 rounded-xl" />
                        </div>
                      </div>
                    </div>
                  ))}

                {!showSkeleton && !isAuthenticated && (
                  <div className="border-border/50 bg-background/40 rounded-3xl border p-10 text-center backdrop-blur-xl">
                    <p className="text-muted-foreground">
                      Login to view your webhooks.
                    </p>
                  </div>
                )}

                {!showSkeleton && isAuthenticated && webhooks.length === 0 && (
                  <div className="border-border/50 bg-background/40 rounded-3xl border p-10 text-center backdrop-blur-xl">
                    <p className="text-muted-foreground">
                      No webhooks added yet.
                    </p>
                  </div>
                )}

                {!showSkeleton &&
                  isAuthenticated &&
                  webhooks.map((webhook) => (
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      key={webhook.id}
                      className="border-border/40 bg-background/50 rounded-3xl border p-6 backdrop-blur-xl transition-all"
                    >
                      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-3 w-3 rounded-full ${
                                webhook.isActive ? "bg-green-500" : "bg-red-500"
                              }`}
                            />

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                webhook.isActive
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-red-500/10 text-red-400"
                              }`}
                            >
                              {webhook.isActive ? "Active" : "Disabled"}
                            </span>
                          </div>

                          <p className="break-all font-mono text-sm">
                            {webhook.url}
                          </p>

                          <p className="text-muted-foreground text-xs">
                            Added {new Date(webhook.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            variant={webhook.isActive ? "outline" : "default"}
                            className="rounded-xl"
                            onClick={() =>
                              handleToggle(webhook.id, webhook.isActive)
                            }
                          >
                            {webhook.isActive ? "Disable" : "Enable"}
                          </Button>

                          <Button
                            variant="destructive"
                            className="rounded-xl"
                            onClick={() => handleDelete(webhook.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </motion.div>

            {/* DELIVERY LOGS */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mx-auto mt-16 max-w-4xl px-4"
            >
              <div className="mb-6">
                <h2 className="text-3xl font-bold">Recent Deliveries</h2>

                <p className="text-muted-foreground mt-2">
                  Monitor webhook delivery attempts and responses.
                </p>
              </div>

              <div className="border-border/50 bg-background/50 overflow-hidden rounded-3xl border backdrop-blur-xl px-2">
                <div className="divide-border/40 divide-y">
                  {showSkeleton &&
                    Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="flex flex-col gap-4 p-6">
                        <Skeleton className="h-5 w-48 rounded-xl" />

                        <Skeleton className="h-4 w-32 rounded-xl" />
                      </div>
                    ))}

                  {!showSkeleton && !isAuthenticated && (
                    <div className="p-10 text-center">
                      <p className="text-muted-foreground">
                        Login to view webhook deliveries.
                      </p>
                    </div>
                  )}

                  {!showSkeleton &&
                    isAuthenticated &&
                    deliveries.length === 0 && (
                      <div className="p-10 text-center">
                        <p className="text-muted-foreground">
                          No webhook deliveries yet.
                        </p>
                      </div>
                    )}

                  {!showSkeleton &&
                    isAuthenticated &&
                    deliveries.map((delivery) => (
                      <div
                        key={delivery.id}
                        className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="font-semibold">{delivery.event}</p>

                          <p className="text-muted-foreground mt-1 text-sm">
                            {new Date(delivery.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                              delivery.success
                                ? "bg-green-500/10 text-green-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {delivery.success ? (
                              <CheckCircle2 className="size-3" />
                            ) : (
                              <XCircle className="size-3" />
                            )}

                            {delivery.success ? "Success" : "Failed"}
                          </span>

                          <span className="font-mono text-sm">
                            HTTP {delivery.responseStatus || "ERR"}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          </main>

          <Footer />
        </div>
      </Background>
    </div>
  );
}
