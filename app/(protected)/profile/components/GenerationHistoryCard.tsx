"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import StarRating from "@/components/ui/star-rating";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { DOC_ROUTES } from "@/lib/routes";

interface Generation {
  id: string;
  systemName?: string;
  userInput: string;
  createdAt: Date;
  rating?: number | null;
}

interface GenerationHistoryCardProps {
  history: Generation[];
  isLoading: boolean;
}

export function GenerationHistoryCard({
  history,
  isLoading,
}: GenerationHistoryCardProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingOverrides, setRatingOverrides] = useState<
    Record<string, number | null>
  >({});
  const [savingRatingId, setSavingRatingId] = useState<string | null>(null);

  // Filter history based on search term (case-insensitive)
  const filteredHistory = useMemo(() => {
    return history
      .filter((gen) =>
        (gen.systemName || "Custom Generation")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [history, searchTerm]);

  const getRating = (generation: Generation) =>
    ratingOverrides[generation.id] ?? generation.rating ?? 0;

  const handleRateHistoryItem = async (
    generation: Generation,
    rating: number,
  ) => {
    if (savingRatingId === generation.id) return;

    const previousRating = getRating(generation);

    try {
      setSavingRatingId(generation.id);
      setRatingOverrides((current) => ({
        ...current,
        [generation.id]: rating,
      }));

      const response = await fetch(`/api/generate/${generation.id}/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating }),
      });

      if (!response.ok) {
        throw new Error("Failed to save rating");
      }
    } catch (error) {
      console.error("Failed to save history rating:", error);
      setRatingOverrides((current) => ({
        ...current,
        [generation.id]: previousRating,
      }));
    } finally {
      setSavingRatingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Generation History
        </CardTitle>
        <CardDescription>
          Your previous AI generations and chats
        </CardDescription>
        <input
          type="text"
          placeholder="Search by system name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="rounded-md border">
            <div className="grid grid-cols-5 gap-4 border-b p-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="grid grid-cols-5 gap-4 border-b p-4 last:border-b-0"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : filteredHistory.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Input</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((gen: Generation) => (
                  <TableRow
                    key={gen.id}
                    onClick={() =>
                      router.push(`${DOC_ROUTES.GENERATE}/${gen.id}`)
                    }
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">
                      {new Date(gen.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {gen.systemName || "Custom Generation"}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      <span className="text-muted-foreground">
                        {gen.userInput.substring(0, 50)}
                        {gen.userInput.length > 50 ? "..." : ""}
                      </span>
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <div className="flex flex-col gap-1">
                        <StarRating
                          rating={getRating(gen)}
                          onRate={(value) => handleRateHistoryItem(gen, value)}
                          disabled={savingRatingId === gen.id}
                          size={16}
                        />
                        <span className="text-xs text-muted-foreground">
                          {getRating(gen)
                            ? `${getRating(gen)}/5`
                            : "Not rated"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(gen.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No generations found</h3>
            <p>Try adjusting your search or create new AI generations.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
