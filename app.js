/* ==================================================
   YOKAI TOWN - la lógica del pueblo
   Índice:
     1. Los datos del pueblo (edificios y personajes)
     2. Dibujar el mapa
     3. El reloj: la hora REAL (+ botón de avance rápido)
     4. Las rutinas (qué hace cada uno según la hora)
     5. El bucle del juego (mover a los personajes)
     6. La ficha del personaje
     7. Los avisos: vecinos → Tanuki → alcalde
     8. Arranque
   ==================================================

   Idea importante: TODAS las posiciones se guardan como
   fracciones de 0 a 1 (0 = borde izquierdo/superior del
   mapa, 1 = borde derecho/inferior). Así el pueblo funciona
   igual en un móvil pequeño que en un ordenador grande:
   solo cambian los píxeles, nunca las posiciones.

   Otra idea importante: el pueblo va con la HORA REAL del
   reloj del dispositivo. Si abres la web a las 9:00, los
   vecinos están trabajando; si la abres a las 23:00, están
   durmiendo. (Para Christian: su móvil ya está en la hora
   de Madrid, así que usamos directamente la hora local.)
   ================================================== */


/* ---------- 1. LOS DATOS DEL PUEBLO ---------- */

// El ayuntamiento: la casa del alcalde. Es más grande que las demás.
const ayuntamiento = {
  nombre: "Ayuntamiento", lugar: "el ayuntamiento",
  x: 0.5, y: 0.16, color: "#e8e3d3", tejado: "#8f2f2f",
};

// Los edificios de los 5 agentes. "x" e "y" son fracciones del mapa.
// "lugar" es el nombre con artículo, para frases como "Trabajando en el banco".
const edificios = [
  { nombre: "Gimnasio",    lugar: "el gimnasio",    x: 0.15, y: 0.20, color: "#c96a5a", tejado: "#7d3a30" },
  { nombre: "Banco",       lugar: "el banco",       x: 0.85, y: 0.20, color: "#d9c25a", tejado: "#8f7a2c" },
  { nombre: "Mensajería",  lugar: "la mensajería",  x: 0.14, y: 0.64, color: "#7fbf7f", tejado: "#3e7d3e" },
  { nombre: "Empleo",      lugar: "la agencia",     x: 0.86, y: 0.64, color: "#8d8d9e", tejado: "#5a5a6e" },
  { nombre: "Restaurante", lugar: "el restaurante", x: 0.50, y: 0.85, color: "#e0b56a", tejado: "#a05a2c" },
];

// La plaza está en el centro; los personajes van allí a descansar.
const plaza = { x: 0.5, y: 0.44, radio: 0.13 };

// Los 5 vecinos-agentes: cada uno cuida un tema de la vida del alcalde.
// "tarea" es el texto que se ve mientras trabajan.
const agentes = [
  { nombre: "Oni",     emoji: "👹", rol: "Agente de Ejercicio",     tema: "ejercicio",     edificio: "Gimnasio",    color: "#c0392b", tarea: "Vigilando tu ejercicio",      burbujaTarea: "🏃" },
  { nombre: "Kitsune", emoji: "🦊", rol: "Agente de Gastos",        tema: "gastos",        edificio: "Banco",       color: "#e07b39", tarea: "Vigilando tus gastos",        burbujaTarea: "💰" },
  { nombre: "Yuki",    emoji: "🐱", rol: "Agente de Recordatorios", tema: "recordatorios", edificio: "Mensajería",  color: "#3e7d3e", tarea: "Vigilando tus recordatorios", burbujaTarea: "⏰" },
  { nombre: "Tengu",   emoji: "👺", rol: "Agente de Trabajo",       tema: "trabajo",       edificio: "Empleo",      color: "#7d3e7d", tarea: "Buscando ofertas de camarero", burbujaTarea: "💼" },
  { nombre: "Kappa",   emoji: "🐢", rol: "Agente de Comidas",       tema: "comidas",       edificio: "Restaurante", color: "#3d6a8f", tarea: "Vigilando tus comidas",       burbujaTarea: "🍽️" },
];

