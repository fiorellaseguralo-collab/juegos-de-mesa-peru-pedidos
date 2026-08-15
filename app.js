```js
const SUPABASE_URL = "https://uwybwpegcglpruhofvgt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gLS83x3VfiOREA-sn1jojA_TlDIMuUH";

const cloudReady = !SUPABASE_URL.startsWith("PON_AQUI");

const db = cloudReady
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let orders = [];
let currentUser = null;
let currentProfile = null;

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
   CÁLCULO
========================= */

function calc() {
  const q = Number(value("cantidad", 0)) || 0;
  const p = Number(value("precio", 0)) || 0;
  const mc = Number(value("movc", 0)) || 0;
  const adelanto = Number(value("adelanto", 0)) || 0;

  /*
    IMPORTANTE:

    Movilidad cliente SÍ suma.
    Movilidad tienda NO suma.
  */

  const total = q * p + mc;

  const saldo = Math.max(
    0,
    total - adelanto
  );

  setText("total", money(total));
  setText("saldo", money(saldo));
}

/* =========================
   PERFIL DEL USUARIO
========================= */

async function loadProfile(userId) {
  if (!db || !userId) {
    return null;
  }

  const {
    data,
    error
  } = await db
    .from("profiles")
    .select("id, full_name, role, active")
    .eq("id", userId)
    .single();

  if (error) {
    console.error(
      "Error cargando perfil:",
      error
    );

    return null;
  }

  return data;
}

/* =========================
   LOGIN
========================= */

async function login() {
  if (!db) {
    showMessage(
      "Primero configura Supabase en app.js."
    );
    return;
  }

  const email = value("email").trim();
  const password = value("password");

  if (!email || !password) {
    showMessage(
      "Ingresa tu correo y contraseña."
    );
    return;
  }

  const {
    error
  } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage(error.message);
    return;
  }

  showMessage("Acceso correcto.");

  await start();
}

/* =========================
   REGISTRO
========================= */

async function signup() {
  if (!db) {
    showMessage(
      "Primero configura Supabase en app.js."
    );
    return;
  }

  const email = value("email").trim();
  const password = value("password");

  if (!email || !password) {
    showMessage(
      "Ingresa correo y contraseña."
    );
    return;
  }

  const {
    error
  } = await db.auth.signUp({
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

/* =========================
   CERRAR SESIÓN
========================= */

async function logout() {
  if (!db) {
    return;
  }

  const {
    error
  } = await db.auth.signOut();

  if (error) {
    console.error(
      "Error cerrando sesión:",
      error
    );

    return;
  }

  currentUser = null;
  currentProfile = null;
  orders = [];

  setText(
    "session",
    "Sin sesión"
  );

  view("login");
}

/* =========================
   INICIAR APLICACIÓN
========================= */

async function start() {
  if (!db) {
    setText(
      "session",
      "☁️ Supabase no configurado"
    );

    view("login");

    return;
  }

  const {
    data: {
      session
    },
    error
  } = await db.auth.getSession();

  if (error) {
    console.error(
      "Error obteniendo sesión:",
      error
    );

    view("login");

    return;
  }

  if (!session) {
    setText(
      "session",
      "Sin sesión"
    );

    view("login");

    return;
  }

  currentUser = session.user;

  /*
    Cargar perfil desde public.profiles
  */

  currentProfile = await loadProfile(
    currentUser.id
  );

  if (!currentProfile) {
    showMessage(
      "El usuario existe en Authentication, pero no tiene un perfil en public.profiles."
    );

    await db.auth.signOut();

    view("login");

    return;
  }

  /*
    Comprobar usuario activo
  */

  if (!currentProfile.active) {
    showMessage(
      "Este usuario está desactivado."
    );

    await db.auth.signOut();

    view("login");

    return;
  }

  /*
    Mostrar usuario
  */

  setText(
    "session",
    currentProfile.full_name ||
    currentUser.email
  );

  /*
    Mostrar vendedor automáticamente
  */

  const vendedorNombre =
    $("vendedor_nombre");

  if (vendedorNombre) {
    vendedorNombre.value =
      currentProfile.full_name ||
      currentUser.email ||
      "";
  }

  /*
    Guardamos también el rol,
    por si el HTML tiene algún elemento
    para mostrarlo.
  */

  setText(
    "userRole",
    currentProfile.role
  );

  /*
    Entrar al dashboard
  */

  view("dashboard");

  await loadOrders();
}

/* =========================
   PEDIDOS
========================= */

async function loadOrders() {
  if (!db || !currentUser) {
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
    console.error(
      "Error cargando pedidos:",
      error
    );

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
  const totalVentas =
    orders.reduce(
      (s, o) =>
        s + Number(o.total || 0),
      0
    );

  const totalAdelantos =
    orders.reduce(
      (s, o) =>
        s + Number(o.adelanto || 0),
      0
    );

  const totalSaldos =
    orders.reduce(
      (s, o) =>
        s + Number(o.saldo || 0),
      0
    );

  setText(
    "n",
    orders.length
  );

  setText(
    "sales",
    money(totalVentas)
  );

  setText(
    "adv",
    money(totalAdelantos)
  );

  setText(
    "bal",
    money(totalSaldos)
  );
}

/* =========================
   TABLA
========================= */

function render() {
  const rows = $("rows");

  if (!rows) {
    return;
  }

  const search = (
    value("search") || ""
  )
    .toLowerCase()
    .trim();

  const filteredOrders =
    orders.filter(o => {

      const text = [
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

      return text.includes(search);
    });

  rows.innerHTML =
    filteredOrders
      .map(o => {

        const safeId =
          String(o.id || "")
            .replace(
              /'/g,
              "\\'"
            );

        const fecha =
          o.created_at
            ? new Date(
                o.created_at
              ).toLocaleString(
                "es-PE"
              )
            : "-";

        return `
          <tr>

            <td>
              ${escapeHtml(o.id || "-")}
            </td>

            <td>
              ${escapeHtml(fecha)}
            </td>

            <td>
              ${escapeHtml(
                o.cliente || "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                o.producto || "-"
              )}
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
                ${escapeHtml(
                  o.estado || "-"
                )}
              </span>
            </td>

            <td>
              <button
                class="btn light"
                type="button"
                onclick="wa('${safeId}')"
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
   GUARDAR PEDIDO
