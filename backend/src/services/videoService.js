import { exec, spawn } from "child_process";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { promisify } from "util";

const execAsync = promisify(exec);

class VideoService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), "uploads");
    this.outputDir = path.join(process.cwd(), "output");
    this.tempDir = path.join(process.cwd(), "temp");
    this.cacheDir = path.join(process.cwd(), "cache");

    // Handle cookies from .env
    const base64Cookie = process.env.YOUTUBE_COOKIES;
    if (base64Cookie) {
      const decoded = Buffer.from(base64Cookie, "base64").toString("utf-8");
      this.cookiesPath = path.join(this.tempDir, "cookies.txt");
      fs.writeFileSync(this.cookiesPath, decoded);
      console.log("✅ Wrote cookies.txt from base64 .env");
    } else {
      this.cookiesPath = path.join(process.cwd(), "config", "cookies.txt");
      console.warn(
        "⚠️ No YOUTUBE_COOKIES found in .env; fallback to config/cookies.txt"
      );
    }

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

  // New method to run yt-dlp with spawn for better control
  async runYtDlp(args, timeout = 180000) {
    return new Promise((resolve, reject) => {
      console.log("🔧 Running yt-dlp with args:", args.join(" "));
      
      const child = spawn("yt-dlp", args, {
        env: {
          ...process.env,
          PYTHONPATH: "/opt/venv/lib/python3.11/site-packages",
          PATH: "/opt/venv/bin:" + process.env.PATH,
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log("📤 yt-dlp:", data.toString().trim());
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error("📤 yt-dlp stderr:", data.toString().trim());
      });

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`yt-dlp timeout after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  async downloadFromYoutube(youtubeUrl) {
    const videoId = uuidv4();
    const videoPath = path.join(this.tempDir, `${videoId}.mp4`);

    console.log("⬇️ Downloading video with enhanced anti-bot measures...");
    console.log("🔗 URL:", youtubeUrl);

    // Strategy 1: Try with cookies-from-browser (most reliable)
    const strategies = [
      {
        name: "cookies-from-browser",
        args: this.buildCookiesFromBrowserArgs(videoPath, youtubeUrl),
        timeout: 180000
      },
      {
        name: "fresh-cookies",
        args: this.buildFreshCookiesArgs(videoPath, youtubeUrl),
        timeout: 150000
      },
      {
        name: "no-cookies",
        args: this.buildNoCookiesArgs(videoPath, youtubeUrl),
        timeout: 120000
      },
      {
        name: "minimal",
        args: this.buildMinimalArgs(videoPath, youtubeUrl),
        timeout: 90000
      }
    ];

    for (const strategy of strategies) {
      try {
        console.log(`🔄 Trying strategy: ${strategy.name}`);
        
        // Random delay to avoid rate limiting
        const randomDelay = Math.floor(Math.random() * 3000) + 1000;
        console.log(`⏱️ Waiting ${randomDelay}ms before download...`);
        await new Promise((resolve) => setTimeout(resolve, randomDelay));

        await this.runYtDlp(strategy.args, strategy.timeout);

        // Verify file was created and is not empty
        if (fs.existsSync(videoPath) && fs.statSync(videoPath).size > 0) {
          console.log("✅ Video downloaded successfully");
          const stats = fs.statSync(videoPath);
          console.log(`📁 Video file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
          
          return {
            videoPath,
            videoInfo: await this.getVideoInfo(videoPath),
          };
        }
      } catch (error) {
        console.log(`❌ Strategy ${strategy.name} failed:`, error.message);
        
        // Clean up partial files
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }
        
        // If this is the last strategy, throw the error
        if (strategy === strategies[strategies.length - 1]) {
          throw new Error(`Failed to download video after all attempts: ${error.message}`);
        }
        
        // Wait before trying next strategy
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    throw new Error("All download strategies failed");
  }

  buildCookiesFromBrowserArgs(videoPath, youtubeUrl) {
    const args = [
      "--cookies-from-browser", "chrome",
      "--no-check-certificate",
      "--geo-bypass",
      "--extractor-retries", "3",
      "--fragment-retries", "3",
      "--retry-sleep", "2",
      "--sleep-interval", "1",
      "--max-sleep-interval", "5",
      "--socket-timeout", "30",
      "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "--referer", "https://www.youtube.com/",
      "--format", "best[height<=720][ext=mp4]/best[height<=480][ext=mp4]/best[ext=mp4]/best[ext=webm]/best",
      "--merge-output-format", "mp4",
      "--cache-dir", this.cacheDir,
      "--output", videoPath,
      youtubeUrl
    ];

    return args;
  }

  buildFreshCookiesArgs(videoPath, youtubeUrl) {
    const args = [
      "--no-check-certificate",
      "--geo-bypass",
      "--extractor-retries", "3",
      "--fragment-retries", "3",
      "--retry-sleep", "2",
      "--sleep-interval", "1",
      "--max-sleep-interval", "5",
      "--socket-timeout", "30",
      "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "--referer", "https://www.youtube.com/",
      "--add-header", "Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "--add-header", "Accept-Language:en-US,en;q=0.5",
      "--add-header", "Accept-Encoding:gzip, deflate, br",
      "--add-header", "DNT:1",
      "--add-header", "Connection:keep-alive",
      "--add-header", "Upgrade-Insecure-Requests:1",
      "--add-header", "Sec-Fetch-Dest:document",
      "--add-header", "Sec-Fetch-Mode:navigate",
      "--add-header", "Sec-Fetch-Site:none",
      "--add-header", "Sec-Fetch-User:?1",
      "--format", "best[height<=720][ext=mp4]/best[height<=480][ext=mp4]/best[ext=mp4]/best[ext=webm]/best",
      "--merge-output-format", "mp4",
      "--cache-dir", this.cacheDir,
      "--output", videoPath
    ];

    // Add cookies if available
    if (fs.existsSync(this.cookiesPath)) {
      args.splice(0, 0, "--cookies", this.cookiesPath);
    }

    args.push(youtubeUrl);
    return args;
  }

  buildNoCookiesArgs(videoPath, youtubeUrl) {
    return [
      "--no-check-certificate",
      "--geo-bypass",
      "--extractor-retries", "2",
      "--socket-timeout", "30",
      "--user-agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "--format", "worst[height<=480][ext=mp4]/worst[ext=mp4]/worst[ext=webm]/worst",
      "--merge-output-format", "mp4",
      "--cache-dir", this.cacheDir,
      "--output", videoPath,
      youtubeUrl
    ];
  }

  buildMinimalArgs(videoPath, youtubeUrl) {
    return [
      "--no-check-certificate",
      "--format", "worst",
      "--output", videoPath,
      youtubeUrl
    ];
  }

  async downloadYoutubeCaptions(youtubeUrl) {
    const captionId = uuidv4();
    const captionPath = path.join(this.tempDir, `${captionId}.vtt`);

    try {
      console.log("📝 Downloading YouTube captions...");
      console.log("🔗 URL:", youtubeUrl);

      const languages = ["en", "en-US", "en-GB", "auto"];
      let captionsDownloaded = false;

      for (const lang of languages) {
        try {
          const captionArgs = [
            "--write-subs",
            "--sub-langs", lang,
            "--sub-format", "vtt",
            "--skip-download",
            "--no-check-certificate",
            "--geo-bypass",
            "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "--cache-dir", this.cacheDir,
            "--output", captionPath.replace(".vtt", ""),
            youtubeUrl
          ];

          // Try cookies-from-browser first
          try {
            const browserArgs = ["--cookies-from-browser", "chrome", ...captionArgs];
            await this.runYtDlp(browserArgs, 60000);
          } catch (browserError) {
            // Fallback to file cookies if available
            if (fs.existsSync(this.cookiesPath)) {
              captionArgs.splice(0, 0, "--cookies", this.cookiesPath);
            }
            await this.runYtDlp(captionArgs, 60000);
          }

          // Check if caption file was created
          const possibleCaptionFiles = [
            `${captionPath.replace(".vtt", "")}.${lang}.vtt`,
            `${captionPath.replace(".vtt", "")}.en.vtt`,
            `${captionPath.replace(".vtt", "")}.vtt`,
          ];

          for (const possibleFile of possibleCaptionFiles) {
            if (fs.existsSync(possibleFile)) {
              if (possibleFile !== captionPath) {
                fs.renameSync(possibleFile, captionPath);
              }
              captionsDownloaded = true;
              console.log(`✅ Captions downloaded successfully in ${lang}`);
              break;
            }
          }

          if (captionsDownloaded) break;
        } catch (langError) {
          console.log(`⚠️ Failed to download captions in ${lang}:`, langError.message);
          continue;
        }
      }

      if (!captionsDownloaded) {
        throw new Error("No captions available for this video");
      }

      const captions = await this.parseVTTFile(captionPath);

      if (fs.existsSync(captionPath)) {
        fs.unlinkSync(captionPath);
      }

      return captions;
    } catch (error) {
      console.error("❌ Caption download failed:", error);

      if (fs.existsSync(captionPath)) {
        fs.unlinkSync(captionPath);
      }

      throw new Error(`Failed to download captions: ${error.message}`);
    }
  }

  async parseVTTFile(vttPath) {
    try {
      console.log("📖 Parsing VTT caption file...");

      if (!fs.existsSync(vttPath)) {
        throw new Error("VTT file not found");
      }

      const vttContent = fs.readFileSync(vttPath, "utf8");
      const lines = vttContent.split("\n");

      const captions = [];
      let currentCaption = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line || line.startsWith("WEBVTT") || line.startsWith("NOTE")) {
          continue;
        }

        if (line.includes("-->")) {
          const timeMatch = line.match(
            /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/
          );
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
          if (currentCaption.text) {
            currentCaption.text += " ";
          }
          currentCaption.text += line.replace(/<[^>]*>/g, "").trim();
        }
      }

      if (currentCaption && currentCaption.text) {
        captions.push(currentCaption);
      }

      console.log(`✅ Parsed ${captions.length} caption segments`);

      const transcript = {
        text: captions.map((cap) => cap.text).join(" "),
        segments: captions.map((cap) => ({
          start: cap.start,
          end: cap.end,
          text: cap.text,
        })),
      };

      return transcript;
    } catch (error) {
      console.error("❌ Failed to parse VTT file:", error);
      throw error;
    }
  }

  timeToSeconds(timeString) {
    const parts = timeString.split(":");
    const hours = Number.parseInt(parts[0]);
    const minutes = Number.parseInt(parts[1]);
    const secondsParts = parts[2].split(".");
    const seconds = Number.parseInt(secondsParts[0]);
    const milliseconds = Number.parseInt(secondsParts[1]);

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
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
}

export default new VideoService();