import { exec } from "child_process"
import path from "path"
import fs from "fs"
import { promisify } from "util"

const execAsync = promisify(exec)

class VisualContextService {
  constructor() {
    this.tempDir = path.join(process.cwd(), "temp")
    this.ffmpegPath = "ffmpeg"
  }

  // NEW: Analyze visual content for videos without dialogue
  async analyzeVisualContent(videoPath, videoDuration, prompt) {
    try {
      console.log("👁️ Analyzing visual content for non-dialogue video...")
      console.log(`🎯 User prompt: "${prompt}"`)

      // Extract key frames for visual analysis
      const keyFrames = await this.extractKeyFrames(videoPath, videoDuration)

      // Analyze visual elements
      const visualElements = await this.analyzeVisualElements(keyFrames, videoDuration)

      // Analyze colors and composition
      const colorAnalysis = await this.analyzeColors(keyFrames)

      // Detect visual activities
      const activityAnalysis = await this.detectVisualActivities(videoPath, videoDuration)

      // Generate visual descriptions
      const visualDescriptions = await this.generateVisualDescriptions(
        visualElements,
        colorAnalysis,
        activityAnalysis,
        prompt,
      )

      // Create contextual segments based on visual analysis
      const visualSegments = this.createVisualSegments(visualDescriptions, activityAnalysis, videoDuration, prompt)

      console.log(`✅ Visual analysis completed: ${visualSegments.length} segments identified`)

      return {
        text: visualSegments.map((seg) => seg.description).join(" "),
        segments: visualSegments.map((seg) => ({
          start: seg.startTime,
          end: seg.endTime,
          text: seg.description,
        })),
        visualAnalysis: {
          keyFrames: keyFrames.length,
          visualElements,
          colorAnalysis,
          activityAnalysis,
          analysisMethod: "visual-content-analysis",
        },
      }
    } catch (error) {
      console.error("❌ Visual content analysis failed:", error)
      return this.createVisualFallback(videoDuration, prompt)
    }
  }

  // Extract key frames at strategic intervals
  async extractKeyFrames(videoPath, videoDuration) {
    try {
      const frameDir = path.join(this.tempDir, `visual_analysis_${Date.now()}`)
      if (!fs.existsSync(frameDir)) {
        fs.mkdirSync(frameDir, { recursive: true })
      }

      // Extract frames at strategic points (beginning, middle, end, and activity peaks)
      const framePoints = this.calculateFrameExtractionPoints(videoDuration)
      const frames = []

      for (let i = 0; i < framePoints.length; i++) {
        const timestamp = framePoints[i]
        const framePath = path.join(frameDir, `frame_${i}_${timestamp}s.jpg`)

        const command = `${this.ffmpegPath} -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}"`

        try {
          await execAsync(command, { timeout: 10000 })

          if (fs.existsSync(framePath)) {
            const stats = fs.statSync(framePath)
            frames.push({
              timestamp,
              path: framePath,
              size: stats.size,
              index: i,
            })
          }
        } catch (frameError) {
          console.log(`⚠️ Failed to extract frame at ${timestamp}s`)
        }
      }

      console.log(`📸 Extracted ${frames.length} key frames`)
      return frames
    } catch (error) {
      console.error("❌ Key frame extraction failed:", error)
      return []
    }
  }

  // Calculate optimal frame extraction points
  calculateFrameExtractionPoints(videoDuration) {
    const points = []

    // Always include beginning and end
    points.push(1) // 1 second in
    points.push(Math.max(2, videoDuration - 1)) // 1 second before end

    // Add middle points based on duration
    if (videoDuration > 10) {
      points.push(Math.floor(videoDuration * 0.25)) // 25%
      points.push(Math.floor(videoDuration * 0.5)) // 50%
      points.push(Math.floor(videoDuration * 0.75)) // 75%
    } else if (videoDuration > 5) {
      points.push(Math.floor(videoDuration * 0.5)) // 50%
    }

    // Add additional points for longer videos
    if (videoDuration > 30) {
      for (let i = 10; i < videoDuration - 5; i += 10) {
        points.push(i)
      }
    }

    return [...new Set(points)].sort((a, b) => a - b) // Remove duplicates and sort
  }

