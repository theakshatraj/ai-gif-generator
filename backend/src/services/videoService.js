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
      
      // Method 2: Try yt-dlp with enhanced options
      try {
        console.log(`📥 Falling back to yt-dlp for: ${youtubeUrl}`)
        
        const ytdlpStrategies = [
          // Strategy 1: Web client with modern headers
          {
            name: "web-client",
            command: [
              "yt-dlp",
              "--cache-dir", this.cacheDir,
              "--format", "best[height<=720][ext=mp4]/best[ext=mp4]/best[height<=720]/best",
              "--output", outputPath,
              "--extractor-args", "youtube:player_client=web,mweb",
              "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "--referer", "https://www.youtube.com/",
              "--add-header", "Accept-Language:en-US,en;q=0.9",
              "--add-header", "Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "--retry-sleep", "3",
              "--retries", "5",
              "--fragment-retries", "5",
              "--no-check-certificate",
              "--geo-bypass",
              "--no-warnings",
              youtubeUrl
            ]
          },
          // Strategy 2: Android client
          {
            name: "android-client",
            command: [
              "yt-dlp",
              "--cache-dir", this.cacheDir,
              "--format", "best[height<=720][ext=mp4]/best[ext=mp4]/best",
              "--output", outputPath,
              "--extractor-args", "youtube:player_client=android",
              "--user-agent", "com.google.android.youtube/17.36.4 (Linux; U; Android 12; GB) gzip",
              "--retry-sleep", "5",
              "--retries", "3",
              "--fragment-retries", "3",
              "--no-check-certificate",
              "--geo-bypass",
              "--no-warnings",
              youtubeUrl
            ]
          },
          // Strategy 3: iOS client
          {
            name: "ios-client",
            command: [
              "yt-dlp",
              "--cache-dir", this.cacheDir,
              "--format", "best[height<=480][ext=mp4]/best[ext=mp4]/best",
              "--output", outputPath,
              "--extractor-args", "youtube:player_client=ios",
              "--user-agent", "com.google.ios.youtube/17.36.4 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)",
              "--retry-sleep", "3",
              "--retries", "3",
              "--no-check-certificate",
              "--geo-bypass",
              "--no-warnings",
              youtubeUrl
            ]
          },
          // Strategy 4: Worst quality fallback
          {
            name: "worst-quality",
            command: [
              "yt-dlp",
              "--cache-dir", this.cacheDir,
              "--format", "worst[ext=mp4]/worst",
              "--output", outputPath,
              "--extractor-args", "youtube:player_client=web",
              "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "--retry-sleep", "2",
              "--retries", "2",
              "--no-check-certificate",
              "--geo-bypass",
              "--no-warnings",
              youtubeUrl
            ]
          }
        ]

        for (const strategy of ytdlpStrategies) {
          try {
            console.log(`🔧 Trying yt-dlp strategy: ${strategy.name}`)
            console.log(`🔧 yt-dlp command: ${strategy.command.join(" ")}`)
            
            const { stdout, stderr } = await execAsync(strategy.command.join(" "), {
              timeout: 300000 // 5 minutes
            })

            if (stdout) console.log(`📤 yt-dlp stdout (${strategy.name}):`, stdout.substring(0, 500))
            if (stderr) console.log(`📤 yt-dlp stderr (${strategy.name}):`, stderr.substring(0, 500))

            // Check if file exists and has content
            if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
              console.log(`✅ YouTube video downloaded successfully with yt-dlp (${strategy.name}): ${outputPath}`)
              return outputPath
            } else {
              console.warn(`⚠️ yt-dlp strategy ${strategy.name} completed but no valid file found`)
            }
          } catch (strategyError) {
            console.warn(`⚠️ yt-dlp strategy ${strategy.name} failed: ${strategyError.message}`)
            
            // Clean up any partial files
            if (fs.existsSync(outputPath)) {
              try {
                fs.unlinkSync(outputPath)
              } catch (unlinkError) {
                console.warn(`⚠️ Could not clean up partial file: ${unlinkError.message}`)
              }
            }
            continue
          }
        }

        throw new Error("All yt-dlp strategies failed")
      } catch (ytdlpError) {
        console.error(`❌ All yt-dlp strategies failed: ${ytdlpError.message}`)
        throw new Error(`Failed to download YouTube video: ${ytdlpError.message}`)
      }
    }
  }

  // Helper method to check if video is accessible
  async checkVideoAccessibility(youtubeUrl) {
    try {
      console.log("🔍 Checking video accessibility...")
      const videoId = youtubeService.extractVideoId(youtubeUrl)
      
      const command = [
        "yt-dlp",
        "--dump-json",
        "--no-download",
        "--extractor-args", "youtube:player_client=web",
        "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "--no-warnings",
        youtubeUrl
      ]

      const { stdout, stderr } = await execAsync(command.join(" "), {
        timeout: 30000 // 30 seconds
      })

      if (stdout && stdout.trim()) {
        try {
          const metadata = JSON.parse(stdout.trim())
          console.log(`✅ Video is accessible: ${metadata.title}`)
          return true
        } catch (parseError) {
          console.warn("⚠️ Could not parse video metadata")
          return false
        }
      }
      
      return false
    } catch (error) {
      console.warn(`⚠️ Video accessibility check failed: ${error.message}`)
      return false
    }
  }

  // Modified: Main method to get YouTube data with graceful fallback
  async getYouTubeData(youtubeUrl) {
    console.log("🔍 Getting YouTube data...")
    let videoPath = null
    let videoInfo = null
    let transcript = null
    let isDownloadSuccessful = false

    // Step 1: Check video accessibility first
    const isAccessible = await this.checkVideoAccessibility(youtubeUrl)
    if (!isAccessible) {
      console.warn("⚠️ Video may not be accessible for download")
    }

    // Step 2: Always attempt to get video metadata and transcript first
    try {
      console.log("📊 Fetching YouTube metadata...")
      videoInfo = await youtubeService.getVideoMetadata(youtubeUrl)
      console.log("✅ YouTube metadata obtained.")
    } catch (metaError) {
      console.warn(`⚠️ Failed to get YouTube metadata: ${metaError.message}`)
      // Create basic video info
      const videoId = youtubeService.extractVideoId(youtubeUrl)
      videoInfo = {
        title: videoId ? `YouTube Video (${videoId})` : "YouTube Video",
        duration: 300, // 5 minutes default
        views: "Unknown",
        description: "Unable to fetch video details",
        channelTitle: "Unknown Channel",
        publishedAt: new Date().toISOString(),
        width: 640,
        height: 360,
      }
    }

    try {
      console.log("📝 Fetching YouTube transcript...")
      transcript = await youtubeService.getVideoTranscript(youtubeUrl)
      console.log("✅ YouTube captions extracted successfully.")
    } catch (captionError) {
      console.warn(`⚠️ Failed to get captions: ${captionError.message}`)
      // Create basic transcript from metadata
      transcript = {
        text: `Video: ${videoInfo.title}. ${videoInfo.description ? videoInfo.description.substring(0, 500) : "No description available."}`,
        segments: [],
      }
    }

    // Step 3: Attempt to download the video (only if it seems accessible)
    if (isAccessible) {
      try {
        console.log("📥 Attempting to download YouTube video...")
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
        
        // Check if this is a 403 error specifically
        if (downloadError.message.includes("403") || downloadError.message.includes("Forbidden")) {
          console.warn("⚠️ Video appears to be blocked or restricted. Proceeding with text-only generation.")
        } else {
          console.warn(`⚠️ Download failed with error: ${downloadError.message}. Proceeding with text-only generation.`)
        }
        isDownloadSuccessful = false
        videoPath = null
      }
    } else {
      console.warn("⚠️ Skipping download due to accessibility issues. Proceeding with text-only generation.")
    }

    // Step 4: If we don't have a transcript and couldn't download, this is problematic
    if (!transcript.text && !isDownloadSuccessful) {
      throw new Error("Unable to obtain video content or metadata. The video may be private, restricted, or unavailable.")
    }

    console.log(`DEBUG (videoService.getYouTubeData): videoPath = ${videoPath}`)
    console.log(`DEBUG (videoService.getYouTubeData): isDownloadSuccessful = ${isDownloadSuccessful}`)
    console.log(`DEBUG (videoService.getYouTubeData): transcript length = ${transcript.text ? transcript.text.length : 0}`)

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