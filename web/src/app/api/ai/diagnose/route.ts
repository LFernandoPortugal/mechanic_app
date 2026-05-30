import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

const SYSTEM_PROMPT = `Eres el asistente de diagnóstico automotriz de SGA (Sistema de Gestión Automotriz).
Tu rol es analizar los síntomas de un vehículo y devolver un diagnóstico estructurado.

REGLAS:
1. Responde SIEMPRE en español.
2. Sé conciso pero completo. El técnico es un profesional — usa terminología mecánica correcta.
3. Prioriza la seguridad: si hay un riesgo inmediato (frenos, dirección, estructura), indícalo claramente.
4. Devuelve SOLO un objeto JSON válido, sin markdown, sin texto adicional, con esta estructura exacta:

{
  "diagnosis": "Descripción clara del problema probable",
  "severity": "Crítico | Alto | Medio | Bajo",
  "confidence": "Alta | Media | Baja",
  "likelyCauses": ["causa 1", "causa 2"],
  "recommendedParts": ["parte 1", "parte 2"],
  "estimatedHours": 2.5,
  "safetyWarning": "Advertencia si hay riesgo de seguridad, o null"
}`;

// ─── Diagnostic rule definitions ──────────────────────────────────────────────
type DiagRule = {
  keywords: string[];
  result: DiagResult;
};

type DiagResult = {
  diagnosis: string;
  severity: string;
  confidence: string;
  likelyCauses: string[];
  recommendedParts: string[];
  estimatedHours: number;
  safetyWarning: string | null;
};