========================= */

async function saveOrder(event) {
  event.preventDefault();

  if (!db) {
    alert(
      "Configura Supabase primero."
    );

    return;
  }

  if (!currentUser) {
    alert(
      "La sesión no está activa. Inicia sesión nuevamente."
    );

    view("login");

    return;
  }

  if (!currentProfile) {
    alert(
      "No se encontró el perfil del usuario."
    );

    return;
  }

  if (!currentProfile.active) {
    alert(
      "Tu usuario está desactivado."
    );

    return;
  }

  try {

    /* =====================
       DATOS
    ===================== */

    const q =
      Number(
        value("cantidad", 1)
      ) || 1;

    const p =
      Number(
        value("precio", 0)
      ) || 0;

    const mc =
      Number(
        value("movc", 0)
      ) || 0;

    const mt =
      Number(
        value("movt", 0)
      ) || 0;

    const adelanto =
      Number(
        value("adelanto", 0)
      ) || 0;

    /*
      TOTAL

      Cantidad x Precio
      +
      Movilidad cliente

      Movilidad tienda NO suma.
    */

    const total =
      q * p + mc;

    const saldo =
      Math.max(
        0,
        total - adelanto
      );

    /* =====================
       NÚMERO PEDIDO
    ===================== */

    const {
      data: seq,
      error: seqError
    } = await db.rpc(
      "next_order_number"
    );

    if (seqError) {

      console.error(
        "Error generando número:",
        seqError
      );

      alert(
        "No se pudo generar el número de pedido:\n\n" +
        seqError.message
      );

      return;
    }

    const id =
      "JMP-" +
      String(
        seq || 1
      ).padStart(
        5,
        "0"
      );

    /* =====================
       VENDEDOR
    ===================== */

    const vendedorNombre =
      currentProfile.full_name ||
      currentUser.email ||
      "";

    /* =====================
       PAYLOAD
    ===================== */

    const payload = {

      id,

      /* CLIENTE */

      cliente:
        value("cliente").trim(),

      doc:
        value("doc").trim(),

      telefono:
        value("telefono").trim(),

      /* ENTREGA */

      direccion:
        value("direccion").trim(),

      mov_cliente:
        mc,

      mov_tienda:
        mt,

      responsable_entrega:
        value(
          "responsable_entrega"
        ).trim(),

      /* PEDIDO */

      producto:
        value("producto").trim(),

      cantidad:
        q,

      accesorios_regalos:
        value(
          "accesorios_regalos"
        ).trim(),

      /* VENTA */

      precio:
        p,

      total:
        total,

      adelanto:
        adelanto,

      saldo:
        saldo,

      /* COMPROBANTE */

      comprobante:
        value(
          "comprobante"
        ).trim(),

      /* COMERCIAL */

      canal:
        value("canal").trim(),

      vendedor_id:
        currentUser.id,

      vendedor_nombre:
        vendedorNombre,

      /* PAGO */

      pago:
        value("pago").trim(),

      /* OBSERVACIONES */

      observaciones:
        value("obs").trim(),

      /* ESTADO */

      estado:
        value("estado").trim()
    };

    /* =====================
       INSERTAR
    ===================== */

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

    /* =====================
       ÉXITO
    ===================== */

    alert(
      "Pedido " +
      id +
      " guardado correctamente."
    );

    /*
      Limpiar formulario
    */

    event.target.reset();

    if ($("cantidad")) {
      $("cantidad").value = 1;
    }

    /*
      Restaurar vendedor
    */

    if ($("vendedor_nombre")) {
      $("vendedor_nombre").value =
        vendedorNombre;
    }

    calc();

    /*
      Actualizar información
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

  const order =
    orders.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!order) {

    alert(
      "No se encontró el pedido."
    );

    return;
  }

  const vendedor =
    order.vendedor_nombre ||
    "-";

  const text = `📋 FORMATO DE PEDIDO / VENTA – GRUPO BLAS

👤 CLIENTE
Nombre: ${order.cliente || "-"}
DNI/RUC: ${order.doc || "-"}
Teléfono: ${order.telefono || "-"}

📍 ENTREGA
Destino: ${order.direccion || "-"}
Mov. cliente: ${money(order.mov_cliente)}
Mov. tienda: ${money(order.mov_tienda)}
Responsable: ${order.responsable_entrega || "-"}

📦 PEDIDO
Producto: ${order.producto || "-"}
Cantidad: ${order.cantidad || 0}
Accesorios/Regalos: ${order.accesorios_regalos || "-"}

💰 VENTA
Precio unitario: ${money(order.precio)}
Total: ${money(order.total)}
Adelanto: ${money(order.adelanto)}
Saldo: ${money(order.saldo)}

🧾 COMPROBANTE
Tipo: ${order.comprobante || "-"}

📲 COMERCIAL
Canal: ${order.canal || "-"}
Vendedor: ${vendedor}

💳 PAGO
Medio de pago: ${order.pago || "-"}

📝 OBSERVACIONES
${order.observaciones || "-"}

🔄 ESTADO
${order.estado || "-"}`;

  const url =
    "https://wa.me/?text=" +
    encodeURIComponent(text);

  window.open(
    url,
    "_blank"
  );
}

/* =========================
   EXPONER FUNCIONES AL HTML
========================= */

window.login = login;
window.signup = signup;
window.logout = logout;
window.view = view;
window.wa = wa;

/* =========================
   INICIALIZACIÓN
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    /*
      Cálculo automático
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
      Formulario
    */

    const form = $("form");

    if (form) {

      form.addEventListener(
        "submit",
        saveOrder
      );
    }

    /*
      Buscador
    */

    const search =
      $("search");

    if (search) {

      search.addEventListener(
        "input",
        render
      );
    }

    /*
      Iniciar
    */

    start();

    calc();
  }
);
```
