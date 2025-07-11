import { exec } from "child_process";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { promisify } from "util";
import youtubeService from "./youtubeService.js"; // Import the YouTube service

const execAsync = promisify(exec);

class VideoService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), "uploads");
    this.outputDir = path.join(process.cwd(), "output");
    this.tempDir = path.join(process.cwd(), "temp");
    this.cacheDir = path.join(process.cwd(), "cache");

    this.setupFFmpeg();
    this.ensureDirectories();
  }

  setupFFmpeg() {
    ffmpeg.setFfmpegPath("ffmpeg");
    ffmpeg.setFfprobePath("ffprobe");
  }

  ensureDirectories() {
    [this.uploadDir, this.outputDir, this.tempDir, this.cacheDir].forEach(
      (dir) => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`📁 Created directory: ${dir}`);
        }
      }
    );
  }

  // Use YouTube service instead of downloading
  async getYouTubeData(youtubeUrl) {
    console.log("🔍 Getting YouTube data using YouTube service...");
    return await youtubeService.getYouTubeData(youtubeUrl);
  }

  // Extract video ID from YouTube URL
  extractVideoId(url) {
    return youtubeService.extractVideoId(url);
  }

  async getVideoInfo(videoPath) {
    return new Promise((resolve, reject) => {
      console.log("📊 Getting video information...");

      if (!fs.existsSync(videoPath)) {
        reject(new Error("Video file not found"));
        return;
      }

      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.error("❌ FFprobe error:", err);
          reject(err);
        } else {
          const duration = metadata.format.duration;
          const size = metadata.format.size;
          const bitrate = metadata.format.bit_rate;

          const videoInfo = {
            duration: Math.round(duration),
            size: `${Math.round(size / (1024 * 1024))}MB`,
            bitrate: `${Math.round(bitrate / 1000)}kbps`,
          };

          console.log("📊 Video info:", videoInfo);
          resolve(videoInfo);
        }
      });
    });
  }

  async extractAudio(videoPath) {
    return new Promise((resolve, reject) => {
      const audioId = uuidv4();
      const audioPath = path.join(this.tempDir, `${audioId}.mp3`);

      console.log("🎵 Extracting audio from video...");

      if (!fs.existsSync(videoPath)) {
        reject(new Error("Video file not found"));
        return;
      }

      ffmpeg(videoPath)
        .output(audioPath)
        .audioCodec("libmp3lame")
        .audioFrequency(16000)
        .audioChannels(1)
        .audioBitrate("64k")
        .noVideo()
        .on("start", (commandLine) => {
          console.log("🎵 Audio extraction started");
          console.log("🔧 Command:", commandLine);
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            console.log(
              `🎵 Audio extraction progress: ${Math.round(progress.percent)}%`
            );
          }
        })
        .on("end", () => {
          console.log("✅ Audio extracted successfully");
          resolve(audioPath);
        })
        .on("error", (err) => {
          console.error("❌ Audio extraction failed:", err);
          reject(err);
        })
        .run();
    });
  }

  async createClip(videoPath, startTime, duration) {
    return new Promise((resolve, reject) => {
      const clipId = uuidv4();
      const clipPath = path.join(this.tempDir, `${clipId}.mp4`);

      console.log(
        `✂️ Creating video clip: ${startTime}s - ${startTime + duration}s`
      );
      console.log(`📁 Clip path: ${clipPath}`);

      if (!fs.existsSync(videoPath)) {
        reject(new Error("Video file not found"));
        return;
      }

      ffmpeg(videoPath)
        .seekInput(startTime)
        .inputOptions(["-t", duration.toString()])
        .outputOptions([
          "-c:v",
          "libx264",
          "-c:a",
          "aac",
          "-preset",
          "fast",
          "-crf",
          "28",
          "-movflags",
          "+faststart",
          "-avoid_negative_ts",
          "make_zero",
        ])
        .output(clipPath)
        .on("start", (commandLine) => {
          console.log("✂️ Video clip creation started");
          console.log("🔧 Command:", commandLine);
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            console.log(`✂️ Clip progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on("end", () => {
          console.log("✅ Video clip created successfully");
          resolve(clipPath);
        })
        .on("error", (err) => {
          console.error("❌ Video clip creation failed:", err);
          reject(err);
        })
        .run();
    });
  }

  // Create a blank placeholder video of a given duration
  async createPlaceholderVideo(durationInSeconds, title = "placeholder") {
    const placeholderId = uuidv4();
    const outputPath = path.join(this.tempDir, `${placeholderId}.mp4`);

    return new Promise((resolve, reject) => {
      const command = ffmpeg()
        .input("color=black:s=640x360:r=30")
        .inputFormat("lavfi")
        .inputOptions([`-t ${durationInSeconds}`])
        .outputOptions([
          "-c:v",
          "libx264",
          "-preset",
          "fast",
          "-crf",
          "28",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
        ])
        .output(outputPath)
        .on("start", (cmd) => {
          console.log("🎬 Starting placeholder video generation...");
          console.log("🔧 FFmpeg command:", cmd);
        })
        .on("end", () => {
          console.log("✅ Placeholder video created successfully");
          resolve({ videoPath: outputPath, placeholderId });
        })
        .on("error", (err) => {
          console.error("❌ Failed to create placeholder video:", err.message);
          reject(err);
        });

      command.run();
    });
  }

  // Utility method to clean up temporary files
  async cleanupTempFiles(filePaths) {
    const cleanupPromises = filePaths.map(async (filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Cleaned up: ${path.basename(filePath)}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup ${filePath}:`, error.message);
      }
    });

    await Promise.all(cleanupPromises);
  }

  // Get video duration quickly without full metadata
  async getVideoDuration(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format.duration);
        }
      });
    });
  }

  // Cleanup method
  async cleanup() {
    console.log("🧹 Cleaning up video service...");
    await youtubeService.cleanup();
  }
}

export default new VideoService();