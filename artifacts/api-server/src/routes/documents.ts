import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, chatHistoryTable, documentsTable } from "@workspace/db";
import {
  AnalyzeDocumentBody,
  AnalyzeDocumentParams,
  AnalyzeDocumentResponse,
  AskDocumentQuestionBody,
  AskDocumentQuestionParams,
  AskDocumentQuestionResponse,
  CreateDocumentBody,
  CreateDocumentResponse,
  GetDocumentParams,
  GetDocumentResponse,
  GetOverviewResponse,
  ListChatMessagesParams,
  ListChatMessagesResponse,
  ListDocumentsResponse,
} from "@workspace/api-zod";
import {
  analyzeContract,
  answerContractQuestion,
} from "../lib/gemini";

const router: IRouter = Router();

function toDocumentResponse(document: typeof documentsTable.$inferSelect) {
  return {
    ...document,
    status: document.status as "ready" | "analyzing" | "draft",
    risks: Array.isArray(document.risks) ? document.risks : [],
    analyzedAt: document.analyzedAt?.toISOString() ?? null,
    createdAt: document.createdAt.toISOString(),
  };
}

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value ?? "";
}

router.get("/documents", async (_req, res): Promise<void> => {
  const documents = await db
    .select()
    .from(documentsTable)
    .orderBy(desc(documentsTable.createdAt));
  res.json(ListDocumentsResponse.parse(documents.map(toDocumentResponse)));
});

router.post("/documents", async (req, res): Promise<void> => {
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [document] = await db
    .insert(documentsTable)
    .values({
      title: parsed.data.title,
      fileName: parsed.data.fileName ?? null,
      sourceText: parsed.data.sourceText,
      status: "draft",
      risks: [],
      riskCount: 0,
    })
    .returning();

  res.status(201).json(CreateDocumentResponse.parse(toDocumentResponse(document)));
});

router.get("/documents/:documentId", async (req, res): Promise<void> => {
  const params = GetDocumentParams.safeParse({
    documentId: getParam(req.params.documentId),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [document] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, params.data.documentId));
  if (!document) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json(GetDocumentResponse.parse(toDocumentResponse(document)));
});

router.post("/documents/:documentId", async (req, res): Promise<void> => {
  const params = AnalyzeDocumentParams.safeParse({
    documentId: getParam(req.params.documentId),
  });
  const body = AnalyzeDocumentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({
      error: params.success
        ? body.success
          ? "Invalid request"
          : body.error.message
        : params.error.message,
    });
    return;
  }

  const [document] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, params.data.documentId));
  if (!document) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const sourceText = body.data.sourceText?.trim() || document.sourceText;
  try {
    const analysis = await analyzeContract(
      sourceText,
      body.data.model,
    );
    const [updated] = await db
      .update(documentsTable)
      .set({
        sourceText,
        status: "ready",
        summary: analysis.summary,
        risks: analysis.risks,
        riskCount: analysis.risks.length,
        analyzedAt: new Date(),
      })
      .where(eq(documentsTable.id, document.id))
      .returning();

    res.json(AnalyzeDocumentResponse.parse(toDocumentResponse(updated)));
  } catch (error) {
    req.log.warn({ error }, "Contract analysis failed");
    res.status(400).json({
      error: "Gemini could not analyze this document. Please try again.",
    });
  }
});

router.get("/documents/:documentId/chat", async (req, res): Promise<void> => {
  const params = ListChatMessagesParams.safeParse({
    documentId: getParam(req.params.documentId),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const messages = await db
    .select()
    .from(chatHistoryTable)
    .where(eq(chatHistoryTable.documentId, params.data.documentId))
    .orderBy(chatHistoryTable.createdAt);
  res.json(
    ListChatMessagesResponse.parse(
      messages.map((message) => ({
        ...message,
        role: message.role as "user" | "assistant",
        createdAt: message.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/documents/:documentId/chat", async (req, res): Promise<void> => {
  const params = AskDocumentQuestionParams.safeParse({
    documentId: getParam(req.params.documentId),
  });
  const body = AskDocumentQuestionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({
      error: params.success
        ? body.success
          ? "Invalid request"
          : body.error.message
        : params.error.message,
    });
    return;
  }

  const [document] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, params.data.documentId));
  if (!document) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  try {
    const [userMessage] = await db
      .insert(chatHistoryTable)
      .values({
        documentId: document.id,
        role: "user",
        content: body.data.question,
      })
      .returning();
    const answer = await answerContractQuestion(
      document.sourceText,
      body.data.question,
      body.data.model,
    );
    const [assistantMessage] = await db
      .insert(chatHistoryTable)
      .values({
        documentId: document.id,
        role: "assistant",
        content: answer,
      })
      .returning();

    res.status(201).json(
      AskDocumentQuestionResponse.parse({
        ...assistantMessage,
        role: "assistant",
        createdAt: assistantMessage.createdAt.toISOString(),
      }),
    );
    req.log.info({ userMessageId: userMessage.id }, "Contract question answered");
  } catch (error) {
    req.log.warn({ error }, "Contract question failed");
    res.status(400).json({
      error: "Gemini could not answer this question. Please try again.",
    });
  }
});

router.get("/overview", async (_req, res): Promise<void> => {
  const [documentStats] = await db
    .select({
      documentCount: sql<number>`count(*)::int`,
      analyzedCount: sql<number>`count(*) filter (where ${documentsTable.status} = 'ready')::int`,
      openRiskCount: sql<number>`coalesce(sum(${documentsTable.riskCount}), 0)::int`,
      lastAnalyzedAt: sql<Date | null>`max(${documentsTable.analyzedAt})`,
    })
    .from(documentsTable);

  res.json(
    GetOverviewResponse.parse({
      documentCount: documentStats.documentCount,
      analyzedCount: documentStats.analyzedCount,
      openRiskCount: documentStats.openRiskCount,
      lastAnalyzedAt: documentStats.lastAnalyzedAt
        ? new Date(documentStats.lastAnalyzedAt).toISOString()
        : null,
    }),
  );
});

export default router;
