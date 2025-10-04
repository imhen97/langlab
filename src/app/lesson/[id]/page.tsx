import { PrismaClient } from "@prisma/client";
import LessonPageClient from "./LessonPageClient";

const prisma = new PrismaClient();

interface LessonPageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { id } = await params;

  // Fetch lesson from database
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      source: true,
    },
  });

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-mint-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            레슨을 찾을 수 없습니다
          </h1>
          <p className="text-gray-600">
            요청하신 레슨이 존재하지 않거나 삭제되었습니다.
          </p>
        </div>
      </div>
    );
  }

  return <LessonPageClient lesson={lesson} />;
}
