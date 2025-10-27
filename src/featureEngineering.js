/**
 * Este archivo contiene la lógica para replicar la ingeniería de características
 * y el preprocesamiento realizado en el notebook de Python.
 */

// ==============================================================================
// 1. CREACIÓN DE ÍNDICES COMPUESTOS (FEATURE ENGINEERING)
// ==============================================================================

// Calcula el Índice de Calidad de Dieta (ICD)
function calculateIcd(formData) {
    const diasFrutas = parseFloat(formData.QS213C);
    const diasVerduras = parseFloat(formData.QS219C);
    const diasJugo = parseFloat(formData.QS215C);

    let puntosFruta = 0;
    if (diasFrutas >= 2 && diasFrutas <= 4) puntosFruta = 1;
    else if (diasFrutas >= 5) puntosFruta = 2;

    let puntosVerdura = 0;
    if (diasVerduras >= 2 && diasVerduras <= 4) puntosVerdura = 1;
    else if (diasVerduras >= 5) puntosVerdura = 2;

    let puntosJugo = 0;
    if (diasJugo >= 5) puntosJugo = -1;

    return puntosFruta + puntosVerdura + puntosJugo;
}

// Calcula el Proxy de Síndrome Metabólico (PSM)
function calculatePsm(formData) {
    const hta = parseFloat(formData.QS102) === 1;
    const sexo = parseFloat(formData.QSSEXO);
    const perimetroAbd = parseFloat(formData.QS907);

    let obAbd = false;
    if (sexo === 1 && perimetroAbd >= 94) obAbd = true;
    else if (sexo === 2 && perimetroAbd >= 88) obAbd = true;

    return hta && obAbd ? 1 : 0;
}

// Calcula el Índice de Bienestar Mental (IBM)
function calculateIbm(formData) {
    const ibmCols = ['QS700A', 'QS700B', 'QS700C', 'QS700D', 'QS700E', 'QS700F', 'QS700G', 'QS700H', 'QS700I'];
    return ibmCols.reduce((sum, col) => sum + parseFloat(formData[col] || 0), 0);
}

// Calcula el Índice de Carga Tabáquica (ICT)
function calculateIct(formData) {
    const fumaDiariamente = parseFloat(formData.QS202) === 1;
    if (!fumaDiariamente) return 0;

    const cigarrillos = parseFloat(formData.QS205C);
    const anios = parseFloat(formData.QS204C);

    if (isNaN(cigarrillos) || isNaN(anios) || cigarrillos === 0) {
        return 0;
    }
    return (cigarrillos / 20) * anios;
}

// Calcula el Indicador de Consumo de Alcohol de Riesgo (ICAR)
function calculateIcar(formData) {
    const icarCols = ['QS714', 'QS719', 'QS726'];
    const tieneRiesgo = icarCols.some(col => parseFloat(formData[col]) === 1);
    return tieneRiesgo ? 1 : 0;
}


/**
 * Procesa los datos crudos del formulario y devuelve un objeto
 * con las características de ingeniería listas para ser escaladas.
 * El ORDEN de las claves en el objeto devuelto es importante.
 */
export function processUserData(formData) {
    const processedData = {
        QS23: parseFloat(formData.QS23),
        QSSEXO: parseFloat(formData.QSSEXO),
        QS900: parseFloat(formData.QS900),
        QS901: parseFloat(formData.QS901),
        QS907: parseFloat(formData.QS907),
        QS102: parseFloat(formData.QS102),
        ICD: calculateIcd(formData),
        PSM: calculatePsm(formData),
        IBM: calculateIbm(formData),
        ICT: calculateIct(formData),
        ICAR: calculateIcar(formData)
    };
    return processedData;
}

// ==============================================================================
// 2. ESCALADO DE CARACTERÍSTICAS (StandardScaler)
// ==============================================================================

/**
 * Replica la funcionalidad de StandardScaler de scikit-learn.
 * Toma un objeto de datos procesados y los parámetros del escalador (media y escala)
 * y devuelve un array de flotantes con los datos escalados, en el orden correcto.
 */
export function scaleFeatures(processedData, scalerParams) {
    const featureOrder = [
        'QS23', 'QSSEXO', 'QS900', 'QS901', 'QS907', 'QS102',
        'ICD', 'PSM', 'IBM', 'ICT', 'ICAR'
    ];

    const scaledValues = featureOrder.map((featureName, index) => {
        const value = processedData[featureName];
        const mean = scalerParams.mean[index];
        const scale = scalerParams.scale[index];
        // Evitar división por cero si la escala es 0
        return scale !== 0 ? (value - mean) / scale : 0;
    });

    return scaledValues;
}