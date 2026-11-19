/* ==================================================
   YOKAI TOWN - la lógica del pueblo (todos siempre hacen algo concreto)
   Índice (la izakaya del bar está en las secciones 1, 4 y 8):
     1. Los datos del pueblo (edificios y personajes)
     2. Dibujar el mapa
     3. El reloj: la hora REAL (+ botón de avance rápido)
     4. Las rutinas (qué hace cada uno según la hora)
     5. El bucle del juego (mover a los personajes)
     6. La ficha del personaje
     7. Los avisos: vecinos → Tanuki → alcalde
     8. El buzón de avisos 📬
     9. Memoria local
    10. Clima real de Bizkaia
    11. Arranque
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

// La izakaya (el bar del pueblo): al acabar de trabajar, todos se
// pasan un rato a divertirse antes de irse a dormir.
const izakaya = {
  nombre: "Izakaya", lugar: "la izakaya",
  x: 0.32, y: 0.64, color: "#d98c5f", tejado: "#5c2a2a",
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

// El restaurante (para no escribir siempre edificios[4])
const restaurante = edificios.find(e => e.nombre === "Restaurante");

// La plaza está en el centro; es el centro del pueblo (la fuente y los caminos).
const plaza = { x: 0.5, y: 0.44, radio: 0.13 };

// Cada agente tiene DOS tareas que se van alternando, para que se
// vea que siempre hacen algo concreto (nunca dan vueltas sin más).

// A qué hora empieza la fiesta en la izakaya y a qué hora se acaba
// (después, todos a dormir).
const HORA_BAR = 20;
const HORA_DORMIR = 23;

// Los 5 vecinos-agentes: cada uno cuida un tema de la vida del alcalde.
// "tarea" es el texto que se ve mientras trabajan.
const agentes = [
  { nombre: "Oni",     emoji: "👹", rol: "Agente de Ejercicio",     tema: "ejercicio",     edificio: "Gimnasio",    color: "#c0392b", tarea: "Vigilando tu ejercicio",      burbujaTarea: "🏃", tarea2: "Levantando pesas", burbujaTarea2: "🏋️" },
  { nombre: "Kitsune", emoji: "🦊", rol: "Agente de Gastos",        tema: "gastos",        edificio: "Banco",       color: "#e07b39", tarea: "Vigilando tus gastos",        burbujaTarea: "💰", tarea2: "Contando monedas", burbujaTarea2: "🪙" },
  { nombre: "Yuki",    emoji: "🐱", rol: "Agente de Recordatorios", tema: "recordatorios", edificio: "Mensajería",  color: "#3e7d3e", tarea: "Vigilando tus recordatorios", burbujaTarea: "⏰", tarea2: "Repartiendo cartas", burbujaTarea2: "✉️" },
  { nombre: "Tengu",   emoji: "👺", rol: "Agente de Trabajo",       tema: "trabajo",       edificio: "Empleo",      color: "#7d3e7d", tarea: "Buscando ofertas de camarero", burbujaTarea: "💼", tarea2: "Revisando ofertas de camarero", burbujaTarea2: "📋" },
  { nombre: "Kappa",   emoji: "🐢", rol: "Agente de Comidas",       tema: "comidas",       edificio: "Restaurante", color: "#3d6a8f", tarea: "Vigilando tus comidas",       burbujaTarea: "🍽️", tarea2: "Cocinando tus menús", burbujaTarea2: "🍳" },
];

// Los dos personajes fijos: el alcalde y su segundo al mando.
const alcalde = { nombre: "Christian", emoji: "👑", rol: "Alcalde de Yokai Town", color: "#b8860b" };
const segundo = { nombre: "Tanuki",    emoji: "🍃", rol: "Segundo al mando",      color: "#2e8b57" };

// Árboles y plantas de decoración: emoji + posición en el mapa.
const decoracion = [
  { emoji: "🌲", x: 0.06, y: 0.06 }, { emoji: "🌳", x: 0.29, y: 0.06 },
  { emoji: "🌲", x: 0.71, y: 0.06 }, { emoji: "🌳", x: 0.94, y: 0.34 },
  { emoji: "🌲", x: 0.06, y: 0.34 }, { emoji: "🌳", x: 0.70, y: 0.88 },
  { emoji: "🌲", x: 0.81, y: 0.83 }, { emoji: "🌷", x: 0.30, y: 0.33 },
  { emoji: "🌼", x: 0.70, y: 0.33 }, { emoji: "🍄", x: 0.92, y: 0.92 },
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
  // Los farolillos pertenecen a la fachada, no al mapa.
  // Así nunca se separan del bar al cambiar el tamaño de pantalla.
  if (datos === izakaya) {
    casa.classList.add("izakaya");
    const fachada = casa.querySelector(".cuerpo");
    for (const lado of ["izquierdo", "derecho"]) {
      const farol = document.createElement("span");
      farol.className = "farolillo " + lado;
      farol.textContent = "🏮";
      farol.setAttribute("aria-hidden", "true");
      fachada.appendChild(farol);
    }
  }
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


// Cada vecino tiene su sitio frente al bar. No eligen puntos al azar
// entre la izakaya y el cartel del restaurante, ni se pisan entre ellos.
const sitiosDelBar = [
  { x: 0.08, y: 0.76 }, { x: 0.18, y: 0.76 },
  { x: 0.28, y: 0.76 }, { x: 0.38, y: 0.72 },
  { x: 0.13, y: 0.88 }, { x: 0.24, y: 0.88 },
  { x: 0.35, y: 0.88 },
];

// Las cosas que se hacen en la izakaya: cada personaje va rotando.
const actividadesBar = [
  { texto: "Brindando con sake",       burbuja: "🍶" },
  { texto: "Cantando en el karaoke",   burbuja: "🎤" },
  { texto: "Picando yakitori",         burbuja: "🍢" },
  { texto: "Jugando a las cartas",     burbuja: "🃏" },
  { texto: "Pidiendo otra caña",       burbuja: "🍻" },
];
// "numero" distingue a unos personajes de otros para que no hagan todos lo mismo a la vez.
function actividadDelBar(numero) {
  const a = actividadesBar[(Math.floor(Date.now() / 7000) + numero) % actividadesBar.length];
  return { zona: sitiosDelBar[numero], quieto: true, texto: a.texto + " en la izakaya", burbuja: a.burbuja };
}

// Alterna entre dos actividades cada pocos segundos.
function alternar(numero, a, b) {
  return (Math.floor(Date.now() / 9000) + numero) % 2 === 0 ? a : b;
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
  const horaActual = horaDelPueblo();
  modoRapido = !modoRapido;
  if (modoRapido) horaSimulada = horaActual; // empieza desde la hora actual
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
    if (hora >= HORA_DORMIR || hora < 8) return { zona: puertaCasa, quieto: true, texto: "Descansando 😴", burbuja: "💤" };
    if (hora < 9)  return { zona: puertaCasa, texto: "Empezando el día", burbuja: "" };
    if (hora < 13) return { zona: puertaCasa, ...alternar(p.numero, { texto: "Gobernando desde el ayuntamiento", burbuja: "👑" }, { texto: "Firmando papeles del pueblo", burbuja: "📜" }) };
    if (hora < 15) return { zona: puertaDe(restaurante), texto: "Comiendo en el restaurante", burbuja: "🍙" };
    if (hora < 20) return { zona: puertaCasa, ...alternar(p.numero, { texto: "Gobernando desde el ayuntamiento", burbuja: "👑" }, { texto: "Atendiendo a los vecinos", burbuja: "🗣️" }) };
    return actividadDelBar(p.numero);
  }

  // --- Tanuki, el segundo al mando ---
  // Su rutina normal es esperar junto al ayuntamiento; cuando hay un
  // aviso, la sección 7 lo manda de un lado a otro.
  if (p.tipo === "tanuki") {
    const suSitio = { x: ayuntamiento.x + 0.09, y: ayuntamiento.y + 0.10 };
    if (hora >= HORA_DORMIR || hora < 8) return { zona: suSitio, quieto: true, texto: "Descansando 😴", burbuja: "💤" };
    if (hora >= HORA_BAR) return actividadDelBar(p.numero);
    if (hora >= 13 && hora < 14) return { zona: puertaDe(restaurante), texto: "Comiendo en el restaurante", burbuja: "🍙" };
    return { zona: suSitio, ...alternar(p.numero, { texto: "A la espera de avisos de los agentes", burbuja: "🍃" }, { texto: "Ordenando los avisos del día", burbuja: "📋" }) };
  }

  // --- Los 5 agentes ---
  const casa = edificioDe(p.datos);
  const puertaCasa = puertaDe(casa);

  // Si este agente tiene un aviso pendiente para el alcalde, lo anuncia
  if (aviso && aviso.agente === p) {
    return { zona: puertaCasa, texto: "Tiene un aviso para el alcalde", burbuja: "💬" };
  }

  if (hora >= HORA_DORMIR || hora < 8) return { zona: puertaCasa, quieto: true, texto: "Durmiendo 😴", burbuja: "💤" };
  if (hora < 9)  return { zona: puertaCasa, texto: "Abriendo su edificio", burbuja: "☕" };
  const trabajo = alternar(p.numero,
    { texto: p.datos.tarea,  burbuja: p.datos.burbujaTarea },
    { texto: p.datos.tarea2, burbuja: p.datos.burbujaTarea2 });
  if (hora < 14) return { zona: puertaCasa, ...trabajo };
  if (hora < 16) return { zona: puertaDe(restaurante), texto: "Comiendo en el restaurante", burbuja: "🍙" };
  if (hora < 20) return { zona: puertaCasa, ...trabajo };
  return actividadDelBar(p.numero);
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
    numero: personajes.length, // para variar las actividades
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
    } else if (ahora.quieto) {
      // En la izakaya y al dormir cada uno conserva su sitio, aunque
      // siga cambiando de actividad. Tanuki puede salir a entregar avisos.
      p.destino = ahora.zona;
      p.espera = 0;
    } else if (p.espera > 0) {
      // Si está parado, contamos hacia atrás su descanso
      p.espera--;
      p.elemento.classList.remove("caminando");
    } else {
      // Al acabar el descanso, elige un punto nuevo dentro de su zona
      p.destino = puntoCercano(ahora.zona, 0.05);
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

    // Al llegar, dejan de hacer la animación de caminar.
    if (distancia <= VELOCIDAD) p.elemento.classList.remove("caminando");
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
      guardarEnBuzon(aviso.agente); // se guarda en el buzón 📬
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


/* ---------- 8. EL BUZÓN DE AVISOS 📬 ---------- */

