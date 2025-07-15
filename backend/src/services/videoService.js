import { execFile } from "child_process"
import ffmpeg from "fluent-ffmpeg"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"
import { promisify } from "util"
import youtubeService from "./youtubeService.js"
import ytdl from "ytdl-core"

const execFileAsync = promisify(execFile)

// Helper function to create a temporary cookie file
async function createCookieFile(cookiesString) {
  if (!cookiesString) return null
  const cookieFilePath = path.join(process.cwd(), "temp", `cookies_${uuidv4()}.txt`)
  try {
    await fs.promises.writeFile(cookieFilePath, cookiesString)
    console.log(`🍪 Created temporary cookie file: ${cookieFilePath}`)
    return cookieFilePath
  } catch (error) {
    console.error(`❌ Failed to create cookie file: ${error.message}`)
    return null
  }
}

// Helper function to delete a temporary cookie file
async function deleteCookieFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      await fs.promises.unlink(filePath)
      console.log(`🗑️ Deleted temporary cookie file: ${filePath}`)
    } catch (error) {
      console.warn(`⚠️ Failed to delete cookie file ${filePath}: ${error.message}`)
    }
  }
}

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

  async downloadWithGalleryDl(youtubeUrl) {
    const videoId = youtubeService.extractVideoId(youtubeUrl)
    const outputPath = path.join(this.tempDir, `${videoId}.%(ext)s`)

    try {
      console.log(`📥 Attempting download with gallery-dl: ${youtubeUrl}`)

      // Simplified arguments for gallery-dl
      const commandArgs = [
        youtubeUrl,
        `--output`,
        outputPath,
        // Removed --extract-audio and --config-file /dev/null as they might be causing issues
        // If audio extraction is needed, it can be done with ffmpeg later.
      ]
      const { stdout, stderr } = await execFileAsync("gallery-dl", commandArgs, {
        timeout: 300000, // 5 minutes
      })
      console.log(`📤 gallery-dl output:`, stdout)
      if (stderr) console.log(`📤 gallery-dl stderr:`, stderr)
      const files = fs.readdirSync(this.tempDir).filter((file) => file.startsWith(videoId))
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

  async downloadWithStreamlink(youtubeUrl) {
    const videoId = youtubeService.extractVideoId(youtubeUrl)
    const outputPath = path.join(this.tempDir, `${videoId}.mp4`)

    try {
      console.log(`📥 Attempting download with streamlink: ${youtubeUrl}`)

      const commandArgs = [
        "--output",
        outputPath,
        "--retry-streams",
        "5",
        "--retry-max",
        "10",
        "--hls-timeout",
        "60",
        youtubeUrl,
        "best",
      ]
      const { stdout, stderr } = await execFileAsync("streamlink", commandArgs, {
        timeout: 300000, // 5 minutes
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

  async downloadWithYoutubeDlExec(youtubeUrl) {
    const videoId = youtubeService.extractVideoId(youtubeUrl)
    const outputPath = path.join(this.tempDir, `${videoId}.%(ext)s`)

    try {
      console.log(`📥 Attempting download with youtube-dl: ${youtubeUrl}`)

      const commandArgs = [
        "--format",
        "best[height<=720]/best",
        "--output",
        outputPath,
        "--no-warnings",
        // Removed --extract-flat and --write-info-json as they are not needed for direct download
        youtubeUrl,
      ]
      const { stdout, stderr } = await execFileAsync("youtube-dl", commandArgs, {
        timeout: 300000, // 5 minutes
      })
      const files = fs.readdirSync(this.tempDir).filter((file) => file.startsWith(videoId) && file.endsWith(".mp4"))
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

  async downloadWithYtDlpEnhanced(youtubeUrl) {
    const videoId = youtubeService.extractVideoId(youtubeUrl)
    const outputPath = path.join(this.tempDir, `${videoId}.%(ext)s`)
    let cookieFilePath = null

    try {
      cookieFilePath = await createCookieFile(process.env.YOUTUBE_COOKIES)

      const strategies = [
        {
          name: "web-mobile",
          args: [
            "--extractor-args",
            "youtube:player_client=web,mweb",
            "--user-agent",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1",
            "--format",
            "best[height<=720][ext=mp4]/best[ext=mp4]/best",
          ],
        },
        {
          name: "android-testsuite",
          args: [
            "--extractor-args",
            "youtube:player_client=android_testsuite",
            "--format",
            "best[height<=480][ext=mp4]/best[ext=mp4]/best",
          ],
        },
        {
          name: "tv-embed",
          args: [
            "--extractor-args",
            "youtube:player_client=tv_embed",
            "--format",
            "best[height<=720][ext=mp4]/best[ext=mp4]/best",
          ],
        },
        {
          name: "web-embed",
          args: [
            "--extractor-args",
            "youtube:player_client=web_embed",
            "--referer",
            "https://www.youtube.com/",
            "--format",
            "best[height<=720][ext=mp4]/best[ext=mp4]/best",
          ],
        },
        {
          name: "bypass-throttling",
          args: ["--throttled-rate", "100K", "--format", "worst[ext=mp4]/worst"],
        },
        {
          name: "default-web-fallback",
          args: [
            "--user-agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "--format",
            "best[ext=mp4]/best",
          ],
        },
      ]

      for (const strategy of strategies) {
        try {
          console.log(`🔧 Trying enhanced yt-dlp strategy: ${strategy.name}`)

          const baseArgs = [
            "--no-warnings",
            "--no-check-certificate",
            "--geo-bypass",
            "--socket-timeout",
            "30",
            "--retries",
            "3",
            "--fragment-retries",
            "3",
            "--output",
            outputPath,
          ]

          if (cookieFilePath) {
            baseArgs.push("--cookies", cookieFilePath)
          }

          const commandArgs = [...baseArgs, ...strategy.args, youtubeUrl]
          console.log(`🔧 Command: yt-dlp ${commandArgs.join(" ")}`)

          const { stdout, stderr } = await execFileAsync("yt-dlp", commandArgs, {
            timeout: 300000, // 5 minutes
          })
          const files = fs
            .readdirSync(this.tempDir)
            .filter(
              (file) =>
                file.startsWith(videoId) && (file.endsWith(".mp4") || file.endsWith(".webm") || file.endsWith(".mkv")),
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
          await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000))
          continue
        }
      }
      throw new Error("All enhanced yt-dlp strategies failed")
    } finally {
      await deleteCookieFile(cookieFilePath)
    }
  }

  async downloadWithProxy(youtubeUrl) {
    const videoId = youtubeService.extractVideoId(youtubeUrl)
    const outputPath = path.join(this.tempDir, `${videoId}.%(ext)s`)
    let cookieFilePath = null

    try {
      cookieFilePath = await createCookieFile(process.env.YOUTUBE_COOKIES)

      console.log(`📥 Attempting download with proxy: ${youtubeUrl}`)

      const baseArgs = [
        "--proxy",
        "socks5://127.0.0.1:9050", // Tor proxy - you might need to set this up
        "--format",
        "best[height<=480][ext=mp4]/best[ext=mp4]/best",
        "--output",
        outputPath,
        "--no-warnings",
        "--socket-timeout",
        "60",
        "--retries",
        "2",
      ]

      if (cookieFilePath) {
        baseArgs.push("--cookies", cookieFilePath)
      }

      const commandArgs = [...baseArgs, youtubeUrl]

      const { stdout, stderr } = await execFileAsync("yt-dlp", commandArgs, {
        timeout: 300000, // 5 minutes
      })
      const files = fs.readdirSync(this.tempDir).filter((file) => file.startsWith(videoId))
      if (files.length > 0) {
        const downloadedFile = path.join(this.tempDir, files[0])
        console.log(`✅ Downloaded with proxy: ${downloadedFile}`)
        return downloadedFile
      }
      throw new Error("No file found after proxy download")
    } catch (error) {
      console.error(`❌ proxy download failed: ${error.message}`)
      throw error
    } finally {
      await deleteCookieFile(cookieFilePath)
    }
  }

  async downloadYouTubeVideo(youtubeUrl) {
    const videoId = youtubeService.extractVideoId(youtubeUrl)
    if (!videoId) {
      throw new Error("Invalid YouTube URL for download")
    }

    const downloadMethods = [
      { name: "yt-dlp-enhanced", method: () => this.downloadWithYtDlpEnhanced(youtubeUrl) },
      { name: "ytdl-core", method: () => this.downloadWithYtdlCore(youtubeUrl) },
      { name: "youtube-dl", method: () => this.downloadWithYoutubeDlExec(youtubeUrl) },
      { name: "gallery-dl", method: () => this.downloadWithGalleryDl(youtubeUrl) },
      { name: "streamlink", method: () => this.downloadWithStreamlink(youtubeUrl) },
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
        await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 3000))
        continue
      }
    }
    throw new Error("All download methods failed. The video may be restricted, private, or unavailable.")
  }

  async downloadWithYtdlCore(youtubeUrl) {
    const videoId = youtubeService.extractVideoId(youtubeUrl)
    const outputPath = path.join(this.tempDir, `${videoId}.mp4`)
    console.log(`📥 Attempting to download YouTube video with ytdl-core: ${youtubeUrl}`)

    try {
      const info = await ytdl.getInfo(youtubeUrl)

      let format = null

      format = ytdl.chooseFormat(info.formats, {
        quality: "highest",
        filter: (format) => format.hasVideo && format.hasAudio && format.container === "mp4",
      })

      if (!format) {
        format = ytdl.chooseFormat(info.formats, {
          quality: "highest",
          filter: (format) => format.container === "mp4" && format.hasVideo,
        })
      }

      if (!format) {
        format = ytdl.chooseFormat(info.formats, {
          quality: "highest",
          filter: (format) => format.container === "webm" && format.hasVideo,
        })
      }

      if (!format) {
        format = ytdl.chooseFormat(info.formats, {
          quality: "highest",
          filter: "videoonly",
        })
      }

      if (!format) {
        throw new Error("No suitable video format found for ytdl-core download.")
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
            reject(new Error("Downloaded video file is empty or corrupted"))
          }
        })

        videoStream.on("error", (error) => {
          console.error(`❌ ytdl-core download error: ${error.message}`)
          reject(error)
        })

        const downloadTimeout = setTimeout(() => {
          videoStream.destroy()
          writeStream.end()
          reject(new Error("ytdl-core download timeout"))
        }, 180000)
        videoStream.on("close", () => clearTimeout(downloadTimeout))
      })
    } catch (error) {
      console.error(`❌ ytdl-core initial info fetch or stream setup failed: ${error.message}`)
      throw error
    }
  }

  async checkVideoAccessibility(youtubeUrl) {
    let cookieFilePath = null
    try {
      cookieFilePath = await createCookieFile(process.env.YOUTUBE_COOKIES)

      const checks = [
        async () => {
          try {
            const baseArgs = ["--dump-json", "--no-download", "--no-warnings", "--socket-timeout", "15"]
            if (cookieFilePath) {
              baseArgs.push("--cookies", cookieFilePath)
            }
            const commandArgs = [...baseArgs, youtubeUrl]

            const { stdout } = await execFileAsync("yt-dlp", commandArgs, { timeout: 30000 })
            if (stdout && stdout.trim()) {
              const metadata = JSON.parse(stdout.trim())
              return { accessible: true, title: metadata.title, duration: metadata.duration }
            }
          } catch (error) {
            console.warn(`⚠️ yt-dlp accessibility check failed: ${error.message}`)
          }
          return { accessible: false }
        },

        async () => {
          try {
            const info = await ytdl.getBasicInfo(youtubeUrl)
            return {
              accessible: true,
              title: info.videoDetails.title,
              duration: Number.parseInt(info.videoDetails.lengthSeconds),
            }
          } catch (error) {
            console.warn(`⚠️ ytdl-core accessibility check failed: ${error.message}`)
          }
          return { accessible: false }
        },

        async () => {
          return { accessible: false }
        },
      ]

      for (const check of checks) {
        console.log("🔍 Checking video accessibility...")
        const result = await check()
        if (result.accessible) {
          console.log(`✅ Video is accessible: ${result.title}`)
          return result
        }
      }
      console.warn("⚠️ Video accessibility could not be verified by any method.")
      return { accessible: false }
    } finally {
      await deleteCookieFile(cookieFilePath)
    }
  }

  async getYouTubeData(youtubeUrl) {
    console.log("🔍 Getting YouTube data...")
    let videoPath = null
    let videoInfo = null
    let transcript = null
    let isDownloadSuccessful = false

    const accessibilityResult = await this.checkVideoAccessibility(youtubeUrl)

    try {
      console.log("📊 Fetching YouTube metadata...")
      videoInfo = await youtubeService.getVideoMetadata(youtubeUrl)
      console.log("✅ YouTube metadata obtained.")
    } catch (metaError) {
      console.warn(`⚠️ Failed to get YouTube metadata: ${metaError.message}`)
      const videoId = youtubeService.extractVideoId(youtubeUrl)
      videoInfo = {
        title: accessibilityResult.title || (videoId ? `YouTube Video (${videoId})` : "Unknown YouTube Video"),
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

    if (accessibilityResult.accessible || transcript.text) {
      try {
        console.log("📥 Attempting to download YouTube video...")
        videoPath = await this.downloadYouTubeVideo(youtubeUrl)
        console.log("✅ YouTube video downloaded successfully.")
        isDownloadSuccessful = true

        try {
          const actualVideoInfo = await this.getVideoInfo(videoPath)
          videoInfo = { ...videoInfo, ...actualVideoInfo }
        } catch (infoError) {
          console.warn("⚠️ Could not get video info from downloaded file:", infoError.message)
        }
      } catch (downloadError) {
        console.error(`❌ Failed to download YouTube video after all attempts: ${downloadError.message}`)
        isDownloadSuccessful = false
        videoPath = null
      }
    } else {
      console.warn("⚠️ Skipping download - no accessible content or metadata found.")
    }

    if (!transcript.text && !isDownloadSuccessful) {
      throw new Error(
        "Unable to obtain video content or metadata. The video may be private, restricted, or unavailable.",
      )
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
  }
}

export default new VideoService()
    