const { chromium } = require("playwright");

async function scrapeRedditYouTubeTranscriptPosts() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log("Navigating to Reddit...");

    const searchTerms = [
      "youtube transcript",
      "youtube captions",
      "youtube subtitles",
      "youtube transcript api",
      "youtube-dl transcript",
      "youtube transcript extract",
      "youtube api transcript",
      "youtube transcript download",
      "youtube transcript python",
      "youtube transcript javascript",
    ];

    let allPosts = [];

    for (const term of searchTerms) {
      console.log(`Searching for: ${term}`);

      // Reddit 검색 URL 생성
      const searchUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(
        term
      )}&sort=relevance&t=all`;
      await page.goto(searchUrl, { waitUntil: "domcontentloaded" });

      // 페이지 로딩 대기
      await page.waitForTimeout(3000);

      // Reddit 포스트 찾기
      const posts = await page.evaluate(() => {
        // Reddit의 다양한 포스트 선택자 시도
        const selectors = [
          '[data-testid="post-container"]',
          '[data-testid="post"]',
          ".Post",
          '[data-click-id="body"]',
          ".thing",
        ];

        let postElements = [];
        for (const selector of selectors) {
          postElements = document.querySelectorAll(selector);
          if (postElements.length > 0) {
            console.log(
              `Found ${postElements.length} posts with selector: ${selector}`
            );
            break;
          }
        }

        const results = [];

        postElements.forEach((element, index) => {
          if (index < 20) {
            // 각 검색어당 최대 20개
            // 제목 찾기
            let titleElement =
              element.querySelector('[data-testid="post-title"]') ||
              element.querySelector(".title a") ||
              element.querySelector("h3 a") ||
              element.querySelector('a[data-click-id="body"]') ||
              element.querySelector(".title");

            // 링크 찾기
            let linkElement =
              element.querySelector('[data-testid="post-title"] a') ||
              element.querySelector(".title a") ||
              element.querySelector("h3 a") ||
              element.querySelector('a[data-click-id="body"]');

            // 내용/설명 찾기
            let contentElement =
              element.querySelector('[data-testid="post-content"]') ||
              element.querySelector(".md") ||
              element.querySelector(".usertext-body") ||
              element.querySelector(".expando");

            // 서브레딧 찾기
            let subredditElement =
              element.querySelector('[data-testid="subreddit-name"]') ||
              element.querySelector(".subreddit") ||
              element.querySelector('[data-click-id="subreddit"]');

            // 점수 찾기
            let scoreElement =
              element.querySelector('[data-testid="vote-arrows"]') ||
              element.querySelector(".score") ||
              element.querySelector(".likes");

            // 댓글 수 찾기
            let commentsElement =
              element.querySelector(
                '[data-testid="comments-page-link-num-comments"]'
              ) ||
              element.querySelector(".comments") ||
              element.querySelector('[data-click-id="comments"]');

            if (titleElement) {
              const title = titleElement.textContent.trim();
              const url = linkElement ? linkElement.href : "";
              const content = contentElement
                ? contentElement.textContent.trim().substring(0, 500)
                : "";
              const subreddit = subredditElement
                ? subredditElement.textContent.trim()
                : "";
              const score = scoreElement ? scoreElement.textContent.trim() : "";
              const comments = commentsElement
                ? commentsElement.textContent.trim()
                : "";

              results.push({
                title: title,
                url: url,
                content: content,
                subreddit: subreddit,
                score: score,
                comments: comments,
                searchTerm: window.location.search,
              });
            }
          }
        });

        return results;
      });

      console.log(`Found ${posts.length} posts for "${term}"`);
      allPosts = allPosts.concat(posts);

      // 요청 간 대기
      await page.waitForTimeout(2000);
    }

    // 중복 제거
    const uniquePosts = allPosts.filter(
      (post, index, self) => index === self.findIndex((p) => p.url === post.url)
    );

    // 100개로 제한
    const limitedPosts = uniquePosts.slice(0, 100);

    console.log(`Total unique posts found: ${limitedPosts.length}`);
    return limitedPosts;
  } catch (error) {
    console.error("Error:", error);
    return [];
  } finally {
    await browser.close();
  }
}

// 실행
scrapeRedditYouTubeTranscriptPosts().then((posts) => {
  console.log(`\nFinal result: Found ${posts.length} posts`);

  // 마크다운 파일로 저장
  const fs = require("fs");

  let markdown = "# YouTube Transcript Related Posts from Reddit\n\n";
  markdown += `Total Posts Found: ${posts.length}\n\n`;
  markdown += "Generated on: " + new Date().toISOString() + "\n\n";
  markdown += "---\n\n";

  posts.forEach((post, index) => {
    markdown += `## ${index + 1}. ${post.title}\n\n`;

    if (post.subreddit) {
      markdown += `**Subreddit:** r/${post.subreddit}\n\n`;
    }

    if (post.url) {
      markdown += `**URL:** ${post.url}\n\n`;
    }

    if (post.score) {
      markdown += `**Score:** ${post.score}\n\n`;
    }

    if (post.comments) {
      markdown += `**Comments:** ${post.comments}\n\n`;
    }

    markdown += `**Search Term:** ${post.searchTerm}\n\n`;

    if (post.content) {
      markdown += `**Content:**\n${post.content}\n\n`;
    }

    markdown += "---\n\n";
  });

  fs.writeFileSync("reddit_youtube_transcript_posts.md", markdown);
  console.log("Markdown file saved as reddit_youtube_transcript_posts.md");
});

