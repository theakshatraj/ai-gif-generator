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
    ffmpeg.setFfmpegPath("ffmpeg");   // ✅ Use system ffmpeg
    ffmpeg.setFfprobePath("ffprobe"); // ✅ Use system ffprobe
  }

  ensureDirectories() {
    // Ensure all directories exist
    [this.uploadDir, this.outputDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  async downloadFromYoutube(youtubeUrl) {
    const videoId = uuidv4();
    const videoPath = path.join(this.tempDir, `${videoId}.mp4`);
    
    console.log('⬇️ Downloading video with enhanced parameters...');
    console.log('🔗 URL:', youtubeUrl);

    // Enhanced yt-dlp command with anti-bot measures
    const ytDlpCommand = [
      'yt-dlp',
      '-f', 'worst[ext=mp4]/worst[ext=webm]/worst', // Try lower quality first
      '--user-agent', '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
      '--add-header', 'Accept-Language:en-US,en;q=0.9',
      '--add-header', 'Accept-Encoding:gzip, deflate, br',
      '--add-header', 'DNT:1',
      '--add-header', 'Connection:keep-alive',
      '--add-header', 'Upgrade-Insecure-Requests:1',
      '--extractor-retries', '3',
      '--fragment-retries', '3',
      '--retry-sleep', '2',
      '--no-check-certificate',
      '--geo-bypass',
      '--sleep-interval', '1',
      '--max-sleep-interval', '5',
      '-o', videoPath,
      youtubeUrl
    ];

    // Add delay to avoid rate limiting
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    await delay(2000);

    try {
      const { stdout, stderr } = await execAsync(ytDlpCommand.join(' '), {
        timeout: 120000 // 2 minute timeout
      });
      
      if (stderr && stderr.includes('ERROR')) {
        throw new Error(stderr);
      }
      
      console.log('✅ Video downloaded successfully');
      
    } catch (downloadError) {
      console.log('❌ First download attempt failed, trying alternative...');
      
      // Retry with even simpler parameters
      const fallbackCommand = [
        'yt-dlp',
        '-f', '18/worst', // 360p MP4 or worst available
        '--no-check-certificate',
        '--geo-bypass',
        '--extractor-retries', '1',
        '--socket-timeout', '30',
        '-o', videoPath,
        youtubeUrl
      ];
      
      await delay(5000); // Wait 5 seconds before retry
      
      try {
        await execAsync(fallbackCommand.join(' '), { timeout: 90000 });
        console.log('✅ Video downloaded on retry');
      } catch (retryError) {
        console.error('❌ All download attempts failed:', retryError.message);
        throw new Error(`Failed to download video: ${retryError.message}`);
      }
    }

    // Verify file was created and is not empty
    if (!fs.existsSync(videoPath)) {
      throw new Error("Video file was not created");
    }

    const stats = fs.statSync(videoPath);
    if (stats.size === 0) {
      throw new Error("Downloaded video file is empty");
    }

    console.log(`📁 Video file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    return { 
      videoPath, 
      videoInfo: await this.getVideoInfo(videoPath) 
    };
  }

  async downloadYoutubeCaptions(youtubeUrl) {
    const captionId = uuidv4();
    const captionPath = path.join(this.tempDir, `${captionId}.vtt`);

    try {
      console.log("📝 Downloading YouTube captions...");
      console.log("🔗 URL:", youtubeUrl);

      // Try to download captions in different languages
      const languages = ["en", "en-US", "en-GB", "auto"]; // Try English first, then auto-generated
      let captionsDownloaded = false;

      for (const lang of languages) {
        try {
          // Enhanced caption download command
          const command = [
            'yt-dlp',
            '--write-subs',
            '--sub-langs', `"${lang}"`,
            '--sub-format', 'vtt',
            '--skip-download',
            '--user-agent', '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
            '--no-check-certificate',
            '--geo-bypass',
            '--output', `"${captionPath.replace(".vtt", "")}"`,
            `"${youtubeUrl}"`
          ].join(' ');

          console.log(`🔧 Trying captions in language: ${lang}`);
          console.log(`🔧 Command: ${command}`);

          const { stdout, stderr } = await execAsync(command, { timeout: 60000 });

          if (stdout) {
            console.log("📤 yt-dlp captions stdout:", stdout);
          }

          // Check if caption file was created (yt-dlp adds language suffix)
          const possibleCaptionFiles = [
            `${captionPath.replace(".vtt", "")}.${lang}.vtt`,
            `${captionPath.replace(".vtt", "")}.en.vtt`,
            `${captionPath.replace(".vtt", "")}.vtt`,
          ];

          for (const possibleFile of possibleCaptionFiles) {
            if (fs.existsSync(possibleFile)) {
              // Rename to our expected path
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

      // Parse the VTT file
      const captions = await this.parseVTTFile(captionPath);

      // Clean up caption file
      if (fs.existsSync(captionPath)) {
        fs.unlinkSync(captionPath);
      }

      return captions;
    } catch (error) {
      console.error("❌ Caption download failed:", error);

      // Clean up caption file if it exists
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

        // Skip empty lines and headers
        if (!line || line.startsWith("WEBVTT") || line.startsWith("NOTE")) {
          continue;
        }

        // Check if line contains timestamp
        if (line.includes("-->")) {
          const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
          if (timeMatch) {
            // Save previous caption if exists
            if (currentCaption && currentCaption.text) {
              captions.push(currentCaption);
            }

            // Start new caption
            currentCaption = {
              start: this.timeToSeconds(timeMatch[1]),
              end: this.timeToSeconds(timeMatch[2]),
              text: "",
            };
          }
        } else if (currentCaption && line && !line.match(/^\d+$/)) {
          // This is caption text (skip cue numbers)
          if (currentCaption.text) {
            currentCaption.text += " ";
          }
          // Remove HTML tags and clean text
          currentCaption.text += line.replace(/<[^>]*>/g, "").trim();
        }
      }

      // Add the last caption
      if (currentCaption && currentCaption.text) {
        captions.push(currentCaption);
      }

      console.log(`✅ Parsed ${captions.length} caption segments`);

      // Create transcript format similar to Whisper
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
    // Convert HH:MM:SS.mmm to seconds
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
            duration: Math.round(duration), // Return as number for easier processing
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
      console.log(`📁 Clip path: ${clipPath}`);

      if (!fs.existsSync(videoPath)) {
        reject(new Error("Video file not found"));
        return;
      }

      // Use more robust approach for clip creation
      ffmpeg(videoPath)
        .seekInput(startTime)
        .inputOptions(["-t", duration.toString()])
        .outputOptions([
          "-c:v", "libx264", 
          "-c:a", "aac", 
          "-preset", "fast", 
          "-crf", "28", 
          "-movflags", "+faststart",
          "-avoid_negative_ts", "make_zero" // Fix timing issues
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
}

export default new VideoService();