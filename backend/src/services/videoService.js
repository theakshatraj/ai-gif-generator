import { exec } from "child_process"
import ffmpeg from "fluent-ffmpeg"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"
import { promisify } from "util"
import youtubeService from "./youtubeService.js"
import ytdl from "ytdl-core"
import axios from "axios"

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

  // NEW: Alternative method using gallery-dl as a fallback
  async downloadWithGalleryDl(youtubeUrl) {
    const videoId = youtubeService.extractVideoId(youtubeUrl)
    const outputPath = path.join(this.tempDir, `${videoId}.%(ext)s`)
    
    try {
      console.log(`📥 Attempting download with gallery-dl: ${youtubeUrl}`)
      
      const command = [
        "gallery-dl",
        "--write-info-json",
        "--extract-audio",
        `--output`, outputPath,
        `--config-file`, "/dev/null",
        youtubeUrl
      ]

      const { stdout, stderr } = await execAsync(command.join(" "), {
        timeout: 300000 // 5 minutes
      })

      console.log(`📤 gallery-dl output:`, stdout)
      if (stderr) console.log(`📤 gallery-dl stderr:`, stderr)

      // Find the downloaded file
      const files = fs.readdirSync(this.tempDir).filter(file => file.startsWith(videoId))
      if (files.length > 0) {
        const downloadedFile = path.join(this.tempDir, files[0])
        console.log(`✅ Downloaded with gallery-dl: ${downloadedFile}`)
        return downloadedFile
      }

      throw new Error("No file found after gallery-dl download")
    } catch (error) {
      console.error(`❌ gallery-dl failed: ${error.message}`)
      throw error
    }
  }

  // NEW: Alternative method using streamlink for live streams
  async downloadWithStreamlink(youtubeUrl) {
    const videoId = youtubeService.extractVideoId(youtubeUrl)
    const outputPath = path.join(this.tempDir, `${videoId}.mp4`)
    
    try {
      console.log(`📥 Attempting download with streamlink: ${youtubeUrl}`)
      
      const command = [
        "streamlink",
        "--output", outputPath,
        "--retry-streams", "5",
        "--retry-max", "10",
        "--hls-timeout", "60",
        youtubeUrl,
        "best"
      ]

      const { stdout, stderr } = await execAsync(command.join(" "), {
        timeout: 300000 // 5 minutes
      })

      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        console.log(`✅ Downloaded with streamlink: ${outputPath}`)
        return outputPath
      }

      throw new Error("Streamlink download failed or produced empty file")
    } catch (error) {
      console.error(`❌ streamlink failed: ${error.message}`)
      throw error
    }
  }

  // NEW: Method using youtube-dl-exec (alternative to yt-dlp)
  async downloadWithYoutubeDlExec(youtubeUrl) {
    const videoId = youtubeService.extractVideoId(youtubeUrl)
    const outputPath = path.join(this.tempDir, `${videoId}.%(ext)s`)
    
    try {
      console.log(`📥 Attempting download with youtube-dl: ${youtubeUrl}`)
      
      const command = [
        "youtube-dl",
        "--format", "best[height<=720]/best",
        "--output", outputPath,
        "--no-warnings",
        "--extract-flat",
        "--write-info-json",
        youtubeUrl
      ]

      const { stdout, stderr } = await execAsync(command.join(" "), {
        timeout: 300000 // 5 minutes
      })

      // Find the downloaded file
      const files = fs.readdirSync(this.tempDir).filter(file => file.startsWith(videoId) && file.endsWith('.mp4'))
      if (files.length > 0) {
        const downloadedFile = path.join(this.tempDir, files[0])
        console.log(`✅ Downloaded with youtube-dl: ${downloadedFile}`)
        return downloadedFile
      }

      throw new Error("No file found after youtube-dl download")
    } catch (error) {
      console.error(`❌ youtube-dl failed: ${error.message}`)
      throw error
    }
  }

  // ENHANCED: Updated yt-dlp with more strategies and better error handling
  async downloadWithYtDlpEnhanced(youtubeUrl) {
    const videoId = youtubeService.extractVideoId(youtubeUrl)
    const outputPath = path.join(this.tempDir, `${videoId}.%(ext)s`)
    
    const strategies = [
      {
        name: "web-mobile",
        args: [
          "--extractor-args", "youtube:player_client=web,mweb",
          "--user-agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1",
          "--format", "best[height<=720][ext=mp4]/best[ext=mp4]/best"
        ]
      },
      {
        name: "android-testsuite",
        args: [
          "--extractor-args", "youtube:player_client=android_testsuite",
          "--format", "best[height<=480][ext=mp4]/best[ext=mp4]/best"
        ]
      },
      {
        name: "tv-embed",
        args: [
          "--extractor-args", "youtube:player_client=tv_embed",
          "--format", "best[height<=720][ext=mp4]/best[ext=mp4]/best"
        ]
      },
      {
        name: "web-embed",
        args: [
          "--extractor-args", "youtube:player_client=web_embed",
          "--referer", "https://www.youtube.com/",
          "--format", "best[height<=720][ext=mp4]/best[ext=mp4]/best"
        ]
      },
      {
        name: "bypass-throttling",
        args: [
          "--throttled-rate", "100K",
          "--format", "worst[ext=mp4]/worst"
        ]
      }
    ]

    for (const strategy of strategies) {
      try {
        console.log(`🔧 Trying enhanced yt-dlp strategy: ${strategy.name}`)
        
        const command = [
          "yt-dlp",
          "--no-warnings",
          "--no-check-certificate",
          "--geo-bypass",
          "--socket-timeout", "30",
          "--retries", "3",
          "--fragment-retries", "3",
          "--output", outputPath,
          ...strategy.args,
          youtubeUrl
        ]

        console.log(`🔧 Command: ${command.join(" ")}`)
        
        const { stdout, stderr } = await execAsync(command.join(" "), {
          timeout: 300000 // 5 minutes
        })

        // Find the downloaded file
        const files = fs.readdirSync(this.tempDir).filter(file => 
          file.startsWith(videoId) && (file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mkv'))
        )
        
        if (files.length > 0) {
          const downloadedFile = path.join(this.tempDir, files[0])
          if (fs.existsSync(downloadedFile) && fs.statSync(downloadedFile).size > 0) {
            console.log(`✅ Downloaded with yt-dlp (${strategy.name}): ${downloadedFile}`)
            return downloadedFile
          }
        }

        console.warn(`⚠️ yt-dlp strategy ${strategy.name} completed but no valid file found`)
      } catch (error) {
        console.warn(`⚠️ yt-dlp strategy ${strategy.name} failed: ${error.message}`)
        continue
      }
    }

    throw new Error("All enhanced yt-dlp strategies failed")
  }

  // NEW: Method to download using a proxy service (for blocked regions)
  async downloadWithProxy(youtubeUrl) {
    const videoId = youtubeService.extractVideoId(youtubeUrl)
    const outputPath = path.join(this.tempDir, `${videoId}.%(ext)s`)
    
    try {
      console.log(`📥 Attempting download with proxy: ${youtubeUrl}`)
      
      const command = [
        "yt-dlp",
        "--proxy", "socks5://127.0.0.1:9050", // Tor proxy - you might need to set this up
        "--format", "best[height<=480][ext=mp4]/best[ext=mp4]/best",
        "--output", outputPath,
        "--no-warnings",
        "--socket-timeout", "60",
        "--retries", "2",
        youtubeUrl
      ]

      const { stdout, stderr } = await execAsync(command.join(" "), {
        timeout: 300000 // 5 minutes
      })

      // Find the downloaded file
      const files = fs.readdirSync(this.tempDir).filter(file => file.startsWith(videoId))
      if (files.length > 0) {
        const downloadedFile = path.join(this.tempDir, files[0])
        console.log(`✅ Downloaded with proxy: ${downloadedFile}`)
        return downloadedFile
      }

      throw new Error("No file found after proxy download")
    } catch (error) {
      console.error(`❌ proxy download failed: ${error.message}`)
      throw error
    }
  }

  // ENHANCED: Main download method with all strategies
  async downloadYouTubeVideo(youtubeUrl) {
    const videoId = youtubeService.extractVideoId(youtubeUrl)
    if (!videoId) {
      throw new Error("Invalid YouTube URL for download")
    }

    const downloadMethods = [
      // Method 1: Enhanced yt-dlp with multiple strategies
      { name: "yt-dlp-enhanced", method: () => this.downloadWithYtDlpEnhanced(youtubeUrl) },
      
      // Method 2: ytdl-core (fastest but often blocked)
      { name: "ytdl-core", method: () => this.downloadWithYtdlCore(youtubeUrl) },
      
      // Method 3: youtube-dl (older but sometimes works)
      { name: "youtube-dl", method: () => this.downloadWithYoutubeDlExec(youtubeUrl) },
      
      // Method 4: gallery-dl (alternative extractor)
      { name: "gallery-dl", method: () => this.downloadWithGalleryDl(youtubeUrl) },
      
      // Method 5: streamlink (for live streams)
      { name: "streamlink", method: () => this.downloadWithStreamlink(youtubeUrl) },
      
      // Method 6: proxy download (if available)
      // { name: "proxy", method: () => this.downloadWithProxy(youtubeUrl) },
    ]

    for (const downloadMethod of downloadMethods) {
      try {
        console.log(`🔄 Trying download method: ${downloadMethod.name}`)
        const result = await downloadMethod.method()
        
        if (result && fs.existsSync(result) && fs.statSync(result).size > 0) {
          console.log(`✅ Successfully downloaded with ${downloadMethod.name}: ${result}`)
          return result
        }
      } catch (error) {
        console.warn(`⚠️ Method ${downloadMethod.name} failed: ${error.message}`)
        continue
      }
    }

    throw new Error("All download methods failed. The video may be restricted, private, or unavailable.")
  }

  // Extracted ytdl-core method for better organization
  async downloadWithYtdlCore(youtubeUrl) {
    const videoId = youtubeService.extractVideoId(youtubeUrl)
    const outputPath = path.join(this.tempDir, `${videoId}.mp4`)

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
  }

  // ENHANCED: Better video accessibility check
  async checkVideoAccessibility(youtubeUrl) {
    const checks = [
      // Check 1: yt-dlp info
      async () => {
        const command = [
          "yt-dlp",
          "--dump-json",
          "--no-download",
          "--no-warnings",
          "--socket-timeout", "15",
          youtubeUrl
        ]
        
        const { stdout } = await execAsync(command.join(" "), { timeout: 30000 })
        if (stdout && stdout.trim()) {
          const metadata = JSON.parse(stdout.trim())
          return { accessible: true, title: metadata.title, duration: metadata.duration }
        }
        return { accessible: false }
      },
      
      // Check 2: ytdl-core info
      async () => {
        const info = await ytdl.getBasicInfo(youtubeUrl)
        return { 
          accessible: true, 
          title: info.videoDetails.title, 
          duration: parseInt(info.videoDetails.lengthSeconds) 
        }
      },
      
      // Check 3: Direct API check (if available)
      async () => {
        const videoId = youtubeService.extractVideoId(youtubeUrl)
        // You could add YouTube API v3 check here if you have an API key
        return { accessible: false }
      }
    ]

    for (const check of checks) {
      try {
        console.log("🔍 Checking video accessibility...")
        const result = await check()
        if (result.accessible) {
          console.log(`✅ Video is accessible: ${result.title}`)
          return result
        }
      } catch (error) {
        console.warn(`⚠️ Accessibility check failed: ${error.message}`)
        continue
      }
    }

    console.warn("⚠️ Video accessibility could not be verified")
    return { accessible: false }
  }

  // ENHANCED: Main method with better error handling and fallbacks
  async getYouTubeData(youtubeUrl) {
    console.log("🔍 Getting YouTube data...")
    let videoPath = null
    let videoInfo = null
    let transcript = null
    let isDownloadSuccessful = false

    // Step 1: Check video accessibility
    const accessibilityResult = await this.checkVideoAccessibility(youtubeUrl)
    
    // Step 2: Get video metadata and transcript
    try {
      console.log("📊 Fetching YouTube metadata...")
      videoInfo = await youtubeService.getVideoMetadata(youtubeUrl)
      console.log("✅ YouTube metadata obtained.")
    } catch (metaError) {
      console.warn(`⚠️ Failed to get YouTube metadata: ${metaError.message}`)
      // Use accessibility result if available
      const videoId = youtubeService.extractVideoId(youtubeUrl)
      videoInfo = {
        title: accessibilityResult.title || (videoId ? `YouTube Video (${videoId})` : "YouTube Video"),
        duration: accessibilityResult.duration || 300,
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
      transcript = {
        text: `Video: ${videoInfo.title}. ${videoInfo.description ? videoInfo.description.substring(0, 500) : "No description available."}`,
        segments: [],
      }
    }

    // Step 3: Attempt download only if we have some content or accessibility is confirmed
    if (accessibilityResult.accessible || transcript.text) {
      try {
        console.log("📥 Attempting to download YouTube video...")
        videoPath = await this.downloadYouTubeVideo(youtubeUrl)
        console.log("✅ YouTube video downloaded successfully.")
        isDownloadSuccessful = true
        
        // Update videoInfo with actual dimensions
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
      }
    } else {
      console.warn("⚠️ Skipping download - no accessible content found")
    }

    // Step 4: Final validation
    if (!transcript.text && !isDownloadSuccessful) {
      throw new Error("Unable to obtain video content or metadata. The video may be private, restricted, or unavailable.")
    }

    console.log(`DEBUG: videoPath = ${videoPath}`)
    console.log(`DEBUG: isDownloadSuccessful = ${isDownloadSuccessful}`)
    console.log(`DEBUG: transcript length = ${transcript.text ? transcript.text.length : 0}`)

    return {
      videoPath,
      videoInfo,
      transcript,
      isDownloadSuccessful,
    }
  }

  // Rest of the methods remain the same...
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
      if (!fs.existsSync(videoPath)) {
        reject(new Error("Video file not found"))
        return
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
          "-avoid_negative_ts", "make_zero",
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
          "-c:v", "libx264",
          "-preset", "fast",
          "-crf", "28",
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart",
        ])
        .output(outputPath)
        .on("start", (cmd) => {
          console.log("🎬 Starting placeholder video generation...")
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