import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Q&A 요청 스키마
const qaRequestSchema = z.object({
  lessonId: z.string().min(1),
  question: z.string().min(1).max(500),
  transcript: z.string().min(1),
});

// 질문 유형 분류
function classifyQuestion(
  question: string
): "general" | "vocabulary" | "grammar" | "context" {
  const lowerQ = question.toLowerCase();

  if (
    lowerQ.includes("단어") ||
    lowerQ.includes("의미") ||
    lowerQ.includes("vocabulary") ||
    lowerQ.includes("word")
  ) {
    return "vocabulary";
  }
  if (
    lowerQ.includes("문법") ||
    lowerQ.includes("grammar") ||
    lowerQ.includes("구조") ||
    lowerQ.includes("문장")
  ) {
    return "grammar";
  }
  if (
    lowerQ.includes("배경") ||
    lowerQ.includes("context") ||
    lowerQ.includes("지식") ||
    lowerQ.includes("상황")
  ) {
    return "context";
  }
  return "general";
}

// 대본에서 관련 시간 찾기
function findRelevantTimestamp(question: string, transcript: string): number {
  // 간단한 키워드 매칭으로 관련 시간 찾기
  const words = question.toLowerCase().split(/\s+/);
  const lines = transcript.split("\n");

  for (const line of lines) {
    const lineLower = line.toLowerCase();
    if (words.some((word) => lineLower.includes(word))) {
      // 시간 정보가 있다면 추출 (예: [00:01:23] 형태)
      const timeMatch = line.match(/\[(\d{2}):(\d{2}):(\d{2})\]/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const seconds = parseInt(timeMatch[3]);
        return hours * 3600 + minutes * 60 + seconds;
      }
    }
  }

  return 0;
}

// POST: AI Q&A 질문 처리
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId, question, transcript } = qaRequestSchema.parse(body);

    // 질문 유형 분류
    const questionType = classifyQuestion(question);

    // 관련 시간 찾기
    const timestamp = findRelevantTimestamp(question, transcript);

    // OpenAI API 호출
    const systemPrompt = `당신은 영어 학습을 도와주는 친근한 AI 튜터입니다. 
주어진 대본을 바탕으로 학습자의 질문에 정확하고 도움이 되는 답변을 제공해주세요.

답변 가이드라인:
1. 대본의 내용을 정확히 반영하여 답변하세요
2. 학습자의 수준에 맞게 설명하세요
3. 구체적인 예시와 함께 설명하세요
4. 한국어로 친근하게 답변하세요
5. 추가 학습 팁도 제공해주세요

대본 내용:
${transcript.substring(0, 4000)}`; // 토큰 제한을 위해 대본 길이 제한

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: question,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const answer =
      completion.choices[0]?.message?.content || "답변을 생성할 수 없습니다.";

    return NextResponse.json({
      answer,
      type: questionType,
      timestamp,
      model: "gpt-4o-mini",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "잘못된 요청 데이터", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Q&A API 오류:", error);

    // OpenAI API 오류 처리
    if (error instanceof Error && error.message.includes("API key")) {
      return NextResponse.json(
        { error: "AI 서비스 설정이 필요합니다" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "질문 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}


