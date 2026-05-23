import { useState } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import { DOC_ROUTES } from "@/lib/routes";

interface GenerateResponse {
  success: boolean;
  output: string;
}

export function useGenerateSystem(refetchHistory?: () => Promise<void>) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const generate = async (
    userInput: string,
    onChunk?: (chunk: string) => void,
  ): Promise<GenerateResponse | null> => {
    // @ts-expect-error accessToken is added to session in NextAuth callbacks
    if (!session?.user?.accessToken) {
      setError("No access token available. Please log in.");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(DOC_ROUTES.API.GENERATE.ROOT, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userInput,
          // @ts-expect-error accessToken is added to session in NextAuth callbacks
          userId: session?.user.id,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(
          errorBody.error || `HTTP error! status: ${response.status}`,
        );
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let output = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        buffer += chunkText;

        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (part.startsWith("data: ")) {
            const dataStr = part.slice(6);
            if (!dataStr || dataStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed && typeof parsed.chunk === "string") {
                output += parsed.chunk;
                // Real-time UI update with streaming chunks
                onChunk?.(parsed.chunk);
              }
            } catch (e) {
              console.error("Failed to parse SSE chunk:", dataStr);
            }
          }
        }
      }
      /* FINAL BUFFER HANDLING */

      if (buffer.startsWith("data: ")) {
        const dataStr = buffer.slice(6);

        if (dataStr !== "[DONE]") {
          try {
            const parsed = JSON.parse(dataStr);

            if (parsed && typeof parsed.chunk === "string") {
              output += parsed.chunk;
              onChunk?.(parsed.chunk);
            }
          } catch (error) {
            console.error("Failed to parse final SSE chunk:", dataStr);
          }
        }
      }

      reader.releaseLock();

      console.log("FINAL OUTPUT:", output);
      console.log("BUFFER REMAINING:", buffer);
      console.log("RESPONSE STATUS:", response.status);
      console.log(
        "RESPONSE HEADERS:",
        Object.fromEntries(response.headers.entries()),
      );

      if (!output?.trim()) {
        throw new Error(
          "Empty AI response. Possible causes: unauthorized request (401), middleware block, or backend failure.",
        );
      }

      const data: GenerateResponse = {
        success: true,
        output,
      };

      // Refetch history after successful generation
      if (data.success && refetchHistory) {
        await refetchHistory();
      }

      return data;
    } catch (err) {
      let errorMessage = "An error occurred";
      if (axios.isAxiosError(err)) {
        const error = err.response?.data?.error || err.response?.data?.message;
        errorMessage =
          error || `HTTP error! status: ${err.response?.status} (${err.code})`;
        if (err.response?.data?.retryAfter) {
          setRetryAfter(new Date(err.response.data.retryAfter).getTime());
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generate,
    isLoading,
    error,
    retryAfter,
  };
}
