import { exec } from "child_process"
import ffmpeg from "fluent-ffmpeg"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"
import { promisify } from "util"
import youtubeService from "./youtubeService.js"
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

  // Enhanced YouTube video download with multiple fallback methods
  async downloadYouTubeVideo(youtubeUrl) {
    const videoId = youtubeService.extractVideoId(youtubeUrl)
    if (!videoId) {
      throw new Error("Invalid YouTube URL for download")
    }
    const outputPath = path.join(this.tempDir, `${videoId}.mp4`)

    // Method 1: Try ytdl-core first
    try {
      console.log(`📥 Attempting to download YouTube video with ytdl-core: ${youtubeUrl}`)
      
      const info = await ytdl.getInfo(youtubeUrl)
      
      // Try different format selection strategies
      let format = null
      
      // Strategy 1: Get best video+audio format
      format = ytdl.chooseFormat(info.formats, { 
        quality: 'highest', 
        filter: format => format.hasVideo && format.hasAudio && format.container === 'mp4'
      })
      
      // Strategy 2: If no mp4 with video+audio, try any video+audio
      if (!format) {
        format = ytdl.chooseFormat(info.formats, { 
          quality: 'highest', 
          filter: format => format.hasVideo && format.hasAudio
        })
      }
      
      // Strategy 3: If still no format, try video only
      if (!format) {
        format = ytdl.chooseFormat(info.formats, { 
          quality: 'highest', 
          filter: 'videoonly'
        })
      }

      if (!format) {
        throw new Error("No suitable video format found")
      }

      console.log(`📥 ytdl-core: Selected format: ${format.qualityLabel || format.itag} (${format.container})`)

      return new Promise((resolve, reject) => {
        const videoStream = ytdl(youtubeUrl, { format: format })
        const writeStream = fs.createWriteStream(outputPath)

        videoStream.pipe(writeStream)

        videoStream.on("progress", (chunkLength, downloaded, total) => {
          const percent = downloaded / total
          console.log(`📥 ytdl-core download progress: ${(percent * 100).toFixed(2)}%`)
        })

        videoStream.on("end", () => {
          if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
            console.log(`✅ YouTube video downloaded successfully with ytdl-core: ${outputPath}`)
            resolve(outputPath)
          } else {
            reject(new Error("Downloaded video file is empty"))
          }
        })

        videoStream.on("error", (error) => {
          console.error(`❌ ytdl-core download error: ${error.message}`)
          reject(error)
        })

        // 3 minute timeout
        const downloadTimeout = setTimeout(() => {
          videoStream.destroy()
          writeStream.end()
          reject(new Error("Download timeout"))
        }, 180000)

        videoStream.on("close", () => clearTimeout(downloadTimeout))
      })
    } catch (ytdlError) {
      console.error(`❌ ytdl-core failed: ${ytdlError.message}`)
      
      // Method 2: Fallback to yt-dlp
      try {
        console.log(`📥 Falling back to yt-dlp for: ${youtubeUrl}`)
        
        const command = [
          "yt-dlp",
          "--cache-dir", this.cacheDir,
          "--format", "best[ext=mp4][height<=720]/best[ext=mp4]/best[height<=720]/best",
          "--output", outputPath,
          "--no-check-certificate",
          "--geo-bypass",
          "--user-agent", '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
          "--extractor-retries", "3",
          "--fragment-retries", "3",
          "--retry-sleep", "1",
          youtubeUrl
        ]

        console.log(`🔧 yt-dlp command: ${command.join(" ")}`)
        
        const { stdout, stderr } = await execAsync(command.join(" "), {
          timeout: 300000 // 5 minutes
        })

        if (stdout) console.log("📤 yt-dlp stdout:", stdout)
        if (stderr) console.log("📤 yt-dlp stderr:", stderr)

        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
          console.log(`✅ YouTube video downloaded successfully with yt-dlp: ${outputPath}`)
          return outputPath
        } else {
          throw new Error("yt-dlp download failed - no output file created")
        }
      } catch (ytdlpError) {
        console.error(`❌ yt-dlp also failed: ${ytdlpError.message}`)
        
        // Method 3: Try different yt-dlp format options
        try {
          console.log(`📥 Trying yt-dlp with different format options...`)
          
          const fallbackCommand = [
            "yt-dlp",
            "--cache-dir", this.cacheDir,
            "--format", "worst[ext=mp4]/worst",
            "--output", outputPath,
            "--no-check-certificate",
            "--geo-bypass",
            "--user-agent", '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
            youtubeUrl
          ]

          await execAsync(fallbackCommand.join(" "), { timeout: 300000 })

          if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
            console.log(`✅ YouTube video downloaded with fallback yt-dlp method: ${outputPath}`)
            return outputPath
          } else {
            throw new Error("All download methods failed")
          }
        } catch (finalError) {
          console.error(`❌ All download methods failed: ${finalError.message}`)
          throw new Error(`Failed to download YouTube video: ${finalError.message}`)
        }
      }
    }
  }

  // Modified: Main method to get YouTube data (now handles download failure gracefully)
  async getYouTubeData(youtubeUrl) {
    console.log("🔍 Getting YouTube data...")
    let videoPath = null
    let videoInfo = null
    let transcript = null
    let isDownloadSuccessful = false

    // Always attempt to get video metadata and transcript first
    try {
      videoInfo = await youtubeService.getVideoMetadata(youtubeUrl)
      console.log("✅ YouTube metadata obtained.")
    } catch (metaError) {
      console.warn(`⚠️ Failed to get YouTube metadata: ${metaError.message}. Using default info.`)
      videoInfo = {
        title: "YouTube Video",
        duration: 60,
        views: "Unknown",
        description: "Unable to fetch video details",
        channelTitle: "Unknown Channel",
        publishedAt: new Date().toISOString(),
        width: 640,
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

    // Now, attempt to download the video with enhanced methods
    try {
      videoPath = await this.downloadYouTubeVideo(youtubeUrl)
      console.log("✅ YouTube video downloaded successfully.")
      isDownloadSuccessful = true
      
      // Update videoInfo with actual dimensions from downloaded video
      try {
        const actualVideoInfo = await this.getVideoInfo(videoPath)
        videoInfo = { ...videoInfo, ...actualVideoInfo }
      } catch (infoError) {
        console.warn("⚠️ Could not get video info from downloaded file:", infoError.message)
      }
    } catch (downloadError) {
      console.error(`❌ Failed to download YouTube video: ${downloadError.message}`)
      isDownloadSuccessful = false
      videoPath = null
      
      // This is critical - if we can't download the video, we should throw an error
      // instead of silently continuing with text-only GIFs
      throw new Error(`Unable to download YouTube video: ${downloadError.message}. Please try a different video or check if the video is publicly accessible.`)
    }

    console.log(`DEBUG (videoService.getYouTubeData): videoPath = ${videoPath}`)
    console.log(`DEBUG (videoService.getYouTubeData): isDownloadSuccessful = ${isDownloadSuccessful}`)

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
          const width = videoStream?.width || 640
          const height = videoStream?.height || 360
          const videoInfo = {
            duration: Math.round(duration),
            size: `${Math.round(size / (1024 * 1024))}MB`,
            bitrate: `${Math.round(bitrate / 1000)}kbps`,
            width,
            height,
            title: metadata.format.tags?.title || "Unknown Title",
            description: metadata.format.tags?.comment || "No description available",
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

  async cleanup() {
    console.log("🧹 Cleaning up video service...")
    await youtubeService.cleanup()
  }
}

export default new VideoService()