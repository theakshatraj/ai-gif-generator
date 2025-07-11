import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"
import { v4 as uuidv4 } from "uuid"

const execAsync = promisify(exec)

class GifService {
  constructor() {
    this.outputDir = path.join(process.cwd(), "output")
    this.tempDir = path.join(process.cwd(), "temp") // Ensure tempDir is also initialized if used
    this.fontPath = path.join(process.cwd(), "assets", "fonts", "OpenSans-Regular.ttf")
    this.ffmpegPath = "ffmpeg" // Use system ffmpeg path
    this.verifyFont()
    this.ensureDirectories() // Ensure output and temp directories exist
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

  async createGif(videoPath, moment, videoInfo) {
    const gifId = uuidv4()
    const outputPath = path.join(this.outputDir, `${gifId}.gif`)
    const duration = moment.endTime - moment.startTime

    if (duration <= 0 || duration > 10) {
      throw new Error(`Invalid duration: ${duration}s`)
    }
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video not found: ${videoPath}`)
    }

    // Default width if videoInfo.width is not available
    const width = videoInfo?.width || 400

    let command = `${this.ffmpegPath} -ss ${moment.startTime} -i "${videoPath}" -t ${duration} -vf "fps=10,scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "${outputPath}"`

    if (moment.caption && fs.existsSync(this.fontPath)) {
      const cleanCaption = moment.caption.replace(/['"]/g, "").replace(/:/g, "").substring(0, 100) // Limit caption length for display
      const fontSize = 24
      command = `${this.ffmpegPath} -ss ${moment.startTime} -i "${videoPath}" -t ${duration} -vf "fps=10,scale=${width}:-1:flags=lanczos,drawtext=text='${cleanCaption}':fontfile='${this.fontPath.replace(/\\/g, "/")}':fontsize=${fontSize}:fontcolor=white:x=(w-text_w)/2:y=h-line_h-10:box=1:boxcolor=black@0.7:boxborderw=2,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "${outputPath}"`
    } else if (moment.caption && !fs.existsSync(this.fontPath)) {
      console.warn(
        `⚠️ Font file not found at ${this.fontPath}. GIFs will be generated without custom font, but with default text if possible.`,
      )
      const cleanCaption = moment.caption.replace(/['"]/g, "").replace(/:/g, "").substring(0, 100)
      const fontSize = 24
      command = `${this.ffmpegPath} -ss ${moment.startTime} -i "${videoPath}" -t ${duration} -vf "fps=10,scale=${width}:-1:flags=lanczos,drawtext=text='${cleanCaption}':fontsize=${fontSize}:fontcolor=white:x=(w-text_w)/2:y=h-line_h-10:box=1:boxcolor=black@0.7:boxborderw=2,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "${outputPath}"`
    }

    console.log(`🎨 Creating GIF...`)
    console.log(`🔧 Running: ${command}`)

    try {
      await execAsync(command)
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        console.log("✅ GIF created successfully")
        return {
          id: gifId,
          path: outputPath,
          caption: moment.caption,
          startTime: moment.startTime,
          endTime: moment.endTime,
          size: this.getFileSize(outputPath),
          hasCaption: !!moment.caption,
        }
      } else {
        throw new Error("GIF was not created or is empty")
      }
    } catch (error) {
      console.error("❌ GIF creation failed:", error)
      throw error
    }
  }

  async createTextGif(moment, videoInfo) {
    const gifId = uuidv4()
    const outputPath = path.join(this.outputDir, `${gifId}.gif`)
    const duration = moment.endTime - moment.startTime

    if (duration <= 0 || duration > 10) {
      throw new Error(`Invalid duration for text GIF: ${duration}s`)
    }

    const cleanCaption = moment.caption.replace(/['"]/g, "").replace(/:/g, "").substring(0, 100) // Limit caption length for display
    const backgroundColor = "black" // Or any other color
    const textColor = "white"
    const fontSize = 24
    const width = 400
    const height = 200

    let command = `${this.ffmpegPath} -f lavfi -i color=${backgroundColor}:s=${width}x${height}:d=${duration} -vf "drawtext=text='${cleanCaption}':fontfile='${this.fontPath.replace(/\\/g, "/")}':fontsize=${fontSize}:fontcolor=${textColor}:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.7:boxborderw=2,fps=10,scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -y "${outputPath}"`

    if (!fs.existsSync(this.fontPath)) {
      console.warn(`⚠️ Font file not found at ${this.fontPath}. Text GIFs will be generated without custom font.`)
      command = `${this.ffmpegPath} -f lavfi -i color=${backgroundColor}:s=${width}x${height}:d=${duration} -vf "drawtext=text='${cleanCaption}':fontsize=${fontSize}:fontcolor=${textColor}:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.7:boxborderw=2,fps=10,scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -y "${outputPath}"`
    }

    console.log(`🎨 Creating text GIF...`)
    console.log(`🔧 Running: ${command}`)

    try {
      await execAsync(command)
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        console.log("✅ Text GIF created successfully")
        return {
          id: gifId,
          path: outputPath,
          caption: moment.caption,
          startTime: moment.startTime,
          endTime: moment.endTime,
          size: this.getFileSize(outputPath),
          hasCaption: true, // Always has caption for text GIFs
        }
      } else {
        throw new Error("Text GIF was not created or is empty")
      }
    } catch (error) {
      console.error("❌ Text GIF creation failed:", error)
      throw error
    }
  }

  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath)
      return stats.size
    } catch (error) {
      console.error(`Error getting file size for ${filePath}:`, error)
      return 0
    }
  }
}

export default new GifService()