// Los dos personajes fijos: el alcalde y su segundo al mando.
const alcalde = { nombre: "Christian", emoji: "👑", rol: "Alcalde de Yokai Town", color: "#b8860b" };
const segundo = { nombre: "Tanuki",    emoji: "🍃", rol: "Segundo al mando",      color: "#2e8b57" };

// Árboles y plantas de decoración: emoji + posición en el mapa.
const decoracion = [
  { emoji: "🌲", x: 0.05, y: 0.05 }, { emoji: "🌳", x: 0.30, y: 0.06 },
  { emoji: "🌲", x: 0.68, y: 0.06 }, { emoji: "🌳", x: 0.95, y: 0.42 },
  { emoji: "🌲", x: 0.03, y: 0.42 }, { emoji: "🌳", x: 0.28, y: 0.82 },
  { emoji: "🌲", x: 0.72, y: 0.84 }, { emoji: "🌷", x: 0.38, y: 0.40 },
  { emoji: "🌼", x: 0.62, y: 0.42 }, { emoji: "🍄", x: 0.90, y: 0.90 },
];


/* ---------- 2. DIBUJAR EL MAPA ---------- */

const mapa = document.getElementById("mapa");

// Coloca un elemento en el mapa usando fracciones (0 a 1).
// "left: 50%" equivale a x = 0.5, etc.
function colocar(elemento, x, y) {
  elemento.style.left = (x * 100) + "%";
  elemento.style.top  = (y * 100) + "%";
}

// Crea una casa: cartel con el nombre, tejado y cuerpo con puerta.
// Si "grande" es true (el ayuntamiento), usa una clase que la hace mayor.
function crearCasa(datos, grande) {
  const casa = document.createElement("div");
  casa.className = grande ? "casa grande" : "casa";
  casa.innerHTML = `
    <span class="cartel">${datos.nombre}</span>
    <div class="tejado" style="background:${datos.tejado}"></div>
    <div class="cuerpo" style="background:${datos.color}">
      <div class="puerta"></div>
    </div>`;
  // El punto del edificio es su centro: lo centramos con transform.
  casa.style.transform = "translate(-50%, -50%)";
  colocar(casa, datos.x, datos.y);
  mapa.appendChild(casa);
}

// Crea los caminos: uno horizontal y uno vertical que cruzan en la plaza.
function crearCaminos() {
  const horizontal = document.createElement("div");
  horizontal.className = "camino";
  horizontal.style.left = "0";
  horizontal.style.top  = ((plaza.y - 0.03) * 100) + "%";
  horizontal.style.width  = "100%";
  horizontal.style.height = "6%";
  mapa.appendChild(horizontal);

  const vertical = document.createElement("div");
  vertical.className = "camino";
  vertical.style.left = ((plaza.x - 0.03) * 100) + "%";
  vertical.style.top  = "0";
  vertical.style.width  = "6%";
  vertical.style.height = "100%";
  mapa.appendChild(vertical);
}

// Crea la plaza circular con su fuente.
function crearPlaza() {
  const elemento = document.createElement("div");
  elemento.id = "plaza";
  elemento.textContent = "⛲";
  elemento.style.left   = ((plaza.x - plaza.radio) * 100) + "%";
  elemento.style.top    = ((plaza.y - plaza.radio) * 100) + "%";
  elemento.style.width  = (plaza.radio * 2 * 100) + "%";
  elemento.style.height = (plaza.radio * 2 * 100) + "%";
  mapa.appendChild(elemento);
}

// Crea los árboles y plantas.
function crearDecoracion() {
  for (const cosa of decoracion) {
    const elemento = document.createElement("div");
    elemento.className = "deco";
    elemento.textContent = cosa.emoji;
    colocar(elemento, cosa.x, cosa.y);
    mapa.appendChild(elemento);
  }
}


/* ---------- 3. EL RELOJ: LA HORA REAL ---------- */

