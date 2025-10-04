import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const targetText = formData.get("targetText") as string;
    const language = (formData.get("language") as string) || "en";

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    console.log("🎤 Processing speech feedback request...");
    console.log("Target text:", targetText);

    // Step 1: Transcribe audio using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: language,
      response_format: "json",
    });

    const recognizedText = transcription.text;
    console.log("✅ Recognized text:", recognizedText);

    // Step 2: Get AI feedback on pronunciation and accuracy
    let feedback: any = {
      recognizedText,
      isCorrect: false,
      accuracy: 0,
      improvements: [],
    };

    if (targetText) {
      // Compare with target text and provide detailed feedback
      const feedbackCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert English pronunciation coach. Analyze the student's spoken text and provide constructive feedback in Korean.

Compare the recognized speech with the target text and provide:
1. Overall accuracy score (0-100)
2. Whether it's correct (if accuracy > 80%)
3. Specific areas for improvement
4. Pronunciation tips

Be encouraging but honest. Focus on helping the student improve.`,
          },
          {
            role: "user",
            content: `Target text: "${targetText}"
Recognized speech: "${recognizedText}"

Please analyze and provide feedback in JSON format:
{
  "accuracy": <number 0-100>,
  "isCorrect": <boolean>,
  "improvements": [<array of improvement tips in Korean>],
  "pronunciationTips": "<string with tips in Korean>",
  "encouragement": "<encouraging message in Korean>"
}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const aiResponse = feedbackCompletion.choices[0]?.message?.content;

      if (aiResponse) {
        try {
          const parsedFeedback = JSON.parse(aiResponse);
          feedback = {
            recognizedText,
            ...parsedFeedback,
          };
        } catch (e) {
          console.error("Failed to parse AI feedback:", e);
        }
      }
    } else {
      // No target text - just provide general feedback
      feedback = {
        recognizedText,
        isCorrect: true,
        accuracy: 85,
        improvements: [],
        encouragement: "잘하셨습니다! 계속 연습하세요. 💪",
      };
    }

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error: any) {
    console.error("Speech feedback error:", error);

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
      {
        error: "Failed to process speech feedback",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}




