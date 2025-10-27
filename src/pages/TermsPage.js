import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TermsPage.css';

function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="terms-page-container">
      <div className="terms-card">
        <h2>Términos de Uso y Política de Privacidad</h2>

        <p>
          <strong>1. Propósito de la Herramienta:</strong> Esta aplicación es una herramienta de tamizaje
          educativo y no debe ser considerada como un diagnóstico médico final. Los resultados son
          orientativos y basados en un modelo estadístico avanzado.
        </p>

        <p>
          <strong>2. Anonimato y Datos:</strong> Todos los datos ingresados son completamente anónimos.
          No se almacena información personal identificable. Al usar esta herramienta, aceptas que tus
          datos anónimos puedan ser utilizados con fines de investigación académica para mejorar
          el modelo.
        </p>

        <p>
          <strong>3. Responsabilidad:</strong> Consulta siempre a un profesional de la salud para obtener un
          diagnóstico y tratamiento adecuados. Los creadores de esta herramienta no se hacen
          responsables del uso que se le dé a la información proporcionada.
        </p>

        <p>
          <strong>4. Cómo se calculan los indicadores:</strong> Para mejorar la precisión del modelo, los
          datos ingresados por los usuarios se transforman en <strong>variables creadas mediante
          ingeniería de datos</strong>, que capturan interacciones complejas entre hábitos, condiciones
          clínicas y factores psicosociales.
        </p>

        <ul className="indicator-list">
          <li><strong>ICD (Índice de Calidad de Dieta):</strong> Combina consumo de frutas, verduras y jugos.</li>
          <li><strong>PSM (Proxy de Síndrome Metabólico):</strong> Integra obesidad abdominal, hipertensión y factores clínicos.</li>
          <li><strong>IBM (Índice de Bienestar Mental):</strong> Evalúa el impacto de la salud mental sobre la diabetes.</li>
          <li><strong>ICT (Índice de Carga Tabáquica):</strong> Mide exposición acumulada al tabaco.</li>
          <li><strong>ICAR (Indicador de Consumo de Alcohol de Riesgo):</strong> Detecta patrones problemáticos de alcohol.</li>
        </ul>

        <p>
          Estos indicadores permiten al modelo identificar patrones complejos y generar resultados más
          personalizados y confiables. <strong>Esta información busca complementar a la
          evaluación profesional de salud.</strong>
        </p>

        <button onClick={() => navigate(-1)} className="start-button">
          Volver
        </button>
      </div>
    </div>
  );
}

export default TermsPage;
