// ARCHIVO SERVER-ONLY - NUNCA importar desde componentes cliente
// Contiene las respuestas correctas y explicaciones del quiz

import { QuizAnswer } from '@/types/training';

export const QUIZ_ANSWERS: Record<number, QuizAnswer> = {
  1: {
    respuesta: 'B',
    explicacion: 'Un celular se divide en 3 partes: la pantalla (interfaz con el usuario), la PCB o placa (el corazón donde ocurre todo el procesamiento), y el ensamble trasero (donde van batería, cámaras, parlantes y demás accesorios).',
  },
  2: {
    respuesta: 'C',
    explicacion: 'PCB significa Printed Circuit Board (tarjeta de circuito impreso). Es la placa principal donde van montados todos los componentes electrónicos. En el taller le decimos "la placa" o "el board".',
  },
  3: {
    respuesta: 'C',
    explicacion: 'La PCB tiene 4 partes: 1) La base (sustrato de cobre y fibra de vidrio), 2) Los chips/ICs (CPU, baseband, audio, WiFi), 3) Los componentes electrónicos (resistencias, capacitores, bobinas, diodos), y 4) Los conectores (interfaz con pantalla, batería, cámaras).',
  },
  4: {
    respuesta: 'B',
    explicacion: 'La base de la PCB está hecha de cobre y fibra de vidrio. El cobre forma las pistas conductoras y la fibra de vidrio da estructura y aislamiento entre capas.',
  },
  5: {
    respuesta: 'C',
    explicacion: 'Una PCB de celular típica tiene entre 8 y 9 capas. Cada capa tiene pistas de cobre que conectan diferentes componentes. Las capas se separan con material aislante.',
  },
  6: {
    respuesta: 'B',
    explicacion: 'IC significa Integrated Circuit (circuito integrado). Es un chip fabricado en silicio que contiene millones o miles de millones de componentes electrónicos integrados. Ejemplos: CPU, chip de audio, chip de WiFi.',
  },
  7: {
    respuesta: 'C',
    explicacion: 'Solo el 10% de los componentes en la placa son chips/ICs. El 90% restante son componentes electrónicos como resistencias, capacitores, bobinas y diodos. Por eso en reparación empezamos por los componentes electrónicos: son más abundantes, baratos y fáciles de trabajar.',
  },
  8: {
    respuesta: 'B',
    explicacion: 'CRÍTICO: Los chips tienen un pequeño círculo o triángulo en los bordes que indica la orientación correcta. Si un chip tiene adhesivo que cubre la marca, debes hacer una marca manual ANTES de retirarlo. Nunca pongas un chip sin verificar la orientación.',
  },
  9: {
    respuesta: 'C',
    explicacion: 'CRÍTICO: Poner un chip al revés puede causar un cortocircuito que queme el chip o dañe la placa completa. Esto puede significar perder componentes caros y el equipo del cliente. SIEMPRE verifica la orientación antes de soldar.',
  },
  10: {
    respuesta: 'B',
    explicacion: 'Conocer el fabricante es importante porque cada fabricante tiene una filosofía de diseño similar entre sus productos. Si conoces cómo trabaja un fabricante, puedes predecir cómo funcionan sus otros chips. Las primeras letras del código del chip indican el fabricante.',
  },
  11: {
    respuesta: 'C',
    explicacion: 'Las primeras letras del código impreso en la superficie del chip siempre indican el fabricante. Esto te ayuda a identificar rápidamente de dónde viene cada componente y anticipar su comportamiento.',
  },
  12: {
    respuesta: 'B',
    explicacion: 'Si dos chips tienen el mismo código, son intercambiables. Puedes usar uno en lugar del otro en diferentes módulos. Esto es útil cuando necesitas un repuesto: puedes sacarlo de otra placa que tenga el mismo chip.',
  },
  13: {
    respuesta: 'B',
    explicacion: 'Las pistas son caminos de cobre impresos en la PCB que conectan los componentes entre sí. No son líneas rectas, tienen curvas. Van en las múltiples capas de la placa (8-9 capas).',
  },
  14: {
    respuesta: 'C',
    explicacion: 'En reparación siempre se empieza por los componentes electrónicos (resistencias, capacitores, bobinas, diodos) porque son baratos y mucho más fáciles de trabajar. Los chips son caros y delicados, se dejan para después si los componentes no eran el problema.',
  },
  15: {
    respuesta: 'B',
    explicacion: 'El baseband (banda base) es el chip encargado de la comunicación celular: llamadas y datos móviles. Es uno de los chips más comunes cuando un celular presenta fallas de "sin señal".',
  },
  16: {
    respuesta: 'B',
    explicacion: 'Los 4 tipos principales de componentes electrónicos son: resistencias (limitan corriente), capacitores (almacenan carga), bobinas/inductores (almacenan energía magnética) y diodos (permiten corriente en una sola dirección).',
  },
  17: {
    respuesta: 'B',
    explicacion: 'La estructura de la PCB es prácticamente igual en Android y Apple: ambas tienen chips/ICs, componentes electrónicos y conectores. Los principios de reparación son los mismos sin importar la marca.',
  },
  18: {
    respuesta: 'B',
    explicacion: 'Los blindajes son cubiertas metálicas que se colocan sobre grupos de componentes para protegerlos contra interferencia electromagnética (EMI). Ayudan a que las señales no se mezclen entre diferentes circuitos.',
  },
  19: {
    respuesta: 'C',
    explicacion: 'CRÍTICO: Cuando un chip tiene adhesivo y no puedes ver la marca de orientación, DEBES hacer una marca manual antes de retirarlo. Así sabrás exactamente cómo recolocarlo. Ponerlo al revés puede causar cortocircuito y dañar la placa.',
  },
  20: {
    respuesta: 'C',
    explicacion: 'Conocer las fallas comunes te ahorra mucho tiempo y esfuerzo. Cuando reconoces una falla que ya has visto, sabes al instante dónde buscar sin necesidad de desarmar todo el celular. La experiencia se construye conociendo estos patrones.',
  },
};
