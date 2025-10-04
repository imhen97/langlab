import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// 단어장 아이템 추가 스키마
const addVocabularySchema = z.object({
  lessonId: z.string().min(1),
  word: z.string().min(1),
  context: z.string().min(1),
  timestamp: z.number().min(0),
  translation: z.string().optional().default(""),
  source: z.enum(["caption", "manual"]).default("caption"),
});

// 단어장 아이템 업데이트 스키마
const updateVocabularySchema = z.object({
  translation: z.string().optional(),
  mastery: z.number().min(0).max(5).optional(),
  isLearned: z.boolean().optional(),
});

// GET: 사용자의 단어장 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lessonId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const learned = searchParams.get("learned"); // "true", "false", or undefined

    const where: any = {
      userId: session.user.id,
    };

    if (lessonId) {
      where.lessonId = lessonId;
    }

    if (learned !== null) {
      where.isLearned = learned === "true";
    }

    const [vocabularyItems, totalCount] = await Promise.all([
      prisma.wordbookItem.findMany({
        where,
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.wordbookItem.count({ where }),
    ]);

    return NextResponse.json({
      items: vocabularyItems,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });

  } catch (error) {
    console.error("단어장 조회 오류:", error);
    return NextResponse.json(
      { error: "단어장 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST: 단어장에 새 단어 추가
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = addVocabularySchema.parse(body);

    // 중복 체크 (같은 레슨에서 같은 단어)
    const existingItem = await prisma.wordbookItem.findUnique({
      where: {
        userId_word_lessonId: {
          userId: session.user.id,
          word: validatedData.word,
          lessonId: validatedData.lessonId,
        },
      },
    });

    if (existingItem) {
      return NextResponse.json(
        { error: "이미 단어장에 추가된 단어입니다" },
        { status: 409 }
      );
    }

    // 레슨 존재 확인
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: validatedData.lessonId,
        userId: session.user.id,
      },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: "레슨을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const vocabularyItem = await prisma.wordbookItem.create({
      data: {
        userId: session.user.id,
        lessonId: validatedData.lessonId,
        word: validatedData.word,
        translation: validatedData.translation,
        context: validatedData.context,
        timestamp: validatedData.timestamp,
        source: validatedData.source,
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
          },
        },
      },
    });

    return NextResponse.json(vocabularyItem, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "잘못된 요청 데이터", details: error.errors },
        { status: 400 }
      );
    }

    console.error("단어장 추가 오류:", error);
    return NextResponse.json(
      { error: "단어 추가 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}


