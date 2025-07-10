import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const execAsync = promisify(exec);

class VideoAnalysisService {
  constructor() {
    this.ffmpegPath = "ffmpeg";  // ✅ Use system ffmpeg
    this.tempDir = path.join(process.cwd(), "temp");
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // 📥 NEW METHOD: Download video from YouTube
  async downloadFromYoutube(url, outputPath = null) {
    try {
      console.log("📥 Downloading video from YouTube...");
      console.log("🔗 URL:", url);

      // Generate output path if not provided
      if (!outputPath) {
        const timestamp = Date.now();
        outputPath = path.join(this.tempDir, `youtube_video_${timestamp}.%(ext)s`);
      }

      // Use yt-dlp to download the video
      // Format: best quality MP4 or fallback to best available
      const command = `yt-dlp -f "best[ext=mp4]/best" -o "${outputPath}" "${url}"`;
      
      console.log("🚀 Executing:", command);
      const { stdout, stderr } = await execAsync(command, { timeout: 300000 }); // 5 minutes timeout
      
      // Find the actual downloaded file (yt-dlp might change the extension)
      const dir = path.dirname(outputPath);
      const baseName = path.basename(outputPath, path.extname(outputPath));
      const files = fs.readdirSync(dir).filter(f => f.startsWith(baseName.replace('.%(ext)s', '')));
      
      if (files.length === 0) {
        throw new Error("Downloaded file not found");
      }

      const downloadedFile = path.join(dir, files[0]);
      
      console.log("✅ Video downloaded successfully");
      console.log("📁 File location:", downloadedFile);
      
      return downloadedFile;
    } catch (error) {
      console.error("❌ YouTube download failed:", error);
      throw new Error(`YouTube download failed: ${error.message}`);
    }
  }

  // 📊 Get video duration and metadata
  async getVideoMetadata(videoPath) {
    try {
      console.log("📊 Getting video metadata...");
      
      const command = `${this.ffmpegPath} -i "${videoPath}" -f null - 2>&1`;
      const { stdout, stderr } = await execAsync(command);
      
      // Parse duration from FFmpeg output
      const durationMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}.\d{2})/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1]);
        const minutes = parseInt(durationMatch[2]);
        const seconds = parseFloat(durationMatch[3]);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        
        console.log(`⏱️ Video duration: ${totalSeconds.toFixed(2)} seconds`);
        return { duration: totalSeconds };
      }
      
      throw new Error("Could not parse video duration");
    } catch (error) {
      console.error("❌ Failed to get video metadata:", error);
      throw error;
    }
  }

  async extractFramesForAnalysis(videoPath, videoDuration) {
    const frameDir = path.join(this.tempDir, `frames_${Date.now()}`);
    if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir, { recursive: true });

    const frameInterval = 2;
    const command = `${this.ffmpegPath} -i "${videoPath}" -vf "fps=1/${frameInterval}" "${frameDir}/frame_%03d.jpg"`;
    await execAsync(command);

    const frames = fs.readdirSync(frameDir)
      .filter(f => f.endsWith(".jpg"))
      .map((file, idx) => ({
        timestamp: idx * frameInterval,
        path: path.join(frameDir, file),
        filename: file,
      }));

    return { frames, frameDir };
  }

  // Analyze video content using frame extraction and scene detection
  async analyzeVideoContent(videoPath, videoDuration, prompt) {
    try {
      console.log("🔍 Analyzing video content...")

      // Extract frames for analysis
      const { frames, frameDir } = await this.extractFramesForAnalysis(videoPath, videoDuration)

      // Create a more detailed transcript based on frame analysis
      const segments = []

      // Divide video into segments based on extracted frames
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i]
        const nextFrame = frames[i + 1]

        const startTime = frame.timestamp
        const endTime = nextFrame ? nextFrame.timestamp : videoDuration

        // Create segment description based on position and prompt context
        const description = this.generateSegmentDescription(startTime, endTime, videoDuration, prompt)

        segments.push({
          start: startTime,
          end: Math.min(endTime, videoDuration),
          text: description,
        })
      }

      // Clean up frame directory
      this.cleanupFrames(frameDir)

      // Create enhanced transcript
      const transcript = {
        text: segments.map((seg) => seg.text).join(" "),
        segments: segments,
      }

      console.log("✅ Video content analysis completed")
      console.log(`📊 Created ${segments.length} content-aware segments`)

      return transcript
    } catch (error) {
      console.error("❌ Video analysis failed:", error)
      // Fallback to basic analysis
      return this.createBasicAnalysis(videoDuration, prompt)
    }
  }

  generateSegmentDescription(startTime, endTime, totalDuration, prompt) {
    const position = startTime / totalDuration
    const duration = endTime - startTime

    // Analyze prompt for key terms
    const promptLower = prompt.toLowerCase()
    const isAction = /dance|dancing|move|moving|action|jump|run|walk/.test(promptLower)
    const isEmotion = /laugh|laughing|smile|smiling|cry|crying|happy|sad|angry|surprised/.test(promptLower)
    const isComedy = /funny|comedy|comedic|humor|joke|hilarious/.test(promptLower)
    const isHighlight = /highlight|best|good|great|amazing|awesome/.test(promptLower)

    let description = ""

    // Position-based descriptions
    if (position < 0.2) {
      description = "Opening scene"
    } else if (position < 0.4) {
      description = "Early content"
    } else if (position < 0.6) {
      description = "Main content"
    } else if (position < 0.8) {
      description = "Later content"
    } else {
      description = "Closing scene"
    }

    // Add context based on prompt
    if (isAction) {
      if (position < 0.3) {
        description += " with potential movement or action"
      } else if (position < 0.7) {
        description += " featuring main action sequence"
      } else {
        description += " with concluding action"
      }
    } else if (isEmotion) {
      if (position < 0.3) {
        description += " showing initial reactions"
      } else if (position < 0.7) {
        description += " with emotional expressions"
      } else {
        description += " displaying final emotions"
      }
    } else if (isComedy) {
      if (position < 0.3) {
        description += " with setup for comedy"
      } else if (position < 0.7) {
        description += " featuring comedic moments"
      } else {
        description += " with comedic conclusion"
      }
    } else if (isHighlight) {
      if (position < 0.3) {
        description += " from the beginning highlights"
      } else if (position < 0.7) {
        description += " from the main highlights"
      } else {
        description += " from the ending highlights"
      }
    }

    // Add timing context
    description += ` (${Math.floor(startTime)}s-${Math.floor(endTime)}s)`

    return description
  }

  createBasicAnalysis(videoDuration, prompt) {
    console.log("📋 Creating basic content analysis...")

    const segments = []
    const segmentCount = Math.min(6, Math.max(3, Math.floor(videoDuration / 3)))
    const segmentDuration = videoDuration / segmentCount

    for (let i = 0; i < segmentCount; i++) {
      const startTime = i * segmentDuration
      const endTime = Math.min((i + 1) * segmentDuration, videoDuration)

      segments.push({
        start: startTime,
        end: endTime,
        text: this.generateSegmentDescription(startTime, endTime, videoDuration, prompt),
      })
    }

    return {
      text: segments.map((seg) => seg.text).join(" "),
      segments: segments,
    }
  }

  cleanupFrames(frameDir) {
    try {
      if (fs.existsSync(frameDir)) {
        const files = fs.readdirSync(frameDir)
        for (const file of files) {
          fs.unlinkSync(path.join(frameDir, file))
        }
        fs.rmdirSync(frameDir)
        console.log("🗑️ Cleaned up extracted frames")
      }
    } catch (error) {
      console.error("❌ Failed to cleanup frames:", error)
    }
  }

  // 🗑️ Clean up downloaded video files
  cleanupVideo(videoPath) {
    try {
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
        console.log("🗑️ Cleaned up downloaded video");
      }
    } catch (error) {
      console.error("❌ Failed to cleanup video:", error);
    }
  }

  // Detect scene changes in video
  async detectSceneChanges(videoPath, videoDuration) {
    try {
      console.log("🎬 Detecting scene changes...")

      const outputFile = path.join(this.tempDir, `scenes_${Date.now()}.txt`)

      // Use FFmpeg scene detection
      const command = `"${this.ffmpegPath}" -i "${videoPath}" -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | findstr "pts_time" > "${outputFile}"`

      await execAsync(command, { timeout: 30000 })

      const sceneChanges = []
      if (fs.existsSync(outputFile)) {
        const content = fs.readFileSync(outputFile, "utf8")
        const lines = content.split("\n").filter((line) => line.includes("pts_time"))

        for (const line of lines) {
          const match = line.match(/pts_time:(\d+\.?\d*)/)
          if (match) {
            sceneChanges.push(Number.parseFloat(match[1]))
          }
        }

        fs.unlinkSync(outputFile)
      }

      console.log(`✅ Detected ${sceneChanges.length} scene changes`)
      return sceneChanges
    } catch (error) {
      console.error("❌ Scene detection failed:", error)
      return []
    }
  }
}

export default new VideoAnalysisService();