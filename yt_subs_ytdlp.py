#!/usr/bin/env python3
"""
YouTube 자막 추출기 (yt-dlp 기반) - API 서버용

yt-dlp를 사용하여 YouTube 영상에서 자동 생성된 자막을 추출하고,
지정된 형식으로 출력합니다.

사용법:
    python yt_subs_ytdlp.py --url https://youtu.be/abcd1234 --lang ko,en --format srt
    python yt_subs_ytdlp.py --url https://youtu.be/abcd1234 --lang en --format json --outdir ./subs
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Dict, List, Optional

try:
    import webvtt
except ImportError:
    print("ERROR: webvtt-py가 설치되지 않았습니다.")
    print("다음 명령으로 설치하세요: pip install webvtt-py")
    sys.exit(1)


class YouTubeSubsYtDlp:
    """YouTube 자막 추출기 클래스"""

    def __init__(self):
        pass

    def extract_video_id(self, url: str) -> Optional[str]:
        """YouTube URL에서 video ID 추출"""
        patterns = [
            r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
            r'youtube\.com/v/([a-zA-Z0-9_-]{11})',
        ]

        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)

        return None

    def run_ytdlp(self, url: str, lang: str, output_template: str) -> tuple[bool, str, str]:
        """
        yt-dlp 실행

        Returns:
            (success, stdout, stderr)
        """
        cmd = [
            'yt-dlp',
            '--write-auto-subs',
            f'--sub-lang={lang}',
            '--skip-download',
            '-o', output_template,
            url
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,  # 5분 타임아웃
                check=False
            )

            return result.returncode == 0, result.stdout, result.stderr

        except subprocess.TimeoutExpired:
            return False, "", "yt-dlp 실행 시간이 초과되었습니다 (5분)"
        except FileNotFoundError:
            return False, "", "yt-dlp가 설치되지 않았습니다"
        except Exception as e:
            return False, "", f"yt-dlp 실행 중 오류 발생: {e}"

    def find_vtt_file(self, temp_dir: Path, video_id: str, lang: str) -> Optional[Path]:
        """생성된 VTT 파일 찾기"""
        # 가능한 파일명 패턴들
        patterns = [
            f"{video_id}.{lang}.vtt",
            f"{video_id}.vtt",
            "*.vtt"  # 모든 VTT 파일
        ]

        for pattern in patterns:
            if pattern == "*.vtt":
                # 모든 VTT 파일 검색
                for vtt_file in temp_dir.glob("*.vtt"):
                    try:
                        # 파일 내용 확인 (자막 파일인지 검증)
                        with open(vtt_file, 'r', encoding='utf-8') as f:
                            content = f.read()
                            if 'WEBVTT' in content or '-->' in content:
                                return vtt_file
                    except:
                        continue
            else:
                # 특정 패턴 파일 검색
                vtt_file = temp_dir / pattern
                if vtt_file.exists():
                    return vtt_file

        return None

    def parse_vtt_to_json(self, vtt_file: Path) -> List[Dict]:
        """VTT 파일을 JSON 형식으로 변환"""
        try:
            # webvtt-py를 사용한 파싱 시도
            captions = list(webvtt.read(str(vtt_file)))

            segments = []
            for caption in captions:
                start_time = caption.start_in_seconds
                end_time = caption.end_in_seconds
                text = caption.text.strip()

                if text:  # 빈 텍스트 제외
                    segments.append({
                        "start": round(start_time, 3),
                        "end": round(end_time, 3),
                        "text": text
                    })

            return segments

        except Exception as e:
            # 폴백: 직접 파싱 시도
            try:
                return self.parse_vtt_manually(vtt_file)
            except Exception as e2:
                raise Exception(f"VTT 파싱 실패: {e}")

    def parse_vtt_manually(self, vtt_file: Path) -> List[Dict]:
        """수동 VTT 파싱 (폴백용)"""
        segments = []

        with open(vtt_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        i = 0
        while i < len(lines):
            line = lines[i].strip()

            # 타임스탬프 라인 찾기
            if '-->' in line:
                time_match = re.match(r'(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})', line)
                if time_match:
                    start_time = self.time_to_seconds(time_match.group(1))
                    end_time = self.time_to_seconds(time_match.group(2))

                    # 텍스트 라인들 수집
                    text_lines = []
                    i += 1
                    while i < len(lines) and lines[i].strip() and not lines[i].strip().isdigit():
                        text_lines.append(lines[i].strip())
                        i += 1

                    text = ' '.join(text_lines).strip()
                    if text:
                        segments.append({
                            "start": round(start_time, 3),
                            "end": round(end_time, 3),
                            "text": text
                        })
                else:
                    i += 1
            else:
                i += 1

        return segments

    def time_to_seconds(self, time_str: str) -> float:
        """SRT/VTT 시간 형식을 초로 변환"""
        parts = time_str.replace(',', '.').split(':')
        if len(parts) == 3:  # HH:MM:SS.mmm
            hours = int(parts[0])
            minutes = int(parts[1])
            seconds = float(parts[2])
            return hours * 3600 + minutes * 60 + seconds
        elif len(parts) == 2:  # MM:SS.mmm
            minutes = int(parts[0])
            seconds = float(parts[1])
            return minutes * 60 + seconds
        else:
            return 0.0

    def convert_to_srt(self, segments: List[Dict]) -> str:
        """JSON 세그먼트를 SRT 형식으로 변환"""
        srt_lines = []

        for i, segment in enumerate(segments, 1):
            start_time = self.seconds_to_srt_time(segment['start'])
            end_time = self.seconds_to_srt_time(segment['end'])

            srt_lines.append(str(i))
            srt_lines.append(f"{start_time} --> {end_time}")
            srt_lines.append(segment['text'])
            srt_lines.append("")

        return "\n".join(srt_lines)

    def seconds_to_srt_time(self, seconds: float) -> str:
        """초를 SRT 시간 형식으로 변환"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        milliseconds = int((seconds % 1) * 1000)

        return f"{hours"02d"}:{minutes"02d"}:{secs"02d"},{milliseconds"03d"}"

    def convert_to_txt(self, segments: List[Dict]) -> str:
        """JSON 세그먼트를 TXT 형식으로 변환"""
        return "\n".join([segment['text'] for segment in segments])

    def save_to_file(self, segments: List[Dict], output_format: str, output_path: Path) -> None:
        """세그먼트를 파일로 저장"""
        if output_format == 'json':
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(segments, f, indent=2, ensure_ascii=False)
        elif output_format == 'srt':
            srt_content = self.convert_to_srt(segments)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(srt_content)
        elif output_format == 'txt':
            txt_content = self.convert_to_txt(segments)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(txt_content)

    def extract_subtitles(self, url: str, lang: str, output_format: str, output_dir: Optional[Path] = None) -> tuple[bool, str, Optional[str]]:
        """
        자막 추출 메인 함수

        Returns:
            (success, message, file_path_or_content)
        """
        # Video ID 추출
        video_id = self.extract_video_id(url)
        if not video_id:
            return False, f"잘못된 YouTube URL: {url}", None

        # 임시 디렉토리 생성
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # yt-dlp 실행을 위한 출력 템플릿
            output_template = str(temp_path / "%(id)s.%(ext)s")

            # yt-dlp 실행
            success, stdout, stderr = self.run_ytdlp(url, lang, output_template)

            if not success:
                if "Unable to download video subtitles" in stderr or "No subtitles available" in stderr:
                    return False, "NO_CAPTIONS", None
                else:
                    return False, f"yt-dlp 실패: {stderr}", None

            # 생성된 VTT 파일 찾기
            vtt_file = self.find_vtt_file(temp_path, video_id, lang)
            if not vtt_file:
                return False, "VTT 파일을 찾을 수 없습니다", None

            try:
                # VTT 파싱
                segments = self.parse_vtt_to_json(vtt_file)

                if not segments:
                    return False, "파싱된 세그먼트가 없습니다", None

                # 요청된 포맷에 따라 처리
                if output_format == 'json':
                    # JSON을 STDOUT으로 출력
                    json_content = json.dumps(segments, indent=2, ensure_ascii=False)
                    return True, "SUCCESS", json_content
                else:
                    # 파일로 저장 후 경로 반환
                    if output_dir:
                        output_dir.mkdir(parents=True, exist_ok=True)
                        output_file = output_dir / f"{video_id}.{lang}.{output_format}"
                        self.save_to_file(segments, output_format, output_file)
                        return True, "SUCCESS", str(output_file)
                    else:
                        # 임시 파일로 저장 후 내용 반환
                        temp_output = temp_path / f"output.{output_format}"
                        self.save_to_file(segments, output_format, temp_output)
                        with open(temp_output, 'r', encoding='utf-8') as f:
                            content = f.read()
                        return True, "SUCCESS", content

            except Exception as e:
                return False, f"VTT 처리 실패: {e}", None


def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(
        description='YouTube 자막 추출기 (yt-dlp 기반) - API 서버용',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument(
        '--url',
        required=True,
        help='YouTube URL (필수)'
    )

    parser.add_argument(
        '--lang',
        default='en',
        help='자막 언어 (기본값: en)'
    )

    parser.add_argument(
        '--format',
        choices=['srt', 'json', 'txt'],
        default='json',
        help='출력 형식 (기본값: json)'
    )

    parser.add_argument(
        '--outdir',
        help='출력 디렉토리 (파일 저장용)'
    )

    args = parser.parse_args()

    # 추출기 초기화
    extractor = YouTubeSubsYtDlp()

    # 출력 디렉토리 설정
    output_dir = Path(args.outdir) if args.outdir else None

    # 자막 추출 실행
    success, message, result = extractor.extract_subtitles(args.url, args.lang, args.format, output_dir)

    if success:
        if args.format == 'json':
            # JSON은 STDOUT으로 출력
            print(result)
        else:
            # 파일 저장 시 경로 출력
            print(result)
        sys.exit(0)
    else:
        if message == "NO_CAPTIONS":
            print("NO_CAPTIONS")
            sys.exit(2)
        else:
            print(f"ERROR: {message}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    sys.exit(main())