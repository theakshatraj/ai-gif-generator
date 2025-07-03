import OpenAI from "openai"

class AIService {
  constructor() {
    console.log("🔧 Initializing Enhanced AIService...")

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is missing")
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI GIF Generator",
      },
    })

    console.log("✅ Enhanced AIService initialized successfully")
  }

  // ENHANCED: Handle both dialogue and non-dialogue videos
  async analyzeVideoContentWithPrompt(transcript, prompt, videoDuration, analysisData = null) {
    try {
      console.log("🧠 Starting enhanced video analysis...")

      // Determine video type based on transcript content
      const videoType = this.determineVideoType(transcript)
      console.log(`📹 Video type detected: ${videoType}`)

      if (videoType === "dialogue_rich") {
        return await this.analyzeDialogueVideo(transcript, prompt, videoDuration, analysisData)
      } else {
        return await this.analyzeVisualVideo(transcript, prompt, videoDuration, analysisData)
      }
    } catch (error) {
      console.error("❌ Enhanced analysis failed:", error)
      return this.createIntelligentFallback(transcript, prompt, videoDuration, analysisData)
    }
  }

  // NEW: Determine if video is dialogue-rich or visual-focused
  determineVideoType(transcript) {
    const text = transcript.text || ""
    const segments = transcript.segments || []

    // Check transcript quality and content
    const wordCount = text.split(/\s+/).length
    const avgWordsPerSecond = segments.length > 0 ? wordCount / (segments[segments.length - 1]?.end || 1) : 0

    // Check for dialogue indicators
    const hasDialogueMarkers = /\b(say|said|tell|told|ask|asked|speak|spoke|talk|talked)\b/i.test(text)
    const hasConversationalWords = /\b(I|you|we|they|he|she|yes|no|okay|well|so|but|and)\b/i.test(text)
    const hasQuestionMarks = (text.match(/\?/g) || []).length > 0

    // Scoring system
    let dialogueScore = 0

    if (avgWordsPerSecond > 1) dialogueScore += 0.3 // Good speech rate
    if (wordCount > 50) dialogueScore += 0.2 // Substantial content
    if (hasDialogueMarkers) dialogueScore += 0.2 // Speech indicators
    if (hasConversationalWords) dialogueScore += 0.2 // Conversational language
    if (hasQuestionMarks) dialogueScore += 0.1 // Interactive content

    console.log(
      `📊 Dialogue analysis: ${wordCount} words, ${avgWordsPerSecond.toFixed(2)} words/sec, score: ${dialogueScore.toFixed(2)}`,
    )

    return dialogueScore > 0.5 ? "dialogue_rich" : "visual_focused"
  }

  // NEW: Analyze dialogue-rich videos
  async analyzeDialogueVideo(transcript, prompt, videoDuration, analysisData) {
    try {
      console.log("🗣️ Analyzing dialogue-rich video...")

      const systemPrompt = `You are an expert at analyzing dialogue-rich videos to create engaging GIF moments.

TASK: Analyze video transcript and user prompt to find the best moments for GIF creation.

DIALOGUE VIDEO ANALYSIS APPROACH:
1. Focus on spoken content that matches the user's theme/prompt
2. Look for emotional peaks, funny lines, quotable moments
3. Consider dialogue timing and natural speech breaks
4. Match spoken content with user's requested theme
5. Create captions that reflect actual dialogue or paraphrase key points

CAPTION STRATEGY FOR DIALOGUE VIDEOS:
- Use actual quotes when they're impactful and short
- Paraphrase longer dialogue into GIF-friendly text
- Capture the emotional tone of the speech
- Match the speaker's intent with user's theme request

Return exactly 3 moments with dialogue-based captions.`

      const userPrompt = `USER THEME REQUEST: "${prompt}"

VIDEO TRANSCRIPT ANALYSIS:
Duration: ${videoDuration} seconds
Full Transcript: "${transcript.text}"

DETAILED DIALOGUE SEGMENTS:
${
  transcript.segments
    ?.map(
      (seg, idx) =>
        `Segment ${idx + 1}: ${Math.floor(seg.start)}s-${Math.floor(seg.end)}s
  Dialogue: "${seg.text}"
  Duration: ${Math.floor(seg.end - seg.start)}s`,
    )
    .join("\n") || "No detailed segments available"
}

ANALYSIS REQUIREMENTS:
1. Find dialogue moments that align with the theme: "${prompt}"
2. Look for emotional peaks, funny lines, or quotable content
3. Ensure selected dialogue matches the user's requested theme
4. Create captions that either quote directly or capture the essence

For each moment, provide:
- Exact timing based on dialogue flow
- Caption that reflects the actual spoken content
- Clear explanation of how it matches the user's theme

Return JSON array of 3 best dialogue-based moments:`

      const completion = await this.openai.chat.completions.create({
        model: "openai/gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1200,
      })

      const response = completion.choices[0].message.content.trim()
      console.log("🤖 Dialogue analysis response:", response.substring(0, 200) + "...")

      return this.parseAndValidateResponse(response, transcript, videoDuration, "dialogue")
    } catch (error) {
      console.error("❌ Dialogue video analysis failed:", error)
      return this.createDialogueFallback(transcript, prompt, videoDuration)
    }
  }

  // NEW: Analyze visual-focused videos
  async analyzeVisualVideo(transcript, prompt, videoDuration, analysisData) {
    try {
      console.log("👁️ Analyzing visual-focused video...")

      const systemPrompt = `You are an expert at analyzing visual-focused videos to create engaging GIF moments.

TASK: Analyze visual content and user prompt to find the best visual moments for GIF creation.

VISUAL VIDEO ANALYSIS APPROACH:
1. Focus on visual elements that match the user's theme/prompt
2. Look for action sequences, scene changes, visual highlights
3. Consider visual composition and movement
4. Match visual content with user's requested theme
5. Create captions that describe what's visually happening

CAPTION STRATEGY FOR VISUAL VIDEOS:
- Describe the visual action or scene
- Capture the mood and atmosphere
- Use engaging, descriptive language
- Match visual elements with user's theme request
- Keep captions punchy and GIF-appropriate

Return exactly 3 moments with visual-based captions.`

      const visualAnalysis = analysisData
        ? `
VISUAL ANALYSIS DATA:
- Scene changes detected: ${analysisData.sceneChanges || 0}
- Motion activity peaks: ${analysisData.motionAnalysis?.peaks || 0}
- Audio segments: ${analysisData.audioAnalysis?.segments || 0}
- Visual features: ${analysisData.visualFeatures || 0}`
        : ""

      const userPrompt = `USER THEME REQUEST: "${prompt}"

VIDEO VISUAL ANALYSIS:
Duration: ${videoDuration} seconds
${visualAnalysis}

VISUAL CONTENT DESCRIPTION:
${transcript.text || "Visual content analysis based on technical metrics"}

VISUAL SEGMENTS:
${
  transcript.segments
    ?.map(
      (seg, idx) =>
        `Segment ${idx + 1}: ${Math.floor(seg.start)}s-${Math.floor(seg.end)}s
  Visual Description: "${seg.text}"
  Duration: ${Math.floor(seg.end - seg.start)}s`,
    )
    .join("\n") || "Time-based visual segments"
}

ANALYSIS REQUIREMENTS:
1. Find visual moments that align with the theme: "${prompt}"
2. Look for action, scene changes, or visually interesting content
3. Ensure selected moments match the user's visual theme request
4. Create captions that describe the visual content engagingly

For each moment, provide:
- Timing based on visual activity or scene changes
- Caption that describes what's visually happening
- Clear explanation of how the visual content matches the user's theme

Return JSON array of 3 best visual moments:`

      const completion = await this.openai.chat.completions.create({
        model: "openai/gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1200,
      })

      const response = completion.choices[0].message.content.trim()
      console.log("🤖 Visual analysis response:", response.substring(0, 200) + "...")

      return this.parseAndValidateResponse(response, transcript, videoDuration, "visual")
    } catch (error) {
      console.error("❌ Visual video analysis failed:", error)
      return this.createVisualFallback(transcript, prompt, videoDuration)
    }
  }

  // NEW: Parse and validate AI response
  parseAndValidateResponse(response, transcript, videoDuration, videoType) {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error("No JSON found in response")

      const moments = JSON.parse(jsonMatch[0])

      if (!Array.isArray(moments) || moments.length === 0) {
        throw new Error("Invalid moments array")
      }

      // Validate and enhance moments
      const validMoments = moments
        .filter(
          (moment) =>
            typeof moment.startTime === "number" &&
            typeof moment.endTime === "number" &&
            moment.startTime < moment.endTime &&
            moment.endTime <= videoDuration &&
            moment.startTime >= 0 &&
            moment.caption &&
            moment.reason,
        )
        .map((moment) => ({
          ...moment,
          startTime: Math.max(0, Math.floor(moment.startTime)),
          endTime: Math.min(videoDuration, Math.floor(moment.endTime)),
          caption: moment.caption.substring(0, 30),
          confidence: moment.confidence || 0.7,
          videoType: videoType,
        }))
        .slice(0, 3)

      if (validMoments.length === 0) {
        throw new Error("No valid moments after filtering")
      }

      console.log(`✅ ${videoType} analysis completed: ${validMoments.length} moments`)
      return validMoments
    } catch (error) {
      console.error("❌ Response parsing failed:", error)
      throw error
    }
  }

  // NEW: Create dialogue-specific fallback
  createDialogueFallback(transcript, prompt, videoDuration) {
    console.log("📋 Creating dialogue-focused fallback...")

    const segments = transcript.segments || []
    const promptLower = prompt.toLowerCase()

    // Score segments based on dialogue content and prompt matching
    const scoredSegments = segments.map((segment) => {
      let score = 0.3 // Base score
      const segmentText = segment.text?.toLowerCase() || ""

      // Score based on dialogue quality
      const wordCount = segmentText.split(/\s+/).length
      if (wordCount > 5 && wordCount < 15) score += 0.2 // Good length for GIF

      // Score based on prompt matching
      if (/funny|comedy/.test(promptLower) && /laugh|funny|joke|hilarious/.test(segmentText)) {
        score += 0.3
      }
      if (/emotional|touching/.test(promptLower) && /feel|heart|love|sad|happy/.test(segmentText)) {
        score += 0.3
      }
      if (/motivational|inspiring/.test(promptLower) && /can|will|believe|achieve|success/.test(segmentText)) {
        score += 0.3
      }

      // Score based on dialogue markers
      if (/\b(I|you|we|they)\b/.test(segmentText)) score += 0.1
      if (/[?!]/.test(segmentText)) score += 0.1

      return { ...segment, score }
    })

    // Select top 3 segments
    const selectedSegments = scoredSegments.sort((a, b) => b.score - a.score).slice(0, 3)

    return selectedSegments.map((segment, index) => ({
      startTime: Math.max(0, Math.floor(segment.start)),
      endTime: Math.min(videoDuration, Math.floor(segment.end)),
      caption: this.generateDialogueCaption(segment, promptLower, index),
      reason: `Dialogue-based fallback: Score ${segment.score.toFixed(2)}`,
      confidence: Math.min(0.8, 0.4 + segment.score),
      videoType: "dialogue",
    }))
  }

  // NEW: Create visual-specific fallback
  createVisualFallback(transcript, prompt, videoDuration) {
    console.log("📋 Creating visual-focused fallback...")

    const promptLower = prompt.toLowerCase()
    const segmentCount = Math.min(6, Math.max(3, Math.floor(videoDuration / 3)))
    const segments = []

    for (let i = 0; i < 3; i++) {
      const startTime = Math.floor((i / segmentCount) * videoDuration)
      const endTime = Math.min(Math.floor(((i + 1) / segmentCount) * videoDuration), videoDuration)

      segments.push({
        startTime,
        endTime,
        caption: this.generateVisualCaption(promptLower, i, videoDuration),
        reason: `Visual-based fallback: Time segment ${i + 1}`,
        confidence: 0.5,
        videoType: "visual",
      })
    }

    return segments
  }

  // NEW: Generate dialogue-appropriate captions
  generateDialogueCaption(segment, promptLower, index) {
    const segmentText = segment.text || ""

    // Try to use actual dialogue first
    if (segmentText.length > 0 && segmentText.length <= 25) {
      return segmentText
    }

    // Create contextual caption based on dialogue content
    if (/funny|comedy/.test(promptLower)) {
      if (/laugh|funny|joke/.test(segmentText.toLowerCase())) return "That's hilarious!"
      return "Comedy gold"
    }

    if (/emotional|touching/.test(promptLower)) {
      if (/love|heart|feel/.test(segmentText.toLowerCase())) return "So touching"
      return "Emotional moment"
    }

    if (/motivational/.test(promptLower)) {
      if (/can|will|believe/.test(segmentText.toLowerCase())) return "So inspiring"
      return "Motivational words"
    }

    // Use first few words as fallback
    const words = segmentText.split(" ").slice(0, 4).join(" ")
    return words.length > 0 && words.length <= 25 ? words : `Quote ${index + 1}`
  }

  // NEW: Generate visual-appropriate captions
  generateVisualCaption(promptLower, index, videoDuration) {
    const positions = ["Opening scene", "Main moment", "Closing shot"]
    const position = positions[index] || "Visual moment"

    if (/action|sport|dance/.test(promptLower)) {
      return `${position} action`
    }
    if (/beautiful|scenic/.test(promptLower)) {
      return `${position} beauty`
    }
    if (/funny|comedy/.test(promptLower)) {
      return `${position} comedy`
    }
    if (/dramatic|intense/.test(promptLower)) {
      return `${position} drama`
    }

    return position
  }

  // Backward compatibility
  async analyzeTranscriptWithTimestamps(transcript, prompt, videoDuration) {
    return this.analyzeVideoContentWithPrompt(transcript, prompt, videoDuration)
  }

  async testConnection() {
    try {
      console.log("🔍 Testing OpenRouter connection...")
      const completion = await this.openai.chat.completions.create({
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: "Test" }],
        max_tokens: 5,
      })
      console.log("✅ OpenRouter connection successful")
      return true
    } catch (error) {
      console.error("❌ OpenRouter connection failed:", error)
      return false
    }
  }

  // Enhanced fallback that considers video type
  createIntelligentFallback(transcript, prompt, videoDuration, analysisData) {
    const videoType = this.determineVideoType(transcript)

    if (videoType === "dialogue_rich") {
      return this.createDialogueFallback(transcript, prompt, videoDuration)
    } else {
      return this.createVisualFallback(transcript, prompt, videoDuration)
    }
  }
}

export default new AIService()
