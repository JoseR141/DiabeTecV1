import React, { useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './ResultsPage.css';

const OPTIMAL_THRESHOLD = 0.6385;

// --- Niveles de riesgo ---
const getRiskInfo = (probability) => {
  if (probability >= OPTIMAL_THRESHOLD) {
    return { 
      level: 'Alto', 
      color: '#e74c3c', 
      description: "Tu perfil indica un riesgo elevado de desarrollar diabetes mellitus mellitus. Esto no significa un diagnóstico, pero sí la necesidad de acciones preventivas inmediatas. Cambios sostenidos en alimentación, actividad física y control médico regular pueden reducir drásticamente tu riesgo." 
    };
  } else if (probability >= 0.30) {
    return { 
      level: 'Moderado', 
      color: '#f39c12', 
      description: "Tu perfil muestra factores de riesgo intermedios. Estás en una zona de oportunidad: con cambios preventivos consistentes, es posible disminuir el riesgo futuro de diabetes en un 40-60%. Este es el momento ideal para actuar." 
    };
  } else {
    return { 
      level: 'Bajo', 
      color: '#2ecc71', 
      description: "Actualmente tu riesgo es bajo. Sin embargo, mantener estilos de vida saludables es crucial: estudios muestran que quienes sostienen buenos hábitos a lo largo de la vida mantienen una probabilidad significativamente menor de desarrollar diabetes mellitus." 
    };
  }
};

// --- Factores personalizados ---
const getTopRiskFactors = (formData, processedData) => {
  const factors = [];
  if (!formData || !processedData) return [];

  try {
    const sexo = parseFloat(formData.QSSEXO);
    const perimetro = parseFloat(formData.QS907);
    if ((sexo === 1 && perimetro >= 94) || (sexo === 2 && perimetro >= 88)) {
      factors.push({ name: "Obesidad Abdominal", description: `Tu perímetro abdominal (${perimetro} cm) está en un rango de riesgo metabólico elevado.`, priority: 1 });
    }
    if (parseFloat(formData.QS102) === 1) {
      factors.push({ name: "Hipertensión", description: "El antecedente de hipertensión incrementa la probabilidad de resistencia a la insulina y riesgo cardiovascular.", priority: 1 });
    }
    const edad = parseFloat(formData.QS23);
    if (edad >= 45) {
      factors.push({ name: "Edad", description: `La edad (${edad} años) es un factor no modificable, pero su impacto puede reducirse con un estilo de vida activo.`, priority: 2 });
    }
    if (processedData.ICD <= 1) {
      factors.push({ name: "Calidad de la Dieta", description: "Tu alimentación refleja baja ingesta de frutas y verduras, asociada a mayor riesgo metabólico.", priority: 2 });
    }
    if (processedData.ICT > 5) {
      factors.push({ name: "Tabaquismo", description: "El tabaquismo sostenido es un factor que acelera procesos inflamatorios y resistencia a la insulina.", priority: 2 });
    }
    if (processedData.IBM >= 10) {
      factors.push({ name: "Bienestar Mental", description: "Síntomas depresivos o estrés persistente pueden favorecer alteraciones metabólicas crónicas.", priority: 3 });
    }
  } catch (e) {
    console.error("Error al procesar factores de riesgo:", e);
  }
  return factors.sort((a, b) => a.priority - b.priority).slice(0, 3);
};

// --- Variables explicativas ---
const variablesExplicadas = [
  {
    nombre: "Índice de Calidad de Dieta (ICD)",
    detalle: "Evalúa la ingesta de frutas, verduras y balance nutricional. Mejores puntajes reducen hasta en un 30% el riesgo de diabetes."
  },
  {
    nombre: "Proxy de Síndrome Metabólico (PSM)",
    detalle: "Combina obesidad abdominal e hipertensión. Es uno de los predictores clínicos más fuertes de diabetes."
  },
  {
    nombre: "Índice de Bienestar Mental (IBM)",
    detalle: "Mide síntomas depresivos, un factor bidireccional que afecta la regulación metabólica."
  },
  {
    nombre: "Índice de Carga Tabáquica (ICT)",
    detalle: "Cuantifica la exposición acumulada al tabaco, factor de riesgo para resistencia a la insulina."
  },
  {
    nombre: "Indicador de Consumo de Alcohol de Riesgo (ICAR)",
    detalle: "Altos consumos de alcohol están asociados con dislipidemia y resistencia metabólica."
  }
];

function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { probability, processedData, formData } = location.state || {};
  const { level, color, description } = useMemo(() => getRiskInfo(probability || 0), [probability]);
  const topFactors = useMemo(() => getTopRiskFactors(formData, processedData), [formData, processedData]);

  if (probability === undefined || !processedData || !formData) {
    return (
      <div className="results-container">
        <div className="results-card error-card">
          <h2>Error de Datos</h2>
          <p>No se pudo cargar el resultado. Por favor, realiza la evaluación nuevamente.</p>
          <button onClick={() => navigate('/evaluacion')} className="primary-button-green">Volver a la Evaluación</button>
        </div>
      </div>
    );
  }

  // --- Generar PDF multipágina con footer ---
  const generatePDF = () => {
    const report = document.querySelector(".results-card");
    html2canvas(report, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      const footerY = pdf.internal.pageSize.getHeight() - 20;
      pdf.text(
        "© 2025 - Proyecto de Tesis, Todos los derechos reservados.",
        pdfWidth / 2,
        footerY,
        { align: "center" }
      );
      pdf.text(
        "Este reporte es generado con fines académicos e informativos. No reemplaza la consulta, diagnóstico ni tratamiento médico profesional.",
        pdfWidth / 2,
        footerY + 7,
        { align: "center", maxWidth: 180 }
      );

      pdf.save("Reporte_Riesgo_Diabetes.pdf");
    });
  };

  // --- Recomendaciones personalizadas ---
  const getRecommendations = () => {
    if (level === "Alto") {
      return [
        "Consulta médica preventiva de forma periódica.",
        "Adopta una dieta basada en alimentos integrales y limita azúcares simples.",
        "Incrementa la actividad física progresivamente (mínimo 150 min/semana).",
        "Monitorea peso, presión arterial y glucosa regularmente."
      ];
    } else if (level === "Moderado") {
      return [
        "Aumenta tu consumo de frutas, verduras y cereales integrales.",
        "Reduce gradualmente el consumo de alcohol y tabaco.",
        "Incluye rutinas de ejercicio aeróbico y de fuerza.",
        "Mantén un control regular con tu médico."
      ];
    } else {
      return [
        "Mantén tus hábitos actuales de alimentación saludable.",
        "Sigue practicando ejercicio físico de forma constante.",
        "Realiza chequeos médicos anuales para monitoreo preventivo.",
        "Cuida tu bienestar emocional y evita el sedentarismo."
      ];
    }
  };

  return (
    <div className="results-container">
      <div className="results-card" id="reporte">
        <h2 className="results-title">Resultado de tu Evaluación</h2>

        {/* Medidor */}
        <div className="gauge-container">
          <div className="gauge">
            <div className="gauge-needle" style={{ transform: `rotate(${probability * 180 - 90}deg)` }}></div>
            <div className="gauge-center-circle"></div>
          </div>
          <div className="gauge-text">
            <div className="gauge-probability">{(probability * 100).toFixed(1)}%</div>
            <div className="gauge-level" style={{ color }}>{`Riesgo ${level}`}</div>
          </div>
        </div>

        {/* Secciones */}
        <section className="detail-card">
          <h3>Interpretación</h3>
          <p>{description}</p>
        </section>

        <section className="detail-card">
          <h3>Principales Factores Identificados</h3>
          <ul className="factors-list">
            {topFactors.length > 0 
              ? topFactors.map((f, i) => <li key={i}><strong>{f.name}:</strong> {f.description}</li>) 
              : <li>No se identificaron factores de riesgo clínicos relevantes.</li>}
          </ul>
        </section>

        <section className="detail-card">
          <h3>Variables Utilizadas en el Modelo</h3>
          <ul>
            {variablesExplicadas.map((v, i) => (
              <li key={i}><strong>{v.nombre}:</strong> {v.detalle}</li>
            ))}
          </ul>
        </section>

        <section className="detail-card">
          <h3>¿Por qué ayudan a mejorar la predicción?</h3>
          <p>
            Las variables integran factores clínicos, conductuales y psicológicos. 
            Este enfoque multidimensional permite que el modelo aumente su capacidad de predicción, 
            identificando perfiles de riesgo de manera más precisa y útil en la práctica preventiva.
          </p>
        </section>

        <section className="detail-card">
          <h3>Recomendaciones Personalizadas</h3>
          <ul>
            {getRecommendations().map((rec, i) => (
              <li key={i}>✔️ {rec}</li>
            ))}
          </ul>
        </section>

        <div className="button-group">
          <button onClick={generatePDF} className="primary-button-green">Descargar Reporte en PDF</button>
          <Link to="/" className="primary-button-green home-button">Volver al Inicio</Link>
        </div>
      </div>
    </div>
  );
}

export default ResultsPage;
