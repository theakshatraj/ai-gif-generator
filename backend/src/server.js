import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs-extra"

// Load environment variables FIRST
dotenv.config()

// Railway-specific environment detection
const isRailway = process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_NAME
const PORT = process.env.PORT || 5000

console.log("🚂 Railway Environment Detection:")
console.log("Is Railway:", !!isRailway)
console.log("Railway Project:", process.env.RAILWAY_PROJECT_NAME || "Not detected")
console.log("Railway Environment:", process.env.RAILWAY_ENVIRONMENT_NAME || "Not detected")
console.log("Port:", PORT)

// Debug environment variables with your specific names
console.log("🔍 Environment Debug:")
console.log("NODE_ENV:", process.env.NODE_ENV)
console.log("OPENROUTER_API_KEY exists:", !!process.env.OPENROUTER_API_KEY)
console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY)
console.log("YTDLP_COOKIES exists:", !!process.env.YTDLP_COOKIES)
console.log("MAX_FILE_SIZE:", process.env.MAX_FILE_SIZE)
console.log("FRONTEND_URL:", process.env.FRONTEND_URL)

// Directory configuration from environment variables
console.log("📁 Directory Configuration:")
console.log("UPLOAD_DIR:", process.env.UPLOAD_DIR)
console.log("OUTPUT_DIR:", process.env.OUTPUT_DIR)
console.log("TEMP_DIR:", process.env.TEMP_DIR)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Use environment variables for directories or fallback to defaults
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, "../uploads")
const outputDir = process.env.OUTPUT_DIR || path.join(__dirname, "../output")
const tempDir = process.env.TEMP_DIR || path.join(__dirname, "../temp")
const cacheDir = path.join(__dirname, "../.cache")
const assetsDir = path.join(__dirname, "../assets")
const fontsDir = path.join(__dirname, "../assets/fonts")

// Railway-specific: Ensure required directories exist
const requiredDirs = [uploadDir, outputDir, tempDir, cacheDir, assetsDir, fontsDir]
requiredDirs.forEach((dir) => {
  fs.ensureDirSync(dir)
  console.log(`📁 Directory ensured: ${dir}`)
})

// Check if font exists
const fontPath = path.join(fontsDir, "OpenSans-Regular.ttf")
const fontExists = fs.existsSync(fontPath)
console.log(`${fontExists ? "✅" : "❌"} Font file: ${fontPath}`)

// Railway-specific: Check for cookies in YTDLP_COOKIES environment variable
const hasCookies = !!process.env.YTDLP_COOKIES
console.log(`${hasCookies ? "✅" : "⚠️"} YTDLP_COOKIES: ${hasCookies ? "Available in env var" : "Not provided"}`)

// Parse MAX_FILE_SIZE
const maxFileSize = process.env.MAX_FILE_SIZE ? Number.parseInt(process.env.MAX_FILE_SIZE) : 50 * 1024 * 1024 // Default 50MB
console.log("📏 Max file size:", `${Math.round(maxFileSize / 1024 / 1024)}MB`)

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*", // Railway-specific: use FRONTEND_URL or allow all
    credentials: true,
  }),
)

app.use(express.json({ limit: `${Math.round(maxFileSize / 1024 / 1024)}mb` }))
app.use(express.urlencoded({ extended: true, limit: `${Math.round(maxFileSize / 1024 / 1024)}mb` }))

// Serve static files using environment variable paths
app.use("/output", express.static(outputDir))
app.use("/uploads", express.static(uploadDir))
app.use("/assets", express.static(assetsDir))

