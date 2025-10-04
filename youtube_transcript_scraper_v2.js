const { chromium } = require("playwright");

async function scrapeYouTubeTranscriptQuestions() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log("Navigating to Stack Overflow...");

    // 여러 검색어로 시도
    const searchTerms = [
      "youtube transcript",
      "youtube captions",
      "youtube subtitles",
      "youtube-transcript",
      "youtube transcript api",
    ];

    let allQuestions = [];

    for (const term of searchTerms) {
      console.log(`Searching for: ${term}`);

      // 검색 URL 생성
      const searchUrl = `https://stackoverflow.com/search?q=${encodeURIComponent(
        term
      )}`;
      await page.goto(searchUrl, { waitUntil: "domcontentloaded" });

      // 페이지 로딩 대기
      await page.waitForTimeout(3000);

      // 페이지에서 모든 링크 찾기
      const links = await page.evaluate(() => {
        const allLinks = document.querySelectorAll('a[href*="/questions/"]');
        const results = [];

        allLinks.forEach((link) => {
          const href = link.href;
          const text = link.textContent.trim();

          // 질문 링크인지 확인 (숫자 ID 포함)
          if (
            href.includes("/questions/") &&
            /\/questions\/\d+/.test(href) &&
            text.length > 10
          ) {
            results.push({
              title: text,
              url: href,
              searchTerm: window.location.search,
            });
          }
        });

        return results;
      });

      console.log(`Found ${links.length} links for "${term}"`);
      allQuestions = allQuestions.concat(links);
    }

    // 중복 제거
    const uniqueQuestions = allQuestions.filter(
      (question, index, self) =>
        index === self.findIndex((q) => q.url === question.url)
    );

    // 100개로 제한
    const limitedQuestions = uniqueQuestions.slice(0, 100);

    console.log(`Total unique questions found: ${limitedQuestions.length}`);
    return limitedQuestions;
  } catch (error) {
    console.error("Error:", error);
    return [];
  } finally {
    await browser.close();
  }
}

// 실행
scrapeYouTubeTranscriptQuestions().then((questions) => {
  console.log(`\nFinal result: Found ${questions.length} questions`);

  // 마크다운 파일로 저장
  const fs = require("fs");

  let markdown =
    "# YouTube Transcript Related Questions from Stack Overflow\n\n";
  markdown += `Total Questions Found: ${questions.length}\n\n`;
  markdown += "---\n\n";

  questions.forEach((question, index) => {
    markdown += `## ${index + 1}. ${question.title}\n\n`;
    markdown += `**URL:** ${question.url}\n\n`;
    markdown += `**Search Term:** ${question.searchTerm}\n\n`;
    markdown += "---\n\n";
  });

  fs.writeFileSync("youtube_transcript_questions.md", markdown);
  console.log("Markdown file saved as youtube_transcript_questions.md");
});