// El pueblo usa la hora real del dispositivo.
// El botón ⏩ activa el "avance rápido": el reloj corre y un día
// entero pasa en 2 minutos, para ver el día completo cuando quieras.
// Al quitar el avance rápido, el pueblo vuelve solo a la hora real.
let modoRapido = false;
let horaSimulada = 12; // solo se usa mientras el avance rápido está activo

// Devuelve la hora del pueblo (0 a 24, con decimales).
function horaDelPueblo() {
  if (modoRapido) return horaSimulada;
  const ahora = new Date();
  return ahora.getHours() + ahora.getMinutes() / 60;
}

const elementoHora = document.getElementById("hora");
const iconoTiempo = document.getElementById("icono-tiempo");
const filtroNoche = document.getElementById("filtro-noche");
const botonAvance = document.getElementById("boton-avance");

// El botón ⏩ enciende y apaga el avance rápido.
botonAvance.addEventListener("click", () => {
  modoRapido = !modoRapido;
  if (modoRapido) horaSimulada = horaDelPueblo(); // empieza desde la hora actual
  botonAvance.classList.toggle("activo", modoRapido);
  actualizarReloj();
});

// Escribe la hora en pantalla y ajusta la oscuridad.
function actualizarReloj() {
  const hora = horaDelPueblo();
  const horas   = Math.floor(hora);
  const minutos = Math.floor((hora - horas) * 60);
  // padStart rellena con un cero: las 8:05, no las 8:5
  elementoHora.textContent =
    String(horas).padStart(2, "0") + ":" + String(minutos).padStart(2, "0");

  const esDeNoche = hora >= 21 || hora < 7;
  iconoTiempo.textContent = esDeNoche ? "🌙" : "☀️";
  document.body.classList.toggle("de-noche", esDeNoche);

  // La oscuridad sube y baja poco a poco:
  // 0 a mediodía, máximo 0.55 a medianoche.
  const distanciaAMedianoche = Math.abs(hora - 12) / 12; // 0 a 1
  filtroNoche.style.opacity = Math.max(0, distanciaAMedianoche - 0.35) * 1.2;
}


/* ---------- 4. LAS RUTINAS ---------- */

// Busca el edificio de un agente por su nombre.
function edificioDe(agente) {
  return edificios.find(e => e.nombre === agente.edificio);
}

// La puerta de un edificio: un poco debajo de su centro.
function puertaDe(edificio) {
  return { x: edificio.x, y: edificio.y + 0.09 };
}

// Decide QUÉ debería estar haciendo cada personaje según la hora.
// Devuelve su "zona" del mapa, el texto para la ficha y su burbuja.
function rutina(p, hora) {
  // --- El alcalde ---
  if (p.tipo === "alcalde") {
    const puertaCasa = puertaDe(ayuntamiento);
    if (avisoParaAlcalde > 0) {
      return { zona: puertaCasa, texto: "Leyendo un aviso que le trae Tanuki", burbuja: "💬" };
    }
    if (hora >= 22 || hora < 8) return { zona: puertaCasa, texto: "Descansando 😴", burbuja: "💤" };
    if (hora < 9)  return { zona: puertaCasa, texto: "Empezando el día", burbuja: "" };
    if (hora < 13) return { zona: puertaCasa, texto: "Gobernando desde el ayuntamiento", burbuja: "👑" };
    if (hora < 16) return { zona: { x: plaza.x, y: plaza.y }, texto: "Comiendo en la plaza", burbuja: "🍙" };
    if (hora < 20) return { zona: puertaCasa, texto: "Gobernando desde el ayuntamiento", burbuja: "👑" };
    return { zona: { x: plaza.x, y: plaza.y }, texto: "Paseando por su pueblo", burbuja: "" };
  }

  // --- Tanuki, el segundo al mando ---
  // Su rutina normal es esperar junto al ayuntamiento; cuando hay un
  // aviso, la sección 7 lo manda de un lado a otro.
  if (p.tipo === "tanuki") {
    const suSitio = { x: ayuntamiento.x + 0.09, y: ayuntamiento.y + 0.10 };
    if (hora >= 22 || hora < 8) return { zona: suSitio, texto: "Descansando 😴", burbuja: "💤" };
    return { zona: suSitio, texto: "A la espera de avisos de los agentes", burbuja: "🍃" };
  }

  // --- Los 5 agentes ---
  const casa = edificioDe(p.datos);
  const puertaCasa = puertaDe(casa);

  // Si este agente tiene un aviso pendiente para el alcalde, lo anuncia
  if (aviso && aviso.agente === p) {
    return { zona: puertaCasa, texto: "Tiene un aviso para el alcalde", burbuja: "💬" };
  }

  if (hora >= 21 || hora < 8) return { zona: puertaCasa, texto: "Durmiendo 😴", burbuja: "💤" };
  if (hora < 9)  return { zona: puertaCasa, texto: "Preparándose para el día", burbuja: "" };
  if (hora < 14) return { zona: puertaCasa, texto: p.datos.tarea, burbuja: p.datos.burbujaTarea };
  if (hora < 16) return { zona: { x: plaza.x, y: plaza.y }, texto: "Comiendo en la plaza", burbuja: "🍙" };
  if (hora < 20) return { zona: puertaCasa, texto: p.datos.tarea, burbuja: p.datos.burbujaTarea };
  return { zona: { x: plaza.x, y: plaza.y }, texto: "Paseando por el pueblo", burbuja: "" };
}

