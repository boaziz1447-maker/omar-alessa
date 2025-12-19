
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DEFAULT_STRATEGIES_PROMPT } from "../constants";
import { Strategy } from "../types";

interface FileData {
  data: string; // Base64 string
  mimeType: string;
}

// Helper to get the API key safely
// Priority: Custom Key from Settings > Env Key
const getApiKey = (customKey?: string) => {
  if (customKey && customKey.trim().length > 0) {
    return customKey;
  }
  
  const key = process.env.API_KEY;
  if (!key) {
    console.error("API_KEY is missing in environment variables.");
    throw new Error("مفتاح API غير موجود. يرجى إضافة مفتاحك الخاص في الإعدادات.");
  }
  return key;
};

export const extractTextFromFile = async (fileData: FileData, customApiKey?: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey(customApiKey) });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: fileData.data,
              mimeType: fileData.mimeType
            }
          },
          {
            text: "You are an OCR expert. Extract ALL readable text from this image/PDF strictly as it is. Do not summarize. Do not add markdown formatting. Just return the raw text."
          }
        ]
      }
    });

    return response.text || "";
  } catch (error: any) {
    console.error("OCR Error:", error);
    // Provide a more user-friendly error message
    if (error.message?.includes('API key') || error.message?.includes('403')) {
      throw new Error("مشكلة في صلاحيات API. تأكد من صحة المفتاح في الإعدادات.");
    }
    if (error.message?.includes('429')) {
      throw new Error("تم تجاوز الحد المسموح للطلبات (429). يرجى استخدام مفتاح API خاص بك في الإعدادات.");
    }
    throw new Error("فشل في استخراج النص من الملف. قد يكون الملف كبيراً جداً أو غير واضح.");
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
      
      Context:
      Subject: ${subject}
      Grade: ${grade}
      
      ${content ? `Lesson Content Input: "${content.substring(0, 10000)}"` : ""} 
      
      ${fileData ? "CRITICAL: A file is attached (Image/PDF). The text extraction might be incomplete. Use your vision capabilities to analyze the visual content of the attached file directly to generate the strategies and questions." : "No file attached."}
      
      Instructions:
      - Strategy Generation: Generate 4 to 6 strategies from the allowed list.
      - Question Extraction: For each strategy, extract EXACTLY ${questionsCount} specific questions.
      - CRITICAL for "Balloon" strategy: You MUST provide 'wrongAnswer' for every question.
      - Output valid JSON.
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
      model: "gemini-2.5-flash",
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const cleanText = text.replace(/```json\s*|\s*```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanText);
    } catch (e) {
      console.error("JSON Parse Error:", e, cleanText);
      throw new Error("فشل في معالجة استجابة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.");
    }

    if (!parsed.strategies || !Array.isArray(parsed.strategies)) {
       if (Array.isArray(parsed)) {
          return parsed.map((s: any, index: number) => ({
            ...s,
            id: s.id || `strat-${index}`,
          }));
       }
       throw new Error("هيكل الاستجابة غير صحيح.");
    }

    return parsed.strategies.map((s: any, index: number) => ({
      ...s,
      id: s.id || `strat-${index}`,
    }));

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes('429')) {
       throw new Error("الخدمة مشغولة جداً (429). يرجى إضافة مفتاح API خاص بك في الإعدادات لضمان الخدمة.");
    }
    throw new Error(error.message || "حدث خطأ غير متوقع أثناء التوليد.");
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
      },
      required: ["name", "mainIdea", "objectives", "implementationSteps", "tools", "questions"],
    };

    const promptText = `
      You are an expert educational consultant.
      Context:
      Subject: ${subject}
      Grade: ${grade}
      
      Task: Generate a "Comprehensive Question Bank".

      ${fileData ? "CRITICAL: A file is attached. Use your vision capabilities to read and analyze ALL text and visual content from the file to extract questions." : ""}
      ${content ? `Provided Text: "${content.substring(0, 10000)}"` : ""}

      Instructions:
      1. Generate EXACTLY ${questionsCount} high-quality questions based ONLY on the provided content.
      2. Provide a plausible wrong answer for each question.
      3. Name: "بنك الأسئلة الشامل"
      4. Output valid JSON.
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
      model: "gemini-2.5-flash",
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const cleanText = text.replace(/```json\s*|\s*```/g, "").trim();

    let strategy;
    try {
      strategy = JSON.parse(cleanText);
    } catch(e) {
      throw new Error("Failed to parse AI response for question bank.");
    }

    return [{
      ...strategy,
      id: 'question-bank-1'
    }];

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes('429')) {
       throw new Error("الخدمة مشغولة جداً (429). يرجى إضافة مفتاح API خاص بك في الإعدادات لضمان الخدمة.");
    }
    throw new Error(error.message || "حدث خطأ أثناء توليد الأسئلة.");
  }
};
