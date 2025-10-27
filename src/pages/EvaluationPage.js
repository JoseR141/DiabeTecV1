import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { InferenceSession, Tensor } from 'onnxruntime-web';
import { processUserData, scaleFeatures } from '../featureEngineering';
import { motion, AnimatePresence } from 'framer-motion';
import './EvaluationPage.css';

const formSteps = [
    {
        step: 1, title: "Datos Generales", icon: "👤", fields: [
            { name: 'QS23', label: 'Edad (años)', type: 'number', placeholder: 'Ej: 45', required: true, min: 15, max: 97 },
            { name: 'QSSEXO', label: 'Sexo', type: 'select', options: [{ value: 1, label: 'Hombre' }, { value: 2, label: 'Mujer' }], required: true },
            { name: 'QS900', label: 'Peso (kg)', type: 'number', step: '0.1', placeholder: 'Ej: 70.5', required: true, min: 30, max: 250 },
            { name: 'QS901', label: 'Talla (cm)', type: 'number', placeholder: 'Ej: 165', required: true, min: 100, max: 220 },
            { name: 'QS907', label: 'Perímetro Abdominal (cm)', type: 'number', step: '0.1', placeholder: 'Ej: 90', required: true, min: 50, max: 200 },
        ]
    },
    {
        step: 2, title: "Salud y Hábitos", icon: "❤️‍🩹", fields: [
            { name: 'QS102', label: '¿Algún médico te ha diagnosticado Hipertensión Arterial?', type: 'select', options: [{ value: 1, label: 'Sí' }, { value: 2, label: 'No' }], required: true },
            { name: 'QS202', label: '¿Fumas diariamente?', type: 'select', options: [{ value: 1, label: 'Sí' }, { value: 2, label: 'No' }], required: true },
            { name: 'QS204C', label: 'Si fumas, ¿desde hace cuántos años?', type: 'number', placeholder: 'Ej: 10', required: true, min: 1, max: 80, condition: (data) => data.QS202 === '1' },
            { name: 'QS205C', label: 'Si fumas, ¿cuántos cigarrillos al día?', type: 'number', placeholder: 'Ej: 5', required: true, min: 1, max: 100, condition: (data) => data.QS202 === '1' },
        ]
    },
    {
        step: 3, title: "Alimentación", icon: "🍎", fields: [
            { name: 'QS213C', label: 'En la última semana, ¿cuántos días consumiste frutas?', type: 'number', min: 0, max: 7, required: true, placeholder: '0 a 7' },
            { name: 'QS219C', label: 'En la última semana, ¿cuántos días comiste ensalada de verduras?', type: 'number', min: 0, max: 7, required: true, placeholder: '0 a 7' },
            { name: 'QS215C', label: 'En la última semana, ¿cuántos días tomaste jugo de frutas?', type: 'number', min: 0, max: 7, required: true, placeholder: '0 a 7' },
        ]
    },
    {
        step: 4, title: "Bienestar Mental", icon: "🧠", fields: [
            { name: 'QS700A', label: 'En las últimas 2 semanas, ¿con qué frecuencia has tenido poco interés en hacer las cosas?', type: 'select', options: [{ value: 0, label: 'Para nada' }, { value: 1, label: 'Varios días (de 1 a 6 días)' }, { value: 2, label: 'La mayoria de días (de 7 a 11 días)' }, { value: 3, label: 'Casi todos los días (de 12 a más días)' }], required: true },
            { name: 'QS700B', label: '... ¿te has sentido decaído(a), deprimido(a) o sin esperanzas?', type: 'select', options: [{ value: 0, label: 'Para nada' }, { value: 1, label: 'Varios días (de 1 a 6 días)' }, { value: 2, label: 'La mayoria de días (de 7 a 11 días)' }, { value: 3, label: 'Casi todos los días (de 12 a más días)' }], required: true },
            { name: 'QS700C', label: '... ¿problemas para dormir, o dormir demasiado?', type: 'select', options: [{ value: 0, label: 'Para nada' }, { value: 1, label: 'Varios días (de 1 a 6 días)' }, { value: 2, label: 'La mayoria de días (de 7 a 11 días)' }, { value: 3, label: 'Casi todos los días (de 12 a más días)' }], required: true },
            { name: 'QS700D', label: '... ¿cansado(a) o con poca energía?', type: 'select', options: [{ value: 0, label: 'Para nada' }, { value: 1, label: 'Varios días (de 1 a 6 días)' }, { value: 2, label: 'La mayoria de días (de 7 a 11 días)' }, { value: 3, label: 'Casi todos los días (de 12 a más días)' }], required: true },
            { name: 'QS700E', label: '... ¿poco apetito o comer en exceso?', type: 'select', options: [{ value: 0, label: 'Para nada' }, { value: 1, label: 'Varios días (de 1 a 6 días)' }, { value: 2, label: 'La mayoria de días (de 7 a 11 días)' }, { value: 3, label: 'Casi todos los días (de 12 a más días)' }], required: true },
            { name: 'QS700F', label: '... ¿sentirte mal contigo mismo(a) o como un fracaso?', type: 'select', options: [{ value: 0, label: 'Para nada' }, { value: 1, label: 'Varios días (de 1 a 6 días)' }, { value: 2, label: 'La mayoria de días (de 7 a 11 días)' }, { value: 3, label: 'Casi todos los días (de 12 a más días)' }], required: true },
            { name: 'QS700G', label: '... ¿dificultad para concentrarte?', type: 'select', options: [{ value: 0, label: 'Para nada' }, { value: 1, label: 'Varios días (de 1 a 6 días)' }, { value: 2, label: 'La mayoria de días (de 7 a 11 días)' }, { value: 3, label: 'Casi todos los días (de 12 a más días)' }], required: true },
            { name: 'QS700H', label: '... ¿moverte o hablar tan lento que otros lo han notado?', type: 'select', options: [{ value: 0, label: 'Para nada' }, { value: 1, label: 'Varios días (de 1 a 6 días)' }, { value: 2, label: 'La mayoria de días (de 7 a 11 días)' }, { value: 3, label: 'Casi todos los días (de 12 a más días)' }], required: true },
            { name: 'QS700I', label: '... ¿pensamientos de autolesionarte?', type: 'select', options: [{ value: 0, label: 'Para nada' }, { value: 1, label: 'Varios días (de 1 a 6 días)' }, { value: 2, label: 'La mayoria de días (de 7 a 11 días)' }, { value: 3, label: 'Casi todos los días (de 12 a más días)' }], required: true },
        ]
    },
    {
        step: 5, title: "Consumo de Alcohol", icon: "🍺", fields: [
            { name: 'QS714', label: 'En los últimos 12 meses, ¿el consumo de alcohol te ha provocado discusiones?', type: 'select', options: [{ value: 1, label: 'Sí' }, { value: 2, label: 'No' }], required: true },
            { name: 'QS719', label: '... ¿has tenido tantas ganas de beber que no pudiste resistirte?', type: 'select', options: [{ value: 1, label: 'Sí' }, { value: 2, label: 'No' }], required: true },
            { name: 'QS726', label: '... ¿has intentado beber menos o dejar de beber y no has podido?', type: 'select', options: [{ value: 1, label: 'Sí' }, { value: 2, label: 'No' }], required: true },
        ]
    }
];