  // Analyze visual elements in frames
  async analyzeVisualElements(frames, videoDuration) {
    const analysis = {
      frameCount: frames.length,
      avgFrameSize: 0,
      sizeVariation: 0,
      visualComplexity: "medium",
      hasSignificantChanges: false,
      estimatedContentType: "general",
    }

    if (frames.length === 0) return analysis

    // Calculate average frame size and variation
    const sizes = frames.map((f) => f.size)
    analysis.avgFrameSize = sizes.reduce((a, b) => a + b, 0) / sizes.length

    if (sizes.length > 1) {
      const mean = analysis.avgFrameSize
      const variance = sizes.reduce((sum, size) => sum + Math.pow(size - mean, 2), 0) / sizes.length
      analysis.sizeVariation = Math.sqrt(variance) / mean
    }

    // Determine visual complexity
    if (analysis.avgFrameSize > 100000) {
      analysis.visualComplexity = "high"
    } else if (analysis.avgFrameSize < 30000) {
      analysis.visualComplexity = "low"
    }

    // Detect significant changes between frames
    analysis.hasSignificantChanges = analysis.sizeVariation > 0.3

    // Estimate content type based on frame characteristics
    analysis.estimatedContentType = this.estimateContentType(analysis)

    return analysis
  }

  // Analyze color patterns (basic implementation)
  async analyzeColors(frames) {
    // This is a simplified color analysis
    // In a production system, you might use image processing libraries

    return {
      dominantColors: ["unknown"], // Would need image processing library
      colorVariety: frames.length > 3 ? "varied" : "limited",
      brightness: "medium", // Would analyze actual pixel data
      contrast: "medium",
    }
  }

  // Detect visual activities using FFmpeg
  async detectVisualActivities(videoPath, videoDuration) {
    try {
      console.log("🏃 Detecting visual activities...")

      // Use FFmpeg to detect scene changes and motion
      const sceneChanges = await this.detectSceneChanges(videoPath, videoDuration)
      const motionLevels = await this.analyzeMotionLevels(videoPath, videoDuration)

      return {
        sceneChanges,
        motionLevels,
        hasHighActivity: sceneChanges.length > videoDuration / 5,
        hasMotion: motionLevels.peaks > 0,
        activityType: this.determineActivityType(sceneChanges, motionLevels),
      }
    } catch (error) {
      console.error("❌ Activity detection failed:", error)
      return {
        sceneChanges: [],
        motionLevels: { peaks: 0, avgMotion: 0 },
        hasHighActivity: false,
        hasMotion: false,
        activityType: "static",
      }
    }
  }

  // Detect scene changes
  async detectSceneChanges(videoPath, videoDuration) {
    try {
      const outputFile = path.join(this.tempDir, `scenes_${Date.now()}.log`)

      const command = `${this.ffmpegPath} -i "${videoPath}" -vf "select='gt(scene,0.3)',showinfo" -f null - 2>"${outputFile}"`

      await execAsync(command, { timeout: 60000 })

      const sceneChanges = []

      if (fs.existsSync(outputFile)) {
        const content = fs.readFileSync(outputFile, "utf8")
        const lines = content.split("\n")

        for (const line of lines) {
          const match = line.match(/pts_time:(\d+\.?\d*)/)
          if (match) {
            const timestamp = Number.parseFloat(match[1])
            if (timestamp > 0 && timestamp < videoDuration) {
              sceneChanges.push({
                timestamp,
                type: "scene_change",
              })
            }
          }
        }

        fs.unlinkSync(outputFile)
      }

      return sceneChanges
    } catch (error) {
      console.error("❌ Scene change detection failed:", error)
      return []
    }
  }

