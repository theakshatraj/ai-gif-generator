import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import youtubedl from "youtube-dl-exec"; // ✅ NEW
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VideoService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), "uploads");
    this.outputDir = path.join(process.cwd(), "output");
    this.tempDir = path.join(process.cwd(), "temp");

    this.setupFFmpeg();
  }

  setupFFmpeg() {
    ffmpeg.setFfmpegPath("ffmpeg");
    ffmpeg.setFfprobePath("ffprobe");
  }

  async downloadFromYoutube(youtubeUrl) {
    const videoId = uuidv4();
    const videoPath = path.join(this.tempDir, `${videoId}.mp4`);

    console.log("⬇️ Downloading video from YouTube...");

    await youtubedl(youtubeUrl, {
      format: 'best[ext=mp4][height<=720]/best',
      output: videoPath,
    });

    if (!fs.existsSync(videoPath)) throw new Error("Download failed");
    return { videoPath, videoInfo: await this.getVideoInfo(videoPath) };
  }

  async downloadYoutubeCaptions(youtubeUrl) {
    const captionId = uuidv4();
    const captionBasePath = path.join(this.tempDir, `${captionId}`);

    console.log("📝 Downloading YouTube captions...");

    const languages = ["en", "en-US", "en-GB", "auto"];
    let captionFilePath = null;

    for (const lang of languages) {
      try {
        await youtubedl(youtubeUrl, {
          skipDownload: true,
          writeSubs: true,
          subLangs: lang,
          subFormat: "vtt",
          output: captionBasePath,
        });

        const possibleCaptionPath = `${captionBasePath}.${lang}.vtt`;
        if (fs.existsSync(possibleCaptionPath)) {
          captionFilePath = possibleCaptionPath;
          break;
        }

      } catch (err) {
        console.log(`⚠️ Failed to download captions in ${lang}:`, err.message);
      }
    }

    if (!captionFilePath || !fs.existsSync(captionFilePath)) {
      throw new Error("No captions available for this video");
    }

    const captions = await this.parseVTTFile(captionFilePath);

    // Clean up
    fs.unlinkSync(captionFilePath);

    return captions;
  }

  async parseVTTFile(vttPath) {
    try {
      console.log("📖 Parsing VTT caption file...");

      const vttContent = fs.readFileSync(vttPath, "utf8");
      const lines = vttContent.split("\n");

      const captions = [];
      let currentCaption = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line || line.startsWith("WEBVTT") || line.startsWith("NOTE")) continue;

        if (line.includes("-->")) {
          const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
          if (timeMatch) {
            if (currentCaption && currentCaption.text) {
              captions.push(currentCaption);
            }

            currentCaption = {
              start: this.timeToSeconds(timeMatch[1]),
              end: this.timeToSeconds(timeMatch[2]),
              text: "",
            };
          }
        } else if (currentCaption && line && !line.match(/^\d+$/)) {
          currentCaption.text += (currentCaption.text ? " " : "") + line.replace(/<[^>]*>/g, "").trim();
        }
      }

      if (currentCaption && currentCaption.text) {
        captions.push(currentCaption);
      }

      console.log(`✅ Parsed ${captions.length} caption segments`);

      return {
        text: captions.map((cap) => cap.text).join(" "),
        segments: captions.map((cap) => ({
          start: cap.start,
          end: cap.end,
          text: cap.text,
        })),
      };
    } catch (error) {
      console.error("❌ Failed to parse VTT file:", error);
      throw error;
    }
  }

  timeToSeconds(timeString) {
    const parts = timeString.split(":");
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const secondsParts = parts[2].split(".");
    const seconds = parseInt(secondsParts[0]);
    const milliseconds = parseInt(secondsParts[1]);
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }

  async getVideoInfo(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.error("❌ FFprobe error:", err);
          reject(err);
        } else {
          const duration = metadata.format.duration;
          const size = metadata.format.size;
          const bitrate = metadata.format.bit_rate;

          resolve({
            duration: Math.round(duration),
            size: `${Math.round(size / (1024 * 1024))}MB`,
            bitrate: `${Math.round(bitrate / 1000)}kbps`,
          });
        }
      });
    });
  }

  async extractAudio(videoPath) {
    return new Promise((resolve, reject) => {
      const audioId = uuidv4();
      const audioPath = path.join(this.tempDir, `${audioId}.mp3`);

      ffmpeg(videoPath)
        .output(audioPath)
        .audioCodec("libmp3lame")
        .audioFrequency(16000)
        .audioChannels(1)
        .audioBitrate("64k")
        .noVideo()
        .on("end", () => resolve(audioPath))
        .on("error", (err) => reject(err))
        .run();
    });
  }

  async createClip(videoPath, startTime, duration) {
    return new Promise((resolve, reject) => {
      const clipId = uuidv4();
      const clipPath = path.join(this.tempDir, `${clipId}.mp4`);

      ffmpeg(videoPath)
        .seekInput(startTime)
        .inputOptions(["-t", duration.toString()])
        .outputOptions(["-c:v", "libx264", "-c:a", "aac", "-preset", "fast", "-crf", "28", "-movflags", "+faststart"])
        .output(clipPath)
        .on("end", () => resolve(clipPath))
        .on("error", (err) => reject(err))
        .run();
    });
  }
}

export default new VideoService();