const initialFormData = {
    QS23: '', QSSEXO: '2', QS900: '', QS901: '', QS907: '',
    QS102: '2', QS202: '2', QS204C: '1', QS205C: '1',
    QS213C: '0', QS219C: '0', QS215C: '0',
    QS700A: '0', QS700B: '0', QS700C: '0', QS700D: '0', QS700E: '0', QS700F: '0', QS700G: '0', QS700H: '0', QS700I: '0',
    QS714: '2', QS719: '2', QS726: '2'
};

function EvaluationPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState(initialFormData);
    const [inputErrors, setInputErrors] = useState({});
    const [session, setSession] = useState(null);
    const [scalerParams, setScalerParams] = useState(null);
    const [isPredicting, setIsPredicting] = useState(false);
    const [isStepValid, setIsStepValid] = useState(false);
    const [isExiting, setIsExiting] = useState(false); // <- animación de salida
    const navigate = useNavigate();

    useEffect(() => {
        const loadAssets = async () => {
            try {
                const modelPath = process.env.PUBLIC_URL + '/diabetes_model_final.onnx';
                const scalerPath = process.env.PUBLIC_URL + '/scaler_params.json';
                const [newSession, scalerResponse] = await Promise.all([
                    InferenceSession.create(modelPath),
                    fetch(scalerPath)
                ]);
                const scalerData = await scalerResponse.json();
                setSession(newSession);
                setScalerParams(scalerData);
            } catch (e) {
                console.error("Error al cargar los activos de IA:", e);
                alert("Error crítico: No se pudo cargar el modelo de IA. Por favor, refresca la página.");
            }
        };
        loadAssets();
    }, []);

    useEffect(() => {
        const currentFields = formSteps.find(s => s.step === currentStep)?.fields || [];
        const isAllFieldsValid = currentFields.every(field => {
            if (field.condition && !field.condition(formData)) return true;
            const value = formData[field.name];
            return value !== '' && value !== null && value !== undefined && !inputErrors[field.name];
        });
        setIsStepValid(isAllFieldsValid);
    }, [formData, inputErrors, currentStep]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (inputErrors[name]) setInputErrors(prev => ({ ...prev, [name]: false }));
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        const field = formSteps.flatMap(s => s.fields).find(f => f.name === name);
        if (!field) return;

        let sanitizedValue = value;
        let isValid = true;

        if (field.type === 'number') {
            sanitizedValue = value.replace(/[^0-9.]/g, '');
            let numericValue = parseFloat(sanitizedValue);
            if (isNaN(numericValue)) numericValue = null;

            if (numericValue !== null) {
                if (field.min !== undefined && numericValue < field.min) numericValue = field.min;
                if (field.max !== undefined && numericValue > field.max) numericValue = field.max;
                setFormData(prev => ({ ...prev, [name]: numericValue.toString() }));
            }

            if (numericValue === null || (field.min !== undefined && numericValue < field.min) || (field.max !== undefined && numericValue > field.max)) {
                isValid = false;
            }
        } else if (field.required && !value) {
            isValid = false;
        }

        setInputErrors(prev => ({ ...prev, [name]: !isValid }));
    };

    const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, formSteps.length));
    const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        if (!session || !scalerParams) return alert("El modelo no está listo.");
        setIsPredicting(true);

        try {
            const processedData = processUserData(formData);
            const scaledData = scaleFeatures(processedData, scalerParams);
            const inputTensor = new Tensor('float32', scaledData, [1, scaledData.length]);
            const feeds = { "float_input": inputTensor };
            const results = await session.run(feeds);
            const probability = results.probabilities.data[1];

            // Animación de salida antes de navegar
            setIsExiting(true);

            setTimeout(() => {
                navigate('/resultado', { state: { probability, processedData, formData } });
            }, 500);

        } catch (error) {
            console.error("Error durante la predicción:", error);
            alert("Ocurrió un error al procesar tu evaluación.");
        } finally {
            setIsPredicting(false);
        }
    };

    const currentStepData = formSteps.find(s => s.step === currentStep);

    return (
        <div className="evaluation-container">
            <AnimatePresence>
                {!isExiting && (
                    <motion.div
                        className="evaluation-card"
                        key="evaluation-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="progress-bar-container">
                            <div className="progress-bar" style={{ width: `${(currentStep / formSteps.length) * 100}%` }}></div>
                        </div>

                        <div className="step-header">
                            <span className="step-icon">{currentStepData.icon}</span>
                            <h2>{currentStepData.title}</h2>
                        </div>

                        <form onSubmit={(e) => e.preventDefault()}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    className="form-fields"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    {currentStepData.fields.map(field => {
                                        if (!field.condition || field.condition(formData)) {
                                            return (
                                                <div className="form-group" key={field.name}>
                                                    <label htmlFor={field.name}>{field.label}</label>
                                                    {field.type === 'select' ? (
                                                        <select
                                                            name={field.name}
                                                            id={field.name}
                                                            value={formData[field.name]}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                            className={inputErrors[field.name] ? 'input-error' : ''}
                                                        >
                                                            {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                        </select>
                                                    ) : (
                                                        <div className="input-with-tooltip">
                                                            <input
                                                                type={field.type}
                                                                id={field.name}
                                                                name={field.name}
                                                                value={formData[field.name]}
                                                                onChange={handleChange}
                                                                onBlur={handleBlur}
                                                                placeholder={field.placeholder || ''}
                                                                step={field.step || '1'}
                                                                required={field.required}
                                                                className={inputErrors[field.name] ? 'input-error' : ''}
                                                            />
                                                            {field.type === 'number' && (field.min !== undefined || field.max !== undefined) && (
                                                                <span className="tooltip-text">
                                                                    Rango: {field.min} - {field.max}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {inputErrors[field.name] && (
                                                        <span className="error-text">Por favor ingresa un valor válido</span>
                                                    )}
                                                </div>
                                            )
                                        }
                                        return null;
                                    })}
                                </motion.div>
                            </AnimatePresence>

                            <div className="navigation-buttons">
                                {currentStep > 1 && <button type="button" onClick={handlePrev} className="nav-button prev">Anterior</button>}
                                <div style={{ marginLeft: 'auto' }}>
                                    {currentStep < formSteps.length && <button type="button" onClick={handleNext} className="nav-button next" disabled={!isStepValid}>Siguiente</button>}
                                    {currentStep === formSteps.length && (
                                        <button type="button" onClick={handleSubmit} className="nav-button submit" disabled={isPredicting || !isStepValid}>
                                            {isPredicting ? 'Evaluando...' : 'Ver mi resultado'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default EvaluationPage;
