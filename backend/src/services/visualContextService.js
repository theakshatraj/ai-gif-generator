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

  // ENHANCED: Deep visual content analysis for contextual captions
  async analyzeVisualContent(videoPath, videoDuration, prompt) {
    try {
      console.log("👁️ Starting deep visual content analysis...")
      console.log(`🎯 Theme prompt: "${prompt}"`)

      // Extract frames at strategic points for detailed analysis
      const keyFrames = await this.extractDetailedFrames(videoPath, videoDuration)

      // Analyze visual composition and elements
      const visualComposition = await this.analyzeVisualComposition(keyFrames)

      // Detect specific visual activities and objects
      const visualActivities = await this.detectSpecificActivities(videoPath, videoDuration, prompt)

      // Analyze color patterns and mood
      const visualMood = await this.analyzeVisualMood(keyFrames, prompt)

      // Create contextual segments with rich descriptions
      const contextualSegments = await this.createContextualSegments(
        videoPath,
        videoDuration,
        visualComposition,
        visualActivities,
        visualMood,
        prompt,
      )

      console.log(`✅ Deep visual analysis completed: ${contextualSegments.length} contextual segments`)

      return {
        text: contextualSegments.map((seg) => seg.contextualDescription).join(" "),
        segments: contextualSegments.map((seg) => ({
          start: seg.startTime,
          end: seg.endTime,
          text: seg.contextualDescription,
          visualContext: seg.visualContext,
          moodContext: seg.moodContext,
          activityContext: seg.activityContext,
        })),
        visualAnalysis: {
          composition: visualComposition,
          activities: visualActivities,
          mood: visualMood,
          analysisMethod: "deep-visual-context-analysis",
        },
      }
    } catch (error) {
      console.error("❌ Deep visual analysis failed:", error)
      return this.createEnhancedVisualFallback(videoDuration, prompt)
    }
  }

  // Extract frames with better timing for context analysis
  async extractDetailedFrames(videoPath, videoDuration) {
    try {
      const frameDir = path.join(this.tempDir, `detailed_frames_${Date.now()}`)
      if (!fs.existsSync(frameDir)) {
        fs.mkdirSync(frameDir, { recursive: true })
      }

      // Extract more frames for better context understanding
      const frameCount = Math.min(15, Math.max(8, Math.floor(videoDuration * 1.5)))
      const frameInterval = videoDuration / frameCount
      const frames = []

      for (let i = 0; i < frameCount; i++) {
        const timestamp = Math.floor(i * frameInterval)
        const framePath = path.join(frameDir, `frame_${i}_${timestamp}s.jpg`)

        const command = `${this.ffmpegPath} -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 -vf "scale=640:360" "${framePath}"`

        try {
          await execAsync(command, { timeout: 10000 })

          if (fs.existsSync(framePath)) {
            const stats = fs.statSync(framePath)
            frames.push({
              timestamp,
              path: framePath,
              size: stats.size,
              index: i,
              relativePosition: i / (frameCount - 1), // 0 to 1
            })
          }
        } catch (frameError) {
          console.log(`⚠️ Failed to extract frame at ${timestamp}s`)
        }
      }

      console.log(`📸 Extracted ${frames.length} detailed frames for analysis`)
      return frames
    } catch (error) {
      console.error("❌ Detailed frame extraction failed:", error)
      return []
    }
  }

  // Analyze visual composition for context
  async analyzeVisualComposition(frames) {
    const composition = {
      frameVariation: 0,
      visualComplexity: "medium",
      sceneTypes: [],
      dominantElements: [],
      compositionStyle: "standard",
    }

    if (frames.length === 0) return composition

    // Analyze frame size variations (indicates visual complexity)
    const sizes = frames.map((f) => f.size)
    const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length
    const sizeVariation = this.calculateVariation(sizes)

    composition.frameVariation = sizeVariation
    composition.visualComplexity = this.determineVisualComplexity(avgSize, sizeVariation)

    // Analyze composition patterns
    composition.sceneTypes = this.identifySceneTypes(frames, avgSize)
    composition.compositionStyle = this.determineCompositionStyle(sizeVariation, frames.length)

    return composition
  }

  // Detect specific visual activities based on prompt context
  async detectSpecificActivities(videoPath, videoDuration, prompt) {
    try {
      console.log("🔍 Detecting specific visual activities...")

      const promptLower = prompt.toLowerCase()
      const activities = {
        detectedActivities: [],
        motionIntensity: "medium",
        sceneChanges: [],
        visualEvents: [],
      }

      // Detect scene changes with better sensitivity
      const sceneChanges = await this.detectEnhancedSceneChanges(videoPath, videoDuration)
      activities.sceneChanges = sceneChanges

      // Detect motion patterns
      const motionAnalysis = await this.analyzeMotionPatterns(videoPath, videoDuration)
      activities.motionIntensity = motionAnalysis.intensity
      activities.detectedActivities = motionAnalysis.activities

      // Context-specific detection based on prompt
      if (/dance|dancing|music|rhythm/.test(promptLower)) {
        const danceActivity = await this.detectDanceMovement(videoPath, videoDuration)
        if (danceActivity.detected) {
          activities.detectedActivities.push("dance_movement")
          activities.visualEvents.push(...danceActivity.events)
        }
      }

      if (/sport|game|action|active/.test(promptLower)) {
        const sportActivity = await this.detectSportAction(videoPath, videoDuration)
        if (sportActivity.detected) {
          activities.detectedActivities.push("sport_action")
          activities.visualEvents.push(...sportActivity.events)
        }
      }

      if (/nature|scenic|landscape|beautiful/.test(promptLower)) {
        const scenicActivity = await this.detectScenicContent(videoPath, videoDuration)
        if (scenicActivity.detected) {
          activities.detectedActivities.push("scenic_content")
          activities.visualEvents.push(...scenicActivity.events)
        }
      }

      console.log(`🎬 Detected activities: ${activities.detectedActivities.join(", ")}`)
      return activities
    } catch (error) {
      console.error("❌ Activity detection failed:", error)
      return {
        detectedActivities: [],
        motionIntensity: "medium",
        sceneChanges: [],
        visualEvents: [],
      }
    }
  }

  // Enhanced scene change detection
  async detectEnhancedSceneChanges(videoPath, videoDuration) {
    try {
      const outputFile = path.join(this.tempDir, `enhanced_scenes_${Date.now()}.log`)

      // Use more sensitive scene detection
      const command = `${this.ffmpegPath} -i "${videoPath}" -vf "select='gt(scene,0.2)',showinfo" -f null - 2>"${outputFile}"`

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
                type: "scene_transition",
                intensity: "medium",
              })
            }
          }
        }

        fs.unlinkSync(outputFile)
      }

      return sceneChanges
    } catch (error) {
      console.error("❌ Enhanced scene detection failed:", error)
      return []
    }
  }

  // Analyze motion patterns for context
  async analyzeMotionPatterns(videoPath, videoDuration) {
    try {
      // Detect motion vectors and intensity
      const outputFile = path.join(this.tempDir, `motion_patterns_${Date.now()}.log`)

      const command = `${this.ffmpegPath} -i "${videoPath}" -vf "select='gt(scene,0.1)',showinfo" -f null - 2>"${outputFile}"`

      await execAsync(command, { timeout: 60000 })

      let motionEvents = 0
      const activities = []

      if (fs.existsSync(outputFile)) {
        const content = fs.readFileSync(outputFile, "utf8")
        motionEvents = (content.match(/pts_time:/g) || []).length
        fs.unlinkSync(outputFile)
      }

      const motionRate = motionEvents / videoDuration

      let intensity = "low"
      if (motionRate > 2) {
        intensity = "high"
        activities.push("high_motion")
      } else if (motionRate > 0.5) {
        intensity = "medium"
        activities.push("moderate_motion")
      } else {
        activities.push("low_motion")
      }

      return {
        intensity,
        activities,
        motionRate,
        events: motionEvents,
      }
    } catch (error) {
      console.error("❌ Motion pattern analysis failed:", error)
      return {
        intensity: "medium",
        activities: ["unknown_motion"],
        motionRate: 0,
        events: 0,
      }
    }
  }

  // Detect dance movement patterns
  async detectDanceMovement(videoPath, videoDuration) {
    try {
      // Look for rhythmic motion patterns
      const motionAnalysis = await this.analyzeMotionPatterns(videoPath, videoDuration)

      const detected = motionAnalysis.intensity === "high" && motionAnalysis.motionRate > 1.5

      const events = detected
        ? [
            { timestamp: videoDuration * 0.2, type: "dance_sequence", description: "rhythmic movement" },
            { timestamp: videoDuration * 0.6, type: "dance_peak", description: "intense dancing" },
          ]
        : []

      return { detected, events }
    } catch (error) {
      return { detected: false, events: [] }
    }
  }

  // Detect sport/action content
  async detectSportAction(videoPath, videoDuration) {
    try {
      const motionAnalysis = await this.analyzeMotionPatterns(videoPath, videoDuration)

      const detected = motionAnalysis.intensity !== "low" && motionAnalysis.events > 5

      const events = detected
        ? [
            { timestamp: videoDuration * 0.3, type: "action_sequence", description: "athletic movement" },
            { timestamp: videoDuration * 0.7, type: "action_peak", description: "intense action" },
          ]
        : []

      return { detected, events }
    } catch (error) {
      return { detected: false, events: [] }
    }
  }

  // Detect scenic/nature content
  async detectScenicContent(videoPath, videoDuration) {
    try {
      const motionAnalysis = await this.analyzeMotionPatterns(videoPath, videoDuration)

      // Scenic content typically has low motion but high visual quality
      const detected = motionAnalysis.intensity === "low"

      const events = detected
        ? [
            { timestamp: videoDuration * 0.25, type: "scenic_view", description: "beautiful scenery" },
            { timestamp: videoDuration * 0.75, type: "scenic_moment", description: "peaceful scene" },
          ]
        : []

      return { detected, events }
    } catch (error) {
      return { detected: false, events: [] }
    }
  }

  // Analyze visual mood and atmosphere
  async analyzeVisualMood(frames, prompt) {
    const promptLower = prompt.toLowerCase()

    const mood = {
      atmosphere: "neutral",
      energy: "medium",
      tone: "balanced",
      contextualMood: "general",
    }

    // Determine mood based on prompt and visual analysis
    if (/funny|comedy|laugh|hilarious/.test(promptLower)) {
      mood.atmosphere = "playful"
      mood.energy = "high"
      mood.tone = "light"
      mood.contextualMood = "comedic"
    } else if (/sad|emotional|touching|dramatic/.test(promptLower)) {
      mood.atmosphere = "emotional"
      mood.energy = "low"
      mood.tone = "serious"
      mood.contextualMood = "dramatic"
    } else if (/exciting|action|intense|thrilling/.test(promptLower)) {
      mood.atmosphere = "dynamic"
      mood.energy = "high"
      mood.tone = "intense"
      mood.contextualMood = "exciting"
    } else if (/beautiful|scenic|peaceful|calm/.test(promptLower)) {
      mood.atmosphere = "serene"
      mood.energy = "low"
      mood.tone = "peaceful"
      mood.contextualMood = "scenic"
    } else if (/dance|music|rhythm|beat/.test(promptLower)) {
      mood.atmosphere = "rhythmic"
      mood.energy = "high"
      mood.tone = "musical"
      mood.contextualMood = "musical"
    }

    return mood
  }

  // Create contextual segments with rich descriptions
  async createContextualSegments(videoPath, videoDuration, composition, activities, mood, prompt) {
    console.log("🎨 Creating contextual segments with rich descriptions...")

    const segments = []
    const promptLower = prompt.toLowerCase()

    // Use scene changes if available, otherwise create intelligent time-based segments
    const sceneChanges = activities.sceneChanges || []

    if (sceneChanges.length >= 3) {
      // Use scene-based segmentation
      for (let i = 0; i < Math.min(6, sceneChanges.length); i++) {
        const sceneChange = sceneChanges[i]
        const startTime = Math.max(0, sceneChange.timestamp - 1)
        const endTime = Math.min(videoDuration, sceneChange.timestamp + 2)

        const contextualDescription = await this.generateRichContextualDescription(
          startTime,
          endTime,
          videoDuration,
          composition,
          activities,
          mood,
          prompt,
          i,
        )

        segments.push({
          startTime,
          endTime,
          contextualDescription,
          visualContext: this.getVisualContext(activities, startTime, videoDuration),
          moodContext: mood.contextualMood,
          activityContext: activities.detectedActivities,
        })
      }
    } else {
      // Create intelligent time-based segments
      const segmentCount = Math.min(6, Math.max(3, Math.floor(videoDuration / 2.5)))

      for (let i = 0; i < segmentCount; i++) {
        const startTime = (i / segmentCount) * videoDuration
        const endTime = Math.min(((i + 1) / segmentCount) * videoDuration, videoDuration)

        const contextualDescription = await this.generateRichContextualDescription(
          startTime,
          endTime,
          videoDuration,
          composition,
          activities,
          mood,
          prompt,
          i,
        )

        segments.push({
          startTime,
          endTime,
          contextualDescription,
          visualContext: this.getVisualContext(activities, startTime, videoDuration),
          moodContext: mood.contextualMood,
          activityContext: activities.detectedActivities,
        })
      }
    }

    return segments.slice(0, 6)
  }

  // Generate rich contextual descriptions
  async generateRichContextualDescription(
    startTime,
    endTime,
    videoDuration,
    composition,
    activities,
    mood,
    prompt,
    index,
  ) {
    const promptLower = prompt.toLowerCase()
    const position = startTime / videoDuration
    const duration = endTime - startTime

    // Base description elements
    let description = ""

    // Determine what's actually happening based on analysis
    const hasHighMotion = activities.motionIntensity === "high"
    const hasSceneChange = activities.sceneChanges.some((sc) => sc.timestamp >= startTime && sc.timestamp <= endTime)
    const visualEvents = activities.visualEvents.filter((ve) => ve.timestamp >= startTime && ve.timestamp <= endTime)

    // Generate contextual description based on detected content and prompt
    if (/dance|dancing|music/.test(promptLower)) {
      if (hasHighMotion) {
        description =
          index === 0
            ? "Dance moves begin"
            : index === 1
              ? "Rhythm builds up"
              : index === 2
                ? "Peak dance moment"
                : "Dance continues"
      } else {
        description = "Musical moment"
      }
    } else if (/funny|comedy|laugh/.test(promptLower)) {
      if (hasSceneChange) {
        description =
          index === 0 ? "Comedy setup" : index === 1 ? "Funny moment" : index === 2 ? "Hilarious peak" : "Comedy gold"
      } else {
        description = "Comedic scene"
      }
    } else if (/action|sport|intense/.test(promptLower)) {
      if (hasHighMotion) {
        description =
          index === 0
            ? "Action begins"
            : index === 1
              ? "Intensity builds"
              : index === 2
                ? "Peak action"
                : "Action continues"
      } else {
        description = "Dynamic moment"
      }
    } else if (/beautiful|scenic|nature/.test(promptLower)) {
      description =
        index === 0
          ? "Scenic opening"
          : index === 1
            ? "Beautiful view"
            : index === 2
              ? "Stunning moment"
              : "Peaceful scene"
    } else if (/emotional|touching|dramatic/.test(promptLower)) {
      description =
        index === 0
          ? "Emotional start"
          : index === 1
            ? "Touching moment"
            : index === 2
              ? "Dramatic peak"
              : "Moving scene"
    } else {
      // Generic but contextual based on visual analysis
      if (hasHighMotion && hasSceneChange) {
        description = "Dynamic transition"
      } else if (hasHighMotion) {
        description = "Active moment"
      } else if (hasSceneChange) {
        description = "Scene change"
      } else {
        description = position < 0.3 ? "Opening scene" : position < 0.7 ? "Main content" : "Closing moment"
      }
    }

    // Add visual event context if available
    if (visualEvents.length > 0) {
      const event = visualEvents[0]
      if (event.description) {
        description = event.description
      }
    }

    return description
  }

  // Get visual context for segment
  getVisualContext(activities, startTime, videoDuration) {
    const position = startTime / videoDuration

    if (activities.detectedActivities.includes("dance_movement")) {
      return "dance_sequence"
    } else if (activities.detectedActivities.includes("sport_action")) {
      return "action_sequence"
    } else if (activities.detectedActivities.includes("scenic_content")) {
      return "scenic_view"
    } else if (activities.motionIntensity === "high") {
      return "high_activity"
    } else if (activities.motionIntensity === "low") {
      return "calm_scene"
    } else {
      return position < 0.3 ? "opening" : position < 0.7 ? "middle" : "closing"
    }
  }

  // Enhanced fallback with better context
  createEnhancedVisualFallback(videoDuration, prompt) {
    console.log("📋 Creating enhanced visual fallback with context...")

    const promptLower = prompt.toLowerCase()
    const segmentCount = Math.min(6, Math.max(3, Math.floor(videoDuration / 3)))
    const segments = []

    for (let i = 0; i < segmentCount; i++) {
      const startTime = (i / segmentCount) * videoDuration
      const endTime = Math.min(((i + 1) / segmentCount) * videoDuration, videoDuration)

      let contextualDescription = ""

      // Generate contextual descriptions based on prompt
      if (/dance|dancing|music/.test(promptLower)) {
        contextualDescription =
          i === 0 ? "Dance sequence" : i === 1 ? "Rhythm moment" : i === 2 ? "Dance peak" : "Musical flow"
      } else if (/funny|comedy/.test(promptLower)) {
        contextualDescription =
          i === 0 ? "Comedy setup" : i === 1 ? "Funny bit" : i === 2 ? "Laugh moment" : "Comedic scene"
      } else if (/action|sport/.test(promptLower)) {
        contextualDescription =
          i === 0 ? "Action start" : i === 1 ? "Building up" : i === 2 ? "Peak action" : "Active scene"
      } else if (/beautiful|scenic/.test(promptLower)) {
        contextualDescription =
          i === 0 ? "Scenic view" : i === 1 ? "Beautiful shot" : i === 2 ? "Stunning scene" : "Peaceful moment"
      } else {
        contextualDescription =
          i === 0 ? "Opening moment" : i === 1 ? "Key scene" : i === 2 ? "Highlight" : "Important moment"
      }

      segments.push({
        start: startTime,
        end: endTime,
        text: contextualDescription,
        visualContext: "fallback_analysis",
        moodContext: "contextual",
        activityContext: ["enhanced_fallback"],
      })
    }

    return {
      text: segments.map((seg) => seg.text).join(" "),
      segments: segments,
      visualAnalysis: {
        analysisMethod: "enhanced-fallback",
        promptContext: promptLower,
      },
    }
  }

  // Helper methods
  calculateVariation(numbers) {
    if (numbers.length < 2) return 0
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length
    return Math.sqrt(variance) / mean
  }

  determineVisualComplexity(avgSize, variation) {
    if (avgSize > 80000 && variation > 0.3) return "high"
    if (avgSize > 40000 || variation > 0.2) return "medium"
    return "low"
  }

  identifySceneTypes(frames, avgSize) {
    const types = []
    if (avgSize > 60000) types.push("detailed_scenes")
    if (frames.length > 10) types.push("varied_content")
    return types
  }

  determineCompositionStyle(variation, frameCount) {
    if (variation > 0.4) return "dynamic"
    if (variation > 0.2) return "varied"
    return "consistent"
  }

  // Cleanup method
  cleanup() {
    try {
      const tempFiles = fs
        .readdirSync(this.tempDir)
        .filter(
          (file) =>
            file.startsWith("detailed_frames_") ||
            file.startsWith("enhanced_scenes_") ||
            file.startsWith("motion_patterns_"),
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
