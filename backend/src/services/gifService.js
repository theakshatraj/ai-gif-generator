import { exec } from "child_process"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"
import { promisify } from "util"

const execAsync = promisify(exec)

class GifService {
  constructor() {
    this.outputDir = path.join(process.cwd(), "output")
    this.tempDir = path.join(process.cwd(), "temp")
    this.fontPath = path.join(process.cwd(), "assets", "fonts", "OpenSans-Regular.ttf")
    this.ffmpegPath = "C:\\Program Files (x86)\\ffmpeg-2025-05-21-git-4099d53759-full_build\\bin\\ffmpeg.exe"

    // Verify font exists
    this.verifyFont()
  }

  verifyFont() {
    if (fs.existsSync(this.fontPath)) {
      console.log(`✅ Font found: ${this.fontPath}`)
    } else {
      console.log(`❌ Font not found: ${this.fontPath}`)
      console.log("⚠️ Will attempt to create GIFs without captions")
    }
  }

  // Create GIF using direct FFmpeg command - more reliable
  async createGifDirect(videoPath, startTime, duration, caption, outputPath) {
    try {
      console.log(`🎬 Creating GIF directly with FFmpeg...`)
      console.log(`📁 Input: ${videoPath}`)
      console.log(`📁 Output: ${outputPath}`)
      console.log(`💬 Caption: ${caption}`)

      // Ensure output directory exists
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true })
      }

      // Clean caption text - remove problematic characters
      const cleanCaption = caption.replace(/['"]/g, "").replace(/:/g, "").substring(0, 25)

      // Try with caption first
      if (fs.existsSync(this.fontPath)) {
        // Use Windows-style path with proper escaping
        const fontPathEscaped = this.fontPath.replace(/\\/g, "\\\\").replace(/:/g, "\\:")

        const command = `"${this.ffmpegPath}" -ss ${startTime} -t ${duration} -i "${videoPath}" -vf "fps=10,scale=400:-1:flags=lanczos,drawtext=text='${cleanCaption}':fontfile='${fontPathEscaped}':fontsize=16:fontcolor=white:x=(w-text_w)/2:y=h-25:box=1:boxcolor=black@0.7:boxborderw=2" -y "${outputPath}"`

        console.log(`🔧 FFmpeg command with caption: ${command}`)

        try {
          const { stdout, stderr } = await execAsync(command, { timeout: 30000 })

          if (stderr && !stderr.includes("frame=")) {
            console.log(`⚠️ FFmpeg stderr: ${stderr}`)
          }

          if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
            console.log("✅ GIF with caption created successfully")
            return { success: true, hasCaption: true }
          }
        } catch (captionError) {
          console.log(`⚠️ Caption creation failed: ${captionError.message}`)

          // Try alternative font path format
          console.log("🔄 Trying alternative font path format...")
          const altFontPath = this.fontPath.replace(/\\/g, "/")
          const altCommand = `"${this.ffmpegPath}" -ss ${startTime} -t ${duration} -i "${videoPath}" -vf "fps=10,scale=400:-1:flags=lanczos,drawtext=text='${cleanCaption}':fontfile='${altFontPath}':fontsize=16:fontcolor=white:x=(w-text_w)/2:y=h-25:box=1:boxcolor=black@0.7:boxborderw=2" -y "${outputPath}"`

          try {
            const { stdout: altStdout, stderr: altStderr } = await execAsync(altCommand, { timeout: 30000 })

            if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
              console.log("✅ GIF with caption created successfully (alternative method)")
              return { success: true, hasCaption: true }
            }
          } catch (altError) {
            console.log(`⚠️ Alternative caption method also failed: ${altError.message}`)
          }
        }
      }

      // Fallback to simple GIF without caption
      console.log("🔄 Creating simple GIF without caption...")

      const simpleCommand = `"${this.ffmpegPath}" -ss ${startTime} -t ${duration} -i "${videoPath}" -vf "fps=10,scale=400:-1:flags=lanczos" -y "${outputPath}"`

      console.log(`🔧 FFmpeg simple command: ${simpleCommand}`)

      const { stdout, stderr } = await execAsync(simpleCommand, { timeout: 30000 })

      if (stderr && !stderr.includes("frame=")) {
        console.log(`⚠️ FFmpeg stderr: ${stderr}`)
      }

      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        console.log("✅ Simple GIF created successfully")
        return { success: true, hasCaption: false }
      } else {
        throw new Error("GIF file was not created or is empty")
      }
    } catch (error) {
      console.error("❌ Direct GIF creation failed:", error)
      throw error
    }
  }

  async createGif(videoPath, moment) {
    const gifId = uuidv4()
    const outputPath = path.join(this.outputDir, `${gifId}.gif`)

    try {
      console.log(`🎨 Creating GIF for moment: ${moment.startTime}s - ${moment.endTime}s`)
      console.log(`📁 Output path: ${outputPath}`)

      const duration = moment.endTime - moment.startTime

      // Validate duration
      if (duration <= 0 || duration > 10) {
        throw new Error(`Invalid duration: ${duration}s`)
      }

      // Validate input video exists
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Input video not found: ${videoPath}`)
      }

      // Create GIF using direct FFmpeg command
      const result = await this.createGifDirect(videoPath, moment.startTime, duration, moment.caption, outputPath)

      return {
        id: gifId,
        path: outputPath,
        caption: moment.caption,
        startTime: moment.startTime,
        endTime: moment.endTime,
        size: this.getFileSize(outputPath),
        hasCaption: result.hasCaption,
      }
    } catch (error) {
      console.error("❌ Failed to create GIF:", error)
      throw error
    }
  }

  getFileSize(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return "0KB"
      }
      const stats = fs.statSync(filePath)
      const fileSizeInBytes = stats.size
      const fileSizeInKB = Math.round(fileSizeInBytes / 1024)
      return `${fileSizeInKB}KB`
    } catch (error) {
      console.error("❌ Error getting file size:", error)
      return "Unknown"
    }
  }
}

export default new GifService()
