import fs from "fs"
import path from "path"

class ValidationService {
  constructor() {
    this.validationResults = []
  }

  // Validate the entire GIF generation pipeline
  async validateGifGeneration(prompt, videoInfo, transcript, moments, gifs) {
    console.log("🔍 Running comprehensive validation...")

    const validation = {
      timestamp: new Date().toISOString(),
      prompt,
      videoInfo,
      results: {
        promptAnalysis: this.validatePromptAnalysis(prompt),
        contentRelevance: this.validateContentRelevance(prompt, transcript),
        momentSelection: this.validateMomentSelection(moments, transcript, videoInfo.duration),
        gifQuality: this.validateGifQuality(gifs),
        overallScore: 0,
      },
    }

    // Calculate overall score
    const scores = [
      validation.results.promptAnalysis.score,
      validation.results.contentRelevance.score,
      validation.results.momentSelection.score,
      validation.results.gifQuality.score,
    ]

    validation.results.overallScore = scores.reduce((a, b) => a + b, 0) / scores.length

    // Store validation result
    this.validationResults.push(validation)

    // Log results
    console.log("📊 Validation Results:")
    console.log(`  Prompt Analysis: ${validation.results.promptAnalysis.score.toFixed(2)}`)
    console.log(`  Content Relevance: ${validation.results.contentRelevance.score.toFixed(2)}`)
    console.log(`  Moment Selection: ${validation.results.momentSelection.score.toFixed(2)}`)
    console.log(`  GIF Quality: ${validation.results.gifQuality.score.toFixed(2)}`)
    console.log(`  Overall Score: ${validation.results.overallScore.toFixed(2)}`)

    if (validation.results.overallScore < 0.6) {
      console.log("⚠️ Low validation score - consider reviewing the generation process")
    } else if (validation.results.overallScore > 0.8) {
      console.log("✅ High validation score - excellent generation quality")
    }

    return validation
  }

  validatePromptAnalysis(prompt) {
    const promptLower = prompt.toLowerCase()
    let score = 0.5 // Base score
    const analysis = []

    // Check if prompt is specific enough
    if (prompt.length > 10) {
      score += 0.1
      analysis.push("Good prompt length")
    } else {
      analysis.push("Prompt might be too short")
    }

    // Check for emotional context
    if (/funny|sad|exciting|emotional|dramatic/.test(promptLower)) {
      score += 0.2
      analysis.push("Contains emotional context")
    }

    // Check for action context
    if (/dance|talk|move|action|sport/.test(promptLower)) {
      score += 0.2
      analysis.push("Contains action context")
    }

    // Check for specific requests
    if (/moment|scene|highlight|best|quote/.test(promptLower)) {
      score += 0.1
      analysis.push("Contains specific requests")
    }

    return {
      score: Math.min(1.0, score),
      analysis,
      isSpecific: score > 0.7,
    }
  }

  validateContentRelevance(prompt, transcript) {
    const promptWords = prompt.toLowerCase().split(/\s+/)
    const transcriptText = transcript.text?.toLowerCase() || ""

    let matchCount = 0
    const matchedWords = []

    // Count word matches
    promptWords.forEach((word) => {
      if (word.length > 3 && transcriptText.includes(word)) {
        matchCount++
        matchedWords.push(word)
      }
    })

    const relevanceScore = Math.min(1.0, matchCount / Math.max(1, promptWords.length))

    return {
      score: relevanceScore,
      matchCount,
      matchedWords,
      hasGoodRelevance: relevanceScore > 0.3,
    }
  }