// Un punto al azar cerca de una zona (para que no se queden clavados).
function puntoCercano(zona, distancia) {
  return {
    x: Math.min(0.94, Math.max(0.06, zona.x + (Math.random() - 0.5) * distancia)),
    y: Math.min(0.94, Math.max(0.06, zona.y + (Math.random() - 0.5) * distancia)),
  };
}


/* ---------- 5. EL BUCLE DEL JUEGO ---------- */

// Crea un personaje en el mapa y lo prepara para moverse.
// "tipo" puede ser "agente", "alcalde" o "tanuki".
function crearPersonaje(datos, tipo, x, y) {
  const elemento = document.createElement("div");
  elemento.className = "personaje";
  elemento.style.setProperty("--color", datos.color);
  elemento.innerHTML = `<span class="emoji">${datos.emoji}</span><span class="burbuja"></span>`;

  // Al tocarlo, mostramos su ficha (sección 6)
  elemento.addEventListener("click", (evento) => {
    evento.stopPropagation(); // para que el mapa no cierre la ficha a la vez
    mostrarFicha(datos.nombre);
  });

  mapa.appendChild(elemento);

  // El objeto "personaje" junta los datos con su estado de movimiento
  const personaje = {
    datos: datos,
    tipo: tipo,
    elemento: elemento,
    burbuja: elemento.querySelector(".burbuja"),
    x: x,
    y: y,
    destino: { x: x, y: y },
    espera: 0,            // pasos que le quedan parado antes de decidir otra vez
    texto: "En casa",
  };
  personajes.push(personaje);
  colocar(elemento, personaje.x, personaje.y);
}

const personajes = [];
const VELOCIDAD = 0.004; // fracción del mapa que recorre en cada paso

