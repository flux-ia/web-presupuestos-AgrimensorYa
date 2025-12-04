// app.js (v2)
document.addEventListener("DOMContentLoaded", () => {
  try { bootstrap(); } catch (e) {
    const doc = document.getElementById("doc");
    if (doc) doc.innerHTML = `<div class="text-red-600 p-4">Error inicializando: ${e.message}</div>`;
    console.error(e);
  }
});

function bootstrap() {
  // ===== Utils
  const todayISO = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  };
  const formatDateLong = (iso) => {
    let d;
    if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y,m,dd] = iso.split("-").map(Number);
      d = new Date(y, m-1, dd);
    } else d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("es-AR",{year:"numeric",month:"long",day:"numeric", timeZone:"America/Argentina/Cordoba"});
  };
  const money = (n, c="ARS") => new Intl.NumberFormat("es-AR",{style:"currency",currency:c, maximumFractionDigits:2}).format(isNaN(+n)?0:+n);
  const safeFilename = (s) => String(s||"").replace(/[\\/:*?"<>|]/g,"").trim();
  const removeDiacritics = (s) => String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const upperNoDiacritics = (s) => removeDiacritics(s).toUpperCase();

  // ========== Plantillas ==========
  const TEMPLATES = {
    mensuraPosesion: {
      name: "Mensura de Posesión",
      description:
        "La Mensura de Posesión permite identificar de forma fehaciente qué derechos de propiedad o parte de derechos se ven afectados por la posesión. " +
        "En el plano de mensura de posesión constan la ubicación, las medidas lineales, angulares y de superficie del polígono sobre el cual se ejerce el derecho de posesión en {{lugar}}.",
      alcance: [
        "Investigación completa de títulos, antecedentes registrales y catastrales.",
        "Planificación de la campaña, medición, determinación de ocupación actual y materialización en el lote.",
        "Cálculo y confección del plano de mensura de posesión.",
      ],
    },
    amojonamiento: {
      name: "Amojonamiento",
      description:
        "Materialización de los límites de una parcela con mojones. Compilación de antecedentes cartográficos, catastrales y de títulos para contrastarlos con los hechos existentes a fin de determinar la ubicación correcta de la parcela en {{lugar}}. " +
        "Se entrega plano de amojonamiento con medidas dentro de la manzana.",
      alcance: [
        "Investigación y análisis de antecedentes dominiales y cartográficos.",
        "Planificación de la campaña y medición completa.",
        "Colocación de mojones en vértices.",
        "Confección del plano.",
      ],
    },
    relevamientoTopo: {
      name: "Relevamiento Topográfico",
      description:
        "Relevamiento planialtimétrico con estación total/GNSS, curvas de nivel y entrega de archivo CAD/DWG en {{lugar}}.",
      alcance: [
        "Medición precisa de cotas y desniveles del terreno y calle.",
        "Curvas de nivel y archivo CAD/DWG.",
        "Informe con referencias y tolerancias.",
      ],
    },
    mensuraSubdiv: {
      name: "Mensura y Subdivisión",
      description:
        "División del inmueble en {{lugar}} conforme normativa. Tareas de relevamiento de campo, cálculo, materialización de mojones y confección del plano de mensura y subdivisión.",
      alcance: [
        "Relevamiento de campo.",
        "Materialización de limites con mojones.",
        "Plano de mensura y subdivisión.",
        
      ],
    },
    bep: {
      name: "BEP – Verificación de Estado Parcelario",
      description:
        "Verificación del estado parcelario del inmueble en {{lugar}}: investigación de títulos, relevamiento y análisis comparativo con planos vigentes. Emisión de informe/constancia correspondiente.",
      alcance: [
        "Análisis de antecedentes y normativa.",
        "Relevamiento y verificación de medidas.",
        "Informe/constancia de BEP (tasas no incluidas).",
      ],
    },
    usucapion: {
      name: "Usucapión",
      description:
        "Mensura y documentación técnica de apoyo a la acción judicial de prescripción adquisitiva (usucapión) en {{lugar}}. " +
        "Incluye la mensura de posesión para identificar con precisión los derechos de propiedad afectados (ubicación y medidas lineales, angulares y de superficie del polígono sobre el cual se ejerce el derecho de posesión), " +
        "la confección del plano de mensura correspondiente y gestiones técnicas ante los organismos que correspondan.",
      alcance: [
        "Mensura de posesión: investigación de antecedentes dominiales/catastrales; planificación de campaña y medición en campo; cálculo y confección del plano de mensura.",
      ],
      etapas: [
        {
          titulo: "1) Mensura de Posesión",
          items: [
            "Investigación y análisis de antecedentes dominiales y cartográficos.",
            "Planificación de la campaña y medición completa.",
            "Confección de plano de mensura de posesión.",
          ],
        },
        {
          titulo: "2) Visado en Colegio Profesional",
          items: ["Visado del plano ante el Colegio de Ingenieros."],
        },
        {
          titulo: "3) Presentación Municipal",
          items: [
            "Presentación del plano en el Municipio y visado.",
            "Tasas municipales y presentación: a cargo del comitente.",
          ],
        },
        {
          titulo: "4) Con intervención letrada",
          items: [
            "Presentación del plano en Catastro (al inicio del trámite).",
            "Nota de rogación a cargo del cliente/escribano.",
          ],
        },
      ],
    },
    // "Otro" se arma dinámicamente con el nombre que ingrese el usuario
    otro: {
      name: "Trabajo personalizado",
      description:
        "Servicio profesional de agrimensura en {{lugar}}, según detalle acordado con el comitente.",
      alcance: [],
    },
  };

  // ===== DOM refs
  const byId = (id) => document.getElementById(id);
  const st = {
    empresa: {
      razon: byId("empRazon"), profesional: byId("empProfesional"),
      cuit: byId("empCuit"), dom: byId("empDom"),
      email: byId("empEmail"), tel: byId("empTel"),
      logo: byId("empLogo"), leyenda: byId("empLeyenda"),
    },
    fecha: byId("fecha"), modelo: byId("modelo"), modeloCustom: byId("modeloCustom"), wrapCustom: byId("wrapCustom"),
    comitente: byId("comitente"), telefono: byId("telefono"), email: byId("email"),
    ubicacion: byId("ubicacion"), moneda: byId("moneda"),
    monto: byId("monto"), montoHint: byId("montoHint"),
    plazo: byId("plazo"), validez: byId("validez"), observaciones: byId("observaciones"),
    textoModelo: byId("textoModelo"),
    pago: {
      modoAvance: byId("pagoModoAvance"), modoCuotas: byId("pagoModoCuotas"),
      pagoAvance: byId("pagoAvance"), pagoCuotas: byId("pagoCuotas"),
      hitosContainer: byId("hitosContainer"), btnAddHito: byId("btnAddHito"),
      sumaHitos: byId("sumaHitos"), cuotasCant: byId("cuotasCant"), cuotasInfo: byId("cuotasInfo"),
    },
    visado: { chk: byId("chkVisado"), monto: byId("montoVisado") },
    doc: byId("doc"),
    btnDescargar: byId("btnDescargar"), btnDoc: byId("btnDoc"), btnGuardar: byId("btnGuardar"),
  };

  // ===== Init
  function init() {
    if (!st.fecha.value) st.fecha.value = todayISO();
    // Hitos base
    addHito("Día de medición","");
    addHito("Contra entrega de plano","");
    // Listeners
    st.pago.btnAddHito.addEventListener("click", () => addHito());
    st.pago.modoAvance.addEventListener("change", togglePagoModo);
    st.pago.modoCuotas.addEventListener("change", togglePagoModo);
    st.pago.cuotasCant.addEventListener("input", updatePagoUI);
    st.visado.chk.addEventListener("change", () => { st.visado.monto.disabled = !st.visado.chk.checked; updateAll(); });
    st.visado.monto.addEventListener("input", updateAll);

    const toWatch = [
      st.fecha, st.modelo, st.modeloCustom, st.comitente, st.telefono, st.email, st.ubicacion, st.moneda, st.monto,
      st.plazo, st.validez, st.observaciones, st.empresa.razon, st.empresa.profesional, st.empresa.cuit,
      st.empresa.dom, st.empresa.email, st.empresa.tel, st.empresa.logo, st.empresa.leyenda, st.textoModelo
    ];
    toWatch.forEach((el)=> el && el.addEventListener("input", () => { if (el===st.modelo) toggleCustom(); updateAll(); }));
    st.fecha.addEventListener("change", updateAll);
    st.modelo.addEventListener("change", () => { toggleCustom(); updateAll(); });

    // Acciones
    st.btnDescargar.addEventListener("click", descargarPDF);
    st.btnDoc.addEventListener("click", descargarDOC);
    st.btnGuardar.addEventListener("click", guardarEnHistorial);

    toggleCustom(); updateAll();
  }
  init();

  // ===== Pago / Hitos
  function addHito(desc="", monto="") {
    const row = document.createElement("div");
    row.className = "hito-row grid grid-cols-12 gap-2";
    row.innerHTML = `
      <input class="col-span-7 rounded-xl border p-2" placeholder="Descripción del hito" value="${desc}">
      <input class="col-span-4 rounded-xl border p-2" placeholder="Ej: 250000" type="number" step="0.01" value="${monto}">
      <button type="button" class="col-span-1 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700">✕</button>
    `;
    st.pago.hitosContainer.appendChild(row);
    const [descInput, montoInput, btn] = row.children;
    const onChange = () => updatePagoUI();
    descInput.addEventListener("input", onChange);
    montoInput.addEventListener("input", onChange);
    btn.addEventListener("click", () => { row.remove(); updatePagoUI(); });
  }
   // ===== Helpers de pago / hitos =====
  function getHitos() {
    return Array.from(
      st.pago.hitosContainer.querySelectorAll(".hito-row")
    ).map(r => ({
      d: r.children[0].value.trim(),
      m: parseFloat(String(r.children[1].value).replace(/,/g, ".")) || 0
    })).filter(h => h.d || h.m);
  }

  function sumHitos() {
    return getHitos().reduce((a, h) => a + (h.m || 0), 0);
  }

  function visadoSel() {
    return !!st.visado.chk.checked;
  }

  function visadoMonto() {
    return visadoSel()
      ? (parseFloat(String(st.visado.monto.value).replace(/,/g, ".")) || 0)
      : 0;
  }

  function totalHonor() {
    return (parseFloat(String(st.monto.value).replace(/,/g, ".")) || 0) + visadoMonto();
  }

  function togglePagoModo() {
    const a = st.pago.modoAvance.checked;
    st.pago.pagoAvance.classList.toggle("hidden", !a);
    st.pago.pagoCuotas.classList.toggle("hidden", a);
    updatePagoUI();
  }

  // ===== Render / Preview
  function toggleCustom(){ st.wrapCustom.classList.toggle("hidden", st.modelo.value!=="otro"); }
  function currentTemplate() {
    const k = st.modelo.value;
    const base = (TEMPLATES[k] || TEMPLATES.mensuraPosesion);
    if (k==="otro") { const c = JSON.parse(JSON.stringify(base)); c.name = (st.modeloCustom.value||"Trabajo personalizado").trim(); return c; }
    return base;
  }
  function buildHeader() {
    const razon = st.empresa.razon.value||"";
    const profesional = st.empresa.profesional.value||"";
    const fechaStr = formatDateLong(st.fecha.value);
    return `
      <div class="flex items-start justify-between border-b pb-4 avoid-break">
        <div class="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold border border-amber-300">LOGO</div>
        <div class="flex-1 text-center">
          <div class="text-3xl md:text-4xl font-extrabold tracking-wide" style="color:#F2C94C">${razon.toUpperCase()}</div>
        </div>
        <div class="text-right text-sm">
          ${profesional ? `<div class="italic text-gray-700">${profesional}</div>` : ""}
          <div class="text-gray-600">${fechaStr}</div>
        </div>
      </div>`;
  }
  function updateAll(){
    const base = parseFloat(String(st.monto.value).replace(/,/g,".")) || 0;
    st.montoHint.textContent = `Se mostrará como ${money(base, st.moneda.value)}`;
    updatePagoUI();
  }
  function updatePagoUI(){
    const suma = sumHitos();
    st.pago.sumaHitos.textContent = `Suma de hitos: ${money(suma, st.moneda.value)}`;
    const n = Math.max(2, parseInt(st.pago.cuotasCant.value||"0", 10));
    const total = totalHonor();
    const porCuota = total / n;
    st.pago.cuotasInfo.textContent = `${n} cuotas de ${money(porCuota, st.moneda.value)} (total ${money(total, st.moneda.value)})`;
    renderPreview();
  }

  function renderPreview(){
    try{
      const tpl = currentTemplate();
      const baseMonto = parseFloat(String(st.monto.value).replace(/,/g,".")) || 0;
      const total = totalHonor();
      const view = { nombre: st.comitente.value, lugar: st.ubicacion.value, fechaLarga: formatDateLong(st.fecha.value), montoFormateado: money(baseMonto, st.moneda.value), validez: st.validez.value };
      const desc = (st.textoModelo.value.trim()? st.textoModelo.value : tpl.description);
      const descripcion = Mustache.render(desc, view);
      const leyenda = Mustache.render(st.empresa.leyenda.value||"", { validez: st.validez.value });

      st.doc.classList.remove("flex","items-center","justify-center");
      st.doc.innerHTML = `
        ${buildHeader()}

        <div class="grid grid-cols-2 gap-2 text-sm mb-4 mt-4 avoid-break">
          <div><span class="font-medium">Comitente:</span> ${st.comitente.value||"—"}</div>
          <div><span class="font-medium">Teléfono:</span> ${st.telefono.value||"—"}</div>
          <div><span class="font-medium">N° de Cuenta:</span> ${st.email.value||"—"}</div>
          <div><span class="font-medium">Ubicación:</span> ${st.ubicacion.value||"—"}</div>
        </div>

        <div class="my-4 py-2 border-y border-gray-200 text-center avoid-break">
          <span class="text-xl md:text-2xl font-bold">Presupuesto:</span>
          <span class="text-xl md:text-2xl text-blue-700 underline underline-offset-4">${tpl.name}</span>
        </div>

        <div class="leading-relaxed text-[15px] text-justify">
          <p class="whitespace-pre-wrap">${descripcion}</p>

          ${(tpl.alcance && tpl.alcance.length) ? `
            <div class="mt-3 avoid-break">
              <div class="font-semibold">Alcance</div>
              <ul class="list-disc ml-5 mt-1">
                ${tpl.alcance.map(i=>`<li>${i}</li>`).join("")}
              </ul>
            </div>` : "" }
        </div>

        <div class="mt-6 avoid-break">
          <div class="rounded-xl border border-amber-200">
            <div class="px-4 py-2 bg-amber-50 border-b border-amber-200 font-semibold text-blue-900">Honorarios Profesionales</div>
            <div class="p-4 text-sm space-y-1">
              <div class="flex justify-between py-1"><span>Subtotal (honorarios)</span><span>${money(baseMonto, st.moneda.value)}</span></div>
              ${visadoSel()? `<div class="flex justify-between py-1"><span>Visado colegio de ingenieros</span><span>${money(visadoMonto(), st.moneda.value)}</span></div>` : ""}
              <div class="flex justify-between border-t mt-2 pt-2 font-semibold"><span>TOTAL</span><span>${money(total, st.moneda.value)}</span></div>
            </div>
          </div>
        </div>

        <div class="mt-4 avoid-break">
          <div class="rounded-xl border">
            <div class="px-4 py-2 bg-amber-50 border-b border-amber-200 font-semibold text-blue-900">Forma de pago</div>
            <div class="p-4 text-sm">
              ${st.pago.modoAvance.checked
                ? `<ul class="list-disc ml-5 space-y-1">
                    ${(getHitos().map(h=>`<li>${h.d || "(sin descripción)"} – <b>${money(h.m||0, st.moneda.value)}</b></li>`).join("") || "<li>(Agregar hitos)</li>")}
                  </ul>
                  <div class="text-right mt-2 text-xs text-gray-600">Suma de hitos: ${money(sumHitos(), st.moneda.value)}</div>`
                : (()=>{ const n=Math.max(2,parseInt(st.pago.cuotasCant.value||"0",10)); return `
                    <div>${n} cuotas de <b>${money(total/n, st.moneda.value)}</b> (total ${money(total, st.moneda.value)})</div>` })()
              }
            </div>
          </div>
        </div>

        ${st.observaciones.value.trim()? `<div class="mt-4 text-sm avoid-break"><span class="font-medium">Observaciones:</span> ${st.observaciones.value.trim()}</div>` : ""}

        <div class="mt-6 text-xs text-gray-600 border-t pt-3 avoid-break">${leyenda}</div>
      `;
    } catch(e){ st.doc.innerHTML = `<div class="text-red-600 p-4">Error renderizando: ${e.message}</div>`; console.error(e); }
  }

  // ===== Exportar DOC
  function descargarDOC(){
    try{
      const tpl = currentTemplate();
      const filename = `${safeFilename(st.comitente.value||"Cliente")}, ${upperNoDiacritics(tpl.name)}.doc`;
      const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>${st.doc.innerHTML}</body></html>`;
      const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
      const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }catch(e){ alert("No se pudo generar el DOC."); console.error(e); }
  }

  // ===== Exportar PDF (sin cortes feos)
async function descargarPDF() {
  try {
    // Asegurar que existan las librerías
    if (!window.html2canvas || !window.jspdf) {
      alert("Faltan librerías de PDF.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const tpl = currentTemplate();
    const filename = `${safeFilename(st.comitente.value || "Cliente")}, ${upperNoDiacritics(tpl.name)}.pdf`;

    // Renderizamos el contenido a un canvas
    const canvas = await html2canvas(st.doc, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      windowWidth: st.doc.scrollWidth || 794,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "mm", format: "a4" });

    const pageWidth = pdf.internal.pageSize.getWidth();   // 210 mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (e) {
    alert("No se pudo generar el PDF correctamente.");
    console.error(e);
  }
}


  // ===== Guardar en historial (localStorage)
  function guardarEnHistorial(){
    const tpl = currentTemplate();
    const rec = {
      fecha: st.fecha.value || todayISO(),
      tipo: tpl.name,
      ubicacion: st.ubicacion.value || "",
      monto: parseFloat(String(st.monto.value).replace(/,/g,".")) || 0,
      moneda: st.moneda.value || "ARS",
      comitente: st.comitente.value || ""
    };
    const key = "cotizaciones";
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    arr.push(rec);
    localStorage.setItem(key, JSON.stringify(arr));
    alert("✅ Cotización guardada en historial (Tablero).");
  }
}
