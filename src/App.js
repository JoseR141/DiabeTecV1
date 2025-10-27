import React, { useState } from 'react';
    import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
    import Header from './components/Header';
    import Footer from './components/Footer';
    import HomePage from './pages/HomePage';
    import EvaluationPage from './pages/EvaluationPage';
    import TermsPage from './pages/TermsPage';
    import ResultsPage from './pages/ResultsPage';
    import ParticleBackground from './components/ParticleBackground';
    import './App.css';
    
    function App() {
      const [termsAccepted, setTermsAccepted] = useState(false);
    
      return (
        <Router>
          <div className="app-container">
            <ParticleBackground />
            <Header />
            <main className="app-content">
              <Routes>
                <Route 
                  path="/" 
                  element={<HomePage termsAccepted={termsAccepted} setTermsAccepted={setTermsAccepted} />} 
                />
                <Route path="/evaluacion" element={<EvaluationPage />} />
                <Route path="/terminos-y-privacidad" element={<TermsPage />} />
                <Route path="/resultado" element={<ResultsPage />} /> 
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      );
    }
    
    export default App;