  validateMomentSelection(moments, transcript, videoDuration) {
    if (!moments || moments.length === 0) {
      return {
        score: 0,
        issues: ["No moments selected"],
      }
    }

    let score = 0.5 // Base score
    const issues = []
    const positives = []

    // Check moment count
    if (moments.length >= 3) {
      score += 0.1
      positives.push("Good number of moments")
    } else {
      issues.push("Too few moments selected")
    }

    // Check moment durations
    const durations = moments.map((m) => m.endTime - m.startTime)
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length

    if (avgDuration >= 2 && avgDuration <= 5) {
      score += 0.2
      positives.push("Good average duration")
    } else if (avgDuration < 1) {
      issues.push("Moments too short")
    } else if (avgDuration > 8) {
      issues.push("Moments too long")
    }

    // Check for overlapping moments
    const hasOverlap = this.checkForOverlaps(moments)
    if (!hasOverlap) {
      score += 0.1
      positives.push("No overlapping moments")
    } else {
      issues.push("Some moments overlap")
    }

    // Check confidence scores
    const avgConfidence = moments.reduce((sum, m) => sum + (m.confidence || 0.5), 0) / moments.length
    if (avgConfidence > 0.7) {
      score += 0.2
      positives.push("High confidence scores")
    } else if (avgConfidence < 0.4) {
      issues.push("Low confidence scores")
    }

    return {
      score: Math.min(1.0, score),
      avgDuration,
      avgConfidence,
      hasOverlap,
      issues,
      positives,
    }
  }

  validateGifQuality(gifs) {
    if (!gifs || gifs.length === 0) {
      return {
        score: 0,
        issues: ["No GIFs created"],
      }
    }

    let score = 0.5 // Base score
    const issues = []
    const positives = []

    // Check GIF count
    if (gifs.length >= 3) {
      score += 0.1
      positives.push("Good number of GIFs created")
    }

    // Check file sizes
    const sizes = gifs.map((gif) => {
      const sizeStr = gif.size || "0KB"
      return Number.parseInt(sizeStr.replace("KB", ""))
    })

    const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length

    if (avgSize > 100 && avgSize < 2000) {
      score += 0.2
      positives.push("Good average file size")
    } else if (avgSize < 50) {
      issues.push("GIFs might be too small")
    } else if (avgSize > 3000) {
      issues.push("GIFs might be too large")
    }

    // Check captions
    const hasGoodCaptions = gifs.every((gif) => gif.caption && gif.caption.length > 3)
    if (hasGoodCaptions) {
      score += 0.2
      positives.push("All GIFs have good captions")
    } else {
      issues.push("Some GIFs have poor captions")
    }

    // Check quality scores if available
    const qualityScores = gifs.filter((gif) => gif.qualityScore).map((gif) => gif.qualityScore)
    if (qualityScores.length > 0) {
      const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
      if (avgQuality > 0.7) {
        score += 0.1
        positives.push("High quality scores")
      }
    }

    return {
      score: Math.min(1.0, score),
      avgSize,
      hasGoodCaptions,
      issues,
      positives,
    }
  }

  checkForOverlaps(moments) {
    for (let i = 0; i < moments.length; i++) {
      for (let j = i + 1; j < moments.length; j++) {
        const moment1 = moments[i]
        const moment2 = moments[j]

        if (
          (moment1.startTime < moment2.endTime && moment1.endTime > moment2.startTime) ||
          (moment2.startTime < moment1.endTime && moment2.endTime > moment1.startTime)
        ) {
          return true
        }
      }
    }
    return false
  }

  // Get validation statistics
  getValidationStats() {
    if (this.validationResults.length === 0) {
      return { message: "No validation results available" }
    }

    const scores = this.validationResults.map((v) => v.results.overallScore)
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
    const highQualityCount = scores.filter((s) => s > 0.8).length
    const lowQualityCount = scores.filter((s) => s < 0.6).length

    return {
      totalValidations: this.validationResults.length,
      averageScore: avgScore.toFixed(2),
      highQualityPercentage: ((highQualityCount / scores.length) * 100).toFixed(1),
      lowQualityPercentage: ((lowQualityCount / scores.length) * 100).toFixed(1),
      recentResults: this.validationResults.slice(-5),
    }
  }

  // Save validation results to file
  saveValidationResults() {
    try {
      const resultsPath = path.join(process.cwd(), "validation_results.json")
      fs.writeFileSync(resultsPath, JSON.stringify(this.validationResults, null, 2))
      console.log(`📊 Validation results saved to ${resultsPath}`)
    } catch (error) {
      console.error("❌ Failed to save validation results:", error)
    }
  }
}

export default new ValidationService()
