// ResultsPage.jsx – resultados con gráficos mejorados (anillo + mini-historial)
// Copiar y pegar completo
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./ResultsPage.css";

const OPTIMAL_THRESHOLD = 0.6385;
const HISTORY_KEY = "riskHistory";
const CHECKS_KEY = "actionChecks";

// Utils
const clampPct = (p) => Math.max(0, Math.min(100, Number(p * 100).toFixed(1)));
const nowISO = () => new Date().toISOString();
const bucketDate = () => new Date().toISOString().slice(0, 10);
const nextPaint = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

const getRiskInfo = (probability) => {
  if (probability >= OPTIMAL_THRESHOLD) {
    return {
      level: "Alto",
      color: "#e74c3c",
      badge: "🚨",
      description:
        "Tu perfil indica un riesgo elevado de desarrollar diabetes mellitus. Esto NO es un diagnóstico, pero sí una alerta para actuar con medidas preventivas.",
      actionsTone: "Enfoque intensivo (8-12 semanas)",
      cardTone: "danger",
    };
  } else if (probability >= 0.3) {
    return {
      level: "Moderado",
      color: "#f39c12",
      badge: "⚠️",
      description:
        "Existen factores intermedios. Con cambios consistentes puedes reducir fuertemente tu riesgo a futuro.",
      actionsTone: "Plan de mejora (6-8 semanas)",
      cardTone: "warn",
    };
  }
  return {
    level: "Bajo",
    color: "#2ecc71",
    badge: "✅",
    description:
      "Actualmente tu riesgo es bajo. Mantener hábitos saludables y un control médico periódico ayuda a sostenerlo en el tiempo.",
    actionsTone: "Mantenimiento inteligente",
    cardTone: "ok",
  };
};
// ---- Explicador del factor principal ----
const format = (n, unit="") => (n!=null && !isNaN(n)) ? `${Number(n).toFixed(0)}${unit}` : "—";

function getPrincipalInsight({ principalKey, formData, processedData }) {
  // lee valores que ya traes
  const sexo = Number(formData?.QSSEXO);             // 1: M, 2: F
  const cintura = Number(formData?.QS907);           // perímetro abdominal (cm)
  const edad = Number(formData?.QS23);
  const icd = Number(processedData?.ICD);            // calidad de dieta (>=2 bueno)
  const ict = Number(processedData?.ICT);            // carga tabáquica
  const ibm = Number(processedData?.IBM);            // bienestar mental (menor es mejor)

  const ref = {
    cintura: sexo === 1 ? 94 : 88,    // umbral OMS
    icd: 2,                            // objetivo mínimo útil
    ict: 0,                            // sin tabaco
    ibm: 6,                            // zona de menor riesgo
    pa: "controlada",                  // texto
  };

  // plantillas por factor
  const bank = {
    obesidad: {
      title: "Obesidad abdominal",
      why: "El exceso de grasa visceral aumenta resistencia a la insulina y eleva marcadores inflamatorios.",
      youVsRef: {
        labelYou: format(cintura," cm"),
        labelRef: `${ref.cintura} cm`,
        ratio: cintura && ref.cintura ? Math.min(1.2, cintura/ref.cintura) : null
      },
      action: "Apunta a -4–6 cm de cintura en 8–12 semanas con fuerza 2×/semana y 1/2 plato de verduras.",
      tips: ["Prioriza proteína magra y legumbres", "Evita bebidas azucaradas", "Caminatas post-comida 10–15 min"]
    },
    hta: {
      title: "Hipertensión",
      why: "La presión elevada se asocia a disfunción endotelial y resistencia a la insulina.",
      youVsRef: { labelYou: "Antecedente", labelRef: "PA < 130/80", ratio: 1 },
      action: "Reduce sodio y ultraprocesados; controla PA 2×/semana y sigue indicaciones médicas.",
      tips: ["≥150 min/semana actividad", "Lee etiquetas: <1 g sodio/día", "Evita AINES prolongados"]
    },
    dieta_baja: {
      title: "Calidad de la dieta",
      why: "Una baja densidad vegetal reduce fibra y micronutrientes que mejoran sensibilidad a insulina.",
      youVsRef: { labelYou: `ICD ${format(icd)}`, labelRef: "ICD ≥ 2", ratio: icd && icd<2 ? (icd/2) : 1 },
      action: "Suma +2 porciones/día de verduras/frutas y cambia cereales refinados por integrales.",
      tips: ["Regla 1/2 plato vegetal", "Fruta entera como snack", "Legumbres 3×/semana"]
    },
    tabaquismo: {
      title: "Tabaquismo",
      why: "El humo incrementa estrés oxidativo e inflamación sistémica que empeora la regulación glucémica.",
      youVsRef: { labelYou: `ICT ${format(ict)}`, labelRef: "ICT 0", ratio: ict ? Math.min(1, 0.3 + ict/10) : 0.3 },
      action: "Define fecha de cesación y apoyo (farmacológico/conductual). Mejoras metabólicas en semanas.",
      tips: ["Quita disparadores", "Sustituye ritual (té/respiración)", "Anuncia tu plan a tu círculo"]
    },
    salud_mental: {
      title: "Bienestar mental",
      why: "El estrés sostenido eleva cortisol y altera apetito, sueño y actividad física.",
      youVsRef: { labelYou: `IBM ${format(ibm)}`, labelRef: "IB ≤ 6", ratio: ibm ? Math.min(1, ibm/6) : 0.6 },
      action: "Rutina 10 min/día: respiración 4-7-8 + paseo breve; cuida higiene del sueño.",
      tips: ["Dormir 7–8 h", "Exposición a luz AM", "Bloques cortos de pausa activa"]
    },
    edad: {
      title: "Edad",
      why: "Con la edad disminuye masa muscular y sensibilidad a la insulina.",
      youVsRef: { labelYou: `${format(edad)} años`, labelRef: "Fuerza y NEAT altos", ratio: 1 },
      action: "Entrenamiento de fuerza 2×/semana + caminatas diarias; prioriza proteína de calidad.",
      tips: ["Series a RPE 7–8", "Repartir proteína en 3–4 comidas", "Balance/estabilidad 2×/semana"]
    }
  };

  const mapKey = principalKey || "dieta_baja";
  return bank[mapKey] || {
    title: "Factor predominante",
    why: "Este factor condensa hábitos o antecedentes que elevan el riesgo metabólico.",
    youVsRef: { labelYou: "—", labelRef: "—", ratio: null },
    action: "Mantén los básicos: verduras 1/2 plato, 150 min/semana y sueño 7–8 h.",
    tips: ["Agua a mano", "Pasos tras las comidas", "Planifica compras saludables"]
  };
}

