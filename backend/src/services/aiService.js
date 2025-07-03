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

  // ENHANCED: Generate truly contextual captions
  async analyzeVideoContentWithPrompt(transcript, prompt, videoDuration, analysisData = null) {
    try {
      console.log("🧠 Starting contextual caption generation...")

      const videoType = this.determineVideoType(transcript)
      console.log(`📹 Video type detected: ${videoType}`)

      if (videoType === "dialogue_rich") {
        return await this.analyzeDialogueVideoForContextualCaptions(transcript, prompt, videoDuration, analysisData)
      } else {
        return await this.analyzeVisualVideoForContextualCaptions(transcript, prompt, videoDuration, analysisData)
      }
    } catch (error) {
      console.error("❌ Contextual analysis failed:", error)
      return this.createContextualFallback(transcript, prompt, videoDuration, analysisData)
    }
  }

  // Determine video type
  determineVideoType(transcript) {
    const text = transcript.text || ""
    const segments = transcript.segments || []

    const wordCount = text.split(/\s+/).length
    const avgWordsPerSecond = segments.length > 0 ? wordCount / (segments[segments.length - 1]?.end || 1) : 0

    const hasDialogueMarkers =
      /\b(say|said|tell|told|ask|asked|speak|spoke|talk|talked|hello|hi|yes|no|okay|well|so|but|and|I|you|we|they)\b/i.test(
        text,
      )
    const hasConversationalWords = /\b(I|you|we|they|he|she|yes|no|okay|well|so|but|and|the|a|an)\b/i.test(text)

    let dialogueScore = 0
    if (avgWordsPerSecond > 0.8) dialogueScore += 0.3
    if (wordCount > 30) dialogueScore += 0.2
    if (hasDialogueMarkers) dialogueScore += 0.3
    if (hasConversationalWords) dialogueScore += 0.2

    console.log(
      `📊 Dialogue analysis: ${wordCount} words, ${avgWordsPerSecond.toFixed(2)} words/sec, score: ${dialogueScore.toFixed(2)}`,
    )

    return dialogueScore > 0.5 ? "dialogue_rich" : "visual_focused"
  }

  // ENHANCED: Analyze dialogue videos for contextual captions
  async analyzeDialogueVideoForContextualCaptions(transcript, prompt, videoDuration, analysisData) {
    try {
      console.log("🗣️ Generating contextual captions for dialogue video...")

      const systemPrompt = `You are an expert at creating CONTEXTUAL GIF captions from dialogue-rich videos.

CRITICAL REQUIREMENTS:
1. Create captions that reflect ACTUAL spoken content, not generic templates
2. Match the dialogue content with the user's theme request
3. Use direct quotes when impactful, or paraphrase the essence
4. Avoid generic captions like "Quote 1", "Later content", "Early content"
5. Make captions specific to what's being said and how it relates to the theme

CAPTION CREATION STRATEGY:
- For funny themes: Find actual funny lines or moments
- For emotional themes: Capture emotional dialogue or moments
- For motivational themes: Use inspiring quotes or messages
- For dramatic themes: Find intense or meaningful dialogue

EXAMPLES OF GOOD CONTEXTUAL CAPTIONS:
- Instead of "Quote 1" → "That's hilarious!" (if someone laughs)
- Instead of "Later content" → "So inspiring" (if motivational speech)
- Instead of "Early content" → "Mind blown" (if surprising revelation)

Return exactly 3 moments with CONTEXTUAL captions that reflect actual dialogue content.`

      const userPrompt = `USER THEME: "${prompt}"

DIALOGUE TRANSCRIPT:
"${transcript.text}"

DETAILED DIALOGUE SEGMENTS:
${
  transcript.segments
    ?.map((seg, idx) => `${Math.floor(seg.start)}s-${Math.floor(seg.end)}s: "${seg.text}"`)
    .join("\n") || "No detailed segments"
}

TASK: Find 3 dialogue moments that match the theme "${prompt}" and create CONTEXTUAL captions.

REQUIREMENTS:
1. Analyze what's actually being said in each segment
2. Match dialogue content with the user's theme
3. Create captions that reflect the actual spoken words or their essence
4. NO generic captions like "Quote X" or "Content with scene"
5. Make each caption specific to what's happening in that moment

For each moment, provide:
- Exact timing from dialogue segments
- Caption that reflects actual dialogue content (max 25 characters)
- Detailed reason explaining how the dialogue matches the theme

Return JSON array only:`

      const completion = await this.openai.chat.completions.create({
        model: "openai/gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2, // Lower temperature for more consistent results
        max_tokens: 1000,
      })

      const response = completion.choices[0].message.content.trim()
      console.log("🤖 Dialogue contextual response:", response.substring(0, 300) + "...")

      return this.parseContextualResponse(response, transcript, videoDuration, "dialogue")
    } catch (error) {
      console.error("❌ Dialogue contextual analysis failed:", error)
      return this.createContextualDialogueFallback(transcript, prompt, videoDuration)
    }
  }

  // ENHANCED: Analyze visual videos for contextual captions
  async analyzeVisualVideoForContextualCaptions(transcript, prompt, videoDuration, analysisData) {
    try {
      console.log("👁️ Generating contextual captions for visual video...")

      const systemPrompt = `You are an expert at creating CONTEXTUAL GIF captions from visual-focused videos.

CRITICAL REQUIREMENTS:
1. Create captions that describe what's ACTUALLY happening visually
2. Match visual content with the user's theme request
3. Avoid generic captions like "Later content", "Early content", "Scene X"
4. Make captions specific to the visual action, mood, or content
5. Use engaging, descriptive language that captures the visual essence

CAPTION CREATION STRATEGY:
- For dance themes: Describe actual dance moves or rhythm
- For action themes: Capture the specific action happening
- For scenic themes: Describe the beautiful visual elements
- For funny themes: Capture visual comedy or amusing moments

EXAMPLES OF GOOD CONTEXTUAL CAPTIONS:
- Instead of "Later content" → "Epic dance moves" (for dance video)
- Instead of "Scene change" → "Stunning sunset" (for scenic video)
- Instead of "Early content" → "Action packed" (for action video)

Return exactly 3 moments with CONTEXTUAL captions that describe actual visual content.`

      const visualContext = transcript.visualAnalysis
        ? `
VISUAL ANALYSIS:
- Detected activities: ${transcript.visualAnalysis.activities?.detectedActivities?.join(", ") || "general"}
- Motion intensity: ${transcript.visualAnalysis.activities?.motionIntensity || "medium"}
- Visual mood: ${transcript.visualAnalysis.mood?.contextualMood || "neutral"}
- Scene changes: ${transcript.visualAnalysis.activities?.sceneChanges?.length || 0}`
        : ""

      const userPrompt = `USER THEME: "${prompt}"

VISUAL CONTENT ANALYSIS:
${transcript.text}
${visualContext}

VISUAL SEGMENTS WITH CONTEXT:
${
  transcript.segments
    ?.map(
      (seg, idx) =>
        `${Math.floor(seg.start)}s-${Math.floor(seg.end)}s: "${seg.text}"
  Visual Context: ${seg.visualContext || "general"}
  Mood: ${seg.moodContext || "neutral"}`,
    )
    .join("\n") || "Time-based segments"
}

TASK: Find 3 visual moments that match the theme "${prompt}" and create CONTEXTUAL captions.

REQUIREMENTS:
1. Analyze what's actually happening visually in each segment
2. Match visual content with the user's theme
3. Create captions that describe the actual visual action or mood
4. NO generic captions like "Content X" or "Scene with X"
5. Make each caption specific to the visual content

For each moment, provide:
- Timing based on visual activity
- Caption that describes actual visual content (max 25 characters)
- Detailed reason explaining how the visuals match the theme

Return JSON array only:`

      const completion = await this.openai.chat.completions.create({
        model: "openai/gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      })

      const response = completion.choices[0].message.content.trim()
      console.log("🤖 Visual contextual response:", response.substring(0, 300) + "...")

      return this.parseContextualResponse(response, transcript, videoDuration, "visual")
    } catch (error) {
      console.error("❌ Visual contextual analysis failed:", error)
      return this.createContextualVisualFallback(transcript, prompt, videoDuration)
    }
  }

  // Parse contextual response with better validation
  parseContextualResponse(response, transcript, videoDuration, videoType) {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error("No JSON found in response")

      const moments = JSON.parse(jsonMatch[0])

      if (!Array.isArray(moments) || moments.length === 0) {
        throw new Error("Invalid moments array")
      }

      const validMoments = moments
        .filter(
          (moment) =>
            typeof moment.startTime === "number" &&
            typeof moment.endTime === "number" &&
            moment.startTime < moment.endTime &&
            moment.endTime <= videoDuration &&
            moment.startTime >= 0 &&
            moment.caption &&
            moment.caption.length > 3 &&
            !this.isGenericCaption(moment.caption) && // Filter out generic captions
            moment.reason,
        )
        .map((moment) => ({
          ...moment,
          startTime: Math.max(0, Math.floor(moment.startTime)),
          endTime: Math.min(videoDuration, Math.floor(moment.endTime)),
          caption: this.cleanCaption(moment.caption),
          confidence: moment.confidence || 0.8,
          videoType: videoType,
        }))
        .slice(0, 3)

      if (validMoments.length === 0) {
        throw new Error("No contextual moments after filtering")
      }

      console.log(`✅ Contextual ${videoType} analysis: ${validMoments.length} moments`)
      validMoments.forEach((moment, idx) => {
        console.log(`  ${idx + 1}. "${moment.caption}" (${moment.startTime}s-${moment.endTime}s)`)
      })

      return validMoments
    } catch (error) {
      console.error("❌ Contextual response parsing failed:", error)
      throw error
    }
  }

  // Check if caption is generic (to filter out)
  isGenericCaption(caption) {
    const genericPatterns = [
      /^quote\s*\d*$/i,
      /^later\s*content/i,
      /^early\s*content/i,
      /^content\s*with/i,
      /^scene\s*\d*/i,
      /^segment\s*\d*/i,
      /^moment\s*\d*/i,
      /^part\s*\d*/i,
    ]

    return genericPatterns.some((pattern) => pattern.test(caption.trim()))
  }

  // Clean and optimize caption
  cleanCaption(caption) {
    return caption
      .replace(/['"]/g, "") // Remove quotes
      .replace(/[^\w\s\-!?.]/g, "") // Keep only safe characters
      .substring(0, 25) // Limit length
      .trim()
  }

  // Create contextual dialogue fallback
  createContextualDialogueFallback(transcript, prompt, videoDuration) {
    console.log("📋 Creating contextual dialogue fallback...")

    const segments = transcript.segments || []
    const promptLower = prompt.toLowerCase()

    const contextualMoments = segments
      .filter((seg) => seg.text && seg.text.length > 5)
      .map((segment) => {
        const segmentText = segment.text.toLowerCase()
        let caption = ""
        let score = 0.3

        // Generate contextual captions based on actual dialogue content
        if (/funny|comedy|laugh/.test(promptLower)) {
          if (/laugh|funny|joke|hilarious|haha/.test(segmentText)) {
            caption = "That's funny!"
            score += 0.4
          } else if (/\?/.test(segment.text)) {
            caption = "Good question"
            score += 0.2
          } else {
            caption = "Comedy moment"
            score += 0.1
          }
        } else if (/emotional|touching|sad/.test(promptLower)) {
          if (/love|heart|feel|emotional|sad|happy/.test(segmentText)) {
            caption = "So touching"
            score += 0.4
          } else {
            caption = "Emotional words"
            score += 0.2
          }
        } else if (/motivational|inspiring/.test(promptLower)) {
          if (/can|will|believe|achieve|success|dream/.test(segmentText)) {
            caption = "So inspiring"
            score += 0.4
          } else {
            caption = "Motivational"
            score += 0.2
          }
        } else {
          // Use actual words from dialogue
          const words = segment.text.split(" ").slice(0, 3).join(" ")
          caption = words.length <= 25 ? words : "Meaningful words"
          score += 0.2
        }

        return {
          ...segment,
          caption,
          score,
          startTime: Math.floor(segment.start),
          endTime: Math.floor(segment.end),
          reason: `Contextual dialogue: "${segment.text.substring(0, 30)}..."`,
          confidence: Math.min(0.8, 0.4 + score),
          videoType: "dialogue",
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    return contextualMoments.length > 0
      ? contextualMoments
      : this.createBasicContextualFallback(prompt, videoDuration, "dialogue")
  }

  // Create contextual visual fallback
  createContextualVisualFallback(transcript, prompt, videoDuration) {
    console.log("📋 Creating contextual visual fallback...")

    const promptLower = prompt.toLowerCase()
    const segments = transcript.segments || []

    const contextualMoments = []

    for (let i = 0; i < Math.min(3, segments.length); i++) {
      const segment = segments[i]
      let caption = ""

      // Generate contextual captions based on visual theme
      if (/dance|dancing|music/.test(promptLower)) {
        caption = i === 0 ? "Dance begins" : i === 1 ? "Rhythm flows" : "Dance peak"
      } else if (/action|sport|intense/.test(promptLower)) {
        caption = i === 0 ? "Action starts" : i === 1 ? "Intensity builds" : "Peak action"
      } else if (/funny|comedy/.test(promptLower)) {
        caption = i === 0 ? "Comedy setup" : i === 1 ? "Funny moment" : "Hilarious!"
      } else if (/beautiful|scenic|nature/.test(promptLower)) {
        caption = i === 0 ? "Beautiful view" : i === 1 ? "Stunning scene" : "Nature's beauty"
      } else if (/dramatic|emotional/.test(promptLower)) {
        caption = i === 0 ? "Drama unfolds" : i === 1 ? "Emotional peak" : "Powerful moment"
      } else {
        // Use segment description if available
        if (segment.text && !this.isGenericCaption(segment.text)) {
          caption = segment.text.substring(0, 25)
        } else {
          caption = i === 0 ? "Opening moment" : i === 1 ? "Key scene" : "Highlight"
        }
      }

      contextualMoments.push({
        startTime: Math.floor(segment.start || (i * videoDuration) / 3),
        endTime: Math.floor(segment.end || ((i + 1) * videoDuration) / 3),
        caption: caption,
        reason: `Contextual visual: ${segment.visualContext || "visual content"}`,
        confidence: 0.6,
        videoType: "visual",
      })
    }

    return contextualMoments
  }

  // Create basic contextual fallback
  createBasicContextualFallback(prompt, videoDuration, videoType) {
    const promptLower = prompt.toLowerCase()
    const moments = []

    for (let i = 0; i < 3; i++) {
      const startTime = Math.floor((i * videoDuration) / 3)
      const endTime = Math.floor(((i + 1) * videoDuration) / 3)

      let caption = ""

      if (videoType === "dialogue") {
        if (/funny/.test(promptLower)) {
          caption = i === 0 ? "Funny start" : i === 1 ? "Comedy gold" : "Hilarious end"
        } else if (/emotional/.test(promptLower)) {
          caption = i === 0 ? "Emotional" : i === 1 ? "Touching" : "Moving"
        } else {
          caption = i === 0 ? "Opening words" : i === 1 ? "Key message" : "Final thoughts"
        }
      } else {
        if (/dance/.test(promptLower)) {
          caption = i === 0 ? "Dance moves" : i === 1 ? "Rhythm" : "Dance finale"
        } else if (/action/.test(promptLower)) {
          caption = i === 0 ? "Action" : i === 1 ? "Intensity" : "Peak moment"
        } else {
          caption = i === 0 ? "Visual start" : i === 1 ? "Main scene" : "Visual end"
        }
      }

      moments.push({
        startTime,
        endTime,
        caption,
        reason: `Basic contextual fallback for ${videoType}`,
        confidence: 0.5,
        videoType,
      })
    }

    return moments
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

  // Enhanced fallback that creates contextual captions
  createContextualFallback(transcript, prompt, videoDuration, analysisData) {
    const videoType = this.determineVideoType(transcript)

    if (videoType === "dialogue_rich") {
      return this.createContextualDialogueFallback(transcript, prompt, videoDuration)
    } else {
      return this.createContextualVisualFallback(transcript, prompt, videoDuration)
    }
  }
}

export default new AIService()