// Un paso del juego: se repite 20 veces por segundo.
function pasoDelJuego() {
  const hora = horaDelPueblo();

  for (const p of personajes) {
    // 1. ¿Qué le toca hacer a esta hora?
    const ahora = rutina(p, hora);
    p.texto = ahora.texto;
    p.burbuja.textContent = ahora.burbuja;

    // 2. Tanuki obedece a la sección 7 cuando hay un aviso en marcha
    const misionTanuki = p.tipo === "tanuki" ? misionDeTanuki(p) : null;

    if (misionTanuki) {
      p.destino = misionTanuki;
      p.espera = 0;
    } else if (p.espera > 0) {
      // Si está parado, contamos hacia atrás su descanso
      p.espera--;
      p.elemento.classList.remove("caminando");
    } else {
      // Al acabar el descanso, elige un punto nuevo dentro de su zona
      const distancia = ahora.texto.includes("Paseando") ? 0.30 : 0.05;
      p.destino = puntoCercano(ahora.zona, distancia);
      p.espera = 40 + Math.floor(Math.random() * 120); // de 2 a 8 segundos parado
    }

    // 3. Moverlo un trocito hacia su destino
    const dx = p.destino.x - p.x;
    const dy = p.destino.y - p.y;
    const distancia = Math.sqrt(dx * dx + dy * dy);

    if (distancia > VELOCIDAD) {
      p.x += (dx / distancia) * VELOCIDAD;
      p.y += (dy / distancia) * VELOCIDAD;
      p.elemento.classList.add("caminando");
    }

    colocar(p.elemento, p.x, p.y);

    // Si su ficha está abierta, actualizamos lo que está haciendo
    if (p === personajeEnFicha) {
      document.getElementById("ficha-estado").textContent = p.texto;
    }
  }

  // 4. Contadores de la sección 7
  if (avisoParaAlcalde > 0) avisoParaAlcalde--;
  pensandoAviso();
}


/* ---------- 6. LA FICHA DEL PERSONAJE ---------- */

const ficha = document.getElementById("ficha");

// El personaje cuya ficha está abierta (null si está cerrada).
// Así podemos actualizar la ficha mientras él sigue con su vida.
let personajeEnFicha = null;

// Rellena la ficha con los datos del personaje tocado y la muestra.
function mostrarFicha(nombre) {
  const p = personajes.find(p => p.datos.nombre === nombre);
  if (!p) return;
  personajeEnFicha = p;
  document.getElementById("ficha-emoji").textContent  = p.datos.emoji;
  document.getElementById("ficha-nombre").textContent = p.datos.nombre;
  document.getElementById("ficha-oficio").textContent = p.datos.rol;
  document.getElementById("ficha-estado").textContent = p.texto;
  ficha.classList.remove("oculta");
}

// Cerrar la ficha: con el botón ✖ o tocando cualquier punto del mapa.
function cerrarFicha() {
  personajeEnFicha = null;
  ficha.classList.add("oculta");
}
document.getElementById("cerrar-ficha").addEventListener("click", cerrarFicha);
mapa.addEventListener("click", cerrarFicha);


/* ---------- 7. LOS AVISOS: vecinos → Tanuki → alcalde ---------- */

// Así funciona el pueblo: los agentes vigilan sus temas y, cuando tienen
// algo que contar, NO molestan al alcalde directamente. Enseñan su aviso 💬
// y Tanuki (el segundo) va a por él, lo recoge y se lo lleva al alcalde.
//
// OJO: de momento los avisos son DE EJEMPLO (salen solos de vez en cuando
// para ver el recorrido). Cuando conectemos los temas de verdad, cada
// aviso vendrá de lo que pase en la vida real del alcalde.

// El aviso en marcha, o null si no hay ninguno.
// Fases: "emitido" (el agente lo tiene) → "recogido" (Tanuki lo tiene)
// → se entrega al alcalde y desaparece.
let aviso = null;
let avisoTema = ""; // el tema del último aviso, para el cartelito de entrega

// Pasos que le queda al alcalde leyendo su aviso (0 = ninguno).
let avisoParaAlcalde = 0;

// Contador para que los avisos salgan de vez en cuando (no a chorro).
// El primero sale pronto, para que se vea el recorrido nada más abrir la web.
let ticksHastaAviso = 200; // ~10 segundos

// ¿Sale un aviso nuevo? Solo de día (los agentes trabajan de 8 a 21).
function pensandoAviso() {
  if (aviso) return;
  ticksHastaAviso--;
  if (ticksHastaAviso > 0) return;

  const hora = horaDelPueblo();
  if (hora >= 8 && hora < 21) {
    // Elegimos un agente al azar y le ponemos el aviso
    const quienes = personajes.filter(p => p.tipo === "agente");
    const elegido = quienes[Math.floor(Math.random() * quienes.length)];
    aviso = { agente: elegido, fase: "emitido" };
  }
  // Tanto si sale como si no, el próximo se intenta en 1-2 minutos
  ticksHastaAviso = 1200 + Math.floor(Math.random() * 1200);
}

