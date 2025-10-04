import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, context } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Build system message with lesson context
    const systemMessage = {
      role: "system" as const,
      content: `You are an expert English tutor helping students learn English. 
You are patient, encouraging, and provide clear explanations with examples.

Current lesson context:
- Lesson: ${context?.lesson || "General English"}
${context?.summary ? `- Summary: ${context.summary.en}` : ""}
${context?.vocabulary ? `- Key vocabulary: ${context.vocabulary}` : ""}

Guidelines:
1. Provide explanations in Korean when the student asks in Korean
2. Give practical examples and usage tips
3. Be encouraging and supportive
4. If asked about vocabulary, explain meaning, usage, and provide example sentences
5. If asked about grammar, explain the rule and give examples
6. Keep responses concise but informative
7. Use emojis occasionally to make the conversation friendly

Always prioritize helping the student understand and learn effectively.`,
    };

    // Prepare messages for OpenAI
    const openaiMessages = [
      systemMessage,
      ...messages.map((msg: any) => ({
        role: (msg.role === "user" ? "user" : "assistant") as
          | "user"
          | "assistant",
        content: msg.content,
      })),
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using GPT-4o-mini for cost efficiency
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiMessage = completion.choices[0]?.message?.content || "";

    return NextResponse.json({
      success: true,
      message: aiMessage,
      usage: completion.usage,
    });
  } catch (error: any) {
    console.error("OpenAI API error:", error);

    // Handle specific OpenAI errors
    if (error?.status === 401) {
      return NextResponse.json(
        { error: "Invalid OpenAI API key" },
        { status: 401 }
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process AI request", details: error?.message },
      { status: 500 }
    );
  }
}
