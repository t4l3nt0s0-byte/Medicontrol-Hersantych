const {
  useState,
  useEffect,
  useMemo
} = React;
const KEY = "medicontrol-data-v1";
const GAP_MIN = 30;
const FRECUENCIAS = [4, 6, 8, 12, 24];
const PRESENTACIONES = ["Tabletas", "Cápsulas", "Jarabe / Suspensión", "Gotas", "Inyectable", "Sobres", "Crema / Ungüento", "Inhalador", "Otro"];
const CATEGORIAS = [{
  id: "analgesico",
  label: "Analgésico / Dolor",
  cls: "bg-rose-100 text-rose-700 border-rose-200"
}, {
  id: "antibiotico",
  label: "Antibiótico",
  cls: "bg-sky-100 text-sky-700 border-sky-200"
}, {
  id: "antiinflamatorio",
  label: "Antiinflamatorio",
  cls: "bg-orange-100 text-orange-700 border-orange-200"
}, {
  id: "gastro",
  label: "Gastroprotector / Digestivo",
  cls: "bg-lime-100 text-lime-700 border-lime-200"
}, {
  id: "cardio",
  label: "Cardiovascular / Presión",
  cls: "bg-red-100 text-red-700 border-red-200"
}, {
  id: "diabetes",
  label: "Diabetes / Glucosa",
  cls: "bg-violet-100 text-violet-700 border-violet-200"
}, {
  id: "alergia",
  label: "Antihistamínico / Alergia",
  cls: "bg-teal-100 text-teal-700 border-teal-200"
}, {
  id: "respiratorio",
  label: "Respiratorio",
  cls: "bg-cyan-100 text-cyan-700 border-cyan-200"
}, {
  id: "vitamina",
  label: "Vitamina / Suplemento",
  cls: "bg-amber-100 text-amber-700 border-amber-200"
}, {
  id: "otro",
  label: "Otro",
  cls: "bg-slate-100 text-slate-600 border-slate-200"
}];
const DIAS_SEM = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const pad = n => String(n).padStart(2, "0");
const timeToMin = t => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const minToTime = m => {
  const mm = (m % 1440 + 1440) % 1440;
  return pad(Math.floor(mm / 60)) + ":" + pad(mm % 60);
};
const fmt12 = t => {
  const m = timeToMin(t);
  let h = Math.floor(m / 60);
  const mm = m % 60;
  const suf = h >= 12 ? "p.m." : "a.m.";
  h = h % 12;
  if (h === 0) h = 12;
  return h + ":" + pad(mm) + " " + suf;
};
const todayStr = () => {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
};
const parseDate = s => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const dateToStr = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const addDays = (s, n) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return dateToStr(d);
};
const fmtDate = s => {
  const d = parseDate(s);
  return DIAS_SEM[d.getDay()] + " " + d.getDate() + " " + MESES_CORTO[d.getMonth()];
};
const fmtDateLong = s => {
  const d = parseDate(s);
  return d.getDate() + " de " + MESES[d.getMonth()] + " de " + d.getFullYear();
};
const genSerie = (startMin, freq) => {
  const n = Math.round(24 / freq);
  const arr = [];
  for (let i = 0; i < n; i++) arr.push((startMin + i * freq * 60) % 1440);
  return arr.sort((a, b) => a - b);
};
const circDist = (a, b) => {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
};
const detectarChoques = (serie, ocupados) => {
  const out = [];
  for (const s of serie) for (const o of ocupados) if (circDist(s, o.min) < GAP_MIN) out.push({
    hora: minToTime(s),
    con: o
  });
  return out;
};
const fechaFin = med => addDays(med.startDate, med.durationDays - 1);
const doseKey = (id, fecha, hora) => id + "|" + fecha + "|" + hora;
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const diasTratamiento = med => {
  const out = [];
  for (let i = 0; i < med.durationDays; i++) out.push(addDays(med.startDate, i));
  return out;
};
const catInfo = id => CATEGORIAS.find(c => c.id === id) || CATEGORIAS[CATEGORIAS.length - 1];
const fmtMoney = n => "$" + (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const diasCadTexto = cad => {
  if (!cad) return "—";
  const dias = Math.round((parseDate(cad) - parseDate(todayStr())) / 86400000);
  if (dias < 0) return "VENCIDO hace " + Math.abs(dias) + " días (" + fmtDate(cad) + ")";
  if (dias === 0) return "Vence HOY (" + fmtDate(cad) + ")";
  return "Faltan " + dias + " días (" + fmtDate(cad) + ")";
};
const Sv = ({
  d,
  cls,
  extra
}) => React.createElement("svg", {
  className: cls,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, extra, d && React.createElement("path", {
  d: d
}));
const ICircle = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  extra: React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  })
});
const ICheckCircle = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "m9 12 2 2 4-4",
  extra: React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  })
});
const IChevD = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "m6 9 6 6 6-6"
});
const IChevR = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "m9 18 6-6-6-6"
});
const IPlus = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M12 5v14M5 12h14"
});
const IClock = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M12 6v6l4 2",
  extra: React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  })
});
const IWarn = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
});
const ITrash = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
});
const IPill = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7ZM8.5 8.5l7 7"
});
const IBox = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Zm-18-.27 9 5.15 9-5.15M12 22V12"
});
const ICal = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M8 2v4m8-4v4M3 10h18",
  extra: React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "18",
    rx: "2"
  })
});
const IList = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
});
const IChart = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M3 3v16a2 2 0 0 0 2 2h16M18 17V9m-5 8V5M8 17v-3"
});
const ISteth = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4",
  extra: React.createElement("circle", {
    cx: "20",
    cy: "10",
    r: "2"
  })
});
const IPause = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M10 15V9m4 6V9",
  extra: React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  })
});
const IRotate = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8m0-5v5h5"
});
const ISun = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  extra: React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "4"
  })
});
const IMoon = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
});
const ICheckCheck = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M18 6 7 17l-5-5m20-2-7.5 7.5L13 16"
});
const IBarcode = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14"
});
const ICamera = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z",
  extra: React.createElement("circle", {
    cx: "12",
    cy: "13",
    r: "3"
  })
});
const ISearch = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "m21 21-4.3-4.3",
  extra: React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  })
});
const IMinus = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M5 12h14"
});
const IActivity = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M22 12h-4l-3 9L9 3l-3 9H2"
});
const IDrop = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M12 2.7 6.3 8.4a8 8 0 1 0 11.4 0L12 2.7Z"
});
const IScale = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M12 3v3m-6.5 2 2 5a3 3 0 0 1-4 0l2-5Zm13 0 2 5a3 3 0 0 1-4 0l2-5ZM7 21h10M12 6l-6.5 2M12 6l6.5 2M12 6v15"
});
const ILung = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M12 4v8m0-4c0 4-2 6-5 8-2 1.3-4 .7-4-2 0-4 2-9 5-9 2 0 3 1 4 3Zm0 0c0 4 2 6 5 8 2 1.3 4 .7 4-2 0-4-2-9-5-9-2 0-3 1-4 3Z"
});
const IX = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M18 6 6 18M6 6l12 12"
});
const IEdit = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z"
});
const IUser = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",
  extra: React.createElement("circle", {
    cx: "12",
    cy: "7",
    r: "4"
  })
});
const IDownload = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
});
const IUpload = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
});
const IFood = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"
});
const ILeaf = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"
});
const IChevron = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "m6 9 6 6 6-6"
});
const IThermo = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M14 4a2 2 0 1 0-4 0v10.54a4 4 0 1 0 4 0V4Z M12 9v6"
});
const IHeart = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z"
});
const IWind = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M9.6 4.6A2 2 0 1 1 11 8H2m10.6 11.4A2 2 0 1 0 14 16H2m15.7-8.3A2.5 2.5 0 1 1 19.5 12H2"
});
const ITape = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M21.3 8.7 15.3 2.7a1 1 0 0 0-1.4 0L2.7 13.9a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0l11.2-11.2a1 1 0 0 0 0-1.4ZM7.5 10.5l2 2m1-5 2 2m1-5 2 2"
});
const IZap = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M13 2 3 14h7l-1 8 10-12h-7l1-8Z"
});
const IFlame = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M12 22c4.4 0 7-2.9 7-6.6 0-2.8-1.7-4.8-3.2-6.7C14.5 7 13.5 5.2 13.5 3c-3.2 1.9-4.4 5-4.3 7.2C8 9.4 7.4 8.4 7.3 7 5.8 8.9 5 11.2 5 13.4 5 18 7.6 22 12 22Z"
});
const IBeaker = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M9 2h6M10 2v6.3L4.7 17A3.5 3.5 0 0 0 7.8 22h8.4a3.5 3.5 0 0 0 3.1-5L14 8.3V2M7 16h10"
});
const IToilet = ({
  cls
}) => React.createElement(Sv, {
  cls: cls,
  d: "M7 3h8a1 1 0 0 1 1 1v7H6V4a1 1 0 0 1 1-1ZM4 11h16a8 8 0 0 1-8 8v0a8 8 0 0 1-8-8ZM12 19v3M8 22h8"
});
const DIAS_FULL = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
function MediControl() {
  const [data, setData] = useState({
    meds: [],
    taken: {},
    inv: [],
    vitals: {
      readings: [],
      horarios: null
    },
    perfil: {},
    catalogo: {},
    comidas: [],
    agua: {}
  });
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("hoy");
  const [expanded, setExpanded] = useState(null);
  const [openDay, setOpenDay] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState(null);
  const [editId, setEditId] = useState(null);
  const now = new Date();
  const hoy = todayStr();
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v) {
        const p = JSON.parse(v);
        setData({
          meds: p.meds || [],
          taken: p.taken || {},
          inv: p.inv || [],
          vitals: p.vitals || {
            readings: [],
            horarios: null
          },
          perfil: p.perfil || {},
          catalogo: p.catalogo || {},
          comidas: p.comidas || [],
          agua: p.agua || {},
          ultimoRespaldo: p.ultimoRespaldo || null
        });
      }
    } catch (e) {}
    setLoaded(true);
  }, []);
  const persist = next => {
    setData(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {
      console.error("No se pudo guardar", e);
    }
  };
  const avisar = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };
  const toggleToma = (id, fecha, hora) => {
    const k = doseKey(id, fecha, hora);
    const taken = {
      ...data.taken
    };
    if (taken[k]) delete taken[k];else taken[k] = new Date().toISOString();
    persist({
      ...data,
      taken
    });
  };
  const cambiarEstado = (id, status) => {
    persist({
      ...data,
      meds: data.meds.map(m => m.id === id ? {
        ...m,
        status
      } : m)
    });
    avisar(status === "activo" ? "Tratamiento reactivado" : status === "terminado" ? "Tratamiento marcado como terminado" : "Tratamiento suspendido");
  };
  const eliminarMed = id => {
    const taken = {};
    for (const k of Object.keys(data.taken)) if (!k.startsWith(id + "|")) taken[k] = data.taken[k];
    persist({
      ...data,
      meds: data.meds.filter(m => m.id !== id),
      taken
    });
    setConfirmDel(null);
    avisar("Medicamento eliminado");
  };
  const guardarMed = med => {
    const existe = data.meds.some(m => m.id === med.id);
    persist({
      ...data,
      meds: existe ? data.meds.map(m => m.id === med.id ? med : m) : [...data.meds, med]
    });
    setEditId(null);
    setTab("meds");
    setExpanded(med.id);
    avisar(existe ? "Medicamento actualizado" : "Medicamento agregado al historial");
  };
  const editarMed = id => {
    setEditId(id);
    setTab("agregar");
  };
  const ocupados = useMemo(() => {
    const out = [];
    for (const m of data.meds) {
      if (m.status !== "activo" || m.id === editId) continue;
      for (const t of m.times) out.push({
        min: timeToMin(t),
        med: m.name
      });
    }
    return out;
  }, [data.meds, editId]);
  const tomasHoy = useMemo(() => {
    const out = [];
    for (const m of data.meds) {
      if (m.status !== "activo") continue;
      if (hoy < m.startDate || hoy > fechaFin(m)) continue;
      for (const t of m.times) out.push({
        med: m,
        hora: t,
        done: !!data.taken[doseKey(m.id, hoy, t)]
      });
    }
    return out.sort((a, b) => timeToMin(a.hora) - timeToMin(b.hora));
  }, [data, hoy]);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (!loaded) return React.createElement("div", {
    className: "min-h-screen flex items-center justify-center text-slate-500"
  }, React.createElement(IPill, {
    cls: "w-6 h-6 mr-2 animate-pulse"
  }), " Cargando tu historial\u2026");
  const activos = data.meds.filter(m => m.status === "activo");
  const inactivos = data.meds.filter(m => m.status !== "activo");
  const tabs = [{
    id: "hoy",
    label: "Hoy",
    Icon: IClock
  }, {
    id: "meds",
    label: "Medicamentos",
    Icon: IList
  }, {
    id: "agregar",
    label: "Agregar",
    Icon: IPlus
  }, {
    id: "inv",
    label: "Inventario",
    Icon: IBox
  }, {
    id: "salud",
    label: "Salud",
    Icon: IActivity
  }, {
    id: "comidas",
    label: "Comidas",
    Icon: IFood
  }, {
    id: "saludable",
    label: "Saludable",
    Icon: ILeaf
  }, {
    id: "bienestar",
    label: "Bienestar",
    Icon: IHeart
  }, {
    id: "reporte",
    label: "Reporte",
    Icon: IChart
  }];
  return React.createElement("div", {
    className: "min-h-screen text-slate-800"
  }, React.createElement("header", {
    className: "bg-emerald-800 text-white"
  }, React.createElement("div", {
    className: "max-w-3xl mx-auto px-4 py-5"
  }, React.createElement("div", {
    className: "flex items-center gap-3"
  }, React.createElement("div", {
    className: "bg-emerald-700 rounded-xl p-2"
  }, React.createElement(ISteth, {
    cls: "w-6 h-6"
  })), React.createElement("div", null, React.createElement("h1", {
    className: "text-xl font-bold tracking-tight"
  }, "MediControl"), React.createElement("p", {
    className: "text-emerald-200 text-sm"
  }, data.perfil && data.perfil.nombre ? data.perfil.nombre + " · " : "", "Control personal de medicamentos \xB7 ", fmtDateLong(hoy))))), React.createElement("div", {
    className: "max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto"
  }, tabs.map(t => React.createElement("button", {
    key: t.id,
    onClick: () => setTab(t.id),
    className: "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors " + (tab === t.id ? "bg-slate-50 text-emerald-800" : "text-emerald-100 hover:bg-emerald-700")
  }, React.createElement(t.Icon, {
    cls: "w-4 h-4"
  }), " ", t.label)))), React.createElement("main", {
    className: "max-w-3xl mx-auto px-4 py-6 pb-24"
  }, tab === "hoy" && React.createElement("div", null, React.createElement(ResumenHoy, {
    tomas: tomasHoy
  }), tomasHoy.length === 0 ? React.createElement(VacioCard, {
    titulo: "Sin tomas programadas para hoy",
    texto: "Agrega un medicamento con su horario y aqu\xED aparecer\xE1n las tomas del d\xEDa para que las confirmes.",
    accion: () => setTab("agregar"),
    accionLabel: "Agregar medicamento"
  }) : React.createElement("div", {
    className: "space-y-2 mt-4"
  }, tomasHoy.map((t, i) => {
    const tMin = timeToMin(t.hora);
    const pasada = tMin < nowMin && !t.done;
    const cat = catInfo(t.med.category);
    return React.createElement("button", {
      key: i,
      onClick: () => toggleToma(t.med.id, hoy, t.hora),
      className: "w-full flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all " + (t.done ? "bg-emerald-50 border-emerald-200" : pasada ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200 hover:border-emerald-300")
    }, t.done ? React.createElement(ICheckCircle, {
      cls: "w-7 h-7 text-emerald-600 shrink-0"
    }) : React.createElement(ICircle, {
      cls: "w-7 h-7 shrink-0 " + (pasada ? "text-amber-400" : "text-slate-300")
    }), React.createElement("div", {
      className: "flex-1 min-w-0"
    }, React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, React.createElement("span", {
      className: "font-semibold " + (t.done ? "text-emerald-800" : "")
    }, t.med.name), React.createElement("span", {
      className: "text-xs px-2 py-0.5 rounded-full border " + cat.cls
    }, cat.label)), React.createElement("div", {
      className: "text-sm text-slate-500"
    }, t.med.dose, " \xB7 ", t.med.presentation), pasada && React.createElement("div", {
      className: "text-xs text-amber-700 mt-0.5 flex items-center gap-1"
    }, React.createElement(IWarn, {
      cls: "w-3 h-3"
    }), " Toma pendiente \u2014 la hora ya pas\xF3")), React.createElement("div", {
      className: "text-right shrink-0"
    }, React.createElement("div", {
      className: "font-bold text-lg " + (t.done ? "text-emerald-700" : "text-slate-700")
    }, fmt12(t.hora)), React.createElement("div", {
      className: "text-xs text-slate-400"
    }, t.done ? "tomado ✓" : "clic para confirmar")));
  }))), tab === "meds" && React.createElement("div", null, data.meds.length === 0 && React.createElement(VacioCard, {
    titulo: "A\xFAn no tienes medicamentos registrados",
    texto: "Registra lo que te recet\xF3 el m\xE9dico: nombre, dosis, frecuencia y motivo. La herramienta calcula el horario y las cajas necesarias.",
    accion: () => setTab("agregar"),
    accionLabel: "Agregar el primero"
  }), activos.length > 0 && React.createElement("section", null, React.createElement("h2", {
    className: "text-sm font-bold uppercase tracking-wide text-slate-500 mb-2"
  }, "En tratamiento (", activos.length, ")"), React.createElement("div", {
    className: "space-y-3"
  }, activos.map(m => React.createElement(MedCard, {
    key: m.id,
    med: m,
    data: data,
    hoy: hoy,
    onEditar: editarMed,
    expanded: expanded === m.id,
    onExpand: () => setExpanded(expanded === m.id ? null : m.id),
    openDay: openDay,
    setOpenDay: setOpenDay,
    toggleToma: toggleToma,
    cambiarEstado: cambiarEstado,
    confirmDel: confirmDel,
    setConfirmDel: setConfirmDel,
    eliminarMed: eliminarMed
  })))), inactivos.length > 0 && React.createElement("section", {
    className: "mt-6"
  }, React.createElement("h2", {
    className: "text-sm font-bold uppercase tracking-wide text-slate-500 mb-2"
  }, "Historial \xB7 terminados y suspendidos (", inactivos.length, ")"), React.createElement("div", {
    className: "space-y-3"
  }, inactivos.map(m => React.createElement(MedCard, {
    key: m.id,
    med: m,
    data: data,
    hoy: hoy,
    onEditar: editarMed,
    expanded: expanded === m.id,
    onExpand: () => setExpanded(expanded === m.id ? null : m.id),
    openDay: openDay,
    setOpenDay: setOpenDay,
    toggleToma: toggleToma,
    cambiarEstado: cambiarEstado,
    confirmDel: confirmDel,
    setConfirmDel: setConfirmDel,
    eliminarMed: eliminarMed
  }))))), tab === "agregar" && React.createElement(FormAgregar, {
    ocupados: ocupados,
    onGuardar: guardarMed,
    medEditar: data.meds.find(m => m.id === editId) || null,
    onCancelar: () => {
      setEditId(null);
      setTab("meds");
    }
  }), tab === "inv" && React.createElement(Inventario, {
    data: data,
    persist: persist,
    avisar: avisar
  }), tab === "salud" && React.createElement(Salud, {
    data: data,
    persist: persist,
    avisar: avisar,
    hoy: hoy
  }), tab === "comidas" && React.createElement(Comidas, {
    data: data,
    persist: persist,
    avisar: avisar,
    hoy: hoy
  }), tab === "saludable" && React.createElement(Saludable, {
    avisar: avisar,
    data: data,
    onIrSalud: () => setTab("salud")
  }), tab === "bienestar" && React.createElement(Bienestar, {
    avisar: avisar
  }), tab === "reporte" && React.createElement(React.Fragment, null, React.createElement(Reporte, {
    data: data,
    now: now,
    avisar: avisar
  }), React.createElement(Respaldo, {
    data: data,
    persist: persist,
    avisar: avisar
  }))), React.createElement(Footer, null), toast && React.createElement("div", {
    className: "fixed bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2"
  }, React.createElement(ICheckCheck, {
    cls: "w-4 h-4 text-emerald-400"
  }), " ", toast));
}
function ResumenHoy({
  tomas
}) {
  const total = tomas.length;
  const hechas = tomas.filter(t => t.done).length;
  const pct = total ? Math.round(hechas / total * 100) : 0;
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, React.createElement("div", {
    className: "font-semibold text-slate-700"
  }, "Avance de hoy"), React.createElement("div", {
    className: "text-sm text-slate-500"
  }, hechas, " de ", total, " tomas \xB7 ", pct, "%")), React.createElement("div", {
    className: "h-3 bg-slate-100 rounded-full overflow-hidden"
  }, React.createElement("div", {
    className: "h-full bg-emerald-500 rounded-full transition-all",
    style: {
      width: pct + "%"
    }
  })), total > 0 && hechas === total && React.createElement("div", {
    className: "mt-2 text-sm text-emerald-700 flex items-center gap-1.5"
  }, React.createElement(ICheckCircle, {
    cls: "w-4 h-4"
  }), " \xA1Completaste todas tus tomas de hoy!"));
}
function VacioCard({
  titulo,
  texto,
  accion,
  accionLabel
}) {
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center mt-4"
  }, React.createElement(IPill, {
    cls: "w-10 h-10 text-slate-300 mx-auto mb-3"
  }), React.createElement("div", {
    className: "font-semibold text-slate-600"
  }, titulo), React.createElement("p", {
    className: "text-sm text-slate-500 mt-1 max-w-md mx-auto"
  }, texto), React.createElement("button", {
    onClick: accion,
    className: "mt-4 inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2 rounded-xl"
  }, React.createElement(IPlus, {
    cls: "w-4 h-4"
  }), " ", accionLabel));
}
function MedCard({
  med,
  data,
  hoy,
  onEditar,
  expanded,
  onExpand,
  openDay,
  setOpenDay,
  toggleToma,
  cambiarEstado,
  confirmDel,
  setConfirmDel,
  eliminarMed
}) {
  const cat = catInfo(med.category);
  const fin = fechaFin(med);
  const dias = diasTratamiento(med);
  const tomasPorDia = med.times.length;
  const totalTomas = tomasPorDia * med.durationDays;
  const totalUnidades = totalTomas * (med.unitsPerDose || 1);
  const cajas = med.unitsPerBox ? Math.ceil(totalUnidades / med.unitsPerBox) : null;
  const tomadas = dias.reduce((acc, f) => acc + med.times.filter(t => data.taken[doseKey(med.id, f, t)]).length, 0);
  const pct = totalTomas ? Math.round(tomadas / totalTomas * 100) : 0;
  const terminadoPorFecha = hoy > fin;
  const estadoBadge = med.status === "activo" ? terminadoPorFecha ? React.createElement("span", {
    className: "text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200"
  }, "fechas cumplidas") : React.createElement("span", {
    className: "text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200"
  }, "activo") : med.status === "terminado" ? React.createElement("span", {
    className: "text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
  }, "terminado") : React.createElement("span", {
    className: "text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200"
  }, "suspendido");
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 " + (med.status === "activo" ? "" : "opacity-80")
  }, React.createElement("button", {
    onClick: onExpand,
    className: "w-full text-left p-4 flex items-start gap-3"
  }, React.createElement("div", {
    className: "rounded-xl p-2 border shrink-0 " + cat.cls
  }, React.createElement(IPill, {
    cls: "w-5 h-5"
  })), React.createElement("div", {
    className: "flex-1 min-w-0"
  }, React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, React.createElement("span", {
    className: "font-bold text-slate-800"
  }, med.name), React.createElement("span", {
    className: "text-xs px-2 py-0.5 rounded-full border " + cat.cls
  }, cat.label), estadoBadge), React.createElement("div", {
    className: "text-sm text-slate-500 mt-0.5"
  }, med.dose, " \xB7 ", med.presentation, " \xB7 cada ", med.freqHours, " h (", tomasPorDia, " ", tomasPorDia === 1 ? "toma" : "tomas", "/d\xEDa)"), med.purpose && React.createElement("div", {
    className: "text-sm text-slate-600 mt-1"
  }, React.createElement("span", {
    className: "font-medium text-slate-500"
  }, "Para:"), " ", med.purpose), React.createElement("div", {
    className: "flex items-center gap-2 mt-2"
  }, React.createElement("div", {
    className: "h-2 flex-1 bg-slate-100 rounded-full overflow-hidden"
  }, React.createElement("div", {
    className: "h-full bg-emerald-500 rounded-full",
    style: {
      width: pct + "%"
    }
  })), React.createElement("span", {
    className: "text-xs text-slate-500 shrink-0"
  }, tomadas, "/", totalTomas, " tomas \xB7 ", pct, "%"))), expanded ? React.createElement(IChevD, {
    cls: "w-5 h-5 text-slate-400 shrink-0 mt-1"
  }) : React.createElement(IChevR, {
    cls: "w-5 h-5 text-slate-400 shrink-0 mt-1"
  })), expanded && React.createElement("div", {
    className: "border-t border-slate-100 p-4 space-y-4"
  }, React.createElement("div", {
    className: "grid grid-cols-2 gap-3 text-sm"
  }, React.createElement(Dato, {
    Icon: ICal,
    label: "Inicio",
    valor: fmtDate(med.startDate)
  }), React.createElement(Dato, {
    Icon: ICal,
    label: "Fin del tratamiento",
    valor: fmtDate(fin)
  }), React.createElement(Dato, {
    Icon: IClock,
    label: "Duraci\xF3n",
    valor: med.durationDays + " días · " + totalTomas + " tomas totales"
  }), React.createElement(Dato, {
    Icon: IBox,
    label: "Cantidad necesaria",
    valor: cajas ? cajas + (cajas === 1 ? " caja/frasco" : " cajas/frascos") + " (" + totalUnidades + " unid.)" : totalUnidades + " unidades en total"
  })), React.createElement("div", null, React.createElement("div", {
    className: "text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5"
  }, "Horario diario"), React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, med.times.map(t => {
    const m = timeToMin(t);
    const nocturna = m < 360 || m >= 1290;
    return React.createElement("span", {
      key: t,
      className: "inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium px-3 py-1 rounded-full"
    }, nocturna ? React.createElement(IMoon, {
      cls: "w-3.5 h-3.5"
    }) : React.createElement(ISun, {
      cls: "w-3.5 h-3.5"
    }), " ", fmt12(t));
  }))), med.notes && React.createElement("div", {
    className: "bg-sky-50 border border-sky-100 rounded-xl p-3 text-sm text-sky-900"
  }, React.createElement("div", {
    className: "font-semibold flex items-center gap-1.5 mb-0.5"
  }, React.createElement(ISteth, {
    cls: "w-4 h-4"
  }), " Indicaciones del m\xE9dico"), med.notes), med.doctor && React.createElement("div", {
    className: "text-xs text-slate-500"
  }, "Recetado por: ", med.doctor), React.createElement("div", null, React.createElement("div", {
    className: "text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5"
  }, "Calendario del tratamiento \xB7 marca cada toma"), React.createElement("div", {
    className: "max-h-72 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100"
  }, dias.map((f, idx) => {
    const done = med.times.filter(t => data.taken[doseKey(med.id, f, t)]).length;
    const esHoy = f === hoy;
    const abierto = openDay === med.id + "|" + f;
    return React.createElement("div", {
      key: f,
      className: esHoy ? "bg-emerald-50" : "bg-white"
    }, React.createElement("button", {
      onClick: () => setOpenDay(abierto ? null : med.id + "|" + f),
      className: "w-full flex items-center justify-between px-3 py-2 text-sm"
    }, React.createElement("span", {
      className: "flex items-center gap-2"
    }, abierto ? React.createElement(IChevD, {
      cls: "w-4 h-4 text-slate-400"
    }) : React.createElement(IChevR, {
      cls: "w-4 h-4 text-slate-400"
    }), React.createElement("span", {
      className: "font-medium " + (esHoy ? "text-emerald-800" : "text-slate-700")
    }, "D\xEDa ", idx + 1, " \xB7 ", fmtDate(f), " ", esHoy && "· HOY")), React.createElement("span", {
      className: "text-xs px-2 py-0.5 rounded-full " + (done === med.times.length ? "bg-emerald-100 text-emerald-700" : done > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500")
    }, done, "/", med.times.length)), abierto && React.createElement("div", {
      className: "px-9 pb-2.5 flex flex-wrap gap-2"
    }, med.times.map(t => {
      const ok = !!data.taken[doseKey(med.id, f, t)];
      return React.createElement("button", {
        key: t,
        onClick: () => toggleToma(med.id, f, t),
        className: "inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border transition-colors " + (ok ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-300 text-slate-600 hover:border-emerald-400")
      }, ok ? React.createElement(ICheckCircle, {
        cls: "w-4 h-4"
      }) : React.createElement(ICircle, {
        cls: "w-4 h-4"
      }), " ", fmt12(t));
    })));
  }))), React.createElement("div", {
    className: "flex flex-wrap gap-2 pt-1"
  }, React.createElement(BtnSec, {
    onClick: () => onEditar(med.id),
    Icon: IEdit
  }, "Editar"), med.status === "activo" ? React.createElement(React.Fragment, null, React.createElement(BtnSec, {
    onClick: () => cambiarEstado(med.id, "terminado"),
    Icon: ICheckCircle
  }, "Marcar terminado"), React.createElement(BtnSec, {
    onClick: () => cambiarEstado(med.id, "suspendido"),
    Icon: IPause
  }, "Suspender")) : React.createElement(BtnSec, {
    onClick: () => cambiarEstado(med.id, "activo"),
    Icon: IRotate
  }, "Volver a activo"), confirmDel === med.id ? React.createElement("span", {
    className: "inline-flex items-center gap-2 text-sm"
  }, React.createElement("span", {
    className: "text-rose-700"
  }, "\xBFEliminar definitivamente?"), React.createElement("button", {
    onClick: () => eliminarMed(med.id),
    className: "px-3 py-1.5 rounded-lg bg-rose-600 text-white text-sm font-medium"
  }, "S\xED, eliminar"), React.createElement("button", {
    onClick: () => setConfirmDel(null),
    className: "px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm"
  }, "Cancelar")) : React.createElement(BtnSec, {
    onClick: () => setConfirmDel(med.id),
    Icon: ITrash,
    danger: true
  }, "Eliminar"))));
}
function Dato({
  Icon,
  label,
  valor
}) {
  return React.createElement("div", {
    className: "bg-slate-50 rounded-xl p-2.5"
  }, React.createElement("div", {
    className: "text-xs text-slate-500 flex items-center gap-1"
  }, React.createElement(Icon, {
    cls: "w-3.5 h-3.5"
  }), " ", label), React.createElement("div", {
    className: "font-semibold text-slate-700 text-sm mt-0.5"
  }, valor));
}
function BtnSec({
  onClick,
  Icon,
  children,
  danger
}) {
  return React.createElement("button", {
    onClick: onClick,
    className: "inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors " + (danger ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-slate-300 text-slate-600 hover:bg-slate-50")
  }, React.createElement(Icon, {
    cls: "w-4 h-4"
  }), " ", children);
}
function FormAgregar({
  ocupados,
  onGuardar,
  medEditar,
  onCancelar
}) {
  const [f, setF] = useState({
    name: "",
    presentation: PRESENTACIONES[0],
    dose: "",
    category: "analgesico",
    purpose: "",
    notes: "",
    doctor: "",
    freqHours: 8,
    durationDays: 7,
    startDate: todayStr(),
    unitsPerDose: 1,
    unitsPerBox: 10
  });
  const [startTime, setStartTime] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    if (medEditar) {
      setF({
        name: medEditar.name,
        presentation: medEditar.presentation,
        dose: medEditar.dose,
        category: medEditar.category,
        purpose: medEditar.purpose || "",
        notes: medEditar.notes || "",
        doctor: medEditar.doctor || "",
        freqHours: medEditar.freqHours,
        durationDays: medEditar.durationDays,
        startDate: medEditar.startDate,
        unitsPerDose: medEditar.unitsPerDose,
        unitsPerBox: medEditar.unitsPerBox
      });
      setStartTime(timeToMin(medEditar.times[0]));
      setErr(null);
    }
  }, [medEditar]);
  const set = (k, v) => setF(p => ({
    ...p,
    [k]: v
  }));
  const opciones = useMemo(() => {
    const out = [];
    for (let m = 0; m < 1440; m += 30) {
      const serie = genSerie(m, f.freqHours);
      const choques = detectarChoques(serie, ocupados);
      out.push({
        min: m,
        hora: minToTime(m),
        libre: choques.length === 0,
        choques
      });
    }
    return out;
  }, [f.freqHours, ocupados]);
  const serie = startTime !== null ? genSerie(startTime, f.freqHours) : [];
  const choquesSel = startTime !== null ? detectarChoques(serie, ocupados) : [];
  const tomasDia = Math.round(24 / f.freqHours);
  const totalTomas = tomasDia * (Number(f.durationDays) || 0);
  const totalUnid = totalTomas * (Number(f.unitsPerDose) || 1);
  const cajas = Number(f.unitsPerBox) > 0 ? Math.ceil(totalUnid / Number(f.unitsPerBox)) : null;
  const fin = f.startDate && f.durationDays ? addDays(f.startDate, Number(f.durationDays) - 1) : null;
  const sugeridas = useMemo(() => {
    const base = 480;
    return opciones.filter(o => o.libre).slice().sort((a, b) => circDist(a.min, base) - circDist(b.min, base)).slice(0, 4);
  }, [opciones]);
  const guardar = () => {
    if (!f.name.trim()) return setErr("Escribe el nombre del medicamento.");
    if (!f.dose.trim()) return setErr("Escribe la dosis (ej. 500 mg, 1 tableta, 10 ml).");
    if (!f.durationDays || Number(f.durationDays) < 1) return setErr("Indica cuántos días dura el tratamiento.");
    if (startTime === null) return setErr("Selecciona la hora de la primera toma para generar el horario.");
    setErr(null);
    onGuardar({
      id: medEditar ? medEditar.id : uid(),
      name: f.name.trim(),
      presentation: f.presentation,
      dose: f.dose.trim(),
      category: f.category,
      purpose: f.purpose.trim(),
      notes: f.notes.trim(),
      doctor: f.doctor.trim(),
      freqHours: Number(f.freqHours),
      durationDays: Number(f.durationDays),
      startDate: f.startDate,
      times: serie.map(minToTime),
      unitsPerDose: Number(f.unitsPerDose) || 1,
      unitsPerBox: Number(f.unitsPerBox) || 0,
      status: medEditar ? medEditar.status : "activo",
      createdAt: medEditar ? medEditar.createdAt : new Date().toISOString()
    });
    setF({
      name: "",
      presentation: PRESENTACIONES[0],
      dose: "",
      category: "analgesico",
      purpose: "",
      notes: "",
      doctor: "",
      freqHours: 8,
      durationDays: 7,
      startDate: todayStr(),
      unitsPerDose: 1,
      unitsPerBox: 10
    });
    setStartTime(null);
  };
  const inputCls = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white";
  const labelCls = "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1";
  return React.createElement("div", {
    className: "space-y-5"
  }, medEditar && React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-2"
  }, React.createElement("span", {
    className: "text-sm text-amber-800 font-semibold flex items-center gap-2"
  }, React.createElement(IEdit, {
    cls: "w-4 h-4"
  }), " Editando: ", medEditar.name), React.createElement("button", {
    onClick: onCancelar,
    className: "text-xs px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-100"
  }, "Cancelar edici\xF3n")), React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
  }, React.createElement("h2", {
    className: "font-bold text-slate-700 flex items-center gap-2"
  }, React.createElement(ISteth, {
    cls: "w-5 h-5 text-emerald-700"
  }), " Datos de la receta"), React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Nombre del medicamento *"), React.createElement("input", {
    className: inputCls,
    placeholder: "Ej. Paracetamol",
    value: f.name,
    onChange: e => set("name", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Dosis *"), React.createElement("input", {
    className: inputCls,
    placeholder: "Ej. 500 mg \xB7 1 tableta \xB7 10 ml",
    value: f.dose,
    onChange: e => set("dose", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Presentaci\xF3n"), React.createElement("select", {
    className: inputCls,
    value: f.presentation,
    onChange: e => set("presentation", e.target.value)
  }, PRESENTACIONES.map(p => React.createElement("option", {
    key: p
  }, p)))), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Tipo / funci\xF3n"), React.createElement("select", {
    className: inputCls,
    value: f.category,
    onChange: e => set("category", e.target.value)
  }, CATEGORIAS.map(c => React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.label))))), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "\xBFPara qu\xE9 te lo recetaron? (motivo)"), React.createElement("input", {
    className: inputCls,
    placeholder: "Ej. Dolor de cabeza y fiebre por infecci\xF3n de garganta",
    value: f.purpose,
    onChange: e => set("purpose", e.target.value)
  })), React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Indicaciones del m\xE9dico"), React.createElement("textarea", {
    className: inputCls,
    rows: 2,
    placeholder: "Ej. Tomar con alimentos, no combinar con alcohol\u2026",
    value: f.notes,
    onChange: e => set("notes", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "M\xE9dico que lo recet\xF3 (opcional)"), React.createElement("input", {
    className: inputCls,
    placeholder: "Ej. Dra. L\xF3pez \u2014 Medicina general",
    value: f.doctor,
    onChange: e => set("doctor", e.target.value)
  })))), React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
  }, React.createElement("h2", {
    className: "font-bold text-slate-700 flex items-center gap-2"
  }, React.createElement(IClock, {
    cls: "w-5 h-5 text-emerald-700"
  }), " Frecuencia y duraci\xF3n"), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "\xBFCada cu\xE1ntas horas?"), React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, FRECUENCIAS.map(h => React.createElement("button", {
    key: h,
    onClick: () => {
      set("freqHours", h);
      setStartTime(null);
    },
    className: "px-4 py-2 rounded-xl text-sm font-semibold border transition-colors " + (f.freqHours === h ? "bg-emerald-700 border-emerald-700 text-white" : "bg-white border-slate-300 text-slate-600 hover:border-emerald-400")
  }, "cada ", h, " h"))), React.createElement("div", {
    className: "text-xs text-slate-500 mt-1"
  }, "= ", tomasDia, " ", tomasDia === 1 ? "toma" : "tomas", " al d\xEDa")), React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "D\xEDas de tratamiento"), React.createElement("input", {
    type: "number",
    min: "1",
    className: inputCls,
    value: f.durationDays,
    onChange: e => set("durationDays", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Fecha de inicio"), React.createElement("input", {
    type: "date",
    className: inputCls,
    value: f.startDate,
    onChange: e => set("startDate", e.target.value)
  }))), fin && React.createElement("div", {
    className: "text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2 flex items-center gap-2"
  }, React.createElement(ICal, {
    cls: "w-4 h-4 text-emerald-700"
  }), React.createElement("span", null, "Del ", React.createElement("b", null, fmtDate(f.startDate)), " al ", React.createElement("b", null, fmtDate(fin)), " \xB7 ", totalTomas, " tomas en total"))), React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
  }, React.createElement("h2", {
    className: "font-bold text-slate-700 flex items-center gap-2"
  }, React.createElement(ISun, {
    cls: "w-5 h-5 text-emerald-700"
  }), " Horario de tomas"), React.createElement("p", {
    className: "text-sm text-slate-500"
  }, "Elige la hora de la ", React.createElement("b", null, "primera toma"), ". El sistema calcula las dem\xE1s y detecta si chocan (menos de ", GAP_MIN, " min) con tus otros medicamentos activos."), sugeridas.length > 0 && React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Sugerencias sin choques"), React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, sugeridas.map(o => React.createElement("button", {
    key: o.min,
    onClick: () => setStartTime(o.min),
    className: "px-3 py-1.5 rounded-full text-sm font-medium border " + (startTime === o.min ? "bg-emerald-700 border-emerald-700 text-white" : "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100")
  }, fmt12(o.hora), " \u2713")))), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Todas las horas (verde = libre \xB7 \xE1mbar = choca con otro medicamento)"), React.createElement("div", {
    className: "grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto pr-1"
  }, opciones.map(o => React.createElement("button", {
    key: o.min,
    onClick: () => setStartTime(o.min),
    title: o.libre ? "Hora libre" : "Choca con: " + [...new Set(o.choques.map(c => c.con.med))].join(", "),
    className: "text-xs px-1 py-1.5 rounded-lg border font-medium transition-colors " + (startTime === o.min ? "bg-emerald-700 border-emerald-700 text-white" : o.libre ? "bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-50" : "bg-amber-50 border-amber-200 text-amber-700")
  }, fmt12(o.hora))))), startTime !== null && React.createElement("div", {
    className: "rounded-xl border p-3 " + (choquesSel.length ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200")
  }, React.createElement("div", {
    className: "text-sm font-semibold mb-1.5 flex items-center gap-1.5"
  }, choquesSel.length ? React.createElement(React.Fragment, null, React.createElement(IWarn, {
    cls: "w-4 h-4 text-amber-600"
  }), " ", React.createElement("span", {
    className: "text-amber-800"
  }, "Horario con choques \u2014 considera moverlo 30 min o m\xE1s")) : React.createElement(React.Fragment, null, React.createElement(ICheckCircle, {
    cls: "w-4 h-4 text-emerald-600"
  }), " ", React.createElement("span", {
    className: "text-emerald-800"
  }, "Horario generado sin choques"))), React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, serie.map(m => React.createElement("span", {
    key: m,
    className: "bg-white border border-slate-200 text-slate-700 text-sm font-semibold px-3 py-1 rounded-full"
  }, fmt12(minToTime(m))))), choquesSel.length > 0 && React.createElement("ul", {
    className: "mt-2 text-xs text-amber-800 space-y-0.5"
  }, choquesSel.map((c, i) => React.createElement("li", {
    key: i
  }, "\u2022 ", fmt12(c.hora), " queda muy cerca de ", c.con.med, " (", fmt12(minToTime(c.con.min)), ")"))))), React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
  }, React.createElement("h2", {
    className: "font-bold text-slate-700 flex items-center gap-2"
  }, React.createElement(IBox, {
    cls: "w-5 h-5 text-emerald-700"
  }), " \xBFCu\xE1nto necesitas comprar?"), React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Unidades por toma"), React.createElement("input", {
    type: "number",
    min: "1",
    step: "0.5",
    className: inputCls,
    value: f.unitsPerDose,
    onChange: e => set("unitsPerDose", e.target.value)
  }), React.createElement("div", {
    className: "text-xs text-slate-400 mt-0.5"
  }, "Ej. 1 tableta, 2 c\xE1psulas, 10 (ml)")), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Contenido por caja / frasco"), React.createElement("input", {
    type: "number",
    min: "0",
    className: inputCls,
    value: f.unitsPerBox,
    onChange: e => set("unitsPerBox", e.target.value)
  }), React.createElement("div", {
    className: "text-xs text-slate-400 mt-0.5"
  }, "Ej. caja con 10 tabletas, frasco de 120 ml"))), React.createElement("div", {
    className: "bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm text-emerald-900"
  }, "Necesitas ", React.createElement("b", null, totalUnid), " unidades en total (", totalTomas, " tomas \xD7 ", f.unitsPerDose || 1, ").", cajas ? React.createElement("span", null, " Compra ", React.createElement("b", null, cajas, " ", cajas === 1 ? "caja/frasco" : "cajas/frascos"), ".") : null)), err && React.createElement("div", {
    className: "bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-3 py-2.5 flex items-center gap-2"
  }, React.createElement(IWarn, {
    cls: "w-4 h-4 shrink-0"
  }), " ", err), React.createElement("button", {
    onClick: guardar,
    className: "w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-base"
  }, React.createElement(IPlus, {
    cls: "w-5 h-5"
  }), " ", medEditar ? "Guardar cambios del medicamento" : "Guardar medicamento en mi historial"));
}
const ENVASES = ["Caja", "Frasco", "Botella", "Blíster", "Tubo", "Sobre", "Otro"];
const UNIDADES = ["tabletas", "cápsulas", "ml", "g", "piezas", "sobres", "dosis"];
const SEED_MEDS = [["Paracetamol 500 mg", "Tabletas", "Caja", 20, "tabletas"], ["Paracetamol 750 mg", "Tabletas", "Caja", 12, "tabletas"], ["Paracetamol gotas pediátricas 100 mg/ml", "Gotas", "Frasco", 15, "ml"], ["Paracetamol jarabe 160 mg/5 ml", "Jarabe / Suspensión", "Frasco", 120, "ml"], ["Ibuprofeno 400 mg", "Tabletas", "Caja", 10, "tabletas"], ["Ibuprofeno 600 mg", "Tabletas", "Caja", 10, "tabletas"], ["Ibuprofeno suspensión 100 mg/5 ml", "Jarabe / Suspensión", "Frasco", 120, "ml"], ["Naproxeno 250 mg", "Tabletas", "Caja", 30, "tabletas"], ["Naproxeno 550 mg", "Tabletas", "Caja", 10, "tabletas"], ["Ácido acetilsalicílico (Aspirina) 500 mg", "Tabletas", "Caja", 40, "tabletas"], ["Aspirina Protect 100 mg", "Tabletas", "Caja", 28, "tabletas"], ["Diclofenaco 100 mg", "Tabletas", "Caja", 20, "tabletas"], ["Diclofenaco gel 1%", "Crema / Ungüento", "Tubo", 60, "g"], ["Ketorolaco 10 mg", "Tabletas", "Caja", 10, "tabletas"], ["Ketorolaco sublingual 30 mg", "Tabletas", "Caja", 4, "tabletas"], ["Metamizol sódico 500 mg", "Tabletas", "Caja", 10, "tabletas"], ["Tramadol/Paracetamol 37.5/325 mg", "Tabletas", "Caja", 20, "tabletas"], ["Clonixinato de lisina 125 mg", "Tabletas", "Caja", 20, "tabletas"], ["Ácido mefenámico 500 mg", "Tabletas", "Caja", 20, "tabletas"], ["Meloxicam 15 mg", "Tabletas", "Caja", 10, "tabletas"], ["Piroxicam 20 mg", "Cápsulas", "Caja", 20, "cápsulas"], ["Celecoxib 200 mg", "Cápsulas", "Caja", 10, "cápsulas"], ["Colchicina 1 mg", "Tabletas", "Caja", 30, "tabletas"], ["Butilhioscina (Buscapina) 10 mg", "Tabletas", "Caja", 10, "tabletas"], ["Butilhioscina compuesta 10/250 mg", "Tabletas", "Caja", 10, "tabletas"], ["Loratadina 10 mg", "Tabletas", "Caja", 10, "tabletas"], ["Loratadina jarabe 5 mg/5 ml", "Jarabe / Suspensión", "Frasco", 60, "ml"], ["Loratadina/Betametasona 5/0.25 mg", "Tabletas", "Caja", 6, "tabletas"], ["Cetirizina 10 mg", "Tabletas", "Caja", 10, "tabletas"], ["Levocetirizina 5 mg", "Tabletas", "Caja", 10, "tabletas"], ["Fexofenadina 120 mg", "Tabletas", "Caja", 10, "tabletas"], ["Desloratadina 5 mg", "Tabletas", "Caja", 10, "tabletas"], ["Clorfenamina 4 mg", "Tabletas", "Caja", 20, "tabletas"], ["Ambroxol jarabe 30 mg/5 ml", "Jarabe / Suspensión", "Frasco", 120, "ml"], ["Ambroxol/Clenbuterol jarabe", "Jarabe / Suspensión", "Frasco", 120, "ml"], ["Dextrometorfano jarabe 15 mg/5 ml", "Jarabe / Suspensión", "Frasco", 120, "ml"], ["Antigripal (paracetamol/fenilefrina/clorfenamina)", "Tabletas", "Caja", 24, "tabletas"], ["Salbutamol inhalador 100 mcg", "Inhalador", "Caja", 200, "dosis"], ["Salbutamol jarabe 2 mg/5 ml", "Jarabe / Suspensión", "Frasco", 120, "ml"], ["Budesonida inhalador", "Inhalador", "Caja", 200, "dosis"], ["Montelukast 10 mg", "Tabletas", "Caja", 30, "tabletas"], ["Oximetazolina spray nasal 0.05%", "Gotas", "Frasco", 20, "ml"], ["Vick VapoRub", "Crema / Ungüento", "Frasco", 50, "g"], ["Amoxicilina 500 mg", "Cápsulas", "Caja", 12, "cápsulas"], ["Amoxicilina suspensión 250 mg/5 ml", "Jarabe / Suspensión", "Frasco", 75, "ml"], ["Amoxicilina/Ácido clavulánico 875/125 mg", "Tabletas", "Caja", 14, "tabletas"], ["Ampicilina 500 mg", "Cápsulas", "Caja", 20, "cápsulas"], ["Azitromicina 500 mg", "Tabletas", "Caja", 3, "tabletas"], ["Cefalexina 500 mg", "Cápsulas", "Caja", 20, "cápsulas"], ["Ciprofloxacino 500 mg", "Tabletas", "Caja", 14, "tabletas"], ["Levofloxacino 500 mg", "Tabletas", "Caja", 7, "tabletas"], ["Claritromicina 500 mg", "Tabletas", "Caja", 10, "tabletas"], ["Doxiciclina 100 mg", "Cápsulas", "Caja", 10, "cápsulas"], ["Trimetoprim/Sulfametoxazol 80/400 mg", "Tabletas", "Caja", 20, "tabletas"], ["Metronidazol 500 mg", "Tabletas", "Caja", 20, "tabletas"], ["Nitrofurantoína 100 mg", "Cápsulas", "Caja", 40, "cápsulas"], ["Clindamicina 300 mg", "Cápsulas", "Caja", 16, "cápsulas"], ["Fluconazol 150 mg", "Cápsulas", "Caja", 1, "cápsulas"], ["Albendazol 400 mg", "Tabletas", "Caja", 2, "tabletas"], ["Ivermectina 6 mg", "Tabletas", "Caja", 4, "tabletas"], ["Aciclovir 400 mg", "Tabletas", "Caja", 35, "tabletas"], ["Aciclovir crema 5%", "Crema / Ungüento", "Tubo", 5, "g"], ["Omeprazol 20 mg", "Cápsulas", "Caja", 14, "cápsulas"], ["Pantoprazol 40 mg", "Tabletas", "Caja", 14, "tabletas"], ["Esomeprazol 40 mg", "Tabletas", "Caja", 14, "tabletas"], ["Lansoprazol 30 mg", "Cápsulas", "Caja", 14, "cápsulas"], ["Famotidina 40 mg", "Tabletas", "Caja", 10, "tabletas"], ["Sucralfato 1 g", "Tabletas", "Caja", 40, "tabletas"], ["Aluminio/Magnesio suspensión (Melox)", "Jarabe / Suspensión", "Frasco", 360, "ml"], ["Subsalicilato de bismuto (Pepto-Bismol)", "Jarabe / Suspensión", "Frasco", 236, "ml"], ["Loperamida 2 mg", "Tabletas", "Caja", 12, "tabletas"], ["Electrolitos orales (Vida Suero Oral)", "Sobres", "Caja", 4, "sobres"], ["Electrolit bebida", "Otro", "Botella", 625, "ml"], ["Senósidos A-B 8.6 mg", "Tabletas", "Caja", 20, "tabletas"], ["Psyllium plantago (fibra)", "Otro", "Frasco", 340, "g"], ["Simeticona 125 mg", "Cápsulas", "Caja", 10, "cápsulas"], ["Metoclopramida 10 mg", "Tabletas", "Caja", 20, "tabletas"], ["Ondansetrón 8 mg", "Tabletas", "Caja", 10, "tabletas"], ["Trimebutina 200 mg", "Tabletas", "Caja", 20, "tabletas"], ["Cinitaprida 1 mg", "Tabletas", "Caja", 25, "tabletas"], ["Domperidona 10 mg", "Tabletas", "Caja", 30, "tabletas"], ["Metformina 500 mg", "Tabletas", "Caja", 30, "tabletas"], ["Metformina 850 mg", "Tabletas", "Caja", 30, "tabletas"], ["Glibenclamida 5 mg", "Tabletas", "Caja", 50, "tabletas"], ["Sitagliptina 100 mg", "Tabletas", "Caja", 28, "tabletas"], ["Linagliptina 5 mg", "Tabletas", "Caja", 30, "tabletas"], ["Empagliflozina 25 mg", "Tabletas", "Caja", 30, "tabletas"], ["Dapagliflozina 10 mg", "Tabletas", "Caja", 28, "tabletas"], ["Insulina glargina (pluma)", "Inyectable", "Caja", 3, "ml"], ["Insulina NPH", "Inyectable", "Frasco", 10, "ml"], ["Losartán 50 mg", "Tabletas", "Caja", 30, "tabletas"], ["Telmisartán 40 mg", "Tabletas", "Caja", 30, "tabletas"], ["Enalapril 10 mg", "Tabletas", "Caja", 30, "tabletas"], ["Captopril 25 mg", "Tabletas", "Caja", 30, "tabletas"], ["Amlodipino 5 mg", "Tabletas", "Caja", 30, "tabletas"], ["Metoprolol 100 mg", "Tabletas", "Caja", 20, "tabletas"], ["Hidroclorotiazida 25 mg", "Tabletas", "Caja", 30, "tabletas"], ["Furosemida 40 mg", "Tabletas", "Caja", 20, "tabletas"], ["Espironolactona 25 mg", "Tabletas", "Caja", 20, "tabletas"], ["Isosorbida 10 mg", "Tabletas", "Caja", 20, "tabletas"], ["Atorvastatina 20 mg", "Tabletas", "Caja", 30, "tabletas"], ["Rosuvastatina 20 mg", "Tabletas", "Caja", 30, "tabletas"], ["Pravastatina 10 mg", "Tabletas", "Caja", 30, "tabletas"], ["Ezetimiba 10 mg", "Tabletas", "Caja", 28, "tabletas"], ["Bezafibrato 200 mg", "Tabletas", "Caja", 30, "tabletas"], ["Clopidogrel 75 mg", "Tabletas", "Caja", 28, "tabletas"], ["Warfarina 5 mg", "Tabletas", "Caja", 25, "tabletas"], ["Pentoxifilina 400 mg", "Tabletas", "Caja", 30, "tabletas"], ["Diosmina/Hesperidina 500 mg", "Tabletas", "Caja", 30, "tabletas"], ["Levotiroxina 100 mcg", "Tabletas", "Caja", 100, "tabletas"], ["Alopurinol 300 mg", "Tabletas", "Caja", 20, "tabletas"], ["Prednisona 5 mg", "Tabletas", "Caja", 20, "tabletas"], ["Prednisona 50 mg", "Tabletas", "Caja", 20, "tabletas"], ["Tamsulosina 0.4 mg", "Cápsulas", "Caja", 20, "cápsulas"], ["Finasterida 5 mg", "Tabletas", "Caja", 30, "tabletas"], ["Sildenafil 100 mg", "Tabletas", "Caja", 4, "tabletas"], ["Anticonceptivo oral 28 días", "Tabletas", "Caja", 28, "tabletas"], ["Levonorgestrel 1.5 mg (emergencia)", "Tabletas", "Caja", 1, "tabletas"], ["Sertralina 50 mg", "Tabletas", "Caja", 14, "tabletas"], ["Fluoxetina 20 mg", "Cápsulas", "Caja", 14, "cápsulas"], ["Escitalopram 10 mg", "Tabletas", "Caja", 28, "tabletas"], ["Amitriptilina 25 mg", "Tabletas", "Caja", 20, "tabletas"], ["Gabapentina 300 mg", "Cápsulas", "Caja", 15, "cápsulas"], ["Pregabalina 75 mg", "Cápsulas", "Caja", 14, "cápsulas"], ["Carbamazepina 200 mg", "Tabletas", "Caja", 20, "tabletas"], ["Melatonina 5 mg", "Tabletas", "Frasco", 60, "tabletas"], ["Complejo B", "Tabletas", "Frasco", 30, "tabletas"], ["Vitamina C 500 mg", "Tabletas", "Frasco", 60, "tabletas"], ["Vitamina D3 4000 UI", "Cápsulas", "Frasco", 30, "cápsulas"], ["Ácido fólico 5 mg", "Tabletas", "Frasco", 90, "tabletas"], ["Multivitamínico", "Tabletas", "Frasco", 60, "tabletas"], ["Calcio + Vitamina D", "Tabletas", "Frasco", 60, "tabletas"], ["Fumarato ferroso 200 mg", "Tabletas", "Caja", 50, "tabletas"], ["Omega 3 1000 mg", "Cápsulas", "Frasco", 60, "cápsulas"], ["Magnesio 500 mg", "Tabletas", "Frasco", 60, "tabletas"], ["Ketoconazol crema 2%", "Crema / Ungüento", "Tubo", 30, "g"], ["Clotrimazol crema 1%", "Crema / Ungüento", "Tubo", 20, "g"], ["Miconazol crema 2%", "Crema / Ungüento", "Tubo", 20, "g"], ["Hidrocortisona crema 1%", "Crema / Ungüento", "Tubo", 30, "g"], ["Mupirocina ungüento 2%", "Crema / Ungüento", "Tubo", 15, "g"], ["Óxido de zinc pasta", "Crema / Ungüento", "Tubo", 60, "g"], ["Cloranfenicol gotas oftálmicas", "Gotas", "Frasco", 15, "ml"], ["Nafazolina gotas oftálmicas", "Gotas", "Frasco", 15, "ml"], ["Lágrimas artificiales", "Gotas", "Frasco", 15, "ml"], ["Neomicina/Polimixina gotas óticas", "Gotas", "Frasco", 10, "ml"], ["Suero fisiológico 0.9%", "Otro", "Botella", 250, "ml"], ["Alcohol etílico 70%", "Otro", "Botella", 500, "ml"], ["Agua oxigenada", "Otro", "Botella", 480, "ml"], ["Yodopovidona solución (Isodine)", "Otro", "Frasco", 120, "ml"]];
const normTxt = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const conLotes = i => {
  if (i.lotes && i.lotes.length) return i.lotes;
  return [{
    id: "L0",
    caducidad: i.caducidad || "",
    cantidad: i.cantidad || 0
  }];
};
const sincLotes = (i, lotes) => {
  const act = lotes.filter(l => Number(l.cantidad) > 0).slice().sort((a, b) => (a.caducidad || "9999-12-31") < (b.caducidad || "9999-12-31") ? -1 : 1);
  return {
    ...i,
    lotes: act,
    cantidad: act.reduce((s, l) => s + Number(l.cantidad), 0),
    caducidad: act[0] ? act[0].caducidad : ""
  };
};
const lotesTexto = (i, hoy0) => {
  const ls = conLotes(i).filter(l => l.cantidad > 0);
  if (!ls.length) return "—";
  return ls.map(l => {
    if (!l.caducidad) return l.cantidad + "x sin fecha";
    const venc = parseDate(l.caducidad) < hoy0;
    return l.cantidad + "x " + fmtDate(l.caducidad) + (venc ? " CADUCADO" : "");
  }).join("  ·  ");
};
function Inventario({
  data,
  persist,
  avisar
}) {
  const inv = data.inv || [];
  const [codigo, setCodigo] = useState("");
  const [busca, setBusca] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [editKey, setEditKey] = useState(null);
  const [sugOpen, setSugOpen] = useState(false);
  const [scanErr, setScanErr] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [loteScan, setLoteScan] = useState(null);
  const [loteFecha, setLoteFecha] = useState("");
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const vacio = {
    code: "",
    name: "",
    presentation: "Tabletas",
    envase: "Caja",
    contenido: 20,
    unidad: "tabletas",
    cantidad: 1,
    caducidad: "",
    notas: "",
    stockMin: 1,
    imagen: "",
    precio: ""
  };
  const catalogo = data.catalogo || {};
  const [catOpen, setCatOpen] = useState(false);
  const [f, setF] = useState(vacio);
  const [err, setErr] = useState(null);
  const set = (k, v) => setF(p => ({
    ...p,
    [k]: v
  }));
  const guardarInv = next => persist({
    ...data,
    inv: next
  });
  const procesarCodigo = code => {
    const c = String(code).trim();
    if (!c) return;
    const item = inv.find(i => i.code === c);
    if (item) {
      setBusca("");
      setLoteScan(item.key);
      setLoteFecha("");
      avisar("Reconocido: " + item.name + " — confirma la caducidad de esta unidad");
      setTimeout(() => {
        const el = document.getElementById("inv-" + item.key);
        if (el) el.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }, 150);
    } else if (catalogo[c]) {
      const cat = catalogo[c];
      setF({
        ...vacio,
        code: c,
        name: cat.name || "",
        presentation: cat.presentation || "Tabletas",
        envase: cat.envase || "Caja",
        contenido: cat.contenido || 1,
        unidad: cat.unidad || "tabletas",
        precio: cat.precio || "",
        imagen: cat.imagen || "",
        stockMin: cat.stockMin || 1
      });
      setEditKey(null);
      setFormOpen(true);
      avisar("Reconocido del catálogo: " + cat.name + " — solo confirma cantidad y caducidad");
    } else {
      setF({
        ...vacio,
        code: c
      });
      setEditKey(null);
      setFormOpen(true);
      avisar("Código nuevo — completa los datos y quedará guardado en tu catálogo");
    }
    setCodigo("");
  };
  const detener = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };
  const escanear = async () => {
    setScanErr(null);
    if (!("BarcodeDetector" in window)) {
      setScanErr("Tu navegador no soporta escaneo con cámara. Escribe el código o usa un lector USB (teclea el código solo en el campo).");
      return;
    }
    try {
      const detector = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"]
      });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment"
        }
      });
      streamRef.current = stream;
      setScanning(true);
      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const loop = async () => {
          if (!streamRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length) {
              procesarCodigo(codes[0].rawValue);
              detener();
              return;
            }
          } catch (e) {}
          requestAnimationFrame(loop);
        };
        loop();
      }, 100);
    } catch (e) {
      setScanErr("No se pudo acceder a la cámara. Verifica los permisos o escribe el código manualmente.");
      detener();
    }
  };
  useEffect(() => () => detener(), []);
  const recibirUnidad = (key, fecha) => {
    const item = inv.find(i => i.key === key);
    if (!item) return;
    const lotes = conLotes(item).map(l => ({
      ...l
    }));
    const ex = lotes.find(l => (l.caducidad || "") === (fecha || ""));
    if (ex) ex.cantidad += 1;else lotes.push({
      id: uid(),
      caducidad: fecha || "",
      cantidad: 1
    });
    const nuevo = sincLotes(item, lotes);
    guardarInv(inv.map(i => i.key === key ? nuevo : i));
    avisar("+1 " + item.envase.toLowerCase() + " de " + item.name + (fecha ? " · caducidad " + fmtDate(fecha) : " · sin fecha") + " · total: " + nuevo.cantidad);
    setLoteScan(null);
    setLoteFecha("");
  };
  const quitarDeLote = (key, loteId) => {
    const item = inv.find(i => i.key === key);
    if (!item) return;
    const lotes = conLotes(item).map(l => l.id === loteId ? {
      ...l,
      cantidad: Math.max(0, l.cantidad - 1)
    } : l);
    const nuevo = sincLotes(item, lotes);
    guardarInv(inv.map(i => i.key === key ? nuevo : i));
    avisar(nuevo.cantidad === 0 ? item.name + " agotado — considera reabastecer" : "Se descontó 1 " + item.envase.toLowerCase() + " de " + item.name);
  };
  const ajustar = (key, delta) => {
    const item = inv.find(i => i.key === key);
    if (!item) return;
    if (delta > 0) {
      setLoteScan(key);
      setLoteFecha("");
      return;
    }
    const lotes = conLotes(item).map(l => ({
      ...l
    }));
    const hoyS = todayStr();
    let obj = lotes.find(l => l.cantidad > 0 && (!l.caducidad || l.caducidad >= hoyS));
    const soloCaducados = !obj;
    if (!obj) obj = lotes.find(l => l.cantidad > 0);
    if (!obj) return;
    obj.cantidad -= 1;
    const nuevo = sincLotes(item, lotes);
    guardarInv(inv.map(i => i.key === key ? nuevo : i));
    avisar(nuevo.cantidad === 0 ? item.name + " agotado — considera reabastecer" : "Se descontó 1 " + item.envase.toLowerCase() + " de " + item.name + (obj.caducidad ? " (lote que caduca " + fmtDate(obj.caducidad) + ")" : "") + (soloCaducados ? " · ⚠️ esa unidad ya estaba CADUCADA, no la consumas" : ""));
  };
  const eliminar = key => {
    guardarInv(inv.filter(i => i.key !== key));
    setConfirmDel(null);
    avisar("Producto eliminado del inventario");
  };
  const editarItem = item => {
    setF({
      code: item.code,
      name: item.name,
      presentation: item.presentation,
      envase: item.envase,
      contenido: item.contenido,
      unidad: item.unidad,
      cantidad: item.cantidad,
      caducidad: item.caducidad || "",
      notas: item.notas || "",
      stockMin: item.stockMin || 1,
      imagen: item.imagen || "",
      precio: item.precio || ""
    });
    setEditKey(item.key);
    setFormOpen(true);
    setErr(null);
  };
  const sugerencias = useMemo(() => {
    const q = normTxt(f.name.trim());
    if (q.length < 2) return [];
    const out = [];
    Object.keys(catalogo).forEach(c => {
      const it = catalogo[c];
      if (normTxt(it.name).includes(q)) out.push({
        origen: "catálogo",
        name: it.name,
        presentation: it.presentation,
        envase: it.envase,
        contenido: it.contenido,
        unidad: it.unidad,
        precio: it.precio,
        imagen: it.imagen
      });
    });
    SEED_MEDS.forEach(([n, p, e, c, u]) => {
      if (normTxt(n).includes(q) && !out.some(o => normTxt(o.name) === normTxt(n))) out.push({
        origen: "base MX",
        name: n,
        presentation: p,
        envase: e,
        contenido: c,
        unidad: u
      });
    });
    return out.slice(0, 8);
  }, [f.name, catalogo]);
  const aplicarSug = s => {
    setF(p => ({
      ...p,
      name: s.name,
      presentation: s.presentation,
      envase: s.envase,
      contenido: s.contenido,
      unidad: s.unidad,
      precio: s.precio !== undefined && s.precio !== "" ? s.precio : p.precio,
      imagen: s.imagen || p.imagen
    }));
    setSugOpen(false);
    avisar("Datos llenados desde " + (s.origen === "catálogo" ? "tu catálogo" : "la base de medicamentos") + " — confirma cantidad, precio y caducidad");
  };
  const guardarForm = () => {
    if (!f.name.trim()) return setErr("Escribe el nombre del medicamento.");
    if (!f.contenido || Number(f.contenido) <= 0) return setErr("Indica el contenido por envase (ej. 20 tabletas, 120 ml).");
    const code = f.code.trim() || "MED-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    if (inv.some(i => i.code === code && i.key !== editKey)) return setErr("Ese código/ID ya existe en otro producto. Usa la captura rápida de arriba para sumar unidades.");
    const base = {
      code,
      name: f.name.trim(),
      presentation: f.presentation,
      envase: f.envase,
      contenido: Number(f.contenido),
      unidad: f.unidad,
      cantidad: Math.max(0, Number(f.cantidad) || 0),
      caducidad: f.caducidad,
      notas: f.notas.trim(),
      stockMin: Math.max(1, Number(f.stockMin) || 1),
      imagen: f.imagen || "",
      precio: Math.max(0, Number(f.precio) || 0)
    };
    const prevItem = editKey ? inv.find(i => i.key === editKey) : null;
    const prevMulti = prevItem ? conLotes(prevItem).filter(l => l.cantidad > 0).length > 1 : false;
    const nextInv = editKey ? inv.map(i => {
      if (i.key !== editKey) return i;
      return prevMulti ? sincLotes({
        ...i,
        ...base
      }, conLotes(i)) : sincLotes({
        ...i,
        ...base
      }, [{
        id: uid(),
        caducidad: f.caducidad || "",
        cantidad: base.cantidad
      }]);
    }) : [...inv, sincLotes({
      key: uid(),
      ...base,
      createdAt: new Date().toISOString()
    }, [{
      id: uid(),
      caducidad: f.caducidad || "",
      cantidad: base.cantidad
    }])];
    const nextCat = {
      ...catalogo,
      [code]: {
        name: base.name,
        presentation: base.presentation,
        envase: base.envase,
        contenido: base.contenido,
        unidad: base.unidad,
        precio: base.precio,
        imagen: base.imagen,
        stockMin: base.stockMin,
        updatedAt: todayStr()
      }
    };
    persist({
      ...data,
      inv: nextInv,
      catalogo: nextCat
    });
    avisar(editKey ? "Producto actualizado (catálogo sincronizado)" : "Agregado al inventario y guardado en tu catálogo");
    setF(vacio);
    setErr(null);
    setFormOpen(false);
    setEditKey(null);
  };
  const estadoCad = cad => {
    if (!cad) return {
      txt: "sin fecha de caducidad",
      cls: "bg-slate-100 text-slate-500 border-slate-200",
      nivel: 0
    };
    const dias = Math.round((parseDate(cad) - parseDate(todayStr())) / 86400000);
    if (dias < 0) return {
      txt: "CADUCADO hace " + Math.abs(dias) + " días",
      cls: "bg-rose-100 text-rose-700 border-rose-200",
      nivel: 2
    };
    if (dias <= 60) return {
      txt: "caduca en " + dias + " días (" + fmtDate(cad) + ")",
      cls: "bg-amber-100 text-amber-700 border-amber-200",
      nivel: 1
    };
    return {
      txt: "vigente · caduca " + fmtDate(cad),
      cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
      nivel: 0
    };
  };
  const subirImagen = e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const S = 96;
        const esc = Math.min(S / img.width, S / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * esc));
        canvas.height = Math.max(1, Math.round(img.height * esc));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        set("imagen", canvas.toDataURL("image/jpeg", 0.72));
        avisar("Imagen cargada y optimizada");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const estadoProducto = i => {
    const partes = [];
    const h0 = parseDate(todayStr());
    const ls = conLotes(i).filter(l => l.cantidad > 0);
    const nCad = ls.filter(l => l.caducidad && parseDate(l.caducidad) < h0).reduce((s, l) => s + l.cantidad, 0);
    const nPor = ls.filter(l => {
      if (!l.caducidad) return false;
      const d = Math.round((parseDate(l.caducidad) - h0) / 86400000);
      return d >= 0 && d <= 60;
    }).reduce((s, l) => s + l.cantidad, 0);
    if (nCad) partes.push(nCad + " CADUCADO" + (nCad > 1 ? "S" : ""));
    if (nPor) partes.push(nPor + " por caducar");
    if (i.cantidad === 0) partes.push("Agotado");else if (i.cantidad <= (i.stockMin || 1)) partes.push("Stock bajo");
    return partes.length ? partes.join(" · ") : "OK";
  };
  const exportarPDF = () => {
    if (!(window.jspdf && window.jspdf.jsPDF)) {
      avisar("No se pudo cargar el generador de PDF. Revisa tu conexión a internet y recarga.");
      return;
    }
    const {
      jsPDF
    } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape"
    });
    const nombre = data.perfil && data.perfil.nombre || "";
    doc.setFontSize(16);
    doc.setTextColor(6, 78, 59);
    doc.text("Inventario de medicamentos", 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text((nombre ? "Paciente: " + nombre + "   ·   " : "") + "Generado: " + fmtDateLong(todayStr()) + "   ·   MediControl", 14, 21);
    const orden = inv.slice().sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, {
      numeric: true
    }));
    const filas = orden.map(i => [i.code, i.name, i.presentation, i.envase + " · " + i.contenido + " " + i.unidad, String(i.cantidad), i.cantidad * i.contenido + " " + i.unidad, i.precio ? fmtMoney(i.precio) : "—", fmtMoney((i.precio || 0) * i.cantidad), lotesTexto(i, parseDate(todayStr())), estadoProducto(i)]);
    doc.autoTable({
      head: [["ID / Código", "Medicamento", "Presentación", "Envase", "Envases", "Total disponible", "Precio c/u", "Valor", "Caducidad", "Estado"]],
      body: filas,
      startY: 26,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [4, 120, 87],
        fontSize: 8
      },
      alternateRowStyles: {
        fillColor: [245, 250, 248]
      },
      didParseCell: d => {
        if (d.section === "body" && d.column.index === 9 && d.cell.raw !== "OK") {
          d.cell.styles.textColor = [190, 18, 60];
          d.cell.styles.fontStyle = "bold";
        }
        if (d.section === "body" && d.column.index === 8 && String(d.cell.raw).indexOf("CADUCADO") >= 0) {
          d.cell.styles.textColor = [190, 18, 60];
          d.cell.styles.fontStyle = "bold";
        }
      }
    });
    const yFin = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 30) + 8;
    doc.setFontSize(11);
    doc.setTextColor(4, 120, 87);
    doc.text("VALOR TOTAL DEL INVENTARIO: " + fmtMoney(valorTotal) + " MXN", 14, yFin);
    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.text("Resumen: " + inv.length + " productos  ·  " + agotados + " agotados  ·  " + stockBajo.length + " con stock bajo  ·  " + porCaducar + " envases por caducar  ·  " + caducados + " envases caducados", 14, yFin + 6);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("Documento informativo generado por MediControl. Ordenado por ID/código ascendente.", 14, yFin + 11);
    doc.save("inventario-medicamentos-" + todayStr() + ".pdf");
    avisar("PDF del inventario descargado");
  };
  const exportarCatalogoPDF = () => {
    if (!(window.jspdf && window.jspdf.jsPDF)) {
      avisar("No se pudo cargar el generador de PDF. Revisa tu conexión a internet y recarga.");
      return;
    }
    const {
      jsPDF
    } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(6, 78, 59);
    doc.text("Catálogo maestro de medicamentos", 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Base de datos de códigos registrados  ·  Generado: " + fmtDateLong(todayStr()) + "  ·  MediControl", 14, 21);
    const codigos = Object.keys(catalogo).sort((a, b) => a.localeCompare(b, undefined, {
      numeric: true
    }));
    doc.autoTable({
      head: [["ID / Código", "Medicamento", "Presentación", "Envase", "Precio", "Últ. actualización"]],
      body: codigos.map(c => {
        const it = catalogo[c];
        return [c, it.name, it.presentation, it.envase + " · " + it.contenido + " " + it.unidad, it.precio ? fmtMoney(it.precio) : "—", it.updatedAt ? fmtDate(it.updatedAt) : "—"];
      }),
      startY: 26,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [4, 120, 87],
        fontSize: 8
      },
      alternateRowStyles: {
        fillColor: [245, 250, 248]
      }
    });
    doc.save("catalogo-medicamentos-" + todayStr() + ".pdf");
    avisar("PDF del catálogo descargado");
  };
  const quitarDelCatalogo = code => {
    const next = {
      ...catalogo
    };
    delete next[code];
    persist({
      ...data,
      catalogo: next
    });
    avisar("Código eliminado del catálogo");
  };
  const filtrados = inv.filter(i => (i.name + " " + i.code).toLowerCase().includes(busca.toLowerCase())).slice().sort((a, b) => (a.caducidad || "9999-12-31") < (b.caducidad || "9999-12-31") ? -1 : 1);
  const hoy0 = parseDate(todayStr());
  const lotesActivos = inv.flatMap(i => conLotes(i).filter(l => l.cantidad > 0));
  const caducados = lotesActivos.filter(l => l.caducidad && parseDate(l.caducidad) < hoy0).reduce((s, l) => s + l.cantidad, 0);
  const porCaducar = lotesActivos.filter(l => {
    if (!l.caducidad) return false;
    const d = Math.round((parseDate(l.caducidad) - hoy0) / 86400000);
    return d >= 0 && d <= 60;
  }).reduce((s, l) => s + l.cantidad, 0);
  const agotados = inv.filter(i => i.cantidad === 0).length;
  const stockBajo = inv.filter(i => i.cantidad > 0 && i.cantidad <= (i.stockMin || 1));
  const agotadosList = inv.filter(i => i.cantidad === 0);
  const topStock = inv.slice().sort((a, b) => b.cantidad - a.cantidad).filter(i => i.cantidad > 0).slice(0, 3);
  const valorTotal = inv.reduce((s, i) => s + (Number(i.precio) || 0) * i.cantidad, 0);
  const inputCls = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white";
  const labelCls = "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1";
  const editItem = editKey ? inv.find(i => i.key === editKey) : null;
  const multiLoteEdit = editItem ? conLotes(editItem).filter(l => l.cantidad > 0).length > 1 : false;
  return React.createElement("div", {
    className: "space-y-4"
  }, React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4 space-y-2"
  }, React.createElement("div", {
    className: "flex items-center justify-between gap-2 flex-wrap"
  }, React.createElement("h2", {
    className: "font-bold text-slate-700 flex items-center gap-2"
  }, React.createElement(IBarcode, {
    cls: "w-5 h-5 text-emerald-700"
  }), " Captura r\xE1pida por c\xF3digo"), inv.length > 0 && React.createElement("button", {
    onClick: exportarPDF,
    className: "inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
  }, React.createElement(IDownload, {
    cls: "w-4 h-4"
  }), " Exportar PDF")), React.createElement("div", {
    className: "flex gap-2"
  }, React.createElement("input", {
    className: inputCls,
    placeholder: "Escanea o escribe el c\xF3digo de barras / ID y presiona Enter",
    value: codigo,
    onChange: e => setCodigo(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter") procesarCodigo(codigo);
    }
  }), React.createElement("button", {
    onClick: () => procesarCodigo(codigo),
    className: "shrink-0 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-4 rounded-xl flex items-center gap-1.5"
  }, React.createElement(IPlus, {
    cls: "w-4 h-4"
  }), " +1"), React.createElement("button", {
    onClick: scanning ? detener : escanear,
    className: "shrink-0 text-sm font-semibold px-4 rounded-xl flex items-center gap-1.5 border " + (scanning ? "bg-rose-50 border-rose-300 text-rose-700" : "bg-white border-slate-300 text-slate-600 hover:border-emerald-400")
  }, React.createElement(ICamera, {
    cls: "w-4 h-4"
  }), " ", scanning ? "Detener" : "Cámara")), React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "Si el c\xF3digo ya existe, te preguntar\xE1 la ", React.createElement("b", null, "caducidad de esa unidad"), ": misma fecha suma al lote existente, fecha distinta crea un lote nuevo. Si el c\xF3digo es nuevo, se abre el formulario prellenado. Compatible con lectores USB (escanean directo al campo)."), scanning && React.createElement("div", {
    className: "rounded-xl overflow-hidden border border-emerald-300 bg-black"
  }, React.createElement("video", {
    ref: videoRef,
    className: "w-full max-h-64 object-cover",
    muted: true,
    playsInline: true
  }), React.createElement("div", {
    className: "text-center text-xs text-emerald-200 bg-slate-900 py-1.5"
  }, "Apunta la c\xE1mara al c\xF3digo de barras\u2026")), scanErr && React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-3 py-2 flex items-center gap-2"
  }, React.createElement(IWarn, {
    cls: "w-4 h-4 shrink-0"
  }), " ", scanErr)), inv.length > 0 && React.createElement("div", {
    className: "bg-emerald-800 text-white rounded-2xl p-4 flex items-center justify-between"
  }, React.createElement("div", null, React.createElement("div", {
    className: "text-emerald-200 text-xs font-bold uppercase tracking-wide"
  }, "Valor total del inventario"), React.createElement("div", {
    className: "text-2xl font-extrabold"
  }, fmtMoney(valorTotal), " ", React.createElement("span", {
    className: "text-sm font-medium text-emerald-200"
  }, "MXN"))), React.createElement("div", {
    className: "text-right text-emerald-200 text-xs"
  }, "Dinero invertido en tus", React.createElement("br", null), "medicamentos en existencia")), inv.length > 0 && React.createElement("div", {
    className: "grid grid-cols-5 gap-1.5"
  }, React.createElement(Kpi, {
    label: "Productos",
    valor: inv.length
  }), React.createElement(Kpi, {
    label: "Stock bajo",
    valor: stockBajo.length,
    verde: stockBajo.length === 0
  }), React.createElement(Kpi, {
    label: "Agotados",
    valor: agotados,
    verde: agotados === 0
  }), React.createElement(Kpi, {
    label: "Env. por caducar",
    valor: porCaducar,
    verde: porCaducar === 0
  }), React.createElement(Kpi, {
    label: "Env. caducados",
    valor: caducados,
    verde: caducados === 0
  })), inv.length > 0 && React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-3 gap-4"
  }, React.createElement("div", null, React.createElement("div", {
    className: "text-xs font-bold uppercase tracking-wide text-emerald-700 mb-1.5 flex items-center gap-1"
  }, React.createElement(IBox, {
    cls: "w-3.5 h-3.5"
  }), " Con m\xE1s existencias"), topStock.length === 0 ? React.createElement("div", {
    className: "text-xs text-slate-400"
  }, "Sin existencias.") : topStock.map(i => React.createElement("div", {
    key: i.key,
    className: "text-sm text-slate-700 flex justify-between gap-2 py-0.5"
  }, React.createElement("span", {
    className: "truncate"
  }, i.name), React.createElement("b", {
    className: "shrink-0"
  }, i.cantidad, " ", i.envase.toLowerCase(), i.cantidad === 1 ? "" : "s")))), React.createElement("div", null, React.createElement("div", {
    className: "text-xs font-bold uppercase tracking-wide text-amber-600 mb-1.5 flex items-center gap-1"
  }, React.createElement(IWarn, {
    cls: "w-3.5 h-3.5"
  }), " Por acabarse"), stockBajo.length === 0 ? React.createElement("div", {
    className: "text-xs text-slate-400"
  }, "Ninguno en el l\xEDmite. Todo en orden.") : stockBajo.slice(0, 4).map(i => React.createElement("div", {
    key: i.key,
    className: "text-sm text-amber-800 flex justify-between gap-2 py-0.5"
  }, React.createElement("span", {
    className: "truncate"
  }, i.name), React.createElement("b", {
    className: "shrink-0"
  }, i.cantidad, " / m\xEDn ", i.stockMin || 1)))), React.createElement("div", null, React.createElement("div", {
    className: "text-xs font-bold uppercase tracking-wide text-rose-600 mb-1.5 flex items-center gap-1"
  }, React.createElement(IX, {
    cls: "w-3.5 h-3.5"
  }), " Fuera de l\xEDmite (agotados)"), agotadosList.length === 0 ? React.createElement("div", {
    className: "text-xs text-slate-400"
  }, "Ning\xFAn producto agotado.") : agotadosList.slice(0, 4).map(i => React.createElement("div", {
    key: i.key,
    className: "text-sm text-rose-700 flex justify-between gap-2 py-0.5"
  }, React.createElement("span", {
    className: "truncate"
  }, i.name), React.createElement("b", {
    className: "shrink-0"
  }, "reabastecer")))))), React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("button", {
    onClick: () => setFormOpen(!formOpen),
    className: "w-full flex items-center justify-between"
  }, React.createElement("span", {
    className: "font-bold text-slate-700 flex items-center gap-2"
  }, editKey ? React.createElement(IEdit, {
    cls: "w-5 h-5 text-amber-600"
  }) : React.createElement(IPlus, {
    cls: "w-5 h-5 text-emerald-700"
  }), " ", editKey ? "Editando: " + f.name : "Registrar producto nuevo"), formOpen ? React.createElement(IChevD, {
    cls: "w-5 h-5 text-slate-400"
  }) : React.createElement(IChevR, {
    cls: "w-5 h-5 text-slate-400"
  })), formOpen && React.createElement("div", {
    className: "mt-3 space-y-3"
  }, React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "C\xF3digo / ID (c\xF3digo de barras)"), React.createElement("input", {
    className: inputCls,
    placeholder: "Escanea, escribe o deja vac\xEDo para generar uno",
    value: f.code,
    onChange: e => set("code", e.target.value)
  })), React.createElement("div", {
    className: "relative"
  }, React.createElement("label", {
    className: labelCls
  }, "Nombre del medicamento *"), React.createElement("input", {
    className: inputCls,
    placeholder: "Escribe 2+ letras, ej. para\u2026",
    value: f.name,
    onChange: e => {
      set("name", e.target.value);
      setSugOpen(true);
    },
    onFocus: () => setSugOpen(true),
    onBlur: () => setTimeout(() => setSugOpen(false), 150)
  }), sugOpen && sugerencias.length > 0 && React.createElement("div", {
    className: "absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
  }, sugerencias.map((s, i) => React.createElement("button", {
    key: i,
    onMouseDown: e => {
      e.preventDefault();
      aplicarSug(s);
    },
    className: "w-full text-left px-3 py-2 hover:bg-emerald-50 flex items-center justify-between gap-2 border-b border-slate-50 last:border-0"
  }, React.createElement("span", {
    className: "min-w-0"
  }, React.createElement("span", {
    className: "text-sm font-medium text-slate-700 block truncate"
  }, s.name), React.createElement("span", {
    className: "text-xs text-slate-400"
  }, s.envase, " \xB7 ", s.contenido, " ", s.unidad, s.precio ? " · " + fmtMoney(s.precio) : "")), React.createElement("span", {
    className: "text-[10px] px-1.5 py-0.5 rounded-full shrink-0 " + (s.origen === "catálogo" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700")
  }, s.origen)))), React.createElement("div", {
    className: "text-xs text-slate-400 mt-0.5"
  }, "Elige de la base de medicamentos comunes de M\xE9xico y se llena todo el formulario")), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Presentaci\xF3n"), React.createElement("select", {
    className: inputCls,
    value: f.presentation,
    onChange: e => set("presentation", e.target.value)
  }, PRESENTACIONES.map(p => React.createElement("option", {
    key: p
  }, p)))), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Tipo de envase"), React.createElement("select", {
    className: inputCls,
    value: f.envase,
    onChange: e => set("envase", e.target.value)
  }, ENVASES.map(p => React.createElement("option", {
    key: p
  }, p)))), React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Contenido *"), React.createElement("input", {
    type: "number",
    min: "1",
    className: inputCls,
    value: f.contenido,
    onChange: e => set("contenido", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Unidad"), React.createElement("select", {
    className: inputCls,
    value: f.unidad,
    onChange: e => set("unidad", e.target.value)
  }, UNIDADES.map(u => React.createElement("option", {
    key: u
  }, u))))), multiLoteEdit ? React.createElement("div", {
    className: "bg-sky-50 border border-sky-100 rounded-xl px-3 py-2.5 text-xs text-sky-900"
  }, React.createElement("b", null, "Este producto tiene ", conLotes(editItem).filter(l => l.cantidad > 0).length, " lotes con caducidades distintas"), " (", conLotes(editItem).filter(l => l.cantidad > 0).map(l => l.cantidad + "× " + (l.caducidad ? fmtDate(l.caducidad) : "sin fecha")).join(" · "), "). Las cantidades y fechas se administran por lote desde la tarjeta del producto; aqu\xED solo se editan nombre, envase, precio y dem\xE1s datos.") : React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Envases que tienes"), React.createElement("input", {
    type: "number",
    min: "0",
    className: inputCls,
    value: f.cantidad,
    onChange: e => set("cantidad", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Fecha de caducidad"), React.createElement("input", {
    type: "date",
    className: inputCls,
    value: f.caducidad,
    onChange: e => set("caducidad", e.target.value)
  })))), React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Precio por envase (MXN)"), React.createElement("input", {
    type: "number",
    min: "0",
    step: "0.01",
    className: inputCls,
    placeholder: "Ej. 85.50",
    value: f.precio,
    onChange: e => set("precio", e.target.value)
  }), React.createElement("div", {
    className: "text-xs text-slate-400 mt-0.5"
  }, "Se guarda en tu cat\xE1logo para futuras compras y el valor del inventario")), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "L\xEDmite de stock (m\xEDnimo deseado)"), React.createElement("input", {
    type: "number",
    min: "1",
    className: inputCls,
    value: f.stockMin,
    onChange: e => set("stockMin", e.target.value)
  }), React.createElement("div", {
    className: "text-xs text-slate-400 mt-0.5"
  }, "Cuando queden esta cantidad de envases o menos, se marcar\xE1 \"por acabarse\"")), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Imagen del producto (opcional)"), React.createElement("div", {
    className: "flex items-center gap-2"
  }, f.imagen ? React.createElement("img", {
    src: f.imagen,
    alt: "producto",
    className: "w-12 h-12 rounded-lg object-cover border border-slate-200"
  }) : React.createElement("div", {
    className: "w-12 h-12 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center"
  }, React.createElement(ICamera, {
    cls: "w-5 h-5 text-slate-400"
  })), React.createElement("label", {
    className: "cursor-pointer text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
  }, f.imagen ? "Cambiar" : "Subir foto", React.createElement("input", {
    type: "file",
    accept: "image/*",
    className: "hidden",
    onChange: subirImagen
  })), f.imagen && React.createElement("button", {
    onClick: () => set("imagen", ""),
    className: "text-xs text-slate-400 hover:text-rose-600"
  }, "quitar")), React.createElement("div", {
    className: "text-xs text-slate-400 mt-0.5"
  }, "Se comprime autom\xE1ticamente a miniatura para identificarlo f\xE1cil"))), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Notas (opcional)"), React.createElement("input", {
    className: inputCls,
    placeholder: "Ej. Guardado en el botiqu\xEDn del ba\xF1o \xB7 lote 4521",
    value: f.notas,
    onChange: e => set("notas", e.target.value)
  })), React.createElement("div", {
    className: "text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2"
  }, "Ejemplos: ", React.createElement("b", null, "Caja"), " con 20 ", React.createElement("b", null, "tabletas"), " \xB7 ", React.createElement("b", null, "Frasco"), " con 120 ", React.createElement("b", null, "ml"), " \xB7 ", React.createElement("b", null, "Bl\xEDster"), " con 10 ", React.createElement("b", null, "c\xE1psulas")), err && React.createElement("div", {
    className: "bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-3 py-2.5 flex items-center gap-2"
  }, React.createElement(IWarn, {
    cls: "w-4 h-4 shrink-0"
  }), " ", err), React.createElement("button", {
    onClick: guardarForm,
    className: "w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"
  }, React.createElement(IPlus, {
    cls: "w-5 h-5"
  }), " ", editKey ? "Guardar cambios" : "Agregar al inventario"), editKey && React.createElement("button", {
    onClick: () => {
      setF(vacio);
      setEditKey(null);
      setErr(null);
      setFormOpen(false);
    },
    className: "w-full text-sm text-slate-500 hover:text-slate-700 py-1"
  }, "Cancelar edici\xF3n"))), inv.length > 0 && React.createElement("div", {
    className: "relative"
  }, React.createElement(ISearch, {
    cls: "w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
  }), React.createElement("input", {
    className: inputCls + " pl-9",
    placeholder: "Buscar por nombre o c\xF3digo\u2026",
    value: busca,
    onChange: e => setBusca(e.target.value)
  })), inv.length === 0 ? React.createElement(VacioCard, {
    titulo: "Tu botiqu\xEDn est\xE1 vac\xEDo",
    texto: "Registra los medicamentos que tienes en casa: nombre, envase, contenido y caducidad. Despu\xE9s bastar\xE1 escanear o escribir el c\xF3digo para sumar m\xE1s.",
    accion: () => setFormOpen(true),
    accionLabel: "Registrar el primero"
  }) : React.createElement("div", {
    className: "space-y-2"
  }, filtrados.map(i => {
    const cad = estadoCad(i.caducidad);
    const total = i.cantidad * i.contenido;
    return React.createElement("div", {
      key: i.key,
      id: "inv-" + i.key,
      className: "bg-white rounded-2xl border p-4 " + (loteScan === i.key ? "border-emerald-400 ring-2 ring-emerald-200" : cad.nivel === 2 ? "border-rose-300" : cad.nivel === 1 ? "border-amber-300" : "border-slate-200")
    }, React.createElement("div", {
      className: "flex items-start gap-3"
    }, i.imagen ? React.createElement("img", {
      src: i.imagen,
      alt: i.name,
      className: "w-11 h-11 rounded-xl object-cover border shrink-0 " + (i.cantidad === 0 ? "border-slate-200 opacity-60" : "border-emerald-200")
    }) : React.createElement("div", {
      className: "rounded-xl p-2 border shrink-0 " + (i.cantidad === 0 ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-emerald-50 text-emerald-700 border-emerald-200")
    }, React.createElement(IBox, {
      cls: "w-5 h-5"
    })), React.createElement("div", {
      className: "flex-1 min-w-0"
    }, React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, React.createElement("span", {
      className: "font-bold text-slate-800"
    }, i.name), React.createElement("span", {
      className: "text-xs font-mono bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1"
    }, React.createElement(IBarcode, {
      cls: "w-3 h-3"
    }), " ", i.code), i.cantidad === 0 && React.createElement("span", {
      className: "text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600"
    }, "agotado"), i.cantidad > 0 && i.cantidad <= (i.stockMin || 1) && React.createElement("span", {
      className: "text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200"
    }, "por acabarse \xB7 m\xEDn ", i.stockMin || 1)), React.createElement("div", {
      className: "text-sm text-slate-500 mt-0.5"
    }, i.presentation, " \xB7 ", i.envase, " con ", i.contenido, " ", i.unidad, " \xB7 disponible: ", React.createElement("b", {
      className: "text-slate-700"
    }, total, " ", i.unidad), i.precio > 0 && React.createElement("span", null, " \xB7 ", fmtMoney(i.precio), " c/u \xB7 ", React.createElement("b", {
      className: "text-emerald-700"
    }, fmtMoney(i.precio * i.cantidad)), " en stock")), React.createElement("div", {
      className: "mt-1.5 flex items-center gap-1.5 flex-wrap"
    }, conLotes(i).filter(l => l.cantidad > 0).map(l => {
      const ec = estadoCad(l.caducidad);
      const etiqueta = !l.caducidad ? "sin fecha" : ec.nivel === 2 ? "CADUCADO · " + fmtDate(l.caducidad) : ec.nivel === 1 ? "caduca " + fmtDate(l.caducidad) : "cad " + fmtDate(l.caducidad);
      return React.createElement("span", {
        key: l.id,
        className: "text-xs pl-2 pr-1 py-0.5 rounded-full border inline-flex items-center gap-1 " + ec.cls
      }, React.createElement("b", null, l.cantidad, "\xD7"), " ", etiqueta, React.createElement("button", {
        onClick: () => quitarDeLote(i.key, l.id),
        title: "Descontar 1 envase de este lote",
        className: "w-4 h-4 rounded-full hover:bg-white/70 flex items-center justify-center"
      }, React.createElement(IMinus, {
        cls: "w-3 h-3"
      })));
    }), i.cantidad === 0 && React.createElement("span", {
      className: "text-xs px-2 py-0.5 rounded-full border bg-slate-100 text-slate-500 border-slate-200"
    }, "sin existencias"), i.notas && React.createElement("span", {
      className: "text-xs text-slate-400"
    }, i.notas))), React.createElement("div", {
      className: "flex flex-col items-center gap-1 shrink-0"
    }, React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, React.createElement("button", {
      onClick: () => ajustar(i.key, -1),
      disabled: i.cantidad === 0,
      className: "w-8 h-8 rounded-lg border flex items-center justify-center " + (i.cantidad === 0 ? "border-slate-200 text-slate-300" : "border-slate-300 text-slate-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600")
    }, React.createElement(IMinus, {
      cls: "w-4 h-4"
    })), React.createElement("div", {
      className: "w-10 text-center"
    }, React.createElement("div", {
      className: "text-xl font-extrabold text-slate-800 leading-none"
    }, i.cantidad), React.createElement("div", {
      className: "text-[10px] text-slate-400 leading-tight"
    }, i.envase.toLowerCase(), i.cantidad === 1 ? "" : "s")), React.createElement("button", {
      onClick: () => ajustar(i.key, 1),
      className: "w-8 h-8 rounded-lg border border-slate-300 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 flex items-center justify-center"
    }, React.createElement(IPlus, {
      cls: "w-4 h-4"
    }))), confirmDel === i.key ? React.createElement("div", {
      className: "flex items-center gap-1 mt-1"
    }, React.createElement("button", {
      onClick: () => eliminar(i.key),
      className: "text-xs px-2 py-1 rounded-lg bg-rose-600 text-white"
    }, "Eliminar"), React.createElement("button", {
      onClick: () => setConfirmDel(null),
      className: "text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600"
    }, "No")) : React.createElement("div", {
      className: "flex items-center gap-2 mt-1"
    }, React.createElement("button", {
      onClick: () => editarItem(i),
      className: "text-xs text-slate-400 hover:text-emerald-700 flex items-center gap-1"
    }, React.createElement(IEdit, {
      cls: "w-3 h-3"
    }), " editar"), React.createElement("button", {
      onClick: () => setConfirmDel(i.key),
      className: "text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1"
    }, React.createElement(ITrash, {
      cls: "w-3 h-3"
    }), " quitar")))), loteScan === i.key && React.createElement("div", {
      className: "mt-3 pt-3 border-t border-emerald-200"
    }, React.createElement("div", {
      className: "text-sm font-semibold text-emerald-900 mb-2"
    }, "\u2795 Recibir 1 ", i.envase.toLowerCase(), " de ", i.name, " \u2014 \xBFcu\xE1l es su fecha de caducidad?"), conLotes(i).filter(l => l.cantidad > 0).length > 0 && React.createElement("div", {
      className: "flex flex-wrap gap-1.5 mb-2"
    }, conLotes(i).filter(l => l.cantidad > 0).map(l => React.createElement("button", {
      key: l.id,
      onClick: () => recibirUnidad(i.key, l.caducidad),
      className: "text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
    }, l.caducidad ? "Misma: " + fmtDate(l.caducidad) : "Sin fecha", " \xB7 tienes ", l.cantidad))), React.createElement("div", {
      className: "flex flex-wrap items-end gap-2"
    }, React.createElement("div", null, React.createElement("label", {
      className: labelCls
    }, "Caducidad distinta (lote nuevo)"), React.createElement("input", {
      type: "date",
      className: inputCls,
      value: loteFecha,
      onChange: e => setLoteFecha(e.target.value)
    })), React.createElement("button", {
      onClick: () => {
        if (!loteFecha) {
          avisar("Elige la fecha, o toca un lote existente arriba");
          return;
        }
        recibirUnidad(i.key, loteFecha);
      },
      className: "bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-4 py-2 rounded-xl"
    }, "Agregar"), React.createElement("button", {
      onClick: () => recibirUnidad(i.key, ""),
      className: "text-sm px-3 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50"
    }, "Sin fecha"), React.createElement("button", {
      onClick: () => {
        setLoteScan(null);
        setLoteFecha("");
      },
      className: "text-sm px-3 py-2 text-slate-500 hover:text-slate-700"
    }, "Cancelar")), React.createElement("p", {
      className: "text-[11px] text-slate-400 mt-2"
    }, "Si la fecha coincide con un lote existente, se suma ah\xED; si es distinta, se crea un lote nuevo. As\xED sabr\xE1s exactamente cu\xE1ntos envases caducan y cu\xE1ndo.")));
  }), filtrados.length === 0 && React.createElement("div", {
    className: "text-center text-sm text-slate-400 py-6"
  }, "No se encontr\xF3 ning\xFAn producto con \"", busca, "\".")), Object.keys(catalogo).length > 0 && React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("div", {
    className: "flex items-center justify-between gap-2"
  }, React.createElement("button", {
    onClick: () => setCatOpen(!catOpen),
    className: "flex items-center gap-2 flex-1 text-left"
  }, catOpen ? React.createElement(IChevD, {
    cls: "w-4 h-4 text-slate-400"
  }) : React.createElement(IChevR, {
    cls: "w-4 h-4 text-slate-400"
  }), React.createElement("span", {
    className: "font-bold text-slate-700 text-sm flex items-center gap-2"
  }, React.createElement(IBarcode, {
    cls: "w-4 h-4 text-emerald-700"
  }), " Cat\xE1logo maestro (", Object.keys(catalogo).length, " c\xF3digos registrados)")), React.createElement("button", {
    onClick: exportarCatalogoPDF,
    className: "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50"
  }, React.createElement(IDownload, {
    cls: "w-3.5 h-3.5"
  }), " PDF cat\xE1logo")), catOpen && React.createElement("div", {
    className: "mt-3"
  }, React.createElement("p", {
    className: "text-xs text-slate-400 mb-2"
  }, "Tu base de datos permanente: cada producto que registras queda aqu\xED con su informaci\xF3n y precio, aunque se agote o lo quites del inventario. Al escanear o escribir un c\xF3digo conocido, el sistema lo reconoce y llena todo autom\xE1ticamente."), React.createElement("div", {
    className: "max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-100"
  }, Object.keys(catalogo).sort((a, b) => a.localeCompare(b, undefined, {
    numeric: true
  })).map(c => {
    const it = catalogo[c];
    const enInv = inv.some(i => i.code === c);
    return React.createElement("div", {
      key: c,
      className: "flex items-center gap-2 px-3 py-2 text-sm"
    }, it.imagen ? React.createElement("img", {
      src: it.imagen,
      alt: "",
      className: "w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
    }) : React.createElement("div", {
      className: "w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"
    }, React.createElement(IPill, {
      cls: "w-4 h-4 text-slate-400"
    })), React.createElement("div", {
      className: "flex-1 min-w-0"
    }, React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, React.createElement("span", {
      className: "font-semibold text-slate-700 truncate"
    }, it.name), React.createElement("span", {
      className: "text-xs font-mono text-slate-400"
    }, c), enInv ? React.createElement("span", {
      className: "text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700"
    }, "en inventario") : React.createElement("span", {
      className: "text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500"
    }, "solo en cat\xE1logo")), React.createElement("div", {
      className: "text-xs text-slate-500"
    }, it.envase, " \xB7 ", it.contenido, " ", it.unidad, it.precio ? " · " + fmtMoney(it.precio) : "", it.updatedAt ? " · act. " + fmtDate(it.updatedAt) : "")), React.createElement("button", {
      onClick: () => procesarCodigo(c),
      className: "text-xs px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 shrink-0"
    }, "usar"), !enInv && React.createElement("button", {
      onClick: () => quitarDelCatalogo(c),
      className: "text-slate-300 hover:text-rose-600 shrink-0",
      title: "Eliminar del cat\xE1logo"
    }, React.createElement(ITrash, {
      cls: "w-3.5 h-3.5"
    })));
  })))));
}
const CTX_GLUCOSA = ["En ayunas", "Antes de alimento", "2 h después de alimento", "Antes de dormir"];
const CTX_FC = ["En reposo", "Después de actividad"];
const CTX_SUENO = ["Reparador", "Interrumpido", "Me costó dormir"];
const LOC_DOLOR = ["Cabeza", "Pecho", "Abdomen", "Espalda baja", "Articulaciones", "Muscular", "Otro"];
const NIVELES_ORINA = [{
  v: 1,
  label: "1 · Muy claro (transparente)"
}, {
  v: 2,
  label: "2 · Amarillo paja (claro)"
}, {
  v: 3,
  label: "3 · Amarillo"
}, {
  v: 4,
  label: "4 · Amarillo intenso / naranja"
}, {
  v: 5,
  label: "5 · Ámbar / miel (muy concentrada)"
}, {
  v: 6,
  label: "6 · Café oscuro (color refresco de cola)"
}, {
  v: 7,
  label: "7 · Rosada / roja (con sangre visible)"
}, {
  v: 8,
  label: "8 · Turbia, con espuma persistente o mal olor"
}];
const CTX_ORINA = ["Sin molestias", "Ardor o dolor al orinar", "Urgencia repentina", "Chorro débil o goteo", "Me despertó en la noche (nicturia)"];
const BRISTOL = [{
  v: 1,
  label: "Tipo 1 · Bolitas duras separadas, difíciles de expulsar"
}, {
  v: 2,
  label: "Tipo 2 · Forma de salchicha, dura y grumosa"
}, {
  v: 3,
  label: "Tipo 3 · Salchicha con grietas en la superficie"
}, {
  v: 4,
  label: "Tipo 4 · Salchicha lisa y blanda (ideal)"
}, {
  v: 5,
  label: "Tipo 5 · Trozos blandos con bordes definidos"
}, {
  v: 6,
  label: "Tipo 6 · Trozos esponjosos, pastosa"
}, {
  v: 7,
  label: "Tipo 7 · Totalmente líquida, sin trozos sólidos"
}];
const COLORES_HECES = [{
  v: 1,
  label: "Café (normal)"
}, {
  v: 2,
  label: "Café oscuro"
}, {
  v: 3,
  label: "Verde"
}, {
  v: 4,
  label: "Amarilla / grasosa / que flota"
}, {
  v: 5,
  label: "Pálida, gris o blanquecina (acolia)"
}, {
  v: 6,
  label: "Negra alquitranada, pegajosa, olor muy fétido (melena)"
}, {
  v: 7,
  label: "Roja o con sangre visible"
}];
const CTX_HECES = ["Sin molestias", "Dolor o cólico", "Urgencia", "Sensación de evacuación incompleta", "Con mucho esfuerzo", "Con moco"];
const DIAGNOSTICOS = ["Sobrepeso", "Obesidad", "Prediabetes", "Diabetes", "Prehipertensión", "Hipertensión", "Dislipidemia", "Hígado graso", "Asma / EPOC", "Hipotiroidismo", "Ansiedad / depresión", "Gastritis / colitis"];
const PLACE_VALOR = {
  glucosa: "95",
  peso: "78.5",
  spo2: "97",
  temp: "36.6",
  fr: "16",
  cuello: "38"
};
const NOTAS_PH = {
  glucosa: "Ej. Comí tacos al pastor, me sentí mareado…",
  dolor: "Ej. Punzante, empeora al moverme, mejora con reposo…",
  estres: "Ej. Detonante: entrega de trabajo, tráfico…",
  sueno: "Ej. Desperté 2 veces, tomé café por la tarde…",
  orina: "Ej. Tomé poca agua hoy, comí betabel, tomo complejo B…",
  heces: "Ej. Comí en la calle ayer, tomé antibiótico, dolor antes de evacuar…",
  temp: "Ej. Tomé paracetamol a las 3 pm…"
};
const BANDAS_REF = {
  glucosa: [70, 140],
  presion: [90, 120],
  spo2: [95, 100],
  temp: [36, 37.2],
  fc: [60, 100],
  fr: [12, 20],
  sueno: [7, 9],
  dolor: [0, 3],
  estres: [0, 3],
  heces: [3, 4]
};
const METRICAS = {
  glucosa: {
    label: "Glucosa",
    unidad: "mg/dL",
    Icon: IDrop,
    color: "text-rose-600",
    guia: "Mide en ayunas al despertar (mínimo 8 h sin alimento) y/o exactamente 2 h después del primer bocado de la comida. Lava y seca tus manos antes de la punción. Registrar el contexto (con o sin alimento) es clave: los rangos de referencia son distintos.",
    horariosDefault: [{
      hora: "07:00",
      ctx: "En ayunas"
    }, {
      hora: "16:00",
      ctx: "2 h después de alimento"
    }]
  },
  presion: {
    label: "Presión arterial",
    unidad: "mmHg",
    Icon: IActivity,
    color: "text-red-600",
    guia: "Mide 2 veces al día a la misma hora: en la mañana antes de desayunar y de tomar medicamentos, y en la noche antes de cenar. Siéntate con la espalda apoyada y reposa 5 minutos antes; brazo a la altura del corazón, sin cafeína, ejercicio ni cigarro 30 min antes. Medir siempre a las mismas horas permite detectar patrones reales.",
    horariosDefault: [{
      hora: "07:30",
      ctx: "Mañana (antes de medicamentos)"
    }, {
      hora: "19:30",
      ctx: "Noche (antes de cenar)"
    }]
  },
  peso: {
    label: "Peso",
    unidad: "kg",
    Icon: IScale,
    color: "text-indigo-600",
    guia: "Pésate siempre a la misma hora: en la mañana, en ayunas, después de ir al baño, con ropa ligera y en la misma báscula sobre piso firme. El peso varía hasta 1-2 kg durante el día, por eso la constancia en el horario es lo que revela la tendencia real.",
    horariosDefault: [{
      hora: "07:00",
      ctx: "En ayunas, después del baño"
    }]
  },
  spo2: {
    label: "Oxigenación (SpO2)",
    unidad: "%",
    Icon: ILung,
    color: "text-cyan-600",
    guia: "Mide en reposo, sentado y tras 5 minutos de calma, con la mano tibia y sin esmalte de uñas (dedo índice o medio). Mide mañana y noche a la misma hora para detectar patrones, y adicionalmente si tienes síntomas como fatiga o falta de aire. Espera a que la lectura se estabilice (20-30 segundos).",
    horariosDefault: [{
      hora: "08:00",
      ctx: "Mañana en reposo"
    }, {
      hora: "20:00",
      ctx: "Noche en reposo"
    }]
  },
  temp: {
    label: "Temperatura",
    unidad: "°C",
    Icon: IThermo,
    color: "text-orange-500",
    guia: "Reposa 15 min antes de medir y evita alimentos o bebidas calientes/frías 15 min antes si es medición oral. Axilar: seca la axila y mantén el termómetro hasta el aviso (digital) o 3-5 min (mercurio/galinstan). Si das seguimiento a una fiebre, mide cada 4-6 horas y registra si tomaste antipirético en las notas.",
    horariosDefault: []
  },
  fc: {
    label: "Frec. cardiaca (FC)",
    unidad: "lpm",
    Icon: IHeart,
    color: "text-pink-600",
    guia: "Mide en reposo: sentado, tras 5 min de calma, sin cafeína, cigarro ni ejercicio en los 30 min previos. Coloca los dedos índice y medio (nunca el pulgar) en la muñeca del lado del pulgar o a un lado del cuello; cuenta los latidos durante 30 segundos y multiplica por 2. La FC en reposo al despertar es la más comparable día con día. Si mides con oxímetro o reloj, espera a que se estabilice.",
    horariosDefault: [{
      hora: "07:30",
      ctx: "En reposo"
    }]
  },
  fr: {
    label: "Frec. respiratoria (FR)",
    unidad: "rpm",
    Icon: IWind,
    color: "text-sky-600",
    guia: "En reposo, sentado. Cuenta cuántas veces sube el pecho durante 60 segundos completos. Truco importante: la respiración cambia cuando sabes que la estás contando; pide a alguien que la cuente sin avisarte, o cuéntala justo después de tomarte el pulso, sin cambiar de posición. No la midas después de esfuerzo, llanto o hablar.",
    horariosDefault: []
  },
  cintura: {
    label: "Cintura y cadera",
    unidad: "cm",
    Icon: ITape,
    color: "text-violet-600",
    guia: "De pie, con el abdomen descubierto y relajado. Cintura: coloca la cinta entre la última costilla y el borde superior del hueso de la cadera, paralela al piso, y mide al final de una exhalación normal, sin apretar la piel. Cadera (opcional pero recomendada): en la parte más ancha de los glúteos. Mide 1 vez por semana, el mismo día, a la misma hora y en ayunas; medirla a diario solo agrega ruido.",
    horariosDefault: []
  },
  cuello: {
    label: "Cuello",
    unidad: "cm",
    Icon: IUser,
    color: "text-slate-500",
    guia: "De pie, con la cabeza recta y mirando al frente. Mide justo por debajo de la prominencia laríngea (la 'manzana de Adán'), con la cinta perpendicular al eje del cuello, sin apretar. Una medición al mes es suficiente: esta medida cambia lento y se usa para valorar riesgo metabólico y de apnea del sueño.",
    horariosDefault: []
  },
  dolor: {
    label: "Dolor",
    unidad: "de 10",
    Icon: IZap,
    color: "text-amber-600",
    guia: "Califica de 0 (sin dolor) a 10 (el peor dolor imaginable) cómo se siente AHORA, no el promedio del día. Registra dónde duele y describe en las notas cómo es (punzante, ardoroso, opresivo, cólico), qué lo desencadena y qué lo mejora o empeora. Esa descripción vale tanto como el número para tu médico. Registra también cuando tomes analgésico, para ver si funciona.",
    horariosDefault: []
  },
  sueno: {
    label: "Sueño",
    unidad: "h",
    Icon: IMoon,
    color: "text-indigo-400",
    guia: "Registra al despertar las horas realmente dormidas (no las horas que pasaste en cama) y cómo despertaste. Si despertaste durante la noche, réstalo aproximadamente. El promedio semanal importa más que una mala noche aislada; sé constante con el registro matutino.",
    horariosDefault: [{
      hora: "07:00",
      ctx: "Al despertar"
    }]
  },
  estres: {
    label: "Estrés",
    unidad: "de 10",
    Icon: IFlame,
    color: "text-red-500",
    guia: "Al final del día, califica de 0 (nada) a 10 (máximo) tu estrés percibido general. Anota en las notas el detonante principal (trabajo, dinero, familia, salud…): identificar patrones y detonantes vale más que el número aislado. Si un día tuvo un pico puntual, regístralo con su hora.",
    horariosDefault: [{
      hora: "21:00",
      ctx: "Fin del día"
    }]
  },
  orina: {
    label: "Orina (color y frecuencia)",
    unidad: "de 8",
    Icon: IBeaker,
    color: "text-yellow-500",
    guia: "Registra CADA micción del día (o al menos cuéntalas): con eso la app calcula tu frecuencia diaria, un dato que tu médico sí puede usar. Lo normal en un adulto es de 4 a 8 micciones al día. Observa el color a media micción, con luz natural y antes de que caiga al agua (o en un recipiente claro). La primera orina de la mañana siempre es más concentrada. Vitaminas del complejo B, betabel y algunos medicamentos alteran el color: anótalo en las notas. Señales que SIEMPRE debes registrar y comentar con tu médico: color café oscuro (como refresco de cola), rosado/rojo, espuma persistente, ardor o levantarte varias veces en la noche a orinar.",
    horariosDefault: []
  },
  heces: {
    label: "Evacuaciones (heces)",
    unidad: "Bristol",
    Icon: IToilet,
    color: "text-amber-700",
    guia: "Registra CADA evacuación: la frecuencia diaria y semanal se calcula sola. Lo normal va de 3 veces por semana hasta 3 veces por día. Clasifica la forma con la escala de Bristol (1 = muy dura, 4 = ideal, 7 = líquida) y el color observado. Señales de alarma que debes registrar SIEMPRE y que ameritan atención médica: heces negras alquitranadas y de olor muy fétido (melena: posible sangrado digestivo), sangre roja visible, heces pálidas o blanquecinas (acolia: posible problema hepático o biliar) y diarrea con fiebre o con más de 6 evacuaciones al día. Anota en las notas alimentos sospechosos, antibióticos, suplementos de hierro (oscurecen las heces) o si hubo moco.",
    horariosDefault: []
  }
};
const clasificar = (tipo, a, b, ctx, extra) => {
  const x = extra || {};
  const okCls = "bg-emerald-100 text-emerald-700 border-emerald-200";
  const bajoCls = "bg-sky-100 text-sky-700 border-sky-200";
  const medioCls = "bg-amber-100 text-amber-700 border-amber-200";
  const altoCls = "bg-rose-100 text-rose-700 border-rose-200";
  if (tipo === "glucosa") {
    const v = Number(a);
    const post = ctx === "2 h después de alimento";
    if (v < 70) return {
      txt: "Baja (hipoglucemia)",
      cls: altoCls,
      alerta: true
    };
    if (post) {
      if (v < 140) return {
        txt: "Normal",
        cls: okCls,
        ok: true
      };
      if (v < 200) return {
        txt: "Elevada",
        cls: medioCls
      };
      return {
        txt: "Alta",
        cls: altoCls,
        alerta: true
      };
    }
    if (v < 100) return {
      txt: "Normal",
      cls: okCls,
      ok: true
    };
    if (v < 126) return {
      txt: "Elevada",
      cls: medioCls
    };
    return {
      txt: "Alta",
      cls: altoCls,
      alerta: true
    };
  }
  if (tipo === "presion") {
    const s = Number(a),
      d = Number(b);
    if (s >= 180 || d >= 120) return {
      txt: "Crisis — busca atención médica",
      cls: altoCls,
      alerta: true
    };
    if (s >= 140 || d >= 90) return {
      txt: "Hipertensión etapa 2",
      cls: altoCls,
      alerta: true
    };
    if (s >= 130 || d >= 80) return {
      txt: "Hipertensión etapa 1",
      cls: medioCls
    };
    if (s >= 120) return {
      txt: "Elevada",
      cls: medioCls
    };
    if (s < 90 || d < 60) return {
      txt: "Baja",
      cls: bajoCls
    };
    return {
      txt: "Normal",
      cls: okCls,
      ok: true
    };
  }
  if (tipo === "spo2") {
    const v = Number(a);
    if (v < 90) return {
      txt: "Muy baja — busca atención médica",
      cls: altoCls,
      alerta: true
    };
    if (v < 95) return {
      txt: "Baja",
      cls: medioCls
    };
    return {
      txt: "Normal",
      cls: okCls,
      ok: true
    };
  }
  if (tipo === "temp") {
    const v = Number(a);
    if (v < 35) return {
      txt: "Hipotermia — busca atención",
      cls: altoCls,
      alerta: true
    };
    if (v < 36) return {
      txt: "Baja",
      cls: bajoCls
    };
    if (v <= 37.2) return {
      txt: "Normal",
      cls: okCls,
      ok: true
    };
    if (v < 38) return {
      txt: "Febrícula",
      cls: medioCls
    };
    if (v < 39) return {
      txt: "Fiebre",
      cls: altoCls
    };
    if (v < 40) return {
      txt: "Fiebre alta",
      cls: altoCls,
      alerta: true
    };
    return {
      txt: "Fiebre muy alta — busca atención",
      cls: altoCls,
      alerta: true
    };
  }
  if (tipo === "fc") {
    if (ctx === "Después de actividad") return null;
    const v = Number(a);
    if (v < 40) return {
      txt: "Muy baja — consulta a tu médico",
      cls: altoCls,
      alerta: true
    };
    if (v < 60) return {
      txt: "Baja (puede ser normal en personas entrenadas)",
      cls: bajoCls
    };
    if (v <= 100) return {
      txt: "Normal",
      cls: okCls,
      ok: true
    };
    if (v <= 120) return {
      txt: "Elevada (taquicardia leve)",
      cls: medioCls
    };
    return {
      txt: "Alta — reposa 10 min y repite; si persiste, consulta",
      cls: altoCls,
      alerta: true
    };
  }
  if (tipo === "fr") {
    const v = Number(a);
    if (v < 10) return {
      txt: "Muy baja — busca atención",
      cls: altoCls,
      alerta: true
    };
    if (v < 12) return {
      txt: "Baja",
      cls: bajoCls
    };
    if (v <= 20) return {
      txt: "Normal",
      cls: okCls,
      ok: true
    };
    if (v <= 24) return {
      txt: "Elevada",
      cls: medioCls
    };
    return {
      txt: "Alta — si hay falta de aire, busca atención",
      cls: altoCls,
      alerta: true
    };
  }
  if (tipo === "cintura") {
    if (!x.sexo) return null;
    const lim = x.sexo === "Hombre" ? 90 : 80;
    if (Number(a) <= lim) return {
      txt: "Normal",
      cls: okCls,
      ok: true
    };
    return {
      txt: "Obesidad central (riesgo cardiometabólico)",
      cls: altoCls
    };
  }
  if (tipo === "cuello") {
    if (!x.sexo) return null;
    const v = Number(a);
    if (x.sexo === "Hombre") {
      if (v < 40) return {
        txt: "Normal",
        cls: okCls,
        ok: true
      };
      if (v < 43) return {
        txt: "Elevada",
        cls: medioCls
      };
      return {
        txt: "Alta (riesgo de apnea del sueño)",
        cls: altoCls
      };
    }
    if (v < 36) return {
      txt: "Normal",
      cls: okCls,
      ok: true
    };
    if (v < 38) return {
      txt: "Elevada",
      cls: medioCls
    };
    return {
      txt: "Alta (riesgo de apnea del sueño)",
      cls: altoCls
    };
  }
  if (tipo === "dolor") {
    const v = Number(a);
    if (v === 0) return {
      txt: "Sin dolor",
      cls: okCls,
      ok: true
    };
    if (v <= 3) return {
      txt: "Dolor leve",
      cls: medioCls
    };
    if (v <= 6) return {
      txt: "Dolor moderado",
      cls: medioCls
    };
    return {
      txt: "Dolor severo",
      cls: altoCls,
      alerta: true
    };
  }
  if (tipo === "sueno") {
    const v = Number(a);
    if (v < 5) return {
      txt: "Muy insuficiente",
      cls: altoCls
    };
    if (v < 7) return {
      txt: "Insuficiente",
      cls: medioCls
    };
    if (v <= 9) return {
      txt: "Óptimo (7–9 h)",
      cls: okCls,
      ok: true
    };
    return {
      txt: "Prolongado",
      cls: medioCls
    };
  }
  if (tipo === "estres") {
    const v = Number(a);
    if (v <= 3) return {
      txt: "Bajo",
      cls: okCls,
      ok: true
    };
    if (v <= 6) return {
      txt: "Moderado",
      cls: medioCls
    };
    return {
      txt: "Alto",
      cls: altoCls
    };
  }
  if (tipo === "orina") {
    const v = Number(a);
    if (v === 1) return {
      txt: "Exceso de hidratación",
      cls: bajoCls
    };
    if (v === 2) return {
      txt: "Hidratación adecuada",
      cls: okCls,
      ok: true
    };
    if (v === 3) return {
      txt: "Riesgo de deshidratación — toma agua",
      cls: medioCls
    };
    if (v === 4) return {
      txt: "Deshidratación — hidrátate ya",
      cls: altoCls,
      alerta: true
    };
    if (v === 5) return {
      txt: "Deshidratación importante — hidrátate y vigila",
      cls: altoCls,
      alerta: true
    };
    if (v === 6) return {
      txt: "Coluria (orina café oscura): posible bilirrubina — consulta a tu médico pronto",
      cls: altoCls,
      alerta: true
    };
    if (v === 7) return {
      txt: "Posible sangre en orina (hematuria) — busca atención médica hoy",
      cls: altoCls,
      alerta: true
    };
    return {
      txt: "Turbia / espumosa: posible infección o proteínas — consulta a tu médico",
      cls: medioCls,
      alerta: true
    };
  }
  if (tipo === "heces") {
    const forma = Number(a),
      color = Number(b);
    if (color === 6) return {
      txt: "🚨 Melena (negra alquitranada): posible sangrado digestivo — acude a URGENCIAS",
      cls: altoCls,
      alerta: true
    };
    if (color === 7) return {
      txt: "🚨 Sangre visible en heces — busca atención médica hoy mismo",
      cls: altoCls,
      alerta: true
    };
    if (color === 5) return {
      txt: "Acolia (heces pálidas): posible problema hepático o biliar — consulta pronto",
      cls: altoCls,
      alerta: true
    };
    if (color === 4) return {
      txt: "Grasosa / amarilla: posible mala absorción de grasas — coméntalo con tu médico",
      cls: medioCls
    };
    if (forma === 7) return {
      txt: "Diarrea líquida — hidrátate con suero oral y vigila",
      cls: altoCls,
      alerta: true
    };
    if (forma === 6) return {
      txt: "Diarrea leve (heces pastosas)",
      cls: medioCls
    };
    if (forma === 1) return {
      txt: "Estreñimiento importante",
      cls: medioCls
    };
    if (forma === 2) return {
      txt: "Estreñimiento",
      cls: medioCls
    };
    if (forma === 5) return {
      txt: "Blanda: puede faltar fibra",
      cls: bajoCls
    };
    if (color === 3) return {
      txt: "Forma normal · color verde (usualmente alimentos o tránsito rápido)",
      cls: bajoCls
    };
    return {
      txt: "Normal (Bristol " + forma + ")",
      cls: okCls,
      ok: true
    };
  }
  return null;
};
function Sparkline({
  puntos,
  puntos2,
  banda,
  unidad,
  fechas
}) {
  if (!puntos || puntos.length < 2) return null;
  const todos = (puntos2 ? puntos.concat(puntos2) : puntos).concat(banda ? banda : []);
  const min = Math.min(...todos),
    max = Math.max(...todos);
  const rango = max - min || 1;
  const W = 300,
    H = 90,
    P = 8,
    L = 34;
  const Y = v => H - P - (v - min) / rango * (H - 2 * P);
  const linea = arr => arr.map((v, i) => {
    const x = L + i * (W - L - P) / (arr.length - 1);
    return x.toFixed(1) + "," + Y(v).toFixed(1);
  }).join(" ");
  return React.createElement("div", null, React.createElement("svg", {
    viewBox: "0 0 " + W + " " + H,
    className: "w-full h-24"
  }, banda && React.createElement("rect", {
    x: L,
    y: Y(Math.min(banda[1], max)),
    width: W - L - P,
    height: Math.max(2, Y(Math.max(banda[0], min)) - Y(Math.min(banda[1], max))),
    fill: "#d1fae5",
    opacity: "0.6",
    rx: "3"
  }), React.createElement("text", {
    x: L - 4,
    y: Y(max) + 4,
    textAnchor: "end",
    fontSize: "9",
    fill: "#94a3b8"
  }, max), React.createElement("text", {
    x: L - 4,
    y: Y(min) + 4,
    textAnchor: "end",
    fontSize: "9",
    fill: "#94a3b8"
  }, min), banda && banda[0] > min && React.createElement("text", {
    x: L - 4,
    y: Y(banda[0]) + 3,
    textAnchor: "end",
    fontSize: "8",
    fill: "#059669"
  }, banda[0]), banda && banda[1] < max && React.createElement("text", {
    x: L - 4,
    y: Y(banda[1]) + 3,
    textAnchor: "end",
    fontSize: "8",
    fill: "#059669"
  }, banda[1]), puntos2 && React.createElement("polyline", {
    points: linea(puntos2),
    fill: "none",
    stroke: "#94a3b8",
    strokeWidth: "2",
    strokeDasharray: "4 3",
    strokeLinecap: "round"
  }), React.createElement("polyline", {
    points: linea(puntos),
    fill: "none",
    stroke: "#059669",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), puntos.map((v, i) => {
    const x = L + i * (W - L - P) / (puntos.length - 1);
    const fuera = banda && (v < banda[0] || v > banda[1]);
    return React.createElement("circle", {
      key: i,
      cx: x,
      cy: Y(v),
      r: i === puntos.length - 1 ? 4 : 2.5,
      fill: fuera ? "#e11d48" : "#059669"
    });
  })), fechas && fechas.length >= 2 && React.createElement("div", {
    className: "flex justify-between text-[10px] text-slate-400 px-1",
    style: {
      paddingLeft: "34px"
    }
  }, React.createElement("span", null, fmtDate(fechas[0])), React.createElement("span", null, fmtDate(fechas[fechas.length - 1]))), banda && React.createElement("div", {
    className: "text-[10px] text-emerald-700 text-center mt-0.5"
  }, "Zona sombreada = rango de referencia (", banda[0], "\u2013", banda[1], " ", unidad, ") \xB7 puntos rojos = fuera de rango"));
}
const calcIMC = (pesoKg, estCm) => {
  if (!pesoKg || !estCm) return null;
  const m = estCm / 100;
  return Math.round(pesoKg / (m * m) * 10) / 10;
};
const clasIMC = (pesoKg, estCm) => {
  const imc = calcIMC(pesoKg, estCm);
  if (imc === null) return null;
  if (imc < 18.5) return {
    imc,
    txt: "Bajo peso",
    cls: "bg-sky-100 text-sky-700 border-sky-200",
    dir: "subir"
  };
  if (imc < 25) return {
    imc,
    txt: "Peso normal",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dir: null
  };
  if (imc < 30) return {
    imc,
    txt: "Sobrepeso",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    dir: "bajar"
  };
  if (imc < 35) return {
    imc,
    txt: "Obesidad grado I",
    cls: "bg-rose-100 text-rose-700 border-rose-200",
    dir: "bajar"
  };
  if (imc < 40) return {
    imc,
    txt: "Obesidad grado II",
    cls: "bg-rose-100 text-rose-700 border-rose-200",
    dir: "bajar"
  };
  return {
    imc,
    txt: "Obesidad grado III",
    cls: "bg-rose-100 text-rose-700 border-rose-200",
    dir: "bajar"
  };
};
const rangoPesoSaludable = estCm => {
  if (!estCm) return null;
  const m = estCm / 100;
  return [Math.round(18.5 * m * m * 10) / 10, Math.round(24.9 * m * m * 10) / 10];
};
const calcEdad = fechaNac => {
  if (!fechaNac) return null;
  const n = parseDate(fechaNac),
    h = new Date();
  let e = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || h.getMonth() === n.getMonth() && h.getDate() < n.getDate()) e--;
  return e;
};
function Perfil({
  data,
  persist,
  avisar
}) {
  const perfil = data.perfil || {};
  const [open, setOpen] = useState(!perfil.estatura);
  const [p, setP] = useState({
    nombre: perfil.nombre || "",
    fechaNac: perfil.fechaNac || "",
    edad: perfil.edad || "",
    sexo: perfil.sexo || "",
    estatura: perfil.estatura || "",
    peso: perfil.peso || "",
    cintura: perfil.cintura || "",
    dx: perfil.dx || [],
    condiciones: perfil.condiciones || "",
    alergias: perfil.alergias || "",
    contacto: perfil.contacto || ""
  });
  const set = (k, v) => setP(prev => ({
    ...prev,
    [k]: v
  }));
  const toggleDx = d => setP(prev => ({
    ...prev,
    dx: (prev.dx || []).indexOf(d) >= 0 ? prev.dx.filter(x => x !== d) : [...(prev.dx || []), d]
  }));
  const fileRef = React.useRef(null);
  const guardar = () => {
    persist({
      ...data,
      perfil: {
        ...p,
        estatura: p.estatura ? Number(p.estatura) : "",
        peso: p.peso ? Number(p.peso) : "",
        cintura: p.cintura ? Number(p.cintura) : "",
        edad: p.edad ? Number(p.edad) : ""
      }
    });
    avisar("Perfil guardado");
    setOpen(false);
  };
  const exportar = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "medicontrol-respaldo-" + todayStr() + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
    avisar("Respaldo descargado");
  };
  const importar = e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (!d || typeof d !== "object" || !Array.isArray(d.meds)) throw new Error("formato");
        persist({
          meds: d.meds || [],
          taken: d.taken || {},
          inv: d.inv || [],
          vitals: d.vitals || {
            readings: [],
            horarios: null
          },
          perfil: d.perfil || {},
          catalogo: d.catalogo || {},
          comidas: d.comidas || [],
          agua: d.agua || {}
        });
        avisar("Respaldo restaurado correctamente");
      } catch (err) {
        avisar("El archivo no es un respaldo válido de MediControl");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const edad = calcEdad(perfil.fechaNac);
  return React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("button", {
    onClick: () => setOpen(!open),
    className: "w-full flex items-center justify-between"
  }, React.createElement("span", {
    className: "font-bold text-slate-700 text-sm flex items-center gap-2"
  }, React.createElement(IUser, {
    cls: "w-4 h-4 text-emerald-700"
  }), perfil.nombre ? perfil.nombre : "Perfil del paciente", perfil.estatura && React.createElement("span", {
    className: "text-xs font-normal text-slate-400"
  }, "\xB7 ", perfil.estatura, " cm", edad !== null ? " · " + edad + " años" : "", perfil.sexo ? " · " + perfil.sexo : "", (perfil.dx || []).length > 0 ? " · " + (perfil.dx || []).slice(0, 2).join(", ") + ((perfil.dx || []).length > 2 ? " +" + ((perfil.dx || []).length - 2) : "") : ""), !perfil.estatura && React.createElement("span", {
    className: "text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200"
  }, "completa tu estatura para calcular tu IMC")), open ? React.createElement(IChevD, {
    cls: "w-4 h-4 text-slate-400"
  }) : React.createElement(IChevR, {
    cls: "w-4 h-4 text-slate-400"
  })), open && React.createElement("div", {
    className: "mt-3 space-y-3"
  }, React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-3"
  }, React.createElement("div", {
    className: "col-span-2"
  }, React.createElement("label", {
    className: "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1"
  }, "Nombre"), React.createElement("input", {
    className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white",
    placeholder: "Tu nombre",
    value: p.nombre,
    onChange: e => set("nombre", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1"
  }, "Fecha de nacimiento"), React.createElement("input", {
    type: "date",
    className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white",
    value: p.fechaNac,
    onChange: e => set("fechaNac", e.target.value)
  }), p.fechaNac && React.createElement("p", {
    className: "text-[11px] text-emerald-700 font-semibold mt-1"
  }, "Edad: ", calcEdad(p.fechaNac), " a\xF1os")), React.createElement("div", null, React.createElement("label", {
    className: "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1"
  }, "Sexo"), React.createElement("select", {
    className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white",
    value: p.sexo,
    onChange: e => set("sexo", e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "\u2014"), React.createElement("option", null, "Hombre"), React.createElement("option", null, "Mujer"))), React.createElement("div", null, React.createElement("label", {
    className: "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1"
  }, "Edad (a\xF1os)"), React.createElement("input", {
    type: "number",
    min: "0",
    max: "120",
    className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white",
    placeholder: "Ej. 35",
    value: p.edad,
    onChange: e => set("edad", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1"
  }, "Estatura (cm) *"), React.createElement("input", {
    type: "number",
    min: "50",
    max: "250",
    className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white",
    placeholder: "170",
    value: p.estatura,
    onChange: e => set("estatura", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1"
  }, "Peso (kg)"), React.createElement("input", {
    type: "number",
    min: "0",
    max: "400",
    step: "0.1",
    className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white",
    placeholder: "Ej. 71.3",
    value: p.peso,
    onChange: e => set("peso", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1"
  }, "Cintura (cm)"), React.createElement("input", {
    type: "number",
    min: "0",
    max: "250",
    step: "0.5",
    className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white",
    placeholder: "Ej. 92",
    value: p.cintura,
    onChange: e => set("cintura", e.target.value)
  })), React.createElement("div", {
    className: "col-span-2 sm:col-span-4"
  }, React.createElement("label", {
    className: "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1"
  }, "Diagn\xF3sticos (toca para marcar)"), React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, DIAGNOSTICOS.map(d => {
    const on = (p.dx || []).indexOf(d) >= 0;
    return React.createElement("button", {
      key: d,
      type: "button",
      onClick: () => toggleDx(d),
      className: "text-xs px-2.5 py-1.5 rounded-full border transition-colors " + (on ? "bg-emerald-700 border-emerald-700 text-white" : "bg-white border-slate-300 text-slate-600 hover:border-emerald-400")
    }, on ? "✓ " : "", d);
  })), React.createElement("p", {
    className: "text-[11px] text-slate-400 mt-1"
  }, "Aparecen en el reporte PDF para tu m\xE9dico y dan contexto a tus mediciones.")), React.createElement("div", {
    className: "col-span-2 sm:col-span-3"
  }, React.createElement("label", {
    className: "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1"
  }, "Otros diagn\xF3sticos (opcional)"), React.createElement("input", {
    className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white",
    placeholder: "Ej. Migra\xF1a, artritis, gota\u2026",
    value: p.condiciones,
    onChange: e => set("condiciones", e.target.value)
  })), React.createElement("div", {
    className: "col-span-2"
  }, React.createElement("label", {
    className: "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1"
  }, "Alergias (opcional)"), React.createElement("input", {
    className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white",
    placeholder: "Ej. Penicilina",
    value: p.alergias,
    onChange: e => set("alergias", e.target.value)
  })), React.createElement("div", {
    className: "col-span-2"
  }, React.createElement("label", {
    className: "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1"
  }, "Contacto de emergencia (opcional)"), React.createElement("input", {
    className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white",
    placeholder: "Nombre y tel\xE9fono",
    value: p.contacto,
    onChange: e => set("contacto", e.target.value)
  }))), React.createElement("button", {
    onClick: guardar,
    className: "w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-2xl"
  }, "Guardar perfil"), React.createElement("div", {
    className: "flex gap-2 pt-1 border-t border-slate-100"
  }, React.createElement("button", {
    onClick: exportar,
    className: "flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 mt-2"
  }, React.createElement(IDownload, {
    cls: "w-4 h-4"
  }), " Descargar respaldo"), React.createElement("button", {
    onClick: () => fileRef.current && fileRef.current.click(),
    className: "flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 mt-2"
  }, React.createElement(IUpload, {
    cls: "w-4 h-4"
  }), " Restaurar respaldo"), React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: ".json",
    className: "hidden",
    onChange: importar
  })), React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "El respaldo descarga todos tus datos (medicamentos, inventario, mediciones y perfil) en un archivo. Gu\xE1rdalo para no perder nada si cambias de navegador o computadora.")));
}
function Salud({
  data,
  persist,
  avisar,
  hoy
}) {
  const vitals = data.vitals || {
    readings: [],
    horarios: null
  };
  const readings = vitals.readings || [];
  const horarios = vitals.horarios || Object.fromEntries(Object.keys(METRICAS).map(t => [t, METRICAS[t].horariosDefault]));
  const [tipo, setTipo] = useState("glucosa");
  const [guiaOpen, setGuiaOpen] = useState(false);
  const [horarioOpen, setHorarioOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [editRead, setEditRead] = useState(null);
  const [err, setErr] = useState(null);
  const estatura = data.perfil && Number(data.perfil.estatura) || null;
  const perfilS = data.perfil || {};
  const sexo = perfilS.sexo || "";
  const edadP = calcEdad(perfilS.fechaNac);
  const extraClin = {
    sexo,
    estatura,
    edad: edadP
  };
  const ahora = new Date();
  const horaActual = pad(ahora.getHours()) + ":" + pad(ahora.getMinutes());
  const [f, setF] = useState({
    a: "",
    b: "",
    pulso: "",
    ctx: CTX_GLUCOSA[0],
    fecha: hoy,
    hora: horaActual,
    notas: ""
  });
  const [nuevaHora, setNuevaHora] = useState("08:00");
  const [nuevoCtx, setNuevoCtx] = useState(CTX_GLUCOSA[0]);
  const [pdfDesde, setPdfDesde] = useState(addDays(hoy, -29));
  const [pdfHasta, setPdfHasta] = useState(hoy);
  const set = (k, v) => setF(p => ({
    ...p,
    [k]: v
  }));
  const esFuera = r => {
    if (r.tipo === "peso") {
      const c = clasIMC(r.a, estatura);
      return c ? c.dir !== null : false;
    }
    const c = clasificar(r.tipo, r.a, r.b, r.ctx, extraClin);
    return c ? !c.ok : false;
  };
  const exportarSaludPDF = () => {
    if (!(window.jspdf && window.jspdf.jsPDF)) {
      avisar("No se pudo cargar el generador de PDF. Revisa tu conexión a internet y recarga.");
      return;
    }
    const enRango = readings.filter(r => r.fecha >= pdfDesde && r.fecha <= pdfHasta);
    if (enRango.length === 0) {
      avisar("No hay mediciones en el rango de fechas seleccionado");
      return;
    }
    const {
      jsPDF
    } = window.jspdf;
    const doc = new jsPDF();
    const perfil = data.perfil || {};
    const edad = calcEdad(perfil.fechaNac);
    doc.setFontSize(16);
    doc.setTextColor(6, 78, 59);
    doc.text("Reporte de salud", 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    const linea1 = (perfil.nombre ? "Paciente: " + perfil.nombre : "Paciente") + (edad !== null ? "  ·  " + edad + " años" : "") + (perfil.sexo ? "  ·  " + perfil.sexo : "") + (estatura ? "  ·  Estatura: " + estatura + " cm" : "");
    doc.text(linea1, 14, 21);
    doc.text("Periodo: " + fmtDateLong(pdfDesde) + " — " + fmtDateLong(pdfHasta) + "  ·  Generado: " + fmtDateLong(todayStr()) + "  ·  MediControl", 14, 26);
    const dxTxt = [...(perfil.dx || []), perfil.condiciones].filter(Boolean).join(", ");
    if (dxTxt) doc.text("Diagnósticos: " + dxTxt, 14, 31);
    let y = dxTxt ? 37 : 33;
    Object.keys(METRICAS).forEach(t => {
      const m = METRICAS[t];
      const rows = enRango.filter(r => r.tipo === t).slice().sort((a, b) => a.fecha + a.hora < b.fecha + b.hora ? -1 : 1);
      if (rows.length === 0) return;
      if (y > 250) {
        doc.addPage();
        y = 15;
      }
      doc.setFontSize(12);
      doc.setTextColor(4, 120, 87);
      doc.text(m.label + " (" + m.unidad + ")", 14, y);
      const marca = rows.map(r => esFuera(r));
      const body = rows.map(r => {
        const c = t === "peso" ? clasIMC(r.a, estatura) : clasificar(t, r.a, r.b, r.ctx, extraClin);
        const val = t === "presion" ? r.a + "/" + r.b + (r.pulso ? "  ·  " + r.pulso + " lpm" : "") : t === "cintura" ? r.a + " cm" + (r.b ? "  ·  cadera " + r.b + " cm" : "") : t === "orina" ? NIVELES_ORINA[r.a - 1] ? NIVELES_ORINA[r.a - 1].label : String(r.a) : t === "heces" ? "Bristol " + r.a + (COLORES_HECES[r.b - 1] ? " · " + COLORES_HECES[r.b - 1].label : "") : String(r.a);
        const clas = c ? c.txt + (t === "peso" && c.imc ? " (IMC " + c.imc + ")" : "") : "—";
        return [fmtDate(r.fecha), fmt12(r.hora), val, r.ctx || "—", clas, r.notas || ""];
      });
      doc.autoTable({
        head: [["Fecha", "Hora", "Valor", "Contexto", "Clasificación", "Notas"]],
        body,
        startY: y + 2,
        styles: {
          fontSize: 8,
          cellPadding: 1.6
        },
        headStyles: {
          fillColor: [4, 120, 87],
          fontSize: 8
        },
        alternateRowStyles: {
          fillColor: [245, 250, 248]
        },
        didParseCell: d => {
          if (d.section === "body" && d.column.index === 4) {
            if (marca[d.row.index]) {
              d.cell.styles.textColor = [190, 18, 60];
              d.cell.styles.fontStyle = "bold";
            } else {
              d.cell.styles.textColor = [4, 120, 87];
            }
          }
        }
      });
      y = doc.lastAutoTable.finalY + 4;
      const vals = rows.map(r => r.a);
      const fuera = rows.filter(r => esFuera(r)).length;
      let resumen;
      if (t === "orina" || t === "heces") {
        const porDia = {};
        rows.forEach(r => {
          porDia[r.fecha] = (porDia[r.fecha] || 0) + 1;
        });
        const nDias = Object.keys(porDia).length;
        const promD = nDias ? Math.round(rows.length / nDias * 10) / 10 : 0;
        const maxD = Math.max(...Object.values(porDia));
        resumen = "Resumen: " + rows.length + " registros en " + nDias + " día(s)  ·  Frecuencia promedio: " + promD + " por día  ·  Máximo en un día: " + maxD + "  ·  Con dato de alerta: " + fuera + (fuera > 0 ? "  (marcados en rojo)" : "");
      } else {
        const promA = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10;
        resumen = "Resumen: " + rows.length + " mediciones  ·  Promedio: " + promA;
        if (t === "presion") {
          const promB = Math.round(rows.reduce((s, r) => s + r.b, 0) / rows.length * 10) / 10;
          resumen = "Resumen: " + rows.length + " mediciones  ·  Promedio: " + promA + "/" + promB;
        }
        resumen += "  ·  Mín: " + Math.min(...vals) + "  ·  Máx: " + Math.max(...vals) + "  ·  Fuera de rango: " + fuera + (fuera > 0 ? "  (marcadas en rojo)" : "");
      }
      doc.setFontSize(8);
      doc.setTextColor(fuera > 0 ? 190 : 60, fuera > 0 ? 18 : 60, fuera > 0 ? 60 : 60);
      doc.text(resumen, 14, y);
      y += 9;
    });
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("Rangos de referencia generales para adultos. Este reporte es informativo y no sustituye la valoración médica.", 14, y);
    doc.save("reporte-salud-" + pdfDesde + "-a-" + pdfHasta + ".pdf");
    avisar("Reporte de salud en PDF descargado");
  };
  const M = METRICAS[tipo];
  const guardarVitals = next => persist({
    ...data,
    vitals: next
  });
  const ctxDefault = t => t === "glucosa" ? CTX_GLUCOSA[0] : t === "fc" ? CTX_FC[0] : t === "sueno" ? CTX_SUENO[0] : t === "dolor" ? LOC_DOLOR[0] : t === "orina" ? CTX_ORINA[0] : t === "heces" ? CTX_HECES[0] : horarios[t] && horarios[t][0] ? horarios[t][0].ctx : "";
  const aDefault = t => t === "dolor" || t === "estres" ? "0" : t === "orina" ? "2" : t === "heces" ? "4" : "";
  const bDefault = t => t === "heces" ? "1" : "";
  const cambiarTipo = t => {
    setTipo(t);
    setErr(null);
    setEditRead(null);
    setF({
      a: aDefault(t),
      b: bDefault(t),
      pulso: "",
      ctx: ctxDefault(t),
      fecha: hoy,
      hora: pad(new Date().getHours()) + ":" + pad(new Date().getMinutes()),
      notas: ""
    });
  };
  const editarLectura = r => {
    setTipo(r.tipo);
    setEditRead(r.id);
    setErr(null);
    setF({
      a: r.a,
      b: r.b || "",
      pulso: r.pulso || "",
      ctx: r.ctx || ctxDefault(r.tipo),
      fecha: r.fecha,
      hora: r.hora,
      notas: r.notas || ""
    });
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };
  const registrar = () => {
    const num = f.a === "" ? NaN : Number(f.a);
    if (tipo === "presion") {
      if (!f.a || num <= 0) return setErr("Escribe la presión sistólica (número de arriba).");
      if (!f.b || Number(f.b) <= 0) return setErr("Escribe la presión diastólica (número de abajo).");
      if (num < 50 || num > 260 || Number(f.b) < 30 || Number(f.b) > 160) return setErr("Esos valores de presión están fuera de lo esperable (sistólica 50–260, diastólica 30–160). Verifica la medición.");
    } else if (tipo === "dolor" || tipo === "estres") {
      if (isNaN(num) || num < 0 || num > 10) return setErr("Selecciona un nivel de 0 a 10 con el control deslizante.");
    } else if (tipo === "orina") {
      if (!(num >= 1 && num <= 8)) return setErr("Selecciona el color observado.");
    } else if (tipo === "heces") {
      if (!(num >= 1 && num <= 7)) return setErr("Selecciona la forma según la escala de Bristol.");
      if (!(Number(f.b) >= 1 && Number(f.b) <= 7)) return setErr("Selecciona el color observado.");
    } else if (isNaN(num) || num <= 0) {
      return setErr("Escribe el valor de la medición.");
    }
    const rangos = {
      glucosa: [20, 600],
      peso: [20, 400],
      spo2: [50, 100],
      temp: [30, 45],
      fc: [20, 250],
      fr: [4, 60],
      cintura: [40, 200],
      cuello: [20, 70],
      sueno: [0.5, 24]
    };
    if (rangos[tipo] && !isNaN(num) && (num < rangos[tipo][0] || num > rangos[tipo][1])) return setErr("El valor " + num + " " + M.unidad + " está fuera de lo esperable (" + rangos[tipo][0] + "–" + rangos[tipo][1] + "). Verifica la medición o la unidad.");
    if (tipo === "cintura" && f.b && (Number(f.b) < 40 || Number(f.b) > 220)) return setErr("La cadera debe estar entre 40 y 220 cm, o déjala vacía.");
    setErr(null);
    const r = {
      id: editRead || uid(),
      tipo,
      fecha: f.fecha,
      hora: f.hora,
      a: Number(f.a === "" ? 0 : f.a),
      b: tipo === "presion" || tipo === "heces" ? Number(f.b) : tipo === "cintura" && f.b ? Number(f.b) : null,
      pulso: tipo === "presion" && f.pulso ? Number(f.pulso) : null,
      ctx: f.ctx || "",
      notas: f.notas.trim(),
      ts: new Date().toISOString()
    };
    const nuevas = editRead ? readings.map(x => x.id === editRead ? r : x) : [...readings, r];
    guardarVitals({
      ...vitals,
      readings: nuevas,
      horarios
    });
    const c = tipo === "peso" ? clasIMC(r.a, estatura) : clasificar(tipo, r.a, r.b, r.ctx, extraClin);
    avisar((editRead ? "Medición corregida" : "Medición registrada") + (c ? " · " + c.txt : ""));
    setEditRead(null);
    setF({
      ...f,
      a: aDefault(tipo),
      b: bDefault(tipo),
      pulso: "",
      notas: "",
      hora: pad(new Date().getHours()) + ":" + pad(new Date().getMinutes())
    });
  };
  const eliminarLectura = id => {
    guardarVitals({
      ...vitals,
      readings: readings.filter(r => r.id !== id),
      horarios
    });
    setConfirmDel(null);
    avisar("Medición eliminada");
  };
  const agregarHora = () => {
    const lista = horarios[tipo] || [];
    if (lista.some(h => h.hora === nuevaHora)) {
      avisar("Esa hora ya está en el horario");
      return;
    }
    const item = {
      hora: nuevaHora,
      ctx: tipo === "glucosa" ? nuevoCtx : f.ctx || ""
    };
    const next = {
      ...horarios,
      [tipo]: [...lista, item].sort((x, y) => timeToMin(x.hora) - timeToMin(y.hora))
    };
    guardarVitals({
      ...vitals,
      readings,
      horarios: next
    });
    avisar("Hora agregada al horario de medición");
  };
  const quitarHora = hora => {
    const next = {
      ...horarios,
      [tipo]: horarios[tipo].filter(h => h.hora !== hora)
    };
    guardarVitals({
      ...vitals,
      readings,
      horarios: next
    });
  };
  const lecturasHoy = readings.filter(r => r.tipo === tipo && r.fecha === hoy);
  const checklistHoy = (horarios[tipo] || []).map(h => {
    const done = lecturasHoy.some(r => circDist(timeToMin(r.hora), timeToMin(h.hora)) <= 120);
    return {
      ...h,
      done
    };
  });
  const delTipo = readings.filter(r => r.tipo === tipo).slice().sort((x, y) => x.fecha + x.hora < y.fecha + y.hora ? -1 : 1);
  const ultimas = delTipo.slice(-14);
  const ultima = delTipo[delTipo.length - 1];
  const hace7 = addDays(hoy, -6);
  const semana = delTipo.filter(r => r.fecha >= hace7);
  const prom = (arr, k) => arr.length ? Math.round(arr.reduce((s, r) => s + r[k], 0) / arr.length * 10) / 10 : null;
  const prevPeso = tipo === "peso" && delTipo.length > 1 ? delTipo[delTipo.length - 2] : null;
  const deltaPeso = prevPeso && ultima ? Math.round((ultima.a - prevPeso.a) * 10) / 10 : null;
  const inputCls = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white";
  const labelCls = "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1";
  return React.createElement("div", {
    className: "space-y-4"
  }, React.createElement(Perfil, {
    data: data,
    persist: persist,
    avisar: avisar
  }), readings.length > 0 && React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("div", {
    className: "flex flex-wrap items-end gap-3"
  }, React.createElement("div", {
    className: "flex items-center gap-2 font-bold text-slate-700 text-sm w-full sm:w-auto"
  }, React.createElement(IDownload, {
    cls: "w-4 h-4 text-emerald-700"
  }), " Reporte PDF para tu m\xE9dico"), React.createElement("div", null, React.createElement("label", {
    className: "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1"
  }, "Desde"), React.createElement("input", {
    type: "date",
    className: "rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white",
    value: pdfDesde,
    onChange: e => setPdfDesde(e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1"
  }, "Hasta"), React.createElement("input", {
    type: "date",
    className: "rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white",
    value: pdfHasta,
    onChange: e => setPdfHasta(e.target.value)
  })), React.createElement("button", {
    onClick: exportarSaludPDF,
    className: "bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5"
  }, React.createElement(IDownload, {
    cls: "w-4 h-4"
  }), " Exportar PDF")), React.createElement("p", {
    className: "text-xs text-slate-400 mt-2"
  }, "Incluye todas las m\xE9tricas registradas en el periodo (signos vitales, temperatura, medidas corporales, dolor, sue\xF1o, estr\xE9s, orina con frecuencia y color, y evacuaciones con escala de Bristol y color), con los datos de alerta resaltados en rojo y resumen por m\xE9trica. Es un registro objetivo muy \xFAtil para tu m\xE9dico.")), React.createElement("div", {
    className: "grid grid-cols-3 sm:grid-cols-4 gap-2"
  }, Object.keys(METRICAS).map(t => {
    const m = METRICAS[t];
    const activo = tipo === t;
    return React.createElement("button", {
      key: t,
      onClick: () => cambiarTipo(t),
      className: "rounded-2xl border p-3 flex flex-col items-center gap-1 transition-colors " + (activo ? "bg-emerald-700 border-emerald-700 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-emerald-300")
    }, React.createElement(m.Icon, {
      cls: "w-6 h-6 " + (activo ? "text-white" : m.color)
    }), React.createElement("span", {
      className: "text-xs font-semibold text-center leading-tight"
    }, m.label));
  })), checklistHoy.length > 0 && React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("div", {
    className: "text-xs font-bold uppercase tracking-wide text-slate-500 mb-2"
  }, "Mediciones de ", M.label.toLowerCase(), " para hoy"), React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, checklistHoy.map(h => React.createElement("button", {
    key: h.hora,
    onClick: () => {
      if (!h.done) setF({
        ...f,
        hora: h.hora,
        ctx: h.ctx || f.ctx
      });
    },
    className: "inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border " + (h.done ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-300 text-slate-600 hover:border-emerald-400")
  }, h.done ? React.createElement(ICheckCircle, {
    cls: "w-4 h-4"
  }) : React.createElement(IClock, {
    cls: "w-4 h-4"
  }), fmt12(h.hora), h.ctx ? " · " + h.ctx : ""))), React.createElement("p", {
    className: "text-xs text-slate-400 mt-1.5"
  }, "Toca una medici\xF3n pendiente para prellenar el registro con esa hora y contexto.")), React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
  }, React.createElement("h2", {
    className: "font-bold text-slate-700 flex items-center gap-2"
  }, React.createElement(M.Icon, {
    cls: "w-5 h-5 " + M.color
  }), " ", editRead ? "Corregir medición de " : "Registrar ", M.label.toLowerCase()), editRead && React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between text-sm"
  }, React.createElement("span", {
    className: "text-amber-800 font-medium flex items-center gap-1.5"
  }, React.createElement(IEdit, {
    cls: "w-4 h-4"
  }), " Editando una medici\xF3n existente"), React.createElement("button", {
    onClick: () => cambiarTipo(tipo),
    className: "text-xs px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-800"
  }, "Cancelar")), React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-3"
  }, tipo === "presion" && React.createElement(React.Fragment, null, React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Sist\xF3lica (arriba)"), React.createElement("input", {
    type: "number",
    min: "1",
    className: inputCls,
    placeholder: "120",
    value: f.a,
    onChange: e => set("a", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Diast\xF3lica (abajo)"), React.createElement("input", {
    type: "number",
    min: "1",
    className: inputCls,
    placeholder: "80",
    value: f.b,
    onChange: e => set("b", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Pulso (opcional)"), React.createElement("input", {
    type: "number",
    min: "1",
    className: inputCls,
    placeholder: "72",
    value: f.pulso,
    onChange: e => set("pulso", e.target.value)
  }))), tipo === "cintura" && React.createElement(React.Fragment, null, React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Cintura (cm)"), React.createElement("input", {
    type: "number",
    min: "1",
    step: "0.5",
    className: inputCls,
    placeholder: "92",
    value: f.a,
    onChange: e => set("a", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Cadera (cm) \xB7 opcional"), React.createElement("input", {
    type: "number",
    min: "1",
    step: "0.5",
    className: inputCls,
    placeholder: "100",
    value: f.b,
    onChange: e => set("b", e.target.value)
  }))), tipo === "fc" && React.createElement(React.Fragment, null, React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Latidos por minuto"), React.createElement("input", {
    type: "number",
    min: "1",
    className: inputCls,
    placeholder: "72",
    value: f.a,
    onChange: e => set("a", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Contexto"), React.createElement("select", {
    className: inputCls,
    value: f.ctx,
    onChange: e => set("ctx", e.target.value)
  }, CTX_FC.map(c => React.createElement("option", {
    key: c
  }, c))))), tipo === "sueno" && React.createElement(React.Fragment, null, React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Horas dormidas"), React.createElement("input", {
    type: "number",
    min: "0",
    max: "24",
    step: "0.5",
    className: inputCls,
    placeholder: "7.5",
    value: f.a,
    onChange: e => set("a", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "\xBFC\xF3mo despertaste?"), React.createElement("select", {
    className: inputCls,
    value: f.ctx,
    onChange: e => set("ctx", e.target.value)
  }, CTX_SUENO.map(c => React.createElement("option", {
    key: c
  }, c))))), (tipo === "dolor" || tipo === "estres") && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "col-span-2"
  }, React.createElement("label", {
    className: labelCls
  }, tipo === "dolor" ? "Intensidad del dolor ahora" : "Nivel de estrés del día", ": ", React.createElement("span", {
    className: "text-emerald-700 text-sm"
  }, f.a === "" ? 0 : f.a, " / 10")), React.createElement("input", {
    type: "range",
    min: "0",
    max: "10",
    step: "1",
    className: "w-full accent-emerald-700",
    value: f.a === "" ? 0 : f.a,
    onChange: e => set("a", e.target.value)
  }), React.createElement("div", {
    className: "flex justify-between text-[10px] text-slate-400"
  }, React.createElement("span", null, tipo === "dolor" ? "0 · sin dolor" : "0 · nada"), React.createElement("span", null, tipo === "dolor" ? "10 · el peor imaginable" : "10 · máximo"))), tipo === "dolor" && React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "\xBFD\xF3nde duele?"), React.createElement("select", {
    className: inputCls,
    value: f.ctx,
    onChange: e => set("ctx", e.target.value)
  }, LOC_DOLOR.map(c => React.createElement("option", {
    key: c
  }, c))))), tipo === "orina" && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "col-span-2"
  }, React.createElement("label", {
    className: labelCls
  }, "Color observado"), React.createElement("select", {
    className: inputCls,
    value: f.a,
    onChange: e => set("a", e.target.value)
  }, NIVELES_ORINA.map(n => React.createElement("option", {
    key: n.v,
    value: n.v
  }, n.label)))), React.createElement("div", {
    className: "col-span-2"
  }, React.createElement("label", {
    className: labelCls
  }, "Molestias al orinar"), React.createElement("select", {
    className: inputCls,
    value: f.ctx,
    onChange: e => set("ctx", e.target.value)
  }, CTX_ORINA.map(c => React.createElement("option", {
    key: c
  }, c))))), tipo === "heces" && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "col-span-2"
  }, React.createElement("label", {
    className: labelCls
  }, "Forma (escala de Bristol)"), React.createElement("select", {
    className: inputCls,
    value: f.a,
    onChange: e => set("a", e.target.value)
  }, BRISTOL.map(n => React.createElement("option", {
    key: n.v,
    value: n.v
  }, n.label)))), React.createElement("div", {
    className: "col-span-2"
  }, React.createElement("label", {
    className: labelCls
  }, "Color observado"), React.createElement("select", {
    className: inputCls,
    value: f.b,
    onChange: e => set("b", e.target.value)
  }, COLORES_HECES.map(n => React.createElement("option", {
    key: n.v,
    value: n.v
  }, n.label)))), React.createElement("div", {
    className: "col-span-2"
  }, React.createElement("label", {
    className: labelCls
  }, "Molestias"), React.createElement("select", {
    className: inputCls,
    value: f.ctx,
    onChange: e => set("ctx", e.target.value)
  }, CTX_HECES.map(c => React.createElement("option", {
    key: c
  }, c))))), ["glucosa", "peso", "spo2", "temp", "fr", "cuello"].indexOf(tipo) >= 0 && React.createElement("div", {
    className: tipo === "glucosa" ? "" : "col-span-2"
  }, React.createElement("label", {
    className: labelCls
  }, "Valor (", M.unidad, ")"), React.createElement("input", {
    type: "number",
    min: "1",
    step: tipo === "peso" || tipo === "temp" || tipo === "cuello" ? "0.1" : "1",
    className: inputCls,
    placeholder: PLACE_VALOR[tipo],
    value: f.a,
    onChange: e => set("a", e.target.value)
  })), tipo === "glucosa" && React.createElement("div", {
    className: "col-span-2 sm:col-span-1"
  }, React.createElement("label", {
    className: labelCls
  }, "Contexto de alimento"), React.createElement("select", {
    className: inputCls,
    value: f.ctx,
    onChange: e => set("ctx", e.target.value)
  }, CTX_GLUCOSA.map(c => React.createElement("option", {
    key: c
  }, c)))), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Fecha"), React.createElement("input", {
    type: "date",
    className: inputCls,
    value: f.fecha,
    onChange: e => set("fecha", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Hora"), React.createElement("input", {
    type: "time",
    className: inputCls,
    value: f.hora,
    onChange: e => set("hora", e.target.value)
  }))), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Notas (opcional)"), React.createElement("input", {
    className: inputCls,
    placeholder: NOTAS_PH[tipo] || "Ej. Después de caminar, con dolor de cabeza…",
    value: f.notas,
    onChange: e => set("notas", e.target.value)
  })), err && React.createElement("div", {
    className: "bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-3 py-2.5 flex items-center gap-2"
  }, React.createElement(IWarn, {
    cls: "w-4 h-4 shrink-0"
  }), " ", err), React.createElement("button", {
    onClick: registrar,
    className: "w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"
  }, React.createElement(IPlus, {
    cls: "w-5 h-5"
  }), " ", editRead ? "Guardar corrección" : "Guardar medición")), React.createElement("section", {
    className: "bg-sky-50 rounded-2xl border border-sky-100 p-4"
  }, React.createElement("button", {
    onClick: () => setGuiaOpen(!guiaOpen),
    className: "w-full flex items-center justify-between text-sky-900"
  }, React.createElement("span", {
    className: "font-semibold text-sm flex items-center gap-2"
  }, React.createElement(ISteth, {
    cls: "w-4 h-4"
  }), " C\xF3mo medir correctamente"), guiaOpen ? React.createElement(IChevD, {
    cls: "w-4 h-4"
  }) : React.createElement(IChevR, {
    cls: "w-4 h-4"
  })), guiaOpen && React.createElement("p", {
    className: "text-sm text-sky-900 mt-2"
  }, M.guia)), React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("button", {
    onClick: () => setHorarioOpen(!horarioOpen),
    className: "w-full flex items-center justify-between"
  }, React.createElement("span", {
    className: "font-bold text-slate-700 text-sm flex items-center gap-2"
  }, React.createElement(IClock, {
    cls: "w-4 h-4 text-emerald-700"
  }), " Horario de medici\xF3n (", (horarios[tipo] || []).length, " al d\xEDa)"), horarioOpen ? React.createElement(IChevD, {
    cls: "w-4 h-4 text-slate-400"
  }) : React.createElement(IChevR, {
    cls: "w-4 h-4 text-slate-400"
  })), horarioOpen && React.createElement("div", {
    className: "mt-3 space-y-3"
  }, React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, (horarios[tipo] || []).map(h => React.createElement("span", {
    key: h.hora,
    className: "inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-3 py-1 rounded-full"
  }, fmt12(h.hora), h.ctx ? " · " + h.ctx : "", React.createElement("button", {
    onClick: () => quitarHora(h.hora),
    className: "hover:text-rose-600"
  }, React.createElement(IX, {
    cls: "w-3.5 h-3.5"
  })))), (horarios[tipo] || []).length === 0 && React.createElement("span", {
    className: "text-sm text-slate-400"
  }, "Sin horas programadas.")), React.createElement("div", {
    className: "flex flex-wrap gap-2 items-end"
  }, React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Nueva hora"), React.createElement("input", {
    type: "time",
    className: inputCls,
    value: nuevaHora,
    onChange: e => setNuevaHora(e.target.value)
  })), tipo === "glucosa" && React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Contexto"), React.createElement("select", {
    className: inputCls,
    value: nuevoCtx,
    onChange: e => setNuevoCtx(e.target.value)
  }, CTX_GLUCOSA.map(c => React.createElement("option", {
    key: c
  }, c)))), React.createElement("button", {
    onClick: agregarHora,
    className: "bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5"
  }, React.createElement(IPlus, {
    cls: "w-4 h-4"
  }), " Agregar")), React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "Medir siempre a las mismas horas es lo que permite comparar d\xEDas y detectar patrones reales."))), tipo === "peso" && ultima && (estatura ? (() => {
    const c = clasIMC(ultima.a, estatura);
    const rango = rangoPesoSaludable(estatura);
    const exceso = Math.round((ultima.a - rango[1]) * 10) / 10;
    const falta = Math.round((rango[0] - ultima.a) * 10) / 10;
    const kg = c.dir === "bajar" ? exceso : c.dir === "subir" ? falta : 0;
    const semanas = kg > 0 ? Math.ceil(kg / 0.5) : 0;
    return React.createElement("section", {
      className: "rounded-2xl border p-4 " + (c.dir ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200")
    }, React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, React.createElement("span", {
      className: "font-bold text-slate-800"
    }, "IMC: ", c.imc), React.createElement("span", {
      className: "text-xs px-2 py-0.5 rounded-full border " + c.cls
    }, c.txt), React.createElement("span", {
      className: "text-xs text-slate-500"
    }, "Rango saludable para tu estatura (", estatura, " cm): ", React.createElement("b", null, rango[0], " \u2013 ", rango[1], " kg"))), c.dir ? React.createElement("div", {
      className: "text-sm text-slate-700 mt-2 space-y-1"
    }, React.createElement("p", null, React.createElement("b", null, "Objetivo sugerido:"), " ", c.dir === "bajar" ? "bajar" : "subir", " aproximadamente ", React.createElement("b", null, kg, " kg"), " para entrar al rango saludable. A un ritmo seguro de 0.5 kg por semana, eso tomar\xEDa alrededor de ", React.createElement("b", null, semanas, " semanas (", semanas * 7, " d\xEDas)"), "."), React.createElement("p", {
      className: "text-xs text-slate-600"
    }, c.dir === "bajar" ? "Sugerencias generales: prioriza verduras, frutas y proteína magra; reduce bebidas azucaradas, frituras y ultraprocesados; procura 150 minutos de actividad moderada a la semana (caminar cuenta) y duerme 7-8 horas. Pésate a la misma hora para ver la tendencia real." : "Sugerencias generales: aumenta la frecuencia de comidas con alimentos densos en nutrientes (avena, frutos secos, aguacate, lácteos, proteína); acompaña con ejercicio de fuerza para ganar masa muscular y no solo grasa."), React.createElement("p", {
      className: "text-xs text-slate-400"
    }, "Estas metas son orientativas y basadas en el IMC; tu m\xE9dico puede ajustar el objetivo seg\xFAn tu composici\xF3n corporal y condiciones.")) : React.createElement("p", {
      className: "text-sm text-emerald-800 mt-1.5"
    }, "Est\xE1s dentro del rango saludable. Mant\xE9n tus h\xE1bitos y contin\xFAa monitoreando a la misma hora para detectar cambios de tendencia a tiempo."));
  })() : React.createElement("section", {
    className: "bg-amber-50 rounded-2xl border border-amber-200 p-4 text-sm text-amber-800 flex items-center gap-2"
  }, React.createElement(IWarn, {
    cls: "w-4 h-4 shrink-0"
  }), " Para calcular tu IMC e indicarte si est\xE1s en peso normal, sobrepeso o bajo peso, completa tu ", React.createElement("b", null, "estatura"), " en el Perfil del paciente (arriba).")), (tipo === "cintura" || tipo === "cuello") && ultima && (sexo ? (() => {
    const c = clasificar(tipo, ultima.a, ultima.b, ultima.ctx, extraClin);
    const icc = tipo === "cintura" && ultima.b ? Math.round(ultima.a / ultima.b * 100) / 100 : null;
    const limIcc = sexo === "Hombre" ? 0.90 : 0.85;
    const ice = tipo === "cintura" && estatura ? Math.round(ultima.a / estatura * 100) / 100 : null;
    return React.createElement("section", {
      className: "rounded-2xl border p-4 " + (c && c.ok ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200")
    }, React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, React.createElement("span", {
      className: "font-bold text-slate-800"
    }, M.label, ": ", ultima.a, " cm"), c && React.createElement("span", {
      className: "text-xs px-2 py-0.5 rounded-full border " + c.cls
    }, c.txt), React.createElement("span", {
      className: "text-xs text-slate-500"
    }, tipo === "cintura" ? sexo === "Hombre" ? "Meta: 90 cm o menos" : "Meta: 80 cm o menos" : sexo === "Hombre" ? "Referencia: menos de 40 cm" : "Referencia: menos de 36 cm")), tipo === "cintura" && (icc !== null || ice !== null) && React.createElement("div", {
      className: "grid sm:grid-cols-2 gap-2 mt-2 text-xs"
    }, icc !== null && React.createElement("div", {
      className: "rounded-xl border px-3 py-2 bg-white " + (icc >= limIcc ? "border-amber-300 text-amber-800" : "border-emerald-200 text-emerald-800")
    }, React.createElement("b", null, "\xCDndice cintura-cadera: ", icc), " \xB7 ", icc >= limIcc ? "riesgo cardiometabólico aumentado" : "dentro de lo recomendable", " (l\xEDmite ", sexo === "Hombre" ? "0.90" : "0.85", ")."), ice !== null && React.createElement("div", {
      className: "rounded-xl border px-3 py-2 bg-white " + (ice >= 0.5 ? "border-amber-300 text-amber-800" : "border-emerald-200 text-emerald-800")
    }, React.createElement("b", null, "\xCDndice cintura-estatura: ", ice), " \xB7 ", ice < 0.5 ? "saludable" : ice < 0.6 ? "riesgo aumentado" : "riesgo alto", ". Regla simple: tu cintura debe medir menos de la mitad de tu estatura.")), tipo === "cintura" && !ultima.b && React.createElement("p", {
      className: "text-[11px] text-slate-500 mt-2"
    }, "Consejo: registra tambi\xE9n la cadera para calcular tu \xEDndice cintura-cadera, un predictor de riesgo cardiovascular mejor que la cintura sola."), tipo === "cuello" && React.createElement("p", {
      className: "text-xs text-slate-600 mt-1.5"
    }, "Un cuello por arriba de la referencia se asocia con mayor riesgo cardiometab\xF3lico y de apnea del sue\xF1o (ronquido con pausas al respirar). Si adem\xE1s roncas fuerte o despiertas cansado, com\xE9ntalo con tu m\xE9dico."));
  })() : React.createElement("section", {
    className: "bg-amber-50 rounded-2xl border border-amber-200 p-4 text-sm text-amber-800 flex items-center gap-2"
  }, React.createElement(IWarn, {
    cls: "w-4 h-4 shrink-0"
  }), " Para interpretar esta medida indica tu ", React.createElement("b", null, "sexo"), " en el Perfil del paciente (los l\xEDmites de referencia son distintos para hombres y mujeres).")), tipo === "fc" && (edadP !== null ? (() => {
    const fcMax = 220 - edadP;
    const zMod = [Math.round(fcMax * 0.64), Math.round(fcMax * 0.76)];
    const zVig = [Math.round(fcMax * 0.77), Math.round(fcMax * 0.93)];
    return React.createElement("section", {
      className: "bg-white rounded-2xl border border-slate-200 p-4"
    }, React.createElement("div", {
      className: "font-bold text-slate-800 text-sm mb-2"
    }, "Tus zonas de frecuencia cardiaca (", edadP, " a\xF1os)"), React.createElement("div", {
      className: "grid grid-cols-3 gap-2 text-center text-xs"
    }, React.createElement("div", {
      className: "rounded-xl border border-slate-200 bg-slate-50 p-2.5"
    }, React.createElement("div", {
      className: "text-lg font-extrabold text-slate-800"
    }, fcMax), React.createElement("div", {
      className: "text-slate-500 mt-0.5"
    }, "FC m\xE1xima estimada (220 \u2212 edad)")), React.createElement("div", {
      className: "rounded-xl border border-emerald-200 bg-emerald-50 p-2.5"
    }, React.createElement("div", {
      className: "text-lg font-extrabold text-emerald-800"
    }, zMod[0], "\u2013", zMod[1]), React.createElement("div", {
      className: "text-emerald-700 mt-0.5"
    }, "Zona de ejercicio moderado (64\u201376%)")), React.createElement("div", {
      className: "rounded-xl border border-amber-200 bg-amber-50 p-2.5"
    }, React.createElement("div", {
      className: "text-lg font-extrabold text-amber-800"
    }, zVig[0], "\u2013", zVig[1]), React.createElement("div", {
      className: "text-amber-700 mt-0.5"
    }, "Zona de ejercicio vigoroso (77\u201393%)"))), React.createElement("p", {
      className: "text-xs text-slate-400 mt-2"
    }, "La clasificaci\xF3n (normal 60\u2013100 lpm) aplica solo a mediciones en reposo. Una FC en reposo consistentemente mayor a 100, o menor a 50 con mareo o fatiga, amerita valoraci\xF3n m\xE9dica."));
  })() : React.createElement("section", {
    className: "bg-amber-50 rounded-2xl border border-amber-200 p-4 text-sm text-amber-800 flex items-center gap-2"
  }, React.createElement(IWarn, {
    cls: "w-4 h-4 shrink-0"
  }), " Completa tu ", React.createElement("b", null, "fecha de nacimiento"), " en el Perfil para calcular tu FC m\xE1xima y tus zonas de entrenamiento.")), tipo === "dolor" && ultima && ultima.a > 0 && React.createElement("section", {
    className: "rounded-2xl border p-4 text-sm " + (ultima.ctx === "Pecho" || ultima.a >= 7 ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-sky-50 border-sky-100 text-sky-900")
  }, ultima.ctx === "Pecho" ? React.createElement("p", null, React.createElement("b", null, "\u26A0\uFE0F Dolor de pecho:"), " si es opresivo, aparece con el esfuerzo, o se acompa\xF1a de falta de aire, sudoraci\xF3n fr\xEDa, n\xE1usea o se corre al brazo izquierdo o la mand\xEDbula, ", React.createElement("b", null, "busca atenci\xF3n m\xE9dica de inmediato"), ". No esperes a que pase.") : ultima.a >= 7 ? React.createElement("p", null, React.createElement("b", null, "Dolor severo (", ultima.a, "/10):"), " un dolor de esta intensidad \u2014sobre todo si es nuevo, no cede con tu analg\xE9sico habitual o dura m\xE1s de 24\u201348 h\u2014 amerita valoraci\xF3n m\xE9dica.") : React.createElement("p", null, React.createElement("b", null, "Consejo:"), " registra el dolor a horas similares y anota qu\xE9 lo mejora o empeora. La tendencia y los detonantes le sirven m\xE1s a tu m\xE9dico que un valor aislado.")), tipo === "sueno" && semana.length >= 3 && (() => {
    const promS = prom(semana, "a");
    return React.createElement("section", {
      className: "rounded-2xl border p-4 text-sm " + (promS >= 7 && promS <= 9 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900")
    }, React.createElement("b", null, "Promedio de la semana: ", promS, " h."), " ", promS >= 7 && promS <= 9 ? "Estás en el rango recomendado para adultos (7–9 h). Mantén horarios regulares de dormir y despertar para conservarlo." : promS < 7 ? "Estás por debajo de las 7–9 h recomendadas. Dormir poco de forma sostenida se asocia con más apetito, glucosa y presión más difíciles de controlar y peor estado de ánimo. Prueba adelantar tu hora de dormir 30 min y evitar pantallas y cafeína en la tarde-noche." : "Duermes más de 9 h en promedio; si aun así despiertas cansado, coméntalo con tu médico.");
  })(), tipo === "estres" && semana.length >= 3 && prom(semana, "a") >= 7 && React.createElement("section", {
    className: "rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
  }, React.createElement("b", null, "Tu estr\xE9s promedio de la semana es alto (", prom(semana, "a"), "/10)."), " El estr\xE9s sostenido eleva la presi\xF3n y la glucosa, y deteriora el sue\xF1o. Prueba respiraci\xF3n 4-7-8 (inhala 4 s, sost\xE9n 7 s, exhala 8 s, 4 ciclos), camina 20\u201330 min al d\xEDa y cuida tu horario de sue\xF1o. Si se mantiene alto o interfiere con tu vida diaria, buscar apoyo profesional es una decisi\xF3n inteligente."), (tipo === "orina" || tipo === "heces") && (() => {
    const hoyN = delTipo.filter(r => r.fecha === hoy).length;
    const dias7 = {};
    semana.forEach(r => {
      dias7[r.fecha] = (dias7[r.fecha] || 0) + 1;
    });
    const diasConReg = Object.keys(dias7).length;
    const promDia = diasConReg ? Math.round(semana.length / diasConReg * 10) / 10 : null;
    const noct = tipo === "orina" ? delTipo.filter(r => r.fecha === hoy && (r.ctx || "").indexOf("nicturia") >= 0).length : 0;
    const liqHoy = tipo === "heces" ? delTipo.filter(r => r.fecha === hoy && r.a >= 6).length : 0;
    const sem7 = semana.length;
    let fr = null;
    if (tipo === "orina") {
      if (hoyN === 0) fr = null;else if (hoyN > 8) fr = {
        txt: "Frecuencia aumentada (más de 8 hoy)",
        cls: "bg-amber-100 text-amber-700 border-amber-200"
      };else if (hoyN >= 4) fr = {
        txt: "Frecuencia normal (4–8 al día)",
        cls: "bg-emerald-100 text-emerald-700 border-emerald-200"
      };else fr = {
        txt: "Pocas micciones hasta ahora",
        cls: "bg-sky-100 text-sky-700 border-sky-200"
      };
    } else {
      if (hoyN === 0) fr = null;else if (hoyN > 3) fr = {
        txt: "Más de 3 al día: frecuencia aumentada",
        cls: "bg-amber-100 text-amber-700 border-amber-200"
      };else fr = {
        txt: "Frecuencia dentro de lo normal (hasta 3 al día)",
        cls: "bg-emerald-100 text-emerald-700 border-emerald-200"
      };
    }
    return React.createElement("section", {
      className: "bg-white rounded-2xl border border-slate-200 p-4"
    }, React.createElement("div", {
      className: "text-xs font-bold uppercase tracking-wide text-slate-500 mb-2"
    }, "Frecuencia \u2014 registra cada ", tipo === "orina" ? "micción" : "evacuación", " y este conteo se calcula solo"), React.createElement("div", {
      className: "grid grid-cols-3 gap-3 text-center"
    }, React.createElement("div", null, React.createElement("div", {
      className: "text-2xl font-extrabold text-slate-800"
    }, hoyN), React.createElement("div", {
      className: "text-xs text-slate-500"
    }, "Veces hoy")), React.createElement("div", null, React.createElement("div", {
      className: "text-2xl font-extrabold text-slate-800"
    }, promDia ?? "—"), React.createElement("div", {
      className: "text-xs text-slate-500"
    }, "Promedio por d\xEDa (\xFAltimos 7 d\xEDas)")), React.createElement("div", null, React.createElement("div", {
      className: "text-2xl font-extrabold text-slate-800"
    }, sem7), React.createElement("div", {
      className: "text-xs text-slate-500"
    }, "Total en 7 d\xEDas"))), React.createElement("div", {
      className: "flex flex-wrap gap-1.5 mt-3"
    }, fr && React.createElement("span", {
      className: "text-xs px-2 py-0.5 rounded-full border " + fr.cls
    }, fr.txt), tipo === "orina" && noct > 0 && React.createElement("span", {
      className: "text-xs px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200"
    }, "\uD83C\uDF19 ", noct, " vez(es) en la noche (nicturia)"), tipo === "heces" && liqHoy >= 3 && React.createElement("span", {
      className: "text-xs px-2 py-0.5 rounded-full border bg-rose-100 text-rose-700 border-rose-200"
    }, "\uD83D\uDCA7 ", liqHoy, " evacuaciones l\xEDquidas hoy \u2014 toma suero oral"), tipo === "heces" && sem7 > 0 && sem7 < 3 && diasConReg >= 5 && React.createElement("span", {
      className: "text-xs px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200"
    }, "Menos de 3 por semana: estre\xF1imiento")), React.createElement("p", {
      className: "text-[11px] text-slate-400 mt-2"
    }, tipo === "orina" ? "Referencia: 4–8 micciones al día es lo normal en adultos. Más de 8, ardor, urgencia o despertar varias veces en la noche son datos importantes para tu médico." : "Referencia: de 3 veces por semana a 3 veces por día es normal. Más de 3 al día sugiere diarrea; con fiebre, sangre o más de 6 al día, busca atención médica."));
  })(), tipo === "orina" && ultima && ultima.a >= 6 && React.createElement("section", {
    className: "rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
  }, ultima.a === 6 && React.createElement("p", null, React.createElement("b", null, "\u26A0\uFE0F Orina caf\xE9 oscura (coluria):"), " puede indicar bilirrubina elevada por un problema del h\xEDgado o v\xEDas biliares, en especial si se acompa\xF1a de ojos o piel amarillos, heces p\xE1lidas o comez\xF3n. No es un dato para esperar: ", React.createElement("b", null, "com\xE9ntalo con tu m\xE9dico pronto"), " y lleva este registro."), ultima.a === 7 && React.createElement("p", null, React.createElement("b", null, "\uD83D\uDEA8 Posible sangre en la orina:"), " amerita valoraci\xF3n m\xE9dica ", React.createElement("b", null, "hoy mismo"), ", sobre todo si tienes plaquetas bajas, fiebre o dolor. Antes de alarmarte verifica si comiste betabel o tomaste alg\xFAn medicamento que pinte la orina, y an\xF3talo."), ultima.a === 8 && React.createElement("p", null, React.createElement("b", null, "\u26A0\uFE0F Orina turbia o con espuma persistente:"), " puede indicar infecci\xF3n urinaria (m\xE1s probable si hay ardor, urgencia o mal olor) o prote\xEDnas en la orina. Si se repite, solicita a tu m\xE9dico un examen general de orina.")), tipo === "heces" && ultima && (ultima.b === 6 || ultima.b === 7 || ultima.b === 5 || ultima.a === 7) && React.createElement("section", {
    className: "rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 space-y-1.5"
  }, ultima.b === 6 && React.createElement("p", null, React.createElement("b", null, "\uD83D\uDEA8 Heces negras alquitranadas (melena):"), " son un dato de ", React.createElement("b", null, "posible sangrado del tubo digestivo alto"), " (est\xF3mago o duodeno). Con antecedente de gastritis erosiva o plaquetas bajas es una ", React.createElement("b", null, "urgencia: acude a un servicio m\xE9dico de inmediato"), ", no esperes a la siguiente evacuaci\xF3n. Nota: el hierro en pastillas y el bismuto (Pepto-Bismol) tambi\xE9n oscurecen las heces, pero sin el olor f\xE9tido caracter\xEDstico; an\xF3talo si los tomaste."), ultima.b === 7 && React.createElement("p", null, React.createElement("b", null, "\uD83D\uDEA8 Sangre roja visible:"), " puede venir de hemorroides o fisuras, pero tambi\xE9n de sangrado intestinal. ", React.createElement("b", null, "Busca valoraci\xF3n m\xE9dica hoy"), ", sobre todo si es abundante, se repite, o hay mareo, palidez o dolor abdominal."), ultima.b === 5 && React.createElement("p", null, React.createElement("b", null, "\u26A0\uFE0F Heces p\xE1lidas o blanquecinas (acolia):"), " sugieren que la bilis no est\xE1 llegando al intestino (h\xEDgado o v\xEDa biliar). Si adem\xE1s la orina est\xE1 oscura o la piel/ojos se ven amarillos, ", React.createElement("b", null, "consulta a tu m\xE9dico pronto"), "."), ultima.a === 7 && ultima.b !== 6 && ultima.b !== 7 && React.createElement("p", null, React.createElement("b", null, "Diarrea l\xEDquida:"), " hidr\xE1tate con suero oral (Vida Suero Oral) a peque\xF1os tragos frecuentes y dieta blanda. Busca atenci\xF3n si hay fiebre, sangre, m\xE1s de 6 evacuaciones al d\xEDa o dura m\xE1s de 2\u20133 d\xEDas.")), delTipo.length > 0 && React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("div", {
    className: "grid grid-cols-3 gap-3 mb-2"
  }, React.createElement("div", {
    className: "text-center"
  }, React.createElement("div", {
    className: "text-xl font-extrabold text-slate-800"
  }, ultima ? tipo === "presion" ? ultima.a + "/" + ultima.b : ultima.a : "—", React.createElement("span", {
    className: "text-xs font-medium text-slate-400"
  }, " ", M.unidad)), React.createElement("div", {
    className: "text-xs text-slate-500"
  }, "\xDAltima (", ultima ? fmtDate(ultima.fecha) : "", ")")), React.createElement("div", {
    className: "text-center"
  }, React.createElement("div", {
    className: "text-xl font-extrabold text-slate-800"
  }, tipo === "presion" ? (prom(semana, "a") || "—") + "/" + (prom(semana, "b") || "—") : tipo === "orina" || tipo === "heces" ? semana.length : prom(semana, "a") ?? "—", React.createElement("span", {
    className: "text-xs font-medium text-slate-400"
  }, " ", tipo === "orina" || tipo === "heces" ? "veces" : M.unidad)), React.createElement("div", {
    className: "text-xs text-slate-500"
  }, tipo === "orina" || tipo === "heces" ? "Registros en 7 días" : "Promedio 7 días (" + semana.length + " med.)")), React.createElement("div", {
    className: "text-center"
  }, tipo === "peso" && deltaPeso !== null ? React.createElement(React.Fragment, null, React.createElement("div", {
    className: "text-xl font-extrabold " + (deltaPeso > 0 ? "text-amber-600" : deltaPeso < 0 ? "text-emerald-700" : "text-slate-800")
  }, deltaPeso > 0 ? "+" : "", deltaPeso, " kg"), React.createElement("div", {
    className: "text-xs text-slate-500"
  }, "vs. medici\xF3n anterior")) : React.createElement(React.Fragment, null, React.createElement("div", {
    className: "text-xl font-extrabold text-slate-800"
  }, delTipo.length), React.createElement("div", {
    className: "text-xs text-slate-500"
  }, "Mediciones totales")))), ultimas.length >= 2 && React.createElement(React.Fragment, null, React.createElement(Sparkline, {
    puntos: ultimas.map(r => r.a),
    puntos2: tipo === "presion" ? ultimas.map(r => r.b) : null,
    unidad: M.unidad,
    fechas: ultimas.map(r => r.fecha),
    banda: tipo === "peso" ? estatura ? rangoPesoSaludable(estatura) : null : BANDAS_REF[tipo] || null
  }), React.createElement("div", {
    className: "text-xs text-slate-400 text-center"
  }, "Tendencia de las \xFAltimas ", ultimas.length, " mediciones", tipo === "presion" ? " (verde: sistólica · gris punteada: diastólica)" : ""))), React.createElement("section", null, React.createElement("h2", {
    className: "text-sm font-bold uppercase tracking-wide text-slate-500 mb-2"
  }, "Historial de ", M.label.toLowerCase()), delTipo.length === 0 ? React.createElement("div", {
    className: "bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400"
  }, "A\xFAn no hay mediciones de ", M.label.toLowerCase(), ". Registra la primera arriba.") : React.createElement("div", {
    className: "space-y-2"
  }, delTipo.slice().reverse().slice(0, 30).map(r => {
    const c = r.tipo === "peso" ? clasIMC(r.a, estatura) : clasificar(r.tipo, r.a, r.b, r.ctx, extraClin);
    return React.createElement("div", {
      key: r.id,
      className: "bg-white rounded-2xl border border-slate-200 p-3.5 flex items-center gap-3"
    }, React.createElement("div", {
      className: "flex-1 min-w-0"
    }, React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, React.createElement("span", {
      className: "font-bold text-slate-800 text-lg"
    }, tipo === "presion" ? r.a + "/" + r.b : tipo === "orina" ? "Color " + r.a : tipo === "heces" ? "Bristol " + r.a : r.a, " ", React.createElement("span", {
      className: "text-xs font-medium text-slate-400"
    }, tipo === "orina" || tipo === "heces" ? "" : M.unidad)), tipo === "heces" && r.b && COLORES_HECES[r.b - 1] && React.createElement("span", {
      className: "text-xs text-slate-500"
    }, "\uD83C\uDFA8 ", COLORES_HECES[r.b - 1].label), tipo === "orina" && NIVELES_ORINA[r.a - 1] && React.createElement("span", {
      className: "text-xs text-slate-500"
    }, NIVELES_ORINA[r.a - 1].label.split("· ")[1]), r.pulso && React.createElement("span", {
      className: "text-xs text-slate-500"
    }, "\u2665 ", r.pulso, " lpm"), c && React.createElement("span", {
      className: "text-xs px-2 py-0.5 rounded-full border " + c.cls
    }, c.txt, r.tipo === "peso" && c.imc ? " · IMC " + c.imc : "")), React.createElement("div", {
      className: "text-xs text-slate-500 mt-0.5"
    }, fmtDate(r.fecha), " \xB7 ", fmt12(r.hora), r.ctx ? " · " + r.ctx : "", r.tipo === "cintura" && r.b ? " · cadera " + r.b + " cm" : "", r.notas ? " · " + r.notas : "")), confirmDel === r.id ? React.createElement("div", {
      className: "flex items-center gap-1 shrink-0"
    }, React.createElement("button", {
      onClick: () => eliminarLectura(r.id),
      className: "text-xs px-2 py-1 rounded-lg bg-rose-600 text-white"
    }, "Eliminar"), React.createElement("button", {
      onClick: () => setConfirmDel(null),
      className: "text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600"
    }, "No")) : React.createElement("div", {
      className: "flex items-center gap-2 shrink-0"
    }, React.createElement("button", {
      onClick: () => editarLectura(r),
      className: "text-slate-300 hover:text-emerald-700",
      title: "Corregir esta medici\xF3n"
    }, React.createElement(IEdit, {
      cls: "w-4 h-4"
    })), React.createElement("button", {
      onClick: () => setConfirmDel(r.id),
      className: "text-slate-300 hover:text-rose-600",
      title: "Eliminar"
    }, React.createElement(ITrash, {
      cls: "w-4 h-4"
    }))));
  }))), React.createElement("p", {
    className: "text-xs text-slate-400 text-center"
  }, "Los rangos mostrados son referencias generales para adultos y pueden variar seg\xFAn tu edad, embarazo, medicamentos y diagn\xF3sticos; tu m\xE9dico puede fijarte metas distintas. Si obtienes valores en zona de alerta o tienes s\xEDntomas, busca atenci\xF3n m\xE9dica."));
}
const TIPOS_COMIDA = ["Desayuno", "Colación matutina", "Comida", "Colación vespertina", "Cena"];
const GRUPOS_ALIM = [{
  id: "verduras",
  label: "Verduras",
  buena: true
}, {
  id: "frutas",
  label: "Frutas",
  buena: true
}, {
  id: "proteina",
  label: "Proteína (carne, huevo, leguminosas)",
  buena: true
}, {
  id: "cereales",
  label: "Cereales integrales",
  buena: true
}, {
  id: "lacteos",
  label: "Lácteos",
  buena: true
}, {
  id: "grasas",
  label: "Grasas saludables (aguacate, nueces, aceite de oliva)",
  buena: true
}, {
  id: "procesados",
  label: "Ultraprocesados / azúcar",
  buena: false
}, {
  id: "bebidas",
  label: "Bebida azucarada",
  buena: false
}, {
  id: "alcohol",
  label: "Alcohol",
  buena: false
}];
const CONTEXTOS_COMIDA = ["Sin distracciones", "Viendo pantalla", "Con prisa", "Por ansiedad/estrés", "Reunión social"];
const META_AGUA = 8;
function Comidas({
  data,
  persist,
  avisar,
  hoy
}) {
  const comidas = data.comidas || [];
  const agua = data.agua || {};
  const ahora = new Date();
  const vacioC = {
    fecha: hoy,
    hora: pad(ahora.getHours()) + ":" + pad(ahora.getMinutes()),
    tipo: "Desayuno",
    alimentos: "",
    grupos: [],
    hambre: 3,
    saciedad: 3,
    contexto: "",
    notas: ""
  };
  const [f, setF] = useState(vacioC);
  const [editCom, setEditCom] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [err, setErr] = useState(null);
  const [diaAbierto, setDiaAbierto] = useState(null);
  const [pdfDesde, setPdfDesde] = useState(addDays(hoy, -6));
  const [pdfHasta, setPdfHasta] = useState(hoy);
  const set = (k, v) => setF(p => ({
    ...p,
    [k]: v
  }));
  const aguaHoy = agua[hoy] || 0;
  const ajustarAgua = d => {
    const n = Math.max(0, aguaHoy + d);
    persist({
      ...data,
      agua: {
        ...agua,
        [hoy]: n
      }
    });
    if (d > 0 && n === META_AGUA) avisar("¡Meta de agua del día cumplida! 💧");
  };
  const toggleGrupo = id => set("grupos", f.grupos.includes(id) ? f.grupos.filter(g => g !== id) : [...f.grupos, id]);
  const guardar = () => {
    if (!f.alimentos.trim()) return setErr("Describe qué comiste (ej. 2 tacos de pollo, ensalada, agua de jamaica).");
    setErr(null);
    const c = {
      id: editCom || uid(),
      fecha: f.fecha,
      hora: f.hora,
      tipo: f.tipo,
      alimentos: f.alimentos.trim(),
      grupos: f.grupos,
      hambre: Number(f.hambre),
      saciedad: Number(f.saciedad),
      contexto: f.contexto,
      notas: f.notas.trim(),
      ts: new Date().toISOString()
    };
    persist({
      ...data,
      comidas: editCom ? comidas.map(x => x.id === editCom ? c : x) : [...comidas, c]
    });
    avisar(editCom ? "Comida corregida" : "Comida registrada");
    setEditCom(null);
    setF({
      ...vacioC,
      fecha: f.fecha,
      hora: pad(new Date().getHours()) + ":" + pad(new Date().getMinutes())
    });
  };
  const editar = c => {
    setEditCom(c.id);
    setF({
      fecha: c.fecha,
      hora: c.hora,
      tipo: c.tipo,
      alimentos: c.alimentos,
      grupos: c.grupos || [],
      hambre: c.hambre,
      saciedad: c.saciedad,
      contexto: c.contexto || "",
      notas: c.notas || ""
    });
    setErr(null);
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };
  const eliminar = id => {
    persist({
      ...data,
      comidas: comidas.filter(c => c.id !== id)
    });
    setConfirmDel(null);
    avisar("Registro eliminado");
  };
  const porFecha = fecha => comidas.filter(c => c.fecha === fecha).slice().sort((a, b) => a.hora < b.hora ? -1 : 1);
  const deHoy = porFecha(hoy);
  const fechasPasadas = [...new Set(comidas.filter(c => c.fecha < hoy).map(c => c.fecha))].sort().reverse().slice(0, 14);
  const resumenDia = lista => {
    const g = {};
    lista.forEach(c => (c.grupos || []).forEach(x => {
      g[x] = (g[x] || 0) + 1;
    }));
    return g;
  };
  const exportarComidasPDF = () => {
    if (!(window.jspdf && window.jspdf.jsPDF)) {
      avisar("No se pudo cargar el generador de PDF. Revisa tu conexión a internet y recarga.");
      return;
    }
    const enRango = comidas.filter(c => c.fecha >= pdfDesde && c.fecha <= pdfHasta).slice().sort((a, b) => a.fecha + a.hora < b.fecha + b.hora ? -1 : 1);
    if (enRango.length === 0) {
      avisar("No hay comidas registradas en ese rango de fechas");
      return;
    }
    const {
      jsPDF
    } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape"
    });
    const perfil = data.perfil || {};
    doc.setFontSize(16);
    doc.setTextColor(6, 78, 59);
    doc.text("Diario de alimentación", 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text((perfil.nombre ? "Paciente: " + perfil.nombre + "  ·  " : "") + "Periodo: " + fmtDateLong(pdfDesde) + " — " + fmtDateLong(pdfHasta) + "  ·  Generado: " + fmtDateLong(todayStr()) + "  ·  MediControl", 14, 21);
    const nombreGrupo = id => {
      const g = GRUPOS_ALIM.find(x => x.id === id);
      return g ? g.label.split(" (")[0] : id;
    };
    doc.autoTable({
      head: [["Fecha", "Hora", "Comida", "Alimentos", "Grupos presentes", "Hambre→Saciedad", "Contexto", "Notas"]],
      body: enRango.map(c => [fmtDate(c.fecha), fmt12(c.hora), c.tipo, c.alimentos, (c.grupos || []).map(nombreGrupo).join(", ") || "—", c.hambre + " → " + c.saciedad, c.contexto || "—", c.notas || ""]),
      startY: 26,
      styles: {
        fontSize: 7.5,
        cellPadding: 1.6
      },
      headStyles: {
        fillColor: [4, 120, 87],
        fontSize: 8
      },
      alternateRowStyles: {
        fillColor: [245, 250, 248]
      },
      columnStyles: {
        3: {
          cellWidth: 70
        },
        4: {
          cellWidth: 55
        }
      },
      didParseCell: d => {
        if (d.section === "body" && d.column.index === 4) {
          const raw = String(d.cell.raw);
          if (raw.indexOf("Ultraprocesados") >= 0 || raw.indexOf("Bebida azucarada") >= 0 || raw.indexOf("Alcohol") >= 0) {
            d.cell.styles.textColor = [190, 18, 60];
          }
        }
      }
    });
    let yF = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 30) + 8;
    const dias = [...new Set(enRango.map(c => c.fecha))];
    const conVerduras = enRango.filter(c => (c.grupos || []).includes("verduras")).length;
    const conProcesados = enRango.filter(c => (c.grupos || []).some(g => ["procesados", "bebidas", "alcohol"].includes(g))).length;
    const sinDesayuno = dias.filter(d => !enRango.some(c => c.fecha === d && c.tipo === "Desayuno")).length;
    const conAnsiedad = enRango.filter(c => c.contexto === "Por ansiedad/estrés").length;
    const conPantalla = enRango.filter(c => c.contexto === "Viendo pantalla").length;
    const aguaProm = dias.length ? Math.round(dias.reduce((s, d) => s + (agua[d] || 0), 0) / dias.length * 10) / 10 : 0;
    const satAlta = enRango.filter(c => c.saciedad >= 5).length;
    doc.setFontSize(11);
    doc.setTextColor(4, 120, 87);
    doc.text("ANÁLISIS DEL PERIODO", 14, yF);
    yF += 6;
    doc.setFontSize(9);
    doc.setTextColor(60);
    const lineas = [enRango.length + " comidas registradas en " + dias.length + " días (promedio " + Math.round(enRango.length / dias.length * 10) / 10 + " al día).", "Comidas con verduras: " + conVerduras + " de " + enRango.length + " (" + Math.round(conVerduras / enRango.length * 100) + "%). Meta experta: incluir verduras en al menos 2 comidas principales al día.", "Comidas con ultraprocesados, bebidas azucaradas o alcohol: " + conProcesados + " (" + Math.round(conProcesados / enRango.length * 100) + "%).", "Días sin desayuno registrado: " + sinDesayuno + " de " + dias.length + ".", "Comidas por ansiedad/estrés: " + conAnsiedad + "  ·  Comidas viendo pantalla: " + conPantalla + "  ·  Comidas hasta sentirte muy lleno (saciedad 5): " + satAlta + ".", "Agua: promedio de " + aguaProm + " vasos al día (meta: " + META_AGUA + ")."];
    lineas.forEach(l => {
      doc.text("•  " + l, 14, yF);
      yF += 5;
    });
    yF += 3;
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("Registro basado en grupos de alimentos, escala de hambre-saciedad (1=nada, 5=mucho) y contexto de alimentación. No sustituye la valoración de un nutriólogo.", 14, yF);
    doc.save("diario-alimentacion-" + pdfDesde + "-a-" + pdfHasta + ".pdf");
    avisar("Diario de alimentación en PDF descargado");
  };
  const inputCls = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white";
  const labelCls = "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1";
  const TarjetaComida = ({
    c
  }) => React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-3.5 flex items-start gap-3"
  }, React.createElement("div", {
    className: "flex-1 min-w-0"
  }, React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, React.createElement("span", {
    className: "font-bold text-slate-800"
  }, c.tipo), React.createElement("span", {
    className: "text-xs text-slate-400"
  }, fmt12(c.hora)), React.createElement("span", {
    className: "text-xs text-slate-500"
  }, "hambre ", c.hambre, " \u2192 saciedad ", c.saciedad), c.contexto && React.createElement("span", {
    className: "text-xs px-2 py-0.5 rounded-full border " + (c.contexto === "Por ansiedad/estrés" || c.contexto === "Viendo pantalla" || c.contexto === "Con prisa" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-emerald-100 text-emerald-700 border-emerald-200")
  }, c.contexto)), React.createElement("div", {
    className: "text-sm text-slate-600 mt-0.5"
  }, c.alimentos), React.createElement("div", {
    className: "flex flex-wrap gap-1 mt-1.5"
  }, (c.grupos || []).map(g => {
    const gr = GRUPOS_ALIM.find(x => x.id === g);
    if (!gr) return null;
    return React.createElement("span", {
      key: g,
      className: "text-[10px] px-1.5 py-0.5 rounded-full border " + (gr.buena ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-600 border-rose-200")
    }, gr.label.split(" (")[0]);
  })), c.notas && React.createElement("div", {
    className: "text-xs text-slate-400 mt-1"
  }, c.notas)), confirmDel === c.id ? React.createElement("div", {
    className: "flex items-center gap-1 shrink-0"
  }, React.createElement("button", {
    onClick: () => eliminar(c.id),
    className: "text-xs px-2 py-1 rounded-lg bg-rose-600 text-white"
  }, "Eliminar"), React.createElement("button", {
    onClick: () => setConfirmDel(null),
    className: "text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600"
  }, "No")) : React.createElement("div", {
    className: "flex items-center gap-2 shrink-0"
  }, React.createElement("button", {
    onClick: () => editar(c),
    className: "text-slate-300 hover:text-emerald-700",
    title: "Corregir"
  }, React.createElement(IEdit, {
    cls: "w-4 h-4"
  })), React.createElement("button", {
    onClick: () => setConfirmDel(c.id),
    className: "text-slate-300 hover:text-rose-600",
    title: "Eliminar"
  }, React.createElement(ITrash, {
    cls: "w-4 h-4"
  }))));
  return React.createElement("div", {
    className: "space-y-4"
  }, React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("div", {
    className: "flex items-center justify-between gap-3 flex-wrap"
  }, React.createElement("div", null, React.createElement("div", {
    className: "font-bold text-slate-700 flex items-center gap-2"
  }, React.createElement(IDrop, {
    cls: "w-5 h-5 text-cyan-600"
  }), " Agua de hoy"), React.createElement("div", {
    className: "text-sm text-slate-500"
  }, aguaHoy, " de ", META_AGUA, " vasos (~", aguaHoy * 250, " ml)")), React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("button", {
    onClick: () => ajustarAgua(-1),
    disabled: aguaHoy === 0,
    className: "w-9 h-9 rounded-xl border flex items-center justify-center " + (aguaHoy === 0 ? "border-slate-200 text-slate-300" : "border-slate-300 text-slate-600 hover:bg-slate-50")
  }, React.createElement(IMinus, {
    cls: "w-4 h-4"
  })), React.createElement("div", {
    className: "flex gap-1"
  }, Array.from({
    length: META_AGUA
  }).map((_, i) => React.createElement("div", {
    key: i,
    className: "w-3.5 h-6 rounded-sm " + (i < aguaHoy ? "bg-cyan-500" : "bg-slate-100 border border-slate-200")
  }))), React.createElement("button", {
    onClick: () => ajustarAgua(1),
    className: "w-9 h-9 rounded-xl border border-cyan-300 text-cyan-700 hover:bg-cyan-50 flex items-center justify-center"
  }, React.createElement(IPlus, {
    cls: "w-4 h-4"
  }))))), React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
  }, React.createElement("h2", {
    className: "font-bold text-slate-700 flex items-center gap-2"
  }, React.createElement(IFood, {
    cls: "w-5 h-5 text-emerald-700"
  }), " ", editCom ? "Corregir comida" : "Registrar comida"), editCom && React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between text-sm"
  }, React.createElement("span", {
    className: "text-amber-800 font-medium flex items-center gap-1.5"
  }, React.createElement(IEdit, {
    cls: "w-4 h-4"
  }), " Editando un registro existente"), React.createElement("button", {
    onClick: () => {
      setEditCom(null);
      setF(vacioC);
    },
    className: "text-xs px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-800"
  }, "Cancelar")), React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-3"
  }, React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Fecha"), React.createElement("input", {
    type: "date",
    className: inputCls,
    value: f.fecha,
    onChange: e => set("fecha", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Hora"), React.createElement("input", {
    type: "time",
    className: inputCls,
    value: f.hora,
    onChange: e => set("hora", e.target.value)
  })), React.createElement("div", {
    className: "col-span-2"
  }, React.createElement("label", {
    className: labelCls
  }, "Tipo de comida"), React.createElement("select", {
    className: inputCls,
    value: f.tipo,
    onChange: e => set("tipo", e.target.value)
  }, TIPOS_COMIDA.map(t => React.createElement("option", {
    key: t
  }, t))))), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "\xBFQu\xE9 comiste? (con porciones aproximadas) *"), React.createElement("textarea", {
    className: inputCls,
    rows: 2,
    placeholder: "Ej. 2 tacos de pollo con verdura, 1 vaso de agua de jamaica sin az\xFAcar, 1 pl\xE1tano",
    value: f.alimentos,
    onChange: e => set("alimentos", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Grupos de alimentos presentes (toca los que aplican)"), React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, GRUPOS_ALIM.map(g => React.createElement("button", {
    key: g.id,
    onClick: () => toggleGrupo(g.id),
    className: "text-xs px-2.5 py-1.5 rounded-full border transition-colors " + (f.grupos.includes(g.id) ? g.buena ? "bg-emerald-600 border-emerald-600 text-white" : "bg-rose-500 border-rose-500 text-white" : "bg-white border-slate-300 text-slate-600 hover:border-emerald-400")
  }, g.label.split(" (")[0])))), React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-3 gap-3"
  }, React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Hambre antes (1-5)"), React.createElement("select", {
    className: inputCls,
    value: f.hambre,
    onChange: e => set("hambre", e.target.value)
  }, React.createElement("option", {
    value: "1"
  }, "1 \xB7 Nada de hambre"), React.createElement("option", {
    value: "2"
  }, "2 \xB7 Poca"), React.createElement("option", {
    value: "3"
  }, "3 \xB7 Moderada"), React.createElement("option", {
    value: "4"
  }, "4 \xB7 Mucha"), React.createElement("option", {
    value: "5"
  }, "5 \xB7 Voraz"))), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Saciedad despu\xE9s (1-5)"), React.createElement("select", {
    className: inputCls,
    value: f.saciedad,
    onChange: e => set("saciedad", e.target.value)
  }, React.createElement("option", {
    value: "1"
  }, "1 \xB7 Qued\xE9 con hambre"), React.createElement("option", {
    value: "2"
  }, "2 \xB7 Algo satisfecho"), React.createElement("option", {
    value: "3"
  }, "3 \xB7 Satisfecho"), React.createElement("option", {
    value: "4"
  }, "4 \xB7 Lleno"), React.createElement("option", {
    value: "5"
  }, "5 \xB7 Demasiado lleno"))), React.createElement("div", {
    className: "col-span-2 sm:col-span-1"
  }, React.createElement("label", {
    className: labelCls
  }, "\xBFC\xF3mo comiste?"), React.createElement("select", {
    className: inputCls,
    value: f.contexto,
    onChange: e => set("contexto", e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "\u2014"), CONTEXTOS_COMIDA.map(c => React.createElement("option", {
    key: c
  }, c))))), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Notas (opcional)"), React.createElement("input", {
    className: inputCls,
    placeholder: "Ej. Se me antoj\xF3 dulce despu\xE9s, com\xED fuera de casa\u2026",
    value: f.notas,
    onChange: e => set("notas", e.target.value)
  })), err && React.createElement("div", {
    className: "bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-3 py-2.5 flex items-center gap-2"
  }, React.createElement(IWarn, {
    cls: "w-4 h-4 shrink-0"
  }), " ", err), React.createElement("button", {
    onClick: guardar,
    className: "w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"
  }, React.createElement(IPlus, {
    cls: "w-5 h-5"
  }), " ", editCom ? "Guardar corrección" : "Guardar comida"), React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "Ideal de los expertos: comer con hambre 3-4 y detenerte en saciedad 3 (satisfecho, no lleno). La escala hambre-saciedad y el contexto revelan m\xE1s h\xE1bitos que contar calor\xEDas.")), comidas.length > 0 && React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("div", {
    className: "flex flex-wrap items-end gap-3"
  }, React.createElement("div", {
    className: "flex items-center gap-2 font-bold text-slate-700 text-sm w-full sm:w-auto"
  }, React.createElement(IDownload, {
    cls: "w-4 h-4 text-emerald-700"
  }), " Diario en PDF para tu nutri\xF3logo"), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Desde"), React.createElement("input", {
    type: "date",
    className: inputCls,
    value: pdfDesde,
    onChange: e => setPdfDesde(e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: labelCls
  }, "Hasta"), React.createElement("input", {
    type: "date",
    className: inputCls,
    value: pdfHasta,
    onChange: e => setPdfHasta(e.target.value)
  })), React.createElement("button", {
    onClick: exportarComidasPDF,
    className: "bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5"
  }, React.createElement(IDownload, {
    cls: "w-4 h-4"
  }), " Exportar PDF")), React.createElement("p", {
    className: "text-xs text-slate-400 mt-2"
  }, "Incluye cada comida con grupos de alimentos, hambre-saciedad y contexto, m\xE1s un an\xE1lisis del periodo: % de comidas con verduras, ultraprocesados, d\xEDas sin desayuno, comidas por ansiedad y agua promedio.")), React.createElement("section", null, React.createElement("h2", {
    className: "text-sm font-bold uppercase tracking-wide text-slate-500 mb-2"
  }, "Hoy \xB7 ", deHoy.length, " ", deHoy.length === 1 ? "comida registrada" : "comidas registradas"), deHoy.length === 0 ? React.createElement("div", {
    className: "bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400"
  }, "A\xFAn no registras comidas hoy. El registro en el momento (no de memoria en la noche) es el h\xE1bito #1 de un buen diario.") : React.createElement("div", {
    className: "space-y-2"
  }, deHoy.map(c => React.createElement(TarjetaComida, {
    key: c.id,
    c: c
  })), React.createElement("div", {
    className: "flex flex-wrap gap-1.5 bg-slate-100 rounded-xl px-3 py-2"
  }, React.createElement("span", {
    className: "text-xs font-bold text-slate-500"
  }, "Balance del d\xEDa:"), Object.entries(resumenDia(deHoy)).map(([g, n]) => {
    const gr = GRUPOS_ALIM.find(x => x.id === g);
    if (!gr) return null;
    return React.createElement("span", {
      key: g,
      className: "text-xs " + (gr.buena ? "text-emerald-700" : "text-rose-600")
    }, gr.label.split(" (")[0], " \xD7", n);
  })))), fechasPasadas.length > 0 && React.createElement("section", null, React.createElement("h2", {
    className: "text-sm font-bold uppercase tracking-wide text-slate-500 mb-2"
  }, "D\xEDas anteriores"), React.createElement("div", {
    className: "space-y-2"
  }, fechasPasadas.map(fecha => {
    const lista = porFecha(fecha);
    const abierto = diaAbierto === fecha;
    return React.createElement("div", {
      key: fecha,
      className: "bg-white rounded-2xl border border-slate-200"
    }, React.createElement("button", {
      onClick: () => setDiaAbierto(abierto ? null : fecha),
      className: "w-full flex items-center justify-between px-4 py-3 text-sm"
    }, React.createElement("span", {
      className: "flex items-center gap-2 font-semibold text-slate-700"
    }, abierto ? React.createElement(IChevD, {
      cls: "w-4 h-4 text-slate-400"
    }) : React.createElement(IChevR, {
      cls: "w-4 h-4 text-slate-400"
    }), fmtDate(fecha)), React.createElement("span", {
      className: "text-xs text-slate-400"
    }, lista.length, " comidas \xB7 ", agua[fecha] || 0, " vasos de agua")), abierto && React.createElement("div", {
      className: "px-4 pb-3 space-y-2"
    }, lista.map(c => React.createElement(TarjetaComida, {
      key: c.id,
      c: c
    }))));
  }))));
}
const GRUPOS = {
  verdura: {
    label: "Verduras",
    emoji: "🥦",
    color: "emerald",
    desc: "Vitaminas, minerales, alta cantidad de fibra y agua. Inclúyelas en cada comida."
  },
  fruta: {
    label: "Frutas",
    emoji: "🍎",
    color: "lime",
    desc: "Energía, carbohidratos, fibra, agua, vitaminas y minerales."
  },
  cereal: {
    label: "Cereales y tubérculos",
    emoji: "🌽",
    color: "amber",
    desc: "Principal fuente de energía; vitaminas, minerales y carbohidratos."
  },
  aoa: {
    label: "Alimentos de origen animal",
    emoji: "🍗",
    color: "rose",
    desc: "Proteínas, vitaminas y grasas: pollo, pescado, res, cerdo, queso y huevo."
  },
  leche: {
    label: "Leche y yogur natural",
    emoji: "🥛",
    color: "sky",
    desc: "Carbohidratos, proteínas, grasas, vitaminas y minerales."
  },
  leguminosa: {
    label: "Leguminosas",
    emoji: "🫘",
    color: "orange",
    desc: "Carbohidratos, proteínas, fibra y minerales como el hierro."
  },
  grasa: {
    label: "Aceites y grasas",
    emoji: "🥑",
    color: "yellow",
    desc: "Prefiere las de origen vegetal (aceites, aguacate, semillas); evita las de origen animal."
  }
};
const ALIMENTOS = {
  verdura: [["Acelga cocida", 0.5, "taza"], ["Apio", 1, "taza"], ["Brócoli cocido", 0.5, "taza"], ["Calabacita", 1, "pieza"], ["Champiñón cocido", 0.5, "taza"], ["Chayote cocido", 0.5, "taza"], ["Chile poblano", 0.5, "pieza"], ["Chícharo cocido", 0.25, "taza"], ["Col cruda", 2, "taza"], ["Coliflor cocida", 1, "taza"], ["Ejote cocido", 0.5, "taza"], ["Espinaca cocida", 0.5, "taza"], ["Flor de calabaza", 1, "taza"], ["Germen de alfalfa", 3, "taza"], ["Huitlacoche cocido", 1 / 3, "taza"], ["Jícama", 0.5, "taza"], ["Jitomate", 1, "pieza"], ["Lechuga", 3, "taza"], ["Nopal cocido", 1, "taza"], ["Pepino", 1, "taza"], ["Pimiento cocido", 0.5, "taza"], ["Seta cocida", 0.5, "taza"], ["Verdolagas cocidas", 1, "taza"], ["Zanahoria", 0.5, "taza"]],
  fruta: [["Arándano seco", 0.5, "taza"], ["Chabacano", 4, "pieza"], ["Chicozapote", 0.5, "pieza"], ["Ciruela", 3, "pieza"], ["Durazno amarillo", 2, "pieza"], ["Fresa entera", 17, "pieza"], ["Granada roja", 1, "pieza"], ["Guayaba", 3, "pieza"], ["Higo", 2, "pieza"], ["Kiwi", 1.5, "pieza"], ["Mamey", 1 / 3, "pieza"], ["Mandarina", 2, "pieza"], ["Mango ataúlfo", 0.5, "pieza"], ["Manzana", 1, "pieza"], ["Melón", 1, "taza"], ["Naranja", 2, "pieza"], ["Papaya", 1, "taza"], ["Pasas", 10, "pieza"], ["Pera", 0.5, "pieza"], ["Piña", 0.75, "taza"], ["Plátano", 0.5, "pieza"], ["Plátano dominico", 3, "pieza"], ["Sandía", 1, "taza"], ["Toronja", 1, "pieza"], ["Tuna", 2, "pieza"], ["Uva", 18, "pieza"]],
  aoa: [["Atún en lata", 1 / 3, "lata"], ["Atún fresco", 30, "g"], ["Bistec de res o cerdo", 30, "g"], ["Clara de huevo", 2, "pieza"], ["Carne de pollo, res o cerdo", 40, "g"], ["Carne molida de res o cerdo", 30, "g"], ["Charales frescos", 30, "g"], ["Filete de pescado", 40, "g"], ["Huevo", 1, "pieza"], ["Jamón de pavo", 2, "rebanada"], ["Jocoque", 3.5, "cucharada"], ["Maciza de res", 25, "g"], ["Trucha fresca", 35, "g"], ["Pechuga de pollo sin piel", 30, "g"], ["Pollo deshebrado", 0.25, "taza"], ["Pavo", 45, "g"], ["Queso cottage o requesón", 3, "cucharada"], ["Queso oaxaca", 35, "g"], ["Queso panela", 40, "g"], ["Queso blanco", 35, "g"], ["Sardina en tomate", 1, "pieza"]],
  cereal: [["Amaranto tostado", 0.25, "taza"], ["Arroz cocido", 0.25, "taza"], ["Avena cocida", 0.75, "taza"], ["Bolillo sin migajón", 0.5, "pieza"], ["Bollo de hamburguesa", 1 / 3, "pieza"], ["Camote", 0.5, "taza"], ["Cereal de caja sin azúcar", 0.5, "taza"], ["Elote cocido", 1.5, "pieza"], ["Elote desgranado cocido", 0.5, "taza"], ["Espagueti cocido", 1 / 3, "taza"], ["Galleta habanera", 4, "pieza"], ["Galletas de maíz horneadas sin grasa", 3, "pieza"], ["Galleta maría", 5, "pieza"], ["Granola baja en grasa", 3, "cucharada"], ["Palomitas de maíz sin grasa", 2.5, "taza"], ["Pan de caja", 1, "rebanada"], ["Pan tostado", 1, "rebanada"], ["Papa", 0.5, "pieza"], ["Pasta cocida", 0.5, "taza"], ["Salvado de trigo", 8, "cucharada"], ["Sope de maíz", 0.5, "pieza"], ["Telera sin migajón", 1 / 3, "pieza"], ["Tortilla de maíz", 1, "pieza"], ["Tostada de maíz horneada", 2, "pieza"]],
  leche: [["Leche descremada", 1, "taza"], ["Yogur descremado", 0.75, "taza"], ["Yogur natural sin azúcar", 1, "taza"]],
  leguminosa: [["Alubia", 0.5, "taza"], ["Alverjón", 0.5, "taza"], ["Frijol entero", 0.5, "taza"], ["Frijol machacado", 1 / 3, "taza"], ["Garbanzo", 0.5, "taza"], ["Haba", 0.5, "taza"], ["Lenteja", 0.5, "taza"]],
  grasa: [["Aceite", 1, "cucharadita"], ["Aceite de oliva", 1, "cucharadita"], ["Aceituna sin hueso", 5, "pieza"], ["Aguacate", 1 / 3, "pieza"], ["Guacamole", 2, "cucharada"], ["Almendra", 10, "pieza"], ["Cacahuate", 14, "pieza"], ["Nuez", 3, "pieza"], ["Semilla de girasol", 4, "cucharadita"], ["Semillas de calabaza", 1.5, "cucharada"]]
};
const PLAN_COMIDAS = {
  desayuno: {
    label: "Desayuno",
    emoji: "🌅",
    porciones: {
      verdura: 1,
      fruta: 1,
      cereal: 2,
      aoa: 2,
      leche: 1,
      grasa: 1
    },
    ejemplo: "Huevos a la mexicana (2 huevos con 1 jitomate y 1 cucharadita de aceite), 2 piezas de pan tostado, 1 taza de leche descremada y 1 taza de papaya picada."
  },
  colacionM: {
    label: "Colación matutina",
    emoji: "🍏",
    porciones: {
      fruta: 1
    },
    ejemplo: "1 pieza de manzana."
  },
  comida: {
    label: "Comida",
    emoji: "🍲",
    porciones: {
      verdura: 2,
      cereal: 3,
      leguminosa: 1,
      aoa: 2,
      grasa: 2
    },
    ejemplo: "Bistec en salsa verde (60 g de bistec de res, 1 taza de nopales picados y 2 cucharaditas de aceite), ½ taza de frijoles de la olla y 3 tortillas de maíz."
  },
  colacionV: {
    label: "Colación vespertina",
    emoji: "🍑",
    porciones: {
      fruta: 1
    },
    ejemplo: "2 piezas de durazno amarillo."
  },
  cena: {
    label: "Cena",
    emoji: "🌙",
    porciones: {
      verdura: 1,
      fruta: 1,
      cereal: 2,
      aoa: 1,
      grasa: 1
    },
    ejemplo: "Ensalada de atún (30 g de atún, 3 tazas de lechuga y 1 cucharadita de aceite de oliva), 8 galletas habaneras y 2 mandarinas."
  }
};
const METODO_MANO = [{
  mano: "✌️ 2 palmas ahuecadas",
  equivale: "1 taza (240 ml)",
  grupo: "Verduras",
  ej: "2 palmas ahuecadas de brócoli, nopales o verduras mixtas = 1 taza."
}, {
  mano: "✊ 1 puño",
  equivale: "1 taza (240 ml)",
  grupo: "Frutas",
  ej: "1 puño de papaya, melón o sandía picada = 1 taza."
}, {
  mano: "🤛 ½ puño",
  equivale: "½ taza (120 ml)",
  grupo: "Cereales o leguminosas",
  ej: "½ puño de arroz, pasta o frijoles cocidos = ½ taza."
}, {
  mano: "👍 1 pulgar",
  equivale: "1 cucharadita (5 ml)",
  grupo: "Grasa",
  ej: "1 pulgar de aceite, guacamole o crema de cacahuate = 1 cucharadita."
}, {
  mano: "✊ 1 puño",
  equivale: "1 taza (240 ml)",
  grupo: "Leche",
  ej: "1 puño equivale a 1 vaso de leche descremada."
}, {
  mano: "🖐️ ⅓ de palma (grosor del meñique)",
  equivale: "1 porción de 30 g",
  grupo: "Carne",
  ej: "⅓ de palma = 30 g de carne. La palma completa = 3 porciones (≈90 g)."
}];
const fmtFrac = x => {
  const ent = Math.floor(x + 0.0001);
  const dec = x - ent;
  const map = [[0, ""], [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"]];
  let best = map[0];
  for (const m of map) if (Math.abs(dec - m[0]) < Math.abs(dec - best[0])) best = m;
  if (Math.abs(dec - best[0]) > 0.05) return String(Math.round(x * 100) / 100);
  if (ent === 0 && best[1]) return best[1];
  return best[1] ? ent + " " + best[1] : String(ent);
};
const fmtCantidad = (qty, unidad, mult) => {
  const total = qty * mult;
  if (unidad === "g") return Math.round(total) + " g";
  const plural = total > 1.001;
  const u = plural ? unidad === "lata" ? "latas" : unidad + "s" : unidad;
  return fmtFrac(total) + " " + u;
};
function Desplegable({
  titulo,
  subtitulo,
  emoji,
  abierto,
  onToggle,
  children,
  tone
}) {
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 overflow-hidden"
  }, React.createElement("button", {
    onClick: onToggle,
    className: "w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
  }, React.createElement("span", {
    className: "text-xl leading-none"
  }, emoji), React.createElement("span", {
    className: "flex-1 min-w-0"
  }, React.createElement("span", {
    className: "block font-semibold text-sm " + (tone || "text-slate-800")
  }, titulo), subtitulo && React.createElement("span", {
    className: "block text-xs text-slate-500 mt-0.5"
  }, subtitulo)), React.createElement(IChevron, {
    cls: "w-4 h-4 text-slate-400 transition-transform " + (abierto ? "rotate-180" : "")
  })), abierto && React.createElement("div", {
    className: "px-4 pb-4 border-t border-slate-100 pt-3"
  }, children));
}
function TablaRaciones({
  items
}) {
  return React.createElement("div", {
    className: "overflow-hidden rounded-xl border border-slate-200"
  }, React.createElement("table", {
    className: "w-full text-sm"
  }, React.createElement("thead", null, React.createElement("tr", {
    className: "bg-slate-50 text-slate-500 text-xs uppercase tracking-wide"
  }, React.createElement("th", {
    className: "text-left px-3 py-2 font-semibold"
  }, "Alimento"), React.createElement("th", {
    className: "text-right px-3 py-2 font-semibold"
  }, "1 raci\xF3n ="))), React.createElement("tbody", null, items.map((it, i) => React.createElement("tr", {
    key: it[0],
    className: i % 2 ? "bg-slate-50/50" : "bg-white"
  }, React.createElement("td", {
    className: "px-3 py-1.5 text-slate-700"
  }, it[0]), React.createElement("td", {
    className: "px-3 py-1.5 text-right font-medium text-slate-800 whitespace-nowrap"
  }, fmtCantidad(it[1], it[2], 1)))))));
}
function CalcNutricion({
  data,
  onIrSalud
}) {
  const perfil = data && data.perfil || {};
  const rPeso = ultimaLectura(data, "peso");
  const rCintura = ultimaLectura(data, "cintura");
  const peso = (perfil.peso ? Number(perfil.peso) : null) || (rPeso ? Number(rPeso.a) : null);
  const cintura = (perfil.cintura ? Number(perfil.cintura) : null) || (rCintura ? Number(rCintura.a) : null);
  const estaturaCm = perfil.estatura ? Number(perfil.estatura) : null;
  const edad = edadDe(perfil);
  const sexoRaw = (perfil.sexo || "").toLowerCase();
  const sexo = sexoRaw.indexOf("muj") >= 0 ? "mujer" : sexoRaw.indexOf("hom") >= 0 ? "hombre" : "";
  const e = estaturaCm ? estaturaCm / 100 : null;
  const imc = peso && e ? peso / (e * e) : null;
  let grasa = null;
  try {
    const seg = JSON.parse(localStorage.getItem("medicontrol-seguimiento-v1")) || [];
    const g = seg.filter(r => r.grasa);
    if (g.length) grasa = Number(g[0].grasa);
  } catch (x) {}
  const dxGrasa = grasa ? clasifGrasa(grasa, sexo, edad) : null;
  const planAccion = (() => {
    if (!imc) return null;
    if (imc < 18.5) return {
      tipo: "subir",
      titulo: "Plan para subir de peso de forma saludable",
      cls: "border-sky-200 bg-sky-50",
      icono: "⬆️",
      pasos: ["Haz 5 comidas al día: agrega 2 colaciones nutritivas entre comidas.", "Aumenta porciones de cereales integrales, grasas buenas (aguacate, nueces, aceite de oliva) y proteína.", "Acompaña con ejercicio de fuerza para ganar músculo, no solo grasa.", "Evita llenarte solo con líquidos antes de comer.", "Confírmalo con tu nutrióloga para ajustar cantidades a tu caso."]
    };
    if (imc < 25) return {
      tipo: "mantener",
      titulo: "Plan para mantener tu peso saludable",
      cls: "border-emerald-200 bg-emerald-50",
      icono: "✅",
      pasos: ["Mantén tu plan de raciones y horarios de comida.", "30 a 60 min de actividad física casi todos los días.", "Prioriza verduras, frutas, proteína magra y agua simple.", "Vigila tu peso y cintura en 'Seguimiento de tus logros'."]
    };
    return {
      tipo: "bajar",
      titulo: "Plan para bajar de peso de forma segura",
      cls: "border-amber-200 bg-amber-50",
      icono: "⬇️",
      pasos: ["Controla las porciones con tu 'Plan de raciones' y el control diario.", "Prioriza verduras y proteína magra; reduce azúcares, harinas refinadas y frituras.", "Toma agua simple; evita refrescos, jugos y bebidas azucaradas.", "Muévete: empieza con 30 min al día y sube poco a poco a 60 min.", "Meta segura: bajar alrededor de 0.5 kg por semana (10% de tu peso en ~6 meses).", "Duerme bien y maneja el estrés (apartado Bienestar).", "Confírmalo con tu nutrióloga antes de hacer cambios grandes."]
    };
  })();
  const clasifIMCloc = v => {
    if (v < 18.5) return {
      t: "Bajo peso",
      cls: "bg-sky-100 text-sky-800 border-sky-200"
    };
    if (v < 25) return {
      t: "Peso saludable",
      cls: "bg-emerald-100 text-emerald-800 border-emerald-200"
    };
    if (v < 30) return {
      t: "Sobrepeso",
      cls: "bg-amber-100 text-amber-800 border-amber-200"
    };
    if (v < 35) return {
      t: "Obesidad grado I",
      cls: "bg-orange-100 text-orange-800 border-orange-200"
    };
    if (v < 40) return {
      t: "Obesidad grado II",
      cls: "bg-rose-100 text-rose-800 border-rose-200"
    };
    return {
      t: "Obesidad grado III",
      cls: "bg-red-100 text-red-800 border-red-200"
    };
  };
  const limiteCintura = sexo === "mujer" ? 80 : 90;
  const cinturaOk = cintura ? cintura <= limiteCintura : null;
  const meta = imc && imc >= 25 && peso ? Math.round(peso * 0.10 * 10) / 10 : null;
  const faltan = [];
  if (!estaturaCm) faltan.push("estatura");
  if (!sexo) faltan.push("sexo");
  if (peso == null) faltan.push("peso");
  if (cintura == null) faltan.push("cintura");
  const Dato = ({
    label,
    valor,
    ok
  }) => React.createElement("div", {
    className: "rounded-xl border px-3 py-2 text-center " + (ok ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-amber-50")
  }, React.createElement("div", {
    className: "text-sm font-bold " + (ok ? "text-slate-800" : "text-amber-700")
  }, ok ? valor : "falta"), React.createElement("div", {
    className: "text-[11px] text-slate-500"
  }, label));
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, React.createElement(IScale, {
    cls: "w-5 h-5 text-emerald-700"
  }), " Conoce tu estado de nutrici\xF3n"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "Se calcula con los datos de tu perfil y mediciones del apartado Salud. IMC = peso (kg) \xF7 estatura \xD7 estatura (m)."), React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-2"
  }, React.createElement(Dato, {
    label: "Peso",
    valor: peso + " kg",
    ok: peso != null
  }), React.createElement(Dato, {
    label: "Estatura",
    valor: estaturaCm + " cm",
    ok: !!estaturaCm
  }), React.createElement(Dato, {
    label: "Cintura",
    valor: cintura + " cm",
    ok: cintura != null
  }), React.createElement(Dato, {
    label: "Sexo",
    valor: sexo === "mujer" ? "Mujer" : "Hombre",
    ok: !!sexo
  })), faltan.length > 0 && React.createElement("div", {
    className: "mt-3 text-sm bg-amber-50 border border-amber-100 text-amber-900 rounded-xl px-3 py-2.5"
  }, React.createElement("div", {
    className: "flex items-start gap-2"
  }, React.createElement(IWarn, {
    cls: "w-4 h-4 shrink-0 mt-0.5"
  }), React.createElement("span", null, "Faltan datos: ", React.createElement("b", null, faltan.join(", ")), ". Ll\xE9nalos en el apartado ", React.createElement("b", null, "Salud"), " \u2192 Perfil del paciente (estatura y sexo) y registra tu peso y cintura en tus mediciones. Aqu\xED se reflejar\xE1n autom\xE1ticamente.")), onIrSalud && React.createElement("button", {
    onClick: onIrSalud,
    className: "mt-2 text-xs font-semibold bg-emerald-700 text-white rounded-full px-4 py-1.5 hover:bg-emerald-800"
  }, "Ir al apartado Salud \u2192")), imc && React.createElement("div", {
    className: "mt-4 grid sm:grid-cols-3 gap-3"
  }, React.createElement("div", {
    className: "rounded-xl border p-3 text-center " + clasifIMCloc(imc).cls
  }, React.createElement("div", {
    className: "text-2xl font-extrabold"
  }, (Math.round(imc * 10) / 10).toFixed(1)), React.createElement("div", {
    className: "text-xs font-semibold mt-0.5"
  }, "IMC \xB7 ", clasifIMCloc(imc).t)), cinturaOk !== null && React.createElement("div", {
    className: "rounded-xl border p-3 text-center " + (cinturaOk ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-rose-100 text-rose-800 border-rose-200")
  }, React.createElement("div", {
    className: "text-2xl font-extrabold"
  }, cintura, " cm"), React.createElement("div", {
    className: "text-xs font-semibold mt-0.5"
  }, cinturaOk ? "Cintura normal" : "Obesidad central", " (l\xEDmite ", limiteCintura, " cm)")), meta && React.createElement("div", {
    className: "rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-emerald-900"
  }, React.createElement("div", {
    className: "text-2xl font-extrabold"
  }, "\u2212", meta, " kg"), React.createElement("div", {
    className: "text-xs font-semibold mt-0.5"
  }, "Meta saludable: 10% de tu peso en 6 meses")), dxGrasa && React.createElement("div", {
    className: "rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"
  }, React.createElement("div", {
    className: "text-2xl font-extrabold " + dxGrasa.color
  }, grasa, "%"), React.createElement("div", {
    className: "text-xs font-semibold mt-0.5 text-slate-600"
  }, "% grasa \xB7 ", dxGrasa.txt))), planAccion && React.createElement("div", {
    className: "mt-4 rounded-xl border p-4 " + planAccion.cls
  }, React.createElement("h4", {
    className: "font-bold text-slate-800 text-sm flex items-center gap-2"
  }, planAccion.icono, " ", planAccion.titulo), React.createElement("ul", {
    className: "mt-2 space-y-1.5"
  }, planAccion.pasos.map((t, i) => React.createElement("li", {
    key: i,
    className: "flex gap-2 text-sm text-slate-700"
  }, React.createElement("span", {
    className: "text-emerald-600 font-bold shrink-0"
  }, i + 1, "."), React.createElement("span", null, t))))), React.createElement("div", {
    className: "mt-3 text-xs text-slate-500 grid sm:grid-cols-2 gap-x-6 gap-y-1"
  }, React.createElement("span", null, "\uD83D\uDFE2 Peso saludable: 18.5 \u2013 24.9 kg/m\xB2"), React.createElement("span", null, "\uD83D\uDFE1 Sobrepeso: 25.0 \u2013 29.9 kg/m\xB2"), React.createElement("span", null, "\uD83D\uDFE0 Obesidad I: 30.0 \u2013 34.9 \xB7 II: 35.0 \u2013 39.9"), React.createElement("span", null, "\uD83D\uDD34 Obesidad III: 40.0 kg/m\xB2 o m\xE1s")), React.createElement("p", {
    className: "text-[11px] text-slate-400 mt-3"
  }, "C\xF3mo medir tu cintura: descubre el abdomen, coloca la cinta entre la \xFAltima costilla y el borde del hueso de la cadera, respira profundo y mide al sacar el aire."));
}
function CalcPorciones({
  avisar
}) {
  const [comida, setComida] = useState("desayuno");
  const [extra, setExtra] = useState(false);
  const [sel, setSel] = useState({});
  const plan = PLAN_COMIDAS[comida];
  const porciones = useMemo(() => {
    const base = {
      ...plan.porciones
    };
    if (extra) {
      if (comida === "colacionV") base.fruta = (base.fruta || 0) + 1;
      if (comida === "comida") base.aoa = (base.aoa || 0) + 1;
      if (comida === "cena") base.cereal = (base.cereal || 0) + 1;
    }
    return base;
  }, [comida, extra]);
  const elegir = (grupo, idx) => setSel(s => ({
    ...s,
    [comida + "|" + grupo]: idx
  }));
  const sugerir = () => {
    const next = {
      ...sel
    };
    for (const g of Object.keys(porciones)) next[comida + "|" + g] = Math.floor(Math.random() * ALIMENTOS[g].length);
    setSel(next);
    avisar("Menú sugerido al azar 🍽️");
  };
  const totalPorc = Object.values(porciones).reduce((a, b) => a + b, 0);
  const selectCls = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, React.createElement(IFood, {
    cls: "w-5 h-5 text-emerald-700"
  }), " \xBFCu\xE1ntas porciones debo consumir en cada comida?"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1"
  }, "Basado en un plan de 1,500 calor\xEDas al d\xEDa para bajar de peso de forma segura. Elige el tiempo de comida y arma tu plato con la lista de intercambio."), React.createElement("div", {
    className: "flex gap-1.5 mt-3 overflow-x-auto pb-1"
  }, Object.entries(PLAN_COMIDAS).map(([id, c]) => React.createElement("button", {
    key: id,
    onClick: () => setComida(id),
    className: "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors " + (comida === id ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-slate-600 border-slate-300 hover:border-emerald-400")
  }, c.emoji, " ", c.label))), React.createElement("label", {
    className: "flex items-start gap-2 mt-3 text-xs text-slate-600 cursor-pointer"
  }, React.createElement("input", {
    type: "checkbox",
    className: "mt-0.5 accent-emerald-700",
    checked: extra,
    onChange: e => setExtra(e.target.checked)
  }), React.createElement("span", null, React.createElement("b", null, "Requerimiento mayor"), " (adolescentes, hombres o actividad f\xEDsica intensa): +1 fruta en la colaci\xF3n vespertina, +1 origen animal en la comida y +1 cereal en la cena.")), React.createElement("div", {
    className: "mt-4 flex items-center justify-between"
  }, React.createElement("div", {
    className: "text-sm font-semibold text-slate-700"
  }, plan.emoji, " ", plan.label, " \xB7 ", totalPorc, " ", totalPorc === 1 ? "porción" : "porciones"), React.createElement("button", {
    onClick: sugerir,
    className: "text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full px-3 py-1.5 hover:bg-emerald-100 transition-colors"
  }, "\uD83C\uDFB2 Sugerir men\xFA")), React.createElement("div", {
    className: "mt-3 space-y-3"
  }, Object.entries(porciones).map(([g, n]) => {
    const idx = sel[comida + "|" + g];
    const item = idx != null ? ALIMENTOS[g][idx] : null;
    return React.createElement("div", {
      key: g,
      className: "rounded-xl border border-slate-200 p-3"
    }, React.createElement("div", {
      className: "flex items-center justify-between gap-2 mb-2"
    }, React.createElement("span", {
      className: "text-sm font-semibold text-slate-800"
    }, GRUPOS[g].emoji, " ", GRUPOS[g].label), React.createElement("span", {
      className: "text-xs font-bold bg-slate-100 text-slate-600 rounded-full px-2.5 py-1"
    }, n, " ", n === 1 ? "porción" : "porciones")), React.createElement("select", {
      className: selectCls,
      value: idx != null ? idx : "",
      onChange: e => elegir(g, Number(e.target.value))
    }, React.createElement("option", {
      value: "",
      disabled: true
    }, "Elige un alimento de este grupo\u2026"), ALIMENTOS[g].map((it, i) => React.createElement("option", {
      key: it[0],
      value: i
    }, it[0], " \u2014 1 raci\xF3n = ", fmtCantidad(it[1], it[2], 1)))), item && React.createElement("div", {
      className: "mt-2 text-sm bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-lg px-3 py-2"
    }, "\u2705 Come ", React.createElement("b", null, fmtCantidad(item[1], item[2], n)), " de ", React.createElement("b", null, item[0]), n > 1 && React.createElement("span", {
      className: "text-emerald-700"
    }, " (", n, " \xD7 ", fmtCantidad(item[1], item[2], 1), ")")));
  })), React.createElement("div", {
    className: "mt-4 text-xs text-slate-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5"
  }, React.createElement("b", null, "Ejemplo de men\xFA para ", plan.label.toLowerCase(), ":"), " ", plan.ejemplo), React.createElement("p", {
    className: "text-[11px] text-slate-400 mt-2"
  }, "Si no tienes un alimento, sustit\xFAyelo por otro del mismo grupo (ej. sin manzana, usa 1 taza de papaya). Acude con un profesional de la nutrici\xF3n para un plan de alimentaci\xF3n personalizado."));
}
const MENU14 = [{
  d: ["Sándwich de queso blanco: pan de caja (2 rebanadas), queso blanco (70 g), aguacate (⅓), jitomate (1 pieza), lechuga (1 taza)", "Manzana (1 pieza)", "Leche descremada (1 taza)"],
  cm: "Manzana (1 pieza)",
  co: ["Sopa de fideo con brócoli: fideo cocido (½ taza), brócoli cocido (½ taza)", "Alambre de res: carne de res (60 g), verduras mixtas (1 taza), aceite (2 cucharaditas)", "Tortilla de maíz (2 piezas) y frijoles caldosos (½ taza)"],
  cv: "Plátano dominico (3 piezas)",
  ce: ["Tostadas de tinga de pollo: pechuga deshebrada (30 g), aceite (1 cucharadita), jitomate y cebolla (1 taza), tostadas horneadas (4 piezas)", "Naranja (2 piezas)"]
}, {
  d: ["Huevo en salsa verde con nopales: huevo (2 piezas), nopales cocidos (1 taza), tortilla (2 piezas), aceite (1 cucharadita)", "Papaya picada (1 taza)", "Yogur natural sin azúcar (1 taza)"],
  cm: "Guayabas chicas (3 piezas)",
  co: ["Sopa de verduras: verduras mixtas (1 taza)", "Pescado empapelado con ensalada: filete (80 g), verduras mixtas (½ taza), arroz rojo (¼ taza), aceite (2 cucharaditas)", "Tortilla de maíz (2 piezas) y alubias caldosas (½ taza)"],
  cv: "Mandarina (2 piezas)",
  ce: ["Ceviche de atún: atún (30 g), pico de gallo (1 taza), limón, aguacate (⅓), tostadas horneadas (4 piezas)", "Piña picada (¾ de taza)"]
}, {
  d: ["Quesadillas con flor de calabaza: flor de calabaza (1 taza), queso panela (80 g), tortilla (2 piezas), aceite (1 cucharadita)", "Melón picado (1 taza)", "Yogur natural sin azúcar (1 taza)"],
  cm: "Sandía picada (1 taza)",
  co: ["Sopa de moñito con verduras: pasta cocida (½ taza), verduras mixtas (1 taza), aceite (1 cucharadita)", "Tacos de carne asada: res (60 g), tortilla (2 piezas), pico de gallo (1 taza), aguacate (⅓)", "Frijoles caldosos (½ taza)"],
  cv: "Manzana (1 pieza)",
  ce: ["Tostadas de queso panela: panela (40 g), aguacate (⅓), pico de gallo (1 taza), tostadas horneadas (2 piezas)", "Papaya picada (1 taza) con granola baja en grasa (3 cucharadas)"]
}, {
  d: ["Tacos de queso blanco: tortilla (2 piezas), queso blanco (70 g), aguacate (⅓), pico de gallo (1 taza), salsa al gusto", "Fresa rebanada (1 taza)", "Yogur natural sin azúcar (1 taza)"],
  cm: "Toronja (1 pieza)",
  co: ["Sopa poblana: rajas de poblano (½ taza), champiñones (½ taza), elote desgranado (½ taza), caldo de pollo sin grasa", "Pollo en salsa verde: pieza sin piel (60 g), nopales cocidos (1 taza), aceite (2 cucharaditas)", "Tortilla de maíz (2 piezas) y frijoles caldosos (½ taza)"],
  cv: "Naranja (2 piezas)",
  ce: ["Huevo a la mexicana: huevo (1 pieza), jitomate, cebolla y chile serrano (1 taza), aceite (1 cucharadita), tortilla (2 piezas)", "Plátano tabasco (½ pieza)"]
}, {
  d: ["Enchiladas de pollo: pechuga deshebrada (60 g), aceite (1 cucharadita), salsa verde o roja, pico de gallo (1 taza), tortilla (2 piezas)", "Durazno amarillo (2 piezas)", "Yogur natural sin azúcar (1 taza)"],
  cm: "Naranja (2 piezas)",
  co: ["Consomé de verduras: verduras mixtas (1 taza), garbanzo (½ taza), arroz blanco (¼ de taza)", "Carne de cerdo en salsa morita: maciza (70 g), aceite (2 cucharaditas), tortilla (2 piezas)"],
  cv: "Guayabas chicas (3 piezas) y cacahuates naturales (14 piezas)",
  ce: ["Nopales asados con queso: panela (40 g), nopales asados (2 piezas), tortilla (2 piezas), guacamole (2 cucharadas)", "Mandarina (2 piezas)"]
}, {
  d: ["Quesadillas de champiñones: tortilla (2 piezas), champiñones (½ taza), queso blanco (70 g), aguacate (⅓), pico de gallo (1 taza)", "Pera (½ pieza)", "Leche descremada (1 taza)"],
  cm: "Mandarina (2 piezas)",
  co: ["Sopa de pasta con espinacas: pasta cocida (½ taza), espinaca cocida (½ taza), aceite (1 cucharadita)", "Fajitas de pollo: pollo (60 g), pimiento rojo y cebolla (1 taza), aceite (1 cucharadita)", "Tortilla de maíz (2 piezas) y frijoles caldosos (½ taza)"],
  cv: "Piña picada (¾ de taza)",
  ce: ["Omelette de verduras mixtas: claras de huevo (2 piezas), verduras mixtas (1 taza), aceite (1 cucharadita), tortilla (2 piezas)", "Fresa rebanada (1 taza)"]
}, {
  d: ["Calabacitas a la mexicana: calabacita picada (½ taza), elote desgranado (½ taza), jitomate y cebolla (1 taza), aceite (1 cucharadita), queso panela (80 g), tortilla (1 pieza)", "Arándanos secos (½ taza)", "Yogur natural sin azúcar (1 taza)"],
  cm: "Ciruela roja o amarilla (3 piezas)",
  co: ["Sopa de lentejas: lenteja cocida (½ taza), acelga cocida (½ taza), aceite (1 cucharadita)", "Picadillo de res: pulpa molida (60 g), verduras mixtas (1 taza), aceite (1 cucharadita), tortilla (3 piezas)"],
  cv: "Durazno amarillo (2 piezas)",
  ce: ["Pan tostado con aguacate y queso: pan integral (2 piezas), aguacate (⅓), queso panela (40 g), jitomate en rodajas (1 pieza)", "Melón picado (1 taza)"]
}, {
  d: ["Machaca a la mexicana: machaca de res (60 g), jitomate y cebolla, calabacita y zanahoria hervidas (1 taza), tortilla (2 piezas), aceite (1 cucharadita)", "Fresa rebanada (1 taza)", "Leche descremada (1 taza)"],
  cm: "Uva (18 piezas)",
  co: ["Sopa de alubias: alubias caldosas (½ taza), aceite (1 cucharadita)", "Pollo con verdolagas: pollo (60 g), verdolagas (1 taza), arroz rojo (¼ de taza), aceite (1 cucharadita), tortilla (2 piezas)"],
  cv: "Mandarina (2 piezas)",
  ce: ["Sopes: sope de maíz (2 piezas), pollo deshebrado (30 g), aguacate (⅓), ensalada de nopales (1 taza)", "Melón picado (1 taza)"]
}, {
  d: ["Mollete: queso panela (80 g), pico de gallo (1 taza), telera sin migajón (⅔ de pieza), aguacate (⅓), frijoles machacados (⅓ de taza)", "Manzana (1 pieza)"],
  cm: "Durazno amarillo (2 piezas)",
  co: ["Arroz con verdura: arroz (¼ de taza), zanahoria y chícharos (½ taza), aceite (1 cucharadita)", "Bistec de res a la mexicana: bistec (60 g), pico de gallo (1 taza), tortilla (2 piezas), aguacate (⅓)"],
  cv: "Fresa rebanada (1 taza)",
  ce: ["Omelette de espinacas: huevo (1 pieza), espinaca (½ taza), aceite (1 cucharadita), tortilla (2 piezas)", "Durazno amarillo (2 piezas)", "Yogur natural sin azúcar (1 taza)"]
}, {
  d: ["Chayote con queso: chayote hervido (½ taza), queso panela (80 g), tortilla (2 piezas), aguacate (⅓)", "Melón picado (1 taza)", "Yogur natural sin azúcar (1 taza)"],
  cm: "Guayabas chicas (3 piezas)",
  co: ["Fideo seco con salsa de frijol y morita: fideo cocido (½ taza), frijoles caldosos (½ taza), aguacate (⅓)", "Pescado a la plancha: filete (80 g), verduras mixtas (1 taza), aceite (1 cucharadita), tortilla (2 piezas)"],
  cv: "Pera (½ pieza)",
  ce: ["Jitomates rellenos de atún: jitomate (2 piezas), atún (30 g), elote desgranado (½ taza), aceitunas (3 piezas), tostadas horneadas (2 piezas)", "Sandía picada (1 taza)"]
}, {
  d: ["Huevo sobre pan tostado: pan tostado (2 piezas), frijoles (½ taza), huevo (2 piezas), aceite (1 cucharadita), ejote (½ taza), salsa al gusto", "Ciruela (3 piezas)"],
  cm: "Piña picada (¾ de taza)",
  co: ["Pollo a la parrilla: pollo (60 g), arroz (¼ de taza), aceite (2 cucharaditas), tortilla (2 piezas)", "Ensalada de verduras mixtas: lechugas (1½ tazas), zanahoria (¼ de taza)"],
  cv: "Plátano tabasco (½ pieza)",
  ce: ["Sándwich de queso: pan de caja (2 rebanadas), queso blanco (35 g), espinaca cocida (½ taza), aguacate (⅓)", "Manzana (1 pieza)", "Leche descremada (1 taza)"]
}, {
  d: ["Chilaquiles rojos o verdes con pollo: pechuga deshebrada (60 g), salsa al gusto, tortilla horneada (2 piezas), verdura hervida (1 taza), aguacate (⅓)", "Papaya picada (1 taza)", "Yogur natural sin azúcar (1 taza)"],
  cm: "Mango (½ pieza)",
  co: ["Sopa de verduras: verduras mixtas (1 taza), caldo de pollo", "Cerdo en pasilla: carne magra (60 g), nopales (1 taza), salsa pasilla, arroz rojo (¼ de taza), aceite (1 cucharadita)", "Tortilla (2 piezas), frijoles caldosos (½ taza) y aguacate (⅓)"],
  cv: "Arándanos secos (½ taza) y almendras (10 piezas)",
  ce: ["Quesadilla de huitlacoche: tortilla (2 piezas), huitlacoche cocido (½ taza), queso blanco (35 g), aguacate (⅓)", "Toronja (1 pieza)"]
}, {
  d: ["Caldo tlalpeño: verduras mixtas (1 taza), pechuga deshebrada (60 g), arroz (¼ de taza), aceite (1 cucharadita), tortilla (1 pieza)", "Uvas (18 piezas)", "Yogur natural sin azúcar (1 taza)"],
  cm: "Tuna (2 piezas)",
  co: ["Ceviche de pescado: filete (80 g), pico de gallo (1 taza), jugo de limón, aguacate (⅔ de pieza), tostadas horneadas (6 piezas)"],
  cv: "Piña picada (¾ de taza)",
  ce: ["Calabacitas a la mexicana: calabacita (½ taza), elote (½ taza), jitomate y cebolla (1 taza), aceite (1 cucharadita), queso panela (40 g), tortilla (1 pieza), frijoles caldosos (½ taza)", "Arándanos secos (½ taza)"]
}, {
  d: ["Sándwich de queso: pan de caja (2 rebanadas), queso panela (80 g), aguacate (⅓), jitomate (1 pieza), lechuga (1 taza)", "Melón picado (1 taza)", "Yogur natural sin azúcar (1 taza)"],
  cm: "Tangerina (2 piezas)",
  co: ["Caldo de hongos con pollo: pierna o muslo sin piel (60 g), hongos o setas (½ taza), aceite (2 cucharaditas), jitomate, guajillo y epazote", "Garbanzo cocido (½ taza) y tortilla de maíz (3 piezas)"],
  cv: "Higo (2 piezas)",
  ce: ["Tostadas de picadillo de res: pulpa molida (30 g), verduras mixtas (½ taza), aceite (1 cucharadita), jitomate y cebolla (1 taza), tostadas horneadas (4 piezas)", "Naranja (2 piezas)"]
}];
function MenuSemanal() {
  const [dia, setDia] = useState(0);
  const m = MENU14[dia];
  const Bloque = ({
    titulo,
    emoji,
    items,
    tone
  }) => React.createElement("div", {
    className: "rounded-xl border p-3 " + tone
  }, React.createElement("div", {
    className: "text-xs font-bold uppercase tracking-wide mb-1.5"
  }, emoji, " ", titulo), Array.isArray(items) ? React.createElement("ul", {
    className: "text-xs space-y-1"
  }, items.map((it, i) => React.createElement("li", {
    key: i
  }, "\u2022 ", it))) : React.createElement("div", {
    className: "text-xs"
  }, "\u2022 ", items));
  return React.createElement("div", null, React.createElement("div", {
    className: "flex gap-1.5 overflow-x-auto pb-2 mb-3"
  }, MENU14.map((_, i) => React.createElement("button", {
    key: i,
    onClick: () => setDia(i),
    className: "w-9 h-9 shrink-0 rounded-full text-xs font-bold border transition-colors " + (dia === i ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-slate-600 border-slate-300 hover:border-emerald-400")
  }, i + 1))), React.createElement("div", {
    className: "space-y-2"
  }, React.createElement(Bloque, {
    titulo: "Desayuno",
    emoji: "\uD83C\uDF05",
    items: m.d,
    tone: "bg-emerald-50/60 border-emerald-100 text-emerald-900"
  }), React.createElement(Bloque, {
    titulo: "Colaci\xF3n matutina",
    emoji: "\uD83C\uDF4F",
    items: m.cm,
    tone: "bg-slate-50 border-slate-200 text-slate-700"
  }), React.createElement(Bloque, {
    titulo: "Comida",
    emoji: "\uD83C\uDF72",
    items: m.co,
    tone: "bg-amber-50/60 border-amber-100 text-amber-900"
  }), React.createElement(Bloque, {
    titulo: "Colaci\xF3n vespertina",
    emoji: "\uD83C\uDF51",
    items: m.cv,
    tone: "bg-slate-50 border-slate-200 text-slate-700"
  }), React.createElement(Bloque, {
    titulo: "Cena",
    emoji: "\uD83C\uDF19",
    items: m.ce,
    tone: "bg-sky-50/60 border-sky-100 text-sky-900"
  })), React.createElement("p", {
    className: "text-[11px] text-slate-400 mt-3"
  }, "Puedes intercambiar el desayuno, comida o cena de un d\xEDa por el de otro, y sustituir cualquier alimento por otro del mismo grupo seg\xFAn la lista de intercambio. Todas las preparaciones llevan salsa, especias, lim\xF3n, cebolla y ajo al gusto."));
}
const DX_LISTA = ["Esplenomegalia", "Colitis aguda infecciosa", "Hígado graso / esteatosis moderada", "Gastritis crónica erosiva", "Plaquetas bajas (94,000)", "Triglicéridos altos (350)"];
const DX_EVITAR = [{
  emoji: "🍺",
  grupo: "Alcohol y tabaco — CERO, sin excepción",
  porque: "Daña directamente el hígado graso, erosiona más la mucosa gástrica, sube los triglicéridos y reduce la producción y función de las plaquetas.",
  items: ["Cerveza (incluida la 'light' o sin alcohol con azúcar)", "Vino y sidra", "Tequila, mezcal, whisky, ron, vodka y destilados", "Bebidas preparadas, micheladas y cocteles", "Pulque y bebidas fermentadas", "Cigarro y vapeadores (irritan la mucosa gástrica)"]
}, {
  emoji: "🧁",
  grupo: "Azúcares y harinas refinadas",
  porque: "El azúcar es la causa principal de triglicéridos en 350 y alimenta la esteatosis hepática: el hígado convierte el exceso de azúcar en grasa.",
  items: ["Refrescos (normales y de cola)", "Jugos y néctares industrializados", "Jugos naturales colados (aun sin azúcar añadida, concentran fructosa)", "Aguas frescas endulzadas", "Pan dulce, pasteles, pastelitos y donas", "Galletas dulces y rellenas", "Dulces, chocolates, gomitas y caramelos", "Mermelada, cajeta, lechera y ate", "Cereales de caja azucarados y barritas", "Helados, nieves y paletas", "Miel, piloncillo y jarabes en exceso", "Atole, champurrado y chocolate caliente azucarados"]
}, {
  emoji: "🍖",
  grupo: "Grasas saturadas, frituras y embutidos",
  porque: "Empeoran el hígado graso y los triglicéridos, y retrasan el vaciamiento gástrico, lo que agrava la gastritis erosiva.",
  items: ["Chicharrón, carnitas y cueritos", "Barbacoa y birria grasosas", "Tocino, chorizo y longaniza", "Salchicha, jamón, mortadela y salami", "Manteca, mantequilla y margarina", "Crema y mayonesa", "Quesos amarillos, manchego, oaxaca y doble crema", "Frituras, papas fritas y botanas empaquetadas", "Empanizados y capeados", "Pizza, hamburguesas y tortas con embutido", "Vísceras (hígado, sesos, moronga)", "Caldos con mucha grasa (consomé sin desgrasar)"]
}, {
  emoji: "🌶️",
  grupo: "Irritantes gástricos",
  porque: "Con gastritis crónica erosiva la mucosa ya está lastimada; estos alimentos y bebidas la inflaman y retrasan su cicatrización.",
  items: ["Chile, salsas picantes, chile en polvo con limón", "Pimienta y especias fuertes en exceso", "Café (incluso descafeinado) y té negro", "Refresco de cola y bebidas energéticas", "Jugo de naranja o toronja y limón en ayunas", "Vinagres, encurtidos y escabeches en exceso", "Jitomate crudo abundante y salsas muy ácidas", "Cebolla y ajo crudos", "Menta y hierbabuena concentradas", "Alimentos o bebidas muy calientes o muy fríos"]
}, {
  emoji: "🍣",
  grupo: "Alimentos crudos o de riesgo (¡muy importante!)",
  porque: "Con plaquetas en 94,000 y una colitis infecciosa activa, cualquier alimento contaminado o crudo representa riesgo alto de infección y complicaciones.",
  items: ["Sushi, pescado y mariscos crudos", "Ceviche, aguachile y ostiones", "Carne cruda o término medio (carpaccio, tártara)", "Huevo crudo o tibio (y aderezos que lo contengan)", "Lácteos sin pasteurizar y quesos frescos artesanales", "Alimentos de puestos callejeros sin higiene garantizada", "Frutas y verduras sin lavar ni desinfectar", "Hielo y agua de origen dudoso", "Germinados crudos (alfalfa, soya)"]
}, {
  emoji: "🫘",
  grupo: "Difíciles de digerir mientras dure la colitis",
  porque: "Durante la colitis aguda el intestino está inflamado: la fibra dura, la lactosa y los alimentos que producen gas aumentan el dolor y la diarrea. Se reintroducen poco a poco al mejorar.",
  items: ["Frijol, haba y lenteja enteros (solo colados o en puré)", "Col, coliflor y brócoli crudos o en exceso", "Elote y palomitas", "Verduras crudas con cáscara y ensaladas abundantes", "Leche entera y quesos grasos (lactosa temporalmente)", "Cacahuates y semillas con cáscara o salados", "Chicles y productos 'sin azúcar' con sorbitol (dan diarrea)", "Frutas con cáscara y semillas (durante la fase aguda)"]
}, {
  emoji: "🧂",
  grupo: "Exceso de sodio y ultraprocesados",
  porque: "Sobrecargan hígado y circulación, irritan el estómago y suelen traer grasas y azúcares ocultos.",
  items: ["Sopas instantáneas y ramen", "Consomé en polvo y cubos sazonadores", "Botanas saladas y cacahuates enchilados", "Enlatados altos en sodio", "Salsas envasadas (soya, inglesa, cátsup en exceso)", "Cecina, machaca salada y carnes curadas"]
}, {
  emoji: "💊",
  grupo: "Precaución con suplementos y remedios (por las plaquetas bajas)",
  porque: "Algunos suplementos interfieren con la coagulación. Con 94,000 plaquetas, consúltalo SIEMPRE con tu médico antes de tomarlos.",
  items: ["Omega-3 / aceite de pescado en dosis altas", "Vitamina E en dosis altas", "Ginkgo biloba", "Ajo, jengibre y cúrcuma en suplemento concentrado", "Aspirina y antiinflamatorios (ibuprofeno, naproxeno) sin indicación médica: dañan la mucosa gástrica y afectan las plaquetas"]
}];
const DX_PERMITIDOS = [{
  emoji: "🥕",
  grupo: "Verduras (cocidas de preferencia)",
  racion: "1 taza cocida en comida y en cena",
  items: ["Calabacita cocida — 1 taza", "Chayote cocido — 1 taza", "Zanahoria cocida — ½ a 1 taza", "Espinaca o acelga cocida — 1 taza", "Nopales cocidos — 1 taza", "Ejotes cocidos — 1 taza", "Betabel cocido — ½ taza", "Chilacayote y calabaza de castilla — 1 taza", "Brócoli bien cocido — ½ taza (solo si no te inflama)", "Puré de verduras o cremas sin crema añadida — 1 taza"]
}, {
  emoji: "🍎",
  grupo: "Frutas (enteras, lavadas y desinfectadas; nunca en jugo)",
  racion: "2 a 3 raciones al día",
  items: ["Papaya picada — 1 taza", "Plátano — ½ a 1 pieza", "Manzana o pera sin cáscara (o cocida) — 1 pieza", "Guayaba sin semillas — 2 piezas", "Melón picado — 1 taza", "Durazno — 2 piezas", "Mango — ½ pieza (si no hay diarrea activa)", "Sandía — 1 taza", "Fresas desinfectadas — 1 taza (al mejorar la colitis)"]
}, {
  emoji: "🌽",
  grupo: "Cereales y tubérculos",
  racion: "1 ración por tiempo de comida",
  items: ["Tortilla de maíz — 2 piezas por comida", "Arroz cocido (blanco durante la colitis) — ¼ a ½ taza", "Avena — ⅓ de taza en seco (cocida con agua o leche descremada)", "Pan de caja tostado o bolillo sin migajón — 1 a 2 piezas", "Pasta cocida — ½ taza", "Papa o camote cocidos — 1 pieza chica", "Galletas habaneras o de animalitos sin azúcar añadida — 4 a 5 piezas", "Tostadas horneadas (no fritas) — 2 piezas"]
}, {
  emoji: "🫛",
  grupo: "Leguminosas",
  racion: "½ taza caldosas · coladas o en puré mientras dure la colitis",
  items: ["Frijoles caldosos colados — ½ taza", "Lenteja en puré o caldosa colada — ½ taza", "Garbanzo cocido y machacado — ½ taza (al mejorar)", "Alubias caldosas — ½ taza (al mejorar)"]
}, {
  emoji: "🍗",
  grupo: "Proteína magra — SIEMPRE bien cocida",
  racion: "1 ración en comida y una porción menor en cena",
  items: ["Pechuga de pollo sin piel — 60 a 90 g (asada, cocida o en caldo desgrasado)", "Pescado blanco bien cocido (tilapia, huachinango, robalo) — 80 a 100 g", "Atún en agua — ⅓ de lata (30 g)", "Pavo natural (no embutido comercial graso) — 2 rebanadas", "Huevo bien cocido — 1 a 2 piezas (duro, en salsa suave no picante)", "Res magra (bistec, pulpa) — 60 g, máximo 1–2 veces por semana", "Queso panela, requesón o cottage — 40 g", "Claras de huevo — 2 a 3 piezas"]
}, {
  emoji: "🥛",
  grupo: "Lácteos descremados y sin azúcar",
  racion: "1 a 2 raciones al día · deslactosados mientras dure la colitis",
  items: ["Leche descremada (deslactosada por ahora) — 1 taza", "Yogur natural sin azúcar — 1 taza (ayuda a recuperar la flora intestinal)", "Jocoque natural bajo en grasa — ½ taza"]
}, {
  emoji: "🥑",
  grupo: "Grasas buenas (con medida: son sanas pero concentradas)",
  racion: "2 a 3 raciones pequeñas al día",
  items: ["Aguacate — ⅓ de pieza", "Aceite de oliva o canola — 1 a 2 cucharaditas por comida (para cocinar, no freír)", "Almendras — 10 piezas (al mejorar la colitis)", "Nueces — 3 a 4 mitades (al mejorar la colitis)", "Cacahuates naturales sin sal — 14 piezas (solo sin colitis activa)"]
}, {
  emoji: "💧",
  grupo: "Bebidas permitidas",
  racion: "6 a 8 vasos de agua simple al día como base",
  items: ["Agua simple hervida, purificada o embotellada — 6 a 8 vasos", "Agua de limón o jamaica SIN azúcar — 1 a 2 vasos", "Té de manzanilla — 1 a 2 tazas (calma el estómago)", "Suero oral (Vida Suero Oral o electrolitos sin azúcar excesiva) — si hay diarrea o vómito", "Agua de avena colada sin azúcar — 1 vaso", "Caldo de pollo o verduras desgrasado — 1 taza"]
}];
function PlanDiagnostico() {
  const [openDx, setOpenDx] = useState(null);
  const toggleDx = id => setOpenDx(openDx === id ? null : id);
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\uD83E\uDE7A Plan de alimentaci\xF3n seg\xFAn tu diagn\xF3stico"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1"
  }, "Listas adaptadas a estos diagn\xF3sticos y resultados de laboratorio:"), React.createElement("div", {
    className: "flex flex-wrap gap-1.5 mt-2 text-[11px] font-semibold"
  }, DX_LISTA.map(d => React.createElement("span", {
    key: d,
    className: "bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-1"
  }, d))), React.createElement("div", {
    className: "mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 space-y-1"
  }, React.createElement("div", {
    className: "font-bold uppercase tracking-wide text-[11px]"
  }, "\u2B50 Reglas de oro para este caso"), React.createElement("div", null, "1. ", React.createElement("b", null, "Cero alcohol y cero az\xFAcar a\xF1adida"), " (triglic\xE9ridos 350 e h\xEDgado graso)."), React.createElement("div", null, "2. ", React.createElement("b", null, "Todo bien cocido, lavado y desinfectado"), " (plaquetas 94,000 + colitis infecciosa = riesgo alto de infecci\xF3n)."), React.createElement("div", null, "3. ", React.createElement("b", null, "5 tiempos de comida peque\xF1os"), " en horario fijo; no dejar el est\xF3mago vac\xEDo muchas horas (gastritis erosiva)."), React.createElement("div", null, "4. Preparaciones ", React.createElement("b", null, "asadas, cocidas, al vapor u horneadas"), "; nada frito, empanizado ni capeado."), React.createElement("div", null, "5. ", React.createElement("b", null, "No tomar aspirina, ibuprofeno ni suplementos sin autorizaci\xF3n de tu m\xE9dico"), " (afectan plaquetas y est\xF3mago).")), React.createElement("div", {
    className: "space-y-2 mt-3"
  }, React.createElement(Desplegable, {
    emoji: "\uD83D\uDEAB",
    tone: "text-rose-700",
    titulo: "Alimentos, comidas y bebidas que DEBES EVITAR",
    subtitulo: "Organizado por grupo, con la raz\xF3n seg\xFAn cada diagn\xF3stico",
    abierto: openDx === "dx-evitar",
    onToggle: () => toggleDx("dx-evitar")
  }, React.createElement("div", {
    className: "space-y-2.5"
  }, DX_EVITAR.map(g => React.createElement("div", {
    key: g.grupo,
    className: "rounded-xl border border-rose-100 bg-rose-50/50 p-3"
  }, React.createElement("div", {
    className: "text-sm font-bold text-rose-900"
  }, g.emoji, " ", g.grupo), React.createElement("p", {
    className: "text-[11px] text-rose-700 mt-0.5 mb-2"
  }, g.porque), React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, g.items.map(it => React.createElement("span", {
    key: it,
    className: "bg-white border border-rose-200 text-rose-800 rounded-full px-2.5 py-1 text-[11px]"
  }, it))))), React.createElement("p", {
    className: "text-[11px] text-slate-400"
  }, "Los alimentos marcados como temporales por la colitis se pueden reintroducir gradualmente cuando tu m\xE9dico confirme que la infecci\xF3n cedi\xF3."))), React.createElement(Desplegable, {
    emoji: "\u2705",
    tone: "text-emerald-700",
    titulo: "Alimentos y bebidas que S\xCD puedes consumir, con sus porciones",
    subtitulo: "Cada grupo indica la raci\xF3n recomendada por tiempo de comida o por d\xEDa",
    abierto: openDx === "dx-si",
    onToggle: () => toggleDx("dx-si")
  }, React.createElement("div", {
    className: "space-y-2.5"
  }, DX_PERMITIDOS.map(g => React.createElement("div", {
    key: g.grupo,
    className: "rounded-xl border border-emerald-100 bg-emerald-50/50 p-3"
  }, React.createElement("div", {
    className: "text-sm font-bold text-emerald-900"
  }, g.emoji, " ", g.grupo), React.createElement("div", {
    className: "text-[11px] font-semibold text-emerald-700 mt-0.5 mb-2"
  }, "Raci\xF3n: ", g.racion), React.createElement("ul", {
    className: "text-xs text-slate-700 space-y-1"
  }, g.items.map(it => React.createElement("li", {
    key: it
  }, "\u2022 ", it))))), React.createElement("div", {
    className: "rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5 text-[11px] text-sky-900"
  }, React.createElement("b", null, "Estructura sugerida del d\xEDa:"), " desayuno + colaci\xF3n matutina (fruta) + comida + colaci\xF3n vespertina (fruta o yogur natural) + cena ligera. \xDAltima comida al menos 2 horas antes de dormir para no irritar el est\xF3mago.")))), React.createElement("p", {
    className: "text-[11px] text-slate-400 mt-3"
  }, "Esta gu\xEDa es educativa y general para estos diagn\xF3sticos. Con plaquetas en 94,000 y triglic\xE9ridos en 350, el plan definitivo, los medicamentos y los suplementos deben ser indicados y vigilados por tu m\xE9dico tratante y un profesional de la nutrici\xF3n."));
}
const MEALS = [{
  id: "desayuno",
  label: "Desayuno",
  corto: "Des.",
  emoji: "🌅"
}, {
  id: "colacionM",
  label: "Colación matutina",
  corto: "Col. M.",
  emoji: "🍏"
}, {
  id: "comida",
  label: "Comida",
  corto: "Com.",
  emoji: "🍲"
}, {
  id: "colacionV",
  label: "Colación vespertina",
  corto: "Col. V.",
  emoji: "🍑"
}, {
  id: "cena",
  label: "Cena",
  corto: "Cena",
  emoji: "🌙"
}];
const GRUPOS_ORDEN = ["verdura", "fruta", "cereal", "leguminosa", "aoa", "leche", "grasa"];
const PLAN_EJEMPLO = {
  verdura: {
    desayuno: 1,
    colacionM: 0,
    comida: 1,
    colacionV: 0,
    cena: 1
  },
  fruta: {
    desayuno: 1,
    colacionM: 1,
    comida: 0,
    colacionV: 1,
    cena: 0
  },
  cereal: {
    desayuno: 3,
    colacionM: 0,
    comida: 3,
    colacionV: 1,
    cena: 2
  },
  leguminosa: {
    desayuno: 0,
    colacionM: 0,
    comida: 0,
    colacionV: 0,
    cena: 0
  },
  aoa: {
    desayuno: 2,
    colacionM: 0,
    comida: 3,
    colacionV: 0,
    cena: 3
  },
  leche: {
    desayuno: 0,
    colacionM: 0,
    comida: 0,
    colacionV: 0,
    cena: 0
  },
  grasa: {
    desayuno: 2,
    colacionM: 1,
    comida: 2,
    colacionV: 0,
    cena: 1
  }
};
const PLAN_KEY = "medicontrol-plan-raciones-v1";
const planVacio = () => {
  const p = {};
  for (const g of GRUPOS_ORDEN) {
    p[g] = {};
    for (const m of MEALS) p[g][m.id] = 0;
  }
  return p;
};
const cargarPlan = () => {
  try {
    const r = localStorage.getItem(PLAN_KEY);
    if (r) {
      const base = planVacio();
      const d = JSON.parse(r);
      for (const g of GRUPOS_ORDEN) {
        if (d[g]) for (const m of MEALS) base[g][m.id] = Number(d[g][m.id]) || 0;
      }
      return base;
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(PLAN_EJEMPLO));
};
const totalDiaGrupo = (plan, g) => MEALS.reduce((a, m) => a + (Number(plan[g] && plan[g][m.id]) || 0), 0);
const hoyISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const clasifIMC = imc => {
  if (!imc || imc <= 0) return {
    txt: "—",
    color: "text-slate-400"
  };
  if (imc < 18.5) return {
    txt: "Bajo peso",
    color: "text-sky-600"
  };
  if (imc < 25) return {
    txt: "Peso saludable",
    color: "text-emerald-600"
  };
  if (imc < 30) return {
    txt: "Sobrepeso",
    color: "text-amber-600"
  };
  if (imc < 35) return {
    txt: "Obesidad I",
    color: "text-orange-600"
  };
  if (imc < 40) return {
    txt: "Obesidad II",
    color: "text-red-600"
  };
  return {
    txt: "Obesidad III",
    color: "text-red-700"
  };
};
const clasifGrasa = (pct, sexo, edad) => {
  if (!pct || pct <= 0) return {
    txt: "—",
    color: "text-slate-400"
  };
  const muj = (sexo || "").toLowerCase().indexOf("muj") >= 0;
  const a = Number(edad) || 30;
  let sano, alto;
  if (muj) {
    if (a < 40) {
      sano = [21, 32];
      alto = 38;
    } else if (a < 60) {
      sano = [23, 33];
      alto = 39;
    } else {
      sano = [24, 35];
      alto = 41;
    }
  } else {
    if (a < 40) {
      sano = [8, 19];
      alto = 24;
    } else if (a < 60) {
      sano = [11, 21];
      alto = 27;
    } else {
      sano = [13, 24];
      alto = 29;
    }
  }
  if (pct < sano[0]) return {
    txt: "Bajo",
    color: "text-sky-600"
  };
  if (pct <= sano[1]) return {
    txt: "Saludable",
    color: "text-emerald-600"
  };
  if (pct <= alto) return {
    txt: "Elevado",
    color: "text-amber-600"
  };
  return {
    txt: "Obesidad",
    color: "text-red-600"
  };
};
const edadDe = perfil => {
  if (!perfil) return null;
  const e = typeof calcEdad === "function" ? calcEdad(perfil.fechaNac) : null;
  if (e !== null && e !== undefined && !isNaN(e)) return e;
  return perfil.edad ? Number(perfil.edad) : null;
};
const ultimaLectura = (data, tipo) => {
  const rs = (data && data.vitals && data.vitals.readings || []).filter(x => x.tipo === tipo);
  if (!rs.length) return null;
  return rs.slice().sort((a, b) => a.fecha + (a.hora || "") < b.fecha + (b.hora || "") ? 1 : -1)[0];
};
function MiPlanRaciones({
  plan,
  setPlan,
  avisar
}) {
  const set = (g, m, v) => {
    let n = parseInt(v, 10);
    if (isNaN(n) || n < 0) n = 0;
    if (n > 20) n = 20;
    setPlan(p => ({
      ...p,
      [g]: {
        ...p[g],
        [m]: n
      }
    }));
  };
  const restaurar = () => {
    setPlan(JSON.parse(JSON.stringify(PLAN_EJEMPLO)));
    avisar("Plan de ejemplo restaurado 📋");
  };
  const vaciar = () => {
    setPlan(planVacio());
    avisar("Plan vaciado para llenarlo de nuevo ✏️");
  };
  const totalDia = GRUPOS_ORDEN.reduce((a, g) => a + totalDiaGrupo(plan, g), 0);
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\uD83D\uDDD3\uFE0F Mi plan de raciones por tiempo de comida"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "Escribe cu\xE1ntas raciones de cada grupo te indic\xF3 tu nutri\xF3loga en cada comida. Puedes editarlo cuando quieras; se guarda solo en este tel\xE9fono. Viene precargado con un plan de ejemplo del IMSS."), React.createElement("div", {
    className: "overflow-x-auto -mx-1 px-1"
  }, React.createElement("table", {
    className: "w-full text-xs border-collapse"
  }, React.createElement("thead", null, React.createElement("tr", {
    className: "text-slate-500"
  }, React.createElement("th", {
    className: "text-left px-2 py-1.5 font-semibold"
  }, "Grupo"), MEALS.map(m => React.createElement("th", {
    key: m.id,
    className: "px-1 py-1.5 font-semibold text-center whitespace-nowrap"
  }, m.emoji, React.createElement("br", null), m.corto)), React.createElement("th", {
    className: "px-1 py-1.5 font-semibold text-center text-emerald-700"
  }, "D\xEDa"))), React.createElement("tbody", null, GRUPOS_ORDEN.map((g, i) => React.createElement("tr", {
    key: g,
    className: i % 2 ? "bg-slate-50/50" : "bg-white"
  }, React.createElement("td", {
    className: "px-2 py-1 text-slate-700 whitespace-nowrap"
  }, GRUPOS[g].emoji, " ", GRUPOS[g].label), MEALS.map(m => React.createElement("td", {
    key: m.id,
    className: "px-0.5 py-1 text-center"
  }, React.createElement("input", {
    type: "number",
    min: "0",
    max: "20",
    inputMode: "numeric",
    value: plan[g][m.id] || 0,
    onChange: e => set(g, m.id, e.target.value),
    className: "w-10 text-center rounded-lg border border-slate-200 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
  }))), React.createElement("td", {
    className: "px-1 py-1 text-center font-bold text-emerald-700"
  }, totalDiaGrupo(plan, g))))))), React.createElement("div", {
    className: "flex items-center justify-between mt-3 flex-wrap gap-2"
  }, React.createElement("span", {
    className: "text-xs text-slate-500"
  }, "Total de raciones al d\xEDa: ", React.createElement("b", {
    className: "text-slate-800"
  }, totalDia)), React.createElement("div", {
    className: "flex gap-2"
  }, React.createElement("button", {
    onClick: restaurar,
    className: "text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full px-3 py-1.5 hover:bg-emerald-100"
  }, "\uD83D\uDCCB Plan de ejemplo"), React.createElement("button", {
    onClick: vaciar,
    className: "text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-3 py-1.5 hover:bg-slate-100"
  }, "Vaciar"))));
}
function ControlDiarioRaciones({
  plan,
  avisar
}) {
  const hoyStr = hoyISO;
  const [fecha, setFecha] = useState(hoyStr);
  const [sel, setSel] = useState({});
  const [data, setData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("medicontrol-control-raciones-v1")) || {};
    } catch (e) {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("medicontrol-control-raciones-v1", JSON.stringify(data));
    } catch (e) {}
  }, [data]);
  const dia = data[fecha] || {};
  const add = (g, delta) => setData(d => {
    const cur = {
      ...(d[fecha] || {})
    };
    cur[g] = Math.max(0, (Number(cur[g]) || 0) + delta);
    return {
      ...d,
      [fecha]: cur
    };
  });
  const reiniciar = () => {
    setData(d => ({
      ...d,
      [fecha]: {}
    }));
    avisar("Día reiniciado ↺");
  };
  const conMeta = GRUPOS_ORDEN.filter(g => totalDiaGrupo(plan, g) > 0);
  const totTarget = conMeta.reduce((a, g) => a + totalDiaGrupo(plan, g), 0);
  const totDone = conMeta.reduce((a, g) => a + Math.min(Number(dia[g]) || 0, totalDiaGrupo(plan, g)), 0);
  const pctDia = totTarget ? Math.round(totDone / totTarget * 100) : 0;
  const fechaTxt = (() => {
    try {
      return new Date(fecha + "T12:00:00").toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long"
      });
    } catch (e) {
      return fecha;
    }
  })();
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\u2705 Control diario de raciones"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1"
  }, "Marca lo que vas comiendo durante el d\xEDa. Cada grupo se compara con el total que pusiste en tu plan. Se guarda por d\xEDa en este tel\xE9fono."), React.createElement("div", {
    className: "flex items-center gap-2 mt-3 flex-wrap"
  }, React.createElement("input", {
    type: "date",
    value: fecha,
    max: hoyStr(),
    onChange: e => setFecha(e.target.value || hoyStr()),
    className: "rounded-xl border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  }), fecha !== hoyStr() && React.createElement("button", {
    onClick: () => setFecha(hoyStr()),
    className: "text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-full px-3 py-1.5"
  }, "Hoy"), React.createElement("span", {
    className: "text-xs text-slate-500 capitalize"
  }, fechaTxt)), totTarget === 0 && React.createElement("div", {
    className: "mt-4 text-sm bg-amber-50 border border-amber-100 text-amber-800 rounded-xl px-3 py-2.5 flex items-center gap-2"
  }, React.createElement(IWarn, {
    cls: "w-4 h-4 shrink-0"
  }), " Escribe tu plan de raciones arriba para ver tu meta diaria. Mientras, puedes ir registrando lo que comes de cada grupo."), totTarget > 0 && React.createElement("div", {
    className: "mt-4 mb-3"
  }, React.createElement("div", {
    className: "flex items-center justify-between text-xs mb-1"
  }, React.createElement("span", {
    className: "font-semibold text-slate-700"
  }, "Avance del d\xEDa"), React.createElement("span", {
    className: "font-bold text-emerald-700"
  }, totDone, " / ", totTarget, " raciones \xB7 ", pctDia, "%")), React.createElement("div", {
    className: "h-2.5 rounded-full bg-slate-100 overflow-hidden"
  }, React.createElement("div", {
    className: "h-full bg-emerald-500 rounded-full transition-all",
    style: {
      width: pctDia + "%"
    }
  }))), React.createElement("div", {
    className: "space-y-2.5 mt-4"
  }, GRUPOS_ORDEN.map(g => {
    const target = totalDiaGrupo(plan, g);
    const done = Number(dia[g]) || 0;
    const pct = target ? Math.min(100, Math.round(done / target * 100)) : 0;
    const completo = target > 0 && done >= target;
    const idx = sel[g];
    const item = idx != null ? ALIMENTOS[g][idx] : null;
    return React.createElement("div", {
      key: g,
      className: "rounded-xl border p-3 " + (completo ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200")
    }, React.createElement("div", {
      className: "flex items-center justify-between gap-2"
    }, React.createElement("span", {
      className: "text-sm font-semibold text-slate-800"
    }, GRUPOS[g].emoji, " ", GRUPOS[g].label), React.createElement("div", {
      className: "flex items-center gap-2"
    }, React.createElement("button", {
      onClick: () => add(g, -1),
      className: "w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center hover:bg-slate-200"
    }, "\u2212"), React.createElement("span", {
      className: "text-sm font-bold tabular-nums min-w-[3rem] text-center " + (completo ? "text-emerald-700" : "text-slate-700")
    }, done, " / ", target), React.createElement("button", {
      onClick: () => add(g, 1),
      className: "w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center hover:bg-emerald-700"
    }, "+"))), target > 0 ? React.createElement("div", {
      className: "h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2"
    }, React.createElement("div", {
      className: "h-full rounded-full " + (completo ? "bg-emerald-500" : "bg-emerald-400"),
      style: {
        width: pct + "%"
      }
    })) : React.createElement("div", {
      className: "text-[11px] text-slate-400 mt-1"
    }, "Sin meta en tu plan \xB7 registro libre"), React.createElement("select", {
      className: "w-full mt-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white",
      value: idx != null ? idx : "",
      onChange: e => setSel(s => ({
        ...s,
        [g]: e.target.value === "" ? null : Number(e.target.value)
      }))
    }, React.createElement("option", {
      value: ""
    }, "\xBFQu\xE9 comiste de este grupo? (ver raci\xF3n)\u2026"), ALIMENTOS[g].map((it, i) => React.createElement("option", {
      key: it[0],
      value: i
    }, it[0], " \u2014 1 raci\xF3n = ", fmtCantidad(it[1], it[2], 1)))), item && React.createElement("div", {
      className: "mt-1.5 text-xs text-emerald-900 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5"
    }, "1 raci\xF3n de ", React.createElement("b", null, item[0]), " = ", React.createElement("b", null, fmtCantidad(item[1], item[2], 1))));
  })), React.createElement("div", {
    className: "flex justify-end mt-3"
  }, React.createElement("button", {
    onClick: reiniciar,
    className: "text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-3 py-1.5 hover:bg-slate-100"
  }, "\u21BA Reiniciar este d\xEDa")));
}
function Nutriologa() {
  const [n, setN] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("medicontrol-nutriologa-v1")) || {
        nombre: "",
        tel: ""
      };
    } catch (e) {
      return {
        nombre: "",
        tel: ""
      };
    }
  });
  const [edit, setEdit] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem("medicontrol-nutriologa-v1", JSON.stringify(n));
    } catch (e) {}
  }, [n]);
  const tel = (n.tel || "").replace(/[^0-9+]/g, "");
  const tieneDatos = (n.nombre || "").trim() || tel;
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("div", {
    className: "flex items-center justify-between gap-2"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, React.createElement(IUser, {
    cls: "w-5 h-5 text-emerald-700"
  }), " Mi nutri\xF3loga ", React.createElement("span", {
    className: "text-xs font-normal text-slate-400"
  }, "(opcional)")), !edit && React.createElement("button", {
    onClick: () => setEdit(true),
    className: "text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-full px-3 py-1.5"
  }, tieneDatos ? "Editar" : "Agregar")), edit ? React.createElement("div", {
    className: "mt-3 space-y-2"
  }, React.createElement("input", {
    type: "text",
    placeholder: "Nombre de la nutri\xF3loga",
    value: n.nombre,
    onChange: e => setN(v => ({
      ...v,
      nombre: e.target.value
    })),
    className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  }), React.createElement("input", {
    type: "tel",
    inputMode: "tel",
    placeholder: "Tel\xE9fono (10 d\xEDgitos)",
    value: n.tel,
    onChange: e => setN(v => ({
      ...v,
      tel: e.target.value
    })),
    className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  }), React.createElement("div", {
    className: "flex justify-end gap-2"
  }, React.createElement("button", {
    onClick: () => {
      setN({
        nombre: "",
        tel: ""
      });
    },
    className: "text-xs font-semibold text-slate-500 px-3 py-1.5"
  }, "Borrar"), React.createElement("button", {
    onClick: () => setEdit(false),
    className: "text-xs font-semibold bg-emerald-700 text-white rounded-full px-4 py-1.5 hover:bg-emerald-800"
  }, "Guardar"))) : tieneDatos ? React.createElement("div", {
    className: "mt-2"
  }, n.nombre && React.createElement("div", {
    className: "text-sm font-semibold text-slate-800"
  }, n.nombre), tel && React.createElement("div", {
    className: "text-xs text-slate-500 mt-0.5"
  }, n.tel), tel && React.createElement("div", {
    className: "flex gap-2 mt-3"
  }, React.createElement("a", {
    href: "tel:" + tel,
    className: "flex-1 text-center text-sm font-semibold bg-emerald-600 text-white rounded-xl px-3 py-2 hover:bg-emerald-700"
  }, "\uD83D\uDCDE Llamar"), React.createElement("a", {
    href: "https://wa.me/52" + tel.replace(/[^0-9]/g, ""),
    target: "_blank",
    rel: "noopener noreferrer",
    className: "flex-1 text-center text-sm font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-3 py-2 hover:bg-emerald-100"
  }, "\uD83D\uDCAC WhatsApp"))) : React.createElement("p", {
    className: "text-xs text-slate-400 mt-2"
  }, "Agrega el nombre y tel\xE9fono de tu nutri\xF3loga para tenerlos a la mano y poder llamarle o escribirle por WhatsApp."));
}
function MacronutrientesTabla() {
  const [m, setM] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("medicontrol-macros-v1")) || {
        hc: 50,
        prot: 20,
        lip: 30,
        kcal: 1500
      };
    } catch (e) {
      return {
        hc: 50,
        prot: 20,
        lip: 30,
        kcal: 1500
      };
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("medicontrol-macros-v1", JSON.stringify(m));
    } catch (e) {}
  }, [m]);
  const num = v => {
    let n = parseFloat(v);
    if (isNaN(n) || n < 0) n = 0;
    return n;
  };
  const set = (k, v) => setM(p => ({
    ...p,
    [k]: v === "" ? "" : num(v)
  }));
  const suma = Math.round(num(m.hc) + num(m.prot) + num(m.lip));
  const gramos = (pct, kcalG) => Math.round(num(m.kcal) * num(pct) / 100 / kcalG);
  const filas = [{
    k: "hc",
    label: "Hidratos de carbono",
    emoji: "🍞",
    kcalG: 4
  }, {
    k: "prot",
    label: "Proteínas",
    emoji: "🍗",
    kcalG: 4
  }, {
    k: "lip",
    label: "Lípidos (grasas)",
    emoji: "🥑",
    kcalG: 9
  }];
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\uD83E\uDD57 Distribuci\xF3n de macronutrientes"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "Escribe los porcentajes que te indic\xF3 tu nutri\xF3loga y las calor\xEDas del d\xEDa. La app calcula los gramos de cada nutriente."), React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, React.createElement("label", {
    className: "text-sm text-slate-600"
  }, "Calor\xEDas del d\xEDa:"), React.createElement("input", {
    type: "number",
    min: "0",
    inputMode: "numeric",
    value: m.kcal,
    onChange: e => set("kcal", e.target.value),
    className: "w-24 rounded-xl border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  }), React.createElement("span", {
    className: "text-sm text-slate-500"
  }, "kcal")), React.createElement("div", {
    className: "space-y-2"
  }, filas.map(f => React.createElement("div", {
    key: f.k,
    className: "flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2"
  }, React.createElement("span", {
    className: "text-sm font-semibold text-slate-800 flex-1"
  }, f.emoji, " ", f.label), React.createElement("input", {
    type: "number",
    min: "0",
    max: "100",
    inputMode: "numeric",
    value: m[f.k],
    onChange: e => set(f.k, e.target.value),
    className: "w-16 text-center rounded-lg border border-slate-200 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
  }), React.createElement("span", {
    className: "text-sm text-slate-500 w-4"
  }, "%"), React.createElement("span", {
    className: "text-sm font-bold text-emerald-700 tabular-nums w-16 text-right"
  }, gramos(m[f.k], f.kcalG), " g")))), React.createElement("div", {
    className: "mt-3 text-xs font-semibold rounded-lg px-3 py-2 " + (suma === 100 ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-amber-50 text-amber-800 border border-amber-100")
  }, suma === 100 ? "✓ Suma 100%" : "Suma " + suma + "% — lo recomendado es que los tres porcentajes sumen 100%"));
}
function SeguimientoLogros({
  avisar,
  sexoPerfil,
  estaturaPerfil,
  edadPerfil
}) {
  const estIni = estaturaPerfil ? String(+(Number(estaturaPerfil) / 100).toFixed(2)) : "";
  const [hist, setHist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("medicontrol-seguimiento-v1")) || [];
    } catch (e) {
      return [];
    }
  });
  const [f, setF] = useState({
    fecha: hoyISO(),
    peso: "",
    estatura: estIni,
    cintura: "",
    grasa: ""
  });
  useEffect(() => {
    try {
      localStorage.setItem("medicontrol-seguimiento-v1", JSON.stringify(hist));
    } catch (e) {}
  }, [hist]);
  useEffect(() => {
    if (estIni && !f.estatura) setF(v => ({
      ...v,
      estatura: estIni
    }));
  }, [estIni]);
  const agregar = () => {
    const peso = parseFloat(f.peso),
      est = parseFloat(f.estatura);
    if (!peso) {
      avisar("Escribe al menos tu peso ⚖️");
      return;
    }
    const imc = peso && est ? +(peso / (est * est)).toFixed(1) : 0;
    const reg = {
      id: Date.now(),
      fecha: f.fecha || hoyISO(),
      peso,
      estatura: est || 0,
      imc,
      cintura: parseFloat(f.cintura) || 0,
      grasa: parseFloat(f.grasa) || 0,
      sexo: sexoPerfil || "",
      edad: edadPerfil || ""
    };
    setHist(h => [reg, ...h].sort((a, b) => a.fecha < b.fecha ? 1 : -1));
    setF(v => ({
      ...v,
      peso: "",
      cintura: "",
      grasa: ""
    }));
    avisar("Registro guardado 📈");
  };
  const borrar = id => setHist(h => h.filter(r => r.id !== id));
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\uD83D\uDCC8 Seguimiento de tus logros"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "Registra tu avance cada cierto tiempo para ver c\xF3mo cambias. El IMC y los diagn\xF3sticos se calculan solos. Se guarda en este tel\xE9fono."), React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, React.createElement("label", {
    className: "text-xs text-slate-500"
  }, "Fecha", React.createElement("input", {
    type: "date",
    value: f.fecha,
    max: hoyISO(),
    onChange: e => setF(v => ({
      ...v,
      fecha: e.target.value
    })),
    className: "w-full mt-0.5 rounded-xl border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  })), React.createElement("label", {
    className: "text-xs text-slate-500"
  }, "Peso (kg)", React.createElement("input", {
    type: "number",
    inputMode: "decimal",
    value: f.peso,
    onChange: e => setF(v => ({
      ...v,
      peso: e.target.value
    })),
    placeholder: "Ej. 71.3",
    className: "w-full mt-0.5 rounded-xl border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  })), React.createElement("label", {
    className: "text-xs text-slate-500"
  }, "Estatura (m)", React.createElement("input", {
    type: "number",
    inputMode: "decimal",
    value: f.estatura,
    onChange: e => setF(v => ({
      ...v,
      estatura: e.target.value
    })),
    placeholder: "Ej. 1.66",
    className: "w-full mt-0.5 rounded-xl border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  })), React.createElement("label", {
    className: "text-xs text-slate-500"
  }, "Cintura (cm)", React.createElement("input", {
    type: "number",
    inputMode: "decimal",
    value: f.cintura,
    onChange: e => setF(v => ({
      ...v,
      cintura: e.target.value
    })),
    placeholder: "Opcional",
    className: "w-full mt-0.5 rounded-xl border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  })), React.createElement("label", {
    className: "text-xs text-slate-500 col-span-2"
  }, "% de grasa corporal", React.createElement("input", {
    type: "number",
    inputMode: "decimal",
    value: f.grasa,
    onChange: e => setF(v => ({
      ...v,
      grasa: e.target.value
    })),
    placeholder: "Opcional",
    className: "w-full mt-0.5 rounded-xl border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  }))), React.createElement("button", {
    onClick: agregar,
    className: "w-full mt-3 bg-emerald-700 text-white text-sm font-semibold rounded-xl py-2 hover:bg-emerald-800 flex items-center justify-center gap-2"
  }, React.createElement(IPlus, {
    cls: "w-4 h-4"
  }), " Guardar registro"), hist.length > 0 && React.createElement("div", {
    className: "mt-4 overflow-x-auto -mx-1 px-1"
  }, React.createElement("table", {
    className: "w-full text-xs border-collapse"
  }, React.createElement("thead", null, React.createElement("tr", {
    className: "text-slate-500 border-b border-slate-200"
  }, React.createElement("th", {
    className: "text-left px-2 py-1.5 font-semibold whitespace-nowrap"
  }, "Fecha"), React.createElement("th", {
    className: "px-2 py-1.5 font-semibold text-center"
  }, "Peso"), React.createElement("th", {
    className: "px-2 py-1.5 font-semibold text-center"
  }, "Estatura"), React.createElement("th", {
    className: "px-2 py-1.5 font-semibold text-center"
  }, "IMC"), React.createElement("th", {
    className: "px-2 py-1.5 font-semibold text-left whitespace-nowrap"
  }, "Interpretaci\xF3n IMC"), React.createElement("th", {
    className: "px-2 py-1.5 font-semibold text-center"
  }, "Cintura"), React.createElement("th", {
    className: "px-2 py-1.5 font-semibold text-center"
  }, "% grasa"), React.createElement("th", {
    className: "px-2 py-1.5 font-semibold text-left whitespace-nowrap"
  }, "Dx % grasa"), React.createElement("th", null))), React.createElement("tbody", null, hist.map((r, i) => {
    const c = clasifIMC(r.imc);
    const cg = clasifGrasa(r.grasa, r.sexo || sexoPerfil, r.edad || edadPerfil);
    const prev = hist[i + 1];
    const delta = prev ? +(r.peso - prev.peso).toFixed(1) : 0;
    return React.createElement("tr", {
      key: r.id,
      className: "border-b border-slate-100"
    }, React.createElement("td", {
      className: "px-2 py-1.5 whitespace-nowrap text-slate-600"
    }, r.fecha), React.createElement("td", {
      className: "px-2 py-1.5 text-center font-semibold text-slate-800 whitespace-nowrap"
    }, r.peso, " kg ", delta !== 0 && React.createElement("span", {
      className: delta < 0 ? "text-emerald-600" : "text-amber-600"
    }, delta < 0 ? "▼" : "▲", Math.abs(delta))), React.createElement("td", {
      className: "px-2 py-1.5 text-center text-slate-600 whitespace-nowrap"
    }, r.estatura ? r.estatura + " m" : "—"), React.createElement("td", {
      className: "px-2 py-1.5 text-center"
    }, r.imc || "—"), React.createElement("td", {
      className: "px-2 py-1.5 whitespace-nowrap font-semibold " + c.color
    }, r.imc ? c.txt : "—"), React.createElement("td", {
      className: "px-2 py-1.5 text-center text-slate-600 whitespace-nowrap"
    }, r.cintura ? r.cintura + " cm" : "—"), React.createElement("td", {
      className: "px-2 py-1.5 text-center text-slate-600"
    }, r.grasa ? r.grasa + "%" : "—"), React.createElement("td", {
      className: "px-2 py-1.5 whitespace-nowrap font-semibold " + cg.color
    }, r.grasa ? cg.txt : "—"), React.createElement("td", {
      className: "px-1 py-1.5 text-center"
    }, React.createElement("button", {
      onClick: () => borrar(r.id),
      className: "text-slate-300 hover:text-red-500"
    }, React.createElement(ITrash, {
      cls: "w-3.5 h-3.5"
    }))));
  })))));
}
function DiagnosticosClinicos() {
  const [dx, setDx] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("medicontrol-dx-clinicos-v1")) || {
        nutri: "",
        medico: "",
        planEjercicio: "",
        planNutricio: ""
      };
    } catch (e) {
      return {
        nutri: "",
        medico: "",
        planEjercicio: "",
        planNutricio: ""
      };
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("medicontrol-dx-clinicos-v1", JSON.stringify(dx));
    } catch (e) {}
  }, [dx]);
  const set = (k, v) => setDx(p => ({
    ...p,
    [k]: v
  }));
  const Campo = ({
    k,
    titulo,
    emoji,
    placeholder
  }) => React.createElement("div", null, React.createElement("label", {
    className: "text-xs font-bold text-slate-600 flex items-center gap-1.5"
  }, emoji, " ", titulo), React.createElement("textarea", {
    rows: "3",
    value: dx[k],
    onChange: e => set(k, e.target.value),
    placeholder: placeholder,
    className: "w-full mt-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
  }));
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\uD83E\uDE7A Diagn\xF3sticos y plan cl\xEDnico"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "Guarda aqu\xED lo que te indicaron tus profesionales de salud para tenerlo siempre a la mano. Se guarda en este tel\xE9fono."), React.createElement("div", {
    className: "space-y-3"
  }, React.createElement(Campo, {
    k: "nutri",
    titulo: "Diagn\xF3stico del nutri\xF3logo",
    emoji: "\uD83E\uDD57",
    placeholder: "Lo que indic\xF3 tu nutri\xF3logo(a)\u2026"
  }), React.createElement(Campo, {
    k: "medico",
    titulo: "Diagn\xF3stico emitido por el personal m\xE9dico",
    emoji: "\uD83D\uDC69\u200D\u2695\uFE0F",
    placeholder: "Lo que indic\xF3 tu m\xE9dico(a)\u2026"
  }), React.createElement(Campo, {
    k: "planNutricio",
    titulo: "Plan nutricio",
    emoji: "\uD83C\uDF7D\uFE0F",
    placeholder: "Indicaciones de tu plan de alimentaci\xF3n\u2026"
  }), React.createElement(Campo, {
    k: "planEjercicio",
    titulo: "Plan de ejercicio (emitido por personal m\xE9dico)",
    emoji: "\uD83C\uDFC3",
    placeholder: "Indicaciones de actividad f\xEDsica\u2026"
  })));
}
const RECS_NUTRI = ["Toma de 6 a 8 vasos de agua simple a lo largo del día.", "Establece y cumple los horarios para cada comida.", "Consume verduras y frutas de temporada.", "Elige carnes blancas sin grasa, como pollo sin piel, o carne roja con menos grasa (filete de res, bistec de aguayón o bola y carne molida de pulpa).", "Al elegir pescado fresco, verifica que la carne esté firme, las escamas bien adheridas, las agallas de color rojo y los ojos brillantes, no opacos.", "Toma leche y yogur descremados y sin azúcar.", "Elige queso blanco bajo en grasa (panela, requesón o cottage).", "Prefiere grasas saludables como el aguacate y semillas oleaginosas (cacahuate, almendra, nuez).", "Usa aceite de maíz, canola o cártamo para cocinar, y aceite de oliva para ensaladas.", "Usa hierbas aromáticas al preparar los alimentos y reduce el consumo de sal.", "Realiza al menos 30 minutos de actividad física al día; auméntalo poco a poco hasta llegar a 60 minutos diarios."];
const RECS_CUIDADO = ["Evita los productos ultraprocesados, sobre todo los que tienen más de un sello de advertencia.", "No agregues azúcar al agua de fruta, pues ya la contiene de forma natural.", "Evita alimentos de la calle o preparaciones capeadas, fritas o empanizadas.", "Evita refrescos, jugos, bebidas alcohólicas, bebidas de leche con café (moka, capuchino o frapé) y las que tienen exceso de azúcar y grasa (licuados y batidos)."];
function RecomendacionesNutri() {
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\uD83D\uDCCB Recomendaciones nutricionales"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "Consejos del Plan de Alimentaci\xF3n NutrIMSS (IMSS)."), React.createElement("ul", {
    className: "space-y-1.5"
  }, RECS_NUTRI.map((t, i) => React.createElement("li", {
    key: i,
    className: "flex gap-2 text-sm text-slate-700"
  }, React.createElement("span", {
    className: "text-emerald-600 font-bold shrink-0"
  }, "\u2713"), React.createElement("span", null, t)))), React.createElement("h4", {
    className: "font-bold text-slate-800 mt-4 mb-2 flex items-center gap-2"
  }, "\u26A0\uFE0F Ten cuidado con lo que comes"), React.createElement("ul", {
    className: "space-y-1.5"
  }, RECS_CUIDADO.map((t, i) => React.createElement("li", {
    key: i,
    className: "flex gap-2 text-sm text-slate-700"
  }, React.createElement("span", {
    className: "text-amber-500 font-bold shrink-0"
  }, "\u2022"), React.createElement("span", null, t)))));
}
const TECNICAS_RESP = [{
  id: "478",
  nombre: "4-7-8 · relajante",
  desc: "Inhala 4, sostén 7, exhala 8. Baja la ansiedad rápido y ayuda a dormir.",
  fases: [["Inhala por la nariz", 4, 1], ["Sostén el aire", 7, 1], ["Exhala por la boca", 8, 0.5]]
}, {
  id: "caja",
  nombre: "Caja 4-4-4-4",
  desc: "Equilibra y enfoca. La usan bomberos y personal de emergencias.",
  fases: [["Inhala", 4, 1], ["Sostén", 4, 1], ["Exhala", 4, 0.5], ["Sostén", 4, 0.5]]
}, {
  id: "diaf",
  nombre: "Diafragmática 4-6",
  desc: "Exhalación larga: activa la calma natural del cuerpo.",
  fases: [["Inhala con el abdomen", 4, 1], ["Exhala despacio", 6, 0.5]]
}];
function RespiracionGuiada() {
  const [tecId, setTecId] = useState("478");
  const [run, setRun] = useState(false);
  const [fi, setFi] = useState(0);
  const [left, setLeft] = useState(0);
  const [ciclos, setCiclos] = useState(0);
  const tec = TECNICAS_RESP.find(t => t.id === tecId);
  const iv = React.useRef(null);
  useEffect(() => {
    if (!run) {
      if (iv.current) clearInterval(iv.current);
      return;
    }
    let fase = 0,
      seg = tec.fases[0][1];
    setFi(0);
    setLeft(seg);
    iv.current = setInterval(() => {
      seg -= 1;
      if (seg <= 0) {
        fase = (fase + 1) % tec.fases.length;
        if (fase === 0) setCiclos(c => c + 1);
        seg = tec.fases[fase][1];
        setFi(fase);
      }
      setLeft(seg);
    }, 1000);
    return () => clearInterval(iv.current);
  }, [run, tecId]);
  const toggle = () => {
    if (run) {
      setRun(false);
    } else {
      setCiclos(0);
      setRun(true);
    }
  };
  const fase = tec.fases[fi] || tec.fases[0];
  const escala = run ? fase[2] : 0.72;
  const dur = run ? fase[1] : 0.4;
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, React.createElement(IWind, {
    cls: "w-5 h-5 text-sky-600"
  }), " Respiraci\xF3n guiada \xB7 Calma ahora"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "Elige una t\xE9cnica y sigue el c\xEDrculo con tu respiraci\xF3n. Con 3 a 4 ciclos suele bajar la activaci\xF3n."), React.createElement("div", {
    className: "flex gap-1.5 flex-wrap mb-3"
  }, TECNICAS_RESP.map(t => React.createElement("button", {
    key: t.id,
    onClick: () => {
      setRun(false);
      setTecId(t.id);
    },
    className: "text-xs font-semibold rounded-full px-3 py-1.5 border " + (tecId === t.id ? "bg-sky-600 text-white border-sky-600" : "bg-white text-slate-600 border-slate-200")
  }, t.nombre))), React.createElement("p", {
    className: "text-xs text-slate-500 mb-3"
  }, tec.desc), React.createElement("div", {
    className: "flex flex-col items-center justify-center py-4"
  }, React.createElement("div", {
    className: "relative w-52 h-52 flex items-center justify-center"
  }, React.createElement("div", {
    className: "absolute w-52 h-52 rounded-full bg-sky-100"
  }), React.createElement("div", {
    className: "absolute rounded-full bg-sky-400/40 w-52 h-52",
    style: {
      transform: "scale(" + escala + ")",
      transition: "transform " + dur + "s ease-in-out"
    }
  }), React.createElement("div", {
    className: "absolute rounded-full bg-sky-500/50 w-28 h-28",
    style: {
      transform: "scale(" + escala + ")",
      transition: "transform " + dur + "s ease-in-out"
    }
  }), React.createElement("div", {
    className: "relative text-center"
  }, React.createElement("div", {
    className: "text-base font-bold text-sky-900"
  }, run ? fase[0] : "Listo"), run && React.createElement("div", {
    className: "text-3xl font-black text-sky-900 tabular-nums"
  }, left))), React.createElement("div", {
    className: "text-xs text-slate-500 mt-2"
  }, "Ciclos completados: ", React.createElement("b", {
    className: "text-slate-700"
  }, ciclos)), React.createElement("button", {
    onClick: toggle,
    className: "mt-3 text-sm font-semibold rounded-full px-6 py-2.5 " + (run ? "bg-slate-100 text-slate-700 border border-slate-200" : "bg-sky-600 text-white hover:bg-sky-700")
  }, run ? "Detener" : "▶ Empezar")));
}
const ESTRATEGIAS = [{
  id: "ansiedad",
  emoji: "😰",
  titulo: "Ansiedad",
  senales: ["Corazón acelerado, respiración corta", "Sensación de que algo malo va a pasar", "Tensión, sudoración, inquietud"],
  hacer: ["Haz respiración 4-7-8 dos o tres veces", "Usa el anclaje 5-4-3-2-1", "Nómbralo: \"esto es ansiedad y va a pasar\"", "Mueve el cuerpo o camina unos minutos", "Baja la cafeína y el tiempo de pantalla"],
  evitar: ["Evitar todo lo que te da miedo (la hace crecer)", "Buscar tus síntomas en internet"]
}, {
  id: "depresion",
  emoji: "🌧️",
  titulo: "Depresión / bajón de ánimo",
  senales: ["Tristeza o vacío la mayor parte del día", "Poca energía, dormir de más o de menos", "Perder interés en lo que te gustaba"],
  hacer: ["Ponte una meta muy pequeña y cúmplela", "Sal a que te dé la luz del sol 10-15 min", "Muévete aunque sea poco", "Habla con alguien de confianza", "Cuida tus horarios de sueño y comida"],
  evitar: ["Aislarte por completo", "Exigirte \"estar bien ya\""]
}, {
  id: "estres",
  emoji: "⚡",
  titulo: "Estrés",
  senales: ["Sentir que todo te rebasa", "Irritabilidad, dolor de cabeza o cuello", "Dificultad para concentrarte"],
  hacer: ["Respiración en caja 4-4-4-4", "Separa lo que SÍ puedes controlar de lo que no", "Haz una sola cosa a la vez", "Toma pausas cortas cada 60-90 min", "Pregúntate: ¿qué es lo único importante ahora?"],
  evitar: ["Cargarte de más tareas", "Desvelarte o usar cafeína para \"rendir más\""]
}, {
  id: "rumiacion",
  emoji: "🔁",
  titulo: "Rumiación (pensamientos en bucle)",
  senales: ["Repasar lo mismo una y otra vez", "Preguntarte \"¿y si…?\" sin parar", "No poder soltar un pensamiento"],
  hacer: ["Agenda un \"tiempo de preocupación\" de 10 min y déjalo ahí", "Cambia de ambiente o haz actividad física", "Anota el pensamiento para sacarlo de la cabeza", "¿Es un problema a resolver o solo preocupación?", "Vuelve a tus 5 sentidos, al aquí y ahora"],
  evitar: ["Buscar \"la respuesta perfecta\"", "Darle vueltas en la cama antes de dormir"]
}];
const TIPOS_EP = [{
  id: "ansiedad",
  label: "Ansiedad",
  emoji: "😰"
}, {
  id: "depresion",
  label: "Depresión",
  emoji: "🌧️"
}, {
  id: "estres",
  label: "Estrés",
  emoji: "⚡"
}, {
  id: "rumiacion",
  label: "Rumiación",
  emoji: "🔁"
}, {
  id: "panico",
  label: "Crisis de pánico",
  emoji: "💥"
}, {
  id: "otro",
  label: "Otro",
  emoji: "•"
}];
const DISTORSIONES = [{
  n: "Todo o nada",
  d: "Ver las cosas en blanco o negro, sin grises.",
  ej: "Si no sale perfecto, soy un fracaso."
}, {
  n: "Catastrofizar",
  d: "Esperar siempre el peor escenario posible.",
  ej: "Me va a salir mal y será un desastre."
}, {
  n: "Lectura de mente",
  d: "Suponer lo que otros piensan de ti.",
  ej: "Seguro piensan que no sirvo."
}, {
  n: "Sobregeneralizar",
  d: "Tomar un hecho aislado como regla eterna.",
  ej: "Siempre me pasa lo mismo."
}, {
  n: "Filtro mental",
  d: "Fijarte solo en lo negativo e ignorar lo bueno.",
  ej: "No cuenta nada de lo que sí logré."
}, {
  n: "Razonamiento emocional",
  d: "Creer que si lo sientes, entonces es verdad.",
  ej: "Me siento inútil, entonces lo soy."
}, {
  n: "Los \"debería\"",
  d: "Exigencias rígidas hacia ti o los demás.",
  ej: "Debería poder con todo yo solo."
}, {
  n: "Personalización",
  d: "Echarte la culpa de cosas que no controlas.",
  ej: "Es mi culpa que estén mal."
}];
function RegistroPensamientos({
  avisar
}) {
  const [hist, setHist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("medicontrol-pensamientos-v1")) || [];
    } catch (e) {
      return [];
    }
  });
  const [f, setF] = useState({
    situacion: "",
    pensamiento: "",
    emocion: "",
    intensidad: 6,
    distorsion: "",
    alternativo: ""
  });
  useEffect(() => {
    try {
      localStorage.setItem("medicontrol-pensamientos-v1", JSON.stringify(hist));
    } catch (e) {}
  }, [hist]);
  const set = (k, v) => setF(p => ({
    ...p,
    [k]: v
  }));
  const guardar = () => {
    if (!f.pensamiento.trim()) {
      avisar("Escribe el pensamiento que te molesta 💭");
      return;
    }
    setHist(h => [{
      id: Date.now(),
      fecha: hoyISO(),
      ...f,
      situacion: f.situacion.trim(),
      pensamiento: f.pensamiento.trim(),
      emocion: f.emocion.trim(),
      alternativo: f.alternativo.trim()
    }, ...h]);
    setF({
      situacion: "",
      pensamiento: "",
      emocion: "",
      intensidad: 6,
      distorsion: "",
      alternativo: ""
    });
    avisar("Pensamiento registrado 💡");
  };
  const borrar = id => setHist(h => h.filter(x => x.id !== id));
  const ic = "w-full mt-0.5 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\uD83D\uDCAD Registro de pensamientos (TCC)"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "Cuando un pensamiento te haga sentir mal, p\xE1salo por aqu\xED. Escribirlo y buscarle una versi\xF3n m\xE1s justa reduce su fuerza. Es la herramienta central de la terapia cognitivo-conductual."), React.createElement("div", {
    className: "space-y-2"
  }, React.createElement("label", {
    className: "text-xs text-slate-500 block"
  }, "1. Situaci\xF3n (\xBFqu\xE9 pas\xF3?)", React.createElement("input", {
    type: "text",
    value: f.situacion,
    onChange: e => set("situacion", e.target.value),
    className: ic,
    placeholder: "Ej.: me escribieron del trabajo un domingo"
  })), React.createElement("label", {
    className: "text-xs text-slate-500 block"
  }, "2. Pensamiento autom\xE1tico", React.createElement("input", {
    type: "text",
    value: f.pensamiento,
    onChange: e => set("pensamiento", e.target.value),
    className: ic,
    placeholder: "Lo que cruz\xF3 por tu mente"
  })), React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, React.createElement("label", {
    className: "text-xs text-slate-500 block"
  }, "3. Emoci\xF3n", React.createElement("input", {
    type: "text",
    value: f.emocion,
    onChange: e => set("emocion", e.target.value),
    className: ic,
    placeholder: "Ansiedad, enojo\u2026"
  })), React.createElement("label", {
    className: "text-xs text-slate-500 block"
  }, "Intensidad: ", React.createElement("b", {
    className: "text-emerald-700"
  }, f.intensidad), React.createElement("input", {
    type: "range",
    min: "1",
    max: "10",
    value: f.intensidad,
    onChange: e => set("intensidad", Number(e.target.value)),
    className: "w-full accent-emerald-600 mt-2"
  }))), React.createElement("label", {
    className: "text-xs text-slate-500 block"
  }, "4. \xBFQu\xE9 distorsi\xF3n puede haber?", React.createElement("select", {
    value: f.distorsion,
    onChange: e => set("distorsion", e.target.value),
    className: ic + " bg-white"
  }, React.createElement("option", {
    value: ""
  }, "(opcional) elige una\u2026"), DISTORSIONES.map(d => React.createElement("option", {
    key: d.n,
    value: d.n
  }, d.n)))), React.createElement("label", {
    className: "text-xs text-slate-500 block"
  }, "5. Pensamiento alternativo (m\xE1s justo y realista)", React.createElement("textarea", {
    rows: "2",
    value: f.alternativo,
    onChange: e => set("alternativo", e.target.value),
    className: ic,
    placeholder: "\xBFQu\xE9 le dir\xEDas a un amigo en tu lugar?"
  }))), React.createElement("button", {
    onClick: guardar,
    className: "w-full mt-3 bg-emerald-700 text-white text-sm font-semibold rounded-xl py-2 hover:bg-emerald-800 flex items-center justify-center gap-2"
  }, React.createElement(IPlus, {
    cls: "w-4 h-4"
  }), " Guardar"), hist.length > 0 && React.createElement("div", {
    className: "mt-4 space-y-2"
  }, hist.slice(0, 20).map(r => React.createElement("div", {
    key: r.id,
    className: "border border-slate-200 rounded-xl p-3 text-sm"
  }, React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, React.createElement("div", {
    className: "flex-1 min-w-0"
  }, r.situacion && React.createElement("div", {
    className: "text-xs text-slate-400"
  }, r.fecha, " \xB7 ", r.situacion), React.createElement("div", {
    className: "text-slate-700 mt-0.5"
  }, "\uD83D\uDCAD ", r.pensamiento, " ", r.emocion && React.createElement("span", {
    className: "text-xs text-slate-400"
  }, "(", r.emocion, " ", r.intensidad, "/10)")), r.distorsion && React.createElement("div", {
    className: "text-xs text-amber-600 mt-0.5"
  }, "Distorsi\xF3n: ", r.distorsion), r.alternativo && React.createElement("div", {
    className: "text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 mt-1.5 text-xs"
  }, "\uD83D\uDCA1 ", r.alternativo)), React.createElement("button", {
    onClick: () => borrar(r.id),
    className: "text-slate-300 hover:text-red-500 shrink-0"
  }, React.createElement(ITrash, {
    cls: "w-3.5 h-3.5"
  })))))));
}
function Distorsiones() {
  const [open, setOpen] = useState(false);
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("button", {
    onClick: () => setOpen(!open),
    className: "w-full flex items-center justify-between"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\uD83D\uDD0D Distorsiones cognitivas (trampas de la mente)"), React.createElement(IChevD, {
    cls: "w-4 h-4 text-slate-400 transition-transform " + (open ? "rotate-180" : "")
  })), open && React.createElement("div", {
    className: "mt-3 space-y-2"
  }, React.createElement("p", {
    className: "text-xs text-slate-500"
  }, "Son errores de pensamiento muy comunes. Reconocerlos te ayuda a no creerte todo lo que piensas."), DISTORSIONES.map(d => React.createElement("div", {
    key: d.n,
    className: "border border-slate-100 rounded-xl p-3"
  }, React.createElement("div", {
    className: "text-sm font-semibold text-slate-800"
  }, d.n), React.createElement("div", {
    className: "text-xs text-slate-600 mt-0.5"
  }, d.d), React.createElement("div", {
    className: "text-xs text-slate-400 italic mt-1"
  }, "Ej.: ", d.ej)))));
}
function ActivacionConductual({
  avisar
}) {
  const [lista, setLista] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("medicontrol-activacion-v1")) || [];
    } catch (e) {
      return [];
    }
  });
  const [txt, setTxt] = useState("");
  const [tipo, setTipo] = useState("agradable");
  useEffect(() => {
    try {
      localStorage.setItem("medicontrol-activacion-v1", JSON.stringify(lista));
    } catch (e) {}
  }, [lista]);
  const add = () => {
    if (!txt.trim()) return;
    setLista(l => [{
      id: Date.now(),
      texto: txt.trim(),
      tipo,
      hecho: false
    }, ...l]);
    setTxt("");
  };
  const toggle = id => setLista(l => l.map(x => x.id === id ? {
    ...x,
    hecho: !x.hecho
  } : x));
  const borrar = id => setLista(l => l.filter(x => x.id !== id));
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\uD83C\uDF24\uFE0F Activaci\xF3n conductual (para el \xE1nimo bajo)"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "Cuando hay des\xE1nimo, la energ\xEDa llega DESPU\xC9S de actuar, no antes. Agenda cada d\xEDa una actividad agradable y una necesaria, aunque sean peque\xF1as."), React.createElement("div", {
    className: "flex gap-2"
  }, React.createElement("input", {
    type: "text",
    value: txt,
    onChange: e => setTxt(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter") add();
    },
    placeholder: "Ej.: salir a caminar 10 min",
    className: "flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  }), React.createElement("select", {
    value: tipo,
    onChange: e => setTipo(e.target.value),
    className: "rounded-xl border border-slate-300 px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
  }, React.createElement("option", {
    value: "agradable"
  }, "Agradable"), React.createElement("option", {
    value: "necesaria"
  }, "Necesaria")), React.createElement("button", {
    onClick: add,
    className: "bg-emerald-700 text-white rounded-xl px-3 hover:bg-emerald-800"
  }, React.createElement(IPlus, {
    cls: "w-4 h-4"
  }))), lista.length > 0 && React.createElement("div", {
    className: "mt-3 space-y-1.5"
  }, lista.map(a => React.createElement("div", {
    key: a.id,
    className: "flex items-center gap-2"
  }, React.createElement("button", {
    onClick: () => toggle(a.id),
    className: "shrink-0"
  }, a.hecho ? React.createElement(ICheckCircle, {
    cls: "w-5 h-5 text-emerald-600"
  }) : React.createElement(ICircle, {
    cls: "w-5 h-5 text-slate-300"
  })), React.createElement("span", {
    className: "flex-1 text-sm " + (a.hecho ? "line-through text-slate-400" : "text-slate-700")
  }, a.texto), React.createElement("span", {
    className: "text-[11px] rounded-full px-2 py-0.5 " + (a.tipo === "agradable" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700")
  }, a.tipo), React.createElement("button", {
    onClick: () => borrar(a.id),
    className: "text-slate-300 hover:text-red-500"
  }, React.createElement(ITrash, {
    cls: "w-3.5 h-3.5"
  }))))));
}
const SUENO_TIPS = ["Acuéstate y levántate a la misma hora, también en fin de semana.", "Apaga pantallas 30-60 min antes de dormir.", "Evita cafeína después del mediodía.", "Deja la cama solo para dormir (no para trabajar o ver el teléfono).", "Cuarto oscuro, fresco y en silencio.", "Si no puedes dormir en 20 min, levántate y haz algo tranquilo con poca luz.", "Evita comidas pesadas y alcohol antes de acostarte.", "Toma sol en el día: ayuda a tu reloj interno."];
function HigieneSueno() {
  const [chk, setChk] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("medicontrol-sueno-v1")) || {};
    } catch (e) {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("medicontrol-sueno-v1", JSON.stringify(chk));
    } catch (e) {}
  }, [chk]);
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, React.createElement(IMoon, {
    cls: "w-5 h-5 text-indigo-500"
  }), " Higiene del sue\xF1o"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "Dormir bien es la base del \xE1nimo y la calma. Marca los h\xE1bitos que ya cumples y trabaja los dem\xE1s."), React.createElement("div", {
    className: "space-y-1.5"
  }, SUENO_TIPS.map((t, i) => React.createElement("button", {
    key: i,
    onClick: () => setChk(c => ({
      ...c,
      [i]: !c[i]
    })),
    className: "w-full flex items-start gap-2 text-left"
  }, chk[i] ? React.createElement(ICheckCircle, {
    cls: "w-5 h-5 text-emerald-600 shrink-0"
  }) : React.createElement(ICircle, {
    cls: "w-5 h-5 text-slate-300 shrink-0"
  }), React.createElement("span", {
    className: "text-sm " + (chk[i] ? "text-slate-400 line-through" : "text-slate-700")
  }, t)))));
}
function TresCosasBuenas({
  avisar
}) {
  const [hist, setHist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("medicontrol-gratitud-v1")) || [];
    } catch (e) {
      return [];
    }
  });
  const [t, setT] = useState(["", "", ""]);
  useEffect(() => {
    try {
      localStorage.setItem("medicontrol-gratitud-v1", JSON.stringify(hist));
    } catch (e) {}
  }, [hist]);
  const guardar = () => {
    const cosas = t.map(x => x.trim()).filter(Boolean);
    if (!cosas.length) {
      avisar("Escribe al menos una cosa buena 🙂");
      return;
    }
    setHist(h => [{
      id: Date.now(),
      fecha: hoyISO(),
      cosas
    }, ...h]);
    setT(["", "", ""]);
    avisar("Guardado ✨");
  };
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\u2728 Tres cosas buenas del d\xEDa"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "Ejercicio de psicolog\xEDa positiva: anotar lo bueno, por peque\xF1o que sea, entrena a tu mente a notarlo y mejora el \xE1nimo con el tiempo."), [0, 1, 2].map(i => React.createElement("input", {
    key: i,
    type: "text",
    value: t[i],
    onChange: e => setT(v => {
      const n = [...v];
      n[i] = e.target.value;
      return n;
    }),
    placeholder: i + 1 + ". Algo bueno de hoy…",
    className: "w-full mb-2 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  })), React.createElement("button", {
    onClick: guardar,
    className: "w-full bg-emerald-700 text-white text-sm font-semibold rounded-xl py-2 hover:bg-emerald-800"
  }, "Guardar el d\xEDa"), hist.length > 0 && React.createElement("div", {
    className: "mt-3 space-y-2"
  }, hist.slice(0, 10).map(r => React.createElement("div", {
    key: r.id,
    className: "text-sm border border-slate-100 rounded-xl p-2.5"
  }, React.createElement("div", {
    className: "text-xs text-slate-400 mb-1"
  }, r.fecha), React.createElement("ul", {
    className: "space-y-0.5"
  }, r.cosas.map((c, i) => React.createElement("li", {
    key: i,
    className: "text-slate-700 flex gap-2"
  }, React.createElement("span", {
    className: "text-emerald-500"
  }, "\u2713"), c)))))));
}
function TIPP() {
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, React.createElement(IZap, {
    cls: "w-5 h-5 text-amber-500"
  }), " TIPP \xB7 para emoci\xF3n muy intensa"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "T\xE9cnica de terapia dial\xE9ctico-conductual (DBT) para bajar una crisis emocional fuerte en minutos. Cambia tu qu\xEDmica corporal r\xE1pido."), React.createElement("div", {
    className: "space-y-2 text-sm"
  }, React.createElement("div", {
    className: "rounded-xl border border-sky-100 bg-sky-50/60 p-3"
  }, React.createElement("b", {
    className: "text-sky-800"
  }, "T \xB7 Temperatura"), React.createElement("div", {
    className: "text-slate-600 text-xs mt-0.5"
  }, "Moja tu cara con agua fr\xEDa o sost\xE9n algo fr\xEDo 30-60 seg. Baja la activaci\xF3n de golpe.")), React.createElement("div", {
    className: "rounded-xl border border-emerald-100 bg-emerald-50/60 p-3"
  }, React.createElement("b", {
    className: "text-emerald-800"
  }, "I \xB7 Ejercicio Intenso"), React.createElement("div", {
    className: "text-slate-600 text-xs mt-0.5"
  }, "Mueve el cuerpo fuerte 3-5 min (saltar, caminar r\xE1pido). Quema la adrenalina.")), React.createElement("div", {
    className: "rounded-xl border border-indigo-100 bg-indigo-50/60 p-3"
  }, React.createElement("b", {
    className: "text-indigo-800"
  }, "P \xB7 Respiraci\xF3n Pausada"), React.createElement("div", {
    className: "text-slate-600 text-xs mt-0.5"
  }, "Exhala m\xE1s largo que inhalas (ej. inhala 4, exhala 6-8).")), React.createElement("div", {
    className: "rounded-xl border border-rose-100 bg-rose-50/60 p-3"
  }, React.createElement("b", {
    className: "text-rose-800"
  }, "P \xB7 Relajaci\xF3n muscular Progresiva"), React.createElement("div", {
    className: "text-slate-600 text-xs mt-0.5"
  }, "Tensa y suelta grupos de m\xFAsculos, de pies a cabeza."))));
}
function RelajacionMuscular() {
  const [open, setOpen] = useState(false);
  const pasos = ["Pies y pantorrillas", "Muslos y glúteos", "Abdomen", "Manos y brazos", "Hombros y cuello", "Cara y frente"];
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("button", {
    onClick: () => setOpen(!open),
    className: "w-full flex items-center justify-between"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\uD83D\uDCAA Relajaci\xF3n muscular progresiva"), React.createElement(IChevD, {
    cls: "w-4 h-4 text-slate-400 transition-transform " + (open ? "rotate-180" : "")
  })), open && React.createElement("div", {
    className: "mt-3 text-sm text-slate-700"
  }, React.createElement("p", {
    className: "text-xs text-slate-500 mb-2"
  }, "Para cada grupo: ", React.createElement("b", null, "tensa"), " los m\xFAsculos 5 segundos y luego ", React.createElement("b", null, "suelta"), " 10 segundos, notando la diferencia. Ve de abajo hacia arriba:"), React.createElement("ol", {
    className: "space-y-1"
  }, pasos.map((p, i) => React.createElement("li", {
    key: i,
    className: "flex gap-2"
  }, React.createElement("span", {
    className: "text-emerald-600 font-bold"
  }, i + 1, "."), p))), React.createElement("p", {
    className: "text-xs text-slate-400 mt-2"
  }, "Termina con 3 respiraciones lentas. Ideal antes de dormir o tras un momento de estr\xE9s.")));
}
function Autocompasion() {
  const [open, setOpen] = useState(false);
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("button", {
    onClick: () => setOpen(!open),
    className: "w-full flex items-center justify-between"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\uD83E\uDD0D Autocompasi\xF3n (calmar al cr\xEDtico interno)"), React.createElement(IChevD, {
    cls: "w-4 h-4 text-slate-400 transition-transform " + (open ? "rotate-180" : "")
  })), open && React.createElement("div", {
    className: "mt-3 text-sm text-slate-700 space-y-2"
  }, React.createElement("p", null, "Cuando te hablas con dureza, el malestar crece. Tr\xE1tate como tratar\xEDas a un buen amigo. Tres pasos (Kristin Neff):"), React.createElement("div", {
    className: "rounded-xl border border-slate-100 p-3"
  }, React.createElement("b", {
    className: "text-slate-800"
  }, "1. Date cuenta"), React.createElement("div", {
    className: "text-xs text-slate-600 mt-0.5"
  }, "Recon\xF3celo: \xABesto es un momento dif\xEDcil\xBB. Nombra el dolor sin pelear con \xE9l.")), React.createElement("div", {
    className: "rounded-xl border border-slate-100 p-3"
  }, React.createElement("b", {
    className: "text-slate-800"
  }, "2. No est\xE1s solo"), React.createElement("div", {
    className: "text-xs text-slate-600 mt-0.5"
  }, "El sufrimiento es parte de ser humano; a todos nos pasa.")), React.createElement("div", {
    className: "rounded-xl border border-slate-100 p-3"
  }, React.createElement("b", {
    className: "text-slate-800"
  }, "3. Date amabilidad"), React.createElement("div", {
    className: "text-xs text-slate-600 mt-0.5"
  }, "Pon una mano en el pecho y date una frase amable: \xABpuedo ser paciente conmigo\xBB."))));
}
const EVAL_DIMS = [{
  id: "ansiedad",
  label: "Ansiedad",
  emoji: "😰"
}, {
  id: "depresion",
  label: "Depresión / ánimo bajo",
  emoji: "🌧️"
}, {
  id: "estres",
  label: "Estrés",
  emoji: "⚡"
}, {
  id: "rumiacion",
  label: "Sobrepensar (rumiación)",
  emoji: "🔁"
}];
const EVAL_ITEMS = [{
  dim: "ansiedad",
  t: "Me he sentido nervioso(a), tenso(a) o con los nervios de punta."
}, {
  dim: "ansiedad",
  t: "He tenido preocupación difícil de controlar o miedo a que algo malo pase."
}, {
  dim: "ansiedad",
  t: "He notado el corazón acelerado, falta de aire o tensión en el cuerpo."
}, {
  dim: "depresion",
  t: "Me he sentido triste, vacío(a) o sin ánimo."
}, {
  dim: "depresion",
  t: "He perdido el interés o el gusto por cosas que antes disfrutaba."
}, {
  dim: "depresion",
  t: "Me he sentido muy cansado(a) o sin energía para mis actividades."
}, {
  dim: "estres",
  t: "He sentido que las cosas me rebasan o que no doy abasto."
}, {
  dim: "estres",
  t: "Me he sentido irritable o con poca paciencia."
}, {
  dim: "estres",
  t: "Se me ha dificultado concentrarme o relajarme."
}, {
  dim: "rumiacion",
  t: "Le doy vueltas al mismo pensamiento una y otra vez."
}, {
  dim: "rumiacion",
  t: "Me cuesta \"apagar\" la mente, sobre todo al dormir."
}, {
  dim: "rumiacion",
  t: "Repaso errores del pasado o imagino problemas futuros (\"¿y si…?\")."
}];
const EVAL_OPC = [["Nunca", 0], ["Algunos días", 1], ["Más de la mitad", 2], ["Casi siempre", 3]];
const nivelEval = s => s >= 6 ? {
  t: "alto",
  color: "bg-red-500",
  txt: "text-red-600"
} : s >= 3 ? {
  t: "moderado",
  color: "bg-amber-500",
  txt: "text-amber-600"
} : {
  t: "bajo",
  color: "bg-emerald-500",
  txt: "text-emerald-600"
};
function AutoEvaluacion({
  avisar,
  onIr
}) {
  const [resp, setResp] = useState({});
  const [hecho, setHecho] = useState(false);
  const [hist, setHist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("medicontrol-autoeval-v1")) || [];
    } catch (e) {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("medicontrol-autoeval-v1", JSON.stringify(hist));
    } catch (e) {}
  }, [hist]);
  const completo = EVAL_ITEMS.every((_, i) => resp[i] != null);
  const scores = {};
  EVAL_DIMS.forEach(d => {
    scores[d.id] = EVAL_ITEMS.reduce((a, it, i) => a + (it.dim === d.id ? resp[i] || 0 : 0), 0);
  });
  const ordenadas = EVAL_DIMS.slice().sort((a, b) => scores[b.id] - scores[a.id]);
  const top = ordenadas[0];
  const maxScore = scores[top.id];
  const ver = () => {
    if (!completo) {
      avisar("Responde todas las preguntas 🙂");
      return;
    }
    setHist(h => [{
      id: Date.now(),
      fecha: hoyISO(),
      scores,
      top: maxScore > 0 ? top.id : "ninguno"
    }, ...h].slice(0, 50));
    setHecho(true);
  };
  const reiniciar = () => {
    setResp({});
    setHecho(false);
  };
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\uD83D\uDCCB Autoevaluaci\xF3n \xB7 \xBFqu\xE9 me est\xE1 pasando?"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "Responde pensando en las ", React.createElement("b", null, "\xFAltimas 2 semanas"), ". Te orienta sobre qu\xE9 predomina (ansiedad, depresi\xF3n, estr\xE9s o sobrepensar) para actuar con la herramienta adecuada. ", React.createElement("b", null, "No es un diagn\xF3stico"), "; si tienes dudas, consulta a un profesional."), !hecho ? React.createElement("div", {
    className: "space-y-3"
  }, EVAL_ITEMS.map((it, i) => React.createElement("div", {
    key: i,
    className: "border border-slate-100 rounded-xl p-3"
  }, React.createElement("div", {
    className: "text-sm text-slate-700"
  }, i + 1, ". ", it.t), React.createElement("div", {
    className: "grid grid-cols-4 gap-1 mt-2"
  }, EVAL_OPC.map(o => React.createElement("button", {
    key: o[1],
    onClick: () => setResp(r => ({
      ...r,
      [i]: o[1]
    })),
    className: "text-[11px] rounded-lg px-1 py-1.5 border font-medium " + (resp[i] === o[1] ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-500 border-slate-200")
  }, o[0]))))), React.createElement("button", {
    onClick: ver,
    disabled: !completo,
    className: "w-full text-sm font-semibold rounded-xl py-2.5 " + (completo ? "bg-emerald-700 text-white hover:bg-emerald-800" : "bg-slate-100 text-slate-400")
  }, "Ver resultado")) : React.createElement("div", null, React.createElement("div", {
    className: "space-y-2.5"
  }, ordenadas.map(d => {
    const s = scores[d.id];
    const nv = nivelEval(s);
    const pct = Math.round(s / 9 * 100);
    return React.createElement("div", {
      key: d.id
    }, React.createElement("div", {
      className: "flex items-center justify-between text-xs mb-1"
    }, React.createElement("span", {
      className: "font-semibold text-slate-700"
    }, d.emoji, " ", d.label), React.createElement("span", {
      className: "font-bold " + nv.txt
    }, "nivel ", nv.t)), React.createElement("div", {
      className: "h-2.5 rounded-full bg-slate-100 overflow-hidden"
    }, React.createElement("div", {
      className: "h-full rounded-full " + nv.color,
      style: {
        width: pct + "%"
      }
    })));
  })), maxScore === 0 ? React.createElement("div", {
    className: "mt-4 text-sm bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-xl px-3 py-3"
  }, "No aparecen se\xF1ales importantes ahora. Aun as\xED, puedes usar las herramientas para cuidarte y prevenir. \uD83C\uDF31") : React.createElement("div", {
    className: "mt-4 text-sm bg-sky-50 border border-sky-100 text-sky-900 rounded-xl px-3 py-3"
  }, React.createElement("p", null, "Lo que m\xE1s destaca es ", React.createElement("b", null, top.emoji, " ", top.label), ordenadas[1] && scores[ordenadas[1].id] === maxScore ? " (junto con otra área)" : "", ". Esto ", React.createElement("b", null, "sugiere"), " en qu\xE9 enfocarte; no es un diagn\xF3stico."), React.createElement("div", {
    className: "flex gap-2 mt-3 flex-wrap"
  }, React.createElement("button", {
    onClick: () => onIr("estrategias", top.id),
    className: "text-xs font-semibold bg-emerald-700 text-white rounded-full px-3 py-1.5"
  }, "Ver qu\xE9 hacer con ", top.label, " \u2192"), React.createElement("button", {
    onClick: () => onIr("herramientas"),
    className: "text-xs font-semibold bg-white text-emerald-800 border border-emerald-200 rounded-full px-3 py-1.5"
  }, "Ir a Herramientas"))), React.createElement("div", {
    className: "mt-3 text-xs bg-rose-50 border border-rose-100 text-rose-800 rounded-xl px-3 py-2.5"
  }, "Si te sientes rebasado(a) o con pensamientos de hacerte da\xF1o, busca ayuda ahora: L\xEDnea de la Vida ", React.createElement("b", null, "800 911 2000"), " (24 h)."), React.createElement("div", {
    className: "flex items-center justify-between mt-3"
  }, React.createElement("span", {
    className: "text-xs text-slate-400"
  }, "Evaluaciones hechas: ", hist.length), React.createElement("button", {
    onClick: reiniciar,
    className: "text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-3 py-1.5"
  }, "Repetir evaluaci\xF3n"))));
}
function Bienestar({
  avisar
}) {
  const [vista, setVista] = useState("evaluacion");
  const [abierto, setAbierto] = useState(null);
  const [plan, setPlan] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("medicontrol-plan-bienestar-v1")) || {
        senales: "",
        ayuda: "",
        apoyo: "",
        frase: ""
      };
    } catch (e) {
      return {
        senales: "",
        ayuda: "",
        apoyo: "",
        frase: ""
      };
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("medicontrol-plan-bienestar-v1", JSON.stringify(plan));
    } catch (e) {}
  }, [plan]);
  const [eps, setEps] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("medicontrol-episodios-v1")) || [];
    } catch (e) {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("medicontrol-episodios-v1", JSON.stringify(eps));
    } catch (e) {}
  }, [eps]);
  const [nuevo, setNuevo] = useState({
    tipo: "ansiedad",
    intensidad: 5,
    nota: ""
  });
  const registrar = () => {
    const ts = Date.now();
    setEps(e => [{
      id: ts,
      ts,
      fecha: hoyISO(),
      tipo: nuevo.tipo,
      intensidad: nuevo.intensidad,
      nota: (nuevo.nota || "").trim()
    }, ...e]);
    setNuevo({
      tipo: "ansiedad",
      intensidad: 5,
      nota: ""
    });
    avisar("Episodio registrado 📝");
  };
  const borrarEp = id => setEps(e => e.filter(x => x.id !== id));
  const ahora = Date.now();
  const semana = eps.filter(e => ahora - e.ts < 7 * 864e5).length;
  const mes = eps.filter(e => {
    const d = new Date(e.ts);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;
  const porTipo = TIPOS_EP.map(t => ({
    ...t,
    n: eps.filter(e => e.tipo === t.id).length
  })).filter(t => t.n > 0);
  const tipoInfo = id => TIPOS_EP.find(t => t.id === id) || TIPOS_EP[5];
  return React.createElement("div", {
    className: "space-y-4"
  }, React.createElement("div", {
    className: "bg-gradient-to-br from-sky-700 to-emerald-700 text-white rounded-2xl p-5"
  }, React.createElement("h2", {
    className: "text-lg font-bold flex items-center gap-2"
  }, React.createElement(IHeart, {
    cls: "w-5 h-5"
  }), " Bienestar emocional"), React.createElement("p", {
    className: "text-sky-100 text-sm mt-1"
  }, "Herramientas para calmar la ansiedad, el estr\xE9s, la rumiaci\xF3n y los bajones de \xE1nimo, y llevar un registro de c\xF3mo te sientes.")), React.createElement("div", {
    className: "bg-rose-50 border border-rose-100 rounded-2xl p-4 text-sm text-rose-900"
  }, React.createElement("p", {
    className: "font-semibold flex items-center gap-2"
  }, React.createElement(IWarn, {
    cls: "w-4 h-4"
  }), " Si est\xE1s en crisis o con pensamientos de hacerte da\xF1o, pide ayuda ahora."), React.createElement("p", {
    className: "mt-1 text-rose-800"
  }, "Esta secci\xF3n es de apoyo y no sustituye la atenci\xF3n de un profesional."), React.createElement("div", {
    className: "flex gap-2 mt-3 flex-wrap"
  }, React.createElement("a", {
    href: "tel:8009112000",
    className: "text-sm font-semibold bg-white text-rose-700 border border-rose-200 rounded-xl px-3 py-2"
  }, "\uD83D\uDCDE L\xEDnea de la Vida 800 911 2000"), React.createElement("a", {
    href: "tel:5552598121",
    className: "text-sm font-semibold bg-white text-rose-700 border border-rose-200 rounded-xl px-3 py-2"
  }, "\uD83D\uDCDE SAPTEL 55 5259 8121"))), React.createElement("div", {
    className: "flex gap-1.5 overflow-x-auto pb-1"
  }, [["evaluacion", "📋 Evaluación"], ["calma", "🧘 Calma ahora"], ["estrategias", "🧭 Estrategias"], ["herramientas", "🛠️ Herramientas"], ["registro", "📆 Registro"]].map(o => React.createElement("button", {
    key: o[0],
    onClick: () => setVista(o[0]),
    className: "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border " + (vista === o[0] ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-slate-600 border-slate-200")
  }, o[1]))), vista === "evaluacion" && React.createElement(AutoEvaluacion, {
    avisar: avisar,
    onIr: (v, id) => {
      setVista(v);
      if (id) setAbierto(id);
    }
  }), vista === "calma" && React.createElement(React.Fragment, null, React.createElement(RespiracionGuiada, null), React.createElement(TIPP, null), React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\uD83D\uDD90\uFE0F Anclaje 5-4-3-2-1"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "Cuando la mente se acelera, vuelve a tus sentidos. Ve nombrando en voz baja:"), React.createElement("ul", {
    className: "space-y-1.5 text-sm text-slate-700"
  }, React.createElement("li", null, React.createElement("b", {
    className: "text-emerald-700"
  }, "5"), " cosas que puedes ", React.createElement("b", null, "ver")), React.createElement("li", null, React.createElement("b", {
    className: "text-emerald-700"
  }, "4"), " cosas que puedes ", React.createElement("b", null, "tocar")), React.createElement("li", null, React.createElement("b", {
    className: "text-emerald-700"
  }, "3"), " cosas que puedes ", React.createElement("b", null, "o\xEDr")), React.createElement("li", null, React.createElement("b", {
    className: "text-emerald-700"
  }, "2"), " cosas que puedes ", React.createElement("b", null, "oler")), React.createElement("li", null, React.createElement("b", {
    className: "text-emerald-700"
  }, "1"), " cosa que puedes ", React.createElement("b", null, "saborear")))), React.createElement(RelajacionMuscular, null)), vista === "estrategias" && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\uD83E\uDDED Qu\xE9 hacer en cada situaci\xF3n"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "Toca una para ver se\xF1ales y tu plan de acci\xF3n."), React.createElement("div", {
    className: "space-y-2"
  }, ESTRATEGIAS.map(s => {
    const open = abierto === s.id;
    return React.createElement("div", {
      key: s.id,
      className: "border border-slate-200 rounded-xl overflow-hidden"
    }, React.createElement("button", {
      onClick: () => setAbierto(open ? null : s.id),
      className: "w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
    }, React.createElement("span", {
      className: "text-sm font-semibold text-slate-800"
    }, s.emoji, " ", s.titulo), React.createElement(IChevD, {
      cls: "w-4 h-4 text-slate-400 transition-transform " + (open ? "rotate-180" : "")
    })), open && React.createElement("div", {
      className: "px-3 pb-3 text-sm"
    }, React.createElement("p", {
      className: "text-xs font-bold uppercase tracking-wide text-slate-400 mt-1"
    }, "Se\xF1ales"), React.createElement("ul", {
      className: "mt-1 space-y-1"
    }, s.senales.map((t, i) => React.createElement("li", {
      key: i,
      className: "text-slate-600 flex gap-2"
    }, React.createElement("span", {
      className: "text-slate-300"
    }, "\u2022"), t))), React.createElement("p", {
      className: "text-xs font-bold uppercase tracking-wide text-emerald-600 mt-3"
    }, "Qu\xE9 hacer ahora"), React.createElement("ul", {
      className: "mt-1 space-y-1"
    }, s.hacer.map((t, i) => React.createElement("li", {
      key: i,
      className: "text-slate-700 flex gap-2"
    }, React.createElement("span", {
      className: "text-emerald-500 font-bold"
    }, "\u2713"), t))), React.createElement("p", {
      className: "text-xs font-bold uppercase tracking-wide text-amber-600 mt-3"
    }, "Mejor evita"), React.createElement("ul", {
      className: "mt-1 space-y-1"
    }, s.evitar.map((t, i) => React.createElement("li", {
      key: i,
      className: "text-slate-600 flex gap-2"
    }, React.createElement("span", {
      className: "text-amber-500"
    }, "\u2715"), t)))));
  }))), React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\uD83D\uDCDD Mi plan de acci\xF3n"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "Escr\xEDbelo cuando est\xE9s en calma, para tenerlo listo en un momento dif\xEDcil. Se guarda en este tel\xE9fono."), React.createElement("div", {
    className: "space-y-3"
  }, React.createElement("label", {
    className: "block text-xs font-semibold text-slate-500"
  }, "Mis se\xF1ales de alerta", React.createElement("textarea", {
    rows: "2",
    value: plan.senales,
    onChange: e => setPlan(p => ({
      ...p,
      senales: e.target.value
    })),
    placeholder: "C\xF3mo noto que empiezo a estar mal\u2026",
    className: "w-full mt-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
  })), React.createElement("label", {
    className: "block text-xs font-semibold text-slate-500"
  }, "Lo que a m\xED me ayuda", React.createElement("textarea", {
    rows: "2",
    value: plan.ayuda,
    onChange: e => setPlan(p => ({
      ...p,
      ayuda: e.target.value
    })),
    placeholder: "Caminar, m\xFAsica, respirar, llamar a\u2026",
    className: "w-full mt-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
  })), React.createElement("label", {
    className: "block text-xs font-semibold text-slate-500"
  }, "Personas de apoyo (nombre y tel\xE9fono)", React.createElement("input", {
    type: "text",
    value: plan.apoyo,
    onChange: e => setPlan(p => ({
      ...p,
      apoyo: e.target.value
    })),
    placeholder: "Alguien a quien puedo recurrir",
    className: "w-full mt-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
  })), React.createElement("label", {
    className: "block text-xs font-semibold text-slate-500"
  }, "Una frase que me calma", React.createElement("input", {
    type: "text",
    value: plan.frase,
    onChange: e => setPlan(p => ({
      ...p,
      frase: e.target.value
    })),
    placeholder: "Ej.: esto es temporal y puedo con ello",
    className: "w-full mt-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
  }))))), vista === "herramientas" && React.createElement(React.Fragment, null, React.createElement(RegistroPensamientos, {
    avisar: avisar
  }), React.createElement(Distorsiones, null), React.createElement(ActivacionConductual, {
    avisar: avisar
  }), React.createElement(HigieneSueno, null), React.createElement(Autocompasion, null), React.createElement(TresCosasBuenas, {
    avisar: avisar
  })), vista === "registro" && React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\uD83D\uDCC6 Registro de episodios"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "Anota cu\xE1ndo se presenta algo para ver con qu\xE9 frecuencia pasa y qu\xE9 lo acompa\xF1a."), React.createElement("div", {
    className: "grid grid-cols-2 gap-2 mb-2"
  }, React.createElement("select", {
    value: nuevo.tipo,
    onChange: e => setNuevo(n => ({
      ...n,
      tipo: e.target.value
    })),
    className: "rounded-xl border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
  }, TIPOS_EP.map(t => React.createElement("option", {
    key: t.id,
    value: t.id
  }, t.emoji, " ", t.label))), React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("span", {
    className: "text-xs text-slate-500"
  }, "Intensidad"), React.createElement("input", {
    type: "range",
    min: "1",
    max: "10",
    value: nuevo.intensidad,
    onChange: e => setNuevo(n => ({
      ...n,
      intensidad: Number(e.target.value)
    })),
    className: "flex-1 accent-emerald-600"
  }), React.createElement("span", {
    className: "text-sm font-bold text-emerald-700 w-5 text-center"
  }, nuevo.intensidad))), React.createElement("input", {
    type: "text",
    value: nuevo.nota,
    onChange: e => setNuevo(n => ({
      ...n,
      nota: e.target.value
    })),
    placeholder: "\xBFQu\xE9 lo dispar\xF3? (opcional)",
    className: "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  }), React.createElement("button", {
    onClick: registrar,
    className: "w-full mt-2 bg-emerald-700 text-white text-sm font-semibold rounded-xl py-2 hover:bg-emerald-800 flex items-center justify-center gap-2"
  }, React.createElement(IPlus, {
    cls: "w-4 h-4"
  }), " Registrar"), eps.length > 0 && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "grid grid-cols-3 gap-2 mt-4"
  }, React.createElement("div", {
    className: "bg-slate-50 rounded-xl p-2.5 text-center"
  }, React.createElement("div", {
    className: "text-xl font-black text-slate-800"
  }, eps.length), React.createElement("div", {
    className: "text-[11px] text-slate-500"
  }, "en total")), React.createElement("div", {
    className: "bg-sky-50 rounded-xl p-2.5 text-center"
  }, React.createElement("div", {
    className: "text-xl font-black text-sky-700"
  }, semana), React.createElement("div", {
    className: "text-[11px] text-slate-500"
  }, "esta semana")), React.createElement("div", {
    className: "bg-emerald-50 rounded-xl p-2.5 text-center"
  }, React.createElement("div", {
    className: "text-xl font-black text-emerald-700"
  }, mes), React.createElement("div", {
    className: "text-[11px] text-slate-500"
  }, "este mes"))), porTipo.length > 0 && React.createElement("div", {
    className: "flex flex-wrap gap-1.5 mt-3"
  }, porTipo.map(t => React.createElement("span", {
    key: t.id,
    className: "text-xs bg-slate-100 text-slate-700 rounded-full px-2.5 py-1"
  }, t.emoji, " ", t.label, ": ", React.createElement("b", null, t.n)))), React.createElement("div", {
    className: "mt-3 space-y-2"
  }, eps.slice(0, 30).map(e => {
    const ti = tipoInfo(e.tipo);
    const col = e.intensidad >= 8 ? "bg-red-500" : e.intensidad >= 5 ? "bg-amber-500" : "bg-emerald-500";
    return React.createElement("div", {
      key: e.id,
      className: "flex items-center gap-3 border border-slate-200 rounded-xl px-3 py-2"
    }, React.createElement("div", {
      className: "flex-1 min-w-0"
    }, React.createElement("div", {
      className: "text-sm font-semibold text-slate-800"
    }, ti.emoji, " ", ti.label, " ", React.createElement("span", {
      className: "text-xs font-normal text-slate-400"
    }, "\xB7 ", e.fecha)), e.nota && React.createElement("div", {
      className: "text-xs text-slate-500 truncate"
    }, e.nota)), React.createElement("div", {
      className: "flex items-center gap-1.5 shrink-0"
    }, React.createElement("span", {
      className: "text-[11px] text-white font-bold rounded-full px-2 py-0.5 " + col
    }, e.intensidad), React.createElement("button", {
      onClick: () => borrarEp(e.id),
      className: "text-slate-300 hover:text-red-500"
    }, React.createElement(ITrash, {
      cls: "w-3.5 h-3.5"
    }))));
  })))));
}
function Footer() {
  const [open, setOpen] = useState(false);
  return React.createElement("footer", {
    className: "max-w-3xl mx-auto px-4 pb-10 pt-2"
  }, React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4 text-xs text-slate-500"
  }, React.createElement("button", {
    onClick: () => setOpen(!open),
    className: "w-full flex items-center justify-between"
  }, React.createElement("span", {
    className: "font-semibold text-slate-600 flex items-center gap-2"
  }, "\u2139\uFE0F Acerca de MediControl"), React.createElement(IChevD, {
    cls: "w-4 h-4 text-slate-400 transition-transform " + (open ? "rotate-180" : "")
  })), open && React.createElement("div", {
    className: "mt-3 space-y-2 leading-relaxed"
  }, React.createElement("p", null, React.createElement("b", null, "Aplicaci\xF3n sin fines de lucro"), ", hecha para uso personal. No se vende ni busca ganancia alguna."), React.createElement("p", null, "La informaci\xF3n de nutrici\xF3n toma como ", React.createElement("b", null, "referencia"), " material del ", React.createElement("b", null, "IMSS"), " (programa NutrIMSS). Los contenidos de bienestar se basan en estrategias de uso general en psicolog\xEDa (respiraci\xF3n, TCC, DBT, higiene del sue\xF1o, entre otras)."), React.createElement("p", null, "Esta app ", React.createElement("b", null, "no sustituye"), " la valoraci\xF3n ni las recomendaciones de un m\xE9dico, nutri\xF3logo, psic\xF3logo u otro profesional de la salud. Funciona solo como una ", React.createElement("b", null, "gu\xEDa orientativa"), " y su uso es ", React.createElement("b", null, "responsabilidad de cada persona"), " que la utilice."), React.createElement("p", null, "Creada por el ", React.createElement("b", null, "Ing. Christian Hern\xE1ndez S."), ", estudiante de la UNAM (Campo 4), con el fin de apoyar el control de su propia salud y bienestar. Si alguien m\xE1s decide usarla, lo hace bajo su propia responsabilidad."), React.createElement("p", {
    className: "text-slate-400"
  }, "\xA9 2026 Christian Hern\xE1ndez S. Derechos de autor reservados.")), !open && React.createElement("p", {
    className: "mt-2 text-slate-400"
  }, "App sin fines de lucro \xB7 uso personal \xB7 gu\xEDa orientativa, no sustituye a un profesional \xB7 \xA9 2026 Christian Hern\xE1ndez S.")));
}
function Saludable({
  avisar,
  data,
  onIrSalud
}) {
  const [open, setOpen] = useState(null);
  const toggle = id => setOpen(open === id ? null : id);
  const [plan, setPlan] = useState(cargarPlan);
  useEffect(() => {
    try {
      localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
    } catch (e) {}
  }, [plan]);
  const sexoPerfil = data && data.perfil && data.perfil.sexo || "";
  const estaturaPerfil = data && data.perfil && data.perfil.estatura || "";
  const edadPerfil = edadDe(data && data.perfil);
  return React.createElement("div", {
    className: "space-y-4"
  }, React.createElement("div", {
    className: "bg-gradient-to-br from-emerald-700 to-emerald-900 text-white rounded-2xl p-5"
  }, React.createElement("h2", {
    className: "text-lg font-bold flex items-center gap-2"
  }, "\uD83E\uDD57 Alimentaci\xF3n saludable y ejercicio"), React.createElement("p", {
    className: "text-emerald-100 text-sm mt-1"
  }, "Gu\xEDa pr\xE1ctica de alimentaci\xF3n, ejercicio e hidrataci\xF3n. ", React.createElement("b", null, "\xA1Controlo mi peso, mejoro mi salud!")), React.createElement("div", {
    className: "grid grid-cols-3 gap-2 mt-4 text-center"
  }, React.createElement("div", {
    className: "bg-white/10 rounded-xl px-2 py-2.5"
  }, React.createElement("div", {
    className: "text-xl"
  }, "\uD83E\uDD66"), React.createElement("div", {
    className: "text-[11px] font-semibold mt-1"
  }, "1) Alimentaci\xF3n saludable")), React.createElement("div", {
    className: "bg-white/10 rounded-xl px-2 py-2.5"
  }, React.createElement("div", {
    className: "text-xl"
  }, "\uD83C\uDFC3"), React.createElement("div", {
    className: "text-[11px] font-semibold mt-1"
  }, "2) Practica ejercicio")), React.createElement("div", {
    className: "bg-white/10 rounded-xl px-2 py-2.5"
  }, React.createElement("div", {
    className: "text-xl"
  }, "\uD83D\uDCA7"), React.createElement("div", {
    className: "text-[11px] font-semibold mt-1"
  }, "3) Agua simple (6\u20138 vasos)")))), React.createElement(CalcNutricion, {
    data: data,
    onIrSalud: onIrSalud
  }), React.createElement(PlanDiagnostico, null), React.createElement(DiagnosticosClinicos, null), React.createElement(Nutriologa, null), React.createElement(MiPlanRaciones, {
    plan: plan,
    setPlan: setPlan,
    avisar: avisar
  }), React.createElement(ControlDiarioRaciones, {
    plan: plan,
    avisar: avisar
  }), React.createElement(MacronutrientesTabla, null), React.createElement(SeguimientoLogros, {
    avisar: avisar,
    sexoPerfil: sexoPerfil,
    estaturaPerfil: estaturaPerfil,
    edadPerfil: edadPerfil
  }), React.createElement(RecomendacionesNutri, null), React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-4"
  }, React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, "\uD83D\uDD90\uFE0F M\xE9todo de la mano"), React.createElement("p", {
    className: "text-xs text-slate-500 mt-1 mb-3"
  }, "Tus manos son la herramienta m\xE1s sencilla para medir una raci\xF3n: cierra o ahueca la mano y comp\xE1rala con la cantidad servida en tu plato. Sin b\xE1sculas ni tazas medidoras."), React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-3"
  }, METODO_MANO.map(m => React.createElement("div", {
    key: m.grupo + m.mano,
    className: "rounded-xl border border-slate-200 p-3"
  }, React.createElement("div", {
    className: "text-sm font-bold text-slate-800"
  }, m.mano), React.createElement("div", {
    className: "text-xs text-emerald-800 font-semibold mt-0.5"
  }, "= ", m.equivale, " de ", m.grupo), React.createElement("div", {
    className: "text-xs text-slate-500 mt-1.5"
  }, m.ej)))), React.createElement("div", {
    className: "mt-3 flex flex-wrap gap-2 text-xs"
  }, React.createElement("span", {
    className: "bg-slate-100 text-slate-700 rounded-full px-3 py-1.5 font-medium"
  }, "\uD83E\uDD64 Taza = 240 ml"), React.createElement("span", {
    className: "bg-slate-100 text-slate-700 rounded-full px-3 py-1.5 font-medium"
  }, "\uD83E\uDD44 Cucharada = 15 ml"), React.createElement("span", {
    className: "bg-slate-100 text-slate-700 rounded-full px-3 py-1.5 font-medium"
  }, "\uD83E\uDED6 Cucharadita = 5 ml"))), React.createElement(CalcPorciones, {
    avisar: avisar
  }), React.createElement("div", null, React.createElement("h3", {
    className: "font-bold text-slate-800 px-1 mb-2"
  }, "\uD83D\uDCCB Lista para intercambio de alimentos del mismo grupo"), React.createElement("p", {
    className: "text-xs text-slate-500 px-1 mb-3"
  }, "Cada tabla muestra a cu\xE1nto equivale ", React.createElement("b", null, "1 raci\xF3n"), ". Puedes cambiar cualquier alimento por otro del mismo grupo sin alterar tu plan."), React.createElement("div", {
    className: "space-y-2"
  }, Object.entries(GRUPOS).map(([id, g]) => React.createElement(Desplegable, {
    key: id,
    emoji: g.emoji,
    titulo: "1 ración de " + g.label.toLowerCase() + " es igual a…",
    subtitulo: g.desc,
    abierto: open === "lista-" + id,
    onToggle: () => toggle("lista-" + id)
  }, React.createElement(TablaRaciones, {
    items: ALIMENTOS[id]
  }))))), React.createElement("div", null, React.createElement("h3", {
    className: "font-bold text-slate-800 px-1 mb-2"
  }, "\uD83D\uDCDA Gu\xEDas r\xE1pidas de salud"), React.createElement("div", {
    className: "space-y-2"
  }, React.createElement(Desplegable, {
    emoji: "\uD83C\uDF7D\uFE0F",
    titulo: "Men\xFA saludable de 14 d\xEDas",
    subtitulo: "Men\xFAs completos listos para seguir: desayuno, colaciones, comida y cena (~1,500 kcal/d\xEDa)",
    abierto: open === "menu14",
    onToggle: () => toggle("menu14")
  }, React.createElement(MenuSemanal, null)), React.createElement(Desplegable, {
    emoji: "\uD83E\uDD38",
    titulo: "Ejercicio sin riesgo a lesionarte",
    subtitulo: "Siempre en 3 fases para evitar lesiones y dolor muscular",
    abierto: open === "fases",
    onToggle: () => toggle("fases")
  }, React.createElement("div", {
    className: "space-y-3 text-sm text-slate-700"
  }, React.createElement("div", {
    className: "rounded-xl border border-emerald-100 bg-emerald-50/60 p-3"
  }, React.createElement("div", {
    className: "text-xs font-bold text-emerald-900 uppercase tracking-wide"
  }, "1. Calentamiento \xB7 5 a 10 min"), React.createElement("p", {
    className: "text-xs mt-1"
  }, "Prepara m\xFAsculos y articulaciones para el esfuerzo y evita lesiones. Involucra las zonas que vas a ejercitar; inicia con movimientos suaves."), React.createElement("ul", {
    className: "text-xs mt-2 space-y-1"
  }, React.createElement("li", null, "\uD83E\uDDB5 Flexi\xF3n de cadera y rodillas."), React.createElement("li", null, "\uD83D\uDCAA C\xEDrculos de hombros hacia adelante y atr\xE1s, tambi\xE9n con los brazos extendidos."), React.createElement("li", null, "\uD83D\uDE46 C\xEDrculos con la cabeza en ambas direcciones, lenta y suavemente."))), React.createElement("div", {
    className: "rounded-xl border border-amber-100 bg-amber-50/60 p-3"
  }, React.createElement("div", {
    className: "text-xs font-bold text-amber-900 uppercase tracking-wide"
  }, "2. Actividad principal \xB7 30 a 60 min"), React.createElement("p", {
    className: "text-xs mt-1"
  }, "Su objetivo es aumentar el ritmo cardiaco y el gasto de energ\xEDa: movimientos de grandes m\xFAsculos (piernas, brazos y abdomen) a intensidad moderada, con mayor duraci\xF3n y repeticiones."), React.createElement("div", {
    className: "flex flex-wrap gap-1.5 mt-2 text-[11px] font-semibold"
  }, React.createElement("span", {
    className: "bg-white border border-amber-200 rounded-full px-2.5 py-1"
  }, "\uD83D\uDEB2 Bicicleta"), React.createElement("span", {
    className: "bg-white border border-amber-200 rounded-full px-2.5 py-1"
  }, "\uD83C\uDFCA Nadar"), React.createElement("span", {
    className: "bg-white border border-amber-200 rounded-full px-2.5 py-1"
  }, "\uD83C\uDFCB\uFE0F Pesas"), React.createElement("span", {
    className: "bg-white border border-amber-200 rounded-full px-2.5 py-1"
  }, "\uD83D\uDEB6 Caminar o bailar"), React.createElement("span", {
    className: "bg-white border border-amber-200 rounded-full px-2.5 py-1"
  }, "\uD83E\uDDD8 Yoga o pilates"))), React.createElement("div", {
    className: "rounded-xl border border-sky-100 bg-sky-50/60 p-3"
  }, React.createElement("div", {
    className: "text-xs font-bold text-sky-900 uppercase tracking-wide"
  }, "3. Enfriamiento \xB7 5 a 10 min"), React.createElement("p", {
    className: "text-xs mt-1"
  }, "Reduce la actividad poco a poco y normaliza el ritmo cardiaco con movimientos suaves y estiramientos."), React.createElement("ul", {
    className: "text-xs mt-2 space-y-1"
  }, React.createElement("li", null, "\uD83D\uDD04 Gira tu cintura."), React.createElement("li", null, "\u2194\uFE0F Realiza extensi\xF3n lateral del tronco."), React.createElement("li", null, "\uD83D\uDE4C De puntitas, estira los brazos como si trataras de alcanzar algo."))), React.createElement("div", null, React.createElement("div", {
    className: "font-semibold text-slate-800 text-xs uppercase tracking-wide mb-1.5"
  }, "Mide la intensidad con el habla"), React.createElement("div", {
    className: "flex flex-wrap gap-2 text-xs"
  }, React.createElement("span", {
    className: "bg-emerald-100 text-emerald-800 rounded-full px-3 py-1"
  }, "\uD83D\uDE00 Ligera: platicas tranquilo"), React.createElement("span", {
    className: "bg-amber-100 text-amber-800 rounded-full px-3 py-1"
  }, "\uD83D\uDE05 Moderada: te cuesta un poco"), React.createElement("span", {
    className: "bg-rose-100 text-rose-800 rounded-full px-3 py-1"
  }, "\uD83E\uDD75 Intensa: te cuesta mucho"))), React.createElement("ul", {
    className: "text-xs text-slate-600 space-y-1.5"
  }, React.createElement("li", null, "\uD83E\uDE7A Antes de iniciar un programa, acude a valoraci\xF3n m\xE9dica."), React.createElement("li", null, "\uD83D\uDC5F Usa ropa c\xF3moda y calzado adecuado."), React.createElement("li", null, "\uD83D\uDCA7 Toma agua simple antes, durante y despu\xE9s; evita bebidas azucaradas o energizantes."), React.createElement("li", null, "\uD83D\uDCD3 Lleva un registro: tipo de ejercicio, minutos y d\xEDas de la semana."), React.createElement("li", null, "\uD83D\uDC22 Si nunca has hecho ejercicio, empieza gradual: mu\xE9vete m\xE1s y evita estar inactivo.")))), React.createElement(Desplegable, {
    emoji: "\uD83D\uDCC5",
    titulo: "Programa de 8 semanas de ejercicio",
    subtitulo: "De caminata ligera a correr, aumentando poco a poco",
    abierto: open === "programa",
    onToggle: () => toggle("programa")
  }, React.createElement("div", {
    className: "space-y-3 text-sm text-slate-700"
  }, React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-2 text-xs"
  }, React.createElement("div", {
    className: "rounded-xl bg-emerald-50 border border-emerald-100 p-3"
  }, React.createElement("b", {
    className: "text-emerald-900"
  }, "Adultos:"), " al menos 150 min/semana (ej. 5 d\xEDas \xD7 30 min). Si tu meta es reducir peso: 60 min diarios."), React.createElement("div", {
    className: "rounded-xl bg-emerald-50 border border-emerald-100 p-3"
  }, React.createElement("b", {
    className: "text-emerald-900"
  }, "Adolescentes:"), " m\xEDnimo 60 min diarios. Elige actividades que te gusten y sean f\xE1ciles de realizar.")), React.createElement("div", {
    className: "overflow-hidden rounded-xl border border-slate-200 text-xs"
  }, React.createElement("table", {
    className: "w-full"
  }, React.createElement("thead", null, React.createElement("tr", {
    className: "bg-slate-50 text-slate-500"
  }, React.createElement("th", {
    className: "px-2 py-1.5 text-left"
  }, "Semanas"), React.createElement("th", {
    className: "px-2 py-1.5 text-left"
  }, "Etapa e intensidad"), React.createElement("th", {
    className: "px-2 py-1.5 text-left"
  }, "Estructura del d\xEDa"), React.createElement("th", {
    className: "px-2 py-1.5 text-left"
  }, "Frecuencia"))), React.createElement("tbody", null, React.createElement("tr", {
    className: "bg-white"
  }, React.createElement("td", {
    className: "px-2 py-1.5 font-semibold"
  }, "1\u20132"), React.createElement("td", {
    className: "px-2 py-1.5"
  }, "\uD83D\uDE00 \xA1Para comenzar! Ligera (caminar)"), React.createElement("td", {
    className: "px-2 py-1.5"
  }, "5' calentar + 20' actividad + 5' enfriar = 30 min"), React.createElement("td", {
    className: "px-2 py-1.5"
  }, "3 d\xEDas/sem")), React.createElement("tr", {
    className: "bg-slate-50/50"
  }, React.createElement("td", {
    className: "px-2 py-1.5 font-semibold"
  }, "3\u20134"), React.createElement("td", {
    className: "px-2 py-1.5"
  }, "\uD83D\uDE05 \xA1Sigue adelante! Moderada (caminata)"), React.createElement("td", {
    className: "px-2 py-1.5"
  }, "5' + 30' + 5' = 40 min"), React.createElement("td", {
    className: "px-2 py-1.5"
  }, "3\u20134 d\xEDas/sem")), React.createElement("tr", {
    className: "bg-white"
  }, React.createElement("td", {
    className: "px-2 py-1.5 font-semibold"
  }, "5\u20136"), React.createElement("td", {
    className: "px-2 py-1.5"
  }, "\uD83D\uDE05 \xA1Lo est\xE1s logrando! Moderada (trotar)"), React.createElement("td", {
    className: "px-2 py-1.5"
  }, "5' + 40' + 5' = 50 min"), React.createElement("td", {
    className: "px-2 py-1.5"
  }, "4\u20135 d\xEDas/sem")), React.createElement("tr", {
    className: "bg-slate-50/50"
  }, React.createElement("td", {
    className: "px-2 py-1.5 font-semibold"
  }, "7\u20138"), React.createElement("td", {
    className: "px-2 py-1.5"
  }, "\uD83E\uDD75 \xA1Mantente as\xED! Moderada (correr, si no hay contraindicaci\xF3n)"), React.createElement("td", {
    className: "px-2 py-1.5"
  }, "10' + 45' + 5' = 60 min"), React.createElement("td", {
    className: "px-2 py-1.5"
  }, "5\u20136 d\xEDas/sem"))))), React.createElement("p", {
    className: "text-xs bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-amber-900"
  }, React.createElement("b", null, "Desde la semana 5:"), " agrega ejercicios de fuerza 2 a 3 d\xEDas por semana durante 20 min, como sentadillas, lagartijas en la pared o abdominales."), React.createElement("div", null, React.createElement("div", {
    className: "font-semibold text-slate-800 text-xs uppercase tracking-wide mb-1.5"
  }, "Beneficios de hacer ejercicio diariamente"), React.createElement("ul", {
    className: "text-xs space-y-1"
  }, React.createElement("li", null, "\u2696\uFE0F Previene y controla el sobrepeso y la obesidad."), React.createElement("li", null, "\uD83E\uDE78 Ayuda a mantener controlada la glucosa en sangre."), React.createElement("li", null, "\uD83C\uDF97\uFE0F Previene algunos tipos de c\xE1ncer, como el de mama y colon."), React.createElement("li", null, "\uD83D\uDCAA Fortalece m\xFAsculos y mejora tu resistencia sin fatigarte."), React.createElement("li", null, "\uD83E\uDDB4 Fortalece huesos y aumenta la densidad \xF3sea, evitando fracturas."), React.createElement("li", null, "\uD83D\uDE0A Mejora el estado de \xE1nimo, disminuye estr\xE9s y ansiedad, y aumenta la autoestima."))))), React.createElement(Desplegable, {
    emoji: "\uD83D\uDCA7",
    titulo: "Agua simple: funci\xF3n en el cuerpo e hidrataci\xF3n",
    subtitulo: "6 a 8 vasos al d\xEDa \xB7 aprende a leer las se\xF1ales de tu cuerpo",
    abierto: open === "agua",
    onToggle: () => toggle("agua")
  }, React.createElement("div", {
    className: "text-sm text-slate-700 space-y-3"
  }, React.createElement("div", null, React.createElement("div", {
    className: "font-semibold text-slate-800 text-xs uppercase tracking-wide mb-1.5"
  }, "Funci\xF3n del agua en el cuerpo"), React.createElement("ul", {
    className: "text-xs space-y-1.5"
  }, React.createElement("li", null, "\uD83C\uDF7D\uFE0F ", React.createElement("b", null, "Digesti\xF3n:"), " produce saliva, absorbe nutrimentos y forma las heces. ", React.createElement("i", null, "Ej.: un vaso de agua con cada comida facilita la digesti\xF3n y evita el estre\xF1imiento.")), React.createElement("li", null, "\u2764\uFE0F ", React.createElement("b", null, "Circulaci\xF3n:"), " ayuda a la sangre a transportar nutrimentos a \xF3rganos como el cerebro y el coraz\xF3n. ", React.createElement("i", null, "Ej.: bien hidratado piensas y te concentras mejor.")), React.createElement("li", null, "\uD83E\uDEC1 ", React.createElement("b", null, "Respiraci\xF3n:"), " los pulmones pierden agua al respirar, por eso hay que reponerla durante todo el d\xEDa."), React.createElement("li", null, "\uD83C\uDF21\uFE0F ", React.createElement("b", null, "Temperatura:"), " la regula por medio del sudor. ", React.createElement("i", null, "Ej.: en d\xEDas calurosos o al hacer ejercicio necesitas m\xE1s agua de lo habitual.")), React.createElement("li", null, "\uD83D\uDEB0 ", React.createElement("b", null, "Ri\xF1ones:"), " forman la orina, eliminan toxinas y equilibran los electrolitos."))), React.createElement("div", null, React.createElement("div", {
    className: "font-semibold text-slate-800 text-xs uppercase tracking-wide mb-1.5"
  }, "El color de tu orina refleja tu hidrataci\xF3n"), React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] font-semibold"
  }, React.createElement("div", {
    className: "rounded-xl border p-2 bg-slate-50 text-slate-600"
  }, "Muy claro", React.createElement("br", null), React.createElement("span", {
    className: "font-normal"
  }, "Exceso de hidrataci\xF3n")), React.createElement("div", {
    className: "rounded-xl border p-2 bg-emerald-50 text-emerald-800"
  }, "Amarillo paja", React.createElement("br", null), React.createElement("span", {
    className: "font-normal"
  }, "Hidrataci\xF3n adecuada \u2705")), React.createElement("div", {
    className: "rounded-xl border p-2 bg-amber-50 text-amber-800"
  }, "Amarillo", React.createElement("br", null), React.createElement("span", {
    className: "font-normal"
  }, "Riesgo de deshidrataci\xF3n")), React.createElement("div", {
    className: "rounded-xl border p-2 bg-orange-50 text-orange-800"
  }, "Naranja intenso", React.createElement("br", null), React.createElement("span", {
    className: "font-normal"
  }, "Deshidrataci\xF3n \u26A0\uFE0F")))), React.createElement("div", null, React.createElement("div", {
    className: "font-semibold text-slate-800 text-xs uppercase tracking-wide mb-1.5"
  }, "Signos de alarma en la deshidrataci\xF3n (de menor a mayor)"), React.createElement("div", {
    className: "space-y-1.5 text-xs"
  }, React.createElement("div", {
    className: "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
  }, React.createElement("b", null, "1."), " Sensaci\xF3n de sed."), React.createElement("div", {
    className: "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
  }, React.createElement("b", null, "2."), " Sed intensa, p\xE9rdida de apetito, malestar y labios resecos."), React.createElement("div", {
    className: "rounded-lg border border-orange-200 bg-orange-50 px-3 py-2"
  }, React.createElement("b", null, "3."), " Aumento del esfuerzo para realizar actividades cotidianas."), React.createElement("div", {
    className: "rounded-lg border border-rose-200 bg-rose-50 px-3 py-2"
  }, React.createElement("b", null, "4."), " Dificultad de concentraci\xF3n.")), React.createElement("p", {
    className: "text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 mt-2"
  }, React.createElement("b", null, "La deshidrataci\xF3n es un problema grave."), " Toda la familia debe mantenerse hidratada a diario y, en especial, cuando haya v\xF3mito o diarrea.")), React.createElement("div", null, React.createElement("div", {
    className: "font-semibold text-slate-800 text-xs uppercase tracking-wide mb-1.5"
  }, "Ejemplos para lograr tus 6\u20138 vasos"), React.createElement("ul", {
    className: "text-xs space-y-1"
  }, React.createElement("li", null, "\u23F0 Toma 1 vaso al despertar y 1 con cada comida y colaci\xF3n (ya llevas 6)."), React.createElement("li", null, "\uD83C\uDF92 Carga una botella contigo en el trabajo o al salir."), React.createElement("li", null, "\uD83C\uDFC3 Bebe antes, durante y despu\xE9s del ejercicio."), React.createElement("li", null, "\uD83C\uDF4B Si te aburre, agr\xE9gale rodajas de lim\xF3n o pepino, sin az\xFAcar.")), React.createElement("p", {
    className: "text-xs mt-2"
  }, React.createElement("b", null, "Ninguna bebida sustituye al agua simple:"), " refrescos, jugos, n\xE9ctares y bebidas azucaradas son un riesgo para tu salud.")))), React.createElement(Desplegable, {
    emoji: "\uD83D\uDEAB",
    titulo: "Ultraprocesados y sellos de advertencia",
    subtitulo: "Qu\xE9 significa cada sello, ejemplos y por qu\xE9 evitarlos",
    abierto: open === "ultra",
    onToggle: () => toggle("ultra")
  }, React.createElement("div", {
    className: "text-sm text-slate-700 space-y-3"
  }, React.createElement("p", {
    className: "text-xs"
  }, "Son productos industriales a los que se les a\xF1aden sustancias para cambiar su consistencia, composici\xF3n y sabor. Contienen en exceso calor\xEDas, az\xFAcar, grasas saturadas, grasas trans y sodio, adem\xE1s de saborizantes y colorantes. Su consumo frecuente es una de las ", React.createElement("b", null, "causas principales del sobrepeso y la obesidad"), "."), React.createElement("div", {
    className: "text-xs rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
  }, React.createElement("b", null, "C\xF3mo identificarlos:"), " empaque muy colorido o llamativo, sellos octagonales negros, lista enorme de ingredientes dif\xEDciles de leer, sabores muy intensos y caducidad de meses o incluso a\xF1os."), React.createElement("div", null, React.createElement("div", {
    className: "font-semibold text-slate-800 text-xs uppercase tracking-wide mb-1.5"
  }, "Los sellos, su da\xF1o y ejemplos de productos que los llevan"), React.createElement("div", {
    className: "space-y-2 text-xs"
  }, React.createElement("div", {
    className: "rounded-xl border p-2.5"
  }, React.createElement("b", null, "\u2B1B EXCESO CALOR\xCDAS:"), " aumenta la grasa corporal \u2192 sobrepeso y obesidad. ", React.createElement("i", null, "Ej.: frituras, pastelitos, chocolates, galletas rellenas.")), React.createElement("div", {
    className: "rounded-xl border p-2.5"
  }, React.createElement("b", null, "\u2B1B EXCESO AZ\xDACARES:"), " sube los triglic\xE9ridos en sangre y el riesgo de diabetes. ", React.createElement("i", null, "Ej.: refrescos, jugos y n\xE9ctares envasados, cereales de caja azucarados, yogur bebible azucarado.")), React.createElement("div", {
    className: "rounded-xl border p-2.5"
  }, React.createElement("b", null, "\u2B1B EXCESO GRASAS SATURADAS:"), " sube el colesterol malo (LDL) y baja el bueno (HDL). ", React.createElement("i", null, "Ej.: helados, pan dulce empaquetado, galletas con crema, pizza congelada.")), React.createElement("div", {
    className: "rounded-xl border p-2.5"
  }, React.createElement("b", null, "\u2B1B EXCESO GRASAS TRANS:"), " aumenta el riesgo de enfermedades del coraz\xF3n. ", React.createElement("i", null, "Ej.: margarinas, boller\xEDa industrial, botanas fritas empaquetadas.")), React.createElement("div", {
    className: "rounded-xl border p-2.5"
  }, React.createElement("b", null, "\u2B1B EXCESO SODIO:"), " riesgo de hipertensi\xF3n y enfermedades del coraz\xF3n. ", React.createElement("i", null, "Ej.: sopas instant\xE1neas, embutidos, botanas saladas, consom\xE9 en polvo, salsas envasadas.")), React.createElement("div", {
    className: "rounded-xl border p-2.5 bg-slate-900 text-white"
  }, React.createElement("b", null, "CONTIENE CAFE\xCDNA \u2013 EVITAR EN NI\xD1OS:"), " dificulta dormir, causa inquietud, mala calidad de sue\xF1o y alteraciones del crecimiento. ", React.createElement("i", null, "Ej.: refrescos de cola, bebidas energizantes, t\xE9s embotellados.")), React.createElement("div", {
    className: "rounded-xl border p-2.5 bg-slate-900 text-white"
  }, React.createElement("b", null, "CONTIENE EDULCORANTES \u2013 NO RECOMENDABLE EN NI\xD1OS:"), " alteran el apetito y acostumbran a ni\xF1as y ni\xF1os a los sabores dulces. ", React.createElement("i", null, "Ej.: refrescos \"light\" o \"sin az\xFAcar\", aguas saborizadas, polvos para preparar bebidas."))), React.createElement("p", {
    className: "text-[11px] text-slate-400 mt-2"
  }, "Si el producto es peque\xF1o, los sellos pueden aparecer como un n\xFAmero (1 a 5 sellos): entre m\xE1s sellos, peor para tu salud.")), React.createElement("div", null, React.createElement("div", {
    className: "font-semibold text-slate-800 text-xs uppercase tracking-wide mb-1.5"
  }, "El consumo frecuente tambi\xE9n provoca"), React.createElement("div", {
    className: "flex flex-wrap gap-1.5 text-[11px] font-semibold"
  }, React.createElement("span", {
    className: "bg-rose-50 text-rose-700 border border-rose-100 rounded-full px-2.5 py-1"
  }, "Adicci\xF3n a lo dulce/salado"), React.createElement("span", {
    className: "bg-rose-50 text-rose-700 border border-rose-100 rounded-full px-2.5 py-1"
  }, "Hiperactividad"), React.createElement("span", {
    className: "bg-rose-50 text-rose-700 border border-rose-100 rounded-full px-2.5 py-1"
  }, "Falta de concentraci\xF3n"), React.createElement("span", {
    className: "bg-rose-50 text-rose-700 border border-rose-100 rounded-full px-2.5 py-1"
  }, "Anemia"), React.createElement("span", {
    className: "bg-rose-50 text-rose-700 border border-rose-100 rounded-full px-2.5 py-1"
  }, "Cambios de \xE1nimo"))), React.createElement("div", null, React.createElement("div", {
    className: "font-semibold text-slate-800 text-xs uppercase tracking-wide mb-1.5"
  }, "C\xE1mbialo por\u2026"), React.createElement("ul", {
    className: "text-xs space-y-1"
  }, React.createElement("li", null, "\uD83E\uDD64\u27A1\uFE0F\uD83D\uDCA7 Refresco o jugo envasado \u2192 agua simple o agua con lim\xF3n sin az\xFAcar."), React.createElement("li", null, "\uD83C\uDF6C\u27A1\uFE0F\uD83C\uDF4E Dulces y pastelitos \u2192 fruta fresca de temporada."), React.createElement("li", null, "\uD83C\uDF5F\u27A1\uFE0F\uD83C\uDF7F Frituras \u2192 palomitas naturales sin grasa o cacahuates naturales."), React.createElement("li", null, "\uD83E\uDD63\u27A1\uFE0F\uD83C\uDF3E Cereal azucarado \u2192 avena natural con fruta."), React.createElement("li", null, "\uD83C\uDF2D\u27A1\uFE0F\uD83C\uDF57 Embutidos \u2192 pollo o pavo natural preparado en casa."))), React.createElement("p", {
    className: "text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2"
  }, "Si el producto tiene sellos, es da\xF1ino para la salud. Prefiere alimentos naturales, frescos, de temporada y de producci\xF3n local. \uD83C\uDF3D"))), React.createElement(Desplegable, {
    emoji: "\u2B50",
    titulo: "Las 9 reglas de oro de la alimentaci\xF3n",
    subtitulo: "Lo esencial de toda la gu\xEDa en 9 puntos",
    abierto: open === "resumen",
    onToggle: () => toggle("resumen")
  }, React.createElement("ol", {
    className: "text-xs text-slate-700 space-y-2 list-decimal list-inside"
  }, React.createElement("li", null, React.createElement("b", null, "3 comidas completas"), " en horarios fijos + refrigerio saludable a media ma\xF1ana y media tarde."), React.createElement("li", null, "Al menos ", React.createElement("b", null, "un alimento de cada grupo"), " de El Plato del Bien Comer en cada comida principal; cuida raciones."), React.createElement("li", null, "Prefiere ", React.createElement("b", null, "verduras y frutas de temporada"), "; evita alimentos industrializados."), React.createElement("li", null, "Prefiere ", React.createElement("b", null, "carnes blancas"), " (pescado, at\xFAn, sardina, pavo, pollo sin piel); carnes rojas con menor frecuencia. Asadas, horneadas, cocidas o en salsa."), React.createElement("li", null, React.createElement("b", null, "Leche o yogur descremados sin az\xFAcar"), " y quesos blancos bajos en grasa (panela, reques\xF3n, cottage)."), React.createElement("li", null, React.createElement("b", null, "Agua simple y fruta de postre"), "; evita refrescos, jugos, mermeladas, pasteles, pan dulce y dulces."), React.createElement("li", null, React.createElement("b", null, "Grasas buenas"), " (almendras, aguacate); evita crema, mayonesa, mantequilla, manteca, tocino, frituras, empanizados y capeados."), React.createElement("li", null, React.createElement("b", null, "Hierbas arom\xE1ticas en vez de sal"), "; evita cecina, embutidos, bebidas hidratantes/energizantes y concentrados de consom\xE9."), React.createElement("li", null, React.createElement("b", null, "Comparte con tu familia:"), " su apoyo hace m\xE1s f\xE1cil lograrlo. Inv\xEDtales a hacerlo juntos."))), React.createElement(Desplegable, {
    emoji: "\uD83D\uDCA1",
    titulo: "Tips para controlar tu peso",
    subtitulo: "Peque\xF1os esfuerzos, grandes resultados",
    abierto: open === "tips",
    onToggle: () => toggle("tips")
  }, React.createElement("ul", {
    className: "text-xs text-slate-700 space-y-2"
  }, React.createElement("li", null, "\uD83C\uDFAF ", React.createElement("b", null, "Metas realistas:"), " en lugar de 6 tortillas, empieza por 1 o 2. Ten paciencia: Roma no se hizo en 1 d\xEDa."), React.createElement("li", null, "\uD83D\uDED2 ", React.createElement("b", null, "Planea tus compras"), " para tener en casa solo alimentos saludables."), React.createElement("li", null, "\uD83E\uDD55 ", React.createElement("b", null, "Verduras picadas y listas"), " para los momentos de antojo."), React.createElement("li", null, "\uD83C\uDF7D\uFE0F Al comer fuera, ", React.createElement("b", null, "cuida porciones"), " y come antes un refrigerio ligero."), React.createElement("li", null, "\uD83D\uDC83 En fiestas: convive, ", React.createElement("b", null, "baila y mu\xE9vete"), "."), React.createElement("li", null, "\uD83D\uDE34 ", React.createElement("b", null, "Duerme 8 horas:"), " es indispensable para el control de peso."), React.createElement("li", null, "\uD83E\uDDE0 Aprende a manejar tus emociones; si lo necesitas, ", React.createElement("b", null, "busca apoyo profesional"), "."), React.createElement("li", null, "\uD83C\uDFC3 El ejercicio es pieza fundamental: ", React.createElement("b", null, "empieza ya"), ". La mejor medicina es prevenir."))))), React.createElement("p", {
    className: "text-[11px] text-slate-400 text-center px-4"
  }, "Contenido educativo de car\xE1cter general. No sustituye la valoraci\xF3n de tu m\xE9dico ni de profesionales de la nutrici\xF3n. Es para quienes desean cuidar su salud, con o sin sobrepeso, diabetes, hipertensi\xF3n o colesterol/triglic\xE9ridos elevados."));
}
function Respaldo({
  data,
  persist,
  avisar
}) {
  const [preview, setPreview] = useState(null);
  const [errImp, setErrImp] = useState(null);
  const fileRef = React.useRef(null);
  const normalizar = d => ({
    ...d,
    meds: Array.isArray(d.meds) ? d.meds : [],
    taken: d.taken && typeof d.taken === "object" ? d.taken : {},
    inv: Array.isArray(d.inv) ? d.inv : [],
    vitals: d.vitals && typeof d.vitals === "object" ? {
      ...d.vitals,
      readings: Array.isArray(d.vitals.readings) ? d.vitals.readings : [],
      horarios: d.vitals.horarios || null
    } : {
      readings: [],
      horarios: null
    },
    perfil: d.perfil && typeof d.perfil === "object" ? d.perfil : {},
    catalogo: d.catalogo && typeof d.catalogo === "object" ? d.catalogo : {},
    comidas: Array.isArray(d.comidas) ? d.comidas : [],
    agua: d.agua && typeof d.agua === "object" ? d.agua : {}
  });
  const contar = d => ({
    meds: (d.meds || []).length,
    tomas: Object.keys(d.taken || {}).length,
    inv: (d.inv || []).length,
    mediciones: ((d.vitals || {}).readings || []).length,
    horarios: Object.values((d.vitals || {}).horarios || {}).reduce((s, l) => s + (Array.isArray(l) ? l.length : 0), 0),
    comidas: (d.comidas || []).length,
    agua: Object.keys(d.agua || {}).length,
    catalogo: Object.keys(d.catalogo || {}).length,
    perfil: !!(d.perfil && Object.keys(d.perfil).length > 0)
  });
  const exportar = () => {
    const payload = {
      app: "MediControl",
      formato: KEY,
      exportadoEl: new Date().toISOString(),
      data
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "medicontrol-respaldo-" + todayStr() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    persist({
      ...data,
      ultimoRespaldo: new Date().toISOString()
    });
    avisar("Respaldo completo descargado — guárdalo en un lugar seguro");
  };
  const leerArchivo = e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setErrImp(null);
    setPreview(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        const d = json && json.data && typeof json.data === "object" ? json.data : json;
        const parece = d && typeof d === "object" && (Array.isArray(d.meds) || Array.isArray(d.comidas) || d.vitals && typeof d.vitals === "object" || d.taken && typeof d.taken === "object");
        if (!parece) {
          setErrImp("Este archivo no parece ser un respaldo de MediControl. Verifica que sea el archivo .json exportado desde esta app.");
          return;
        }
        setPreview({
          d: normalizar(d),
          fecha: json.exportadoEl || null,
          nombre: file.name
        });
      } catch (err) {
        setErrImp("No se pudo leer el archivo: no es un JSON válido o está dañado.");
      }
    };
    reader.onerror = () => setErrImp("No se pudo leer el archivo. Intenta de nuevo.");
    reader.readAsText(file);
  };
  const restaurar = () => {
    persist(preview.d);
    setPreview(null);
    avisar("Restauración completa: todos tus datos fueron recuperados");
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };
  const actual = contar(data);
  const hayDatos = actual.meds + actual.tomas + actual.mediciones + actual.comidas + actual.inv + actual.agua > 0;
  const diasSinRespaldo = data.ultimoRespaldo ? Math.floor((Date.now() - new Date(data.ultimoRespaldo).getTime()) / 86400000) : null;
  const pedirRespaldo = hayDatos && (diasSinRespaldo === null || diasSinRespaldo >= 7);
  const Chips = ({
    c
  }) => React.createElement("div", {
    className: "flex flex-wrap gap-1.5 text-[11px] font-semibold"
  }, React.createElement("span", {
    className: "bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-1"
  }, "\uD83D\uDC8A ", c.meds, " medicamentos"), React.createElement("span", {
    className: "bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-1"
  }, "\u2705 ", c.tomas, " tomas registradas"), React.createElement("span", {
    className: "bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-1"
  }, "\uD83D\uDCE6 ", c.inv, " art\xEDculos de inventario"), React.createElement("span", {
    className: "bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-1"
  }, "\uD83E\uDE7A ", c.mediciones, " mediciones de salud"), React.createElement("span", {
    className: "bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-1"
  }, "\u23F0 ", c.horarios, " horarios de medici\xF3n"), React.createElement("span", {
    className: "bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-1"
  }, "\uD83C\uDF7D\uFE0F ", c.comidas, " comidas"), React.createElement("span", {
    className: "bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-1"
  }, "\uD83D\uDCA7 ", c.agua, " d\xEDas de hidrataci\xF3n"), React.createElement("span", {
    className: "bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-1"
  }, "\uD83D\uDC64 Perfil ", c.perfil ? "incluido" : "vacío"));
  return React.createElement("div", {
    className: "mt-4 space-y-4"
  }, React.createElement("section", {
    className: "bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
  }, React.createElement("h2", {
    className: "font-bold text-slate-700 flex items-center gap-2"
  }, "\uD83D\uDCBE Respaldo y restauraci\xF3n de datos"), React.createElement("p", {
    className: "text-xs text-slate-500"
  }, "Tus datos se guardan \xFAnicamente en este navegador y en este dispositivo. Si borras el historial de navegaci\xF3n, cambias de tel\xE9fono o el navegador limpia el almacenamiento, se pierden. Exporta un respaldo con regularidad y gu\xE1rdalo en un lugar seguro (correo, nube o memoria USB): con ese archivo puedes recuperar el 100% de tu informaci\xF3n aqu\xED o en cualquier otro dispositivo."), pedirRespaldo && React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800 flex items-center gap-2"
  }, React.createElement(IWarn, {
    cls: "w-4 h-4 shrink-0"
  }), diasSinRespaldo === null ? "Aún no has creado ningún respaldo y ya tienes información registrada. Descarga uno ahora: toma 5 segundos." : "Tu último respaldo fue hace " + diasSinRespaldo + " días. Te recomendamos exportar uno nuevo."), diasSinRespaldo !== null && diasSinRespaldo < 7 && React.createElement("div", {
    className: "text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2"
  }, "\u2705 \xDAltimo respaldo: ", fmtDateLong(data.ultimoRespaldo.slice(0, 10)), diasSinRespaldo === 0 ? " (hoy)" : " (hace " + diasSinRespaldo + " día" + (diasSinRespaldo === 1 ? "" : "s") + ")"), React.createElement("div", null, React.createElement("div", {
    className: "text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5"
  }, "Lo que incluye tu respaldo hoy"), React.createElement(Chips, {
    c: actual
  })), React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-2"
  }, React.createElement("button", {
    onClick: exportar,
    className: "bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"
  }, React.createElement(IDownload, {
    cls: "w-5 h-5"
  }), " Exportar respaldo completo (.json)"), React.createElement("button", {
    onClick: () => fileRef.current && fileRef.current.click(),
    className: "bg-white border-2 border-emerald-700 text-emerald-800 hover:bg-emerald-50 font-bold py-3 rounded-2xl flex items-center justify-center gap-2"
  }, React.createElement(IUpload, {
    cls: "w-5 h-5"
  }), " Importar / restaurar respaldo"), React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: ".json,application/json",
    className: "hidden",
    onChange: leerArchivo
  })), errImp && React.createElement("div", {
    className: "bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-3 py-2.5 flex items-center gap-2"
  }, React.createElement(IWarn, {
    cls: "w-4 h-4 shrink-0"
  }), " ", errImp), preview && (() => {
    const cf = contar(preview.d);
    return React.createElement("div", {
      className: "rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3"
    }, React.createElement("div", {
      className: "font-bold text-slate-800 text-sm flex items-center gap-2"
    }, React.createElement(IUpload, {
      cls: "w-4 h-4 text-amber-700"
    }), " Respaldo listo para restaurar"), React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Archivo: ", React.createElement("b", null, preview.nombre), preview.fecha ? React.createElement("span", null, " \xB7 Exportado el ", React.createElement("b", null, fmtDateLong(preview.fecha.slice(0, 10)))) : React.createElement("span", null, " \xB7 Sin fecha de exportaci\xF3n registrada")), React.createElement("div", null, React.createElement("div", {
      className: "text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5"
    }, "Contenido del archivo"), React.createElement(Chips, {
      c: cf
    })), React.createElement("div", {
      className: "bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-900"
    }, React.createElement("b", null, "\u26A0\uFE0F Importante:"), " restaurar reemplazar\xE1 ", React.createElement("b", null, "todos"), " los datos actuales de la app por los del archivo. ", hayDatos ? "Si quieres conservar lo que tienes ahora, primero descarga un respaldo de lo actual con el botón de abajo." : "Actualmente no tienes datos registrados, así que no perderás nada."), hayDatos && React.createElement("button", {
      onClick: exportar,
      className: "w-full bg-white border border-slate-300 text-slate-700 hover:border-emerald-400 text-sm font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5"
    }, React.createElement(IDownload, {
      cls: "w-4 h-4"
    }), " Descargar primero un respaldo de mis datos actuales"), React.createElement("div", {
      className: "grid grid-cols-2 gap-2"
    }, React.createElement("button", {
      onClick: restaurar,
      className: "bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl"
    }, "Restaurar todo"), React.createElement("button", {
      onClick: () => setPreview(null),
      className: "bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl"
    }, "Cancelar")));
  })(), React.createElement("p", {
    className: "text-[11px] text-slate-400"
  }, "El archivo de respaldo contiene informaci\xF3n de salud personal: gu\xE1rdalo en un lugar privado y no lo compartas. Para m\xE1xima seguridad, exporta un respaldo al menos una vez por semana y siempre antes de actualizar tu tel\xE9fono o limpiar el navegador.")));
}
function Reporte({
  data,
  now,
  avisar
}) {
  const [mes, setMes] = useState(now.getFullYear() + "-" + pad(now.getMonth() + 1));
  const [y, m] = mes.split("-").map(Number);
  const diasEnMes = new Date(y, m, 0).getDate();
  const nowISO = todayStr() + "T" + pad(now.getHours()) + ":" + pad(now.getMinutes());
  const mover = d => {
    const dt = new Date(y, m - 1 + d, 1);
    setMes(dt.getFullYear() + "-" + pad(dt.getMonth() + 1));
  };
  const filas = useMemo(() => {
    return data.meds.map(med => {
      const fin = fechaFin(med);
      let prog = 0,
        tom = 0,
        futuras = 0;
      for (let d = 1; d <= diasEnMes; d++) {
        const fecha = y + "-" + pad(m) + "-" + pad(d);
        if (fecha < med.startDate || fecha > fin) continue;
        for (const t of med.times) {
          prog++;
          if (data.taken[doseKey(med.id, fecha, t)]) tom++;else if (fecha + "T" + t > nowISO) futuras++;
        }
      }
      const vencidas = prog - futuras;
      const adh = vencidas > 0 ? Math.round(tom / vencidas * 100) : null;
      return {
        med,
        prog,
        tom,
        futuras,
        omitidas: Math.max(0, vencidas - tom),
        adh
      };
    }).filter(r => r.prog > 0);
  }, [data, y, m, diasEnMes, nowISO]);
  const totProg = filas.reduce((a, r) => a + r.prog, 0);
  const totTom = filas.reduce((a, r) => a + r.tom, 0);
  const totVenc = filas.reduce((a, r) => a + (r.prog - r.futuras), 0);
  const adhGlobal = totVenc > 0 ? Math.round(totTom / totVenc * 100) : null;
  const olvidos = useMemo(() => {
    const porDia = [0, 0, 0, 0, 0, 0, 0];
    const porHora = {};
    for (const med of data.meds) {
      const fin = fechaFin(med);
      for (let d = 1; d <= diasEnMes; d++) {
        const fecha = y + "-" + pad(m) + "-" + pad(d);
        if (fecha < med.startDate || fecha > fin) continue;
        for (const t of med.times) {
          if (data.taken[doseKey(med.id, fecha, t)]) continue;
          if (fecha + "T" + t > nowISO) continue;
          porDia[parseDate(fecha).getDay()]++;
          porHora[t] = (porHora[t] || 0) + 1;
        }
      }
    }
    let diaMax = 0,
      diaVal = 0;
    porDia.forEach((v, i) => {
      if (v > diaVal) {
        diaVal = v;
        diaMax = i;
      }
    });
    let horaMax = null,
      horaVal = 0;
    Object.keys(porHora).forEach(h => {
      if (porHora[h] > horaVal) {
        horaVal = porHora[h];
        horaMax = h;
      }
    });
    return {
      diaMax,
      diaVal,
      horaMax,
      horaVal,
      porDia,
      total: porDia.reduce((a, b) => a + b, 0)
    };
  }, [data, y, m, diasEnMes, nowISO]);
  const exportarReportePDF = () => {
    if (!(window.jspdf && window.jspdf.jsPDF)) {
      avisar("No se pudo cargar el generador de PDF. Revisa tu conexión a internet y recarga.");
      return;
    }
    const {
      jsPDF
    } = window.jspdf;
    const doc = new jsPDF();
    const nombre = data.perfil && data.perfil.nombre || "";
    doc.setFontSize(16);
    doc.setTextColor(6, 78, 59);
    doc.text("Reporte mensual de adherencia", 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text((nombre ? "Paciente: " + nombre + "  ·  " : "") + "Mes: " + MESES[m - 1] + " " + y + "  ·  Generado: " + fmtDateLong(todayStr()) + "  ·  MediControl", 14, 21);
    doc.autoTable({
      head: [["Medicamento", "Dosis", "Frecuencia", "Motivo", "Programadas", "Tomadas", "Omitidas", "Por venir", "Adherencia"]],
      body: filas.map(r => [r.med.name, r.med.dose, "cada " + r.med.freqHours + " h", r.med.purpose || "—", String(r.prog), String(r.tom), String(r.omitidas), String(r.futuras), r.adh === null ? "—" : r.adh + "%"]),
      startY: 27,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [4, 120, 87],
        fontSize: 8
      },
      alternateRowStyles: {
        fillColor: [245, 250, 248]
      },
      didParseCell: d => {
        if (d.section === "body" && d.column.index === 6 && Number(d.cell.raw) > 0) {
          d.cell.styles.textColor = [190, 18, 60];
          d.cell.styles.fontStyle = "bold";
        }
        if (d.section === "body" && d.column.index === 8 && d.cell.raw !== "—") {
          const v = parseInt(d.cell.raw);
          d.cell.styles.fontStyle = "bold";
          d.cell.styles.textColor = v >= 80 ? [4, 120, 87] : [190, 18, 60];
        }
      }
    });
    let yF = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 30) + 8;
    doc.setFontSize(11);
    doc.setTextColor(4, 120, 87);
    doc.text("ADHERENCIA GLOBAL DEL MES: " + (adhGlobal === null ? "—" : adhGlobal + "%") + "   (" + totTom + " de " + totVenc + " tomas vencidas)", 14, yF);
    yF += 7;
    if (olvidos.total > 0) {
      doc.setFontSize(9);
      doc.setTextColor(180, 83, 9);
      doc.text("Patrones de olvido: el día con más omisiones fue " + DIAS_FULL[olvidos.diaMax] + " (" + olvidos.diaVal + ")" + (olvidos.horaMax ? " y la hora con más olvidos fue " + fmt12(olvidos.horaMax) + " (" + olvidos.horaVal + ")." : "."), 14, yF);
      yF += 5;
      doc.text("Omitidas por día: " + olvidos.porDia.map((v, i) => DIAS_SEM[i] + " " + v).join("  ·  "), 14, yF);
      yF += 7;
    }
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("La adherencia se calcula solo sobre tomas cuya hora ya pasó. Documento informativo; no sustituye la valoración médica.", 14, yF);
    doc.save("reporte-adherencia-" + y + "-" + pad(m) + ".pdf");
    avisar("PDF del reporte mensual descargado");
  };
  return React.createElement("div", {
    className: "space-y-4"
  }, React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-3 flex items-center justify-between"
  }, React.createElement("button", {
    onClick: () => mover(-1),
    className: "px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50"
  }, "\u2190 anterior"), React.createElement("div", {
    className: "font-bold text-slate-700 capitalize"
  }, MESES[m - 1], " ", y), React.createElement("button", {
    onClick: () => mover(1),
    className: "px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50"
  }, "siguiente \u2192")), filas.length === 0 ? React.createElement("div", {
    className: "bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-sm"
  }, React.createElement(IChart, {
    cls: "w-10 h-10 text-slate-300 mx-auto mb-2"
  }), "No hay tratamientos programados en este mes.") : React.createElement(React.Fragment, null, React.createElement("div", {
    className: "grid grid-cols-3 gap-3"
  }, React.createElement(Kpi, {
    label: "Tomas programadas",
    valor: totProg
  }), React.createElement(Kpi, {
    label: "Tomas confirmadas",
    valor: totTom,
    verde: true
  }), React.createElement(Kpi, {
    label: "Adherencia",
    valor: adhGlobal === null ? "—" : adhGlobal + "%",
    verde: adhGlobal !== null && adhGlobal >= 80
  })), olvidos.total > 0 && React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-2xl p-4"
  }, React.createElement("div", {
    className: "font-bold text-amber-900 text-sm mb-1.5 flex items-center gap-1.5"
  }, React.createElement(IWarn, {
    cls: "w-4 h-4"
  }), " Patrones de olvido de ", MESES[m - 1]), React.createElement("p", {
    className: "text-sm text-amber-900"
  }, "El d\xEDa que m\xE1s se te olvida es ", React.createElement("b", null, DIAS_FULL[olvidos.diaMax]), " (", olvidos.diaVal, " ", olvidos.diaVal === 1 ? "toma omitida" : "tomas omitidas", ")", olvidos.horaMax && React.createElement("span", null, " y la hora con m\xE1s olvidos es ", React.createElement("b", null, fmt12(olvidos.horaMax)), " (", olvidos.horaVal, ")"), ". Sugerencia: ancla esa toma a una rutina fija (al desayunar, al lavarte los dientes, al llegar del trabajo) o ponle una alarma espec\xEDfica."), React.createElement("div", {
    className: "flex flex-wrap gap-1.5 mt-2"
  }, olvidos.porDia.map((v, i) => React.createElement("span", {
    key: i,
    className: "text-xs px-2 py-1 rounded-lg border " + (v === 0 ? "bg-white border-slate-200 text-slate-400" : i === olvidos.diaMax ? "bg-rose-100 border-rose-200 text-rose-700 font-bold" : "bg-amber-100 border-amber-200 text-amber-800")
  }, DIAS_SEM[i], ": ", v)))), React.createElement("div", {
    className: "flex justify-end"
  }, React.createElement("button", {
    onClick: exportarReportePDF,
    className: "inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
  }, React.createElement(IDownload, {
    cls: "w-4 h-4"
  }), " Exportar reporte a PDF")), React.createElement("div", {
    className: "space-y-2"
  }, filas.map(r => {
    const cat = catInfo(r.med.category);
    return React.createElement("div", {
      key: r.med.id,
      className: "bg-white rounded-2xl border border-slate-200 p-4"
    }, React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, React.createElement("span", {
      className: "font-bold text-slate-800"
    }, r.med.name), React.createElement("span", {
      className: "text-xs px-2 py-0.5 rounded-full border " + cat.cls
    }, cat.label), React.createElement("span", {
      className: "text-xs text-slate-400"
    }, "cada ", r.med.freqHours, " h \xB7 ", r.med.dose)), r.med.purpose && React.createElement("div", {
      className: "text-xs text-slate-500 mt-0.5"
    }, "Motivo: ", r.med.purpose), React.createElement("div", {
      className: "flex items-center gap-2 mt-2"
    }, React.createElement("div", {
      className: "h-2.5 flex-1 bg-slate-100 rounded-full overflow-hidden flex"
    }, React.createElement("div", {
      className: "h-full bg-emerald-500",
      style: {
        width: (r.prog ? r.tom / r.prog * 100 : 0) + "%"
      }
    }), React.createElement("div", {
      className: "h-full bg-rose-300",
      style: {
        width: (r.prog ? r.omitidas / r.prog * 100 : 0) + "%"
      }
    })), React.createElement("span", {
      className: "text-xs font-semibold text-slate-600 shrink-0"
    }, r.adh === null ? "sin tomas vencidas" : r.adh + "%")), React.createElement("div", {
      className: "flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500"
    }, React.createElement("span", null, "Programadas: ", React.createElement("b", {
      className: "text-slate-700"
    }, r.prog)), React.createElement("span", null, "Tomadas: ", React.createElement("b", {
      className: "text-emerald-700"
    }, r.tom)), React.createElement("span", null, "Omitidas: ", React.createElement("b", {
      className: "text-rose-600"
    }, r.omitidas)), r.futuras > 0 && React.createElement("span", null, "Por venir: ", React.createElement("b", {
      className: "text-slate-600"
    }, r.futuras))));
  })), React.createElement("p", {
    className: "text-xs text-slate-400 text-center"
  }, "La adherencia se calcula solo sobre tomas cuya hora ya pas\xF3. Este reporte es informativo y no sustituye la indicaci\xF3n de tu m\xE9dico.")));
}
function Kpi({
  label,
  valor,
  verde
}) {
  return React.createElement("div", {
    className: "bg-white rounded-2xl border border-slate-200 p-3 text-center"
  }, React.createElement("div", {
    className: "text-2xl font-extrabold " + (verde ? "text-emerald-700" : "text-slate-800")
  }, valor), React.createElement("div", {
    className: "text-xs text-slate-500 mt-0.5"
  }, label));
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(MediControl, null));