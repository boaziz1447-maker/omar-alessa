
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DEFAULT_STRATEGIES_PROMPT } from "../constants";
import { Strategy } from "../types";

interface FileData {
  data: string; // Base64 string
  mimeType: string;
}

const getApiKey = (customKey?: string) => {
  if (customKey && customKey.trim().length > 0) {
    return customKey;
  }
  return process.env.API_KEY || "";
};

export const extractTextFromFile = async (fileData: FileData, customApiKey?: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey(customApiKey) });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: fileData.data,
              mimeType: fileData.mimeType
            }
          },
          {
            text: "You are an OCR expert. Extract ALL readable text from this image/PDF strictly as it is. Do not summarize. Return raw text in Arabic if detected."
          }
        ]
      }
    });

    return response.text || "";
  } catch (error: any) {
    console.error("OCR Error:", error);
    throw new Error("فشل في استخراج النص. تأكد من جودة الصورة أو صلاحية المفتاح.");
  }
};

export const generateStrategies = async (
  content: string,
  grade: string,
  subject: string,
  questionsCount: number,
  fileData?: FileData | null,
  customApiKey?: string
): Promise<Strategy[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey(customApiKey) });
    
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        strategies: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              mainIdea: { type: Type.STRING },
              objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
              implementationSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              tools: { type: Type.ARRAY, items: { type: Type.STRING } },
              questions: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: {
                    question: { type: Type.STRING },
                    answer: { type: Type.STRING },
                    wrongAnswer: { type: Type.STRING }
                  },
                  required: ["question", "answer", "wrongAnswer"]
                } 
              },
              timeRequired: { type: Type.STRING },
            },
            required: ["name", "mainIdea", "objectives", "implementationSteps", "tools", "questions"],
          },
        },
      },
      required: ["strategies"],
    };

    const promptText = `
      ${DEFAULT_STRATEGIES_PROMPT}
      Context: Subject: ${subject}, Grade: ${grade}.
      Content: "${content.substring(0, 10000)}"
      Generate exactly ${questionsCount} questions per strategy.
    `;

    const parts: any[] = [];
    if (fileData) {
      parts.push({
        inlineData: {
          data: fileData.data,
          mimeType: fileData.mimeType
        }
      });
    }
    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.8,
      },
    });

    if (!response.text) throw new Error("No response from AI");
    const parsed = JSON.parse(response.text);
    return parsed.strategies.map((s: any, idx: number) => ({ ...s, id: s.id || `strat-${idx}` }));
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "حدث خطأ أثناء التوليد. حاول مرة أخرى.");
  }
};

export const generateQuestionBank = async (
  content: string,
  grade: string,
  subject: string,
  questionsCount: number,
  fileData?: FileData | null,
  customApiKey?: string
): Promise<Strategy[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey(customApiKey) });
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        mainIdea: { type: Type.STRING },
        objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
        implementationSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
        tools: { type: Type.ARRAY, items: { type: Type.STRING } },
        questions: { 
          type: Type.ARRAY, 
          items: { 
            type: Type.OBJECT, 
            properties: {
              question: { type: Type.STRING },
              answer: { type: Type.STRING },
              wrongAnswer: { type: Type.STRING }
            },
            required: ["question", "answer", "wrongAnswer"]
          } 
        },
      },
      required: ["name", "mainIdea", "objectives", "implementationSteps", "tools", "questions"],
    };

    const promptText = `Generate a "Comprehensive Question Bank" (بنك الأسئلة الشامل) with exactly ${questionsCount} questions for: ${subject}, Grade: ${grade}. Content: ${content}`;
    const parts: any[] = fileData ? [{ inlineData: { data: fileData.data, mimeType: fileData.mimeType } }, { text: promptText }] : [{ text: promptText }];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: parts },
      config: { responseMimeType: "application/json", responseSchema: responseSchema },
    });

    const strategy = JSON.parse(response.text || "{}");
    return [{ ...strategy, id: 'qb-1' }];
  } catch (error: any) {
    throw new Error("خطأ في توليد الأسئلة.");
  }
};
