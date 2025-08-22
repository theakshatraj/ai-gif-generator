# 🎬 AI GIF Generator

A powerful web application that automatically generates captioned GIFs from videos using AI analysis. Users can upload videos or provide YouTube URLs, and the system will create viral-worthy GIFs with AI-powered captions.

## ✨ Features

### 🎥 Video Processing
- **File Upload**: Upload MP4 video files (max 100MB)
- **YouTube Integration**: Process videos directly from YouTube URLs
- **Smart Segment Selection**: For videos longer than 8 seconds, users can select specific segments (2-15 seconds) to process
- **Frontend Trimming**: Video segments are trimmed in the browser before sending to backend for efficient processing

### 🤖 AI-Powered Analysis
- **Content Analysis**: Automatically analyzes video content and transcripts
- **Smart Captioning**: Generates contextually relevant captions using AI
- **Multiple Moments**: Identifies multiple key moments in the video for GIF creation

### 🎨 GIF Generation
- **High-Quality Output**: Creates optimized GIFs with captions
- **Multiple Formats**: Supports various video formats (MP4, AVI, MOV, WMV, FLV, WebM, MKV)
- **Batch Processing**: Generates multiple GIFs from different moments in the video

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- FFmpeg installed on your system
- OpenRouter API key for AI functionality

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-gif-generator
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # In backend directory, create .env file
   cp .env.example .env
   ```
   
   Add your API keys:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key
   YOUTUBE_API_KEY=your_youtube_api_key_optional
   PORT=5000
   ```

4. **Start the application**
   ```bash
   # Start backend (from backend directory)
   npm start
   
   # Start frontend (from frontend directory)
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## 📖 Usage Guide

### Basic Workflow

1. **Upload Video**: Either upload an MP4 file or provide a YouTube URL
2. **Segment Selection** (if needed): For videos longer than 8 seconds, select a 2-15 second segment
3. **Configure Prompt**: Enter a theme or description for your GIFs
4. **Generate**: The AI will analyze the video and create multiple GIFs
5. **Download**: Download your generated GIFs

### Video Segment Selection

For longer videos (>8 seconds), the system provides an intuitive segment selector:

- **Visual Timeline**: Drag to select start and end points
- **Preview Function**: Preview your selected segment before processing
- **Duration Limits**: Segments must be 2-15 seconds long
- **Real-time Feedback**: See segment duration and timing information

### Supported Video Formats

- **Upload**: MP4, AVI, MOV, WMV, FLV, WebM, MKV
- **YouTube**: Any YouTube video URL
- **Size Limit**: 100MB maximum file size

## 🛠️ Technical Details

### Frontend Architecture
- **React 18** with Vite for fast development
- **Tailwind CSS** for responsive design
- **Custom Video Trimmer** using MediaRecorder API
- **Segment Selection** with real-time preview

### Backend Architecture
- **Node.js** with Express.js
- **FFmpeg** for video processing
- **OpenRouter API** for AI analysis
- **YouTube Data API** for video metadata

### Key Components

#### Video Processing Pipeline
1. **Duration Check**: Frontend checks video duration
2. **Segment Selection**: User selects segment if video > 8 seconds
3. **Frontend Trimming**: Video is trimmed using MediaRecorder API
4. **Backend Processing**: Trimmed video is sent to backend
5. **AI Analysis**: Content is analyzed for key moments
6. **GIF Generation**: Multiple GIFs are created with captions

#### Segment Selection Features
- **Real-time Preview**: See exactly what segment will be processed
- **Duration Validation**: Ensures segments are 2-15 seconds
- **Visual Feedback**: Timeline shows current selection
- **Error Handling**: Graceful handling of processing errors

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
OPENROUTER_API_KEY=your_openrouter_api_key
YOUTUBE_API_KEY=your_youtube_api_key_optional
PORT=5000
NODE_ENV=development
MAX_FILE_SIZE=104857600
FRONTEND_URL=http://localhost:5173
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

### FFmpeg Installation

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install ffmpeg
```

#### macOS
```bash
brew install ffmpeg
```

#### Windows
Download from [FFmpeg official website](https://ffmpeg.org/download.html)

## 🐛 Troubleshooting

### Common Issues

1. **"FFmpeg not found"**
   - Ensure FFmpeg is installed and in your PATH
   - Restart your terminal after installation

2. **"OpenRouter API key not configured"**
   - Check your .env file in the backend directory
   - Ensure OPENROUTER_API_KEY is set correctly

3. **"Video processing failed"**
   - Check video format compatibility
   - Ensure video file is not corrupted
   - Try with a smaller video file

4. **"Segment selection not working"**
   - Ensure video is longer than 8 seconds
   - Check browser console for errors
   - Try refreshing the page

### Performance Tips

- **Video Size**: Smaller files process faster
- **Segment Length**: Shorter segments (2-5 seconds) work best
- **Browser**: Use modern browsers (Chrome, Firefox, Safari, Edge)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🙏 Acknowledgments

- **OpenRouter** for AI analysis capabilities
- **FFmpeg** for video processing
- **React** and **Vite** for the frontend framework
- **Tailwind CSS** for styling

---

**Note**: This application requires an OpenRouter API key for AI functionality. Get your free API key at [OpenRouter](https://openrouter.ai/). 
