import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = "gemini-3.6-flash";

export type ContractAnalysis = {
  summary: string;
  risks: Array<{
    severity: "high" | "medium" | "low";
    title: string;
    explanation: string;
    excerpt: string | null;
  }>;
};

function getModel(model?: string): string {
  return model?.trim() || DEFAULT_MODEL;
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return new GoogleGenAI({ apiKey });
}

function parseJson<T>(value: string): T {
  const normalized = value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(normalized) as T;
}

export async function analyzeContract(
  sourceText: string,
  model?: string,
): Promise<ContractAnalysis> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: getModel(model),
    contents: `You are a careful contract explainer for non-lawyers. Do not provide legal advice. Analyze the contract below and return ONLY valid JSON with this shape:
{
  "summary": "A plain-language summary in 3-5 short paragraphs.",
  "risks": [
    {
      "severity": "high" | "medium" | "low",
      "title": "short name",
      "explanation": "why this may matter in plain English",
      "excerpt": "short exact excerpt from the contract or null"
    }
  ]
}
Highlight hidden obligations, renewal or termination traps, payment exposure, liability, IP ownership, confidentiality, and missing protections. If something is not present, do not invent it.

CONTRACT:
${sourceText}`,
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini returned an empty analysis.");
  }

  const parsed = parseJson<ContractAnalysis>(text);
  const risks = Array.isArray(parsed.risks)
    ? parsed.risks.map((risk) => {
        const severity: "high" | "medium" | "low" =
          risk.severity === "high" || risk.severity === "low"
            ? risk.severity
            : "medium";
        return {
          severity,
          title: String(risk.title ?? "Review this clause"),
          explanation: String(
            risk.explanation ?? "This clause may deserve a closer look.",
          ),
          excerpt:
            typeof risk.excerpt === "string" && risk.excerpt.trim()
              ? risk.excerpt
              : null,
        };
      })
    : [];
  return {
    summary: String(
      parsed.summary ?? "The model did not return a plain-language summary.",
    ),
    risks,
  };
}

export async function answerContractQuestion(
  sourceText: string,
  question: string,
  model?: string,
): Promise<string> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: getModel(model),
    contents: `Answer the user's question about the contract below in plain language. Cite a relevant short excerpt when possible. If the contract does not answer the question, say that clearly. Do not provide legal advice and remind the user to consult a licensed attorney for decisions.

CONTRACT:
${sourceText}

QUESTION:
${question}`,
  });
  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini returned an empty answer.");
  }
  return text;
}
