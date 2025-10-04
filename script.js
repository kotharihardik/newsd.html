
// Function to display Indian time in the exact format
function updateIndianTime() {
    const now = new Date();
    
    // Format: "Sat Oct 04 2025 23:44:59 GMT+0530 (India Standard Time)"
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const day = days[now.getDay()];
    const month = months[now.getMonth()];
    const date = now.getDate().toString().padStart(2, '0');
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    const indianTime = `${day} ${month} ${date} ${year} ${hours}:${minutes}:${seconds} GMT+0530 (India Standard Time)`;
    
    const timeElement = document.getElementById('txt');
    if (timeElement) {
        timeElement.textContent = indianTime;
    }
}

// Update time immediately and then every second
updateIndianTime();
setInterval(updateIndianTime, 1000);

// Back to top button functionality
window.addEventListener('scroll', function() {
    const backToTop = document.querySelector('.back-to-top');
    if (window.scrollY > 300) {
        backToTop.style.opacity = '1';
        backToTop.style.visibility = 'visible';
    } else {
        backToTop.style.opacity = '0';
        backToTop.style.visibility = 'hidden';
    }
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// Simple hover effect for cards
const cards = document.querySelectorAll('.card');
cards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
        this.style.transition = 'transform 0.3s ease';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });
});

// ==========================
// Data Dictionary Tool Logic
// ==========================
(() => {
  const inputEl = document.getElementById('dd-input');
  const fileEl = document.getElementById('dd-file');
  const formatEl = document.getElementById('dd-format');
  const renderBtn = document.getElementById('dd-render');
  const clearBtn = document.getElementById('dd-clear');
  const loadSampleBtn = document.getElementById('dd-load-sample');
  const dictEl = document.getElementById('dd-dictionary');
  const jsonEl = document.getElementById('dd-json');
  const diagramSvg = document.getElementById('dd-diagram');
  const exportPdfBtn = document.getElementById('dd-export-pdf');
  const exportHtmlBtn = document.getElementById('dd-export-html');
  const diagramWrapper = document.getElementById('dd-diagram-wrapper');

  if (!inputEl) return; // Section not present

  function loadSample() {
    const sample = {
      database: 'ShopDB',
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INT', pk: true, nullable: false },
            { name: 'email', type: 'VARCHAR(255)', unique: true, nullable: false },
            { name: 'name', type: 'VARCHAR(120)', nullable: false },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false }
          ]
        },
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'INT', pk: true, nullable: false },
            { name: 'title', type: 'VARCHAR(255)', nullable: false },
            { name: 'price', type: 'DECIMAL(10,2)', nullable: false },
            { name: 'stock', type: 'INT', nullable: false }
          ]
        },
        {
          name: 'orders',
          columns: [
            { name: 'id', type: 'INT', pk: true, nullable: false },
            { name: 'user_id', type: 'INT', nullable: false },
            { name: 'status', type: 'VARCHAR(30)', nullable: false },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false }
          ]
        },
        {
          name: 'order_items',
          columns: [
            { name: 'id', type: 'INT', pk: true, nullable: false },
            { name: 'order_id', type: 'INT', nullable: false },
            { name: 'product_id', type: 'INT', nullable: false },
            { name: 'quantity', type: 'INT', nullable: false },
            { name: 'unit_price', type: 'DECIMAL(10,2)', nullable: false }
          ]
        }
      ],
      relationships: [
        { fromTable: 'orders', fromColumn: 'user_id', toTable: 'users', toColumn: 'id' },
        { fromTable: 'order_items', fromColumn: 'order_id', toTable: 'orders', toColumn: 'id' },
        { fromTable: 'order_items', fromColumn: 'product_id', toTable: 'products', toColumn: 'id' }
      ]
    };
    inputEl.value = JSON.stringify(sample, null, 2);
  }

  function detectFormat(text) {
    const explicit = formatEl.value;
    if (explicit !== 'auto') return explicit;
    const t = text.trim();
    if (!t) return 'json';
    if (t.startsWith('{') || t.startsWith('[')) return 'json';
    if (t.startsWith('<')) return 'xml';
    return 'json';
  }

  function parseXmlToModel(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    if (doc.querySelector('parsererror')) {
      throw new Error('Invalid XML input');
    }
    const dbName = doc.documentElement.getAttribute('name') || 'database';
    const tableNodes = Array.from(doc.getElementsByTagName('table'));
    const tables = tableNodes.map(t => {
      const name = t.getAttribute('name');
      const columns = Array.from(t.getElementsByTagName('column')).map(c => ({
        name: c.getAttribute('name'),
        type: c.getAttribute('type') || 'TEXT',
        pk: c.getAttribute('pk') === 'true',
        unique: c.getAttribute('unique') === 'true',
        nullable: c.getAttribute('nullable') !== 'false'
      }));
      return { name, columns };
    });
    const relationships = Array.from(doc.getElementsByTagName('relationship')).map(r => ({
      fromTable: r.getAttribute('fromTable'),
      fromColumn: r.getAttribute('fromColumn'),
      toTable: r.getAttribute('toTable'),
      toColumn: r.getAttribute('toColumn')
    }));
    return { database: dbName, tables, relationships };
  }

  function normalizeModel(model) {
    if (!model || !Array.isArray(model.tables)) throw new Error('Invalid model: missing tables[]');
    const tableMap = new Map();
    for (const t of model.tables) {
      const columns = (t.columns || []).map(col => ({
        name: String(col.name),
        type: col.type || 'TEXT',
        pk: Boolean(col.pk),
        unique: Boolean(col.unique),
        nullable: col.nullable !== false
      }));
      const name = String(t.name);
      tableMap.set(name, { name, columns });
    }
    const relationships = (model.relationships || []).map(r => ({
      fromTable: String(r.fromTable),
      fromColumn: String(r.fromColumn),
      toTable: String(r.toTable),
      toColumn: String(r.toColumn)
    })).filter(r => tableMap.has(r.fromTable) && tableMap.has(r.toTable));
    return { database: model.database || 'database', tables: Array.from(tableMap.values()), relationships };
  }

  function renderDictionary(model) {
    const container = dictEl;
    container.innerHTML = '';
    for (const table of model.tables) {
      const header = document.createElement('div');
      header.className = 'dd-table-header';
      header.textContent = `${table.name}`;
      container.appendChild(header);

      const tableEl = document.createElement('table');
      tableEl.className = 'table table-sm dd-dictionary-table mt-2';
      const thead = document.createElement('thead');
      thead.innerHTML = '<tr><th>Column</th><th>Type</th><th>PK</th><th>Unique</th><th>Nullable</th></tr>';
      const tbody = document.createElement('tbody');
      for (const col of table.columns) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${col.name}</td>
          <td><code>${col.type}</code></td>
          <td>${col.pk ? '<span class="badge bg-success">PK</span>' : ''}</td>
          <td>${col.unique ? '<span class="badge bg-info">UQ</span>' : ''}</td>
          <td>${col.nullable ? 'YES' : 'NO'}</td>
        `;
        tbody.appendChild(tr);
      }
      tableEl.appendChild(thead);
      tableEl.appendChild(tbody);
      container.appendChild(tableEl);
    }
  }

  function measureText(ctx, text, font = '12px sans-serif') {
    ctx.font = font;
    return ctx.measureText(text).width;
  }

  function renderDiagram(model) {
    const svg = d3.select(diagramSvg);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const width = diagramWrapper.clientWidth - margin.left - margin.right;
    const rowHeight = 20;
    const headerHeight = 28;
    const xGap = 40;
    const yGap = 60;

    // Compute node sizes
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const nodes = model.tables.map((t, idx) => {
      const titleWidth = measureText(ctx, t.name, 'bold 14px sans-serif') + 20;
      const colWidth = Math.max(...t.columns.map(c => measureText(ctx, `${c.name}: ${c.type}`, '12px sans-serif')), 60) + 20;
      const width = Math.max(titleWidth, colWidth);
      const height = headerHeight + t.columns.length * rowHeight + 10;
      return { id: t.name, table: t, width, height };
    });

    // Simple grid layout
    let curX = margin.left, curY = margin.top;
    let maxRowH = 0;
    const positioned = nodes.map(n => {
      if (curX + n.width > width) {
        curX = margin.left;
        curY += maxRowH + yGap;
        maxRowH = 0;
      }
      const node = { ...n, x: curX, y: curY };
      curX += n.width + xGap;
      maxRowH = Math.max(maxRowH, n.height);
      return node;
    });

    const diagramHeight = positioned.reduce((max, n) => Math.max(max, n.y + n.height), 0) + margin.bottom + 20;
    svg.attr('width', width + margin.left + margin.right).attr('height', Math.max(diagramHeight, 400));

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 10)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', '#64748b');

    const idToNode = new Map(positioned.map(n => [n.id, n]));

    // Draw links first
    const links = (model.relationships || []).map(r => ({
      source: idToNode.get(r.fromTable),
      target: idToNode.get(r.toTable),
      r
    })).filter(l => l.source && l.target);

    svg.selectAll('path.dd-link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'dd-link')
      .attr('d', d => {
        const sx = d.source.x + d.source.width;
        const sy = d.source.y + headerHeight + rowHeight * Math.max(0, d.source.table.columns.findIndex(c => c.name === d.r.fromColumn));
        const tx = d.target.x;
        const ty = d.target.y + headerHeight + rowHeight * Math.max(0, d.target.table.columns.findIndex(c => c.name === d.r.toColumn));
        const mx = (sx + tx) / 2;
        return `M${sx},${sy} C ${mx},${sy} ${mx},${ty} ${tx},${ty}`;
      });

    // Draw nodes
    const g = svg.selectAll('g.dd-node')
      .data(positioned)
      .enter()
      .append('g')
      .attr('class', 'dd-node')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    g.append('rect')
      .attr('class', 'dd-table-node')
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('width', d => d.width)
      .attr('height', d => d.height);

    g.append('text')
      .attr('class', 'dd-table-title')
      .attr('x', 10)
      .attr('y', 20)
      .text(d => d.table.name);

    g.append('line')
      .attr('x1', 0)
      .attr('x2', d => d.width)
      .attr('y1', headerHeight)
      .attr('y2', headerHeight)
      .attr('stroke', '#e2e8f0');

    g.each(function(d) {
      const group = d3.select(this);
      d.table.columns.forEach((col, i) => {
        const y = headerHeight + 16 + i * rowHeight;
        group.append('text').attr('class', 'dd-col-name').attr('x', 10).attr('y', y).text(col.name);
        group.append('text').attr('class', 'dd-col-type').attr('x', 160).attr('y', y).text(col.type);
        if (col.pk) group.append('text').attr('class', 'dd-key').attr('x', d.width - 50).attr('y', y).text('PK');
        if (col.unique) group.append('text').attr('class', 'dd-unique').attr('x', d.width - 22).attr('y', y).text('UQ');
      });
    });
  }

  function exportPdf() {
    const area = document.querySelector('#data-dictionary .card');
    if (!area) return;
    const { jsPDF } = window.jspdf;
    html2canvas(area, { scale: 2 }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const imgWidth = canvas.width * ratio;
      const imgHeight = canvas.height * ratio;
      const x = (pageWidth - imgWidth) / 2;
      const y = 20;
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save('data-dictionary.pdf');
    });
  }

  function exportHtml(model) {
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Data Dictionary Export</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body{padding:20px;font-family:system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"}
    .dd-table-header{background:#f1f5f9;padding:8px 10px;border:1px solid #e9ecef;border-radius:6px;margin-top:12px;font-weight:600}
    .dd-dictionary-table{width:100%}
  </style>
</head>
<body>
  <h3>Data Dictionary: ${model.database || 'database'}</h3>
  <div id="content"></div>
  <script>
    const model = ${JSON.stringify(model)};
    const container = document.getElementById('content');
    for (const table of model.tables) {
      const header = document.createElement('div');
      header.className = 'dd-table-header';
      header.textContent = table.name;
      container.appendChild(header);
      const tableEl = document.createElement('table');
      tableEl.className = 'table table-sm dd-dictionary-table mt-2';
      tableEl.innerHTML = '<thead><tr><th>Column</th><th>Type</th><th>PK</th><th>Unique</th><th>Nullable</th></tr></thead>';
      const tbody = document.createElement('tbody');
      for (const col of table.columns) {
        const tr = document.createElement('tr');
        tr.innerHTML = 
          '<td>'+col.name+'</td>'+
          '<td><code>'+col.type+'</code></td>'+
          '<td>'+(col.pk ? 'PK' : '')+'</td>'+
          '<td>'+(col.unique ? 'UQ' : '')+'</td>'+
          '<td>'+(col.nullable ? 'YES' : 'NO')+'</td>';
        tbody.appendChild(tr);
      }
      tableEl.appendChild(tbody);
      container.appendChild(tableEl);
    }
  </script>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data-dictionary.html';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function parseInput() {
    const text = inputEl.value;
    const fmt = detectFormat(text);
    let model;
    if (fmt === 'json') {
      model = JSON.parse(text);
    } else if (fmt === 'xml') {
      model = parseXmlToModel(text);
    } else {
      model = JSON.parse(text);
    }
    return normalizeModel(model);
  }

  renderBtn?.addEventListener('click', () => {
    try {
      const model = parseInput();
      renderDictionary(model);
      renderDiagram(model);
      jsonEl.textContent = JSON.stringify(model, null, 2);
      const jsonTab = document.querySelector('#dd-tab-json-tab');
      if (jsonTab) jsonTab.classList.add('text-success');
    } catch (err) {
      alert('Failed to parse/render: ' + (err?.message || err));
    }
  });

  clearBtn?.addEventListener('click', () => {
    inputEl.value = '';
    dictEl.innerHTML = '';
    jsonEl.textContent = '';
    d3.select(diagramSvg).selectAll('*').remove();
  });

  loadSampleBtn?.addEventListener('click', loadSample);

  fileEl?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    inputEl.value = text;
  });

  exportPdfBtn?.addEventListener('click', exportPdf);
  exportHtmlBtn?.addEventListener('click', () => {
    try {
      const model = parseInput();
      exportHtml(model);
    } catch (err) {
      alert('Please render a valid model first. ' + (err?.message || err));
    }
  });

})();

