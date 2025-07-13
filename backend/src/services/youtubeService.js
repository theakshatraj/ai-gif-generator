import axios from "axios"
import * as cheerio from "cheerio" // <--- CHANGED: Import cheerio as a namespace
import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs"
import { RateLimiterMemory } from "rate-limiter-flexible"
import puppeteer from "puppeteer"

const execAsync = promisify(exec)

class YouTubeService {
  constructor() {
    this.rateLimiter = new RateLimiterMemory({
      keyPrefix: "youtube_api",
      points: 10, // Number of requests
      duration: 60, // Per 60 seconds
    })

    // Initialize browser for scraping
    this.browser = null
    this.page = null
  }

  // Initialize browser for advanced scraping
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: "new",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
          "--single-process", // Added for Railway to potentially reduce memory/CPU
        ],
      })
      this.page = await this.browser.newPage()

      // Set user agent to avoid detection
      await this.page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      )
    }
  }

  // Extract video ID from various YouTube URL formats
  extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
      /youtu\.be\/([^&\n?#]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return match[1]
      }
    }

    return null
  }

  // Method 1: Get video metadata using yt-dlp
  async getVideoMetadataYtDlp(youtubeUrl) {
    try {
      await this.rateLimiter.consume("metadata")

      const command = [
        "yt-dlp",
        "--dump-json",
        "--no-download",
        "--no-warnings",
        "--socket-timeout",
        "30",
        "--extractor-args",
        "youtube:player_client=web",
        youtubeUrl,
      ]
      const { stdout } = await execAsync(command.join(" "), { timeout: 30000 })

      if (stdout && stdout.trim()) {
        const metadata = JSON.parse(stdout.trim())
        return {
          title: metadata.title || "Unknown Title",
          duration: metadata.duration || 300,
          views: metadata.view_count || "Unknown",
          description: metadata.description || "No description available",
          channelTitle: metadata.uploader || metadata.channel || "Unknown Channel",
          publishedAt: metadata.upload_date ? new Date(metadata.upload_date).toISOString() : new Date().toISOString(),
          width: metadata.width || 640,
          height: metadata.height || 360,
          thumbnailUrl: metadata.thumbnail || null,
          tags: metadata.tags || [],
        }
      }

      throw new Error("No metadata returned from yt-dlp")
    } catch (error) {
      console.warn(`yt-dlp metadata extraction failed: ${error.message}`)
      throw error
    }
  }

  // Method 2: Get video metadata using web scraping
  async getVideoMetadataWebScraping(youtubeUrl) {
    try {
      await this.rateLimiter.consume("scraping")

      const response = await axios.get(youtubeUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        timeout: 30000,
      })
      const $ = cheerio.load(response.data) // <--- Uses cheerio.load

      // Extract metadata from various sources
      const title =
        $('meta[property="og:title"]').attr("content") ||
        $('meta[name="title"]').attr("content") ||
        $("title").text() ||
        "Unknown Title"

      const description =
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content") ||
        "No description available"

      const thumbnailUrl = $('meta[property="og:image"]').attr("content") || null

      // Try to extract structured data
      let structuredData = null
      $('script[type="application/ld+json"]').each((i, elem) => {
        try {
          const data = JSON.parse($(elem).html())
          if (data["@type"] === "VideoObject") {
            structuredData = data
          }
        } catch (e) {
          // Ignore parsing errors
        }
      })
      const duration = structuredData?.duration ? this.parseDuration(structuredData.duration) : 300
      const publishedAt = structuredData?.uploadDate || new Date().toISOString()
      const channelTitle = structuredData?.author?.name || "Unknown Channel"
      return {
        title: title.replace(" - YouTube", ""),
        duration,
        views: "Unknown",
        description,
        channelTitle,
        publishedAt,
        width: 640,
        height: 360,
        thumbnailUrl,
        tags: [],
      }
    } catch (error) {
      console.warn(`Web scraping metadata extraction failed: ${error.message}`)
      throw error
    }
  }

  // Method 3: Get video metadata using Puppeteer
  async getVideoMetadataPuppeteer(youtubeUrl) {
    try {
      await this.initBrowser()
      await this.rateLimiter.consume("puppeteer")

      await this.page.goto(youtubeUrl, { waitUntil: "networkidle2", timeout: 30000 })

      // Wait for video metadata to load
      await this.page.waitForSelector("h1.title", { timeout: 10000 })

      const metadata = await this.page.evaluate(() => {
        const title =
          document.querySelector("h1.title")?.textContent ||
          document.querySelector('meta[property="og:title"]')?.content ||
          "Unknown Title"

        const description =
          document.querySelector('meta[property="og:description"]')?.content || "No description available"

        const channelTitle =
          document.querySelector("#channel-name a")?.textContent ||
          document.querySelector("#owner-name a")?.textContent ||
          "Unknown Channel"

        const thumbnailUrl = document.querySelector('meta[property="og:image"]')?.content || null

        // Try to get view count
        const viewsElement = document.querySelector("#count .view-count") || document.querySelector(".view-count")
        const views = viewsElement ? viewsElement.textContent.trim() : "Unknown"

        return {
          title: title.trim(),
          description: description.trim(),
          channelTitle: channelTitle.trim(),
          views: views,
          thumbnailUrl,
        }
      })

      return {
        ...metadata,
        duration: 300, // Default duration
        publishedAt: new Date().toISOString(),
        width: 640,
        height: 360,
        tags: [],
      }
    } catch (error) {
      console.warn(`Puppeteer metadata extraction failed: ${error.message}`)
      throw error
    }
  }

  // Main method to get video metadata with fallbacks
  async getVideoMetadata(youtubeUrl) {
    const methods = [
      { name: "yt-dlp", method: () => this.getVideoMetadataYtDlp(youtubeUrl) },
      { name: "web-scraping", method: () => this.getVideoMetadataWebScraping(youtubeUrl) },
      { name: "puppeteer", method: () => this.getVideoMetadataPuppeteer(youtubeUrl) },
    ]

    for (const methodObj of methods) {
      try {
        console.log(`🔍 Trying metadata extraction method: ${methodObj.name}`)
        const result = await methodObj.method()
        console.log(`✅ Successfully extracted metadata with ${methodObj.name}`)
        return result
      } catch (error) {
        console.warn(`⚠️ Method ${methodObj.name} failed: ${error.message}`)
        continue
      }
    }

    throw new Error("All metadata extraction methods failed")
  }

  // Method 1: Get transcript using yt-dlp
  async getVideoTranscriptYtDlp(youtubeUrl) {
    try {
      const command = [
        "yt-dlp",
        "--write-sub",
        "--write-auto-sub",
        "--sub-lang",
        "en,en-US,en-GB",
        "--sub-format",
        "vtt",
        "--skip-download",
        "--no-warnings",
        "--socket-timeout",
        "30",
        youtubeUrl,
      ]
      const { stdout, stderr } = await execAsync(command.join(" "), { timeout: 60000 })

      // Look for generated subtitle files
      const videoId = this.extractVideoId(youtubeUrl)
      const possibleFiles = [`${videoId}.en.vtt`, `${videoId}.en-US.vtt`, `${videoId}.en-GB.vtt`, `${videoId}.vtt`]

      for (const filename of possibleFiles) {
        if (fs.existsSync(filename)) {
          const content = fs.readFileSync(filename, "utf-8")
          const text = this.parseVTTContent(content)

          // Clean up the file
          fs.unlinkSync(filename)

          return {
            text,
            segments: this.extractSegments(content),
          }
        }
      }

      throw new Error("No subtitle files found")
    } catch (error) {
      console.warn(`yt-dlp transcript extraction failed: ${error.message}`)
      throw error
    }
  }

  // Method 2: Get transcript using direct API calls
  async getVideoTranscriptAPI(youtubeUrl) {
    try {
      const videoId = this.extractVideoId(youtubeUrl)
      if (!videoId) throw new Error("Invalid video ID")

      // This is a simplified approach - you might need to implement
      // the actual YouTube transcript API calls here
      const apiUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`

      const response = await axios.get(apiUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        timeout: 30000,
      })

      if (response.data) {
        const text = this.parseXMLTranscript(response.data)
        return {
          text,
          segments: [],
        }
      }

      throw new Error("No transcript data received")
    } catch (error) {
      console.warn(`API transcript extraction failed: ${error.message}`)
      throw error
    }
  }

  // Main method to get video transcript
  async getVideoTranscript(youtubeUrl) {
    const methods = [
      { name: "yt-dlp", method: () => this.getVideoTranscriptYtDlp(youtubeUrl) },
      { name: "api", method: () => this.getVideoTranscriptAPI(youtubeUrl) },
    ]

    for (const methodObj of methods) {
      try {
        console.log(`🔍 Trying transcript extraction method: ${methodObj.name}`)
        const result = await methodObj.method()
        console.log(`✅ Successfully extracted transcript with ${methodObj.name}`)
        return result
      } catch (error) {
        console.warn(`⚠️ Method ${methodObj.name} failed: ${error.message}`)
        continue
      }
    }

    throw new Error("All transcript extraction methods failed")
  }

  // Helper method to parse VTT content
  parseVTTContent(vttContent) {
    const lines = vttContent.split("\n")
    const textLines = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith("WEBVTT") && !trimmed.includes("-->") && !trimmed.match(/^\d+$/)) {
        textLines.push(trimmed)
      }
    }

    return textLines.join(" ").replace(/\s+/g, " ").trim()
  }

  // Helper method to parse XML transcript
  parseXMLTranscript(xmlContent) {
    const $ = cheerio.load(xmlContent, { xmlMode: true }) // <--- Uses cheerio.load
    const textParts = []

    $("text").each((i, elem) => {
      const text = $(elem).text().trim()
      if (text) {
        textParts.push(text)
      }
    })

    return textParts.join(" ").replace(/\s+/g, " ").trim()
  }

  // Helper method to extract segments from VTT
  extractSegments(vttContent) {
    const segments = []
    const lines = vttContent.split("\n")

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.includes("-->")) {
        const [start, end] = line.split("-->").map((t) => t.trim())
        const text = lines[i + 1]?.trim()

        if (text) {
          segments.push({
            start: this.parseVTTTime(start),
            end: this.parseVTTTime(end),
            text,
          })
        }
      }
    }

    return segments
  }

  // Helper method to parse VTT time format
  parseVTTTime(timeString) {
    const parts = timeString.split(":")
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts
      return Number.parseInt(hours) * 3600 + Number.parseInt(minutes) * 60 + Number.parseFloat(seconds)
    }
    return 0
  }

  // Helper method to parse ISO 8601 duration
  parseDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
    if (!match) return 300

    const hours = Number.parseInt(match[1]) || 0
    const minutes = Number.parseInt(match[2]) || 0
    const seconds = Number.parseInt(match[3]) || 0

    return hours * 3600 + minutes * 60 + seconds
  }

  // Cleanup method
  async cleanup() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
    }
  }
}

export default new YouTubeService()
