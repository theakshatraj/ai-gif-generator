import OpenAI from "openai"
import fs from "fs"

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
    console.log("✅ AIService initialized successfully")
  }

  async transcribeAudio(audioPath) {
    try {
      console.log("🎤 Transcribing audio...")

      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`)
      }

      const audioFile = fs.createReadStream(audioPath)
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: "openai/whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
      })

      console.log("✅ Audio transcribed successfully")
      return transcription
    } catch (error) {
      console.error("❌ Transcription Error:", error)
      return this.createFallbackTranscript()
    }
  }

  async analyzeTranscriptWithTimestamps(transcript, prompt, videoDuration) {
    try {
      console.log("🤖 Analyzing transcript with CONTEXT-AWARE analysis...")

      // Enhanced system prompt that focuses on actual content matching
      const systemPrompt = `You are an expert at creating contextual GIF captions that match ACTUAL video content with user prompts.

CRITICAL RULES:
1. READ the actual video transcript/content carefully
2. MATCH the user's prompt theme with what's actually happening in the video
3. Create captions that reflect BOTH the video content AND the user's theme
4. If the user says "perfect" and the video shows someone saying "perfect", use variations of that
5. Base captions on ACTUAL dialogue, actions, or events in the video

CAPTION CREATION STRATEGY:
- If user prompt matches video dialogue: Use exact quotes or variations
- If user prompt is thematic: Apply theme to actual video moments
- Keep captions SHORT and RELEVANT to both content and theme
- Use actual words/phrases from the video when possible

Example:
- User prompt: "perfect" + Video has "It was perfect" dialogue → Caption: "It was perfect"
- User prompt: "perfect" + Video shows achievement → Caption: "Perfect execution"
- User prompt: "funny" + Video has laughter → Caption: "That's hilarious"

Return EXACTLY 3 moments in JSON format:
[
  {
    "startTime": 0,
    "endTime": 3,
    "caption": "Caption based on ACTUAL content + user theme",
    "reason": "Why this moment matches both video content and user prompt"
  }
]`

      const contentAnalysis = this.buildDetailedContentAnalysis(transcript, prompt)

      const userPrompt = `Video Duration: ${videoDuration} seconds
User Theme/Request: "${prompt}"

ACTUAL VIDEO CONTENT:
${contentAnalysis}

TASK: Find 3 moments where the video content aligns with the user's theme "${prompt}".

IMPORTANT: 
- Look for dialogue, actions, or scenes that relate to "${prompt}"
- If the video contains words related to "${prompt}", use those exact words
- Create captions that combine the actual video content with the user's theme
- Don't use generic meme captions - use content-specific captions

Return JSON array with 3 contextually relevant moments.`

      const completion = await this.openai.chat.completions.create({
        model: "openai/gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more focused analysis
        max_tokens: 1000,
      })

      const response = completion.choices[0].message.content.trim()
      console.log("🤖 AI Response:", response)

      return this.parseAndValidateMoments(response, videoDuration, transcript, prompt)
    } catch (error) {
      console.error("❌ AI Analysis Error:", error)
      return this.createContextualFallbackMoments(transcript, videoDuration, prompt)
    }
  }

  buildDetailedContentAnalysis(transcript, prompt) {
    let analysis = `Full Transcript: ${transcript.text}\n\n`

    // Analyze transcript for prompt-related keywords
    const promptKeywords = prompt.toLowerCase().split(" ")
    const transcriptLower = transcript.text.toLowerCase()

    analysis += `PROMPT-CONTENT MATCHING:\n`
    analysis += `User wants: "${prompt}"\n`

    // Check for direct matches
    const directMatches = []
    promptKeywords.forEach((keyword) => {
      if (transcriptLower.includes(keyword)) {
        directMatches.push(keyword)
      }
    })

    if (directMatches.length > 0) {
      analysis += `Direct matches found: ${directMatches.join(", ")}\n`
    } else {
      analysis += `No direct matches - look for thematic connections\n`
    }

    if (transcript.segments && transcript.segments.length > 0) {
      analysis += "\nTIMED SEGMENTS:\n"
      transcript.segments.forEach((segment, index) => {
        const segmentText = segment.text.toLowerCase()
        const hasPromptMatch = promptKeywords.some((keyword) => segmentText.includes(keyword))

        analysis += `${Math.floor(segment.start)}s-${Math.floor(segment.end)}s: "${segment.text}"`
        if (hasPromptMatch) {
          analysis += ` ⭐ MATCHES PROMPT`
        }
        analysis += `\n`

        if (segment.frameAnalysis) {
          analysis += `  Visual: ${segment.frameAnalysis}\n`
        }
      })
    }

    if (transcript.contentAnalysis && transcript.contentAnalysis.length > 0) {
      analysis += "\nVISUAL ANALYSIS:\n"
      transcript.contentAnalysis.forEach((frame, index) => {
        analysis += `${Math.floor(frame.timestamp)}s: ${frame.analysis}\n`
      })
    }

    return analysis
  }

  parseAndValidateMoments(response, videoDuration, transcript, prompt) {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      const jsonString = jsonMatch ? jsonMatch[0] : response
      const moments = JSON.parse(jsonString)

      if (!Array.isArray(moments) || moments.length === 0) {
        throw new Error("Invalid moments structure")
      }

      const validMoments = moments
        .filter(
          (moment) =>
            typeof moment.startTime === "number" &&
            typeof moment.endTime === "number" &&
            moment.startTime >= 0 &&
            moment.endTime <= videoDuration &&
            moment.startTime < moment.endTime &&
            moment.caption &&
            moment.caption.trim().length > 0,
        )
        .slice(0, 3)

      if (validMoments.length < 3) {
        console.log(`⚠️ Only ${validMoments.length} valid moments found, creating contextual fallback`)
        return this.createContextualFallbackMoments(transcript, videoDuration, prompt)
      }

      console.log("✅ AI analysis completed with contextual moments")
      console.log(`📊 Generated captions: ${validMoments.map((m) => m.caption).join(", ")}`)

      return validMoments
    } catch (parseError) {
      console.error("❌ Failed to parse AI response:", parseError)
      return this.createContextualFallbackMoments(transcript, videoDuration, prompt)
    }
  }

  createContextualFallbackMoments(transcript, videoDuration, prompt) {
    console.log("📋 Creating CONTEXTUAL fallback moments based on actual content...")
    const moments = []
    const promptLower = prompt.toLowerCase()
    const transcriptLower = transcript.text.toLowerCase()

    // Extract actual phrases from transcript that relate to the prompt
    const contextualCaptions = this.extractContextualCaptions(transcript, prompt)

    console.log(`🎯 Extracted contextual captions: ${contextualCaptions.join(", ")}`)

    if (videoDuration >= 9) {
      const positions = [0, Math.floor(videoDuration / 2) - 1, videoDuration - 3]

      positions.forEach((start, index) => {
        const end = Math.min(start + 3, videoDuration)
        const relevantSegment = this.findRelevantSegment(transcript.segments || [], start, end)

        moments.push({
          startTime: start,
          endTime: end,
          caption: contextualCaptions[index] || this.generateContextualCaption(relevantSegment, prompt, index),
          reason: `Contextual moment based on ${relevantSegment ? "actual content" : "timeline position"}`,
        })
      })
    } else if (videoDuration >= 6) {
      const segmentLength = 2
      for (let i = 0; i < 3; i++) {
        const start = Math.floor((i * (videoDuration - segmentLength)) / 2)
        const end = Math.min(start + segmentLength, videoDuration)
        const relevantSegment = this.findRelevantSegment(transcript.segments || [], start, end)

        moments.push({
          startTime: start,
          endTime: end,
          caption: contextualCaptions[i] || this.generateContextualCaption(relevantSegment, prompt, i),
          reason: `Content-aware moment ${i + 1}`,
        })
      }
    } else {
      const segmentLength = Math.max(2, Math.floor(videoDuration / 2))
      for (let i = 0; i < 3; i++) {
        const start = Math.floor((i * videoDuration) / 4)
        const end = Math.min(start + segmentLength, videoDuration)
        const relevantSegment = this.findRelevantSegment(transcript.segments || [], start, end)

        moments.push({
          startTime: start,
          endTime: end,
          caption: contextualCaptions[i] || this.generateContextualCaption(relevantSegment, prompt, i),
          reason: `Short video contextual moment ${i + 1}`,
        })
      }
    }

    console.log(`📊 Created ${moments.length} contextual fallback moments`)
    return moments
  }

  extractContextualCaptions(transcript, prompt) {
    const captions = []
    const promptLower = prompt.toLowerCase()
    const promptWords = promptLower.split(" ").filter((word) => word.length > 2)

    // Look for exact or similar phrases in the transcript
    const segments = transcript.segments || []
    const transcriptText = transcript.text.toLowerCase()

    // Strategy 1: Look for direct prompt matches in transcript
    promptWords.forEach((word) => {
      segments.forEach((segment) => {
        if (segment.text.toLowerCase().includes(word)) {
          // Extract the relevant phrase
          const words = segment.text.split(" ")
          const wordIndex = words.findIndex((w) => w.toLowerCase().includes(word))
          if (wordIndex !== -1) {
            // Get a short phrase around the matched word
            const start = Math.max(0, wordIndex - 1)
            const end = Math.min(words.length, wordIndex + 2)
            const phrase = words.slice(start, end).join(" ")
            if (phrase.length <= 25 && !captions.includes(phrase)) {
              captions.push(phrase)
            }
          }
        }
      })
    })

    // Strategy 2: If no direct matches, create thematic captions based on content
    if (captions.length === 0) {
      // Look for emotional or action words in transcript
      const emotionalWords = ["perfect", "amazing", "great", "awesome", "incredible", "fantastic", "wonderful"]
      const actionWords = ["doing", "going", "trying", "working", "making", "getting"]

      segments.forEach((segment) => {
        const segmentLower = segment.text.toLowerCase()
        emotionalWords.forEach((word) => {
          if (segmentLower.includes(word)) {
            captions.push(segment.text.split(" ").find((w) => w.toLowerCase().includes(word)) || word)
          }
        })
      })
    }

    // Strategy 3: Create prompt-themed variations of actual content
    if (captions.length < 3) {
      const baseWords = this.extractKeyWordsFromTranscript(transcript)
      baseWords.forEach((word) => {
        if (captions.length < 3) {
          captions.push(this.combinePromptWithContent(prompt, word))
        }
      })
    }

    // Ensure we have at least 3 captions
    while (captions.length < 3) {
      captions.push(`${prompt} moment`)
    }

    return captions.slice(0, 3)
  }

  extractKeyWordsFromTranscript(transcript) {
    const words = transcript.text
      .split(" ")
      .filter((word) => word.length > 3)
      .filter(
        (word) =>
          !["that", "this", "with", "have", "will", "from", "they", "been", "were"].includes(word.toLowerCase()),
      )
      .slice(0, 10)

    return words
  }

  combinePromptWithContent(prompt, contentWord) {
    const promptLower = prompt.toLowerCase()

    if (promptLower.includes("perfect")) {
      return `Perfect ${contentWord}`
    } else if (promptLower.includes("amazing")) {
      return `Amazing ${contentWord}`
    } else if (promptLower.includes("funny")) {
      return `Funny ${contentWord}`
    } else {
      return `${prompt} ${contentWord}`
    }
  }

  generateContextualCaption(segment, prompt, index) {
    if (segment && segment.text) {
      // Try to extract a meaningful phrase from the segment
      const words = segment.text.split(" ")
      if (words.length <= 3) {
        return segment.text
      } else {
        // Take first few words or last few words
        return index % 2 === 0 ? words.slice(0, 3).join(" ") : words.slice(-3).join(" ")
      }
    }

    return `${prompt} ${index + 1}`
  }

  findRelevantSegment(segments, startTime, endTime) {
    return segments.find(
      (segment) =>
        (segment.start <= startTime && segment.end >= endTime) ||
        (segment.start >= startTime && segment.start < endTime) ||
        (segment.end > startTime && segment.end <= endTime),
    )
  }

  createFallbackTranscript() {
    return {
      text: "Video content with various scenes and moments suitable for GIF creation",
      segments: [
        { start: 0, end: 3, text: "Opening content with potential for engagement" },
        { start: 3, end: 6, text: "Mid-video content with visual interest" },
        { start: 6, end: 9, text: "Closing content with memorable moments" },
      ],
    }
  }

  async testConnection() {
    try {
      console.log("🔍 Testing OpenRouter connection...")

      const completion = await this.openai.chat.completions.create({
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: "Hello, test message." }],
        max_tokens: 10,
      })

      console.log("✅ OpenRouter connection successful")
      return true
    } catch (error) {
      console.error("❌ OpenRouter connection failed:", error)
      return false
    }
  }
}

export default new AIService()