// Cuando Tanuki entrega un aviso, se guarda aquí para que el alcalde
// pueda leerlo entero cuando quiera. De momento los textos son de EJEMPLO.

// Un texto de ejemplo por tema (más adelante vendrán de datos reales).
const textosDeEjemplo = {
  ejercicio:     "Hoy toca entrenar. (Aviso de ejemplo: aquí irá tu rutina de ejercicio.)",
  gastos:        "Este mes llevas un gasto alto en ocio. (Aviso de ejemplo: aquí irán tus gastos reales.)",
  recordatorios: "No olvides tu cita de mañana a las 10:00. (Aviso de ejemplo.)",
  trabajo:       "Hay una oferta nueva de camarero cerca de ti. (Aviso de ejemplo: aquí irán las ofertas reales.)",
  comidas:       "Hoy toca cenar algo ligero. (Aviso de ejemplo: aquí irá tu plan de comidas.)",
};

// La lista de avisos recibidos (el más nuevo primero).
const CLAVE_MEMORIA = "yokai-town-memoria-v1";
// Los atajos de demostración no escriben sobre el buzón real.
const pruebaBuzon = ["#buzon", "#buzoncerrado"].includes(location.hash);
let memoriaDisponible = true;
const memoriaInicial = cargarMemoria();
const avisosRecibidos = pruebaBuzon ? [] : memoriaInicial.avisos;

