"use client";
import Header from "./components/Header";
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import HowItWorksSection from "./components/HowItWorksSection";
import TestimonialsSection from "./components/TestimonialsSection";
import Footer from "./components/Footer";
import { AuthProvider } from "./AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <Header />
      <HeroSection />
      <div id="features"><FeaturesSection /></div>
      <HowItWorksSection />
      <TestimonialsSection />
      <Footer />
    </AuthProvider>
  );
}