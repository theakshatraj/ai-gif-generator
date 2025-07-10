import { exec } from "child_process"
import ffmpeg from "fluent-ffmpeg"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"
import { promisify } from "util"

const execAsync = promisify(exec)

class VideoService {
  constructor() {
    // Use Railway environment variables for directories
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads")
    this.outputDir = process.env.OUTPUT_DIR || path.join(process.cwd(), "output")
    this.tempDir = process.env.TEMP_DIR || path.join(process.cwd(), "temp")
    this.cacheDir = path.join(process.cwd(), ".cache")

    // Railway-specific: Use YTDLP_COOKIES environment variable
    this.cookiesData = process.env.YTDLP_COOKIES || null
    this.cookiesFile = null

    console.log("🔧 VideoService Configuration:")
    console.log("Upload Dir:", this.uploadDir)
    console.log("Output Dir:", this.outputDir)
    console.log("Temp Dir:", this.tempDir)
    console.log("Cache Dir:", this.cacheDir)
    console.log("Cookies Available:", !!this.cookiesData)

    this.setupFFmpeg()
    this.ensureDirectories()
    this.setupCookies()
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

  // Railway-specific: Create cookies file from YTDLP_COOKIES environment variable
  setupCookies() {
    if (this.cookiesData) {
      try {
        this.cookiesFile = path.join(this.tempDir, "cookies.txt")
        fs.writeFileSync(this.cookiesFile, this.cookiesData)
        console.log("✅ Cookies file created from YTDLP_COOKIES environment variable")
      } catch (error) {
        console.error("❌ Failed to create cookies file:", error)
        this.cookiesFile = null
      }
    } else {
      console.log("⚠️ No YTDLP_COOKIES provided in environment variables")
    }
  }

  async downloadFromYoutube(youtubeUrl) {
    const videoId = uuidv4()
    const videoPath = path.join(this.tempDir, `${videoId}.%(ext)s`)

    console.log("⬇️ Downloading video with Railway-optimized parameters...")
    console.log("🔗 URL:", youtubeUrl)
    console.log("🍪 Cookies available:", !!this.cookiesFile)
    console.log("📁 Download path:", videoPath)

    try {
      // Railway-optimized yt-dlp command
      const ytDlpCommand = [
        "yt-dlp",
        "--no-check-certificate",
        "--geo-bypass",
        "--extractor-retries 2",
        "--fragment-retries 2",
        "--retry-sleep 1",
        "--socket-timeout 20",
        "--sleep-interval 0.5",
        "--max-sleep-interval 2",
        `--cache-dir "${this.cacheDir}"`,
        "--no-warnings",
        "--prefer-free-formats",
        "--no-playlist",
        // Format selection optimized for Railway
        '-f "worst[ext=mp4][height<=480]/worst[ext=webm][height<=480]/worst"',
        // Headers optimized for Railway deployment
        '--user-agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
        '--add-header "Accept-Language:en-US,en;q=0.9"',
        '--add-header "Accept-Encoding:gzip, deflate, br"',
        '--add-header "DNT:1"',
        '--add-header "Connection:keep-alive"',
        '--add-header "Referer:https://www.youtube.com/"',
        // Use cookies if available
        this.cookiesFile ? `--cookies "${this.cookiesFile}"` : "",
        `-o "${videoPath}"`,
        `"${youtubeUrl}"`,
      ]
        .filter(Boolean)
        .join(" ")

      console.log("🔧 Running Railway-optimized yt-dlp command...")

      const { stdout, stderr } = await execAsync(ytDlpCommand, {
        timeout: 90000, // Railway-optimized timeout
        maxBuffer: 1024 * 1024 * 5, // Railway-optimized buffer
      })

      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr)
      }

      const downloadedFile = await this.findDownloadedFile(videoId)
      if (!downloadedFile) {
        throw new Error("Downloaded file not found")
      }

      console.log("✅ Video downloaded successfully on Railway")
      console.log(`📁 Downloaded file: ${downloadedFile}`)

      return {
        videoPath: downloadedFile,
        videoInfo: await this.getVideoInfo(downloadedFile),
      }
    } catch (downloadError) {
      console.log("❌ Railway download attempt failed, trying alternatives...")
      return await this.tryRailwayAlternatives(youtubeUrl, videoId)
    }
  }

  async tryRailwayAlternatives(youtubeUrl, videoId) {
    console.log("🔄 Trying Railway-specific alternatives...")

    // Method 1: Ultra-simple yt-dlp for Railway
    try {
      const simpleCommand = [
        "yt-dlp",
        "-f worst",
        "--no-check-certificate",
        "--geo-bypass",
        "--socket-timeout 15",
        `--cache-dir "${this.cacheDir}"`,
        this.cookiesFile ? `--cookies "${this.cookiesFile}"` : "",
        `-o "${path.join(this.tempDir, `${videoId}_simple.%(ext)s`)}"`,
        `"${youtubeUrl}"`,
      ]
        .filter(Boolean)
        .join(" ")

      console.log("🔧 Trying ultra-simple Railway command...")
      await execAsync(simpleCommand, { timeout: 60000 })

      const downloadedFile = await this.findDownloadedFile(videoId, "_simple")
      if (downloadedFile) {
        console.log("✅ Video downloaded with simple method on Railway")
        return {
          videoPath: downloadedFile,
          videoInfo: await this.getVideoInfo(downloadedFile),
        }
      }
    } catch (error) {
      console.error("❌ Simple method failed on Railway:", error)
    }

    // Method 2: Try without cookies as last resort
    if (this.cookiesFile) {
      try {
        console.log("🔄 Trying without cookies on Railway...")
        const noCookiesCommand = [
          "yt-dlp",
          "-f worst",
          "--no-check-certificate",
          "--geo-bypass",
          "--socket-timeout 10",
          `--cache-dir "${this.cacheDir}"`,
          '--user-agent "Mozilla/5.0 (compatible; Googlebot/2.1)"',
          `-o "${path.join(this.tempDir, `${videoId}_nocookies.%(ext)s`)}"`,
          `"${youtubeUrl}"`,
        ].join(" ")

        await execAsync(noCookiesCommand, { timeout: 45000 })

        const downloadedFile = await this.findDownloadedFile(videoId, "_nocookies")
        if (downloadedFile) {
          console.log("✅ Video downloaded without cookies on Railway")
          return {
            videoPath: downloadedFile,
            videoInfo: await this.getVideoInfo(downloadedFile),
          }
        }
      } catch (error) {
        console.error("❌ No-cookies method failed on Railway:", error)
      }
    }

    throw new Error(
      "All Railway-optimized download methods failed. This might be due to YouTube's restrictions on server environments. Try uploading the video file directly instead.",
    )
  }

  async findDownloadedFile(videoId, suffix = "") {
    try {
      const files = fs.readdirSync(this.tempDir)
      const pattern = `${videoId}${suffix}`

      const matchingFiles = files.filter((file) => file.includes(pattern))

      if (matchingFiles.length > 0) {
        const filePath = path.join(this.tempDir, matchingFiles[0])
        const stats = fs.statSync(filePath)

        if (stats.size > 0) {
          console.log(`📁 Found downloaded file: ${matchingFiles[0]} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`)
          return filePath
        }
      }

      // Fallback: find any recent video file
      const videoFiles = files.filter(
        (file) => file.endsWith(".mp4") || file.endsWith(".webm") || file.endsWith(".mkv"),
      )

      if (videoFiles.length > 0) {
        const fileStats = videoFiles.map((file) => ({
          name: file,
          path: path.join(this.tempDir, file),
          mtime: fs.statSync(path.join(this.tempDir, file)).mtime,
        }))

        fileStats.sort((a, b) => b.mtime - a.mtime)
        const newestFile = fileStats[0]

        if (fs.statSync(newestFile.path).size > 0) {
          console.log(`📁 Using newest video file: ${newestFile.name}`)
          return newestFile.path
        }
      }

      return null
    } catch (error) {
      console.error("❌ Error finding downloaded file:", error)
      return null
    }
  }

  cookiesExist() {
    return !!this.cookiesFile && fs.existsSync(this.cookiesFile)
  }

  async downloadYoutubeCaptions(youtubeUrl) {
    const captionId = uuidv4()
    const captionPath = path.join(this.tempDir, `${captionId}.vtt`)

    try {
      console.log("📝 Downloading YouTube captions on Railway...")

      const languages = ["en", "en-US", "auto"]
      let captionsDownloaded = false

      for (const lang of languages) {
        try {
          const command = [
            "yt-dlp",
            "--write-subs",
            "--sub-langs",
            `"${lang}"`,
            "--sub-format",
            "vtt",
            "--skip-download",
            `--cache-dir "${this.cacheDir}"`,
            "--socket-timeout 15",
            '--user-agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"',
            "--no-check-certificate",
            "--geo-bypass",
            "--output",
            `"${captionPath.replace(".vtt", "")}"`,
            this.cookiesFile ? `--cookies "${this.cookiesFile}"` : "",
            `"${youtubeUrl}"`,
          ]
            .filter(Boolean)
            .join(" ")

          console.log(`🔧 Trying captions in language: ${lang}`)

          await execAsync(command, { timeout: 30000 })

          const possibleCaptionFiles = [
            `${captionPath.replace(".vtt", "")}.${lang}.vtt`,
            `${captionPath.replace(".vtt", "")}.en.vtt`,
            `${captionPath.replace(".vtt", "")}.vtt`,
          ]

          for (const possibleFile of possibleCaptionFiles) {
            if (fs.existsSync(possibleFile)) {
              if (possibleFile !== captionPath) {
                fs.renameSync(possibleFile, captionPath)
              }
              captionsDownloaded = true
              console.log(`✅ Captions downloaded successfully in ${lang} on Railway`)
              break
            }
          }

          if (captionsDownloaded) break
        } catch (langError) {
          console.log(`⚠️ Failed to download captions in ${lang} on Railway:`, langError.message)
          continue
        }
      }

      if (!captionsDownloaded) {
        throw new Error("No captions available for this video")
      }

      const captions = await this.parseVTTFile(captionPath)

      if (fs.existsSync(captionPath)) {
        fs.unlinkSync(captionPath)
      }

      return captions
    } catch (error) {
      console.error("❌ Caption download failed on Railway:", error)
      if (fs.existsSync(captionPath)) {
        fs.unlinkSync(captionPath)
      }
      throw new Error(`Failed to download captions: ${error.message}`)
    }
  }

  async parseVTTFile(vttPath) {
    try {
      console.log("📖 Parsing VTT caption file...")
      if (!fs.existsSync(vttPath)) {
        throw new Error("VTT file not found")
      }

      const vttContent = fs.readFileSync(vttPath, "utf8")
      const lines = vttContent.split("\n")
      const captions = []
      let currentCaption = null

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        if (!line || line.startsWith("WEBVTT") || line.startsWith("NOTE")) {
          continue
        }

        if (line.includes("-->")) {
          const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/)
          if (timeMatch) {
            if (currentCaption && currentCaption.text) {
              captions.push(currentCaption)
            }

            currentCaption = {
              start: this.timeToSeconds(timeMatch[1]),
              end: this.timeToSeconds(timeMatch[2]),
              text: "",
            }
          }
        } else if (currentCaption && line && !line.match(/^\d+$/)) {
          if (currentCaption.text) {
            currentCaption.text += " "
          }
          currentCaption.text += line.replace(/<[^>]*>/g, "").trim()
        }
      }

      if (currentCaption && currentCaption.text) {
        captions.push(currentCaption)
      }

      console.log(`✅ Parsed ${captions.length} caption segments`)

      const transcript = {
        text: captions.map((cap) => cap.text).join(" "),
        segments: captions.map((cap) => ({
          start: cap.start,
          end: cap.end,
          text: cap.text,
        })),
      }

      return transcript
    } catch (error) {
      console.error("❌ Failed to parse VTT file:", error)
      throw error
    }
  }

  timeToSeconds(timeString) {
    const parts = timeString.split(":")
    const hours = Number.parseInt(parts[0])
    const minutes = Number.parseInt(parts[1])
    const secondsParts = parts[2].split(".")
    const seconds = Number.parseInt(secondsParts[0])
    const milliseconds = Number.parseInt(secondsParts[1])

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
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
}

export default new VideoService()
