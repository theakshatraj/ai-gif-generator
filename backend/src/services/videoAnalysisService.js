import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import OpenAI from "openai";

const execAsync = promisify(exec);

class VideoAnalysisService {
  constructor() {
    this.ffmpegPath = "ffmpeg";
    this.tempDir = path.join(process.cwd(), "temp");
    
    // Initialize OpenAI client for vision analysis
    this.openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI GIF Generator",
      },
    });
  }

  async extractFramesForAnalysis(videoPath, videoDuration, maxFrames = 6) {
    const frameDir = path.join(this.tempDir, `frames_${Date.now()}`);
    if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir, { recursive: true });

    // Extract frames at strategic intervals for better analysis
    const frameInterval = Math.max(1, Math.floor(videoDuration / maxFrames));
    const command = `${this.ffmpegPath} -i "${videoPath}" -vf "fps=1/${frameInterval}" -frames:v ${maxFrames} "${frameDir}/frame_%03d.jpg"`;
    
    try {
      await execAsync(command);
      
      const frames = fs.readdirSync(frameDir)
        .filter(f => f.endsWith(".jpg"))
        .sort()
        .map((file, idx) => ({
          timestamp: idx * frameInterval,
          path: path.join(frameDir, file),
          filename: file,
        }));

      return { frames, frameDir };
    } catch (error) {
      console.error("❌ Frame extraction failed:", error);
      throw error;
    }
  }

  async analyzeFrameContent(framePath) {
    try {
      // Convert frame to base64 for OpenAI Vision
      const imageBuffer = fs.readFileSync(framePath);
      const base64Image = imageBuffer.toString('base64');
      
      const response = await this.openai.chat.completions.create({
        model: "openai/gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this video frame and describe what's happening in 1-2 sentences. Focus on: actions, emotions, objects, people, setting, and any notable visual elements that would be good for a GIF."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "low" // Use low detail for faster processing
                }
              }
            ]
          }
        ],
        max_tokens: 100,
        temperature: 0.3
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error("❌ Frame analysis failed:", error);
      return "Unable to analyze frame content";
    }
  }

  async analyzeVideoContent(videoPath, videoDuration, prompt) {
    try {
      console.log("🔍 Analyzing video content with enhanced AI vision...");

      // Extract frames for analysis
      const { frames, frameDir } = await this.extractFramesForAnalysis(videoPath, videoDuration);
      
      if (frames.length === 0) {
        console.log("⚠️ No frames extracted, using basic analysis");
        return this.createBasicAnalysis(videoDuration, prompt);
      }

      // Analyze each frame with AI vision
      const frameAnalyses = [];
      for (const frame of frames) {
        console.log(`🔍 Analyzing frame at ${frame.timestamp}s...`);
        const analysis = await this.analyzeFrameContent(frame.path);
        frameAnalyses.push({
          timestamp: frame.timestamp,
          analysis: analysis
        });
      }

      // Detect scene changes for better segmentation
      const sceneChanges = await this.detectSceneChanges(videoPath, videoDuration);
      
      // Create segments based on actual content analysis
      const segments = await this.createContentAwareSegments(
        frameAnalyses, 
        sceneChanges, 
        videoDuration, 
        prompt
      );

      // Clean up frame directory
      this.cleanupFrames(frameDir);

      const transcript = {
        text: segments.map(seg => seg.text).join(" "),
        segments: segments,
        contentAnalysis: frameAnalyses, // Include frame analysis for AI processing
      };

      console.log("✅ Enhanced video content analysis completed");
      console.log(`📊 Created ${segments.length} content-aware segments`);
      
      return transcript;
    } catch (error) {
      console.error("❌ Enhanced video analysis failed:", error);
      return this.createBasicAnalysis(videoDuration, prompt);
    }
  }

  async createContentAwareSegments(frameAnalyses, sceneChanges, videoDuration, prompt) {
    const segments = [];
    
    // Combine frame analysis with scene changes for better segmentation
    const keyTimes = [
      0, 
      ...sceneChanges.filter(time => time > 0 && time < videoDuration),
      videoDuration
    ].sort((a, b) => a - b);

    // Create segments between key times
    for (let i = 0; i < keyTimes.length - 1; i++) {
      const startTime = keyTimes[i];
      const endTime = keyTimes[i + 1];
      
      // Find the most relevant frame analysis for this segment
      const relevantFrame = frameAnalyses.find(frame => 
        frame.timestamp >= startTime && frame.timestamp < endTime
      ) || frameAnalyses[Math.floor(i * frameAnalyses.length / (keyTimes.length - 1))];

      const description = this.generateContextualDescription(
        startTime, 
        endTime, 
        videoDuration, 
        relevantFrame?.analysis || "Video content", 
        prompt
      );

      segments.push({
        start: startTime,
        end: endTime,
        text: description,
        frameAnalysis: relevantFrame?.analysis
      });
    }

    return segments;
  }

  generateContextualDescription(startTime, endTime, totalDuration, frameAnalysis, prompt) {
    const position = startTime / totalDuration;
    
    // Base description on actual frame content
    let description = frameAnalysis;
    
    // Add temporal context
    if (position < 0.2) {
      description = `Opening: ${description}`;
    } else if (position < 0.4) {
      description = `Early scene: ${description}`;
    } else if (position < 0.6) {
      description = `Mid-video: ${description}`;
    } else if (position < 0.8) {
      description = `Later scene: ${description}`;
    } else {
      description = `Ending: ${description}`;
    }

    // Add timing context
    description += ` (${Math.floor(startTime)}s-${Math.floor(endTime)}s)`;

    return description;
  }

  async detectSceneChanges(videoPath, videoDuration) {
    try {
      console.log("🎬 Detecting scene changes...");

      const outputFile = path.join(this.tempDir, `scenes_${Date.now()}.txt`);
      
      // Use FFmpeg scene detection with better parameters
      const command = `"${this.ffmpegPath}" -i "${videoPath}" -vf "select='gt(scene,0.4)',metadata=print:file=${outputFile}" -f null - 2>/dev/null`;

      await execAsync(command, { timeout: 30000 });

      const sceneChanges = [];
      if (fs.existsSync(outputFile)) {
        const content = fs.readFileSync(outputFile, "utf8");
        const lines = content.split("\n");
        
        for (const line of lines) {
          const match = line.match(/pts_time:(\d+\.?\d*)/);
          if (match) {
            sceneChanges.push(parseFloat(match[1]));
          }
        }

        fs.unlinkSync(outputFile);
      }

      console.log(`✅ Detected ${sceneChanges.length} scene changes`);
      return sceneChanges;
    } catch (error) {
      console.error("❌ Scene detection failed:", error);
      return [];
    }
  }

  createBasicAnalysis(videoDuration, prompt) {
    console.log("📋 Creating basic content analysis...");

    const segments = [];
    const segmentCount = Math.min(6, Math.max(3, Math.floor(videoDuration / 3)));
    const segmentDuration = videoDuration / segmentCount;

    for (let i = 0; i < segmentCount; i++) {
      const startTime = i * segmentDuration;
      const endTime = Math.min((i + 1) * segmentDuration, videoDuration);

      segments.push({
        start: startTime,
        end: endTime,
        text: `Video segment ${i + 1} (${Math.floor(startTime)}s-${Math.floor(endTime)}s)`,
      });
    }

    return {
      text: segments.map(seg => seg.text).join(" "),
      segments: segments,
    };
  }

  cleanupFrames(frameDir) {
    try {
      if (fs.existsSync(frameDir)) {
        const files = fs.readdirSync(frameDir);
        for (const file of files) {
          fs.unlinkSync(path.join(frameDir, file));
        }
        fs.rmdirSync(frameDir);
        console.log("🗑️ Cleaned up extracted frames");
      }
    } catch (error) {
      console.error("❌ Failed to cleanup frames:", error);
    }
  }
}

export default new VideoAnalysisService();