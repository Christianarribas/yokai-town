/* ==================================================
   YOKAI TOWN - la lógica del pueblo
   Índice:
     1. Los datos del pueblo (edificios y personajes)
     2. Dibujar el mapa
     3. El reloj y el ciclo día/noche
     4. Qué hace cada personaje (sus rutinas)
     5. El bucle del juego (mover a los personajes)
     6. La ficha del personaje
     7. Arranque
   ==================================================

   Idea importante: TODAS las posiciones se guardan como
   fracciones de 0 a 1 (0 = borde izquierdo/superior del
   mapa, 1 = borde derecho/inferior). Así el pueblo funciona
   igual en un móvil pequeño que en un ordenador grande:
   solo cambian los píxeles, nunca las posiciones.
   ================================================== */


/* ---------- 1. LOS DATOS DEL PUEBLO ---------- */

// Los edificios. "x" e "y" son fracciones del mapa (ver arriba).
// Cada edificio es la casa Y el trabajo de su personaje.
const edificios = [
  // "lugar" es el nombre con artículo, para frases como "Trabajando en la herrería"
  { nombre: "Herrería",    lugar: "la herrería",    x: 0.16, y: 0.18, color: "#8d8d9e", tejado: "#5a5a6e" },
  { nombre: "Panadería",   lugar: "la panadería",   x: 0.50, y: 0.12, color: "#e0b56a", tejado: "#a05a2c" },
  { nombre: "Carpintería", lugar: "la carpintería", x: 0.84, y: 0.18, color: "#b5854d", tejado: "#6e4a24" },
  { nombre: "Herbolario",  lugar: "el herbolario",  x: 0.14, y: 0.62, color: "#7fbf7f", tejado: "#3e7d3e" },
  { nombre: "Leñador",     lugar: "casa del leñador", x: 0.86, y: 0.62, color: "#a5714e", tejado: "#59391f" },
  { nombre: "Muelle",      lugar: "el muelle",      x: 0.50, y: 0.83, color: "#7fa8c9", tejado: "#3d6a8f" },
];

// La plaza está en el centro; los personajes van allí a descansar.
const plaza = { x: 0.5, y: 0.42, radio: 0.13 };

// Los habitantes. Cada uno tiene su nombre, su emoji, su oficio,
// su edificio (por nombre) y un color para su circulito.
const habitantes = [
  { nombre: "Kitsune", emoji: "🦊", oficio: "Herrera",    edificio: "Herrería",    color: "#e07b39" },
  { nombre: "Tanuki",  emoji: "🐶", oficio: "Panadero",   edificio: "Panadería",   color: "#a5714e" },
  { nombre: "Tengu",   emoji: "👺", oficio: "Carpintero", edificio: "Carpintería", color: "#c0392b" },
  { nombre: "Yuki",    emoji: "🐱", oficio: "Herbolaria", edificio: "Herbolario",  color: "#3e7d3e" },
  { nombre: "Oni",     emoji: "👹", oficio: "Leñador",    edificio: "Leñador",     color: "#7d3e7d" },
  { nombre: "Kappa",   emoji: "🐢", oficio: "Pescador",   edificio: "Muelle",      color: "#3d6a8f" },
];

