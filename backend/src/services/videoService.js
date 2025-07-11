import { exec } from "child_process"
import ffmpeg from "fluent-ffmpeg"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"
import { promisify } from "util"
import youtubeService from "./youtubeService.js" // Import the YouTube service

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

  // NEW: Method to download YouTube video
  async downloadYouTubeVideo(youtubeUrl) {
    const videoId = youtubeService.extractVideoId(youtubeUrl)
    if (!videoId) {
      throw new Error("Invalid YouTube URL for download")
    }
    const outputPath = path.join(this.tempDir, `${videoId}.mp4`)

    try {
      console.log(`📥 Attempting to download YouTube video: ${youtubeUrl}`)
      const command = [
        "yt-dlp",
        "--no-cache-dir",
        "--no-check-certificate",
        "--format",
        "worst", // Use 'worst' format for faster download, smaller size
        "--output",
        outputPath,
        "--user-agent",
        '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
        "--geo-bypass",
        youtubeUrl,
      ]
      console.log(`🔧 Running yt-dlp command: ${command.join(" ")}`)
      const { stdout, stderr } = await execAsync(command.join(" "), {
        timeout: 120000, // 2 minutes timeout for download
      })
      if (stdout) console.log("📤 yt-dlp stdout:", stdout)
      if (stderr) console.error("❌ yt-dlp stderr:", stderr) // Log stderr for debugging

      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        console.log(`✅ YouTube video downloaded successfully to: ${outputPath}`)
        return outputPath
      } else {
        throw new Error("Downloaded video file is empty or not found.")
      }
    } catch (error) {
      console.error(`❌ Failed to download YouTube video: ${error.message}`)
      // Specific handling for 403 Forbidden
      if (error.message.includes("HTTP Error 403: Forbidden")) {
        throw new Error(
          `Failed to download video: HTTP Error 403 Forbidden. This video might be restricted or private.`,
        )
      }
      throw error // Re-throw other errors
    }
  }

  // Modified: Main method to get YouTube data (now includes download attempt)
  async getYouTubeData(youtubeUrl) {
    console.log("🔍 Getting YouTube data...")
    let videoPath = null
    let isPlaceholder = false
    let videoInfo = null
    let transcript = null

    try {
      // First, get metadata using yt-dlp or YouTube API
      videoInfo = await youtubeService.getVideoMetadata(youtubeUrl) // This uses yt-dlp --dump-json or YouTube API
      console.log("✅ Initial video metadata obtained.")

      // Attempt to download the video
      try {
        videoPath = await this.downloadYouTubeVideo(youtubeUrl)
        console.log("✅ Actual YouTube video downloaded.")
        // Update videoInfo with actual downloaded video's info if needed (e.g., precise duration, size)
        const actualVideoInfo = await this.getVideoInfo(videoPath)
        videoInfo = { ...videoInfo, ...actualVideoInfo } // Merge info
      } catch (downloadError) {
        console.warn(`⚠️ Failed to download actual YouTube video: ${downloadError.message}. Creating placeholder.`)
        isPlaceholder = true
        // Create a placeholder video if download fails
        const placeholderResult = await this.createPlaceholderVideo(videoInfo.duration, videoInfo.title)
        videoPath = placeholderResult.videoPath
      }

      // Get captions (always attempt, even if video download failed)
      try {
        transcript = await youtubeService.getVideoTranscript(youtubeUrl)
        console.log("✅ YouTube captions extracted successfully.")
      } catch (captionError) {
        console.warn(`⚠️ Failed to get captions: ${captionError.message}. Using basic transcript.`)
        transcript = {
          text: `Video: ${videoInfo.title}. ${videoInfo.description ? videoInfo.description.substring(0, 500) : ""}`,
          segments: [],
        }
      }

      return {
        videoPath,
        videoInfo,
        transcript,
        isPlaceholder,
      }
    } catch (error) {
      console.error("❌ Failed to process YouTube URL:", error)
      throw new Error(`Failed to process YouTube video: ${error.message}`)
    }
  }

  // Extract video ID from YouTube URL (delegated to youtubeService)
  extractVideoId(url) {
    return youtubeService.extractVideoId(url)
  }

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
          const videoStream = metadata.streams.find((s) => s.codec_type === "video")
          // Provide default width/height if not found
          const width = videoStream?.width || 640
          const height = videoStream?.height || 360

          const videoInfo = {
            duration: Math.round(duration),
            size: `${Math.round(size / (1024 * 1024))}MB`,
            bitrate: `${Math.round(bitrate / 1000)}kbps`,
            width, // Add width
            height, // Add height
            title: metadata.format.tags?.title || "Unknown Title", // Try to get title from metadata
            description: metadata.format.tags?.comment || "No description available", // Try to get description
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
          console.log("🔧 Command:", commandLine)
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
      console.log(`📁 Clip path: ${clipPath}`)
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
          console.log("🔧 Command:", commandLine)
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

  // Create a blank placeholder video of a given duration
  async createPlaceholderVideo(durationInSeconds, title = "placeholder") {
    const placeholderId = uuidv4()
    const outputPath = path.join(this.tempDir, `${placeholderId}.mp4`)
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
          console.log("🎬 Starting placeholder video generation...")
          console.log("🔧 FFmpeg command:", cmd)
        })
        .on("end", () => {
          console.log("✅ Placeholder video created successfully")
          resolve({ videoPath: outputPath, placeholderId })
        })
        .on("error", (err) => {
          console.error("❌ Failed to create placeholder video:", err.message)
          reject(err)
        })
      command.run()
    })
  }

  // Utility method to clean up temporary files
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

  // Get video duration quickly without full metadata
  async getVideoDuration(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err)
        } else {
          resolve(metadata.format.duration)
        }
      })
    })
  }

  // Cleanup method
  async cleanup() {
    console.log("🧹 Cleaning up video service...")
    await youtubeService.cleanup()
  }
}

export default new VideoService()
