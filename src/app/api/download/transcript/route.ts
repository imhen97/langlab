import { NextRequest, NextResponse } from "next/server";
import getServerSession from "next-auth";
import { SessionWithUser } from "@/types/session";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// 다운로드 요청 스키마
const downloadRequestSchema = z.object({
  lessonId: z.string().min(1),
  format: z.enum(["txt", "pdf"]),
  title: z.string().min(1),
  transcript: z.any(),
});

// TXT 형식으로 변환
function formatAsTXT(title: string, transcript: any): string {
  let content = `${title}\n`;
  content += "=".repeat(title.length) + "\n\n";
  content += `생성일: ${new Date().toLocaleDateString("ko-KR")}\n\n`;

  if (Array.isArray(transcript)) {
    content += "대본 내용:\n";
    content += "-".repeat(20) + "\n\n";

    transcript.forEach((segment: any, index: number) => {
      if (segment.en || segment.ko) {
        const startTime = Math.floor(segment.start);
        const minutes = Math.floor(startTime / 60);
        const seconds = startTime % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

        content += `[${timeStr}] ${index + 1}\n`;

        if (segment.en) {
          content += `EN: ${segment.en}\n`;
        }
        if (segment.ko) {
          content += `KO: ${segment.ko}\n`;
        }
        content += "\n";
      }
    });
  } else if (typeof transcript === "string") {
    content += "대본 내용:\n";
    content += "-".repeat(20) + "\n\n";
    content += transcript;
  }

  return content;
}

// PDF 형식으로 변환 (간단한 HTML을 PDF로 변환하는 방식)
function formatAsHTML(title: string, transcript: any): string {
  let content = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title} - 대본</title>
      <style>
        body {
          font-family: 'Malgun Gothic', Arial, sans-serif;
          line-height: 1.6;
          margin: 40px;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .date {
          font-size: 14px;
          color: #666;
        }
        .segment {
          margin-bottom: 20px;
          padding: 10px;
          border-left: 3px solid #007bff;
          background-color: #f8f9fa;
        }
        .timestamp {
          font-weight: bold;
          color: #007bff;
          margin-bottom: 5px;
        }
        .english {
          margin-bottom: 5px;
          font-size: 16px;
        }
        .korean {
          color: #666;
          font-size: 14px;
        }
        .segment-number {
          background-color: #007bff;
          color: white;
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 12px;
          margin-right: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${title}</div>
        <div class="date">생성일: ${new Date().toLocaleDateString(
          "ko-KR"
        )}</div>
      </div>
  `;

  if (Array.isArray(transcript)) {
    content += "<h2>대본 내용</h2>";

    transcript.forEach((segment: any, index: number) => {
      if (segment.en || segment.ko) {
        const startTime = Math.floor(segment.start);
        const minutes = Math.floor(startTime / 60);
        const seconds = startTime % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

        content += `
          <div class="segment">
            <div class="timestamp">
              <span class="segment-number">${index + 1}</span>
              [${timeStr}]
            </div>
        `;

        if (segment.en) {
          content += `<div class="english">EN: ${segment.en}</div>`;
        }
        if (segment.ko) {
          content += `<div class="korean">KO: ${segment.ko}</div>`;
        }

        content += "</div>";
      }
    });
  } else if (typeof transcript === "string") {
    content += "<h2>대본 내용</h2>";
    content += `<div class="segment"><pre>${transcript}</pre></div>`;
  }

  content += `
      </body>
    </html>
  `;

  return content;
}

// POST: 대본 다운로드
export async function POST(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as SessionWithUser;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId, format, title, transcript } =
      downloadRequestSchema.parse(body);

    let content: string;
    let mimeType: string;
    let filename: string;

    if (format === "txt") {
      content = formatAsTXT(title, transcript);
      mimeType = "text/plain; charset=utf-8";
      filename = `${title}_대본.txt`;
    } else if (format === "pdf") {
      // PDF 생성은 복잡하므로 HTML로 제공하고 클라이언트에서 PDF로 변환
      content = formatAsHTML(title, transcript);
      mimeType = "text/html; charset=utf-8";
      filename = `${title}_대본.html`;
    } else {
      return NextResponse.json(
        { error: "지원하지 않는 형식입니다" },
        { status: 400 }
      );
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          filename
        )}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "잘못된 요청 데이터", details: error.errors },
        { status: 400 }
      );
    }

    console.error("다운로드 오류:", error);
    return NextResponse.json(
      { error: "다운로드 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}


