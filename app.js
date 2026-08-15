const SUPABASE_URL = "https://uwybwpegcglpruhofvgt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gLS83x3VfiOREA-sn1jojA_TlDIMuUH";

const cloudReady = !SUPABASE_URL.startsWith("PON_AQUI");

const db = cloudReady
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let orders = [];

/* =========================
   UTILIDADES
========================= */

const $ = id => document.getElementById(id);

const money = n =>
  "S/ " +
  Number(n || 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

function value(id, fallback = "") {
  const element = $(id);
  return element ? element.value : fallback;
}

function setText(id, text) {
  const element = $(id);
  if (element) {
    element.textContent = text;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showMessage(text) {
  const element = $("authMsg");

  if (element) {
    element.textContent = text;
  } else {
    console.log(text);
  }
}

/* =========================
   NAVEGACIÓN
========================= */

function view(id) {
  const views = [
    "login",
    "dashboard",
    "new",
    "orders",
    "settings"
  ];

  views.forEach(x => {
    const element = $(x);

    if (element) {
      element.classList.toggle("hidden", x !== id);
    }
  });

  if (id === "orders") {
    loadOrders();
  }

  if (id === "dashboard") {
    loadOrders();
  }
}

/* =========================
   CÁLCULO DE VENTA
========================= */

function calc() {
  const q = Number(value("cantidad", 0)) || 0;
  const p = Number(value("precio", 0)) || 0;

  // Movilidad cliente SÍ se suma
  const mc = Number(value("movc", 0)) || 0;

  // Movilidad tienda SOLO informativa
  const mt = Number(value("movt", 0)) || 0;

  const adelanto = Number(value("adelanto", 0)) || 0;

  /*
    TOTAL:
    Cantidad x Precio + Movilidad Cliente

    Movilidad tienda NO se suma.
  */
  const total = q * p + mc;

  const saldo = Math.max(0, total - adelanto);

  setText("total", money(total));
  setText("saldo", money(saldo));
}

/* =========================
   AUTENTICACIÓN
========================= */

async function login() {
  if (!db) {
    showMessage("Primero configura Supabase en app.js.");
    return;
  }

  const email = value("email").trim();
  const password = value("password");

  if (!email || !password) {
    showMessage("Ingresa tu correo y contraseña.");
    return;
  }

  const { error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage(error.message);
    return;
  }

  showMessage("Acceso correcto.");

  await start();

  view("dashboard");
}

async function signup() {
  if (!db) {
    showMessage("Primero configura Supabase en app.js.");
    return;
  }

  const email = value("email").trim();
  const password = value("password");

  if (!email || !password) {
    showMessage("Ingresa correo y contraseña.");
    return;
  }

  const { error } = await db.auth.signUp({
    email,
    password
  });

  if (error) {
    showMessage(error.message);
    return;
  }

  showMessage(
    "Usuario creado. Revisa tu correo si se solicita confirmación."
  );
}

async function start() {
  if (!db) {
    setText("session", "☁️ Supabase no configurado");
    return;
  }

  const {
    data: { session },
    error
  } = await db.auth.getSession();

  if (error) {
    console.error("Error obteniendo sesión:", error);
    return;
  }

  if (!session) {
    setText("session", "Sin sesión");
    view("login");
    return;
  }

  const email = session.user.email || "";

  setText("session", email);

  /*
    Si existe vendedor_nombre en el HTML,
    mostramos automáticamente el correo del usuario.
  */
  const vendedorNombre = $("vendedor_nombre");

  if (vendedorNombre && !vendedorNombre.value) {
    vendedorNombre.value = email;
  }

  view("dashboard");

  await loadOrders();
}

/* =========================
   PEDIDOS
========================= */

async function loadOrders() {
  if (!db) {
    return;
  }

  const {
    data,
    error
  } = await db
    .from("orders")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    console.error("Error cargando pedidos:", error);
    return;
  }

  orders = data || [];

  updateDash();
  render();
}

/* =========================
   DASHBOARD
========================= */

function updateDash() {
  const totalVentas = orders.reduce(
    (s, o) => s + Number(o.total || 0),
    0
  );

  const totalAdelantos = orders.reduce(
    (s, o) => s + Number(o.adelanto || 0),
    0
  );

  const totalSaldos = orders.reduce(
    (s, o) => s + Number(o.saldo || 0),
    0
  );

  setText("n", orders.length);
  setText("sales", money(totalVentas));
  setText("adv", money(totalAdelantos));
  setText("bal", money(totalSaldos));
}

/* =========================
   TABLA DE PEDIDOS
========================= */

function render() {
  const rows = $("rows");

  if (!rows) {
    return;
  }

  const search = (
    value("search") || ""
  ).toLowerCase().trim();

  const filteredOrders = orders.filter(o => {
    const texto = [
      o.id,
      o.cliente,
      o.doc,
      o.telefono,
      o.producto,
      o.estado,
      o.vendedor_nombre
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return texto.includes(search);
  });

  rows.innerHTML = filteredOrders
    .map(o => {
      const id = escapeHtml(o.id);
      const fecha = o.created_at
        ? new Date(o.created_at).toLocaleString("es-PE")
        : "-";

      return `
        <tr>
          <td>${id}</td>

          <td>
            ${escapeHtml(fecha)}
          </td>

          <td>
            ${escapeHtml(o.cliente || "-")}
          </td>

          <td>
            ${escapeHtml(o.producto || "-")}
          </td>

          <td>
            ${money(o.total)}
          </td>

          <td>
            ${money(o.adelanto)}
          </td>

          <td>
            ${money(o.saldo)}
          </td>

          <td>
            <span class="badge">
              ${escapeHtml(o.estado || "-")}
            </span>
          </td>

          <td>
            <button
              class="btn light"
              type="button"
              onclick="wa('${String(o.id).replace(/'/g, "\\'")}')"
            >
              WhatsApp
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

/* =========================
   CREAR PEDIDO
========================= */

async function saveOrder(event) {
  event.preventDefault();

  if (!db) {
    alert("Configura Supabase primero.");
    return;
  }

  try {
    /*
      DATOS DEL PEDIDO
    */

    const q = Number(value("cantidad", 1)) || 1;
    const p = Number(value("precio", 0)) || 0;

    // Movilidad cliente SÍ suma
    const mc = Number(value("movc", 0)) || 0;

    // Movilidad tienda NO suma
    const mt = Number(value("movt", 0)) || 0;

    const adelanto = Number(value("adelanto", 0)) || 0;

    /*
      CÁLCULO

      Total = cantidad x precio + movilidad cliente

      Movilidad tienda es únicamente informativa.
    */

    const total = q * p + mc;

    const saldo = Math.max(
      0,
      total - adelanto
    );

    /*
      USUARIO ACTUAL
    */

    const {
      data: { user },
      error: userError
    } = await db.auth.getUser();

    if (userError) {
      console.error(userError);
      alert("No se pudo obtener el usuario actual.");
      return;
    }

    /*
      NÚMERO DE PEDIDO
    */

    const {
      data: seq,
      error: seqError
    } = await db.rpc("next_order_number");

    if (seqError) {
      console.error(seqError);
      alert(
        "No se pudo generar el número de pedido: " +
        seqError.message
      );
      return;
    }

    const id =
      "JMP-" +
      String(seq || 1).padStart(5, "0");

    /*
      VENDEDOR

      Guardamos:
      - vendedor_id = ID de Supabase
      - vendedor_nombre = correo/nombre visible
    */

    let vendedorNombre =
      value("vendedor_nombre").trim();

    if (!vendedorNombre) {
      vendedorNombre =
        user?.email || "";
    }

    /*
      PAYLOAD
    */

    const payload = {
      id,

      // CLIENTE
      cliente: value("cliente").trim(),
      doc: value("doc").trim(),
      telefono: value("telefono").trim(),

      // ENTREGA
      direccion: value("direccion").trim(),
      mov_cliente: mc,
      mov_tienda: mt,
      responsable_entrega:
        value("responsable_entrega").trim(),

      // PEDIDO
      producto: value("producto").trim(),
      cantidad: q,
      accesorios_regalos:
        value("accesorios_regalos").trim(),

      // VENTA
      precio: p,
      total,
      adelanto,
      saldo,

      // COMPROBANTE
      comprobante:
        value("comprobante").trim(),

      // COMERCIAL
      canal: value("canal").trim(),
      vendedor_id: user?.id || null,
      vendedor_nombre: vendedorNombre,

      // PAGO
      pago: value("pago").trim(),

      // OBSERVACIONES
      observaciones:
        value("obs").trim(),

      // ESTADO
      estado: value("estado").trim()
    };

    /*
      GUARDAR EN SUPABASE
    */

    const {
      error: insertError
    } = await db
      .from("orders")
      .insert(payload);

    if (insertError) {
      console.error(
        "Error guardando pedido:",
        insertError
      );

      alert(
        "No se pudo guardar el pedido:\n\n" +
        insertError.message
      );

      return;
    }

    alert(
      "Pedido " +
      id +
      " guardado correctamente."
    );

    /*
      LIMPIAR FORMULARIO
    */

    event.target.reset();

    if ($("cantidad")) {
      $("cantidad").value = 1;
    }

    /*
      Volver a colocar automáticamente
      el vendedor actual.
    */

    if ($("vendedor_nombre")) {
      $("vendedor_nombre").value =
        vendedorNombre;
    }

    calc();

    /*
      ACTUALIZAR PEDIDOS
    */

    await loadOrders();

    view("orders");

  } catch (error) {
    console.error(
      "Error inesperado:",
      error
    );

    alert(
      "Ocurrió un error inesperado:\n\n" +
      error.message
    );
  }
}

/* =========================
   WHATSAPP
========================= */

function wa(id) {
  const o = orders.find(
    x => String(x.id) === String(id)
  );

  if (!o) {
    alert("No se encontró el pedido.");
    return;
  }

  /*
    VENDEDOR

    Primero intenta usar vendedor_nombre.
    Si no existe, muestra vendedor_id.
  */

  const vendedor =
    o.vendedor_nombre ||
    o.vendedor_id ||
    "-";

  const text = `📋 FORMATO DE PEDIDO / VENTA – GRUPO BLAS

👤 CLIENTE
Nombre: ${o.cliente || "-"}
DNI/RUC: ${o.doc || "-"}
Teléfono: ${o.telefono || "-"}

📍 ENTREGA
Destino: ${o.direccion || "-"}
Mov. cliente: ${money(o.mov_cliente)}
Mov. tienda: ${money(o.mov_tienda)}
Responsable: ${o.responsable_entrega || "-"}

📦 PEDIDO
Producto: ${o.producto || "-"}
Cantidad: ${o.cantidad || 0}
Accesorios/Regalos: ${o.accesorios_regalos || "-"}

💰 VENTA
Precio unitario: ${money(o.precio)}
Total: ${money(o.total)}
Adelanto: ${money(o.adelanto)}
Saldo: ${money(o.saldo)}

🧾 COMPROBANTE
Tipo: ${o.comprobante || "-"}

📲 COMERCIAL
Canal: ${o.canal || "-"}
Vendedor: ${vendedor}

💳 PAGO
Medio de pago: ${o.pago || "-"}

📝 OBSERVACIONES
${o.observaciones || "-"}

🔄 ESTADO
${o.estado || "-"}`;

  const url =
    "https://wa.me/?text=" +
    encodeURIComponent(text);

  window.open(url, "_blank");
}

/*
  Necesario porque el HTML utiliza
  onclick="wa('...')"
*/
window.wa = wa;

/* =========================
   INICIALIZACIÓN
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    /*
      CÁLCULO AUTOMÁTICO
    */

    [
      "cantidad",
      "precio",
      "movc",
      "movt",
      "adelanto"
    ].forEach(id => {

      const element = $(id);

      if (element) {
        element.addEventListener(
          "input",
          calc
        );
      }
    });

    /*
      FORMULARIO
    */

    const form = $("form");

    if (form) {
      form.addEventListener(
        "submit",
        saveOrder
      );
    }

    /*
      BÚSQUEDA
    */

    const search = $("search");

    if (search) {
      search.addEventListener(
        "input",
        render
      );
    }

    /*
      INICIAR APLICACIÓN
    */

    start();

    calc();
  }
);