// Árboles y plantas de decoración: emoji + posición en el mapa.
const decoracion = [
  { emoji: "🌲", x: 0.05, y: 0.05 }, { emoji: "🌳", x: 0.30, y: 0.06 },
  { emoji: "🌲", x: 0.68, y: 0.05 }, { emoji: "🌳", x: 0.95, y: 0.40 },
  { emoji: "🌲", x: 0.03, y: 0.40 }, { emoji: "🌳", x: 0.28, y: 0.80 },
  { emoji: "🌲", x: 0.72, y: 0.82 }, { emoji: "🌷", x: 0.38, y: 0.38 },
  { emoji: "🌼", x: 0.62, y: 0.40 }, { emoji: "🍄", x: 0.90, y: 0.88 },
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
function crearCasa(datos) {
  const casa = document.createElement("div");
  casa.className = "casa";
  casa.innerHTML = `
    <span class="cartel">${datos.nombre}</span>
    <div class="tejado" style="background:${datos.tejado}"></div>
    <div class="cuerpo" style="background:${datos.color}">
      <div class="puerta"></div>
    </div>`;
  // El punto del edificio es su ESQUINA superior izquierda;
  // con transform lo centramos sobre sus coordenadas.
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


/* ---------- 3. EL RELOJ Y EL CICLO DÍA/NOCHE ---------- */

// La hora del pueblo (0 a 24). Un día completo dura 2 minutos
// de verdad: cada segundo real, el pueblo avanza 12 minutos.
let horaDelPueblo = 8;
const SEGUNDOS_POR_DIA_REAL = 120;

const elementoHora = document.getElementById("hora");
const iconoTiempo = document.getElementById("icono-tiempo");
const filtroNoche = document.getElementById("filtro-noche");

// Escribe la hora en pantalla y ajusta la oscuridad.
function actualizarReloj() {
  const horas   = Math.floor(horaDelPueblo);
  const minutos = Math.floor((horaDelPueblo - horas) * 60);
  // padStart rellena con un cero: las 8:05, no las 8:5
  elementoHora.textContent =
    String(horas).padStart(2, "0") + ":" + String(minutos).padStart(2, "0");

  const esDeNoche = horaDelPueblo >= 21 || horaDelPueblo < 6;
  iconoTiempo.textContent = esDeNoche ? "🌙" : "☀️";
  document.body.classList.toggle("de-noche", esDeNoche);

  // La oscuridad sube y baja poco a poco:
  // 0 a mediodía, máximo 0.55 a medianoche.
  const distanciaAMedianoche = Math.abs(horaDelPueblo - 12) / 12; // 0 a 1
  filtroNoche.style.opacity = Math.max(0, distanciaAMedianoche - 0.35) * 1.2;
}


/* ---------- 4. QUÉ HACE CADA PERSONAJE ---------- */

// Busca el edificio de un habitante por su nombre.
function edificioDe(habitante) {
  return edificios.find(e => e.nombre === habitante.edificio);
}

// Decide QUÉ debería estar haciendo un personaje según la hora.
// Devuelve un punto del mapa (su "zona") y un texto para la ficha.
function rutina(habitante) {
  const casa = edificioDe(habitante);
  const puertaCasa = { x: casa.x, y: casa.y + 0.09 }; // un poco debajo de su casa

  if (horaDelPueblo >= 21 || horaDelPueblo < 7) {
    return { zona: puertaCasa, texto: "Durmiendo 😴", burbuja: "💤" };
  }
  if (horaDelPueblo < 9) {
    return { zona: puertaCasa, texto: "Preparándose para el día", burbuja: "" };
  }
  if (horaDelPueblo < 13) {
    return { zona: puertaCasa, texto: "Trabajando en " + casa.lugar, burbuja: "🔨" };
  }
  if (horaDelPueblo < 15) {
    return { zona: { x: plaza.x, y: plaza.y }, texto: "Comiendo en la plaza", burbuja: "🍙" };
  }
  if (horaDelPueblo < 19) {
    return { zona: puertaCasa, texto: "Trabajando en " + casa.lugar, burbuja: "🔨" };
  }
  // Por la tarde-noche, a pasear por la plaza
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

// Crea a un habitante en el mapa y lo prepara para moverse.
function crearPersonaje(datos) {
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

  const casa = edificioDe(datos);

  // El objeto "personaje" junta los datos con su estado de movimiento
  const personaje = {
    datos: datos,
    elemento: elemento,
    burbuja: elemento.querySelector(".burbuja"),
    x: casa.x,            // empieza en su casa
    y: casa.y + 0.09,
    destino: { x: casa.x, y: casa.y + 0.09 },
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
  for (const p of personajes) {
    // 1. ¿Qué le toca hacer a esta hora?
    const ahora = rutina(p.datos);
    p.texto = ahora.texto;
    p.burbuja.textContent = ahora.burbuja;

    // 2. Si está parado, contamos hacia atrás su descanso.
    //    Al llegar a cero, elige un punto nuevo dentro de su zona.
    if (p.espera > 0) {
      p.espera--;
      p.elemento.classList.remove("caminando");
    } else {
      const distancia = ahora.texto.includes("Paseando") ? 0.35 : 0.06;
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
  document.getElementById("ficha-oficio").textContent = p.datos.oficio;
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


/* ---------- 7. ARRANQUE ---------- */

// Dibujamos el pueblo y ponemos los relojes en marcha.
crearCaminos();
crearPlaza();
for (const edificio of edificios) crearCasa(edificio);
crearDecoracion();
for (const habitante of habitantes) crearPersonaje(habitante);

actualizarReloj();

// El reloj del pueblo avanza cada segundo real
setInterval(() => {
  horaDelPueblo = (horaDelPueblo + 24 / SEGUNDOS_POR_DIA_REAL) % 24;
  actualizarReloj();
}, 1000);

// Y el juego da un paso 20 veces por segundo
setInterval(pasoDelJuego, 50);

// Truco de pruebas: abrir la página terminada en "#ficha"
// muestra directamente la ficha de Kitsune.
if (location.hash === "#ficha") mostrarFicha("Kitsune");
