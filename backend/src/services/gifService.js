import { exec } from "child_process"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"
import { promisify } from "util"

const execAsync = promisify(exec)

class GifService {
  constructor() {
    // Use Railway environment variables for directories
    this.outputDir = process.env.OUTPUT_DIR || path.join(process.cwd(), "output")
    this.tempDir = process.env.TEMP_DIR || path.join(process.cwd(), "temp")
    this.fontPath = path.join(process.cwd(), "assets", "fonts", "OpenSans-Regular.ttf")
    this.ffmpegPath = "ffmpeg"

    console.log("🔧 GifService Configuration:")
    console.log("Output Dir:", this.outputDir)
    console.log("Temp Dir:", this.tempDir)
    console.log("Font Path:", this.fontPath)

    this.verifyFont()
    this.ensureDirectories()
  }

  ensureDirectories() {
    ;[this.outputDir, this.tempDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        console.log(`📁 Created directory: ${dir}`)
      }
    })
  }

  verifyFont() {
    if (fs.existsSync(this.fontPath)) {
      console.log(`✅ Font found: ${this.fontPath}`)
    } else {
      console.log(`❌ Font not found: ${this.fontPath}`)
    }
  }

  async createGifDirect(videoPath, startTime, duration, caption, outputPath) {
    try {
      console.log(`🎬 Creating GIF...`)
      console.log(`📁 Input: ${videoPath}`)
      console.log(`📁 Output: ${outputPath}`)
      console.log(`⏱️ Time: ${startTime}s for ${duration}s`)

      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true })
      }

      const cleanCaption = caption.replace(/['"]/g, "").replace(/:/g, "").substring(0, 25)

      // Build FFmpeg command for high-quality GIF
      let command

      if (fs.existsSync(this.fontPath)) {
        // With captions
        const fontPath = this.fontPath.replace(/\\/g, "/")
        command = [
          this.ffmpegPath,
          "-y", // Overwrite output
          `-ss ${startTime}`,
          `-t ${duration}`,
          `-i "${videoPath}"`,
          `-vf "fps=12,scale=480:-1:flags=lanczos,drawtext=text='${cleanCaption}':fontfile='${fontPath}':fontsize=18:fontcolor=white:x=(w-text_w)/2:y=h-30:box=1:boxcolor=black@0.8:boxborderw=3"`,
          "-pix_fmt rgb24",
          `"${outputPath}"`,
        ].join(" ")
      } else {
        // Without captions
        command = [
          this.ffmpegPath,
          "-y",
          `-ss ${startTime}`,
          `-t ${duration}`,
          `-i "${videoPath}"`,
          `-vf "fps=12,scale=480:-1:flags=lanczos"`,
          "-pix_fmt rgb24",
          `"${outputPath}"`,
        ].join(" ")
      }

      console.log(`🔧 Running: ${command}`)

      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 1 minute timeout
        maxBuffer: 1024 * 1024 * 50, // 50MB buffer
      })

      if (stderr && stderr.includes("Error")) {
        console.warn("⚠️ FFmpeg stderr:", stderr)
      }

      // Verify the GIF was created and is not empty
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        console.log("✅ GIF created successfully")
        return { success: true, hasCaption: fs.existsSync(this.fontPath) }
      } else {
        throw new Error("GIF was not created or is empty")
      }
    } catch (error) {
      console.error("❌ GIF creation failed:", error)

      // Try with simpler settings if the first attempt fails
      if (!error.message.includes("timeout")) {
        console.log("🔄 Retrying with simpler settings...")
        return await this.createSimpleGif(videoPath, startTime, duration, outputPath)
      }

      throw error
    }
  }

  async createSimpleGif(videoPath, startTime, duration, outputPath) {
    try {
      // Simpler command without advanced filters
      const simpleCommand = [
        this.ffmpegPath,
        "-y",
        `-ss ${startTime}`,
        `-t ${duration}`,
        `-i "${videoPath}"`,
        `-vf "fps=10,scale=400:-1"`,
        `"${outputPath}"`,
      ].join(" ")

      console.log(`🔧 Simple GIF command: ${simpleCommand}`)

      await execAsync(simpleCommand, {
        timeout: 30000,
        maxBuffer: 1024 * 1024 * 25,
      })

      return { success: true, hasCaption: false }
    } catch (error) {
      console.error("❌ Simple GIF creation also failed:", error)
      throw error
    }
  }

  async createGif(videoPath, moment) {
    const gifId = uuidv4()
    const outputPath = path.join(this.outputDir, `${gifId}.gif`)
    const duration = moment.endTime - moment.startTime

    // Validate inputs
    if (duration <= 0 || duration > 15) {
      throw new Error(`Invalid duration: ${duration}s (must be between 0 and 15 seconds)`)
    }

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video not found: ${videoPath}`)
    }

    // Ensure start time is not negative
    const startTime = Math.max(0, moment.startTime)

    console.log(`🎬 Creating GIF ${gifId}`)
    console.log(`⏱️ Duration: ${duration}s`)
    console.log(`📝 Caption: ${moment.caption}`)

    const result = await this.createGifDirect(videoPath, startTime, duration, moment.caption, outputPath)

    return {
      id: gifId,
      path: outputPath,
      caption: moment.caption,
      startTime: moment.startTime,
      endTime: moment.endTime,
      size: this.getFileSize(outputPath),
      hasCaption: result.hasCaption,
    }
  }

  getFileSize(filePath) {
    if (!fs.existsSync(filePath)) return "0KB"
    const stats = fs.statSync(filePath)
    const sizeKB = Math.round(stats.size / 1024)

    if (sizeKB > 1024) {
      return `${(sizeKB / 1024).toFixed(1)}MB`
    }
    return `${sizeKB}KB`
  }

  async cleanup(filePath) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log("🗑️ Cleaned up GIF file:", path.basename(filePath))
      }
    } catch (error) {
      console.error("❌ Error cleaning up GIF file:", error)
    }
  }
}

export default new GifService()
