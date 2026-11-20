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
    11. Ideas locales de los vecinos
    12. Avisos reales (avisos.json, escritos por Instinct)
    13. Las charlas entre vecinos 💬
    14. Arranque
   ==================================================

   FORMATO DE avisos.json (lo escribe Instinct a mano, mismo directorio):
   {
     "avisos": [
       {
         "id": "cita-osakidetza-2026-11-20",   // obligatorio, ÚNICO: no repetir nunca
         "agente": "yuki",                     // oni | kitsune | yuki | tengu | kappa
         "texto": "Mañana tienes cita en Osakidetza a las 10:30.",
         "fecha": "2026-11-19T18:00:00+01:00"  // opcional (si falta, se usa la de llegada)
       }
     ]
   }
   Reglas: el texto se pinta como TEXTO, nunca como HTML; los avisos con
   un id ya recibido se ignoran (no se duplican aunque el archivo siga
   sirviéndolos); si el archivo falta, está vacío o es JSON roto, el
   pueblo sigue funcionando sin que se note.
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

// Trucos de pruebas: trozos de la almohadilla de la dirección, combinables
// (p. ej. "#h10#manana-lluvia"). Se usan al final, en la sección 13, y en
// el clima (sección 10). En la vida real la dirección no lleva ninguno.
const trucos = new Set(location.hash.split("#").filter(Boolean));
function trucoConPrefijo(prefijo) {
  for (const truco of trucos) if (truco.startsWith(prefijo)) return truco.slice(prefijo.length);
  return null;
}

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
  // .burbuja es el icono de lo que hace; .charla, sus frases (sección 13)
  elemento.innerHTML = `<span class="emoji">${datos.emoji}</span><span class="burbuja"></span><span class="charla oculta"></span>`;

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
    charlando: false,     // true mientras está en una charla (sección 13): se queda quieto
  };
  personaje.charla = elemento.querySelector(".charla");
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

    // 3. Moverlo un trocito hacia su destino.
    // Si está de charla (sección 13), se queda donde está: es de mala
    // educación irse andando mientras te hablan.
    const dx = p.destino.x - p.x;
    const dy = p.destino.y - p.y;
    const distancia = Math.sqrt(dx * dx + dy * dy);

    if (!p.charlando && distancia > VELOCIDAD) {
      p.x += (dx / distancia) * VELOCIDAD;
      p.y += (dy / distancia) * VELOCIDAD;
      p.elemento.classList.add("caminando");
    }

    // Al llegar (o al pararse a charlar), dejan de hacer la animación de caminar.
    if (distancia <= VELOCIDAD || p.charlando) p.elemento.classList.remove("caminando");
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
// Los avisos ya NO son de ejemplo. Salen de dos sitios:
//   - las ideas locales de los vecinos (sección 11: clima real, hora y día);
//   - los avisos reales que Instinct escribe en avisos.json (sección 12).
// Ambos entran en la COLA de avisos y Tanuki los entrega de uno en uno.

// El aviso en marcha, o null si no hay ninguno.
// Fases: "emitido" (el agente lo tiene) → "recogido" (Tanuki lo tiene)
// → se entrega al alcalde y desaparece.
let aviso = null;

// La cola de avisos pendientes de entregar. Cada uno:
// { agente (personaje), texto, id (único, para no repetir), fecha }
const colaAvisos = [];

// Pasos que le queda al alcalde leyendo su aviso (0 = ninguno).
let avisoParaAlcalde = 0;

// Pausa entre una entrega y la siguiente, para que no lleguen a chorro.
// El primero sale pronto, para que se vea el recorrido nada más abrir la web.
let ticksHastaAviso = 200; // ~10 segundos

// Mete un aviso en la cola (o directo al buzón con el truco "#directo").
// Los que tienen id ya recibido o ya encolado se ignoran: jamás se repiten.
// "prioritario" lo pone el primero de la cola (avisos reales antes que ideas).
function encolarAviso(agentePersonaje, texto, id, fecha, prioritario) {
  const yaExiste = id && (avisosRecibidos.some(a => a.id === id) ||
    colaAvisos.some(a => a.id === id) || (aviso && aviso.id === id));
  if (yaExiste) return;
  const nuevo = { agente: agentePersonaje, texto: texto, id: id || null, fecha: fecha || null };
  if (trucos.has("directo")) { guardarEnBuzon(nuevo); return; }
  if (prioritario) colaAvisos.unshift(nuevo); else colaAvisos.push(nuevo);
}