const botonBuzon = document.getElementById("boton-buzon");
const contadorBuzon = document.getElementById("contador-buzon");
const panelBuzon = document.getElementById("buzon");
const listaBuzon = document.getElementById("buzon-lista");
const buzonVacio = document.getElementById("buzon-vacio");

// Guarda un aviso en el buzón (lo llama Tanuki al entregarlo).
function guardarEnBuzon(agente) {
  const hora = document.getElementById("hora").textContent; // la hora del pueblo
  avisosRecibidos.unshift({
    hora: hora,
    fecha: new Date().toISOString(),
    agente: agente.datos.nombre,
    emoji: agente.datos.emoji,
    tema: agente.datos.tema,
    texto: textosDeEjemplo[agente.datos.tema],
    leido: false,
  });
  guardarMemoria();
  dibujarBuzon();
}

// Redibuja la lista y el contador de no leídos.
function dibujarBuzon() {
  const sinLeer = avisosRecibidos.filter(a => !a.leido).length;
  contadorBuzon.textContent = sinLeer;
  contadorBuzon.classList.toggle("oculta", sinLeer === 0);
  buzonVacio.style.display = avisosRecibidos.length ? "none" : "block";

  listaBuzon.innerHTML = "";
  for (const a of avisosRecibidos) {
    const item = document.createElement("li");
    item.className = a.leido ? "aviso-item" : "aviso-item no-leido";
    // textContent evita interpretar como HTML los datos recuperados del dispositivo.
    for (const [clase, texto] of [
      ["aviso-hora", a.hora],
      ["aviso-quien", `${a.emoji} ${a.agente} · ${a.tema}`],
      ["aviso-texto", a.texto],
    ]) {
      const parte = document.createElement(clase === "aviso-texto" ? "p" : "span");
      parte.className = clase;
      parte.textContent = texto;
      item.appendChild(parte);
    }
    if (a.fecha) {
      const fecha = document.createElement("small");
      fecha.className = "aviso-fecha";
      fecha.textContent = new Date(a.fecha).toLocaleDateString("es-ES", {
        day: "numeric", month: "short", year: "numeric",
      });
      item.appendChild(fecha);
    }
    listaBuzon.appendChild(item);
  }
}

