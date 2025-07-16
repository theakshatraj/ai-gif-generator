import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const AboutPage = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-grow container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-4 text-gray-900">About AI GIF Generator</h1>
      <p className="text-lg text-gray-700 max-w-2xl">
        AI GIF Generator is a tool that uses artificial intelligence to turn your videos or YouTube links into smart, captioned GIFs. Enter a theme, upload or link a video, and let our AI do the rest—transcribing, analyzing, and generating GIFs with relevant captions. Perfect for sharing moments, quotes, and highlights!
      </p>
    </main>
    <Footer />
  </div>
);

export default AboutPage; 