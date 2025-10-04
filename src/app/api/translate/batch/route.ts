import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { texts } = await request.json();

    if (!texts || !Array.isArray(texts)) {
      return NextResponse.json(
        { success: false, error: "texts array is required" },
        { status: 400 }
      );
    }

    if (texts.length === 0) {
      return NextResponse.json({
        success: true,
        translations: [],
      });
    }

    console.log("🔄 Starting batch translation for", texts.length, "texts");

    // Process translations in batches to avoid rate limits
    const batchSize = 5;
    const translations: string[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      console.log(
        `📝 Translating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          texts.length / batchSize
        )}`
      );

      try {
        // Create a single prompt with multiple texts for efficiency
        const prompt = `다음 영어 문장들을 자연스러운 한국어로 번역해주세요. 각 번역은 새 줄로 구분해서 답변해주세요:

${batch.map((text, idx) => `${idx + 1}. ${text}`).join("\n")}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a professional translator. Translate English text to natural Korean. Respond with only the Korean translations, each on a new line, maintaining the same order as the input.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        });

        const response = completion.choices[0].message.content;
        if (response) {
          // Split the response by lines and clean up
          const batchTranslations = response
            .split("\n")
            .map((line) => line.replace(/^\d+\.\s*/, "").trim()) // Remove numbering
            .filter((line) => line.length > 0);

          // Ensure we have the same number of translations as inputs
          for (let j = 0; j < batch.length; j++) {
            translations.push(batchTranslations[j] || "번역 실패");
          }
        } else {
          // Fill with error messages if no response
          for (let j = 0; j < batch.length; j++) {
            translations.push("번역 실패");
          }
        }

        // Small delay between batches to respect rate limits
        if (i + batchSize < texts.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (batchError) {
        console.error(
          `❌ Batch translation failed for batch ${
            Math.floor(i / batchSize) + 1
          }:`,
          batchError
        );

        // Fill failed batch with error messages
        for (let j = 0; j < batch.length; j++) {
          translations.push("번역 실패");
        }
      }
    }

    console.log(
      "✅ Batch translation completed:",
      translations.length,
      "translations"
    );

    return NextResponse.json({
      success: true,
      translations,
    });
  } catch (error) {
    console.error("💥 Translation API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Translation failed",
      },
      { status: 500 }
    );
  }
}