// Abrir el buzón: se ven los avisos (con su punto) y, al cerrarlo,
// pasan a estar leídos.
botonBuzon.addEventListener("click", () => {
  panelBuzon.classList.toggle("oculta");
  if (panelBuzon.classList.contains("oculta")) marcarComoLeidos();
});
document.getElementById("cerrar-buzon").addEventListener("click", () => {
  panelBuzon.classList.add("oculta");
  marcarComoLeidos();
});
function marcarComoLeidos() {
  for (const a of avisosRecibidos) a.leido = true;
  guardarMemoria();
  dibujarBuzon();
}


/* ---------- 9. MEMORIA LOCAL ---------- */

// Guardamos los avisos y la preferencia visual, no las posiciones ni el reloj.
// Al volver al pueblo los vecinos siguen la hora REAL, sin quedarse en el pasado.
function cargarMemoria() {
  const limpia = { avisos: [], sinAnimacion: null };
  try {
    const texto = localStorage.getItem(CLAVE_MEMORIA);
    if (!texto) return limpia;
    const datos = JSON.parse(texto);
    if (!datos || datos.version !== 1 || !Array.isArray(datos.avisos)) return limpia;
    const avisos = datos.avisos.filter(a => a &&
      ["hora", "agente", "emoji", "tema", "texto"].every(campo => typeof a[campo] === "string") &&
      typeof a.leido === "boolean").map(a => ({
        hora: a.hora, agente: a.agente, emoji: a.emoji, tema: a.tema,
        texto: a.texto, leido: a.leido,
        fecha: typeof a.fecha === "string" && Number.isFinite(Date.parse(a.fecha)) ? a.fecha : null,
      }));
    return { avisos, sinAnimacion: typeof datos.sinAnimacion === "boolean" ? datos.sinAnimacion : null };
  } catch (error) {
    // Un JSON roto se ignora; si el navegador bloquea el almacenamiento, avisamos.
    if (!(error instanceof SyntaxError)) memoriaDisponible = false;
    return limpia;
  }
}