/** Visuales PERSONALIZADAS para el “Plan saludable” */
const getPersonalizedVisuals = ({ level, factors, formData }) => {
  const edad = Number(formData?.QS23 || 0);
  const has = (k) => factors?.some((f) => f.key === k);

  const bank = {
    plate:   { src: "/img/food-plate.jpg",    alt: "Plato saludable",     caption: "1/2 verduras, 1/4 proteína, 1/4 cereal integral." },
    grocery: { src: "/img/grocery-veg.jpg",    alt: "Compras saludables",  caption: "Planifica 5 porciones/día y prioriza legumbres." },
    walk:    { src: "/img/walk-run.jpg",       alt: "Actividad física",    caption: "150 min/semana + 2 días de fuerza." },
    strength:{ src: "/img/strength.jpg",       alt: "Fuerza y balance",    caption: "Fuerza 2×/semana: mejora masa muscular y glucemia." },
    bp:      { src: "/img/bp-cuff.jpg",        alt: "Control de presión",  caption: "Control regular de PA y menos ultraprocesados." },
    low_salt:{ src: "/img/low-salt.jpg",       alt: "Menos sal",           caption: "Hierbas/especias y opciones bajas en sodio." },
    no_smoke:{ src: "/img/no-smoking.jpg",     alt: "Dejar de fumar",      caption: "Define fecha y busca apoyo para cesación." },
    sleep:   { src: "/img/sleep-breath.jpg",   alt: "Sueño/respiración",   caption: "Duerme 7–8 h y respiración 4-7-8." },
    monitor: { src: "/img/monitor.jpg",        alt: "Monitoreo",           caption: "Registra peso, PA y, si aplica, glucosa." },
  };

  // Base según nivel
  const visuals = [];
  if (level === "Alto") visuals.push(bank.plate, bank.walk, bank.monitor);
  else if (level === "Moderado") visuals.push(bank.grocery, bank.walk, bank.strength);
  else visuals.push(bank.grocery, bank.walk, bank.sleep);

  // Personalizaciones por factores
  if (has?.("obesidad")) visuals.unshift(bank.strength);
  if (has?.("hta")) visuals.unshift(bank.low_salt, bank.bp);
  if (has?.("dieta_baja")) visuals.unshift(bank.plate, bank.grocery);
  if (has?.("tabaquismo")) visuals.unshift(bank.no_smoke);
  if (has?.("salud_mental")) visuals.unshift(bank.sleep);
  if (has?.("edad") && edad >= 60) visuals.unshift(bank.strength);

  // Quitar duplicados y limitar a 3
  const seen = new Set();
  const dedup = [];
  for (const v of visuals) {
    if (v && !seen.has(v.src)) { dedup.push(v); seen.add(v.src); }
  }
  return dedup.slice(0, 3);
};

