const { chromium } = require("playwright");

// 검색어 목록
const searchTerms = [
  "youtube subtitle extract",
  "youtube subtitle scraping",
  "youtube captions extract",
  "youtube transcript extract",
  "youtube subtitle download",
  "youtube captions download",
  "youtube subtitle scraper",
  "youtube transcript scraper",
  "youtube subtitle api",
  "youtube captions api",
  "youtube subtitle python",
  "youtube captions python",
  "youtube subtitle javascript",
  "youtube captions javascript",
  "youtube subtitle nodejs",
  "youtube captions nodejs",
  "youtube subtitle tools",
  "youtube captions tools",
  "youtube subtitle library",
  "youtube captions library",
];

// 결과를 저장할 배열
let allPosts = [];
const seenUrls = new Set();

async function scrapeReddit() {
  console.log("🚀 Starting Reddit YouTube subtitle scraping...");

  const browser = await chromium.launch({
    headless: false, // 디버깅을 위해 브라우저 표시
    slowMo: 1000, // 각 액션 사이에 1초 대기
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  try {
    for (const searchTerm of searchTerms) {
      console.log(`\n🔍 Searching for: "${searchTerm}"`);

      // Reddit 검색 URL 생성
      const searchUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(
        searchTerm
      )}&type=link&sort=relevance&t=all`;

      await page.goto(searchUrl, { waitUntil: "networkidle" });
      await page.waitForTimeout(3000);

      // 페이지 스크롤하여 더 많은 결과 로드
      await scrollPage(page);

      // 페이지 디버깅 정보 출력
      await page.waitForTimeout(2000);
      const pageTitle = await page.title();
      console.log(`📄 Page title: ${pageTitle}`);

      // 다양한 선택자로 포스트 찾기
      const posts = await page.evaluate(() => {
        const results = [];

        // 여러 가능한 선택자 시도
        const selectors = [
          '[data-testid="post-container"]',
          ".Post",
          'div[data-testid*="post"]',
          "article",
          ".thing",
          'div[class*="post"]',
        ];

        let postElements = [];
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(
              `Found ${elements.length} elements with selector: ${selector}`
            );
            postElements = elements;
            break;
          }
        }

        if (postElements.length === 0) {
          // 모든 링크에서 Reddit 포스트 찾기
          const allLinks = document.querySelectorAll('a[href*="/r/"]');
          console.log(`Found ${allLinks.length} Reddit links`);

          allLinks.forEach((link) => {
            const href = link.href;
            const title = link.textContent.trim();

            if (title && href.includes("/r/") && !href.includes("/comments/")) {
              // 링크에서 서브레딧 추출
              const subredditMatch = href.match(/\/r\/([^\/]+)/);
              const subreddit = subredditMatch ? subredditMatch[1] : "Unknown";

              results.push({
                title: title.substring(0, 200),
                url: href,
                subreddit,
                score: "Unknown",
                comments: "Unknown",
                author: "Unknown",
                time: "Unknown",
                content: "",
                searchTerm: window.searchTerm || "Unknown",
              });
            }
          });
        } else {
          // 기존 로직으로 포스트 추출
          postElements.forEach((post, index) => {
            try {
              // 제목 추출 - 더 많은 선택자 시도
              const titleSelectors = [
                '[data-testid="post-title"]',
                "h3",
                ".title",
                'a[data-click-id="body"]',
                "h2",
                "h1",
              ];

              let title = "No title";
              for (const selector of titleSelectors) {
                const titleElement = post.querySelector(selector);
                if (titleElement && titleElement.textContent.trim()) {
                  title = titleElement.textContent.trim();
                  break;
                }
              }

              // URL 추출
              const linkSelectors = [
                'a[href*="/r/"]',
                'a[data-click-id="body"]',
                'a[href*="reddit.com"]',
              ];

              let url = "";
              for (const selector of linkSelectors) {
                const linkElement = post.querySelector(selector);
                if (linkElement && linkElement.href) {
                  url = linkElement.href;
                  break;
                }
              }

              // 서브레딧 추출
              const subredditSelectors = [
                '[data-testid="subreddit-name"]',
                ".subreddit",
                'a[href*="/r/"]',
              ];

              let subreddit = "Unknown";
              for (const selector of subredditSelectors) {
                const subredditElement = post.querySelector(selector);
                if (subredditElement) {
                  const text = subredditElement.textContent.trim();
                  if (text.startsWith("r/")) {
                    subreddit = text.substring(2);
                  } else if (text && !text.includes(" ")) {
                    subreddit = text;
                  }
                  if (subreddit !== "Unknown") break;
                }
              }

              // 점수 추출
              const scoreSelectors = [
                '[data-testid="vote-arrows"]',
                ".score",
                '[data-click-id="upvote"]',
                ".upvotes",
              ];

              let score = "0";
              for (const selector of scoreSelectors) {
                const scoreElement = post.querySelector(selector);
                if (scoreElement && scoreElement.textContent.trim()) {
                  score = scoreElement.textContent.trim();
                  break;
                }
              }

              // 댓글 수 추출
              const commentsSelectors = [
                '[data-testid="comment-count"]',
                ".comments",
                'a[href*="/comments/"]',
              ];

              let comments = "0";
              for (const selector of commentsSelectors) {
                const commentsElement = post.querySelector(selector);
                if (commentsElement && commentsElement.textContent.trim()) {
                  comments = commentsElement.textContent.trim();
                  break;
                }
              }

              // 작성자 추출
              const authorSelectors = [
                '[data-testid="post_author_link"]',
                ".author",
                'a[href*="/user/"]',
              ];

              let author = "Unknown";
              for (const selector of authorSelectors) {
                const authorElement = post.querySelector(selector);
                if (authorElement && authorElement.textContent.trim()) {
                  author = authorElement.textContent.trim();
                  if (author.startsWith("u/")) {
                    author = author.substring(2);
                  }
                  break;
                }
              }

              // 시간 추출
              const timeSelectors = [
                '[data-testid="post_timestamp"]',
                ".time",
                "time",
              ];

              let time = "Unknown";
              for (const selector of timeSelectors) {
                const timeElement = post.querySelector(selector);
                if (timeElement && timeElement.textContent.trim()) {
                  time = timeElement.textContent.trim();
                  break;
                }
              }

              // 내용/설명 추출
              const contentSelectors = [
                '[data-testid="post-content"]',
                ".selftext",
                ".md",
                ".usertext-body",
              ];

              let content = "";
              for (const selector of contentSelectors) {
                const contentElement = post.querySelector(selector);
                if (contentElement && contentElement.textContent.trim()) {
                  content = contentElement.textContent.trim();
                  break;
                }
              }

              if (title && title !== "No title" && url) {
                results.push({
                  title: title.substring(0, 300),
                  url,
                  subreddit,
                  score,
                  comments,
                  author,
                  time,
                  content: content.substring(0, 500),
                  searchTerm: window.searchTerm || "Unknown",
                });
              }
            } catch (error) {
              console.error("Error extracting post:", error);
            }
          });
        }

        console.log(`Extracted ${results.length} posts`);
        return results;
      });

      // 검색어를 페이지에 전달
      await page.evaluate((term) => {
        window.searchTerm = term;
      }, searchTerm);

      // 중복 제거 및 결과 추가
      posts.forEach((post) => {
        if (
          !seenUrls.has(post.url) &&
          post.title &&
          post.title !== "No title"
        ) {
          seenUrls.has(post.url);
          allPosts.push(post);
          console.log(`✅ Found: ${post.title.substring(0, 60)}...`);
        }
      });

      console.log(`📊 Total posts collected so far: ${allPosts.length}`);

      // 100개 이상 수집되면 중단
      if (allPosts.length >= 100) {
        console.log("🎯 Reached 100 posts, stopping search...");
        break;
      }

      // 요청 간격 조절
      await page.waitForTimeout(2000);
    }

    // 댓글 수집
    console.log("\n💬 Collecting comments for posts...");
    await collectComments(page);
  } catch (error) {
    console.error("❌ Error during scraping:", error);
  } finally {
    await browser.close();
  }

  // 결과를 마크다운으로 저장
  await saveToMarkdown();
}

async function scrollPage(page) {
  console.log("📜 Scrolling to load more posts...");

  let previousHeight = 0;
  let currentHeight = await page.evaluate("document.body.scrollHeight");
  let scrollAttempts = 0;
  const maxScrollAttempts = 5;

  while (
    previousHeight !== currentHeight &&
    scrollAttempts < maxScrollAttempts
  ) {
    previousHeight = currentHeight;
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await page.waitForTimeout(3000);
    currentHeight = await page.evaluate("document.body.scrollHeight");
    scrollAttempts++;
  }
}

async function collectComments(page) {
  console.log("💬 Collecting detailed post content and comments...");

  for (let i = 0; i < Math.min(allPosts.length, 30); i++) {
    const post = allPosts[i];
    console.log(
      `💬 Processing post ${i + 1}/${Math.min(
        allPosts.length,
        30
      )}: ${post.title.substring(0, 40)}...`
    );

    try {
      // Reddit 포스트 URL로 직접 이동
      await page.goto(post.url, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      await page.waitForTimeout(2000);

      // 포스트 내용과 댓글 추출
      const postData = await page.evaluate(() => {
        const result = {
          content: "",
          comments: [],
        };

        // 포스트 내용 추출 - 다양한 선택자 시도
        const contentSelectors = [
          '[data-testid="post-content"]',
          ".usertext-body .md",
          ".selftext",
          ".md",
          '[data-click-id="text"]',
          ".Post .md",
          ".RichTextJSON-root",
        ];

        for (const selector of contentSelectors) {
          const contentElement = document.querySelector(selector);
          if (contentElement && contentElement.textContent.trim()) {
            result.content = contentElement.textContent.trim();
            break;
          }
        }

        // 댓글 추출 - 더 포괄적인 방법
        const commentSelectors = [
          '[data-testid="comment"]',
          ".Comment",
          ".comment",
          '[data-click-id="body"]',
          ".RichTextJSON-root",
          'div[data-testid*="comment"]',
          ".usertext-body",
          ".md",
        ];

        let commentElements = [];
        for (const selector of commentSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(
              `Found ${elements.length} comments with selector: ${selector}`
            );
            commentElements = elements;
            break;
          }
        }

        // 댓글 영역이 없으면 전체 페이지에서 댓글 찾기
        if (commentElements.length === 0) {
          const allTextElements = document.querySelectorAll("p, div, span");
          const potentialComments = [];

          allTextElements.forEach((element) => {
            const text = element.textContent.trim();
            // 댓글처럼 보이는 텍스트 찾기 (길이, 패턴 등)
            if (
              text.length > 20 &&
              text.length < 500 &&
              !text.includes("•") &&
              !text.includes("Posted by") &&
              !text.includes("submitted by") &&
              !text.includes("share") &&
              !text.includes("save") &&
              !text.includes("hide") &&
              element.offsetHeight > 20
            ) {
              potentialComments.push({
                element,
                text,
                author: "Unknown",
                score: "0",
              });
            }
          });

          // 최대 3개의 잠재적 댓글 추가
          potentialComments.slice(0, 3).forEach((comment) => {
            result.comments.push({
              author: comment.author,
              text: comment.text.substring(0, 300),
              score: comment.score,
            });
          });
        } else {
          // 최대 5개 댓글만 수집
          Array.from(commentElements)
            .slice(0, 5)
            .forEach((comment, index) => {
              try {
                const textSelectors = [
                  '[data-testid="comment-text"]',
                  ".md",
                  ".RichTextJSON-root",
                  "p",
                  "div",
                  "span",
                ];

                let text = "";
                for (const selector of textSelectors) {
                  const textElement = comment.querySelector(selector);
                  if (textElement && textElement.textContent.trim()) {
                    text = textElement.textContent.trim();
                    break;
                  }
                }

                // 선택자로 찾지 못했으면 직접 텍스트 추출
                if (!text) {
                  text = comment.textContent.trim();
                }

                const authorSelectors = [
                  '[data-testid="comment-author-link"]',
                  ".author",
                  'a[href*="/user/"]',
                ];

                let author = "Unknown";
                for (const selector of authorSelectors) {
                  const authorElement = comment.querySelector(selector);
                  if (authorElement && authorElement.textContent.trim()) {
                    author = authorElement.textContent.trim();
                    if (author.startsWith("u/")) {
                      author = author.substring(2);
                    }
                    break;
                  }
                }

                const scoreSelectors = [
                  '[data-testid="comment-vote-count"]',
                  ".score",
                  ".upvotes",
                ];

                let score = "0";
                for (const selector of scoreSelectors) {
                  const scoreElement = comment.querySelector(selector);
                  if (scoreElement && scoreElement.textContent.trim()) {
                    score = scoreElement.textContent.trim();
                    break;
                  }
                }

                if (text && text.length > 10) {
                  result.comments.push({
                    author,
                    text: text.substring(0, 300),
                    score,
                  });
                }
              } catch (error) {
                console.error("Error extracting comment:", error);
              }
            });
        }

        return result;
      });

      // 포스트 데이터 업데이트
      post.content = postData.content || "";
      post.comments = postData.comments || [];

      console.log(
        `✅ Content: ${post.content ? "Yes" : "No"}, Comments: ${
          post.comments.length
        }`
      );
    } catch (error) {
      console.error(`❌ Error processing post ${i}:`, error.message);
      post.content = "";
      post.comments = [];
    }

    // 요청 간격 조절
    await page.waitForTimeout(1000);
  }

  console.log(`✅ Completed processing ${Math.min(allPosts.length, 30)} posts`);
}

async function saveToMarkdown() {
  console.log("\n📝 Saving results to markdown...");

  let markdown = `# YouTube 자막 추출 관련 Reddit 자료 모음

이 문서는 Reddit에서 수집한 YouTube 자막 추출 관련 포스팅과 댓글들을 정리한 것입니다.

## 📊 수집 통계
- **총 포스팅 수**: ${allPosts.length}개
- **수집일**: ${new Date().toLocaleDateString("ko-KR")}
- **검색어**: YouTube subtitle extract, YouTube caption scraping 등

---

`;

  allPosts.forEach((post, index) => {
    markdown += `## ${index + 1}. ${post.title}

### 📋 기본 정보
- **서브레딧**: r/${post.subreddit}
- **작성자**: u/${post.author}
- **점수**: ${post.score}
- **댓글 수**: ${post.comments}
- **작성 시간**: ${post.time}
- **검색어**: ${post.searchTerm}
- **URL**: ${post.url}

### 📝 내용
${post.content || "내용 없음"}

`;

    if (
      post.comments &&
      Array.isArray(post.comments) &&
      post.comments.length > 0
    ) {
      markdown += `### 💬 댓글 (${post.comments.length}개)\n\n`;

      post.comments.forEach((comment, commentIndex) => {
        markdown += `#### 댓글 ${commentIndex + 1}
- **작성자**: u/${comment.author}
- **점수**: ${comment.score}
- **내용**: ${comment.text}

`;
      });
    } else {
      markdown += `### 💬 댓글
댓글을 수집하지 못했습니다.

`;
    }

    markdown += `---

`;
  });

  // 마크다운 파일 저장
  const fs = require("fs");
  const filename = `youtube_subtitle_reddit_data_${
    new Date().toISOString().split("T")[0]
  }.md`;

  fs.writeFileSync(filename, markdown, "utf8");

  console.log(`✅ Results saved to: ${filename}`);
  console.log(`📊 Total posts collected: ${allPosts.length}`);

  // 통계 출력
  const subredditStats = {};
  allPosts.forEach((post) => {
    subredditStats[post.subreddit] = (subredditStats[post.subreddit] || 0) + 1;
  });

  console.log("\n📈 Subreddit Statistics:");
  Object.entries(subredditStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([subreddit, count]) => {
      console.log(`  r/${subreddit}: ${count} posts`);
    });
}

// 스크래핑 시작
scrapeReddit().catch(console.error);