function guardarMemoria() {
  if (pruebaBuzon) return;
  try {
    localStorage.setItem(CLAVE_MEMORIA, JSON.stringify({
      version: 1, avisos: avisosRecibidos,
      sinAnimacion: document.getElementById("menos-movimiento").checked,
    }));
    memoriaDisponible = true;
  } catch (error) {
    // Incluso sin espacio o permiso, el pueblo sigue funcionando en esta sesión.
    memoriaDisponible = false;
  }
  actualizarEstadoMemoria();
}

function actualizarEstadoMemoria() {
  document.getElementById("estado-memoria").textContent = pruebaBuzon
    ? "🧪 Buzón de demostración · No se guarda"
    : memoriaDisponible ? "💾 Guardado en este dispositivo" : "💾 Sin guardado · Solo esta sesión";
}

/* ---------- 10. CLIMA REAL DE BIZKAIA ---------- */

// Un punto fijo cerca de Santurtzi / Portugalete. No pedimos tu ubicación.
// Documentación de códigos WMO: https://open-meteo.com/en/docs
const URL_CLIMA = "https://api.open-meteo.com/v1/forecast?latitude=43.33&longitude=-3.03&current=temperature_2m%2Cweather_code&timezone=Europe%2FMadrid&temperature_unit=celsius";
const INTERVALO_CLIMA = 30 * 60 * 1000;
const capaClima = document.getElementById("capa-clima");
const textoClima = document.getElementById("clima-actual");
const detalleClima = document.getElementById("clima-detalle");
const menosMovimiento = document.getElementById("menos-movimiento");
const preferenciaMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
let ultimaConsultaClima = 0;
let consultandoClima = false;

function tipoDeClima(codigo) {
  if (codigo === 0) return { tipo: "sol", icono: "☀️", texto: "Despejado" };
  if (codigo === 1 || codigo === 2) return { tipo: "parcial", icono: "🌤️", texto: "Sol y nubes" };
  if (codigo === 3) return { tipo: "nubes", icono: "☁️", texto: "Nublado" };
  if ([45, 48].includes(codigo)) return { tipo: "niebla", icono: "🌫️", texto: "Niebla" };
  if ([71, 73, 75, 77, 85, 86].includes(codigo)) return { tipo: "nieve", icono: "❄️", texto: "Nieve" };
  if ([95, 96, 97, 99].includes(codigo)) return { tipo: "lluvia", icono: "⛈️", texto: "Tormenta" };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(codigo)) {
    return { tipo: "lluvia", icono: "🌧️", texto: "Lluvia" };
  }
  return null;
}

function dibujarClima(clima) {
  mapa.dataset.clima = clima ? clima.tipo : "neutro";
  capaClima.replaceChildren();
  if (!clima) return;
  if (["sol", "parcial"].includes(clima.tipo)) {
    const sol = document.createElement("span");
    sol.className = "sol-clima";
    capaClima.appendChild(sol);
  }
  if (!["sol", "neutro"].includes(clima.tipo)) {
    for (let numero = 0; numero < 3; numero++) {
      const nube = document.createElement("span");
      nube.className = "nube-clima";
      nube.style.left = (numero * 35 - 5) + "%";
      nube.style.top = (numero % 2 ? 4 : 1) + "%";
      capaClima.appendChild(nube);
    }
  }
  const cantidad = clima.tipo === "lluvia" ? 28 : clima.tipo === "nieve" ? 24 : 0;
  for (let numero = 0; numero < cantidad; numero++) {
    const particula = document.createElement("span");
    particula.className = clima.tipo === "lluvia" ? "gota-clima" : "copo-clima";
    particula.style.left = Math.random() * 100 + "%";
    particula.style.setProperty("--demora", -Math.random() * 8 + "s");
    particula.style.setProperty("--duracion", (clima.tipo === "lluvia" ? 0.7 + Math.random() * 0.6 : 5 + Math.random() * 4) + "s");
    particula.style.setProperty("--altura-quieta", Math.random() * 100 + "%");
    if (clima.tipo === "nieve") particula.textContent = "❄";
    capaClima.appendChild(particula);
  }
}

