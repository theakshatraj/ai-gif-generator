"use client";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import GeneratorPage from './pages/GeneratorPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';

const HowItWorksPage = () => (
  <div className="min-h-screen flex flex-col">
    <main className="flex-grow container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-4 text-gray-900">How It Works</h1>
      <p className="text-lg text-gray-700 max-w-2xl">
        1. Enter a prompt.<br />
        2. Add a YouTube link or upload a video.<br />
        3. Let the AI generate captioned GIFs for you!
      </p>
    </main>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/generate" element={<GeneratorPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
      </Routes>
    </Router>
  );
}

export default App;