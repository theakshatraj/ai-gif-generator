import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs-extra"
import session from 'express-session';
import passport from 'passport';
const mongoose = require('mongoose');
require('./services/passport');

// Load environment variables FIRST
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Debug environment variables
console.log("🔍 Environment Debug:")
console.log("NODE_ENV:", process.env.NODE_ENV)
console.log("PORT:", process.env.PORT)
console.log("OPENROUTER_API_KEY exists:", !!process.env.OPENROUTER_API_KEY)
console.log("OPENROUTER_API_KEY length:", process.env.OPENROUTER_API_KEY?.length || 0)
console.log("YOUTUBE_API_KEY exists:", !!process.env.YOUTUBE_API_KEY)

if (process.env.OPENROUTER_API_KEY) {
  console.log("OPENROUTER_API_KEY preview:", process.env.OPENROUTER_API_KEY.substring(0, 20) + "...")
}

const app = express()
const PORT = process.env.PORT || 5000

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

// Ensure required directories exist
const requiredDirs = ["uploads", "output", "temp", "cache", "assets", "assets/fonts"]
requiredDirs.forEach((dir) => {
  const dirPath = path.join(__dirname, "..", dir)
  fs.ensureDirSync(dirPath)
  console.log(`📁 Directory ensured: ${dirPath}`)
})

// Check if font exists
const fontPath = path.join(__dirname, "..", "assets", "fonts", "OpenSans-Regular.ttf")
if (fs.existsSync(fontPath)) {
  console.log(`✅ Font file found: ${fontPath}`)
} else {
  console.log(`❌ Font file missing: ${fontPath}`)
  console.log("⚠️ Please ensure OpenSans-Regular.ttf is in the assets/fonts directory")
}

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
)

app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))
app.use(session({
  secret: process.env.JWT_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// Serve static files
app.use("/output", express.static(path.join(__dirname, "../output")))
app.use("/uploads", express.static(path.join(__dirname, "../uploads")))
app.use("/assets", express.static(path.join(__dirname, "../assets")))

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "AI GIF Generator API is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    configuration: {
      openrouterConfigured: !!process.env.OPENROUTER_API_KEY,
      youtubeApiConfigured: !!process.env.YOUTUBE_API_KEY,
      fontAvailable: fs.existsSync(fontPath),
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
    },
    features: {
      youtubeTranscriptExtraction: true,
      puppeteerScraping: true,
      aiAnalysis: !!process.env.OPENROUTER_API_KEY,
      gifGeneration: fs.existsSync(fontPath),
    },
  })
})

// Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "AI GIF Generator API is running",
    status: "healthy",
    endpoints: {
      health: "/health",
      testYoutube: "/api/test-youtube",
      generateGifs: "/api/generate",
      getGif: "/api/gifs/:id"
    }
  })
})

// Test endpoint for YouTube service
app.get("/api/test-youtube", async (req, res) => {
  try {
    const testUrl = req.query.url || "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

    // Dynamic import to test YouTube service
    const { default: youtubeService } = await import("./services/youtubeService.js")

    console.log(`🧪 Testing YouTube service with URL: ${testUrl}`)

    const videoId = youtubeService.extractVideoId(testUrl)
    if (!videoId) {
      throw new Error("Invalid YouTube URL")
    }

    // Test transcript extraction (without full processing)
    const startTime = Date.now()
    const transcript = await youtubeService.getVideoTranscript(testUrl)
    const processingTime = Date.now() - startTime

    res.json({
      success: true,
      message: "YouTube service test successful",
      data: {
        videoId,
        transcriptLength: transcript.text.length,
        segmentCount: transcript.segments.length,
        processingTime: `${processingTime}ms`,
        preview: transcript.text.substring(0, 200) + "...",
      },
    })
  } catch (error) {
    console.error("❌ YouTube service test failed:", error)
    res.status(500).json({
      success: false,
      message: "YouTube service test failed",
      error: error.message,
    })
  }
})

