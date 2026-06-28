import { Fragment, useMemo, useState } from "react";

const impactOptions = [
  { label: "Massive", value: 3 },
  { label: "High", value: 2 },
  { label: "Medium", value: 1 },
  { label: "Low", value: 0.5 },
  { label: "Minimal", value: 0.25 },
];

const confidenceOptions = [
  { label: "High", value: 1 },
  { label: "Medium", value: 0.8 },
  { label: "Low", value: 0.5 },
];

const emptyForm = {
  name: "",
  reach: "",
  impactLabel: "High",
  confidenceLabel: "Medium",
  effort: "",
};

const starterFeatures = [
  {
    id: crypto.randomUUID(),
    name: "Self-serve onboarding checklist",
    reach: 900,
    impactLabel: "High",
    confidenceLabel: "High",
    effort: 4,
  },
  {
    id: crypto.randomUUID(),
    name: "Admin bulk invite flow",
    reach: 520,
    impactLabel: "Medium",
    confidenceLabel: "Medium",
    effort: 2,
  },
  {
    id: crypto.randomUUID(),
    name: "Advanced usage dashboard",
    reach: 300,
    impactLabel: "Massive",
    confidenceLabel: "Low",
    effort: 5,
  },
];

const columns = [
  { key: "name", label: "Name" },
  { key: "reach", label: "Reach" },
  { key: "impact", label: "Impact" },
  { key: "confidence", label: "Confidence" },
  { key: "effort", label: "Effort" },
  { key: "score", label: "Score" },
];

function getOptionValue(options, label) {
  return options.find((option) => option.label === label)?.value ?? 0;
}

function getRiceScore(feature) {
  const impact = getOptionValue(impactOptions, feature.impactLabel);
  const confidence = getOptionValue(confidenceOptions, feature.confidenceLabel);

  // RICE turns four estimates into one priority score:
  // Reach and Impact increase value, Confidence discounts uncertainty,
  // and Effort divides the total so smaller work can outrank bigger bets.
  return (Number(feature.reach) * impact * confidence) / Number(feature.effort);
}

function formatNumber(value, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits,
  }).format(value);
}

// Score tiers give the ranking table a quick-scan visual language ---
// the number alone is precise, but a glance should tell you "ship this
// quarter" vs "revisit later" without reading the digits.
function getScoreTier(score, maxScore) {
  if (maxScore <= 0) return "low";
  const ratio = score / maxScore;
  if (ratio >= 0.66) return "high";
  if (ratio >= 0.33) return "mid";
  return "low";
}

