class ApiService {
  constructor() {
    // ✅ Use environment variable or fallback to localhost
    this.baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
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
}

export default new ApiService();
