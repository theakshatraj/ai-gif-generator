class ApiService {
  constructor() {
    // ✅ Use environment variable or fallback to localhost
    this.baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    console.log("🔍 API Service initialized with baseURL:", this.baseURL);
  }

  // POST: Generate GIFs
  async generateGifs(formData) {
    try {
      console.log("🚀 Sending request to generate GIFs...");

      const response = await fetch(`${this.baseURL}/generate`, {
        method: "POST",
        body: formData,
      });

      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || "Failed to generate GIFs");
      }

      const data = await response.json();
      console.log("✅ GIFs generated successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ API Error (generateGifs):", error);
      throw error;
    }
  }

  // GET: Fetch single GIF as blob (by GIF ID)
  async getGif(id) {
    try {
      const response = await fetch(`${this.baseURL}/gifs/${id}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch GIF with ID: ${id}`);
      }

      return await response.blob();
    } catch (error) {
      console.error("❌ Error fetching GIF:", error);
      throw error;
    }
  }

  // GET: List all GIFs (optional)
  async getAllGifs() {
    try {
      const response = await fetch(`${this.baseURL}/gifs`);

      if (!response.ok) {
        throw new Error("Failed to fetch GIFs list");
      }

      const data = await response.json();
      console.log("✅ Fetched GIF list:", data);
      return data;
    } catch (error) {
      console.error("❌ Error fetching GIF list:", error);
      throw error;
    }
  }

  // GET: Test API connection
  async testConnection() {
    try {
      const response = await fetch(`${this.baseURL}/test`);

      if (!response.ok) {
        throw new Error("API test connection failed");
      }

      const data = await response.json();
      console.log("✅ API test successful:", data);
      return data;
    } catch (error) {
      console.error("❌ API connection failed:", error);
      throw error;
    }
  }

  // GET: Health check
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseURL.replace("/api", "")}/health`);

      if (!response.ok) {
        throw new Error("Server health check failed");
      }

      const data = await response.json();
      console.log("✅ Server health check:", data);
      return data;
    } catch (error) {
      console.error("❌ Health check failed:", error);
      throw error;
    }
  }

  // Optional: Check if GIF URL exists (HEAD request)
  async checkGifUrl(url) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch (error) {
      console.error("❌ GIF URL check failed:", error);
      return false;
    }
  }

  async getYoutubeMetadata(url) {
    try {
      const response = await fetch(`${this.baseURL}/youtube-metadata?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error("Failed to fetch YouTube metadata");
      return await response.json();
    } catch (error) {
      console.error("❌ Error fetching YouTube metadata:", error);
      throw error;
    }
  }

  // AUTH: Sign Up
  async signup(email, password) {
    const response = await fetch(`${this.baseURL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error((await response.json()).message || 'Signup failed');
    return response.json();
  }

  // AUTH: Login
  async login(email, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error((await response.json()).message || 'Login failed');
    return response.json();
  }

  // AUTH: Forgot Password
  async forgotPassword(email) {
    const response = await fetch(`${this.baseURL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error((await response.json()).message || 'Forgot password failed');
    return response.json();
  }

  // AUTH: Reset Password
  async resetPassword(token, password) {
    const response = await fetch(`${this.baseURL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    if (!response.ok) throw new Error((await response.json()).message || 'Reset password failed');
    return response.json();
  }

  // AUTH: Get Google OAuth URL
  getGoogleOAuthUrl() {
    return `${this.baseURL}/auth/google`;
  }
}

export default new ApiService();