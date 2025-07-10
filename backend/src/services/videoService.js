import { exec } from "child_process";
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

    this.setupFFmpeg();
    this.ensureDirectories();
  }

  setupFFmpeg() {
    ffmpeg.setFfmpegPath("ffmpeg");
    ffmpeg.setFfprobePath("ffprobe");
  }

  ensureDirectories() {
    [this.uploadDir, this.outputDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  async updateYtDlp() {
    try {
      console.log('🔄 Updating yt-dlp to latest version...');
      await execAsync('pip install -U yt-dlp', { timeout: 60000 });
      console.log('✅ yt-dlp updated successfully');
    } catch (error) {
      console.warn('⚠️ Failed to update yt-dlp:', error.message);
    }
  }

  async downloadFromYoutube(youtubeUrl) {
    const videoId = uuidv4();
    const videoPath = path.join(this.tempDir, `${videoId}.mp4`);
    
    console.log('⬇️ Starting YouTube download with enhanced anti-detection...');
    console.log('🔗 URL:', youtubeUrl);

    // First, try to update yt-dlp
    await this.updateYtDlp();

    // Enhanced strategies with better anti-detection
    const downloadStrategies = [
      {
        name: 'Enhanced Anti-Detection',
        command: this.buildEnhancedCommand(videoPath, youtubeUrl),
        timeout: 180000 // 3 minutes
      },
      {
        name: 'Cookie-based Download',
        command: this.buildCookieCommand(videoPath, youtubeUrl),
        timeout: 150000
      },
      {
        name: 'Proxy-like Headers',
        command: this.buildProxyCommand(videoPath, youtubeUrl),
        timeout: 120000
      },
      {
        name: 'Mobile User Agent',
        command: this.buildMobileCommand(videoPath, youtubeUrl),
        timeout: 120000
      },
      {
        name: 'Minimal Approach',
        command: this.buildMinimalCommand(videoPath, youtubeUrl),
        timeout: 90000
      }
    ];

    for (const [index, strategy] of downloadStrategies.entries()) {
      try {
        console.log(`🔄 Attempting strategy ${index + 1}/${downloadStrategies.length}: ${strategy.name}`);
        
        // Add progressive delays between attempts
        if (index > 0) {
          const delay = Math.min(index * 5000, 30000); // Max 30 second delay
          console.log(`⏱️ Waiting ${delay/1000}s before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await this.executeDownloadCommand(strategy.command, strategy.timeout);
        
        if (await this.validateDownloadedFile(videoPath)) {
          console.log(`✅ Download successful with ${strategy.name}`);
          return { 
            videoPath, 
            videoInfo: await this.getVideoInfo(videoPath) 
          };
        } else {
          throw new Error('Downloaded file validation failed');
        }
        
      } catch (error) {
        console.log(`❌ Strategy ${index + 1} failed:`, error.message);
        await this.cleanupFile(videoPath);
        
        // If this is the last strategy, throw the error
        if (index === downloadStrategies.length - 1) {
          throw new Error(`All download strategies failed. Last error: ${error.message}`);
        }
      }
    }
  }

  buildEnhancedCommand(videoPath, youtubeUrl) {
    return `yt-dlp \\
      --format "best[height<=720][ext=mp4]/best[height<=480][ext=mp4]/worst[ext=mp4]/best[ext=mp4]/worst" \\
      --user-agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \\
      --add-header "Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8" \\
      --add-header "Accept-Language:en-US,en;q=0.5" \\
      --add-header "Accept-Encoding:gzip, deflate, br" \\
      --add-header "DNT:1" \\
      --add-header "Connection:keep-alive" \\
      --add-header "Upgrade-Insecure-Requests:1" \\
      --add-header "Sec-Fetch-Dest:document" \\
      --add-header "Sec-Fetch-Mode:navigate" \\
      --add-header "Sec-Fetch-Site:none" \\
      --add-header "Sec-Fetch-User:?1" \\
      --referer "https://www.youtube.com/" \\
      --extractor-retries 5 \\
      --fragment-retries 5 \\
      --retry-sleep 3 \\
      --no-check-certificate \\
      --geo-bypass \\
      --sleep-interval 2 \\
      --max-sleep-interval 8 \\
      --cache-dir "/tmp/yt-dlp-cache" \\
      --no-warnings \\
      --ignore-errors \\
      --max-filesize 150M \\
      --socket-timeout 60 \\
      --http-chunk-size 10M \\
      --output "${videoPath}" \\
      "${youtubeUrl}"`;
  }

  buildCookieCommand(videoPath, youtubeUrl) {
    return `yt-dlp \\
      --format "best[height<=720]/best[height<=480]/worst[ext=mp4]/worst" \\
      --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \\
      --add-header "Accept:*/*" \\
      --add-header "Accept-Language:en-US,en;q=0.9" \\
      --add-header "Cache-Control:no-cache" \\
      --add-header "Pragma:no-cache" \\
      --extractor-retries 3 \\
      --fragment-retries 3 \\
      --retry-sleep 5 \\
      --no-check-certificate \\
      --geo-bypass \\
      --sleep-interval 3 \\
      --max-sleep-interval 10 \\
      --cache-dir "/tmp/yt-dlp-cache" \\
      --no-warnings \\
      --ignore-errors \\
      --max-filesize 100M \\
      --socket-timeout 45 \\
      --output "${videoPath}" \\
      "${youtubeUrl}"`;
  }

  buildProxyCommand(videoPath, youtubeUrl) {
    return `yt-dlp \\
      --format "worst[ext=mp4]/worst[ext=webm]/worst" \\
      --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \\
      --add-header "X-Forwarded-For:8.8.8.8" \\
      --add-header "X-Real-IP:8.8.8.8" \\
      --extractor-retries 2 \\
      --fragment-retries 2 \\
      --retry-sleep 2 \\
      --no-check-certificate \\
      --geo-bypass \\
      --cache-dir "/tmp/yt-dlp-cache" \\
      --no-warnings \\
      --ignore-errors \\
      --max-filesize 80M \\
      --socket-timeout 30 \\
      --output "${videoPath}" \\
      "${youtubeUrl}"`;
  }

  buildMobileCommand(videoPath, youtubeUrl) {
    return `yt-dlp \\
      --format "worst[ext=mp4]/worst" \\
      --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1" \\
      --add-header "Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \\
      --add-header "Accept-Language:en-US,en;q=0.5" \\
      --extractor-retries 2 \\
      --no-check-certificate \\
      --geo-bypass \\
      --cache-dir "/tmp/yt-dlp-cache" \\
      --no-warnings \\
      --ignore-errors \\
      --max-filesize 50M \\
      --socket-timeout 25 \\
      --output "${videoPath}" \\
      "${youtubeUrl}"`;
  }

  buildMinimalCommand(videoPath, youtubeUrl) {
    return `yt-dlp \\
      --format "worst" \\
      --no-check-certificate \\
      --geo-bypass \\
      --cache-dir "/tmp/yt-dlp-cache" \\
      --no-warnings \\
      --ignore-errors \\
      --output "${videoPath}" \\
      "${youtubeUrl}"`;
  }

  async executeDownloadCommand(command, timeout) {
    const env = {
      ...process.env,
      TMPDIR: '/tmp',
      YT_DLP_CACHE_DIR: '/tmp/yt-dlp-cache',
      PYTHONPATH: '/usr/local/lib/python3.*/site-packages'
    };

    return await execAsync(command, { timeout, env });
  }

  async validateDownloadedFile(videoPath) {
    try {
      if (!fs.existsSync(videoPath)) {
        return false;
      }

      const stats = fs.statSync(videoPath);
      if (stats.size === 0) {
        return false;
      }

      // Additional validation: check if it's a valid video file
      try {
        await this.getVideoInfo(videoPath);
        console.log(`✅ Video file validated: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        return true;
      } catch (error) {
        console.log(`❌ Video file validation failed: ${error.message}`);
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  async cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to cleanup ${filePath}:`, error.message);
    }
  }

  async downloadYoutubeCaptions(youtubeUrl) {
    const captionId = uuidv4();
    const captionPath = path.join(this.tempDir, `${captionId}.vtt`);

    try {
      console.log("📝 Downloading YouTube captions...");
      
      // Enhanced caption download strategies
      const captionStrategies = [
        {
          name: 'Auto-generated captions',
          langs: ['en', 'en-US', 'en-GB', 'en-auto', 'auto']
        },
        {
          name: 'Manual captions',
          langs: ['en', 'en-US', 'en-GB']
        },
        {
          name: 'Any available captions',
          langs: ['*']
        }
      ];

      for (const strategy of captionStrategies) {
        for (const lang of strategy.langs) {
          try {
            console.log(`🔧 Trying ${strategy.name} in language: ${lang}`);
            
            const command = `yt-dlp \\
              --write-auto-subs \\
              --write-subs \\
              --sub-langs "${lang}" \\
              --sub-format vtt \\
              --skip-download \\
              --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \\
              --no-check-certificate \\
              --geo-bypass \\
              --cache-dir "/tmp/yt-dlp-cache" \\
              --no-warnings \\
              --ignore-errors \\
              --output "${captionPath.replace(".vtt", "")}" \\
              "${youtubeUrl}"`;

            await execAsync(command, { 
              timeout: 60000,
              env: {
                ...process.env,
                TMPDIR: '/tmp',
                YT_DLP_CACHE_DIR: '/tmp/yt-dlp-cache'
              }
            });

            // Check for generated caption files
            const possibleFiles = [
              `${captionPath.replace(".vtt", "")}.${lang}.vtt`,
              `${captionPath.replace(".vtt", "")}.en.vtt`,
              `${captionPath.replace(".vtt", "")}.en-US.vtt`,
              `${captionPath.replace(".vtt", "")}.vtt`
            ];

            for (const file of possibleFiles) {
              if (fs.existsSync(file)) {
                if (file !== captionPath) {
                  fs.renameSync(file, captionPath);
                }
                console.log(`✅ Captions downloaded successfully: ${strategy.name} (${lang})`);
                const captions = await this.parseVTTFile(captionPath);
                await this.cleanupFile(captionPath);
                return captions;
              }
            }
          } catch (error) {
            console.log(`⚠️ Caption attempt failed for ${lang}:`, error.message);
            continue;
          }
        }
      }

      throw new Error("No captions available for this video");
    } catch (error) {
      console.error("❌ Caption download failed:", error);
      await this.cleanupFile(captionPath);
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
            console.log(`🎵 Audio extraction progress: ${Math.round(progress.percent)}%`);
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

      console.log(`✂️ Creating video clip: ${startTime}s - ${startTime + duration}s`);

      if (!fs.existsSync(videoPath)) {
        reject(new Error("Video file not found"));
        return;
      }

      ffmpeg(videoPath)
        .seekInput(startTime)
        .inputOptions(["-t", duration.toString()])
        .outputOptions([
          "-c:v", "libx264", 
          "-c:a", "aac", 
          "-preset", "fast", 
          "-crf", "28", 
          "-movflags", "+faststart",
          "-avoid_negative_ts", "make_zero"
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