import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs-extra"

// Load environment variables FIRST
dotenv.config()

// 🔐 Reconstruct cookies.txt from env if available (for yt-dlp authentication)
const cookiesDir = path.join(__dirname, "..", "config")
const cookiesPath = path.join(cookiesDir, "cookies.txt")

if (process.env.YOUTUBE_COOKIES) {
  try {
    fs.ensureDirSync(cookiesDir)
    fs.writeFileSync(cookiesPath, process.env.YOUTUBE_COOKIES, "utf-8")
    console.log("✅ YouTube cookies.txt created at:", cookiesPath)
  } catch (err) {
    console.error("❌ Failed to write cookies.txt:", err.message)
  }
} else {
  console.log("⚠️ YOUTUBE_COOKIES environment variable not set. Skipping cookies.txt creation.")
}

// Debug environment variables
console.log("🔍 Environment Debug:")
console.log("NODE_ENV:", process.env.NODE_ENV)
console.log("PORT:", process.env.PORT)
console.log("OPENROUTER_API_KEY exists:", !!process.env.OPENROUTER_API_KEY)
console.log("OPENROUTER_API_KEY length:", process.env.OPENROUTER_API_KEY?.length || 0)
if (process.env.OPENROUTER_API_KEY) {
  console.log("OPENROUTER_API_KEY preview:", process.env.OPENROUTER_API_KEY.substring(0, 20) + "...")
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

// Ensure required directories exist
const requiredDirs = ["uploads", "output", "temp", "assets", "assets/fonts"]
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

// Serve static files
app.use("/output", express.static(path.join(__dirname, "../output")))
app.use("/uploads", express.static(path.join(__dirname, "../uploads")))
app.use("/assets", express.static(path.join(__dirname, "../assets")))

// Health check (before importing routes that might fail)
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "AI GIF Generator API is running",
    timestamp: new Date().toISOString(),
    openrouterConfigured: !!process.env.OPENROUTER_API_KEY,
    fontAvailable: fs.existsSync(fontPath),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      fontPath: fontPath,
    },
  })
})

// Only import and use API routes if environment is properly configured
if (process.env.OPENROUTER_API_KEY) {
  console.log("✅ Environment configured, loading API routes...")

  // Dynamic import to ensure environment variables are loaded first
  const { default: apiRoutes } = await import("./routes/api.js")
  app.use("/api", apiRoutes)

  console.log("✅ API routes loaded successfully")
} else {
  console.log("❌ OPENROUTER_API_KEY not found, API routes disabled")

  // Provide a helpful error endpoint
  app.use("/api/*", (req, res) => {
    res.status(500).json({
      success: false,
      message: "API not available - OPENROUTER_API_KEY not configured",
      error: "Please check your .env file and ensure OPENROUTER_API_KEY is set",
    })
  })
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("❌ Server Error:", error)
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📁 Upload directory: ${path.join(__dirname, "../uploads")}`)
  console.log(`🎬 Output directory: ${path.join(__dirname, "../output")}`)
  console.log(`🔤 Font directory: ${path.join(__dirname, "../assets/fonts")}`)

  if (!process.env.OPENROUTER_API_KEY) {
    console.log("⚠️  WARNING: OPENROUTER_API_KEY not found!")
    console.log("⚠️  Please check your .env file in the backend directory")
    console.log("⚠️  API endpoints will not work until this is configured")
  }

  if (!fs.existsSync(fontPath)) {
    console.log("⚠️  WARNING: OpenSans-Regular.ttf font not found!")
    console.log("⚠️  Please add the font file to assets/fonts/ directory")
    console.log("⚠️  GIFs will be created without captions until font is available")
  }
})
