(() => {
  "use strict";

  /* ------------------------------------------------------------------
   * Categorias (ordem = sentido horário do radar, começando pelo topo)
   * ------------------------------------------------------------------ */
  const CATEGORIES = [
    { id: "job",   label: "Falha de job",         axis: "Falha de job", color: "#00747f" },
    { id: "cpu",   label: "Alto uso de CPU",      axis: "CPU",          color: "#25a0a8" },
    { id: "mem",   label: "Memória insuficiente", axis: "Memória",      color: "#5bbfba" },
    { id: "io",    label: "Erro de I/O",          axis: "I/O",          color: "#7c93a5" },
    { id: "indis", label: "Indisponibilidade",    axis: "Indisponib.",  color: "#e0a84a" },
    { id: "rede",  label: "Falha de rede",        axis: "Rede",         color: "#b8606a" },
  ];
  const CAT_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

  /* ------------------------------------------------------------------
   * DADOS DE EXEMPLO — substitua por sua API em loadData().
   * `totals`: episódios acumulados por categoria no cluster.
   * `nodes[].top`: principais categorias do node hoje (até 3).
   * ------------------------------------------------------------------ */
  const MOCK = {
    hpcs: [
      {
        id: "hpc-1",
        name: "HPC Principal",
        clusters: [
          {
            id: "alpha", name: "Cluster Alpha",
            totals: { job: 24, cpu: 20, mem: 14, io: 11, indis: 8, rede: 5 },
            nodes: [
              { name: "node-compute-07", total: 18, top: [["job", 7], ["cpu", 6], ["mem", 5]] },
              { name: "node-compute-03", total: 14, top: [["cpu", 6], ["io", 5], ["job", 3]] },
            ],
          },
          {
            id: "beta", name: "Cluster Beta",
            totals: { job: 14, cpu: 9, mem: 10, io: 12, indis: 7, rede: 4 },
            nodes: [
              { name: "node-storage-02", total: 11, top: [["io", 5], ["mem", 4], ["indis", 2]] },
              { name: "node-storage-05", total: 4,  top: [["io", 2], ["mem", 1], ["job", 1]] },
            ],
          },
          {
            id: "gamma", name: "Cluster Gamma",
            totals: { job: 10, cpu: 8, mem: 7, io: 3, indis: 4, rede: 6 },
            nodes: [
              { name: "node-gpu-04",  total: 9, top: [["job", 4], ["mem", 3], ["rede", 2]] },
              { name: "node-edge-01", total: 6, top: [["rede", 3], ["indis", 2], ["io", 1]] },
            ],
          },
        ],
      },
    ],
    updatedAt: "hoje às 05h",
  };

  async function loadData() {
    // Troque por: const res = await fetch("/api/..."); return res.json();
    return MOCK;
  }

  /* ------------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);
  const nf = new Intl.NumberFormat("pt-BR");
  const pf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

  const el = {
    hpc: $("hpc-select"),
    cluster: $("cluster-select"),
    status: $("connection-status"),
    summary: $("cluster-summary"),
    time: $("data-time"),
    empty: $("empty-state"),
    retry: $("restore-cluster"),
    kpis: $("cat-kpis"),
    chartCard: $("cat-chart-card"),
    nodes: $("cat-nodes"),
    topNodeName: $("top-node-name"),
    topNodeCount: $("top-node-count"),
    topNodeCluster: $("top-node-cluster"),
    topCatName: $("top-category-name"),
    topCatCount: $("top-category-count"),
    topCatShare: $("top-category-share"),
    catTotal: $("cat-total"),
    legend: $("category-legend"),
    nodeCards: $("node-cards"),
    canvas: $("category-radar"),
  };

  let data = null;
  let chart = null;

  function setVisible(hasData) {
    [el.kpis, el.chartCard, el.nodes].forEach((s) => { s.hidden = !hasData; });
    el.empty.hidden = hasData;
  }

  function fillSelect(select, options, withAll) {
    select.replaceChildren();
    if (withAll) select.append(new Option("Todos os clusters", "all"));
    options.forEach((o) => select.append(new Option(o.name, o.id)));
  }

  function currentHpc() {
    return data.hpcs.find((h) => h.id === el.hpc.value) || data.hpcs[0];
  }

  function visibleClusters() {
    const hpc = currentHpc();
    if (!hpc) return [];
    return el.cluster.value === "all"
      ? hpc.clusters
      : hpc.clusters.filter((c) => c.id === el.cluster.value);
  }

  function aggregate(clusters) {
    const totals = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0]));
    const nodes = [];
    clusters.forEach((cl) => {
      CATEGORIES.forEach((c) => { totals[c.id] += (cl.totals && cl.totals[c.id]) || 0; });
      (cl.nodes || []).forEach((n) => nodes.push({ ...n, cluster: cl.name }));
    });
    nodes.sort((a, b) => b.total - a.total);
    return { totals, nodes };
  }

  function renderKpis(totals, nodes, grandTotal) {
    const top = nodes[0];
    el.topNodeName.textContent = top ? top.name : "—";
    el.topNodeCount.textContent = top ? nf.format(top.total) : "—";
    el.topNodeCluster.textContent = top ? top.cluster : "—";

    const topCat = CATEGORIES.reduce((a, b) => (totals[b.id] > totals[a.id] ? b : a));
    el.topCatName.textContent = topCat.label;
    el.topCatCount.textContent = nf.format(totals[topCat.id]);
    el.topCatShare.textContent = grandTotal
      ? `${pf.format((totals[topCat.id] / grandTotal) * 100)}% do total`
      : "—";
  }

  function renderLegend(totals) {
    el.legend.replaceChildren();
    CATEGORIES.forEach((c) => {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.className = "cat-legend-label";
      const dot = document.createElement("i");
      dot.className = "cat-dot";
      dot.style.background = c.color;
      dot.setAttribute("aria-hidden", "true");
      label.append(dot, document.createTextNode(c.label));
      const value = document.createElement("strong");
      value.className = "cat-legend-value";
      value.textContent = nf.format(totals[c.id]);
      li.append(label, value);
      el.legend.append(li);
    });
  }

  function renderRadar(totals, grandTotal) {
    const values = CATEGORIES.map((c) => totals[c.id]);
    const max = Math.max(...values, 1);
    el.canvas.setAttribute(
      "aria-label",
      "Gráfico radar com episódios por categoria: " +
        CATEGORIES.map((c) => `${c.label} ${totals[c.id]}`).join(", ")
    );

    if (!window.Chart) return;

    if (chart) {
      chart.data.datasets[0].data = values;
      chart.options.scales.r.suggestedMax = max;
      chart.update();
      return;
    }

    chart = new Chart(el.canvas, {
      type: "radar",
      data: {
        labels: CATEGORIES.map((c) => c.axis),
        datasets: [{
          label: "Episódios",
          data: values,
          backgroundColor: "rgba(14, 120, 144, 0.18)",
          borderColor: "#0e7890",
          borderWidth: 2,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#0e7890",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            beginAtZero: true,
            suggestedMax: max,
            ticks: { display: false, stepSize: Math.ceil(max / 3) },
            grid: { color: "#e3e8ee" },
            angleLines: { color: "#e3e8ee" },
            pointLabels: { color: "#8290a5", font: { size: 11 } },
          },
        },
      },
    });
  }

  function renderNodeCards(nodes) {
    el.nodeCards.replaceChildren();
    nodes.forEach((n, i) => {
      const card = document.createElement("article");
      card.className = "cat-node";

      const head = document.createElement("div");
      head.className = "cat-node-head";

      const icon = document.createElement("span");
      icon.className = "cat-node-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = '<i class="fa-solid fa-server"></i>';

      const title = document.createElement("div");
      title.className = "cat-node-title";
      const name = document.createElement("span");
      name.className = "cat-node-name";
      name.textContent = n.name;
      const cluster = document.createElement("span");
      cluster.className = "cat-node-cluster";
      cluster.textContent = n.cluster;
      title.append(name, cluster);

      const total = document.createElement("span");
      total.className = "cat-node-total" + (i === 0 ? " cat-node-total--alert" : "");
      total.textContent = nf.format(n.total);
      total.setAttribute("aria-label", `${n.total} episódios`);

      head.append(icon, title, total);

      const chips = document.createElement("div");
      chips.className = "cat-chips";
      (n.top || []).forEach(([id, count]) => {
        const cat = CAT_BY_ID[id];
        if (!cat) return;
        const chip = document.createElement("span");
        chip.className = "cat-chip";
        const count_ = document.createElement("b");
        count_.textContent = nf.format(count);
        chip.append(document.createTextNode(cat.label), count_);
        chips.append(chip);
      });

      card.append(head, chips);
      el.nodeCards.append(card);
    });
  }

  function render() {
    const clusters = visibleClusters();
    const { totals, nodes } = aggregate(clusters);
    const grandTotal = CATEGORIES.reduce((sum, c) => sum + totals[c.id], 0);

    if (!clusters.length || !grandTotal) {
      setVisible(false);
      el.status.textContent = "Sem dados";
      el.summary.textContent = "— nodes";
      return;
    }

    setVisible(true);
    el.status.textContent = "Dados carregados";
    el.summary.textContent = `${nodes.length} nodes`;
    el.time.textContent = `Atualizado ${data.updatedAt || ""}`.trim();
    el.catTotal.textContent = `${nf.format(grandTotal)} episódios`;

    renderKpis(totals, nodes, grandTotal);
    renderLegend(totals);
    renderRadar(totals, grandTotal);
    renderNodeCards(nodes);
  }

  function onHpcChange() {
    fillSelect(el.cluster, currentHpc().clusters, true);
    render();
  }

  async function init() {
    el.status.textContent = "Carregando dados…";
    try {
      data = await loadData();
    } catch (err) {
      data = null;
    }
    if (!data || !data.hpcs || !data.hpcs.length) {
      setVisible(false);
      el.status.textContent = "Falha ao carregar dados";
      return;
    }
    fillSelect(el.hpc, data.hpcs, false);
    fillSelect(el.cluster, data.hpcs[0].clusters, true);
    render();
  }

  el.hpc.addEventListener("change", onHpcChange);
  el.cluster.addEventListener("change", render);
  el.retry.addEventListener("click", init);

  init();
})();
