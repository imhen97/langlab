const { Client } = require("@notionhq/client");

// Notion 클라이언트 초기화
const notion = new Client({
  auth: "ntn_r66692182369KfUykVMPQ3C5w4AihOWO6JGgI0Ajo1n0Fi",
});

// 데이터베이스 ID
const DATABASE_ID = "28118d8431bc80ac9f41f79b9f9a267b";

// Phase 6 작업 목록
const tasks = [
  "영상 크기 조절 기능 구현 (UI 및 로직)",
  "동영상 반복하기 기능 구현 (전체/구간 반복)",
  "반복 구간 설정 UI 구현",
  "자막 단어 클릭 감지 기능 구현",
  "단어장 추가 API 및 데이터베이스 스키마 설계",
  "오늘의 단어장 섹션 UI 컴포넌트 개발",
  "단어장 관리 기능 (삭제/수정/정렬)",
  "자막에서 단어장으로 이동 로직 구현",
  "Q&A 섹션 UI 컴포넌트 개발",
  "AI 기반 Q&A API 연동 (OpenAI GPT)",
  "컨텍스트 기반 질문 답변 시스템 구현",
  "대본 다운로드 버튼 UI 구현",
  "대본 다운로드 API 구현 (PDF/TXT 형식)",
  "대본 포맷팅 및 정리 기능",
  "언어 선택 버튼 디자인 스케치와 일치성 확인",
  "재생 컨트롤 UI 디자인 통일성 확인",
  "반응형 디자인 최적화 (모바일/태블릿)",
  "접근성 개선 (키보드 네비게이션/스크린 리더)",
];

async function addTasks() {
  console.log("🚀 Notion에 작업들을 추가하는 중...");

  try {
    // 각 작업을 Notion 데이터베이스에 추가
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      console.log(`📝 ${i + 1}/${tasks.length}: ${task} 추가 중...`);

      await notion.pages.create({
        parent: {
          database_id: DATABASE_ID,
        },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: task,
                },
              },
            ],
          },
          Status: {
            status: {
              name: "Not started",
            },
          },
        },
      });

      console.log(`✅ ${task} 추가 완료!`);

      // API 호출 제한을 피하기 위해 잠시 대기
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log("🎉 모든 작업이 성공적으로 추가되었습니다!");
  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
    console.error("전체 오류:", error);
  }
}

// 스크립트 실행
addTasks();


