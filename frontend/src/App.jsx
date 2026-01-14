import { useEffect, useMemo, useState } from "react";

const API = "/api";

export default function App() {
  const [mode, setMode] = useState("upload"); // "upload" | "gallery"

  // Upload state
  const [file, setFile] = useState(null);
  const [conf, setConf] = useState(0.35);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const tags = useMemo(() => result?.tags ?? [], [result]);

  async function onUpload() {
    setError("");
    setResult(null);

    if (!file) {
      setError("Elegí una imagen primero.");
      return;
    }

    const form = new FormData();
    form.append("file", file);

    try {
      setLoading(true);
      const res = await fetch(`${API}/images?conf=${encodeURIComponent(conf)}`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Error subiendo imagen");
      setResult(data);
      setMode("upload"); // stays
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  // Gallery state
  const [gTag, setGTag] = useState("");
  const [gMinConf, setGMinConf] = useState(0.0);
  const [gLimit, setGLimit] = useState(20);
  const [gItems, setGItems] = useState([]);
  const [gLoading, setGLoading] = useState(false);
  const [gError, setGError] = useState("");

  async function loadGallery() {
    setGError("");
    try {
      setGLoading(true);

      const params = new URLSearchParams();
      if (gTag.trim()) params.set("tag", gTag.trim());
      if (gMinConf > 0) params.set("min_conf", String(gMinConf));
      if (gLimit) params.set("limit", String(gLimit));

      const res = await fetch(`${API}/images?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Error cargando gallery");
      setGItems(data.items ?? []);
    } catch (e) {
      setGError(e.message || "Error");
    } finally {
      setGLoading(false);
    }
  }

  // Cuando cambiás a gallery, cargamos una vez
  useEffect(() => {
    if (mode === "gallery") loadGallery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div style={{ maxWidth: 980, margin: "40px auto", fontFamily: "system-ui" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Visual AI QA</h1>
          <p style={{ marginTop: 6, color: "#555" }}>
            MVP end-to-end: subir imagen → detección (YOLOv8) → persistencia → consulta.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setMode("upload")}
            disabled={mode === "upload"}
            style={{ padding: "8px 12px" }}
          >
            Upload
          </button>
          <button
            onClick={() => setMode("gallery")}
            disabled={mode === "gallery"}
            style={{ padding: "8px 12px" }}
          >
            Gallery
          </button>
        </div>
      </header>

      <hr style={{ margin: "18px 0", border: "none", borderTop: "1px solid #eee" }} />

      {mode === "upload" ? (
        <section>
          <h2 style={{ marginTop: 0 }}>Subir y analizar</h2>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              Conf:
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={conf}
                onChange={(e) => setConf(Number(e.target.value))}
                style={{ width: 90 }}
              />
            </label>

            <button onClick={onUpload} disabled={loading} style={{ padding: "8px 12px" }}>
              {loading ? "Procesando..." : "Subir & Analizar"}
            </button>

            <button
              onClick={() => {
                setResult(null);
                setError("");
                setFile(null);
              }}
              style={{ padding: "8px 12px" }}
            >
              Limpiar
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 16, padding: 12, background: "#ffe5e5" }}>
              {error}
            </div>
          )}

          {result && (
            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <h3>Imagen</h3>
                <img
                  src={result.image.url}
                  alt="uploaded"
                  style={{ width: "100%", borderRadius: 10, border: "1px solid #eee" }}
                />

                <div style={{ marginTop: 12 }}>
                  <h3>Tags</h3>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {tags.length === 0 ? (
                      <span style={{ color: "#777" }}>No se detectó nada</span>
                    ) : (
                      tags.map((t) => (
                        <span
                          key={t}
                          style={{
                            padding: "4px 10px",
                            border: "1px solid #ddd",
                            borderRadius: 999,
                            cursor: "pointer",
                          }}
                          title="Click para filtrar en Gallery"
                          onClick={() => {
                            setGTag(t);
                            setMode("gallery");
                          }}
                        >
                          {t}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3>Detections ({result.detections.length})</h3>
                <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#fafafa" }}>
                        <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>
                          Label
                        </th>
                        <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>
                          Conf
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.detections.map((d, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{d.label}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>
                            {d.confidence.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                      {result.detections.length === 0 && (
                        <tr>
                          <td colSpan="2" style={{ padding: 10, color: "#777" }}>
                            Sin detecciones (probá bajar conf a 0.2)
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <p style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
                  Tip: hacé click en un tag para ir a Gallery filtrado por ese tag.
                </p>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section>
          <h2 style={{ marginTop: 0 }}>Gallery</h2>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              Tag:
              <input
                value={gTag}
                onChange={(e) => setGTag(e.target.value)}
                placeholder="ej: person"
                style={{ width: 180, padding: 6 }}
              />
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              Min conf:
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={gMinConf}
                onChange={(e) => setGMinConf(Number(e.target.value))}
                style={{ width: 90, padding: 6 }}
              />
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              Limit:
              <input
                type="number"
                min="1"
                max="200"
                value={gLimit}
                onChange={(e) => setGLimit(Number(e.target.value))}
                style={{ width: 90, padding: 6 }}
              />
            </label>

            <button onClick={loadGallery} disabled={gLoading} style={{ padding: "8px 12px" }}>
              {gLoading ? "Cargando..." : "Buscar"}
            </button>

            <button
              onClick={() => {
                setGTag("");
                setGMinConf(0.0);
                setGLimit(20);
                setTimeout(loadGallery, 0);
              }}
              style={{ padding: "8px 12px" }}
            >
              Reset
            </button>
          </div>

          {gError && (
            <div style={{ marginTop: 16, padding: 12, background: "#ffe5e5" }}>
              {gError}
            </div>
          )}

          <p style={{ marginTop: 12, color: "#666" }}>
            Mostrando <b>{gItems.length}</b> imágenes
            {gTag.trim() ? (
              <>
                {" "}
                con tag <b>{gTag.trim()}</b>
              </>
            ) : null}
            {gMinConf > 0 ? (
              <>
                {" "}
                (min_conf <b>{gMinConf}</b>)
              </>
            ) : null}
            .
          </p>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {gItems.map((it) => (
              <div
                key={it.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                <img
                  src={it.url}
                  alt={it.filename}
                  style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
                />
                <div style={{ padding: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    #{it.id} — {it.filename}
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {new Date(it.created_at).toLocaleString()}
                  </div>

                  <button
                    style={{ marginTop: 10, padding: "6px 10px" }}
                    onClick={async () => {
                      // Opcional: ver detalles de esa imagen en una alert simple
                      const res = await fetch(`${API}/images/${it.id}`);
                      const data = await res.json();
                      alert(
                        `Tags: ${(data.tags || []).join(", ") || "—"}\nDetections: ${(data.detections || []).length}`
                      );
                    }}
                  >
                    Ver detalles
                  </button>
                </div>
              </div>
            ))}

            {!gLoading && gItems.length === 0 && (
              <div style={{ color: "#777" }}>
                No hay resultados. Probá sin tag o con min_conf más bajo.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
