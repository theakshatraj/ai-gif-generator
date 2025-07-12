import { exec } from "child_process"
import ffmpeg from "fluent-ffmpeg"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"
import { promisify } from "util"
import youtubeService from "./youtubeService.js" // Import the YouTube service
import ytdl from "ytdl-core"

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

  // Replace the existing downloadYouTubeVideo method
  async downloadYouTubeVideo(youtubeUrl) {
    const videoId = youtubeService.extractVideoId(youtubeUrl)
    if (!videoId) {
      throw new Error("Invalid YouTube URL for download")
    }
    const outputPath = path.join(this.tempDir, `${videoId}.mp4`)

    try {
      console.log(`📥 Attempting to download YouTube video with ytdl-core: ${youtubeUrl}`)

      // Check if the video is downloadable and get info
      const info = await ytdl.getInfo(youtubeUrl)
      const format = ytdl.chooseFormat(info.formats, { quality: "lowestvideo", filter: "videoandaudio" })

      if (!format) {
        throw new Error("No suitable video format found for download.")
      }

      const videoStream = ytdl(youtubeUrl, { format: format })
      const writeStream = fs.createWriteStream(outputPath)

      return new Promise((resolve, reject) => {
        videoStream.pipe(writeStream)

        videoStream.on("progress", (chunkLength, downloaded, total) => {
          const percent = downloaded / total
          console.log(`📥 ytdl-core download progress: ${(percent * 100).toFixed(2)}%`)
        })

        videoStream.on("end", () => {
          if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
            console.log(`✅ YouTube video downloaded successfully to: ${outputPath}`)
            resolve(outputPath)
          } else {
            reject(new Error("Downloaded video file is empty or not found."))
          }
        })

        videoStream.on("error", (error) => {
          console.error(`❌ ytdl-core download failed: ${error.message}`)
          // Specific handling for 403 Forbidden or other access issues
          if (
            error.message.includes("403") ||
            error.message.includes("Forbidden") ||
            error.message.includes("private")
          ) {
            reject(new Error(`Failed to download video: ${error.message}. This video might be restricted or private.`))
          } else {
            reject(error) // Re-throw other errors
          }
        })

        // Set a timeout for the download stream
        const downloadTimeout = setTimeout(() => {
          videoStream.destroy() // Stop the stream
          writeStream.end() // Close the file
          reject(new Error("YouTube video download timed out."))
        }, 120000) // 2 minutes timeout

        videoStream.on("close", () => clearTimeout(downloadTimeout))
      })
    } catch (error) {
      console.error(`❌ Failed to download YouTube video (ytdl-core): ${error.message}`)
      throw error // Re-throw the error for graceful degradation in gifController
    }
  }

  // Modified: Main method to get YouTube data (now handles download failure gracefully)
  async getYouTubeData(youtubeUrl) {
    console.log("🔍 Getting YouTube data...")
    let videoPath = null
    let videoInfo = null
    let transcript = null
    let isDownloadSuccessful = false // New flag

    // Always attempt to get video metadata and transcript first, as they don't require video download
    try {
      // Use youtubeService to get metadata without downloading the video
      videoInfo = await youtubeService.getVideoMetadata(youtubeUrl)
      console.log("✅ YouTube metadata obtained.")
    } catch (metaError) {
      console.warn(`⚠️ Failed to get YouTube metadata: ${metaError.message}. Using default info.`)
      // Fallback to a basic videoInfo if metadata fetching fails
      videoInfo = {
        title: "YouTube Video",
        duration: 60, // Default duration
        views: "Unknown",
        description: "Unable to fetch video details",
        channelTitle: "Unknown Channel",
        publishedAt: new Date().toISOString(),
        width: 640, // Default dimensions
        height: 360,
      }
    }

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

    // Now, attempt to download the video
    try {
      videoPath = await this.downloadYouTubeVideo(youtubeUrl)
      console.log("✅ Actual YouTube video downloaded.")
      isDownloadSuccessful = true
      // If video was downloaded, update videoInfo with actual dimensions if available
      const actualVideoInfo = await this.getVideoInfo(videoPath)
      videoInfo = { ...videoInfo, ...actualVideoInfo } // Merge to get actual dimensions
    } catch (downloadError) {
      console.error(
        `❌ Failed to download YouTube video: ${downloadError.message}. Proceeding with text-only GIF capability.`,
      )
      // Do not re-throw, just set isDownloadSuccessful to false
      isDownloadSuccessful = false
      // Ensure videoPath is null if download failed
      videoPath = null
    }

    return {
      videoPath,
      videoInfo,
      transcript,
      isDownloadSuccessful,
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

  // Create a blank placeholder video of a given duration (kept for other potential uses, but not for YouTube fallback)
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
