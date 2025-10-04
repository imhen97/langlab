const { Client } = require("@notionhq/client");

// Notion 클라이언트 초기화
const notion = new Client({
  auth: "ntn_b66692182367nnF9MsdZ4ZhNR8YB1vh5tUS3JFR0IiOa7M",
});

// 데이터베이스 ID
const DATABASE_ID = "28018d84-31bc-808d-bbc7-f74324d213f4";

// Phase 4 완료 작업들
const PHASE_4_COMPLETED_TASKS = [
  {
    id: "28018d84-31bc-81e5-b3c4-d9b4c5e6f7a8", // 4.1 결제 시스템
    name: "4.1 결제 시스템 구현 (Stripe, KakaoPay)",
  },
  {
    id: "28018d84-31bc-81f1-a2b3-c4d5e6f7a8b9", // 4.2 구독 모델
    name: "4.2 구독 모델 및 무료/프리미엄 티어 시스템",
  },
  {
    id: "28018d84-31bc-81fd-9c8b-7a6e5d4c3b2a", // 4.3 웹훅 관리
    name: "4.3 웹훅 및 구독 관리 시스템",
  },
  {
    id: "28018d84-31bc-8209-8d7c-6b5a49382716", // 4.4 문서화
    name: "4.4 프로젝트 최종 정리 및 문서화",
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
  console.log("🚀 Starting Phase 4 task updates...\n");

  const results = [];

  for (const task of PHASE_4_COMPLETED_TASKS) {
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
    `\n🎉 Phase 4 update completed! ${successful.length}/${PHASE_4_COMPLETED_TASKS.length} tasks updated successfully.`
  );
}

// 스크립트 실행
updateAllTasks().catch(console.error);




