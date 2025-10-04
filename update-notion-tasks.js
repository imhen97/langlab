const { Client } = require("@notionhq/client");

// Notion 클라이언트 초기화
const notion = new Client({
  auth: "ntn_b66692182367nnF9MsdZ4ZhNR8YB1vh5tUS3JFR0IiOa7M",
});

// 데이터베이스 ID
const DATABASE_ID = "28018d84-31bc-808d-bbc7-f74324d213f4";

// 완료된 작업들의 페이지 ID
const COMPLETED_TASKS = [
  {
    id: "28018d84-31bc-816c-a590-c59181da1e8f",
    name: "1.1 프로젝트 저장소 설정 (GitHub, Next.js, TypeScript)",
  },
  {
    id: "28018d84-31bc-8131-98e7-c461d27a2d3d",
    name: "1.2 UI 프레임워크 설정 (TailwindCSS, ShadCN UI, Framer Motion)",
  },
  {
    id: "28018d84-31bc-8187-978a-c17305799326",
    name: "1.3 NextAuth.js 인증 시스템 구현 (Email, Google, Kakao)",
  },
  {
    id: "28018d84-31bc-81a3-b54c-e81d79484570",
    name: "1.4 사용자 데이터베이스 설계 (PostgreSQL/Supabase)",
  },
  {
    id: "28018d84-31bc-81ac-b620-eae0464f6ebc",
    name: "1.5 기본 UI 구현 (랜딩 페이지, 대시보드)",
  },
  {
    id: "28018d84-31bc-818f-9da6-fafdd5bace48",
    name: "2.1 비디오 플레이어 구현 (YouTube API, 자막 추출)",
  },
  {
    id: "28018d84-31bc-8196-b447-fb474ec6ebed",
    name: "2.2 어휘/표현 학습 모듈 (발음 오디오, 플래시카드)",
  },
  {
    id: "28018d84-31bc-8191-b997-fa17c8fcb3e2",
    name: "2.3 퀴즈 시스템 개발 (객관식, 빈칸 채우기, 자동 채점)",
  },
  {
    id: "28018d84-31bc-81ce-82f2-f13629275035",
    name: "2.4 레슨 잠금/해제 시스템 및 진행률 추적",
  },
  {
    id: "28018d84-31bc-819c-a2d0-ecb9beaa91a8",
    name: "3.1 OpenAI API 연동 (채팅 기반 학습, 컨텍스트 질문/답변)",
  },
  {
    id: "28018d84-31bc-815f-b324-d9b63dc88220",
    name: "3.2 음성 인식 및 AI 피드백 (Speech-to-Text, 발음 교정)",
  },
  {
    id: "28018d84-31bc-81f2-92ec-cc74b8ae47b8",
    name: "3.3 진행률 대시보드 (XP 포인트, 배지, 스트릭)",
  },
];

async function updateTaskStatus(pageId, taskName) {
  try {
    console.log(`🔄 Updating: ${taskName}`);

    const response = await notion.pages.update({
      page_id: pageId,
      properties: {
        Status: {
          status: {
            name: "Done",
          },
        },
      },
    });

    console.log(`✅ Successfully updated: ${taskName}`);
    return { success: true, taskName };
  } catch (error) {
    console.error(`❌ Failed to update ${taskName}:`, error.message);
    return { success: false, taskName, error: error.message };
  }
}

async function updateAllTasks() {
  console.log("🚀 Starting Notion task updates...\n");

  const results = [];

  for (const task of COMPLETED_TASKS) {
    const result = await updateTaskStatus(task.id, task.name);
    results.push(result);

    // API 호출 제한을 위한 대기 (100ms)
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("\n📊 Update Summary:");
  console.log("==================");

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`✅ Successful: ${successful.length}`);
  successful.forEach((result) => {
    console.log(`   - ${result.taskName}`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}`);
    failed.forEach((result) => {
      console.log(`   - ${result.taskName}: ${result.error}`);
    });
  }

  console.log(
    `\n🎉 Update completed! ${successful.length}/${COMPLETED_TASKS.length} tasks updated successfully.`
  );
}

// 스크립트 실행
updateAllTasks().catch(console.error);