/** Plan de acción compacto y clicable con checks persistentes */
const getActionPlan = ({ level, factors }) => {
  const has = (k) => factors?.some((f) => f.key === k);
  const mk = (icon, text, tag) => ({ icon, text, tag });

  const today = [
    mk("🧭", "Define 2 mini metas para 7 días.", "inicio"),
    mk("🚶", "Camina 20–30 min hoy.", "actividad"),
    mk("💧", "Botella de agua a mano.", "hidratación"),
  ];
  const weeks = [
    mk("🏋️", "2 sesiones de fuerza/semana.", "fuerza"),
    mk("🥗", "5 porciones de verduras/día.", "dieta"),
    mk("📈", "Registra peso y PA semanal.", "monitoreo"),
  ];
  const keep = [
    mk("🩺", "Chequeo preventivo anual.", "salud"),
    mk("⏱️", "Pausas activas si trabajas sentado.", "postura"),
    mk("😴", "Sueño 7–8 h y manejo del estrés.", "bienestar"),
  ];

  if (level === "Alto") {
    today.unshift(mk("📋", "Agenda consulta y exámenes básicos.", "medico"));
    weeks.unshift(mk("🌾", "Más fibra y menos ultraprocesados.", "dieta"));
  } else if (level === "Moderado") {
    today.unshift(mk("🎯", "Meta SMART simple (p. ej., +1 porción de verduras).", "inicio"));
  }

  if (has("obesidad")) weeks.unshift(mk("💪", "Fuerza 2×/semana: glúteos, piernas, core.", "fuerza"));
  if (has("hta")) {
    today.unshift(mk("🧂", "Reduce sodio: evita procesados/salsas saladas.", "dieta"));
    weeks.push(mk("🧪", "Controla la PA 1–2 veces/semana.", "monitoreo"));
  }
  if (has("dieta_baja")) today.unshift(mk("🍽️", "Llena 1/2 plato con verduras (almuerzo/cena).", "dieta"));
  if (has("tabaquismo")) {
    today.unshift(mk("🚭", "Fija fecha para dejar de fumar y busca apoyo.", "tabaco"));
    keep.push(mk("🏡", "Mantén entorno libre de tabaco.", "tabaco"));
  }
  if (has("salud_mental")) {
    today.push(mk("🫁", "Respiración 4-7-8 (3 ciclos).", "bienestar"));
    keep.push(mk("🧘", "Rutina semanal de autocuidado.", "bienestar"));
  }

  return { today, weeks, keep };
};


const getTopRiskFactors = (formData, processedData) => {
  const factors = [];
  if (!formData || !processedData) return [];
  try {
    const sexo = parseFloat(formData.QSSEXO);
    const perimetro = parseFloat(formData.QS907);
    if ((sexo === 1 && perimetro >= 94) || (sexo === 2 && perimetro >= 88)) {
      factors.push({
        key: "obesidad",
        name: "Obesidad abdominal",
        icon: "📏",
        description: `Perímetro abdominal ${perimetro} cm, asociado a mayor riesgo cardiometabólico.`,
        priority: 1,
      });
    }
    if (parseFloat(formData.QS102) === 1) {
      factors.push({
        key: "hta",
        name: "Hipertensión",
        icon: "🩺",
        description: "El antecedente de hipertensión se relaciona con resistencia a la insulina y mayor riesgo cardiovascular.",
        priority: 1,
      });
    }
    const edad = parseFloat(formData.QS23);
    if (edad >= 45) {
      factors.push({
        key: "edad",
        name: "Edad",
        icon: "⏳",
        description: `Edad ${edad} años. Aunque no es modificable, su impacto se atenúa con actividad física y alimentación saludable.`,
        priority: 2,
      });
    }
    if (processedData.ICD <= 1) {
      factors.push({
        key: "dieta_baja",
        name: "Calidad de la dieta",
        icon: "🥦",
        description: "Ingesta baja de frutas y verduras, asociada a mayor riesgo metabólico.",
        priority: 2,
      });
    }
    if (processedData.ICT > 5) {
      factors.push({
        key: "tabaquismo",
        name: "Tabaquismo",
        icon: "🚬",
        description: "Exposición acumulada al tabaco que favorece procesos inflamatorios y resistencia a la insulina.",
        priority: 2,
      });
    }
    if (processedData.IBM >= 10) {
      factors.push({
        key: "salud_mental",
        name: "Bienestar mental",
        icon: "🧠",
        description: "Estrés o síntomas depresivos pueden influir en el metabolismo y el autocuidado.",
        priority: 3,
      });
    }
  } catch (e) {
    console.error("Error al procesar factores de riesgo:", e);
  }
  return factors.sort((a, b) => a.priority - b.priority).slice(0, 4);
};