async function consultarClima(forzar = false) {
  // Date.now() es tiempo real: el botón ⏩ nunca acelera las consultas.
  if (consultandoClima || document.hidden || (!forzar && Date.now() - ultimaConsultaClima < INTERVALO_CLIMA)) return;
  consultandoClima = true;
  ultimaConsultaClima = Date.now();
  const control = new AbortController();
  const limite = setTimeout(() => control.abort(), 10000);
  try {
    const respuesta = await fetch(URL_CLIMA, { signal: control.signal, cache: "no-store", credentials: "omit" });
    if (!respuesta.ok) throw new Error("Sin datos");
    const datos = await respuesta.json();
    const actual = datos.current;
    const clima = actual && tipoDeClima(actual.weather_code);
    if (!clima || !Number.isFinite(actual.temperature_2m)) throw new Error("Datos incompletos");
    dibujarClima(clima);
    textoClima.textContent = `${clima.icono} Bizkaia · ${clima.texto} · ${Math.round(actual.temperature_2m)} °C`;
    const hora = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
    detalleClima.textContent = `Santurtzi / Portugalete · Consultado ${hora} · Cada 30 min`;
  } catch (error) {
    // Sin conexión, sin aviso molesto ni clima antiguo presentado como actual.
    dibujarClima(null);
    textoClima.textContent = "🌿 Bizkaia · Clima tranquilo";
    detalleClima.textContent = "Santurtzi / Portugalete · Tiempo real en pausa";
  } finally {
    clearTimeout(limite);
    consultandoClima = false;
  }
}

menosMovimiento.checked = memoriaInicial.sinAnimacion ?? preferenciaMovimiento.matches;
document.body.classList.toggle("clima-quieto", menosMovimiento.checked);
menosMovimiento.addEventListener("change", () => {
  document.body.classList.toggle("clima-quieto", menosMovimiento.checked);
  guardarMemoria();
});
// Se actualiza al volver a la app si ya han pasado los 30 minutos.
document.addEventListener("visibilitychange", () => { if (!document.hidden) consultarClima(); });
window.addEventListener("online", () => consultarClima(true));

/* ---------- 11. ARRANQUE ---------- */

// Dibujamos el pueblo y ponemos los relojes en marcha.
crearCaminos();
crearPlaza();
crearCasa(ayuntamiento, true);
crearCasa(izakaya, false);
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
dibujarBuzon();
guardarMemoria();
actualizarEstadoMemoria();
consultarClima();
setInterval(() => consultarClima(), INTERVALO_CLIMA);

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
// - Terminada en "#buzon", el buzón se abre con avisos de ejemplo
//   ("#buzoncerrado" los pone pero con el buzón cerrado).
if (location.hash === "#buzon" || location.hash === "#buzoncerrado") {
  for (const nombre of ["Kitsune", "Tengu", "Oni"]) {
    guardarEnBuzon(personajes.find(p => p.datos.nombre === nombre));
  }
  avisosRecibidos[2].leido = true;
  dibujarBuzon();
  if (location.hash === "#buzon") panelBuzon.classList.remove("oculta");
}
if (location.hash === "#ficha") mostrarFicha("Tanuki");
if (location.hash.startsWith("#h")) {
  modoRapido = true;
  const horaDePrueba = parseFloat(location.hash.slice(2));
  horaSimulada = Number.isFinite(horaDePrueba) ? ((horaDePrueba % 24) + 24) % 24 : 12;
  botonAvance.classList.add("activo");
  actualizarReloj();
}