// ¿Entregamos el siguiente aviso de la cola? Solo de día (de 8 a 23),
// que es cuando los vecinos y el alcalde están despiertos.
function pensandoAviso() {
  if (aviso || colaAvisos.length === 0) return;
  ticksHastaAviso--;
  if (ticksHastaAviso > 0) return;

  const hora = horaDelPueblo();
  if (hora >= 8 && hora < 23) {
    aviso = colaAvisos.shift();
    aviso.fase = "emitido";
  }
  // La siguiente entrega: en 45-75 segundos (casi nada con el truco "#rapido")
  ticksHastaAviso = trucos.has("rapido") ? 40 : 900 + Math.floor(Math.random() * 600);
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
      mostrarAviso("🍃 Tanuki recoge un aviso de " + aviso.agente.datos.nombre + " (" + aviso.agente.datos.tema + ")");
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
      guardarEnBuzon(aviso); // se guarda en el buzón 📬
      const nombreAgente = aviso.agente.datos.nombre;
      aviso = null;
      avisoParaAlcalde = 240; // ~12 segundos
      mostrarAviso("👑 El alcalde lee el aviso de " + nombreAgente + " que le trae Tanuki");
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
// pueda leerlo entero cuando quiera. Los textos ya son de verdad: ideas
// de los vecinos (sección 11) y avisos de Instinct (sección 12).

// La lista de avisos recibidos (el más nuevo primero).
const CLAVE_MEMORIA = "yokai-town-memoria-v1";
// Los atajos de demostración no escriben sobre el buzón real.
const pruebaBuzon = trucos.has("buzon") || trucos.has("buzoncerrado");
let memoriaDisponible = true;
const memoriaInicial = cargarMemoria();
const avisosRecibidos = pruebaBuzon ? [] : memoriaInicial.avisos;

const botonBuzon = document.getElementById("boton-buzon");
const contadorBuzon = document.getElementById("contador-buzon");
const panelBuzon = document.getElementById("buzon");
const listaBuzon = document.getElementById("buzon-lista");
const buzonVacio = document.getElementById("buzon-vacio");

// Guarda un aviso en el buzón (lo llama Tanuki al entregarlo).
// Si el aviso tiene id y ya estaba, no se guarda dos veces.
function guardarEnBuzon(avisoEntregado) {
  if (avisoEntregado.id && avisosRecibidos.some(a => a.id === avisoEntregado.id)) return;
  const hora = document.getElementById("hora").textContent; // la hora del pueblo
  avisosRecibidos.unshift({
    id: avisoEntregado.id || null,
    hora: hora,
    fecha: avisoEntregado.fecha || new Date().toISOString(),
    agente: avisoEntregado.agente.datos.nombre,
    emoji: avisoEntregado.agente.datos.emoji,
    tema: avisoEntregado.agente.datos.tema,
    texto: avisoEntregado.texto,
    leido: false,
  });
  // Como mucho guardamos los 100 avisos más recientes.
  if (avisosRecibidos.length > 100) avisosRecibidos.length = 100;
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
      typeof a.leido === "boolean" &&
      // Limpieza: los avisos de ejemplo de la versión anterior se descartan.
      !a.texto.includes("de ejemplo")).map(a => ({
        id: typeof a.id === "string" ? a.id : null,
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
const URL_CLIMA = "https://api.open-meteo.com/v1/forecast?latitude=43.33&longitude=-3.03&current=temperature_2m%2Cweather_code&daily=weather_code&forecast_days=2&timezone=Europe%2FMadrid&temperature_unit=celsius";
// Así sabe el pueblo también el tiempo de MAÑANA (para ideas tipo "mañana llueve").
// Trucos de prueba: "#clima-lluvia" simula el tiempo de hoy y
// "#manana-nieve" el de mañana (sol, parcial, nubes, niebla, lluvia, nieve).
const CLIMAS_DE_PRUEBA = {
  sol: { tipo: "sol", icono: "☀️", texto: "Despejado" },
  parcial: { tipo: "parcial", icono: "🌤️", texto: "Sol y nubes" },
  nubes: { tipo: "nubes", icono: "☁️", texto: "Nublado" },
  niebla: { tipo: "niebla", icono: "🌫️", texto: "Niebla" },
  lluvia: { tipo: "lluvia", icono: "🌧️", texto: "Lluvia" },
  nieve: { tipo: "nieve", icono: "❄️", texto: "Nieve" },
};
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
    const climaTrucado = CLIMAS_DE_PRUEBA[trucoConPrefijo("clima-")];
    const clima = climaTrucado || (actual && tipoDeClima(actual.weather_code));
    if (!clima || (!climaTrucado && !Number.isFinite(actual.temperature_2m))) throw new Error("Datos incompletos");
    const temperatura = actual && Number.isFinite(actual.temperature_2m) ? actual.temperature_2m : 15;
    // El tiempo de mañana (segundo día del forecast) alimenta las ideas.
    const codigoManana = datos.daily && Array.isArray(datos.daily.weather_code) ? datos.daily.weather_code[1] : null;
    const climaManana = codigoManana !== null ? tipoDeClima(codigoManana) : null;
    climaParaIdeas = { tipo: clima.tipo, temperatura: temperatura };
    climaMananaParaIdeas = CLIMAS_DE_PRUEBA[trucoConPrefijo("manana-")] ? CLIMAS_DE_PRUEBA[trucoConPrefijo("manana-")].tipo : (climaManana ? climaManana.tipo : null);
    dibujarClima(clima);
    textoClima.textContent = `${clima.icono} Bizkaia · ${clima.texto} · ${Math.round(temperatura)} °C${climaTrucado ? " (simulado)" : ""}`;
    const hora = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
    detalleClima.textContent = `Santurtzi / Portugalete · Consultado ${hora} · Cada 30 min`;
  } catch (error) {
    // Sin conexión, sin aviso molesto ni clima antiguo presentado como actual.
    // (Con el truco "#clima-..." se simula incluso sin conexión, para pruebas.)
    const climaTrucado = CLIMAS_DE_PRUEBA[trucoConPrefijo("clima-")];
    if (climaTrucado) {
      climaParaIdeas = { tipo: climaTrucado.tipo, temperatura: 15 };
      dibujarClima(climaTrucado);
      textoClima.textContent = `${climaTrucado.icono} Bizkaia · ${climaTrucado.texto} (simulado)`;
    } else {
      dibujarClima(null);
      textoClima.textContent = "🌿 Bizkaia · Clima tranquilo";
    }
    detalleClima.textContent = "Santurtzi / Portugalete · Tiempo real en pausa";
    const mananaTrucado = CLIMAS_DE_PRUEBA[trucoConPrefijo("manana-")];
    if (mananaTrucado) climaMananaParaIdeas = mananaTrucado.tipo;
  } finally {
    clearTimeout(limite);
    consultandoClima = false;
    generarIdeasDelDia(); // la primera consulta (salga bien o mal) dispara las ideas
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

/* ---------- 11. IDEAS LOCALES DE LOS VECINOS ---------- */

// Cada vecino piensa con lo que la app sabe DE VERDAD: el tiempo real de
// Bizkaia (hoy y mañana), la hora y el día de la semana. Nada se inventa
// de la vida del alcalde: si una idea necesita un dato que no tenemos,
// simplemente no se propone.

let ideasGeneradas = false;
let climaParaIdeas = null;       // { tipo, temperatura } del tiempo actual
let climaMananaParaIdeas = null; // tipo del tiempo de mañana (o null)

// Un número estable a partir de un texto. Sirve para que cada día salgan
// ideas distintas, pero LAS MISMAS durante todo el día (no cambian al recargar).
function hashTexto(texto) {
  let h = 0;
  for (const letra of texto) h = (h * 31 + letra.codePointAt(0)) >>> 0;
  return h;
}

// Las ideas de cada vecino. "cuando" mira el contexto y decide si la idea
// aplica hoy; de las que aplican se elige una al azar estable del día.
// Contexto: { climaHoy, climaManana, temperatura, hora, diaSemana (0=domingo), diaDelMes }
const ideasPorTema = {
  ejercicio: [
    { clave: "lluvia-hoy", cuando: c => c.climaHoy === "lluvia",
      texto: "Hoy llueve en Bizkaia: mejor entrenar en casa o en el gimnasio. 30 minutos de rutina sin material también cuentan." },
    { clave: "lluvia-manana", cuando: c => c.climaManana === "lluvia" && c.climaHoy !== "lluvia",
      texto: "Mañana llueve en Bizkaia: si quieres entrenar al aire libre, hazlo hoy." },
    { clave: "nieve-hoy", cuando: c => c.climaHoy === "nieve",
      texto: "Hoy nieva: entrena dentro de casa y calienta unos minutos más de lo normal." },
    { clave: "buen-dia", cuando: c => ["sol", "parcial"].includes(c.climaHoy) && c.temperatura >= 12 && c.temperatura <= 26,
      texto: "Hace buen día: aprovecha para correr o caminar junto a la ría." },
    { clave: "lunes", cuando: c => c.diaSemana === 1,
      texto: "Lunes: entrena a primera hora y la semana empieza ganada." },
    { clave: "finde", cuando: c => c.diaSemana === 0 || c.diaSemana === 6,
      texto: "Fin de semana: una caminata larga por la costa también es entrenar." },
    { clave: "base", cuando: () => true,
      texto: "Idea de hoy: 20 minutos de ejercicio, aunque sea andando rápido. Lo importante es no romper la racha." },
  ],
  gastos: [
    { clave: "lunes", cuando: c => c.diaSemana === 1,
      texto: "Lunes: repasa lo que gastaste el fin de semana mientras lo tienes fresco." },
    { clave: "viernes", cuando: c => c.diaSemana === 5,
      texto: "Viernes: decide ahora cuánto quieres gastar este finde y apúntalo. El lunes lo agradecerás." },
    { clave: "principio-mes", cuando: c => c.diaDelMes <= 3,
      texto: "Principio de mes: buen momento para revisar suscripciones y gastos fijos." },
    { clave: "lluvia-finde", cuando: c => (c.diaSemana === 0 || c.diaSemana === 6) && c.climaHoy === "lluvia",
      texto: "Finde de lluvia: plan en casa (peli y algo rico de cocinar) y te ahorras el gasto de fuera." },
    { clave: "base", cuando: () => true,
      texto: "Idea de hoy: apunta todos los gastos pequeños del día. Los cafés y los antojos son los que más suman a final de mes." },
  ],
  recordatorios: [
    { clave: "manana", cuando: c => c.hora >= 8 && c.hora < 11,
      texto: "Buenos días: escribe ahora las 3 cosas importantes de hoy, antes de que se te olviden." },
    { clave: "domingo", cuando: c => c.diaSemana === 0,
      texto: "Domingo: apunta ya las citas y tareas de la semana que empieza mañana." },
    { clave: "lunes", cuando: c => c.diaSemana === 1,
      texto: "Lunes: revisa las citas de esta semana y pon avisos en el móvil." },
    { clave: "base", cuando: () => true,
      texto: "Idea de hoy: dedica 5 minutos a ordenar las notas y los recordatorios del móvil." },
  ],
  trabajo: [
    { clave: "lunes", cuando: c => c.diaSemana === 1,
      texto: "Lunes: las ofertas nuevas de camarero suelen salir a primeros de semana. Revisa hoy JobToday e InfoJobs." },
    { clave: "lluvia-manana", cuando: c => c.climaManana === "lluvia",
      texto: "Mañana llueve: los bares con terraza necesitarán gente dentro. Buen día para preguntar en persona." },
    { clave: "media-manana", cuando: c => c.hora >= 10 && c.hora < 12 && c.diaSemana >= 1 && c.diaSemana <= 5,
      texto: "A esta hora los bares están tranquilos entre servicios: buen momento para acercarte con el CV." },
    { clave: "viernes", cuando: c => c.diaSemana === 5,
      texto: "Viernes: los bares buscan refuerzo para el finde. Hoy es buen día para llamar o pasarte a preguntar." },
    { clave: "base", cuando: () => true,
      texto: "Idea de hoy: ten el CV actualizado y a mano en el móvil para enviarlo en cuanto salga una oferta." },
  ],
  comidas: [
    { clave: "lluvia", cuando: c => c.climaHoy === "lluvia",
      texto: "Día de lluvia: apetece algo caliente. Cocinar en casa (una crema, un pisto) además sale más barato." },
    { clave: "mediodia", cuando: c => c.hora >= 12 && c.hora < 14,
      texto: "Se acerca la hora de comer: si cocinas hoy, deja hecho extra y mañana ya tienes." },
    { clave: "tarde", cuando: c => c.hora >= 17 && c.hora < 20,
      texto: "Ve pensando la cena: algo ligero y temprano sienta mejor para dormir." },
    { clave: "sol-finde", cuando: c => (c.diaSemana === 0 || c.diaSemana === 6) && ["sol", "parcial"].includes(c.climaHoy),
      texto: "Hace bueno: si te apetece comer fuera, hoy la terraza está garantizada." },
    { clave: "base", cuando: () => true,
      texto: "Idea de hoy: prepara un tentempié sano (fruta o frutos secos) para no picar cualquier cosa." },
  ],
};

// Se llaman una vez al día (tras la primera consulta del clima): cada vecino
// elige su idea de hoy y la pone en la cola para que Tanuki la entregue.
function generarIdeasDelDia() {
  if (ideasGeneradas) return;
  ideasGeneradas = true;
  if (trucos.has("sinideas")) return; // truco de pruebas: solo avisos reales

  const ahora = new Date();
  const hora = horaDelPueblo();
  if (hora < 8 || hora >= 21) return; // de noche los vecinos no dan ideas

  // La fecha local de hoy (aaaa-mm-dd): forma parte del id de cada idea,
  // así una idea entregada hoy no se repite aunque recargues la página.
  const fecha = ahora.getFullYear() + "-" +
    String(ahora.getMonth() + 1).padStart(2, "0") + "-" +
    String(ahora.getDate()).padStart(2, "0");

  const diaTrucado = trucoConPrefijo("dia-");
  const contexto = {
    climaHoy: climaParaIdeas ? climaParaIdeas.tipo : null,
    climaManana: climaMananaParaIdeas,
    temperatura: climaParaIdeas ? climaParaIdeas.temperatura : null,
    hora: hora,
    diaSemana: diaTrucado !== null ? parseInt(diaTrucado, 10) : ahora.getDay(),
    diaDelMes: ahora.getDate(),
  };

  for (const datos of agentes) {
    const candidatas = (ideasPorTema[datos.tema] || []).filter(idea => idea.cuando(contexto));
    if (candidatas.length === 0) continue;
    const elegida = candidatas[hashTexto(fecha + "-" + datos.tema) % candidatas.length];
    const personaje = personajes.find(p => p.tipo === "agente" && p.datos === datos);
    if (personaje) {
      encolarAviso(personaje, elegida.texto, "idea-" + fecha + "-" + datos.tema + "-" + elegida.clave, null, false);
    }
  }
}


/* ---------- 12. AVISOS REALES (avisos.json) ---------- */

// Instinct escribe los avisos de la vida real del alcalde en un archivo
// avisos.json (mismo directorio que esta web; formato documentado arriba).
// La app lo descarga al abrir y cada 10 minutos, y mete los avisos nuevos
// los primeros de la cola, para que Tanuki los entregue cuanto antes.
const URL_AVISOS = "avisos.json";
const INTERVALO_AVISOS = 10 * 60 * 1000;

async function consultarAvisosReales() {
  if (document.hidden) return;
  const control = new AbortController();
  const limite = setTimeout(() => control.abort(), 10000);
  try {
    const respuesta = await fetch(URL_AVISOS, { signal: control.signal, cache: "no-store", credentials: "omit" });
    if (!respuesta.ok) throw new Error("Sin avisos");
    const datos = await respuesta.json();
    const lista = datos && Array.isArray(datos.avisos) ? datos.avisos : [];
    for (const item of lista) {
      // Validación: sin id único, sin texto o sin vecino conocido, se ignora.
      if (!item || typeof item.id !== "string" || !item.id.trim()) continue;
      if (typeof item.texto !== "string" || !item.texto.trim()) continue;
      const datosAgente = agentes.find(a => a.nombre.toLowerCase() === String(item.agente).toLowerCase().trim());
      if (!datosAgente) continue;
      const personaje = personajes.find(p => p.tipo === "agente" && p.datos === datosAgente);
      if (!personaje) continue;
      const fecha = typeof item.fecha === "string" && Number.isFinite(Date.parse(item.fecha)) ? item.fecha : null;
      // "real-" + id: no choca con los id de las ideas locales.
      encolarAviso(personaje, item.texto.trim(), "real-" + item.id.trim(), fecha, true);
    }
  } catch (error) {
    // Sin archivo, sin conexión o JSON roto: el pueblo sigue igual.
  } finally {
    clearTimeout(limite);
  }
}


/* ---------- 13. LAS CHARLAS ENTRE VECINOS 💬 ---------- */

// Los vecinos ya no son islas: cuando dos se cruzan (por la plaza, en la
// puerta del restaurante o juntitos en la izakaya) se paran a charlar un
// rato. Cada uno habla de lo suyo —Oni de ejercicio, Kitsune de gastos,
// Kappa de comidas, Yuki de recordatorios, Tengu de trabajo— y el otro
// le contesta llevando el tema a SU terreno. Ahí está la gracia.
//
// Cómo funciona, paso a paso:
//   1. Cada segundo, pasoDeCharla() mira si hay una charla en marcha.
//   2. Si la hay, enseña la frase que toca en el bocadillo del que habla.
//   3. Si no la hay, busca dos vecinos DESPIERTOS y CERCA el uno del otro
//      (distancia menor que DISTANCIA_CHARLA, en fracciones del mapa) y
//      les monta una conversación de 2 o 3 frases.
//   4. Mientras dura la charla, los dos se quedan quietos (p.charlando);
//      al acabar, cada uno sigue con su rutina como si nada.
// Solo hay una charla a la vez y entre charla y charla pasa un rato,
// para que el pueblo no parezca una pajarería.

// Lo que dice cada uno cuando EMPIEZA una conversación (va de su tema).
const frasesCharla = {
  ejercicio: [
    "Llevo 300 sentadillas hoy. Y aún queda tarde.",
    "Caminar hasta la izakaya también cuenta como cardio, que conste.",
    "Mañana toca rutina de brazo. Las escaleras del ayuntamiento ayudan.",
    "Vi al alcalde caminar ayer. Buen ritmo, hay que decirlo.",
    "El truco está en no romper la racha. Ni un día.",
    "¿Alguien se apunta a unas flexiones? ¿Nadie? Como siempre.",
  ],
  gastos: [
    "He sumado los cafés del mes y casi me da algo.",
    "El sake de la izakaya está bien de precio, lo tengo controlado.",
    "Hoy es buen día para no gastar. Como ayer. Y como mañana.",
    "He encontrado una suscripción que nadie usaba. Cazada.",
    "Ahorrar no es no gastar: es gastar sabiendo.",
    "Las monedas pequeñas también lloran si las ignoras.",
  ],
  recordatorios: [
    "Recordatorio: quedan cero recordatorios pendientes. Qué paz.",
    "¿Os habéis apuntado lo de mañana? ¿Seguro? ¿Seguro seguro?",
    "Yo no olvido nada: me apunto hasta respirar.",
    "Tres cartas entregadas hoy y ni una perdida. Récord.",
    "Apuntadlo ahora o lo apunto yo. Luego no digáis.",
    "El buzón del alcalde está al día. Orgullo de mensajera.",
  ],
  trabajo: [
    "He visto tres ofertas nuevas de camarero. Pinta bien la semana.",
    "Los viernes los bares buscan refuerzo. Apuntado en la agenda.",
    "Un buen CV es como un buen sashimi: fresco y sin relleno.",
    "Estoy puliendo la lista de bares del puerto. Uno cae, ya verás.",
    "Trabajar de camarero es cardio con propinas, que conste.",
    "¿Alguien quiere ensayar una entrevista? Ensayo gratis.",
  ],
  comidas: [
    "Hoy hay yakitori. Y mañana también, si el horno se porta.",
    "La dieta empieza con el desayuno, no con el lunes.",
    "He preparado un menú nuevo: rico, sano y barato. El triplete.",
    "¿Quién ha dicho croquetas? Ah, que he sido yo.",
    "Comer bien no es comer poco: es comer con cabeza.",
    "El secreto del ramen es la paciencia. Y el caldo.",
  ],
  tanuki: [
    "Todo bajo control. El alcalde no se entera de nada... bueno, de todo.",
    "He entregado todos los avisos del día. Merezco un sake.",
    "Este pueblo funciona porque yo no duermo... bueno, un poco sí.",
    "Si me necesitáis, estoy junto al ayuntamiento. Como siempre.",
    "Ordenar avisos es mi arte. Repartirlos, mi deporte.",
  ],
  alcalde: [
    "Me encanta ver el pueblo en marcha. Todo bajo control.",
    "Que conste en acta: hoy el pueblo luce de lujo.",
    "Un alcalde con buenos vecinos no necesita varita mágica.",
    "El pueblo huele a yakitori. Señal de que todo va bien.",
  ],
};

// Lo que CONTESTA cada uno: lleve el tema a su terreno, pase lo que pase.
const respuestasCharla = {
  ejercicio: [
    "¿Eso cansa? Porque si no, no cuenta.",
    "Muy bien, pero ¿y las flexiones qué?",
    "Hablar también quema calorías. Poquitas.",
  ],
  gastos: [
    "¿Y eso cuánto cuesta? Pregunto por un amigo.",
    "Si es gratis, me apunto dos veces.",
    "Apuntado en el libro de gastos. Todo suma.",
  ],
  recordatorios: [
    "Espera, que lo apunto antes de que se olvide.",
    "¿Tienes recordatorio para eso? ¿No? Pues ya lo tienes.",
    "Anotado, sellado y entregado.",
  ],
  trabajo: [
    "¿Eso tiene contrato? Porque si no...",
    "En un bar eso lo llaman turno partido.",
    "Suena a oferta con posibilidades.",
  ],
  comidas: [
    "¿Pero has comido ya? Eso es lo primero.",
    "Hablar da hambre. Tengo croquetas.",
    "Todo eso se arregla con un buen caldo.",
  ],
  tanuki: [
    "Se lo cuento al alcalde en el próximo aviso.",
    "Anotado para el alcalde. Gracias por el chisme.",
    "El alcalde estará encantado de saberlo.",
  ],
  alcalde: [
    "Me apunto eso. El pueblo primero.",
    "Así me gusta: vecinos con iniciativa.",
    "Que conste en acta.",
  ],
};

// Frases especiales de la izakaya (de 20 a 23): allí se habla de fiesta.
const frasesBar = [
  "¡Otra ronda, que la noche es joven!",
  "¿Quién se atreve con el karaoke?",
  "Este sake sabe a victoria.",
  "Las cartas no mienten... casi nunca.",
  "¡Brindis por el alcalde!",
  "El yakitori de hoy está para repetir.",
];
const respuestasBar = [
  "¡Por el pueblo!",
  "¡Salud!",
  "Eso, eso.",
  "La próxima la paga el que pierda.",
];

// Cierres cortos para cuando la charla tiene tercera frase.
const cierresCharla = ["😂", "Jajaja", "Eso es.", "Totalmente.", "👏"];

// A qué distancia (fracción del mapa) hay que estar para ponerse a charlar.
// Los sitios de la izakaya están a ~0.10 y Tanuki a ~0.09 del alcalde.
const DISTANCIA_CHARLA = 0.11;

// La charla en marcha, o null. { participantes, lineas, indice, ticks }
let charla = null;
// Momento a partir del cual puede empezar la siguiente charla.
// Con el truco "#charlas" salen seguido (para pruebas); si no, tardan un poco.
let proximaCharlaEn = Date.now() + (trucos.has("charlas") ? 3000 : 12000);

// La clave con la que se buscan las frases de cada personaje.
function claveCharla(p) {
  return p.tipo === "agente" ? p.datos.tema : p.tipo; // "alcalde" o "tanuki"
}

function elegirAlAzar(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

// Busca una pareja de vecinos despiertos y cerca. Devuelve [a, b] o null.
function buscarParejaParaCharla() {
  // No charlan: los que duermen, los que ya están de charla y Tanuki
  // cuando va con un aviso (tiene trabajo que hacer).
  const libres = personajes.filter(p =>
    p.burbuja.textContent !== "💤" && !p.charlando && !(p.tipo === "tanuki" && aviso));
  const parejas = [];
  for (let i = 0; i < libres.length; i++) {
    for (let j = i + 1; j < libres.length; j++) {
      const dx = libres[i].x - libres[j].x;
      const dy = libres[i].y - libres[j].y;
      if (Math.sqrt(dx * dx + dy * dy) < DISTANCIA_CHARLA) parejas.push([libres[i], libres[j]]);
    }
  }
  return parejas.length ? elegirAlAzar(parejas) : null;
}

// Monta la conversación: A abre con su tema, B contesta llevándolo al suyo
// y, a veces, A la cierra con una risa. En la izakaya se usan frases de bar.
function prepararCharla(a, b) {
  const hora = horaDelPueblo();
  const enElBar = hora >= HORA_BAR && hora < HORA_DORMIR;
  const primera = enElBar ? elegirAlAzar(frasesBar) : elegirAlAzar(frasesCharla[claveCharla(a)]);
  const segunda = enElBar && Math.random() < 0.5
    ? elegirAlAzar(respuestasBar)
    : elegirAlAzar(respuestasCharla[claveCharla(b)]);
  const lineas = [{ quien: a, texto: primera }, { quien: b, texto: segunda }];
  if (Math.random() < 0.5) lineas.push({ quien: a, texto: elegirAlAzar(cierresCharla) });
  return { participantes: [a, b], lineas: lineas, indice: -1, ticks: 0 };
}

// Cierra la charla: se borran los bocadillos y cada uno sigue con lo suyo.
function terminarCharla() {
  for (const p of charla.participantes) {
    p.charlando = false;
    p.charla.classList.add("oculta");
  }
  charla = null;
  // La siguiente charla, dentro de un rato (con "#charlas", enseguida).
  proximaCharlaEn = Date.now() + (trucos.has("charlas") ? 6000 : 18000 + Math.random() * 15000);
}

// El corazón de las charlas: se llama una vez por segundo.
function pasoDeCharla() {
  if (charla) {
    // Hay charla en marcha: cuando toca, pasamos a la frase siguiente.
    charla.ticks--;
    if (charla.ticks > 0) return;
    charla.indice++;
    for (const p of charla.participantes) p.charla.classList.add("oculta");
    if (charla.indice >= charla.lineas.length) { terminarCharla(); return; }
    const linea = charla.lineas[charla.indice];
    linea.quien.charla.textContent = linea.texto; // textContent: nunca HTML
    linea.quien.charla.classList.remove("oculta");
    // Si el bocadillo se sale del mapa (el que habla está en un borde),
    // lo empujamos hacia dentro y movemos el piquito para que siga
    // apuntando a la cabeza del que habla.
    const bocadillo = linea.quien.charla;
    const medidaBocadillo = bocadillo.getBoundingClientRect();
    const medidaMapa = mapa.getBoundingClientRect();
    let desplaza = 0;
    if (medidaBocadillo.left < medidaMapa.left + 4) desplaza = medidaMapa.left + 4 - medidaBocadillo.left;
    if (medidaBocadillo.right > medidaMapa.right - 4) desplaza = medidaMapa.right - 4 - medidaBocadillo.right;
    bocadillo.style.marginLeft = desplaza + "px";
    bocadillo.style.setProperty("--cola-x", "calc(50% - " + desplaza + "px)");
    // Cada frase dura según lo larga que sea (para que dé tiempo a leerla).
    charla.ticks = Math.max(3, Math.round(2 + linea.texto.length / 20));
    return;
  }
  // No hay charla: ¿ya puede salir la siguiente? ¿Y hay pareja cerca?
  if (Date.now() < proximaCharlaEn) return;
  const pareja = buscarParejaParaCharla();
  if (!pareja) { proximaCharlaEn = Date.now() + 5000; return; }
  charla = prepararCharla(pareja[0], pareja[1]);
  for (const p of charla.participantes) {
    p.charlando = true;
    p.elemento.classList.remove("caminando");
  }
}

const intervaloCharlas = setInterval(pasoDeCharla, 1000);


/* ---------- 14. ARRANQUE ---------- */

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

// Los avisos reales se buscan al abrir y cada 10 minutos.
consultarAvisosReales();
setInterval(consultarAvisosReales, INTERVALO_AVISOS);
document.addEventListener("visibilitychange", () => { if (!document.hidden) consultarAvisosReales(); });

// Red de seguridad: si la primera consulta del clima se atascara del todo,
// las ideas del día salen igual a los 12 segundos (con clima neutro).
setTimeout(generarIdeasDelDia, 12000);

// Con "#sincharlas" se paran los cotilleos del pueblo (para pruebas).
if (trucos.has("sincharlas")) clearInterval(intervaloCharlas);

// Cada segundo real: si el avance rápido está activo, la hora corre
// (un día en 2 minutos); si no, solo refrescamos el reloj.
setInterval(() => {
  if (modoRapido) horaSimulada = (horaSimulada + 24 / 120) % 24;
  actualizarReloj();
}, 1000);

// Y el juego da un paso 20 veces por segundo
setInterval(pasoDelJuego, 50);

// Trucos de pruebas (se combinan con #, p. ej. "#h10#manana-lluvia#buzon"):
// - "#ficha" muestra la ficha de Tanuki.
// - "#h14" (o la hora que sea) activa el avance rápido empezando a esa hora.
// - "#buzon" abre el buzón (y "#buzoncerrado" solo desactiva el guardado,
//   para que las pruebas no escriban en la memoria real).
// - "#abrebuzon" abre el buzón SIN desactivar el guardado.
// - "#sinideas" no genera ideas locales (para probar solo los avisos reales).
// - "#clima-lluvia" simula el tiempo de hoy; "#manana-nieve" el de mañana
//   (valores: sol, parcial, nubes, niebla, lluvia, nieve).
// - "#dia-5" simula el día de la semana (0 = domingo ... 6 = sábado).
// - "#rapido" entrega los avisos en cola con muy poca espera entre ellos.
// - "#directo" manda los avisos al buzón sin el paseo de Tanuki.
// - "#charlas" hace que los vecinos charlen mucho más seguido (para pruebas).
// - "#sincharlas" apaga las charlas por completo.
if (trucos.has("buzon") || trucos.has("abrebuzon")) panelBuzon.classList.remove("oculta");
if (trucos.has("ficha")) mostrarFicha("Tanuki");
const trucoHora = trucoConPrefijo("h");
if (trucoHora !== null && Number.isFinite(parseFloat(trucoHora))) {
  modoRapido = true;
  horaSimulada = ((parseFloat(trucoHora) % 24) + 24) % 24;
  botonAvance.classList.add("activo");
  actualizarReloj();
}