  // Analyze motion levels
  async analyzeMotionLevels(videoPath, videoDuration) {
    try {
      // Simplified motion analysis - in production, you'd use more sophisticated methods
      const outputFile = path.join(this.tempDir, `motion_${Date.now()}.log`)

      const command = `${this.ffmpegPath} -i "${videoPath}" -vf "select='gt(scene,0.1)',showinfo" -f null - 2>"${outputFile}"`

      await execAsync(command, { timeout: 60000 })

      let peaks = 0

      if (fs.existsSync(outputFile)) {
        const content = fs.readFileSync(outputFile, "utf8")
        peaks = (content.match(/pts_time:/g) || []).length
        fs.unlinkSync(outputFile)
      }

      return {
        peaks,
        avgMotion: peaks / Math.max(1, videoDuration),
        motionType: peaks > videoDuration / 3 ? "high" : peaks > videoDuration / 10 ? "medium" : "low",
      }
    } catch (error) {
      console.error("❌ Motion analysis failed:", error)
      return { peaks: 0, avgMotion: 0, motionType: "unknown" }
    }
  }

  // Generate visual descriptions based on analysis
  async generateVisualDescriptions(visualElements, colorAnalysis, activityAnalysis, prompt) {
    const descriptions = []

    // Base description on visual complexity
    let baseDescription = ""
    if (visualElements.visualComplexity === "high") {
      baseDescription = "visually rich content"
    } else if (visualElements.visualComplexity === "low") {
      baseDescription = "simple visual content"
    } else {
      baseDescription = "moderate visual content"
    }

    // Add activity description
    if (activityAnalysis.hasHighActivity) {
      baseDescription += " with dynamic scenes"
    } else if (activityAnalysis.hasMotion) {
      baseDescription += " with some movement"
    } else {
      baseDescription += " with static scenes"
    }

    // Match with prompt context
    const promptLower = prompt.toLowerCase()

    if (/action|sport|dance|move/.test(promptLower) && activityAnalysis.hasMotion) {
      descriptions.push("action-packed moments")
    }

    if (/beautiful|scenic|view|landscape/.test(promptLower)) {
      descriptions.push("scenic visual content")
    }

    if (/funny|comedy/.test(promptLower)) {
      descriptions.push("potentially comedic visual moments")
    }

    if (/dramatic|intense/.test(promptLower)) {
      descriptions.push("visually dramatic scenes")
    }

    // Add base description if no specific matches
    if (descriptions.length === 0) {
      descriptions.push(baseDescription)
    }

    return descriptions
  }

  // Create visual segments for GIF generation
  createVisualSegments(visualDescriptions, activityAnalysis, videoDuration, prompt) {
    const segments = []
    const promptContext = this.analyzePromptForVisuals(prompt)

    // Create segments based on scene changes and activity
    const sceneChanges = activityAnalysis.sceneChanges || []

    if (sceneChanges.length > 0) {
      // Use scene changes to create segments
      for (let i = 0; i < Math.min(6, sceneChanges.length); i++) {
        const sceneChange = sceneChanges[i]
        const startTime = Math.max(0, sceneChange.timestamp - 1)
        const endTime = Math.min(videoDuration, sceneChange.timestamp + 2)

        segments.push({
          startTime,
          endTime,
          description: this.generateSegmentDescription(promptContext, i, "scene_change"),
          confidence: 0.7,
          visualContext: "scene_transition",
        })
      }
    } else {
      // Create time-based segments with visual context
      const segmentCount = Math.min(6, Math.max(3, Math.floor(videoDuration / 3)))
      const segmentDuration = videoDuration / segmentCount

      for (let i = 0; i < segmentCount; i++) {
        const startTime = i * segmentDuration
        const endTime = Math.min((i + 1) * segmentDuration, videoDuration)

        segments.push({
          startTime,
          endTime,
          description: this.generateSegmentDescription(promptContext, i, "time_based"),
          confidence: 0.5,
          visualContext: "time_segment",
        })
      }
    }

    return segments.slice(0, 6) // Limit to 6 segments
  }

