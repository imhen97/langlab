const { chromium } = require("playwright");

async function debugRedditStructure() {
  const browser = await chromium.launch({ headless: false }); // 디버깅을 위해 headless: false
  const page = await browser.newPage();

  try {
    console.log("Navigating to Reddit...");

    // Reddit 메인 페이지로 이동
    await page.goto("https://www.reddit.com/", {
      waitUntil: "domcontentloaded",
    });

    // 페이지 로딩 대기
    await page.waitForTimeout(5000);

    // 스크린샷 찍기
    await page.screenshot({ path: "reddit_main_debug.png" });

    // 페이지 구조 분석
    const pageInfo = await page.evaluate(() => {
      // 모든 가능한 포스트 관련 선택자들
      const selectors = [
        '[data-testid="post-container"]',
        '[data-testid="post"]',
        ".Post",
        '[data-click-id="body"]',
        ".thing",
        '[data-testid="post-content"]',
        ".entry",
        ".link",
        "article",
        '[role="article"]',
      ];

      const results = {};

      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        results[selector] = elements.length;
      });

      // 페이지의 모든 링크 찾기
      const allLinks = document.querySelectorAll("a");
      const linkResults = [];

      allLinks.forEach((link) => {
        const href = link.href;
        const text = link.textContent.trim();

        if (
          href &&
          text &&
          (href.includes("/r/") || href.includes("/comments/"))
        ) {
          linkResults.push({
            href: href,
            text: text.substring(0, 100),
          });
        }
      });

      return {
        selectors: results,
        links: linkResults.slice(0, 10), // 처음 10개만
        pageTitle: document.title,
        url: window.location.href,
      };
    });

    console.log("Page Info:", JSON.stringify(pageInfo, null, 2));

    // 검색 시도
    console.log("Trying search...");
    await page.goto(
      "https://www.reddit.com/search/?q=youtube%20transcript&sort=relevance&t=all",
      { waitUntil: "domcontentloaded" }
    );

    await page.waitForTimeout(3000);

    // 검색 결과 스크린샷
    await page.screenshot({ path: "reddit_search_debug.png" });

    // 검색 결과 구조 분석
    const searchInfo = await page.evaluate(() => {
      const selectors = [
        '[data-testid="post-container"]',
        '[data-testid="post"]',
        ".Post",
        '[data-click-id="body"]',
        ".thing",
        ".search-result",
        ".result",
        "article",
      ];

      const results = {};

      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        results[selector] = elements.length;
        if (elements.length > 0) {
          results[`${selector}_first`] = {
            text: elements[0].textContent.substring(0, 200),
            className: elements[0].className,
            tagName: elements[0].tagName,
          };
        }
      });

      return {
        selectors: results,
        pageTitle: document.title,
        url: window.location.href,
        bodyText: document.body.textContent.substring(0, 500),
      };
    });

    console.log("Search Info:", JSON.stringify(searchInfo, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
  }
}

// 실행
debugRedditStructure();

