import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/progress - Fetch progress for a lesson
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lessonId");

    if (!lessonId) {
      return NextResponse.json({ error: "Missing lessonId" }, { status: 400 });
    }

    // For now, use dummy user - in production, get from session
    const userId = "dummy-user-id";

    const progress = await prisma.progress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });

    if (!progress) {
      // Create initial progress record
      const newProgress = await prisma.progress.create({
        data: {
          userId,
          lessonId,
          state: "IN_PROGRESS",
          detail: {
            sections: {
              summary: false,
              vocabulary: false,
              patterns: false,
            },
            vocabularyProgress: {},
            completedWords: [],
          },
        },
      });

      return NextResponse.json({
        success: true,
        progress: newProgress,
      });
    }

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error("GET /api/progress error:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}

// PATCH /api/progress - Update progress
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { lessonId, action, ...data } = body;

    if (!lessonId || !action) {
      return NextResponse.json(
        { error: "Missing lessonId or action" },
        { status: 400 }
      );
    }

    // For now, use dummy user - in production, get from session
    const userId = "dummy-user-id";

    // Get existing progress
    let progress = await prisma.progress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });

    if (!progress) {
      // Create initial progress record
      progress = await prisma.progress.create({
        data: {
          userId,
          lessonId,
          state: "IN_PROGRESS",
          detail: {
            sections: {
              summary: false,
              vocabulary: false,
              patterns: false,
            },
            vocabularyProgress: {},
            completedWords: [],
          },
        },
      });
    }

    const currentDetail = (progress.detail as any) || {};

    let updatedDetail = { ...currentDetail };
    let updatedState = progress.state;

    // Handle different actions
    switch (action) {
      case "complete_section":
        const { section, completed } = data;
        if (!section) {
          return NextResponse.json(
            { error: "Missing section for complete_section action" },
            { status: 400 }
          );
        }

        updatedDetail.sections = {
          ...updatedDetail.sections,
          [section]: completed,
        };

        console.log(
          `✅ Section ${section} marked as ${
            completed ? "completed" : "incomplete"
          }`
        );
        break;

      case "complete_word":
        const { wordId } = data;
        if (wordId === undefined) {
          return NextResponse.json(
            { error: "Missing wordId for complete_word action" },
            { status: 400 }
          );
        }

        // Add word to completed list if not already there
        const completedWords = updatedDetail.completedWords || [];
        if (!completedWords.includes(wordId)) {
          updatedDetail.completedWords = [...completedWords, wordId];
        }

        console.log(`🎯 Word ${wordId} marked as completed`);
        break;

      case "update_vocab_practice":
        const { wordId: practiceWordId, practiceData } = data;
        if (practiceWordId === undefined || !practiceData) {
          return NextResponse.json(
            {
              error:
                "Missing wordId or practiceData for update_vocab_practice action",
            },
            { status: 400 }
          );
        }

        updatedDetail.vocabularyProgress = {
          ...updatedDetail.vocabularyProgress,
          [practiceWordId]: practiceData,
        };

        console.log(
          `📝 Vocabulary practice updated for word ${practiceWordId}`
        );
        break;

      case "unlock_video_with_credit":
        // Update user credits and unlock video
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        // Check if user has credits (assuming we have a credits field)
        // For now, we'll just mark all sections as completed
        updatedDetail.sections = {
          summary: true,
          vocabulary: true,
          patterns: true,
        };

        updatedDetail.creditUnlocked = true;
        console.log(`💳 Video unlocked with credit for lesson ${lessonId}`);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Check if all sections are completed
    const allSectionsCompleted =
      updatedDetail.sections &&
      Object.values(updatedDetail.sections).every(Boolean);

    if (allSectionsCompleted && updatedState === "IN_PROGRESS") {
      updatedState = "DONE";
      console.log(
        `🎉 All sections completed! Lesson ${lessonId} marked as DONE`
      );
    }

    // Update progress in database
    const updatedProgress = await prisma.progress.update({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      data: {
        state: updatedState,
        detail: updatedDetail,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      progress: updatedProgress,
    });
  } catch (error) {
    console.error("PATCH /api/progress error:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}
