const { Client } = require("@notionhq/client");

// Notion 클라이언트 초기화
const notion = new Client({
  auth: "ntn_r66692182369KfUykVMPQ3C5w4AihOWO6JGgI0Ajo1n0Fi",
});

// 데이터베이스 ID
const DATABASE_ID = "28118d8431bc80ac9f41f79b9f9a267b";

// 완료된 작업들
const completedTasks = [
  "영상 크기 조절 기능 구현 (UI 및 로직)",
  "동영상 반복하기 기능 구현 (전체/구간 반복)",
  "반복 구간 설정 UI 구현",
];

async function updateTaskStatus() {
  console.log("🔄 Notion 작업 상태 업데이트 중...");

  try {
    // 데이터베이스에서 모든 페이지 가져오기
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      page_size: 100,
    });

    console.log(`📋 총 ${response.results.length}개 작업 발견`);

    // 완료된 작업들 찾아서 상태 업데이트
    for (const page of response.results) {
      const taskName = page.properties.Name?.title?.[0]?.text?.content;

      if (taskName && completedTasks.includes(taskName)) {
        console.log(`✅ "${taskName}" 작업을 "Done"으로 업데이트 중...`);

        await notion.pages.update({
          page_id: page.id,
          properties: {
            Status: {
              status: {
                name: "Done",
              },
            },
          },
        });

        console.log(`✅ "${taskName}" 업데이트 완료!`);

        // API 호출 제한을 피하기 위해 잠시 대기
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    console.log("🎉 모든 작업 상태 업데이트가 완료되었습니다!");
  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
    console.error("전체 오류:", error);
  }
}

// 스크립트 실행
updateTaskStatus();