const variablesExplicadas = [
  { nombre: "Índice de Calidad de Dieta (ICD)", detalle: "Evalúa frutas, verduras y balance nutricional. Mejores puntajes reducen ~30% el riesgo.", icon: "🥗" },
  { nombre: "Proxy de Síndrome Metabólico (PSM)", detalle: "Combina obesidad abdominal e hipertensión: fuerte predictor clínico de diabetes.", icon: "🧬" },
  { nombre: "Índice de Bienestar Mental (IBM)", detalle: "Mide síntomas depresivos/estrés, factor que incide en la regulación metabólica.", icon: "🧘" },
  { nombre: "Índice de Carga Tabáquica (ICT)", detalle: "Cuantifica exposición acumulada al tabaco.", icon: "🚭" },
  { nombre: "Indicador de Consumo de Alcohol de Riesgo (ICAR)", detalle: "Altos consumos se asocian a dislipidemia y resistencia.", icon: "🍷" },
];

/* ========= CHARTS ========= */

/** Mini-historial con ejes, color por nivel y punto final con pulso */
const Sparkline = ({ data = [], level = "Bajo" }) => {
  if (!data.length) return null;
  const w = 520, h = 220, pad = 42;
  const LCOL = {
    Alto:   { color: "#e74c3c", emoji: "🚨" },
    Moderado: { color: "#f39c12", emoji: "⚠️" },
    Bajo:   { color: "#2ecc71", emoji: "✅" },
  }[level];

  const xs = data.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1));
  const ys = data.map(d => (h - pad) - (Math.min(100, Math.max(0, d.p)) / 100) * (h - pad * 2));

  // Catmull-Rom → Bézier
  const toPath = (X, Y) => {
    if (X.length <= 1) return "";
    let d = `M${X[0]},${Y[0]}`;
    for (let i = 0; i < X.length - 1; i++) {
      const x0 = i ? X[i - 1] : X[0], y0 = i ? Y[i - 1] : Y[0];
      const x1 = X[i], y1 = Y[i], x2 = X[i + 1], y2 = Y[i + 1];
      const x3 = i < X.length - 2 ? X[i + 2] : X[i + 1], y3 = i < Y.length - 2 ? Y[i + 2] : Y[i + 1];
      const c1x = x1 + (x2 - x0) / 6, c1y = y1 + (y2 - y0) / 6;
      const c2x = x2 - (x3 - x1) / 6, c2y = y2 - (y3 - y1) / 6;
      d += `C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`;
    }
    return d;
  };

  const path = toPath(xs, ys);
  const last = data[data.length - 1];
  const lastX = xs[xs.length - 1], lastY = ys[ys.length - 1];

  const days = data.map((d) =>
    new Date(d.ts).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })
  );

  return (
    <div className="graph-box">
      <svg viewBox={`0 0 ${w} ${h}`} className="hist-chart" role="img" aria-label="Historial de riesgo">
        {/* fondo blanco */}
        <rect x="0" y="0" width={w} height={h} rx="12" ry="12" fill="#fff" />

        {/* ejes */}
        <line x1={pad} y1={pad/2} x2={pad} y2={h-pad/2} stroke="#d9e3f2" strokeWidth="1" />
        <line x1={pad} y1={h-pad} x2={w-pad/2} y2={h-pad} stroke="#d9e3f2" strokeWidth="1" />

        {/* marcas Y */}
        {[0,25,50,75,100].map(v=>(
          <g key={v}>
            <text x="10" y={h - pad - ((v/100)*(h - pad*2)) + 4} className="axis-y">{v}%</text>
            <line x1={pad} y1={h - pad - ((v/100)*(h - pad*2))} x2={w - pad/2} y2={h - pad - ((v/100)*(h - pad*2))} stroke="#f2f5fb" />
          </g>
        ))}

        {/* marcas X (días) */}
        {days.map((d,i)=>(
          <text key={i} x={xs[i]-10} y={h - pad + 16} className="axis-x">{d}</text>
        ))}

        {/* línea */}
        <path d={path} fill="none" stroke={LCOL.color} strokeWidth="3.2" strokeLinecap="round" />

        {/* puntos */}
        {xs.map((x,i)=>(
          <circle key={i} cx={x} cy={ys[i]} r="3" fill="#fff" stroke={LCOL.color} strokeWidth="2"/>
        ))}

        {/* punto final con pulso */}
        <circle cx={lastX} cy={lastY} r="5.5" className="pulse" fill="#fff" stroke={LCOL.color} strokeWidth="3" />

        {/* píldora final arriba (no tapa línea) */}
        <g transform={`translate(${Math.min(lastX-36, w-86)}, ${Math.max(lastY-40, 10)})`}>
          <rect width="80" height="26" rx="9" ry="9" fill={LCOL.color} opacity=".92"/>
          <text x="40" y="17" textAnchor="middle" fill="#fff" fontWeight="700" fontSize="12">{LCOL.emoji} {last.p}%</text>
        </g>
      </svg>
    </div>
  );
};

