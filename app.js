
const SUPABASE_URL="https://uwybwpegcglpruhofvgt.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_gLS83x3VfiOREA-sn1jojA_TlDIMuUH";
const cloudReady=!SUPABASE_URL.startsWith("PON_AQUI");
const db=cloudReady?supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;
let orders=[];

const $=id=>document.getElementById(id);
const money=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2});

function view(id){
["login","dashboard","new","orders","settings"].forEach(x=>$(x).classList.toggle("hidden",x!==id));
if(id==="orders")loadOrders();
if(id==="dashboard")loadOrders()
}

function calc(){
let q=+$("cantidad").value||0;
let p=+$("precio").value||0;
let mc=+$("movc").value||0;
let mt=+$("movt").value||0;
let a=+$("adelanto").value||0;
let t=q*p+mc+mt;
$("total").textContent=money(t);
$("saldo").textContent=money(Math.max(0,t-a))
}

["cantidad","precio","movc","movt","adelanto"].forEach(x=>$(
x).addEventListener("input",calc));

async function login(){
if(!db)return msg("Primero configura Supabase en app.js.");
let {error}=await db.auth.signInWithPassword({
email:$("email").value,
password:$("password").value
});
msg(error?error.message:"Acceso correcto.");
if(!error){
await start();
view("dashboard")
}
}

async function signup(){
if(!db)return msg("Primero configura Supabase en app.js.");
let {error}=await db.auth.signUp({
email:$("email").value,
password:$("password").value
});
msg(error?error.message:"Usuario creado. Revisa tu correo si se solicita confirmación.")
}

function msg(t){
$("authMsg").textContent=t
}

async function start(){
if(!db)return;
$("session").textContent="☁️ Nube activa";
let {data:{session}}=await db.auth.getSession();
if(session){
$("session").textContent=session.user.email;
view("dashboard");
await loadOrders()
}
}

async function loadOrders(){
if(!db)return;
let {data,error}=await db.from("orders")
.select("*")
.order("created_at",{ascending:false});

if(error){
console.error(error);
return
}

orders=data||[];
updateDash();
render()
}

function updateDash(){
$("n").textContent=orders.length;
$("sales").textContent=money(
orders.reduce((s,o)=>s+Number(o.total||0),0)
);
$("adv").textContent=money(
orders.reduce((s,o)=>s+Number(o.adelanto||0),0)
);
$("bal").textContent=money(
orders.reduce((s,o)=>s+Number(o.saldo||0),0)
)
}

function render(){
let q=($("search")?.value||"").toLowerCase();

let a=orders.filter(o=>
(o.id+" "+o.cliente+" "+o.producto)
.toLowerCase()
.includes(q)
);

$("rows").innerHTML=a.map(o=>`
<tr>
<td>${o.id}</td>
<td>${new Date(o.created_at).toLocaleString("es-PE")}</td>
<td>${o.cliente}</td>
<td>${o.producto}</td>
<td>${money(o.total)}</td>
<td>${money(o.adelanto)}</td>
<td>${money(o.saldo)}</td>
<td><span class="badge">${o.estado}</span></td>
<td>
<button class="btn light" onclick="wa('${o.id}')">
WhatsApp
</button>
</td>
</tr>
`).join("")
}

$("form").addEventListener("submit",async e=>{
e.preventDefault();

if(!db)return alert("Configura Supabase primero.");

let q=+$("cantidad").value||1;
let p=+$("precio").value||0;
let mc=+$("movc").value||0;
let mt=+$("movt").value||0;
let a=+$("adelanto").value||0;

let t=q*p+mc+mt;

let {data:{user}}=await db.auth.getUser();

let {data:seq}=await db.rpc("next_order_number");

let id="JMP-"+String(seq||1).padStart(5,"0");

let payload={
id,
cliente:$("cliente").value,
doc:$("doc").value,
telefono:$("telefono").value,
direccion:$("direccion").value,
producto:$("producto").value,
cantidad:q,
precio:p,
mov_cliente:mc,
mov_tienda:mt,
total:t,
adelanto:a,
saldo:Math.max(0,t-a),
comprobante:$("comprobante").value,
canal:$("canal").value,
pago:$("pago").value,
estado:$("estado").value,
observaciones:$("obs").value,
vendedor_id:user?.id||null
};

let {error}=await db.from("orders").insert(payload);

if(error){
alert(error.message);
}else{
alert("Pedido "+id+" guardado.");
e.target.reset();
$("cantidad").value=1;
calc();
await loadOrders();
view("orders")
}
});

function wa(id){
let o=orders.find(x=>x.id===id);

let text=`PEDIDO ${o.id}
Cliente: ${o.cliente}
Producto: ${o.producto}
Cantidad: ${o.cantidad}
Total: ${money(o.total)}
Adelanto: ${money(o.adelanto)}
Saldo: ${money(o.saldo)}
Estado: ${o.estado}`;

window.open(
"https://wa.me/?text="+encodeURIComponent(text),
"_blank"
)
}

start();
calc();
