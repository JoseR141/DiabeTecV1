import React from 'react';
    import './TermsModal.css';

    function TermsModal({ onAccept }) {
      return (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Términos de Uso y Privacidad</h3>
            <div className="terms-text">
              <p>
                <strong>1. Propósito de la Herramienta:</strong> Esta aplicación es una herramienta de tamizaje
                educativo y no debe ser considerada como un diagnóstico médico final. Los resultados son
                orientativos y basados en un modelo estadístico.
              </p>
              <p>
                <strong>2. Anonimato y Datos:</strong> Todos los datos que ingreses son completamente anónimos.
                No se almacena información personal identificable. Al usar esta herramienta, aceptas que tus
                datos anónimos puedan ser utilizados con fines de investigación académica para mejorar
                el modelo.
              </p>
              <p>
                <strong>3. Responsabilidad:</strong> Consulta siempre a un profesional de la salud para obtener un
                diagnóstico y tratamiento adecuados. Los creadores de esta herramienta no se hacen
                responsables del uso que se le dé a la información proporcionada.
              </p>
            </div>
            <button onClick={onAccept} className="accept-button">
              He leído y acepto los términos
            </button>
          </div>
        </div>
      );
    }

    export default TermsModal;