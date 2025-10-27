import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

function Header() {
  // Función de descarga de datos (MVP)
  const handleDownload = () => {
    const headers = "ID,QS23,QSSEXO,QS900,QS901,QS907,QS102,QS202,QS204C,QS205C,QS213C,QS219C,QS215C,QS700A,QS700B,QS700C,QS700D,QS700E,QS700F,QS700G,QS700H,QS700I,QS714,QS719,QS726,Probabilidad_Riesgo,Nivel_Riesgo\n";
    const dummyData = "1,45,2,80,170,100,1,2,0,0,3,4,1,1,2,0,1,0,0,1,0,0,2,2,1,0.65,Alto\n2,55,1,95,175,110,1,1,20,10,2,2,5,3,3,2,1,2,1,2,1,0,1,1,1,0.80,Alto\n";

    const dictionary = `
Diccionario de Datos - Base de Datos de Riesgo de Diabetes
=========================================================

ID: Identificador único de la evaluación.
QS23: Edad en años cumplidos.
QSSEXO: Sexo (1: Hombre, 2: Mujer).
QS900: Peso en kilogramos.
QS901: Talla en centímetros.
QS907: Perímetro abdominal en centímetros.
QS102: Diagnóstico previo de Hipertensión (1: Sí, 2: No).
QS202: Hábito de fumar diariamente (1: Sí, 2: No).
QS204C: Años fumando (si aplica).
QS205C: Cigarrillos por día (si aplica).
QS213C: Días de consumo de frutas en la última semana.
QS219C: Días de consumo de ensalada de verduras en la última semana.
QS215C: Días de consumo de jugo de frutas en la última semana.
QS700A - QS700I: Respuestas al cuestionario de bienestar mental (0: Para nada, 3: Casi todos los días).
QS714, QS719, QS726: Respuestas sobre consumo de alcohol de riesgo (1: Sí, 2: No).
Probabilidad_Riesgo: Probabilidad de riesgo calculada por el modelo (0 a 1).
Nivel_Riesgo: Clasificación del riesgo (Bajo, Moderado, Alto).
`;

    const csvBlob = new Blob([headers + dummyData], { type: 'text/csv;charset=utf-8;' });
    const dictBlob = new Blob([dictionary], { type: 'text/plain;charset=utf-8;' });

    const downloadFile = (blob, filename) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    downloadFile(csvBlob, 'base_de_datos_riesgo_diabetes.csv');
    downloadFile(dictBlob, 'diccionario_de_datos.txt');
  };

  return (
    <header className="app-header">
      <Link to="/" className="header-link">
        <div className="logo-container">
          {/* Corazón con ECG */}
          <svg className="logo-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <path
              className="heart-shape"
              d="M32 58s-26-15-26-34c0-9 7-16 16-16 5 0 10 3 12 7 2-4 7-7 12-7 9 0 16 7 16 16 0 19-26 34-26 34z"
              fill="none"
              stroke="white"
              strokeWidth="2"
            />
            <polyline
              className="ecg-line"
              points="16,32 20,28 24,36 28,24 32,32 36,20 40,28 44,24 48,32"
              fill="none"
              stroke="white"
              strokeWidth="2"
            />
          </svg>
          <div className="logo-text">
            <h1>GlucoGuard</h1>
          </div>
        </div>
      </Link>

      <button onClick={handleDownload} className="download-button">
        Descargar Datos
      </button>
    </header>
  );
}

export default Header;