const DIAG_RULES: DiagRule[] = [
  {
    keywords: ["freno", "brake", "chirrido", "pastilla", "disco", "chillido", "vibra al frenar", "pedal duro", "pedal blando", "abs"],
    result: {
      diagnosis: "Desgaste severo o cristalización de pastillas de freno y/o discos deformados. Posible pérdida de líquido en el sistema.",
      severity: "Crítico",
      confidence: "Alta",
      likelyCauses: [
        "Desgaste de material de fricción en las pastillas delanteras o traseras",
        "Cristalización de discos por sobrecalentamiento en descensos prolongados",
        "Deformación lateral de los discos por choque térmico (runout > 0.05mm)",
        "Líquido de frenos degradado (punto de ebullición comprometido) o presencia de aire en el circuito"
      ],
      recommendedParts: ["Juego de Pastillas de Freno (Delanteras y Traseras)", "Discos de Freno nuevos (Par)", "Líquido de Frenos DOT-4"],
      estimatedHours: 2.5,
      safetyWarning: "¡Riesgo Crítico de Seguridad! La capacidad de frenado está comprometida. El vehículo no debe circular hasta ser inspeccionado."
    }
  },
  {
    keywords: ["misfire", "bujia", "bobina", "inyect", "falla al acelerar", "tiron", "ahoga", "pierde potencia", "no agarra", "falla en caliente", "chispa"],
    result: {
      diagnosis: "Falla de encendido en uno o más cilindros (Misfire). Probable desgaste de bujías, bobina defectuosa u obstrucción en inyectores.",
      severity: "Alto",
      confidence: "Media",
      likelyCauses: [
        "Bujías con desgaste excesivo de electrodo o contaminadas con aceite/combustible",
        "Bobina de encendido con falla de aislamiento (DTC P030X activo)",
        "Inyectores obstruidos con sedimentos de combustible de baja calidad",
        "Sensor MAF sucio o descalibrado provocando mezcla rica/pobre"
      ],
      recommendedParts: ["Juego de Bujías de Iridio", "Bobina(s) de encendido", "Limpiador de inyectores profesional (flush)"],
      estimatedHours: 2.5,
      safetyWarning: "Evite aceleraciones bruscas. Las fallas de combustión prolongadas dañarán permanentemente el catalizador."
    }
  },
  {
    keywords: ["calienta", "temperatura", "overheat", "humo blanco", "refrigerante", "radiador", "termostato", "electroventilador", "culata", "empaque"],
    result: {
      diagnosis: "Sobrecalentamiento del motor. Posible fuga de refrigerante, termostato trabado, falla del electroventilador o empaque de culata comprometido.",
      severity: "Crítico",
      confidence: "Alta",
      likelyCauses: [
        "Pérdida de refrigerante por mangueras resecas, clamps flojos o grietas en el radiador",
        "Termostato trabado en posición cerrada obstruyendo el flujo de líquido",
        "Falla en el motor del electroventilador o relay quemado",
        "Fuga interna de refrigerante por empaque de culata dañado (humo blanco en escape + pérdida de nivel)"
      ],
      recommendedParts: ["Termostato OEM", "Refrigerante anticongelante 50/50", "Mangueras radiador alta presión", "Prueba de gases en cámara de expansión"],
      estimatedHours: 3.0,
      safetyWarning: "¡Peligro Crítico! Detenga el vehículo inmediatamente. No abra el depósito con el motor caliente. Posible fundición de motor si continúa."
    }
  },
  {
    keywords: ["bateria", "alternador", "no arranca", "no enciende", "arranque lento", "luz check", "electr", "corto", "fusible", "rele", "relay"],
    result: {
      diagnosis: "Falla en el sistema eléctrico de carga. Batería debilitada, alternador con output insuficiente o cortocircuito en el cableado.",
      severity: "Medio",
      confidence: "Alta",
      likelyCauses: [
        "Vida útil de la batería agotada (CCA o capacidad de retención menor al 40%)",
        "Alternador defectuoso: regulador de voltaje o diodos de la placa rectificadora dañados",
        "Bornes de batería sulfatados o cable a tierra con falso contacto",
        "Cortocircuito de baja amperaje que descarga lentamente la batería en reposo"
      ],
      recommendedParts: ["Batería Automotriz 12V (capacidad según spec del fabricante)", "Prueba de carga de alternador", "Limpieza y apriete de terminales"],
      estimatedHours: 1.5,
      safetyWarning: "Riesgo de apagado repentino del motor en movimiento. Evite viajes hasta confirmar el estado del sistema de carga."
    }
  },
  {
    keywords: ["suspension", "amortiguador", "traquetea", "golpeteo", "bache", "ruido al girar", "ruidoso al doblar", "bandeja", "buje", "rotula", "horquilla"],
    result: {
      diagnosis: "Desgaste avanzado en componentes de suspensión: amortiguadores, rótulas, bujes de bandeja o bieletas estabilizadoras.",
      severity: "Alto",
      confidence: "Media",
      likelyCauses: [
        "Amortiguadores con pérdida de gas o fuga de aceite hidráulico (rebote excesivo)",
        "Rótulas de suspensión con juego mecánico mayor al tolerado (riesgo de colapso)",
        "Bujes de goma de bandejas desgastados generando holgura en el eje",
        "Bieletas y terminales de barra estabilizadora sueltos o rotos"
      ],
      recommendedParts: ["Amortiguadores (Par delantero o trasero)", "Kit de bujes de bandeja", "Bieletas estabilizadoras y terminales de dirección"],
      estimatedHours: 3.5,
      safetyWarning: "Reducción severa en la estabilidad en curvas y frenada. Provocará desgaste irregular acelerado de neumáticos."
    }
  },
  {
    keywords: ["aceite", "oil", "fuga de aceite", "consume aceite", "humo azul", "nivel de aceite", "mancha negra", "sello", "empaquetadura", "filtro de aceite"],
    result: {
      diagnosis: "Fuga o consumo excesivo de aceite de motor. Posible desgaste de sellos, empaques o desgaste interno de cilindros.",
      severity: "Alto",
      confidence: "Media",
      likelyCauses: [
        "Sello de válvulas desgastado permitiendo que el aceite entre a la cámara de combustión",
        "Empaquetadura de carter o cubierta de válvulas en mal estado",
        "Anillos de pistón desgastados (consumo interno de aceite)",
        "Aceite incorrecto o nivel excesivo causando presurización del carter"
      ],
      recommendedParts: ["Juego de empaques y sellos", "Aceite de motor especificado por fabricante", "Filtro de aceite OEM"],
      estimatedHours: 2.0,
      safetyWarning: "El nivel bajo de aceite puede provocar desgaste catastrófico del motor en minutos. Verifique el nivel diariamente."
    }
  },
  {
    keywords: ["transmision", "caja", "cambio", "marcha", "embrague", "patina", "no entra", "ruido en caja", "patinaje", "automatica", "manual"],
    result: {
      diagnosis: "Falla en la transmisión o embrague. Síntomas compatibles con desgaste del disco de embrague, sincronizadores o banda de transmisión automática.",
      severity: "Alto",
      confidence: "Media",
      likelyCauses: [
        "Disco de embrague desgastado (material de fricción agotado)",
        "Sincronizadores de caja manual desgastados (dificultad para entrar marcha)",
        "Aceite de transmisión automática degradado o bajo nivel",
        "Solenoides de control de cambios defectuosos en cajas automáticas"
      ],
      recommendedParts: ["Kit de embrague completo (disco, prensa, collarín)", "Aceite ATF para transmisión automática", "Filtro de transmisión automática"],
      estimatedHours: 5.0,
      safetyWarning: "Un embrague patinante puede fallar completamente de forma repentina. Evite altas cargas o remolques hasta la reparación."
    }
  },
  {
    keywords: ["aire acondicionado", "ac", "a/c", "frio", "no enfria", "compresor", "gas refrigerante", "recarga de gas", "ventilacion"],
    result: {
      diagnosis: "Falla en el sistema de aire acondicionado. Probable pérdida de refrigerante R-134a o falla del compresor/embrague magnético.",
      severity: "Bajo",
      confidence: "Media",
      likelyCauses: [
        "Fuga de refrigerante R-134a por mangueras, O-rings o el compresor mismo",
        "Embrague magnético del compresor desgastado o con relay defectuoso",
        "Condensador obstruido por polvo/insectos reduciendo la disipación de calor",
        "Sensor de presión del A/C dando lectura errática y apagando el sistema"
      ],
      recommendedParts: ["Recarga y verificación de fugas con tinte UV (R-134a)", "Kit O-rings del sistema", "Revisión del embrague magnético del compresor"],
      estimatedHours: 1.5,
      safetyWarning: null
    }
  },
  {
    keywords: ["llanta", "neumatico", "ponchado", "desgaste", "presion de llanta", "rueda", "rin", "balanceo", "alineacion", "vibra el volante"],
    result: {
      diagnosis: "Problema en neumáticos o ruedas. Desgaste irregular, desbalanceo o presión incorrecta afectando el comportamiento del vehículo.",
      severity: "Medio",
      confidence: "Alta",
      likelyCauses: [
        "Presión de inflado incorrecta (sobre o subinflado)",
        "Desbalanceo de ruedas generando vibración en el volante a alta velocidad",
        "Alineación desajustada causando desgaste irregular en los hombros del neumático",
        "Neumático con deformación interna (protuberancia lateral)"
      ],
      recommendedParts: ["Balanceo de las 4 ruedas", "Alineación computarizada en 4 puntos", "Neumáticos (según desgaste medido)"],
      estimatedHours: 1.0,
      safetyWarning: "Los neumáticos con deformación o presión incorrecta aumentan el riesgo de reventón a alta velocidad."
    }
  },
  {
    keywords: ["escape", "catalitico", "catalizador", "sensor de oxigeno", "lambda", "check engine", "luz motor", "obd", "codigo de falla", "p0", "humo negro", "olor a azufre"],
    result: {
      diagnosis: "Falla en el sistema de gestión del motor o emisiones. Probable DTC activo en el sistema OBD-II relacionado a sensores de escape o la mezcla aire-combustible.",
      severity: "Medio",
      confidence: "Media",
      likelyCauses: [
        "Sensor de oxígeno (lambda) pre o post catalizador con respuesta lenta o averiado",
        "Catalizador degradado internamente (eficiencia por debajo del umbral del ECU)",
        "Sensor MAP o MAF con lectura errática alterando la mezcla de combustible",
        "Fuga de vacío en el multiple de admisión causando mezcla pobre"
      ],
      recommendedParts: ["Escaneo OBD-II completo con lectura de datos en tiempo real", "Sensor de oxígeno (pre-cat o post-cat según DTC)", "Limpieza de múltiple de admisión"],
      estimatedHours: 1.5,
      safetyWarning: "Circular con el catalizador averiado puede causar peligro de incendio por acumulación de HC no quemados."
    }
  },
  {
    keywords: ["correa", "banda", "distribución", "timing", "cadena", "ruido metalico motor", "tick tick", "golpeteo metalico"],
    result: {
      diagnosis: "Probable desgaste de la correa o cadena de distribución y sus tensores. Este es el mantenimiento más crítico en cuanto a consecuencias si falla.",
      severity: "Crítico",
      confidence: "Media",
      likelyCauses: [
        "Correa de distribución próxima a su intervalo de cambio (típico: 60,000–100,000 km)",
        "Tensor hidráulico de la cadena de distribución agotado generando holgura",
        "Ruido de 'cascabeleo' al inicio en frío indica elongación excesiva de la cadena",
        "Polea loca o de accesorios con rodamiento desgastado transmitiendo vibración"
      ],
      recommendedParts: ["Kit de distribución completo (correa, tensor, polea loca, bomba de agua)", "Aceite de motor nuevo (para reducir ruido de cadena)"],
      estimatedHours: 5.0,
      safetyWarning: "¡Crítico! La rotura de la correa de distribución destruye completamente el motor en motores de interferencia. Reemplazar de inmediato."
    }
  },
  {
    keywords: ["combustible", "gasolina", "bomba", "baja presion de combustible", "no sube rpm", "se apaga", "falla en subida", "filtro de combustible"],
    result: {
      diagnosis: "Falla en el sistema de suministro de combustible. Presión insuficiente por bomba débil o filtro obstruido.",
      severity: "Alto",
      confidence: "Media",
      likelyCauses: [
        "Bomba de combustible con caudal reducido (desgaste interno o corrosión)",
        "Filtro de combustible saturado bloqueando el flujo a los inyectores",
        "Regulador de presión de combustible defectuoso (presión fuera de spec)",
        "Depósito de combustible muy bajo causando cavitación en la bomba"
      ],
      recommendedParts: ["Bomba de combustible en módulo", "Filtro de combustible externo", "Kit de regulador de presión"],
      estimatedHours: 2.5,
      safetyWarning: "Conducir con presión de combustible baja puede causar paradas repentinas del motor en movimiento."
    }
  },
  {
    keywords: ["direccion", "power steering", "hidraulica", "duro al girar", "electroasistida", "eps", "ruido al doblar", "no centra"],
    result: {
      diagnosis: "Falla en el sistema de dirección asistida (hidráulica o eléctrica). Posible fuga de líquido de dirección o falla del motor de asistencia EPS.",
      severity: "Alto",
      confidence: "Media",
      likelyCauses: [
        "Nivel bajo de líquido de dirección hidráulica por fuga en mangueras o el rack",
        "Bomba de dirección hidráulica con desgaste en los álabes o sello interno",
        "Motor eléctrico EPS con falla de torque o sensor de ángulo descalibrado",
        "Cruceta o junta homocinética del piñón con desgaste mecánico"
      ],
      recommendedParts: ["Líquido de dirección hidráulica (ATF o específico)", "Revisión de rack y piñón", "Diagnóstico del módulo EPS por scanner"],
      estimatedHours: 2.0,
      safetyWarning: "Una dirección sin asistencia puede fallar repentinamente a bajas velocidades en maniobras. No descuide este sistema."
    }
  },
];

