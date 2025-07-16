"use client"
import { useState } from "react"

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const GifPreview = ({ gifs }) => {
  const [loadingStates, setLoadingStates] = useState({})
  const [imageErrors, setImageErrors] = useState({})
  const [imageDimensions, setImageDimensions] = useState({})

  const downloadGif = async (gifUrl, filename) => {
    try {
      setLoadingStates((prev) => ({ ...prev, [filename]: true }))
      console.log("🔽 Downloading GIF from:", gifUrl)
      const response = await fetch(gifUrl)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename || "generated-gif.gif"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      console.log("✅ Download completed:", filename)
    } catch (error) {
      console.error("❌ Download failed:", error)
      alert(`Download failed: ${error.message}`)
    } finally {
      setLoadingStates((prev) => ({ ...prev, [filename]: false }))
    }
  }

  const handleImageError = (gifId, gifUrl) => {
    console.error("❌ Failed to load GIF:", gifUrl)
    setImageErrors((prev) => ({ ...prev, [gifId]: true }))
  }

  const handleImageLoad = (gifId, gifUrl, event) => {
    console.log("✅ GIF loaded successfully:", gifUrl)
    setImageErrors((prev) => ({ ...prev, [gifId]: false }))
    // Store the actual dimensions of the loaded image
    const img = event.target
    setImageDimensions((prev) => ({
      ...prev,
      [gifId]: {
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
      },
    }))
  }

  if (!gifs || gifs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7H3a1 1 0 01-1-1V5a1 1 0 011-1h4z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No GIFs Generated</h3>
        <p className="text-gray-500">Your generated GIFs will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          🎉 {gifs.length} GIF{gifs.length !== 1 ? "s" : ""} Generated Successfully!
        </h3>
        <p className="text-gray-600 text-lg">Click on any GIF to download it</p>
      </div>

      {/* Improved responsive grid with better spacing */}
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        <div className={`
          grid gap-8 w-full mx-auto
          ${gifs.length === 1 ? "grid-cols-1 max-w-2xl" : ""}
          ${gifs.length === 2 ? "grid-cols-1 lg:grid-cols-2 max-w-5xl" : ""}
          ${gifs.length === 3 ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 max-w-6xl" : ""}
          ${gifs.length >= 4 ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : ""}
        `}>
          {gifs.map((gif, index) => {
            const gifUrl = `${BASE_URL}${gif.url}`
            const filename = `gif-${gif.id}-${gif.caption?.replace(/[^a-zA-Z0-9]/g, "-") || "generated"}.gif`
            const dimensions = imageDimensions[gif.id]
            
            return (
              <div
                key={gif.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Flexible image container that adapts to content */}
                <div
                  className="relative group cursor-pointer bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden"
                  onClick={() => downloadGif(gifUrl, filename)}
                >
                  {imageErrors[gif.id] ? (
                    <div className="w-full h-80 flex items-center justify-center bg-gray-200">
                      <div className="text-center p-6">
                        <svg
                          className="mx-auto h-16 w-16 text-gray-400 mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p className="text-gray-600 mb-4 font-medium">Failed to load GIF</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setImageErrors((prev) => ({ ...prev, [gif.id]: false }))
                          }}
                          className="text-blue-600 hover:text-blue-800 px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors font-medium"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={gifUrl || "/placeholder.svg"}
                        alt={gif.caption || `Generated GIF ${index + 1}`}
                        className="w-full h-auto max-h-96 object-contain transition-transform duration-300 group-hover:scale-105 bg-white"
                        onError={() => handleImageError(gif.id, gifUrl)}
                        onLoad={(e) => handleImageLoad(gif.id, gifUrl, e)}
                        loading="lazy"
                        style={{ minHeight: '200px' }}
                      />
                      
                      {/* Hover overlay with download icon */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-75 group-hover:scale-100">
                          <div className="bg-white rounded-full p-6 shadow-2xl">
                            <svg
                              className="w-8 h-8 text-gray-700"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Caption overlay */}
                      {gif.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4">
                          <p className="text-white text-sm font-medium line-clamp-2 leading-relaxed">
                            {gif.caption}
                          </p>
                        </div>
                      )}

                      {/* Status indicators */}
                      <div className="absolute top-4 right-4 flex gap-2">
                        {gif.hasCaption && (
                          <div className="bg-green-500/90 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
                            📝 Captioned
                          </div>
                        )}
                        {dimensions && (
                          <div className="bg-blue-500/90 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
                            {dimensions.width}×{dimensions.height}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced card content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-lg font-bold text-gray-900 line-clamp-2 flex-1 mr-3 leading-tight">
                      {gif.caption || `GIF #${index + 1}`}
                    </h4>
                    {gif.size && (
                      <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap font-medium">
                        {gif.size}
                      </span>
                    )}
                  </div>

                  {gif.startTime !== undefined && gif.endTime !== undefined && (
                    <div className="text-sm text-gray-500 mb-4 flex items-center bg-gray-50 px-3 py-2 rounded-lg">
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12,6 12,12 16,14" />
                      </svg>
                      <span className="font-medium">
                        {gif.startTime}s - {gif.endTime}s
                      </span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => downloadGif(gifUrl, filename)}
                      disabled={loadingStates[filename]}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-sm flex items-center justify-center min-h-[44px] shadow-lg hover:shadow-xl"
                    >
                      {loadingStates[filename] ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Downloading...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                            />
                          </svg>
                          Download
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (navigator.share) {
                          navigator.share({
                            title: "Check out this GIF!",
                            url: gifUrl,
                          })
                        } else {
                          navigator.clipboard.writeText(gifUrl)
                          alert("GIF URL copied to clipboard!")
                        }
                      }}
                      className="px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold text-sm flex items-center justify-center shadow-sm hover:shadow-md"
                      title="Share GIF"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Download all button */}
      {gifs.length > 1 && (
        <div className="text-center pt-8 border-t border-gray-200">
          <button
            onClick={() => {
              gifs.forEach((gif, index) => {
                const gifUrl = `${BASE_URL}${gif.url}`
                const filename = `gif-${gif.id}-${gif.caption?.replace(/[^a-zA-Z0-9]/g, "-") || "generated"}.gif`
                setTimeout(() => downloadGif(gifUrl, filename), index * 500)
              })
            }}
            className="px-10 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center mx-auto"
          >
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            Download All {gifs.length} GIFs
          </button>
        </div>
      )}
    </div>
  )
}

export default GifPreview