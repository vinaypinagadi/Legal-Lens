import { describe, it, expect, vi } from 'vitest';
import { analyzeContract } from './gemini';

// Mock the GoogleGenAI class and its methods
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: JSON.stringify({
              summary: "This is a mock summary.",
              risks: [
                {
                  severity: "high",
                  title: "Mock Risk",
                  explanation: "This is a mock explanation.",
                  excerpt: "Mock excerpt"
                }
              ]
            })
          })
        }
      };
    })
  };
});

describe('gemini', () => {
  // Set mock API key for the tests
  process.env.GEMINI_API_KEY = "mock-api-key";

  it('analyzeContract should return a parsed ContractAnalysis', async () => {
    const analysis = await analyzeContract("Mock contract text");
    
    expect(analysis).toBeDefined();
    expect(analysis.summary).toBe("This is a mock summary.");
    expect(analysis.risks.length).toBe(1);
    expect(analysis.risks[0].severity).toBe("high");
    expect(analysis.risks[0].title).toBe("Mock Risk");
  });
});
