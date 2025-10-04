import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// 단어장 아이템 업데이트 스키마
const updateVocabularySchema = z.object({
  translation: z.string().optional(),
  mastery: z.number().min(0).max(5).optional(),
  isLearned: z.boolean().optional(),
});

// GET: 특정 단어장 아이템 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { id } = await params;
    const vocabularyItem = await prisma.wordbookItem.findFirst({
      where: {
        id: id,
        userId: session.user.id,
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

    if (!vocabularyItem) {
      return NextResponse.json(
        { error: "단어를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(vocabularyItem);

  } catch (error) {
    console.error("단어장 아이템 조회 오류:", error);
    return NextResponse.json(
      { error: "단어 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// PUT: 단어장 아이템 업데이트
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateVocabularySchema.parse(body);

    // 단어장 아이템 존재 및 소유권 확인
    const existingItem = await prisma.wordbookItem.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "단어를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const updatedItem = await prisma.wordbookItem.update({
      where: { id: params.id },
      data: validatedData,
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

    return NextResponse.json(updatedItem);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "잘못된 요청 데이터", details: error.errors },
        { status: 400 }
      );
    }

    console.error("단어장 아이템 업데이트 오류:", error);
    return NextResponse.json(
      { error: "단어 업데이트 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// DELETE: 단어장 아이템 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 단어장 아이템 존재 및 소유권 확인
    const existingItem = await prisma.wordbookItem.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "단어를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    await prisma.wordbookItem.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "단어가 삭제되었습니다" });

  } catch (error) {
    console.error("단어장 아이템 삭제 오류:", error);
    return NextResponse.json(
      { error: "단어 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}


