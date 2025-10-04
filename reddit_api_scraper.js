const https = require("https");

async function searchRedditAPI(searchTerm) {
  return new Promise((resolve, reject) => {
    const encodedTerm = encodeURIComponent(searchTerm);
    // Reddit JSON API 사용 (더미 user agent 추가)
    const url = `https://www.reddit.com/search.json?q=${encodedTerm}&sort=relevance&limit=100`;

    const options = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    };

    https
      .get(url, options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

async function getSubredditPosts(subreddit, searchTerm) {
  return new Promise((resolve, reject) => {
    const encodedTerm = encodeURIComponent(searchTerm);
    const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodedTerm}&restrict_sr=1&sort=relevance&limit=100`;

    const options = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    };

    https
      .get(url, options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

async function scrapeRedditYouTubeTranscriptPosts() {
  try {
    console.log("Searching Reddit API for YouTube transcript posts...");

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

    // YouTube/개발 관련 서브레딧들
    const subreddits = [
      "youtube",
      "programming",
      "python",
      "javascript",
      "webdev",
      "learnprogramming",
      "coding",
      "MachineLearning",
      "datascience",
      "automation",
    ];

    let allPosts = [];

    // 전체 Reddit 검색
    for (const term of searchTerms) {
      console.log(`Searching Reddit for: ${term}`);

      try {
        const searchResults = await searchRedditAPI(term);

        if (searchResults.data && searchResults.data.children) {
          console.log(
            `Found ${searchResults.data.children.length} posts for "${term}"`
          );

          searchResults.data.children.forEach((child) => {
            const post = child.data;

            allPosts.push({
              id: post.id,
              title: post.title,
              url: `https://www.reddit.com${post.permalink}`,
              selftext: post.selftext || "",
              subreddit: post.subreddit,
              score: post.score,
              numComments: post.num_comments,
              created: new Date(post.created_utc * 1000).toISOString(),
              author: post.author,
              upvoteRatio: post.upvote_ratio,
              searchTerm: term,
              source: "reddit_search",
            });
          });
        }

        // API 호출 제한을 위한 대기
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.log(`Error searching for "${term}":`, error.message);
      }
    }

    // 특정 서브레딧에서 검색
    for (const subreddit of subreddits) {
      for (const term of searchTerms.slice(0, 3)) {
        // 처음 3개 검색어만
        console.log(`Searching r/${subreddit} for: ${term}`);

        try {
          const subredditResults = await getSubredditPosts(subreddit, term);

          if (subredditResults.data && subredditResults.data.children) {
            console.log(
              `Found ${subredditResults.data.children.length} posts in r/${subreddit} for "${term}"`
            );

            subredditResults.data.children.forEach((child) => {
              const post = child.data;

              allPosts.push({
                id: post.id,
                title: post.title,
                url: `https://www.reddit.com${post.permalink}`,
                selftext: post.selftext || "",
                subreddit: post.subreddit,
                score: post.score,
                numComments: post.num_comments,
                created: new Date(post.created_utc * 1000).toISOString(),
                author: post.author,
                upvoteRatio: post.upvote_ratio,
                searchTerm: term,
                source: `r/${subreddit}`,
              });
            });
          }

          // API 호출 제한을 위한 대기
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.log(
            `Error searching r/${subreddit} for "${term}":`,
            error.message
          );
        }
      }
    }

    // 중복 제거
    const uniquePosts = allPosts.filter(
      (post, index, self) => index === self.findIndex((p) => p.id === post.id)
    );

    // 100개로 제한
    const limitedPosts = uniquePosts.slice(0, 100);

    console.log(`Total unique posts found: ${limitedPosts.length}`);
    return limitedPosts;
  } catch (error) {
    console.error("Error:", error);
    return [];
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
    markdown += `**Subreddit:** r/${post.subreddit}\n\n`;
    markdown += `**URL:** ${post.url}\n\n`;
    markdown += `**Score:** ${post.score} (${Math.round(
      post.upvoteRatio * 100
    )}% upvoted)\n\n`;
    markdown += `**Comments:** ${post.numComments}\n\n`;
    markdown += `**Author:** u/${post.author}\n\n`;
    markdown += `**Created:** ${post.created}\n\n`;
    markdown += `**Search Term:** ${post.searchTerm}\n\n`;
    markdown += `**Source:** ${post.source}\n\n`;

    if (post.selftext) {
      markdown += `**Content:**\n${post.selftext.substring(0, 1000)}\n\n`;
    }

    markdown += "---\n\n";
  });

  fs.writeFileSync("reddit_youtube_transcript_posts.md", markdown);
  console.log("Markdown file saved as reddit_youtube_transcript_posts.md");
});

