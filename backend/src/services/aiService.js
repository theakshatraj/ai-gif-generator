import OpenAI from "openai"
import fs from "fs"

class AIService {
  constructor() {
    // Debug logging
    console.log("🔧 Initializing AIService...")
    console.log("🔍 OPENROUTER_API_KEY exists:", !!process.env.OPENROUTER_API_KEY)
    console.log("🔍 OPENROUTER_API_KEY length:", process.env.OPENROUTER_API_KEY?.length || 0)

    // Check if OpenRouter API key is available
    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      console.error("❌ OPENROUTER_API_KEY environment variable is missing or empty")
      console.error(
        "Available environment variables:",
        Object.keys(process.env).filter((key) => key.includes("API")),
      )
      throw new Error("OPENROUTER_API_KEY environment variable is missing or empty. Please check your .env file.")
    }

    console.log("✅ OpenRouter API key found, initializing client...")

    // Configure OpenAI client to use OpenRouter
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
      console.log("🎤 Transcribing audio with Whisper via OpenRouter...")

      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`)
      }

      const audioFile = fs.createReadStream(audioPath)

      // Note: OpenRouter may not support audio transcriptions
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: "openai/whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
      })

      console.log("✅ Audio transcribed successfully")
      console.log(`📝 Transcript: ${transcription.text.substring(0, 200)}...`)
      return transcription
    } catch (error) {
      console.error("❌ Transcription Error:", error)

      console.log("⚠️ Using fallback transcript due to transcription error")
      // Create more realistic fallback segments based on video duration
      return {
        text: "This video contains various moments that could be interesting for GIF creation. The content includes different scenes and activities throughout the duration.",
        segments: [
          { start: 0, end: 3, text: "Opening scene with initial activity" },
          { start: 3, end: 6, text: "Middle section with main content" },
          { start: 6, end: 9, text: "Closing moments with final activity" },
        ],
      }
    }
  }

  async analyzeTranscriptWithTimestamps(transcript, prompt, videoDuration) {
    try {
      console.log("🤖 Analyzing transcript with AI via OpenRouter...")
      console.log(`📊 Video duration: ${videoDuration} seconds`)

      const systemPrompt = `You are a meme GIF caption generator. Your job is to create FUNNY, RELATABLE, and ENGAGING captions for GIFs based on video content and user prompts.

CAPTION STYLE GUIDELINES:
- Write like popular meme captions (funny, relatable, internet culture)
- Use casual language, slang, and meme formats
- Keep captions SHORT (15-25 characters max)
- Make them PUNCHY and MEMORABLE
- Use formats like:
  * "When you..." 
  * "Me trying to..."
  * "POV: you're..."
  * "That feeling when..."
  * Direct quotes or reactions
  * Relatable situations

EXAMPLES OF GOOD MEME CAPTIONS:
- "When Monday hits"
- "Me pretending to work"
- "POV: you're broke"
- "That's sus"
- "Big mood"
- "Me avoiding responsibilities"
- "When the beat drops"
- "Caught in 4K"
- "Main character energy"

Return EXACTLY 3 moments with this structure:
[
  {
    "startTime": 0,
    "endTime": 3,
    "caption": "Meme-style caption here",
    "reason": "Why this moment matches the prompt"
  }
]

Rules:
- MUST return exactly 3 moments
- Each moment should be 2-3 seconds long
- startTime and endTime should be integers (seconds)
- Moments should not overlap significantly
- Caption should be MEME-STYLE (max 25 characters)
- Focus on the most engaging/meme-worthy parts
- Ensure endTime does not exceed ${videoDuration} seconds
- Return ONLY the JSON array, no other text`

      const userPrompt = `Video Duration: ${videoDuration} seconds
User Prompt: "${prompt}"

Video Content Analysis:
${transcript.text}

Detailed Segments:
${transcript.segments?.map((seg) => `${Math.floor(seg.start)}s-${Math.floor(seg.end)}s: ${seg.text}`).join("\n") || "No segments available"}

Create EXACTLY 3 meme-style GIF moments based on the prompt "${prompt}". 

Focus on making captions that are:
1. FUNNY and relatable
2. Match internet meme culture
3. Are SHORT and punchy
4. Would make people want to share the GIF

Return only the JSON array with meme captions.`

      // Use the correct OpenAI model available on OpenRouter
      const completion = await this.openai.chat.completions.create({
        model: "openai/gpt-3.5-turbo-0613",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.9, // Higher temperature for more creative/funny responses
        max_tokens: 800,
      })

      const response = completion.choices[0].message.content.trim()
      console.log("🤖 AI Response:", response)

      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/)
        const jsonString = jsonMatch ? jsonMatch[0] : response
        const moments = JSON.parse(jsonString)

        if (Array.isArray(moments) && moments.length > 0) {
          let validMoments = moments
            .filter(
              (moment) =>
                typeof moment.startTime === "number" &&
                typeof moment.endTime === "number" &&
                moment.startTime < moment.endTime &&
                moment.endTime <= videoDuration &&
                moment.startTime >= 0,
            )
            .slice(0, 3) // Ensure exactly 3

          // If we don't have 3 valid moments, create meme-style fallback moments
          if (validMoments.length < 3) {
            console.log(`⚠️ Only ${validMoments.length} valid moments found, creating meme-style fallback moments`)
            validMoments = this.createMemeStyleFallbackMoments(transcript, videoDuration, prompt)
          }

          console.log("✅ AI analysis completed successfully")
          console.log(`📊 Found ${validMoments.length} meme-worthy moments`)
          return validMoments
        }

        throw new Error("Invalid moments structure")
      } catch (parseError) {
        console.error("❌ Failed to parse AI response as JSON:", parseError)
        throw new Error("Invalid AI response format")
      }
    } catch (error) {
      console.error("❌ AI Analysis Error:", error)

      const fallbackMoments = this.createMemeStyleFallbackMoments(transcript, videoDuration, prompt)
      console.log("⚠️ AI analysis failed, using meme-style fallback moments")
      return fallbackMoments
    }
  }

  createMemeStyleFallbackMoments(transcript, videoDuration, prompt) {
    console.log("📋 Creating meme-style fallback moments...")
    console.log(`📊 Video duration: ${videoDuration} seconds`)

    const moments = []
    const promptLower = prompt.toLowerCase()

    // Generate meme captions based on prompt keywords
    let memeTemplates = []

    if (promptLower.includes("laugh") || promptLower.includes("funny") || promptLower.includes("comedy")) {
      memeTemplates = ["When it's actually funny", "Me laughing at my problems", "That's hilarious"]
    } else if (promptLower.includes("dance") || promptLower.includes("dancing")) {
      memeTemplates = ["When the beat drops", "Main character energy", "Me at 3AM"]
    } else if (promptLower.includes("action") || promptLower.includes("fight")) {
      memeTemplates = ["About to do something", "Main character moment", "That's intense"]
    } else if (promptLower.includes("sad") || promptLower.includes("cry")) {
      memeTemplates = ["Big sad energy", "Me on Monday", "That hits different"]
    } else if (promptLower.includes("surprise") || promptLower.includes("shock")) {
      memeTemplates = ["Plot twist", "Didn't see that coming", "Caught in 4K"]
    } else if (promptLower.includes("love") || promptLower.includes("romantic")) {
      memeTemplates = ["When you're in love", "Relationship goals", "That's cute"]
    } else if (promptLower.includes("angry") || promptLower.includes("mad")) {
      memeTemplates = ["When someone lies", "Big mad energy", "That's not it"]
    } else {
      // Generic meme templates
      memeTemplates = ["Big mood", "That's a vibe", "Main character energy"]
    }

    // Always create exactly 3 moments regardless of video duration
    if (videoDuration >= 9) {
      // For videos 9+ seconds, create 3 non-overlapping 3-second segments
      moments.push(
        {
          startTime: 0,
          endTime: 3,
          caption: memeTemplates[0] || "Opening vibes",
          reason: "Opening moment with meme potential",
        },
        {
          startTime: Math.floor(videoDuration / 2) - 1,
          endTime: Math.floor(videoDuration / 2) + 2,
          caption: memeTemplates[1] || "Peak content",
          reason: "Middle moment with high engagement",
        },
        {
          startTime: videoDuration - 3,
          endTime: videoDuration,
          caption: memeTemplates[2] || "Ending energy",
          reason: "Closing moment with impact",
        },
      )
    } else if (videoDuration >= 6) {
      // For 6-8 second videos, create 3 segments with minimal overlap
      moments.push(
        {
          startTime: 0,
          endTime: 2,
          caption: memeTemplates[0] || "Start vibes",
          reason: "Opening meme moment",
        },
        {
          startTime: 2,
          endTime: 4,
          caption: memeTemplates[1] || "Mid energy",
          reason: "Middle meme moment",
        },
        {
          startTime: videoDuration - 2,
          endTime: videoDuration,
          caption: memeTemplates[2] || "End mood",
          reason: "Closing meme moment",
        },
      )
    } else {
      // For very short videos, create 3 overlapping segments
      const segmentLength = Math.max(2, Math.floor(videoDuration / 2))
      for (let i = 0; i < 3; i++) {
        const startTime = Math.floor((videoDuration / 4) * i)
        const endTime = Math.min(startTime + segmentLength, videoDuration)

        moments.push({
          startTime,
          endTime,
          caption: memeTemplates[i] || `Vibe ${i + 1}`,
          reason: `Meme moment ${i + 1}`,
        })
      }
    }

    console.log(`📊 Created exactly ${moments.length} meme-style fallback moments:`)
    moments.forEach((moment, index) => {
      console.log(`  ${index + 1}. ${moment.startTime}s-${moment.endTime}s: "${moment.caption}"`)
    })

    return moments
  }

  async testConnection() {
    try {
      console.log("🔍 Testing OpenRouter connection...")

      const completion = await this.openai.chat.completions.create({
        model: "openai/gpt-3.5-turbo-0613",
        messages: [{ role: "user", content: "Hello, this is a test message." }],
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