/* ============================ */

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { probability = 0, processedData, formData } = location.state || {};

  const { level, color, badge, description, actionsTone, cardTone } = useMemo(
    () => getRiskInfo(probability || 0),
    [probability]
  );
  const topFactors = useMemo(
    () => getTopRiskFactors(formData, processedData),
    [formData, processedData]
  );

  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const [animatedPct, setAnimatedPct] = useState(0);
  useEffect(() => {
    const start = 0, end = clampPct(probability), dur = 900;
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      setAnimatedPct(Number((start + (end - start) * k).toFixed(1)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [probability]);

  // Confetti solo para bajo
  useEffect(() => {
    if (level !== "Bajo") return;
    const container = document.createElement("div");
    container.className = "confetti-container";
    document.body.appendChild(container);
    const colors = ["#7dd87d", "#6ec1ff", "#ffd166", "#ef476f", "#8338ec"];
    for (let i = 0; i < 70; i++) {
      const s = document.createElement("span");
      s.className = "confetti";
      s.style.left = Math.random() * 100 + "vw";
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = Math.random() * 0.6 + "s";
      s.style.width = s.style.height = 6 + Math.random() * 6 + "px";
      container.appendChild(s);
    }
    const timeout = setTimeout(() => container.remove(), 2200);
    return () => { clearTimeout(timeout); container.remove(); };
  }, [level]);

  const [pdfLoading, setPdfLoading] = useState(false);
  const generatePDF = async () => {
    const report = document.querySelector(".results-card");
    if (!report) return;
    setPdfLoading(true);
    const root = document.documentElement;
    root.classList.add("pdf-mode", "pdf-busy");
    try {
      await nextPaint();
      const canvas = await html2canvas(report, { scale: 2, backgroundColor: "#ffffff", useCORS: true, scrollY: 0 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      const footerY = pdf.internal.pageSize.getHeight() - 20;
      pdf.text("© 2025 - Proyecto de Tesis. Todos los derechos reservados.", pdfWidth / 2, footerY, { align: "center" });
      pdf.text("Reporte informativo. No reemplaza la consulta, diagnóstico ni tratamiento médico profesional.", pdfWidth / 2, footerY + 7, { align: "center", maxWidth: 180 });
      pdf.save("Reporte_Riesgo_Diabetes.pdf");
    } catch (e) {
      console.error("Error al generar PDF:", e);
      alert("Hubo un problema al generar el PDF. Intenta nuevamente.");
    } finally {
      root.classList.remove("pdf-mode", "pdf-busy");
      setPdfLoading(false);
    }
  };

  // Mini historial
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
  });
  const [showExitWarn, setShowExitWarn] = useState(false);
  const [bannerClosed, setBannerClosed] = useState(false);
  useEffect(() => {
    const entry = { ts: nowISO(), p: clampPct(probability) };
    const next = [ ...(history || []), entry ].slice(-18);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    setTimeout(() => setShowExitWarn(true), 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!showExitWarn) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [showExitWarn]);

  const bucket = bucketDate();
  const [checks, setChecks] = useState(() => {
    try { const all = JSON.parse(localStorage.getItem(CHECKS_KEY) || "{}"); return all[bucket] || {}; }
    catch { return {}; }
  });
  useEffect(() => {
    try { const all = JSON.parse(localStorage.getItem(CHECKS_KEY) || "{}"); all[bucket] = checks; localStorage.setItem(CHECKS_KEY, JSON.stringify(all)); }
    catch { /* no-op */ }
  }, [checks, bucket]);
  const toggleCheck = (key) => setChecks((s) => ({ ...s, [key]: !s[key] }));

  const invalidData = processedData == null || formData == null;
  const R = 70, C = 2 * Math.PI * R, stroke = 10, dash = (clampPct(probability) / 100) * C;
  const pct = clampPct(probability) / 100;
  const angle = -Math.PI / 2 + pct * 2 * Math.PI; // ángulo del extremo del arco
  const headPos = { x: 90 + R * Math.cos(angle), y: 90 + R * Math.sin(angle) };

  const accentStyle = { "--accent": color };
  const visuals = useMemo(() => getPersonalizedVisuals({ level, factors: topFactors, formData }), [level, topFactors, formData]);
  const plan = useMemo(() => getActionPlan({ level, factors: topFactors }), [level, topFactors]);
  const finalIcon = level === "Alto" ? "🚨" : level === "Moderado" ? "⚠️" : "✅";

  // Mensaje contextual
  const principal = topFactors[0]?.key;
  const mensajes = {
    obesidad: "Cuidar el perímetro abdominal puede marcar una gran diferencia en tu riesgo.",
    hta: "Controlar la presión arterial reduce significativamente tu riesgo metabólico.",
    dieta_baja: "Sumar frutas y verduras cada día tiene impacto inmediato.",
    tabaquismo: "Reducir o dejar el tabaco mejora el metabolismo en pocas semanas.",
    salud_mental: "El bienestar emocional también ayuda a regular tu metabolismo.",
  };
  const contextoMsg2 = mensajes[principal] || "Este resultado es una oportunidad para reforzar hábitos saludables.";

  return (
    <div className="results-container" style={accentStyle}>
      {pdfLoading && (
        <div className="loading-overlay fixed" role="status" aria-live="polite">
          <div className="spinner" />
          <div className="loading-text">Generando PDF…</div>
        </div>
      )}

      {invalidData ? (
        <div className="results-card error-card anim-in">
          <h2>Error de datos</h2>
          <p>No se pudo cargar el resultado. Vuelve a realizar la evaluación.</p>
          <button onClick={() => navigate("/evaluacion")} className="primary-button-green">Volver a la Evaluación</button>
        </div>
      ) : (
        <div className={`results-card ${cardTone}-tone anim-in`} id="reporte" aria-live="polite">
          {showExitWarn && !bannerClosed && (
            <div className="exit-banner" role="alert">
              <div>⚠️ <strong>Advertencia:</strong> el mini historial se guarda sólo en este navegador y puede <u>perderse al cerrar</u>. Te recomendamos <strong>descargar el PDF</strong> como guía.</div>
              <button className="banner-close" onClick={() => setBannerClosed(true)}>Entendido</button>
            </div>
          )}

          {/* HERO */}
          <header className="hero">
            <div className="hero-left">
              <h2 className="results-title">Tus resultados personalizados</h2>
              <p className="subtitle">Resumen visual basado en la información que compartiste</p>
              <div className="risk-badge" style={{ background: color + "20", color }}>
                <span className="badge-emoji">{badge}</span>
                <span><strong>Riesgo {level}</strong></span>
              </div>
            </div>

            {/* ANILLO con fondo blanco y pulso */}
            <div className={`ring-wrap ring-pulse-soft ${level === 'Alto' ? 'ring-pulse-strong' : ''}`} aria-label={`Riesgo ${animatedPct}%`}>
              <svg width="180" height="180" viewBox="0 0 180 180" role="img">
                {/* pista */}
                <circle cx="90" cy="90" r={R} fill="none" stroke="#ecf1ff" strokeWidth={stroke} />
                {/* arco principal */}
                <circle
                  className="ring-progress"
                  cx="90"
                  cy="90"
                  r={R}
                  fill="none"
                  stroke={color}
                  strokeLinecap="round"
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${C}`}
                  transform="rotate(-90 90 90)"
                />
                {/* halo que pulsa sobre el arco */}
                <circle
                  className="ring-glow"
                  cx="90"
                  cy="90"
                  r={R}
                  fill="none"
                  stroke={color}
                  strokeLinecap="round"
                  strokeWidth={stroke + 4}
                  strokeDasharray={`${dash} ${C}`}
                  transform="rotate(-90 90 90)"
                />
                {/* punto final que late */}
                <circle cx={headPos.x} cy={headPos.y} r="6" fill="#fff" stroke={color} strokeWidth="4">
                  <animate attributeName="r" values="5;7;5" dur="1.6s" repeatCount="indefinite" />
                </circle>

                <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="ring-text">
                  {animatedPct}%
                </text>
              </svg>
            </div>

          </header>

          {/* Interpretación */}
          <section className="detail-card highlight">
            <h3>Interpretación</h3>
            <p>{description}</p>
            <div className="micro-kpis">
              <div className="kpi"><span>Probabilidad</span><strong>{clampPct(probability)}%</strong></div>
              <div className="kpi"><span>Plan sugerido</span><strong>{actionsTone}</strong></div>
              <div className="kpi"><span>Umbral óptimo</span><strong>{(OPTIMAL_THRESHOLD * 100).toFixed(1)}%</strong></div>
            </div>
          </section>

          {/* Tu resultado en contexto – versión enriquecida */}
        <section className="detail-card context-card">
          
          <div className="context-head">
            <span className="context-emoji" aria-hidden>
              {level === "Alto" ? "🚨" : level === "Moderado" ? "⚠️" : "✅"}
            </span>
            <div>
              <h3>Tu resultado en contexto</h3>
              <p className="context-sub">
                {contextoMsg2}
              </p>
            </div>
          </div>

          {/* Píldoras rápidas */}
          <div className="context-pills">
            <div className={`pill tone-${cardTone}`} title="Nivel actual">
              <span className="pill-ico">{badge}</span>
              <span className="pill-label">Nivel</span>
              <strong className="pill-val"> {level}</strong>
            </div>

            <div className="pill" title="Probabilidad estimada">
              <span className="pill-ico">📊</span>
              <span className="pill-label">Prob.</span>
              <strong className="pill-val">{clampPct(probability)}%</strong>
            </div>

            <div className="pill" title="Umbral óptimo del modelo">
              <span className="pill-ico">🎯</span>
              <span className="pill-label">Umbral</span>
              <strong className="pill-val">{(OPTIMAL_THRESHOLD * 100).toFixed(1)}%</strong>
            </div>

            <div className="pill" title="Principal factor">
              <span className="pill-ico">{topFactors[0]?.icon || "🧩"}</span>
              <span className="pill-label">Factor</span>
              <strong className="pill-val">{topFactors[0]?.name || "Equilibrado"}</strong>
            </div>
          </div>

          {/* Microbarra con marcador y semáforo */}
          {(() => {
            const pctVal = clampPct(probability);
            const left = Math.min(98, Math.max(2, pctVal)); // evita que el pin se pegue a los bordes
            return (
              <div className="microbar-wrap" role="img" aria-label={`Probabilidad ${pctVal}% sobre una escala 0 a 100`}>
                <div className="microbar">
                  <span className="zone zone-ok" />
                  <span className="zone zone-warn" />
                  <span className="zone zone-danger" />
                  <div className="pin" style={{ left: `calc(${left}% - 10px)`, borderColor: color }}>
                    <div className="pin-dot" style={{ background: color }} />
                    <div className="pin-label">
                      {badge} {pctVal}%
                    </div>
                  </div>
                </div>
                <div className="microbar-legend">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>
            );
          })()}

          {/* Tarjetas de contexto accionables (personalizadas) */}
          {/* Insight del factor principal: POR QUÉ PESA MÁS */}
{(() => {
  const insight = getPrincipalInsight({
    principalKey: topFactors[0]?.key,
    formData,
    processedData
  });
  return (
    <div className="insight-grid">
      <div className="insight-card">
        <div className="ins-title">💡¿Por qué importa?</div>
        <p className="ins-text">{insight.why}</p>
      </div>

      <div className="insight-card">
        <div className="ins-title">🧩Dónde estás vs. recomendado</div>
        <div className="compare">
          <div className="cmp-labels">
            <span>Tu valor: <strong>{insight.youVsRef.labelYou}</strong></span>
            <span>Referencia: <strong>{insight.youVsRef.labelRef}</strong></span>
          </div>
          <div className="cmp-bar">
            <div
              className="cmp-fill"
              style={{ width: `${Math.min(100, Math.max(10, (insight.youVsRef.ratio || 0.5) * 100))}%` }}
            />
          </div>
          <div className="cmp-legend"><span>Mejor</span><span>Peor</span></div>
        </div>
      </div>

      <div className="insight-card">
        <div className="ins-title">🚀Primer paso específico</div>
        <p className="ins-text">{insight.action}</p>
        <ul className="ins-tips">
          {insight.tips.map((t, i) => <li key={i}>• {t}</li>)}
        </ul>
      </div>
    </div>
  );
})()}

        </section>


          {/* Factores */}
          <section className="detail-card">
            <h3>¿Qué influyó más en tu resultado?</h3>
            {topFactors.length ? (
              <ul className="chips-grid">
                {topFactors.map((f, i) => (
                  <li key={i} className="chip">
                    <span className="chip-icon" aria-hidden>{f.icon}</span>
                    <div>
                      <div className="chip-title">{f.name}</div>
                      <div className="chip-desc">{f.description}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p>No se identificaron factores clínicos relevantes.</p>}
          </section>

          {/* Plan saludable (visual) */}
          <section className="detail-card visuals">
            <h3>Plan saludable</h3>
            <div className="visuals-wrap">
              {visuals.map((v, i) => (
                <div className="visual-card" key={i}>
                  <img alt={v.alt} src={v.src} loading="lazy" />
                  <span>{v.caption}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Plan de acción */}
          <section className="detail-card action-plan">
            <h3>Plan de acción</h3>
            <div className="action-group">
              <div className="action-title">Hoy / 0–7 días</div>
              <div className="action-grid">
                {plan.today.map((a, i) => {
                  const key = `today-${i}`; const on = !!checks[key];
                  return (
                    <button key={key} className={`action-card ${on ? "on" : ""}`} onClick={() => toggleCheck(key)} type="button" aria-pressed={on} title="Marcar como hecho">
                      <span className="action-icon">{a.icon}</span>
                      <span className="action-text">{a.text}</span>
                      <span className="action-check">{on ? "✔️" : "○"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="action-group">
              <div className="action-title">Próximas 4–8 semanas</div>
              <div className="action-grid">
                {plan.weeks.map((a, i) => {
                  const key = `weeks-${i}`; const on = !!checks[key];
                  return (
                    <button key={key} className={`action-card ${on ? "on" : ""}`} onClick={() => toggleCheck(key)} type="button" aria-pressed={on}>
                      <span className="action-icon">{a.icon}</span>
                      <span className="action-text">{a.text}</span>
                      <span className="action-check">{on ? "✔️" : "○"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="action-group">
              <div className="action-title">Mantención</div>
              <div className="action-grid">
                {plan.keep.map((a, i) => {
                  const key = `keep-${i}`; const on = !!checks[key];
                  return (
                    <button key={key} className={`action-card ${on ? "on" : ""}`} onClick={() => toggleCheck(key)} type="button" aria-pressed={on}>
                      <span className="action-icon">{a.icon}</span>
                      <span className="action-text">{a.text}</span>
                      <span className="action-check">{on ? "✔️" : "○"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="advice">Tip: marca tus logros y descarga el PDF como guía.</div>
          </section>

          {/* Mini historial – lista izquierda / gráfico derecha */}
          <section className="detail-card">
            <h3>Tu mini historial (este dispositivo)</h3>
            {history?.length ? (
              <div className="history-wrap two-col">
                <ul className="history-list pretty">
                  {history.map((h, i) => {
                    const val = h.p;
                    const emo = val >= 63.85 ? "🚨" : val >= 30 ? "⚠️" : "✅";
                    return (
                      <li key={i}>
                        <span className="dot" />
                        <span className="h-date">{new Date(h.ts).toLocaleString()}</span>
                        <span className="h-pct">{emo} <strong>{val}%</strong></span>
                      </li>
                    );
                  })}
                </ul>
                <Sparkline data={history} level={level} />
              </div>
            ) : (
              <p>Aún no hay registros. Se irán agregando automáticamente cuando veas tus resultados.</p>
            )}
            <div className="advice">Consejo: descarga el PDF tras cada evaluación para llevar un registro fuera de la app.</div>
          </section>

          {/* Variables */}
          <section className="detail-card variables">
            <h3>Variables que usa el modelo</h3>
            <ul className="vars-list">
              {variablesExplicadas.map((v, i) => (
                <li key={i}>
                  <span className="var-icon" aria-hidden>{v.icon}</span>
                  <div className="var-text">
                    <strong>{v.nombre}</strong>
                    <p>{v.detalle}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Nota final */}
          <section className="detail-card final-note">
            <h3><span className="note-emoji">{level === "Alto" ? "🚨" : level === "Moderado" ? "⚠️" : "✅"}</span> Nota final</h3>
            <p>Esta herramienta utiliza tus respuestas de forma <strong>anónima</strong> y no guarda información personal. Los resultados no representan un <strong>diagnóstico médico</strong>, sino una orientación preventiva.</p>
            <p>🌱 Cada pequeño cambio cuenta. Repite tu evaluación dentro de un año y descarga el PDF para comparar tus resultados.</p>
          </section>

          <div className="button-group">
            <button onClick={generatePDF} className="primary-button-green" disabled={pdfLoading} aria-busy={pdfLoading}>
              {pdfLoading ? "Generando..." : "Descargar PDF"}
            </button>
            <button onClick={() => navigate("/evaluacion")} className="primary-button-green alt">Realizar otra evaluación</button>
            <Link to="/" className="primary-button-green home-button">Volver al inicio</Link>
          </div>
        </div>
      )}
    </div>
  );
}
