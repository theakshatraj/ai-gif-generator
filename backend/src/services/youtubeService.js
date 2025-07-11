import { exec } from "child_process"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"
import { promisify } from "util"

const execAsync = promisify(exec)

class YouTubeService {
  constructor() {
    this.tempDir = path.join(process.cwd(), "temp")
    this.cacheDir = path.join(process.cwd(), "cache")
    this.ensureDirectories()
  }

  ensureDirectories() {
    ;[this.tempDir, this.cacheDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        console.log(`📁 Created directory: ${dir}`)
      }
    })
  }

  // Extract video ID from YouTube URL
  extractVideoId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  // Get video transcript using yt-dlp (captions only, no video download)
  async getVideoTranscript(youtubeUrl) {
    const captionId = uuidv4()
    const captionPath = path.join(this.tempDir, `${captionId}.vtt`)
    try {
      console.log("📝 Downloading YouTube captions...")
      console.log("🔗 URL:", youtubeUrl)
      // Try to download captions in different languages
      const languages = ["en", "en-US", "en-GB", "auto"]
      let captionsDownloaded = false
      for (const lang of languages) {
        try {
          const command = [
            "yt-dlp",
            "--cache-dir",
            this.cacheDir,
            "--write-subs",
            "--sub-langs",
            lang,
            "--sub-format",
            "vtt",
            "--skip-download", // This is key - don't download video
            "--user-agent",
            '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
            "--no-check-certificate",
            "--geo-bypass",
            "--output",
            captionPath.replace(".vtt", ""),
            youtubeUrl,
          ]
          console.log(`🔧 Trying captions in language: ${lang}`)
          const { stdout, stderr } = await execAsync(command.join(" "), {
            timeout: 60000,
          })
          if (stdout) {
            console.log("📤 yt-dlp captions stdout:", stdout)
          }
          // Check if caption file was created
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
              console.log(`✅ Captions downloaded successfully in ${lang}`)
              break
            }
          }
          if (captionsDownloaded) break
        } catch (langError) {
          console.log(`⚠️ Failed to download captions in ${lang}:`, langError.message)
          // If it's a 403, log it but continue trying other languages or fall back
          if (langError.message.includes("HTTP Error 403: Forbidden")) {
            console.warn(`⚠️ Encountered 403 Forbidden for captions in ${lang}. This video might be restricted.`)
          }
          continue
        }
      }
      if (!captionsDownloaded) {
        // Instead of throwing, return an empty/default transcript
        console.warn("⚠️ No captions could be downloaded for this video. Proceeding without transcript.")
        return {
          text: "",
          segments: [],
        }
      }
      // Parse the VTT file
      const captions = await this.parseVTTFile(captionPath)
      // Clean up caption file
      if (fs.existsSync(captionPath)) {
        fs.unlinkSync(captionPath)
      }
      return captions
    } catch (error) {
      console.error("❌ Caption download failed:", error)
      if (fs.existsSync(captionPath)) {
        fs.unlinkSync(captionPath)
      }
      // If the initial attempt to get captions fails for any reason, return empty transcript
      console.warn(`⚠️ Falling back to empty transcript due to error: ${error.message}`)
      return {
        text: "",
        segments: [],
      }
    }
  }

  // Get video metadata using yt-dlp (no video download)
  async getVideoMetadata(youtubeUrl) {
    try {
      console.log("📊 Getting YouTube video metadata...")

      const command = [
        "yt-dlp",
        "--cache-dir",
        this.cacheDir,
        "--no-check-certificate",
        "--geo-bypass",
        "--dump-json", // Get JSON metadata
        "--no-download", // Don't download video
        "--user-agent",
        '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
        youtubeUrl,
      ]
      const { stdout } = await execAsync(command.join(" "), {
        timeout: 30000,
      })
      const metadata = JSON.parse(stdout)

      return {
        title: metadata.title || "Unknown Title",
        duration: metadata.duration || 60,
        views: metadata.view_count || "Unknown",
        description: metadata.description || "No description available",
        channelTitle: metadata.uploader || "Unknown Channel",
        publishedAt: metadata.upload_date || new Date().toISOString(),
      }
    } catch (error) {
      console.log("⚠️ Failed to get video metadata:", error.message)

      // Fallback method
      return {
        title: "YouTube Video",
        duration: 60,
        views: "Unknown",
        description: "Unable to fetch video details",
        channelTitle: "Unknown Channel",
        publishedAt: new Date().toISOString(),
      }
    }
  }

  // YouTube API method (only works if API key is configured)
  async getVideoDetails(videoId) {
    const API_KEY = process.env.YOUTUBE_API_KEY
    if (!API_KEY) {
      throw new Error("YouTube API key not configured")
    }
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${API_KEY}&part=snippet,contentDetails,statistics`

    try {
      const response = await fetch(url)
      const data = await response.json()

      if (!data.items || data.items.length === 0) {
        throw new Error("Video not found or is private")
      }
      const video = data.items[0]
      const duration = this.parseDuration(video.contentDetails.duration)

      return {
        title: video.snippet.title,
        description: video.snippet.description,
        duration: duration,
        views: video.statistics.viewCount,
        publishedAt: video.snippet.publishedAt,
        channelTitle: video.snippet.channelTitle,
      }
    } catch (error) {
      throw new Error(`Failed to fetch video details: ${error.message}`)
    }
  }

  // Helper method to parse ISO 8601 duration
  parseDuration(isoDuration) {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
    const matches = isoDuration.match(regex)

    if (!matches) return 0

    const hours = Number.parseInt(matches[1] || 0)
    const minutes = Number.parseInt(matches[2] || 0)
    const seconds = Number.parseInt(matches[3] || 0)
    const milliseconds = 0 // Declare milliseconds variable

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
  }

  // Parse VTT caption file
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
      return {
        text: captions.map((cap) => cap.text).join(" "),
        segments: captions.map((cap) => ({
          start: cap.start,
          end: cap.end,
          text: cap.text,
        })),
      }
    } catch (error) {
      console.error("❌ Failed to parse VTT file:", error)
      throw error
    }
  }

  // Convert time string to seconds
  timeToSeconds(timeString) {
    const parts = timeString.split(":")
    const hours = Number.parseInt(parts[0])
    const minutes = Number.parseInt(parts[1])
    const secondsParts = parts[2].split(".")
    const seconds = Number.parseInt(secondsParts[0])
    const milliseconds = Number.parseInt(secondsParts[1])
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
  }

  // Main method to get YouTube data without downloading video
  async getYouTubeData(youtubeUrl) {
    try {
      console.log("🔍 Extracting YouTube data without video download...")

      const videoId = this.extractVideoId(youtubeUrl)
      if (!videoId) {
        throw new Error("Invalid YouTube URL")
      }

      // Try YouTube API first (if available)
      let videoInfo = null
      try {
        videoInfo = await this.getVideoDetails(videoId)
        console.log("✅ YouTube API metadata extracted successfully")
      } catch (apiError) {
        console.log("⚠️ YouTube API not available, falling back to yt-dlp:", apiError.message)

        // Fallback to yt-dlp metadata
        videoInfo = await this.getVideoMetadata(youtubeUrl)
      }

      // Get captions
      let transcript
      try {
        transcript = await this.getVideoTranscript(youtubeUrl)
        console.log("✅ YouTube captions extracted successfully")
      } catch (captionError) {
        console.log("⚠️ Failed to get captions:", captionError.message)

        // Create basic transcript from metadata if captions fail
        transcript = {
          text: `Video: ${videoInfo.title}. ${videoInfo.description.substring(0, 500)}`,
          segments: [],
        }
      }

      return {
        transcript,
        videoInfo,
        isPlaceholder: true, // We're not downloading the actual video
      }
    } catch (error) {
      console.error("❌ Failed to get YouTube data:", error)
      throw new Error(`Failed to extract YouTube data: ${error.message}`)
    }
  }

  // Cleanup method
  async cleanup() {
    console.log("🧹 Cleaning up YouTube service...")
    // No browser instances to clean up in this implementation
  }
}

export default new YouTubeService()
