import ffmpeg from "fluent-ffmpeg"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"
import { promisify } from "util"
import youtubeService from "./youtubeService.js"
const { exec } = require("child_process")
const execAsync = promisify(exec)

class VideoService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), "uploads")
    this.outputDir = path.join(process.cwd(), "output")
    this.tempDir = path.join(process.cwd(), "temp")
    this.cacheDir = path.join(process.cwd(), "cache")

    this.setupFFmpeg()
    this.ensureDirectories()
  }

  setupFFmpeg() {
    ffmpeg.setFfmpegPath("ffmpeg")
    ffmpeg.setFfprobePath("ffprobe")
  }

  ensureDirectories() {
    ;[this.uploadDir, this.outputDir, this.tempDir, this.cacheDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        console.log(`📁 Created directory: ${dir}`)
      }
    })
  }

  // New method: Get YouTube data without downloading video
  async getYouTubeData(youtubeUrl) {
    try {
      console.log("📊 Extracting YouTube data...")

      // Get transcript and metadata
      const [transcript, metadata] = await Promise.all([
        youtubeService.getVideoTranscript(youtubeUrl),
        youtubeService.getVideoMetadata(youtubeUrl),
      ])

      console.log("✅ YouTube data extracted successfully")
      console.log(`📝 Transcript: ${transcript.text.substring(0, 200)}...`)
      console.log(`📊 Video: ${metadata.title} (${metadata.duration}s)`)

      return {
        transcript,
        videoInfo: {
          duration: metadata.duration,
          title: metadata.title,
          description: metadata.description,
          videoId: metadata.videoId,
        },
      }
    } catch (error) {
      console.error("❌ Failed to extract YouTube data:", error)
      throw error
    }
  }

  // Alternative method: Create placeholder video for GIF generation
  async createPlaceholderVideo(duration, title = "YouTube Video") {
    const videoId = uuidv4()
    const videoPath = path.join(this.tempDir, `${videoId}.mp4`)

    console.log(`🎬 Creating placeholder video (${duration}s)...`)

    return new Promise((resolve, reject) => {
      // Create a simple colored video with text overlay
      ffmpeg()
        .input(`color=c=blue:size=1280x720:duration=${duration}:rate=30`)
        .inputFormat("lavfi")
        .videoFilters([`drawtext=text='${title}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`])
        .outputOptions(["-c:v", "libx264", "-preset", "fast", "-crf", "28", "-movflags", "+faststart"])
        .output(videoPath)
        .on("start", (commandLine) => {
          console.log("🎬 Placeholder video creation started")
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            console.log(`🎬 Progress: ${Math.round(progress.percent)}%`)
          }
        })
        .on("end", () => {
          console.log("✅ Placeholder video created successfully")
          resolve({
            videoPath,
            videoInfo: {
              duration: duration,
              size: "1MB",
              bitrate: "500kbps",
            },
          })
        })
        .on("error", (err) => {
          console.error("❌ Placeholder video creation failed:", err)
          reject(err)
        })
        .run()
    })
  }

  // Keep existing methods for uploaded files
  async getVideoInfo(videoPath) {
    return new Promise((resolve, reject) => {
      console.log("📊 Getting video information...")
      if (!fs.existsSync(videoPath)) {
        reject(new Error("Video file not found"))
        return
      }

      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.error("❌ FFprobe error:", err)
          reject(err)
        } else {
          const duration = metadata.format.duration
          const size = metadata.format.size
          const bitrate = metadata.format.bit_rate

          const videoInfo = {
            duration: Math.round(duration),
            size: `${Math.round(size / (1024 * 1024))}MB`,
            bitrate: `${Math.round(bitrate / 1000)}kbps`,
          }

          console.log("📊 Video info:", videoInfo)
          resolve(videoInfo)
        }
      })
    })
  }

  async extractAudio(videoPath) {
    return new Promise((resolve, reject) => {
      const audioId = uuidv4()
      const audioPath = path.join(this.tempDir, `${audioId}.mp3`)

      console.log("🎵 Extracting audio from video...")

      if (!fs.existsSync(videoPath)) {
        reject(new Error("Video file not found"))
        return
      }

      ffmpeg(videoPath)
        .output(audioPath)
        .audioCodec("libmp3lame")
        .audioFrequency(16000)
        .audioChannels(1)
        .audioBitrate("64k")
        .noVideo()
        .on("start", (commandLine) => {
          console.log("🎵 Audio extraction started")
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            console.log(`🎵 Audio extraction progress: ${Math.round(progress.percent)}%`)
          }
        })
        .on("end", () => {
          console.log("✅ Audio extracted successfully")
          resolve(audioPath)
        })
        .on("error", (err) => {
          console.error("❌ Audio extraction failed:", err)
          reject(err)
        })
        .run()
    })
  }

  async createClip(videoPath, startTime, duration) {
    return new Promise((resolve, reject) => {
      const clipId = uuidv4()
      const clipPath = path.join(this.tempDir, `${clipId}.mp4`)

      console.log(`✂️ Creating video clip: ${startTime}s - ${startTime + duration}s`)

      if (!fs.existsSync(videoPath)) {
        reject(new Error("Video file not found"))
        return
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
          console.log("✂️ Video clip creation started")
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            console.log(`✂️ Clip progress: ${Math.round(progress.percent)}%`)
          }
        })
        .on("end", () => {
          console.log("✅ Video clip created successfully")
          resolve(clipPath)
        })
        .on("error", (err) => {
          console.error("❌ Video clip creation failed:", err)
          reject(err)
        })
        .run()
    })
  }

  async cleanupTempFiles(filePaths) {
    const cleanupPromises = filePaths.map(async (filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
          console.log(`🗑️ Cleaned up: ${path.basename(filePath)}`)
        }
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup ${filePath}:`, error.message)
      }
    })

    await Promise.all(cleanupPromises)
  }

  async cleanup() {
    await youtubeService.cleanup()
  }
}

export default new VideoService()
