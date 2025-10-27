import React from "react";
import { useNavigate } from "react-router-dom";
import TermsModal from "../components/TermsModal";
import "./HomePage.css";

// Iconos SVG como componentes de React
const FormIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20V10"></path>
    <path d="M18 20V4"></path>
    <path d="M6 20V16"></path>
  </svg>
);

const ActionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
    <line x1="12" y1="8" x2="12" y2="14"></line>
    <line x1="9" y1="11" x2="15" y2="11"></line>
  </svg>
);

function HomePage({ termsAccepted, setTermsAccepted }) {
  const navigate = useNavigate();

  const handleStart = () => {
    if (termsAccepted) {
      navigate("/evaluacion");
    } else {
      alert("Por favor, acepta los términos de uso para continuar.");
    }
  };

  return (
    <>
      {!termsAccepted && <TermsModal onAccept={() => setTermsAccepted(true)} />}
      <div className="home-container">
        <div className="welcome-card">
          <h1 className="welcome-title">Conoce tu Riesgo, Cuida tu Futuro</h1>
          <p className="welcome-subtitle">
            <strong>Una herramienta de tamizaje asistido para el Perú.</strong>
            <br />
            Este sistema combina ciencia de datos e inteligencia artificial para ayudarte a entender tu perfil de riesgo de <strong>Diabetes mellitus</strong>.
          </p>

          {/* Pasos */}
          <div className="steps-container">
            <div className="step">
              <div className="step-icon"><FormIcon /></div>
              <p>Responde el cuestionario</p>
            </div>
            <div className="step">
              <div className="step-icon"><ChartIcon /></div>
              <p>Recibe tu resultado</p>
            </div>
            <div className="step">
              <div className="step-icon"><ActionIcon /></div>
              <p>Toma acción</p>
            </div>
          </div>

          {/* Botón */}
          <button 
            onClick={handleStart} 
            className="start-button" 
            disabled={!termsAccepted}
          >
            Iniciar Evaluación
          </button>
          {!termsAccepted && <p className="accept-prompt">Debes aceptar los términos para poder iniciar.</p>}

          {/* Sección de confianza */}
          <div className="trust-section">
            <h3 className="trust-title">¿Por qué confiar en este modelo?</h3>
            <p className="trust-text">
              A diferencia de una simple suma de factores, este sistema utiliza{" "}
              <strong>variables creadas mediante ingeniería de datos</strong>, lo que permite capturar
              interacciones complejas entre hábitos, condiciones clínicas y factores psicosociales.
            </p>
         
            <p className="trust-text">
              Estos indicadores permiten al modelo identificar perfiles de riesgo con mayor sensibilidad y especificidad.
              En otras palabras, <strong>te ofrece una visión más realista de tu salud actual y futura</strong>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default HomePage;
