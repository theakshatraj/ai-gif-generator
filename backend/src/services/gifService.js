import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { promisify } from "util";

const execAsync = promisify(exec);

class GifService {
  constructor() {
    this.outputDir = path.join(process.cwd(), "output");
    this.tempDir = path.join(process.cwd(), "temp");
    this.fontPath = path.join(process.cwd(), "assets", "fonts", "OpenSans-Regular.ttf");
    this.ffmpegPath = "ffmpeg";  // ✅ Use system ffmpeg path

    this.verifyFont();
  }

  verifyFont() {
    if (fs.existsSync(this.fontPath)) {
      console.log(`✅ Font found: ${this.fontPath}`);
    } else {
      console.log(`❌ Font not found: ${this.fontPath}`);
    }
  }

  async createGifDirect(videoPath, startTime, duration, caption, outputPath) {
    try {
      console.log(`🎬 Creating GIF...`);

      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }

      const cleanCaption = caption.replace(/['"]/g, "").replace(/:/g, "").substring(0, 25);

      let command = `${this.ffmpegPath} -ss ${startTime} -t ${duration} -i "${videoPath}" -vf "fps=10,scale=400:-1:flags=lanczos" -y "${outputPath}"`;

      if (fs.existsSync(this.fontPath)) {
        const fontPath = this.fontPath.replace(/\\/g, "/");
        command = `${this.ffmpegPath} -ss ${startTime} -t ${duration} -i "${videoPath}" -vf "fps=10,scale=400:-1:flags=lanczos,drawtext=text='${cleanCaption}':fontfile='${fontPath}':fontsize=16:fontcolor=white:x=(w-text_w)/2:y=h-25:box=1:boxcolor=black@0.7:boxborderw=2" -y "${outputPath}"`;
      }

      console.log(`🔧 Running: ${command}`);
      await execAsync(command);

      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        console.log("✅ GIF created successfully");
        return { success: true, hasCaption: fs.existsSync(this.fontPath) };
      } else {
        throw new Error("GIF was not created");
      }
    } catch (error) {
      console.error("❌ GIF creation failed:", error);
      throw error;
    }
  }

  async createGif(videoPath, moment) {
    const gifId = uuidv4();
    const outputPath = path.join(this.outputDir, `${gifId}.gif`);
    const duration = moment.endTime - moment.startTime;

    if (duration <= 0 || duration > 10) throw new Error(`Invalid duration: ${duration}s`);
    if (!fs.existsSync(videoPath)) throw new Error(`Video not found: ${videoPath}`);

    const result = await this.createGifDirect(videoPath, moment.startTime, duration, moment.caption, outputPath);

    return {
      id: gifId,
      path: outputPath,
      caption: moment.caption,
      startTime: moment.startTime,
      endTime: moment.endTime,
      size: this.getFileSize(outputPath),
      hasCaption: result.hasCaption,
    };
  }

  getFileSize(filePath) {
    if (!fs.existsSync(filePath)) return "0KB";
    const stats = fs.statSync(filePath);
    return `${Math.round(stats.size / 1024)}KB`;
  }
}

export default new GifService();