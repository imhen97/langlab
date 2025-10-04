const https = require("https");

async function searchStackOverflowAPI(searchTerm) {
  return new Promise((resolve, reject) => {
    const encodedTerm = encodeURIComponent(searchTerm);
    const url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodedTerm}&site=stackoverflow&pagesize=100`;

    https
      .get(url, (res) => {
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

async function getQuestionDetails(questionId) {
  return new Promise((resolve, reject) => {
    const url = `https://api.stackexchange.com/2.3/questions/${questionId}?order=desc&sort=activity&site=stackoverflow&filter=withbody`;

    https
      .get(url, (res) => {
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

async function scrapeYouTubeTranscriptQuestions() {
  try {
    console.log(
      "Searching Stack Overflow API for YouTube transcript questions..."
    );

    const searchTerms = [
      "youtube transcript",
      "youtube captions",
      "youtube subtitles",
      "youtube-transcript",
      "youtube transcript api",
      "youtube-dl transcript",
      "youtube transcript extract",
      "youtube api transcript",
    ];

    let allQuestions = [];

    for (const term of searchTerms) {
      console.log(`Searching for: ${term}`);

      try {
        const searchResults = await searchStackOverflowAPI(term);

        if (searchResults.items) {
          console.log(
            `Found ${searchResults.items.length} questions for "${term}"`
          );

          for (const item of searchResults.items) {
            // 상세 정보 가져오기
            try {
              const details = await getQuestionDetails(item.question_id);
              if (details.items && details.items.length > 0) {
                const question = details.items[0];

                allQuestions.push({
                  id: question.question_id,
                  title: question.title,
                  url: `https://stackoverflow.com/questions/${question.question_id}`,
                  excerpt: question.body
                    ? question.body.replace(/<[^>]*>/g, "").substring(0, 500)
                    : "",
                  tags: question.tags || [],
                  score: question.score,
                  viewCount: question.view_count,
                  answerCount: question.answer_count,
                  isAnswered: question.is_answered,
                  creationDate: new Date(
                    question.creation_date * 1000
                  ).toISOString(),
                  lastActivityDate: new Date(
                    question.last_activity_date * 1000
                  ).toISOString(),
                  searchTerm: term,
                });
              }
            } catch (error) {
              console.log(
                `Error getting details for question ${item.question_id}:`,
                error.message
              );
            }

            // API 호출 제한을 위한 대기
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        // API 호출 제한을 위한 대기
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.log(`Error searching for "${term}":`, error.message);
      }
    }

    // 중복 제거
    const uniqueQuestions = allQuestions.filter(
      (question, index, self) =>
        index === self.findIndex((q) => q.id === question.id)
    );

    // 100개로 제한
    const limitedQuestions = uniqueQuestions.slice(0, 100);

    console.log(`Total unique questions found: ${limitedQuestions.length}`);
    return limitedQuestions;
  } catch (error) {
    console.error("Error:", error);
    return [];
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
  markdown += "Generated on: " + new Date().toISOString() + "\n\n";
  markdown += "---\n\n";

  questions.forEach((question, index) => {
    markdown += `## ${index + 1}. ${question.title}\n\n`;
    markdown += `**Question ID:** ${question.id}\n\n`;
    markdown += `**URL:** ${question.url}\n\n`;
    markdown += `**Score:** ${question.score}\n\n`;
    markdown += `**Views:** ${question.viewCount}\n\n`;
    markdown += `**Answers:** ${question.answerCount}\n\n`;
    markdown += `**Answered:** ${question.isAnswered ? "Yes" : "No"}\n\n`;
    markdown += `**Tags:** ${question.tags.join(", ")}\n\n`;
    markdown += `**Search Term:** ${question.searchTerm}\n\n`;
    markdown += `**Created:** ${question.creationDate}\n\n`;
    markdown += `**Last Activity:** ${question.lastActivityDate}\n\n`;

    if (question.excerpt) {
      markdown += `**Excerpt:**\n${question.excerpt}\n\n`;
    }

    markdown += "---\n\n";
  });

  fs.writeFileSync("youtube_transcript_questions.md", markdown);
  console.log("Markdown file saved as youtube_transcript_questions.md");
});