function App() {
  // This portfolio prototype keeps data in React state only. It intentionally
  // avoids localStorage because some demo environments do not allow persistence.
  const [features, setFeatures] = useState(starterFeatures);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "score", direction: "desc" });
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState("");

  const sortedFeatures = useMemo(() => {
    const direction = sortConfig.direction === "asc" ? 1 : -1;

    return [...features].sort((a, b) => {
      const values = {
        name: [a.name.toLowerCase(), b.name.toLowerCase()],
        reach: [Number(a.reach), Number(b.reach)],
        impact: [
          getOptionValue(impactOptions, a.impactLabel),
          getOptionValue(impactOptions, b.impactLabel),
        ],
        confidence: [
          getOptionValue(confidenceOptions, a.confidenceLabel),
          getOptionValue(confidenceOptions, b.confidenceLabel),
        ],
        effort: [Number(a.effort), Number(b.effort)],
        score: [getRiceScore(a), getRiceScore(b)],
      }[sortConfig.key];

      if (values[0] < values[1]) return -1 * direction;
      if (values[0] > values[1]) return 1 * direction;
      return a.name.localeCompare(b.name);
    });
  }, [features, sortConfig]);

  const highestId = sortedFeatures[0]?.id;
  const maxScore = sortedFeatures.length
    ? Math.max(...sortedFeatures.map((f) => getRiceScore(f)))
    : 0;

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();
    const reach = Number(form.reach);
    const effort = Number(form.effort);

    if (!name || !Number.isFinite(reach) || reach < 0 || !Number.isFinite(effort) || effort <= 0) {
      setError("Add a name, a non-negative reach, and an effort greater than 0.");
      return;
    }

    const nextFeature = {
      id: editingId ?? crypto.randomUUID(),
      name,
      reach,
      impactLabel: form.impactLabel,
      confidenceLabel: form.confidenceLabel,
      effort,
    };

    setFeatures((current) =>
      editingId
        ? current.map((feature) => (feature.id === editingId ? nextFeature : feature))
        : [...current, nextFeature],
    );
    setForm(emptyForm);
    setEditingId(null);
    setExpandedId(nextFeature.id);
  }

  function handleSort(key) {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  function editFeature(feature) {
    setForm({
      name: feature.name,
      reach: String(feature.reach),
      impactLabel: feature.impactLabel,
      confidenceLabel: feature.confidenceLabel,
      effort: String(feature.effort),
    });
    setEditingId(feature.id);
    setError("");
  }

  function deleteFeature(id) {
    setFeatures((current) => current.filter((feature) => feature.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm);
    }
    if (expandedId === id) setExpandedId(null);
  }

  function exportCsv() {
    const headers = ["Name", "Reach", "Impact", "Confidence", "Effort", "RICE Score"];
    const rows = sortedFeatures.map((feature) => [
      feature.name,
      feature.reach,
      feature.impactLabel,
      feature.confidenceLabel,
      feature.effort,
      getRiceScore(feature).toFixed(1),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rice-prioritization.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const tierClasses = {
    high: "bg-amber-400/15 text-amber-300 ring-1 ring-inset ring-amber-400/30",
    mid: "bg-slate-400/10 text-slate-300 ring-1 ring-inset ring-slate-400/20",
    low: "bg-slate-400/5 text-slate-500 ring-1 ring-inset ring-slate-400/10",
  };

  return (
    <main className="min-h-screen bg-[#0b0d10] px-4 py-8 text-slate-200 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        {/* ---- Header: instrument plate ---- */}
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-400">
              Reach &middot; Impact &middot; Confidence &middot; Effort
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              RICE Prioritization
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Score initiatives on the same scale so the ranking, not the loudest voice in the room, decides what ships next.
            </p>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={features.length === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-slate-700 bg-slate-900 px-4 font-mono text-xs uppercase tracking-wider text-slate-300 transition hover:border-amber-400/40 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden="true">&darr;</span> Export CSV
          </button>
        </header>

        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* ---- Input panel: dark "control desk" ---- */}
          <form
            onSubmit={handleSubmit}
            className="rounded-md border border-slate-800 bg-[#11151a] p-6"
          >
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? "Edit initiative" : "New initiative"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                The score recalculates the instant you save.
              </p>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  Name
                </span>
                <input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  className="mt-1.5 w-full rounded-sm border border-slate-700 bg-[#0b0d10] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-400/60"
                  placeholder="Mobile checkout redesign"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                    Reach
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.reach}
                    onChange={(event) => updateForm("reach", event.target.value)}
                    className="mt-1.5 w-full rounded-sm border border-slate-700 bg-[#0b0d10] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-400/60"
                    placeholder="500"
                  />
                </label>

                <label className="block">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                    Effort (mo)
                  </span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={form.effort}
                    onChange={(event) => updateForm("effort", event.target.value)}
                    className="mt-1.5 w-full rounded-sm border border-slate-700 bg-[#0b0d10] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-400/60"
                    placeholder="3"
                  />
                </label>
              </div>

              <label className="block">
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  Impact
                </span>
                <select
                  value={form.impactLabel}
                  onChange={(event) => updateForm("impactLabel", event.target.value)}
                  className="mt-1.5 w-full rounded-sm border border-slate-700 bg-[#0b0d10] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-400/60"
                >
                  {impactOptions.map((option) => (
                    <option key={option.label} value={option.label}>
                      {option.label} &middot; {option.value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  Confidence
                </span>
                <select
                  value={form.confidenceLabel}
                  onChange={(event) => updateForm("confidenceLabel", event.target.value)}
                  className="mt-1.5 w-full rounded-sm border border-slate-700 bg-[#0b0d10] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-400/60"
                >
                  {confidenceOptions.map((option) => (
                    <option key={option.label} value={option.label}>
                      {option.label} &middot; {Math.round(option.value * 100)}%
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error && (
              <p className="mt-5 rounded-sm border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-sm bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                {editingId ? "Save changes" : "Add to ranking"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                    setError("");
                  }}
                  className="inline-flex min-h-11 items-center justify-center rounded-sm border border-slate-700 px-4 text-sm font-medium text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* ---- Ranking table: spec sheet ---- */}
          <section className="overflow-hidden rounded-md border border-slate-800 bg-[#11151a]">
            <div className="flex flex-col gap-1 border-b border-slate-800 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Ranking</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Sorted by score &middot; click a header to re-sort.
                </p>
              </div>
              <span className="font-mono text-xs text-slate-500">
                {features.length} {features.length === 1 ? "initiative" : "initiatives"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-190 border-collapse text-left text-sm">
                <thead className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  <tr className="border-b border-slate-800">
                    {columns.map((column) => (
                      <th key={column.key} className="px-4 py-3 font-medium">
                        <button
                          type="button"
                          onClick={() => handleSort(column.key)}
                          className="flex min-h-8 items-center gap-1.5 text-left transition hover:text-amber-300"
                        >
                          {column.label}
                          <span aria-hidden="true" className="text-amber-400/70">
                            {sortConfig.key === column.key
                              ? sortConfig.direction === "desc"
                                ? "\u2193"
                                : "\u2191"
                              : ""}
                          </span>
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {sortedFeatures.map((feature) => {
                    const impact = getOptionValue(impactOptions, feature.impactLabel);
                    const confidence = getOptionValue(
                      confidenceOptions,
                      feature.confidenceLabel,
                    );
                    const score = getRiceScore(feature);
                    const tier = getScoreTier(score, maxScore);
                    const isExpanded = expandedId === feature.id;
                    const isHighest = feature.id === highestId;

                    return (
                      <Fragment key={feature.id}>
                        <tr className="transition hover:bg-white/2">
                          <td className="px-4 py-4 font-medium text-slate-100">
                            <div className="flex items-center gap-2">
                              {feature.name}
                              {isHighest && (
                                <span className="rounded-sm bg-amber-400 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-slate-950">
                                  Top
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 font-mono text-slate-400">
                            {formatNumber(feature.reach, 0)}
                          </td>
                          <td className="px-4 py-4 text-slate-400">
                            {feature.impactLabel}{" "}
                            <span className="font-mono text-slate-600">&middot; {impact}</span>
                          </td>
                          <td className="px-4 py-4 text-slate-400">
                            {feature.confidenceLabel}{" "}
                            <span className="font-mono text-slate-600">
                              &middot; {Math.round(confidence * 100)}%
                            </span>
                          </td>
                          <td className="px-4 py-4 font-mono text-slate-400">
                            {formatNumber(feature.effort)} mo
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex min-w-18 items-center justify-center rounded-sm px-2.5 py-1 font-mono text-base font-semibold ${tierClasses[tier]}`}
                            >
                              {formatNumber(score)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-wide">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedId(isExpanded ? null : feature.id)
                                }
                                className="rounded-sm border border-slate-700 px-2.5 py-1.5 text-slate-400 transition hover:border-amber-400/40 hover:text-amber-300"
                              >
                                Why?
                              </button>
                              <button
                                type="button"
                                onClick={() => editFeature(feature)}
                                className="rounded-sm border border-slate-700 px-2.5 py-1.5 text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteFeature(feature.id)}
                                className="rounded-sm border border-red-500/20 px-2.5 py-1.5 text-red-400/80 transition hover:border-red-500/40 hover:text-red-300"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${feature.id}-details`} className="bg-black/20">
                            <td colSpan="7" className="px-4 py-3 font-mono text-xs text-slate-400">
                              <span className="text-amber-300">Why this score &mdash;</span>{" "}
                              {formatNumber(feature.reach, 0)} reach &times; {impact} impact &times;{" "}
                              {confidence} confidence &divide; {formatNumber(feature.effort)} effort ={" "}
                              <span className="text-slate-100">{formatNumber(score)}</span>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {features.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-500">
                No initiatives yet &mdash; add one on the left to start the ranking.
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

export default App;