/**
 * Local deterministic fallback engine v2.
 * Uses a scored keyword-matching approach: scores each rule by the number
 * of matching keywords found in the symptom text, then picks the highest-scoring
 * match. Falls back to a dynamic generic diagnosis if no rule scores > 0.
 */
function getLocalDiagnosis(symptoms: string, vehicleInfo: string): DiagResult {
  if (!symptoms || symptoms.trim().length < 3) {
    // No useful symptom input at all — return a general inspection prompt
    return {
      diagnosis: "Inspección general preventiva del vehículo. Sin síntomas específicos reportados por el cliente.",
      severity: "Bajo",
      confidence: "Alta",
      likelyCauses: [
        "Mantenimiento preventivo de rutina (aceite, filtros, líquidos)",
        "Revisión de neumáticos: presión, desgaste y profundidad de dibujo",
        "Inspección de frenos, luces y sistema eléctrico",
        "Lectura preventiva de OBD-II para verificar que no haya DTCs pendientes"
      ],
      recommendedParts: [
        "Aceite de motor + filtro de aceite",
        "Filtro de aire de motor",
        "Filtro de habitáculo (polen)",
        "Revisión de líquido de frenos, refrigerante y dirección"
      ],
      estimatedHours: 1.0,
      safetyWarning: null
    };
  }

  const s = symptoms.toLowerCase();

  // Score each rule by how many of its keywords appear in the symptom string
  let bestScore = 0;
  let bestResult: DiagResult | null = null;

  for (const rule of DIAG_RULES) {
    const score = rule.keywords.filter(kw => s.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestResult = rule.result;
    }
  }

  if (bestResult && bestScore > 0) {
    // Adjust confidence based on how many keywords matched
    const boosted = { ...bestResult };
    if (bestScore >= 3) boosted.confidence = "Alta";
    else if (bestScore === 2) boosted.confidence = "Media";
    else boosted.confidence = "Baja";
    return boosted;
  }

  // Dynamic generic fallback that at least echoes the symptom back
  const cleanSymptom = symptoms.trim().charAt(0).toUpperCase() + symptoms.trim().slice(1);
  return {
    diagnosis: `Diagnóstico inicial requerido para: "${cleanSymptom}". Se necesita inspección física y lectura de códigos OBD-II para confirmar la causa raíz.`,
    severity: "Medio",
    confidence: "Baja",
    likelyCauses: [
      `Posible falla relacionada con: ${cleanSymptom}`,
      "Fallas intermitentes en sensores del tren motriz",
      "Mantenimiento básico preventivo vencido",
      "Se requiere prueba de ruta y diagnóstico con scanner profesional"
    ],
    recommendedParts: [
      "Escaneo Computarizado Completo OBD-II",
      "Inspección física de 27 puntos del vehículo"
    ],
    estimatedHours: 1.0,
    safetyWarning: "Diagnóstico basado en texto libre. Se recomienda inspección presencial para confirmar."
  };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  let symptoms: string;
  let vehicleInfo: string;

  try {
    const body = await req.json();
    symptoms    = body.symptoms?.trim();
    vehicleInfo = body.vehicleInfo?.trim() || "Vehículo no especificado";
    if (!symptoms) throw new Error("symptoms requerido");
  } catch {
    return new Response(
      JSON.stringify({ error: "Body inválido. Se requiere { symptoms, vehicleInfo }" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  // If API key is missing, empty, or placeholder, fall back directly to the local offline engine
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE" || apiKey.trim() === "") {
    console.log("No GEMINI_API_KEY found, running local diagnostic fallback.");
    return streamLocalDiagnosis(symptoms, vehicleInfo, encoder);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
        maxOutputTokens: 512,
      },
    });

    const userMessage = `Vehículo: ${vehicleInfo}\nSíntomas reportados: ${symptoms}`;

    // Try generating via Gemini stream
    const result = await model.generateContentStream(userMessage);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (err: any) {
          console.error("Error during active Gemini streaming, switching to local fallback:", err);
          // If stream fails halfway or at start (e.g. quota limit 429), recover via local engine stream!
          const localData = getLocalDiagnosis(symptoms, vehicleInfo);
          const jsonStr = JSON.stringify(localData, null, 2);
          controller.enqueue(encoder.encode(jsonStr));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    console.error("Gemini connection error (Quota/429/Network), falling back to offline diagnostic:", err);
    // If Gemini fails to connect, stream the local rules engine response
    return streamLocalDiagnosis(symptoms, vehicleInfo, encoder);
  }
}

/**
 * Streams the local diagnosis response character-by-character to perfectly
 * simulate the visual typing/streaming animation effect on the client frontend.
 */
function streamLocalDiagnosis(symptoms: string, vehicleInfo: string, encoder: TextEncoder) {
  const localData = getLocalDiagnosis(symptoms, vehicleInfo);
  const jsonStr = JSON.stringify(localData, null, 2);

  const stream = new ReadableStream({
    async start(controller) {
      const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
      const chunkSize = 8; // stream 8 characters at a time for natural speed

      for (let i = 0; i < jsonStr.length; i += chunkSize) {
        const chunk = jsonStr.substring(i, i + chunkSize);
        controller.enqueue(encoder.encode(chunk));
        await delay(12); // smooth 12ms typing delay
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