// La misión de Tanuki cuando hay aviso. Devuelve el punto al que debe ir,
// o null si no tiene misión (y entonces sigue su rutina normal).
function misionDeTanuki(p) {
  if (!aviso) return null;

  if (aviso.fase === "emitido") {
    p.texto = "Va a recoger un aviso de " + aviso.agente.datos.nombre;
    p.burbuja.textContent = "🍃";
    // ¿Ha llegado ya donde está el agente?
    const destino = { x: aviso.agente.x, y: aviso.agente.y };
    if (estaCerca(p, destino)) {
      aviso.fase = "recogido";
      mostrarAviso("🍃 Tanuki recoge un aviso de " + aviso.agente.datos.tema + " (de ejemplo)");
    }
    return destino;
  }

  if (aviso.fase === "recogido") {
    p.texto = "Lleva el aviso al alcalde";
    p.burbuja.textContent = "💬";
    const alcaldeP = personajes.find(q => q.tipo === "alcalde");
    const destino = { x: alcaldeP.x, y: alcaldeP.y };
    if (estaCerca(p, destino)) {
      // Entrega hecha: el alcalde se pone a leerlo un rato
      avisoTema = aviso.agente.datos.tema;
      aviso = null;
      avisoParaAlcalde = 240; // ~12 segundos
      mostrarAviso("👑 El alcalde lee el aviso de " + avisoTema + " que le trae Tanuki (de ejemplo)");
    }
    return destino;
  }

  return null;
}

// ¿Está un personaje prácticamente encima de un punto?
function estaCerca(p, punto) {
  const dx = punto.x - p.x;
  const dy = punto.y - p.y;
  return Math.sqrt(dx * dx + dy * dy) < 0.02;
}

// Muestra el cartelito de aviso unos segundos.
const elementoAviso = document.getElementById("aviso");
let temporizadorAviso = null;
function mostrarAviso(texto) {
  elementoAviso.textContent = texto;
  elementoAviso.classList.remove("oculta");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => elementoAviso.classList.add("oculta"), 6000);
}


/* ---------- 8. ARRANQUE ---------- */

// Dibujamos el pueblo y ponemos los relojes en marcha.
crearCaminos();
crearPlaza();
crearCasa(ayuntamiento, true);
for (const edificio of edificios) crearCasa(edificio, false);
crearDecoracion();

// Los 5 agentes empiezan en la puerta de su edificio
for (const agente of agentes) {
  const puerta = puertaDe(edificioDe(agente));
  crearPersonaje(agente, "agente", puerta.x, puerta.y);
}
// El alcalde y Tanuki, junto al ayuntamiento
crearPersonaje(alcalde, "alcalde", ayuntamiento.x, ayuntamiento.y + 0.10);
crearPersonaje(segundo, "tanuki", ayuntamiento.x + 0.09, ayuntamiento.y + 0.10);

actualizarReloj();

// Cada segundo real: si el avance rápido está activo, la hora corre
// (un día en 2 minutos); si no, solo refrescamos el reloj.
setInterval(() => {
  if (modoRapido) horaSimulada = (horaSimulada + 24 / 120) % 24;
  actualizarReloj();
}, 1000);

// Y el juego da un paso 20 veces por segundo
setInterval(pasoDelJuego, 50);

// Trucos de pruebas:
// - Abrir la página terminada en "#ficha" muestra la ficha de Tanuki.
// - Terminada en "#h14" (o la hora que sea), activa el avance rápido
//   empezando a esa hora, para probar cualquier momento del día.
if (location.hash === "#ficha") mostrarFicha("Tanuki");
if (location.hash.startsWith("#h")) {
  modoRapido = true;
  horaSimulada = parseFloat(location.hash.slice(2)) || 12;
  botonAvance.classList.add("activo");
  actualizarReloj();
}