  // Generate segment descriptions based on visual context
  generateSegmentDescription(promptContext, index, segmentType) {
    const positions = ["opening", "early", "middle", "later", "closing", "final"]
    const position = positions[index] || "moment"

    let description = `${position} visual content`

    // Add context based on prompt
    if (promptContext.isAction) {
      description = `${position} action sequence`
    } else if (promptContext.isScenic) {
      description = `${position} scenic view`
    } else if (promptContext.isEmotional) {
      description = `${position} emotional moment`
    } else if (promptContext.isComedy) {
      description = `${position} comedic scene`
    }

    // Add segment type context
    if (segmentType === "scene_change") {
      description += " with transition"
    }

    return description
  }

  // Analyze prompt for visual context
  analyzePromptForVisuals(prompt) {
    const promptLower = prompt.toLowerCase()

    return {
      isAction: /action|sport|dance|move|jump|run|active/.test(promptLower),
      isScenic: /beautiful|scenic|view|landscape|nature|sunset|mountain/.test(promptLower),
      isEmotional: /emotional|touching|sad|happy|joy|love/.test(promptLower),
      isComedy: /funny|comedy|comedic|hilarious|laugh/.test(promptLower),
      isDramatic: /dramatic|intense|serious|powerful/.test(promptLower),
      isArt: /art|artistic|creative|design|color/.test(promptLower),
    }
  }

  // Helper methods
  estimateContentType(analysis) {
    if (analysis.hasSignificantChanges && analysis.visualComplexity === "high") {
      return "dynamic"
    } else if (analysis.visualComplexity === "high") {
      return "detailed"
    } else if (analysis.hasSignificantChanges) {
      return "changing"
    } else {
      return "static"
    }
  }

  determineActivityType(sceneChanges, motionLevels) {
    if (sceneChanges.length > 5 && motionLevels.peaks > 10) {
      return "high_activity"
    } else if (sceneChanges.length > 2 || motionLevels.peaks > 5) {
      return "medium_activity"
    } else {
      return "low_activity"
    }
  }

  // Create fallback for visual analysis
  createVisualFallback(videoDuration, prompt) {
    console.log("📋 Creating visual analysis fallback...")

    const promptContext = this.analyzePromptForVisuals(prompt)
    const segmentCount = Math.min(6, Math.max(3, Math.floor(videoDuration / 3)))
    const segments = []

    for (let i = 0; i < segmentCount; i++) {
      const startTime = (i / segmentCount) * videoDuration
      const endTime = Math.min(((i + 1) / segmentCount) * videoDuration, videoDuration)

      segments.push({
        start: startTime,
        end: endTime,
        text: this.generateSegmentDescription(promptContext, i, "fallback"),
      })
    }

    return {
      text: segments.map((seg) => seg.text).join(" "),
      segments: segments,
      visualAnalysis: {
        analysisMethod: "fallback",
        promptContext,
      },
    }
  }

  // Cleanup method
  cleanup() {
    // Clean up any temporary files created during analysis
    try {
      const tempFiles = fs
        .readdirSync(this.tempDir)
        .filter(
          (file) => file.startsWith("visual_analysis_") || file.startsWith("scenes_") || file.startsWith("motion_"),
        )

      tempFiles.forEach((file) => {
        const filePath = path.join(this.tempDir, file)
        if (fs.existsSync(filePath)) {
          if (fs.statSync(filePath).isDirectory()) {
            this.cleanupDirectory(filePath)
          } else {
            fs.unlinkSync(filePath)
          }
        }
      })
    } catch (error) {
      console.error("❌ Cleanup failed:", error)
    }
  }

  cleanupDirectory(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath)
        for (const file of files) {
          const filePath = path.join(dirPath, file)
          if (fs.statSync(filePath).isDirectory()) {
            this.cleanupDirectory(filePath)
          } else {
            fs.unlinkSync(filePath)
          }
        }
        fs.rmdirSync(dirPath)
      }
    } catch (error) {
      console.error(`❌ Failed to cleanup directory ${dirPath}:`, error)
    }
  }
}

export default new VisualContextService()