// Railway-specific health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "AI GIF Generator API is running on Railway",
    timestamp: new Date().toISOString(),
    railway: {
      isRailway: !!isRailway,
      projectName: process.env.RAILWAY_PROJECT_NAME,
      environmentName: process.env.RAILWAY_ENVIRONMENT_NAME,
      deploymentId: process.env.RAILWAY_DEPLOYMENT_ID,
    },
    configuration: {
      openrouterConfigured: !!process.env.OPENROUTER_API_KEY,
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      fontAvailable: fontExists,
      cookiesAvailable: hasCookies,
      port: PORT,
      maxFileSize: `${Math.round(maxFileSize / 1024 / 1024)}MB`,
      frontendUrl: process.env.FRONTEND_URL,
    },
    directories: {
      uploads: { path: uploadDir, exists: fs.existsSync(uploadDir) },
      output: { path: outputDir, exists: fs.existsSync(outputDir) },
      temp: { path: tempDir, exists: fs.existsSync(tempDir) },
      cache: { path: cacheDir, exists: fs.existsSync(cacheDir) },
      assets: { path: assetsDir, exists: fs.existsSync(assetsDir) },
      fonts: { path: fontsDir, exists: fs.existsSync(fontsDir) },
    },
    environmentVariables: {
      NODE_ENV: process.env.NODE_ENV,
      UPLOAD_DIR: process.env.UPLOAD_DIR,
      OUTPUT_DIR: process.env.OUTPUT_DIR,
      TEMP_DIR: process.env.TEMP_DIR,
      MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
      FRONTEND_URL: process.env.FRONTEND_URL,
      YTDLP_COOKIES: !!process.env.YTDLP_COOKIES,
    },
  })
})

// Railway-specific: Root endpoint for Railway's health checks
app.get("/", (req, res) => {
  res.json({
    message: "AI GIF Generator API",
    status: "running",
    railway: !!isRailway,
    version: "1.0.0",
  })
})

// Only import and use API routes if environment is properly configured
if (process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY) {
  console.log("✅ AI API keys configured, loading API routes...")
  try {
    const { default: apiRoutes } = await import("./routes/api.js")
    app.use("/api", apiRoutes)
    console.log("✅ API routes loaded successfully")
  } catch (error) {
    console.error("❌ Failed to load API routes:", error)
  }
} else {
  console.log("❌ No AI API keys found, API routes disabled")
  app.use("/api/*", (req, res) => {
    res.status(500).json({
      success: false,
      message: "API not available - No AI API keys configured",
      error: "Please set OPENROUTER_API_KEY or OPENAI_API_KEY in Railway environment variables",
    })
  })
}

// Railway-specific error handling
app.use((error, req, res, next) => {
  console.error("❌ Server Error:", error)

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: "File too large",
      message: `Please upload a file smaller than ${Math.round(maxFileSize / 1024 / 1024)}MB`,
      maxSize: `${Math.round(maxFileSize / 1024 / 1024)}MB`,
    })
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    railway: !!isRailway,
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  })
})

// Railway-specific graceful shutdown
process.on("SIGTERM", () => {
  console.log("🚂 Railway SIGTERM received, shutting down gracefully")
  process.exit(0)
})

process.on("SIGINT", () => {
  console.log("🚂 Railway SIGINT received, shutting down gracefully")
  process.exit(0)
})

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚂 Server running on Railway at port ${PORT}`)
  console.log(`🌐 Health check: https://your-app.railway.app/health`)

  // Environment variable warnings
  if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
    console.log("⚠️  WARNING: No AI API keys found!")
    console.log("⚠️  Please set OPENROUTER_API_KEY or OPENAI_API_KEY in Railway")
  }

  if (!fontExists) {
    console.log("⚠️  WARNING: OpenSans-Regular.ttf font not found!")
    console.log("⚠️  GIFs will be created without captions")
  }

  if (!hasCookies) {
    console.log("⚠️  WARNING: YTDLP_COOKIES not found!")
    console.log("⚠️  YouTube downloads may fail due to bot detection")
    console.log("⚠️  Set YTDLP_COOKIES environment variable in Railway")
  }

  console.log("🚂 Railway deployment ready with your custom environment variables!")
})

export default app