// Only load API routes if environment is properly configured
if (process.env.OPENROUTER_API_KEY) {
  console.log("✅ Environment configured, loading API routes...")

  try {
    // Dynamic import to ensure environment variables are loaded first
    const { default: apiRoutes } = await import("./routes/api.js")
    app.use("/api", apiRoutes)
    console.log("✅ API routes loaded successfully")
  } catch (importError) {
    console.error("❌ Failed to load API routes:", importError)
    console.error("❌ Stack trace:", importError.stack)

    // Provide error endpoint if routes fail to load
    app.use("/api/*", (req, res) => {
      res.status(500).json({
        success: false,
        message: "API routes failed to load",
        error: importError.message,
      })
    })
  }
} else {
  console.log("❌ OPENROUTER_API_KEY not found, API routes disabled")

  // Provide a helpful error endpoint
  app.use("/api/*", (req, res) => {
    res.status(500).json({
      success: false,
      message: "API not available - OPENROUTER_API_KEY not configured",
      error: "Please check your .env file and ensure OPENROUTER_API_KEY is set",
      requiredEnvVars: {
        OPENROUTER_API_KEY: "Required for AI analysis",
        YOUTUBE_API_KEY: "Optional - for YouTube Data API fallback",
        FRONTEND_URL: "Optional - defaults to http://localhost:5173",
      },
    })
  })
}

// Fix the graceful shutdown handlers - wrap in try-catch
process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received, shutting down gracefully...")

  try {
    // Clean up YouTube service (close browser instances)
    const { default: youtubeService } = await import("./services/youtubeService.js")
    await youtubeService.cleanup()
    console.log("✅ YouTube service cleanup completed")
  } catch (error) {
    console.error("❌ Error during cleanup:", error)
  }

  // Give it a moment to clean up, then exit
  setTimeout(() => {
    process.exit(0)
  }, 1000)
})

process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received, shutting down gracefully...")

  try {
    // Clean up YouTube service (close browser instances)
    const { default: youtubeService } = await import("./services/youtubeService.js")
    await youtubeService.cleanup()
    console.log("✅ YouTube service cleanup completed")
  } catch (error) {
    console.error("❌ Error during cleanup:", error)
  }

  // Give it a moment to clean up, then exit
  setTimeout(() => {
    process.exit(0)
  }, 1000)
})

// Add uncaught exception handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  console.error('❌ Stack trace:', error.stack)
  
  // Try to cleanup before exiting
  setTimeout(() => {
    process.exit(1)
  }, 1000)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  console.error('❌ Stack trace:', reason?.stack)
  
  // Don't exit on unhandled rejection, just log it
})

// Start the server with error handling
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📁 Upload directory: ${path.join(__dirname, "../uploads")}`)
  console.log(`🎬 Output directory: ${path.join(__dirname, "../output")}`)
  console.log(`💾 Cache directory: ${path.join(__dirname, "../cache")}`)
  console.log(`🔤 Font directory: ${path.join(__dirname, "../assets/fonts")}`)

  // Configuration warnings
  if (!process.env.OPENROUTER_API_KEY) {
    console.log("⚠️  WARNING: OPENROUTER_API_KEY not found!")
    console.log("⚠️  Please check your .env file in the backend directory")
    console.log("⚠️  API endpoints will not work until this is configured")
  }

  if (!process.env.YOUTUBE_API_KEY) {
    console.log("ℹ️  INFO: YOUTUBE_API_KEY not found (optional)")
    console.log("ℹ️  YouTube transcript extraction will use alternative methods")
  }

  if (!fs.existsSync(fontPath)) {
    console.log("⚠️  WARNING: OpenSans-Regular.ttf font not found!")
    console.log("⚠️  Please add the font file to assets/fonts/ directory")
    console.log("⚠️  GIFs will be created without captions until font is available")
  }

  console.log("\n🎯 Ready to process YouTube videos without yt-dlp!")
  console.log("🧪 Test the YouTube service at: GET /api/test-youtube?url=<youtube_url>")
})

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error)
  
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`)
  }
})