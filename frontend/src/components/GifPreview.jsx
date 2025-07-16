"use client"

import { useState } from "react"

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const GifPreview = ({ gifs }) => {
  const [loadingStates, setLoadingStates] = useState({})
  const [imageErrors, setImageErrors] = useState({})

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

  const handleImageLoad = (gifId, gifUrl) => {
    console.log("✅ GIF loaded successfully:", gifUrl)
    setImageErrors((prev) => ({ ...prev, [gifId]: false }))
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
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          🎉 {gifs.length} GIF{gifs.length !== 1 ? "s" : ""} Generated Successfully!
        </h3>
        <p className="text-gray-600">Click on any GIF to download it</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4">
        {gifs.map((gif, index) => {
          const gifUrl = `${BASE_URL}${gif.url}`
          const filename = `gif-${gif.id}-${gif.caption?.replace(/[^a-zA-Z0-9]/g, "-") || "generated"}.gif`

          return (
            <div
              key={gif.id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 w-full"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                className="aspect-square bg-white flex items-center justify-center relative group cursor-pointer"
                onClick={() => downloadGif(gifUrl, filename)}
              >
                {imageErrors[gif.id] ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <div className="text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400 mb-2"
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
                      <p className="text-sm text-gray-500">Failed to load GIF</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setImageErrors((prev) => ({ ...prev, [gif.id]: false }))
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <img
                    src={gifUrl || "/placeholder.svg"}
                    alt={gif.caption || `Generated GIF ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={() => handleImageError(gif.id, gifUrl)}
                    onLoad={() => handleImageLoad(gif.id, gifUrl)}
                  />
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-white rounded-full p-3 shadow-lg">
                      <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="text-white text-sm font-medium truncate">{gif.caption}</p>
                  </div>
                )}

                {/* Caption status indicator */}
                {gif.hasCaption && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">📝</div>
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900 truncate flex-1 mr-2">
                    {gif.caption || `GIF #${index + 1}`}
                  </span>
                  {gif.size && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                      {gif.size}
                    </span>
                  )}
                </div>

                {(gif.startTime !== undefined && gif.endTime !== undefined) && (
                  <div className="text-xs text-gray-500 mb-3">
                    ⏱️ {gif.startTime}s - {gif.endTime}s
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => downloadGif(gifUrl, filename)}
                    disabled={loadingStates[filename]}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center min-h-[36px]"
                  >
                    {loadingStates[filename] ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    onClick={() => {
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
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm min-h-[36px]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {gifs.length > 1 && (
        <div className="text-center pt-6 border-t border-gray-200">
          <button
            onClick={() => {
              gifs.forEach((gif, index) => {
                const gifUrl = `${BASE_URL}${gif.url}`
                const filename = `gif-${gif.id}-${gif.caption?.replace(/[^a-zA-Z0-9]/g, "-") || "generated"}.gif`
                setTimeout(() => downloadGif(gifUrl, filename), index * 500)
              })
            }}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg hover:shadow-xl flex items-center justify-center mx-auto"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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