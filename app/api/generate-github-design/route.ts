import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { GithubRepoSystemPrompt } from "@/lib/prompts/githubRepoPrompt";
import { formatRepositoryAnalysisForAI } from "@/app/(protected)/generate/utils/formatRepoAnalysis";
import { RepositoryAnalysis } from "@/types/repository-analysis";
import { db } from "@/lib/prisma";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { streamGeminiWithFallback } from "@/app/(protected)/generate/utils/aiClient";
import { getUserApiKeys } from "@/lib/api-keys/getUserApiKeys";
import {
  aiGenerationFailureTotal,
  databaseQueryDurationSeconds,
  httpRequestsTotal,
} from "@/lib/metrics";

interface GenerateGithubDesignRequest { 
  owner: string;
  repo: string;
  analysisData: RepositoryAnalysis;
  branch?: string; 
}

export async function POST(request: NextRequest) {
  const route = "/api/generate-github-design";
  const method = "POST"; 
  let aiRequested = false;  
  let aiFailureRecorded = false;

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    // @ts-expect-error id is added to session in NextAuth callbacks
    const userId = session?.user?.id;

    if (!userId) {
      httpRequestsTotal.inc({ route, method, status_code: "401" });
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body: GenerateGithubDesignRequest = await request.json();
    const { owner, repo, branch, analysisData } = body;

    if (!owner || !repo || !analysisData) {
      httpRequestsTotal.inc({ route, method, status_code: "400" });
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: owner, repo, or analysisData",
        },
        { status: 400 },
      );
    }

    // Check if a design already exists for this repository
    const repoIdentifier = branch
      ? `${owner}/${repo}:${branch}`
      : `${owner}/${repo}`;
    const dbFindStart = Date.now();
    const existingGeneration = await db.generation.findFirst({
      where: {
        userId: userId,
        userInput: repoIdentifier,
        githubGeneration: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "desc", // Get the most recent one
      },
    });
    databaseQueryDurationSeconds.observe(
      { operation: "findFirst" },
      (Date.now() - dbFindStart) / 1000,
    );

    // // If design already exists, return it from cache
    // if (existingGeneration?.githubGeneration) {
    //   return NextResponse.json({
    //     success: true,
    //     generationId: existingGeneration.id,
    //     mermaidDiagram: existingGeneration.githubGeneration,
    //     cached: true, // Indicate this is from cache
    //   });
    // }

   if (existingGeneration?.githubGeneration) {
  const encoder = new TextEncoder();
  const cachedDiagram = existingGeneration.githubGeneration;

  const cachedStream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(cachedDiagram)
      );

      controller.close();
    },
  }); 

 return new Response(cachedStream, {
  headers: {
    "Content-Type":
    "text/plain; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  },
});

}  

    // Format analysis data for AI
    const userMessage = formatRepositoryAnalysisForAI(
      owner,
      repo,
      analysisData,
    );

    // Call AI to generate Mermaid diagram
    const messages = [
      new SystemMessage(GithubRepoSystemPrompt),
      new HumanMessage(userMessage),
    ];

    // 🔑 Fetch user's API keys
    const userApiKeys = await getUserApiKeys(userId);

    aiRequested = true; 

    // streaming version
     const responseStream = await streamGeminiWithFallback(
      messages,
       userApiKeys.geminiApiKey 
      );
         let mermaidDiagram = "";
         const encoder = new TextEncoder();
     const readable = new ReadableStream({
         async start(controller) {
    try {
      for await (const chunk of responseStream) {
        const text =
          chunk.content?.toString() || "";

        // Store full response
        mermaidDiagram += text;

        // Stream chunk immediately
        controller.enqueue(
          encoder.encode(text)
        );
      }
      // Cleanup markdown formatting
      mermaidDiagram = mermaidDiagram
        .replace(/```mermaid\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // Save completed response
      await db.generation.create({
        data: {
          userInput: repoIdentifier,
          githubGeneration: mermaidDiagram,
          userId,
        },
      });

        controller.close();
     } catch (error) {
      console.error(
        "Streaming error:",
        error
      );

      controller.error(error);
    }
  },
});
  
return new Response(readable, {
  headers: {
    "Content-Type":
    "text/plain; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  },
});

    
    // let mermaidDiagram = response.content as string;

    // // Clean up the response - remove markdown code blocks if present
    // mermaidDiagram = mermaidDiagram
    //   .replace(/```mermaid\n?/g, "")
    //   .replace(/```\n?/g, "")
    //   .trim();

    // // Save to database
    // const generation = await db.generation.create({
    //   data: {
    //     userInput: repoIdentifier,
    //     githubGeneration: mermaidDiagram,
    //     userId: userId,
    //   },
    // });

    // return NextResponse.json({
    //   success: true,
    //   generationId: generation.id,
    //   mermaidDiagram,
    //   cached: false, // Indicate this is newly generated
    // });

  } catch (error) {
    if (aiRequested && !aiFailureRecorded) {
      aiGenerationFailureTotal.inc();
    }
    console.error("GitHub design generation error:", error);
    httpRequestsTotal.inc({ route, method, status_code: "500" });
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate system design",
      },
      { status: 500 }
    );
  }  
}  