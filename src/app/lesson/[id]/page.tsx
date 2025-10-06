import LessonPageClient from "./LessonPageClient";

interface LessonPageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { id } = await params;

  // For JWT strategy, we'll handle lesson data in the client component
  // This is a simplified version - you may want to implement proper data fetching
  const lesson = {
    id,
    title: "Sample Lesson",
    description: "This is a sample lesson for JWT strategy",
    thumbnail: "https://example.com/thumb.jpg",
    duration: 300,
    level: "BEGINNER",
    purpose: "LEARNING",
    summary: {},
    vocab: {},
    patterns: {},
    script: {},
    quizzes: {},
    speaking: {},
    source: {
      id: "1",
      url: "https://example.com",
      type: "YOUTUBE",
      title: "Sample Video",
      transcript: "Sample transcript",
      duration: 300,
      thumbnail: "https://example.com/thumb.jpg",
      createdAt: new Date(),
    },
  };

  return <LessonPageClient lesson={lesson} />;
}
