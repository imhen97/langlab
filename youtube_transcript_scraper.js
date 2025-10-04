const { chromium } = require("playwright");

async function scrapeYouTubeTranscriptQuestions() {
  const browser = await chromium.launch({ headless: false }); // 디버깅을 위해 headless: false로 변경
  const page = await browser.newPage();

  try {
    // YouTube transcript 검색 결과 페이지로 직접 이동
    await page.goto("https://stackoverflow.com/search?q=youtube+transcript", {
      waitUntil: "domcontentloaded",
    });

    // 페이지 로딩 대기
    await page.waitForTimeout(5000);

    // 페이지 스크린샷 찍기 (디버깅용)
    await page.screenshot({ path: "stackoverflow_debug.png" });

    // 페이지의 HTML 구조 확인
    const pageContent = await page.content();
    console.log("Page loaded, checking for elements...");

    // 다양한 선택자로 요소 찾기 시도
    const selectors = [
      ".s-post-summary",
      ".question-summary",
      '[data-testid="question-summary"]',
      ".summary",
      ".question",
      ".post-summary",
      ".s-card",
    ];

    let foundElements = [];
    for (const selector of selectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        console.log(
          `Found ${elements.length} elements with selector: ${selector}`
        );
        foundElements = elements;
        break;
      }
    }

    // 검색 결과에서 질문들 추출
    const questions = await page.evaluate(() => {
      // 여러 선택자 시도
      let questionElements = document.querySelectorAll(".s-post-summary");
      if (questionElements.length === 0) {
        questionElements = document.querySelectorAll(".question-summary");
      }
      if (questionElements.length === 0) {
        questionElements = document.querySelectorAll(
          '[data-testid="question-summary"]'
        );
      }

      const results = [];

      questionElements.forEach((element, index) => {
        if (index < 100) {
          // 최대 100개
          // 제목 찾기
          let titleElement =
            element.querySelector(".s-post-summary--content-title a") ||
            element.querySelector(".question-hyperlink") ||
            element.querySelector("h3 a");

          // 요약 찾기
          let excerptElement =
            element.querySelector(".s-post-summary--content-excerpt") ||
            element.querySelector(".excerpt") ||
            element.querySelector(".summary");

          // 태그 찾기
          let tagsElement =
            element.querySelector(".s-post-summary--meta-tags") ||
            element.querySelector(".tags") ||
            element.querySelector(".post-tags");

          // 통계 찾기
          let statsElement =
            element.querySelector(".s-post-summary--stats") ||
            element.querySelector(".stats") ||
            element.querySelector(".vote-count-post");

          if (titleElement) {
            results.push({
              title: titleElement.textContent.trim(),
              url: titleElement.href,
              excerpt: excerptElement ? excerptElement.textContent.trim() : "",
              tags: tagsElement
                ? Array.from(
                    tagsElement.querySelectorAll(".post-tag, .tag")
                  ).map((tag) => tag.textContent.trim())
                : [],
              stats: statsElement ? statsElement.textContent.trim() : "",
            });
          }
        }
      });

      return results;
    });

    console.log(`Found ${questions.length} questions`);
    return questions;
  } catch (error) {
    console.error("Error:", error);
    return [];
  } finally {
    await browser.close();
  }
}

// 실행
scrapeYouTubeTranscriptQuestions().then((questions) => {
  console.log("Questions found:", questions.length);
  console.log(JSON.stringify(questions, null, 2));
});
