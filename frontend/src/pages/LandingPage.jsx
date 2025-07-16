import React from 'react';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import HowItWorks from '../components/HowItWorks';
import Footer from '../components/Footer';

const LandingPage = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-grow">
      <HeroSection />
      <HowItWorks />
    </main>
    <Footer />
  </div>
);

export default LandingPage; 