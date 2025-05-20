// ===== С НУЛЯ: ФИНАЛЬНАЯ ВЕРСИЯ script.js (СКЛЕЙКА ТЕКСТА) =====

const processBtn = document.getElementById('processBtn');
const fileInput = document.getElementById('fileInput');
const fromInput = document.getElementById('fromInput');
const toInput = document.getElementById('toInput');
const results = document.getElementById('results');
const natashaTotal = document.getElementById('totalForNatasha');
const maximTotal = document.getElementById('totalForMaxim');
const clientTotal = document.getElementById('totalForClient');
const maximBlock = document.getElementById('maximBlock');

let totalClientSum = 0;
let totalMaximSum = 0;
let smallGlobal = 0;
let bigGlobal = 0;

processBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) return alert('Оберіть PDF-файл');

  const from = parseInt(fromInput.value) - 1 || 0;
  const to = parseInt(toInput.value) || Infinity;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const container = document.createElement('div');
  container.className = 'client-block';

  const table = document.createElement('table');
  table.className = 'table table-bordered';
  table.innerHTML = `
    <thead class="table-dark">
      <tr><th>#</th><th>Трек</th><th>Вага (кг)</th><th>Послуги</th><th>Наташі</th></tr>
    </thead><tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  let index = 1;
  let totalService = 0;
  let totalNatasha = 0;
  let rows = [];

  for (let i = 0; i < pdf.numPages; i++) {
    if (i < from || i >= to) continue;

    const page = await pdf.getPage(i + 1);
    const content = await page.getTextContent();
    const lines = content.items.map(item => item.str.trim()).filter(Boolean);
    const flatText = content.items.map(item => item.str).join('\n');

    let track = 'N/A';
    for (const line of lines) {
      const cleaned = line.replace(/\s+/g, '');
      if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(cleaned)) {
        track = cleaned;
        break;
      }
    }

    let weight = 0;
    const weightRegex = /(\d+\.\d+)\s*kg/;
    const match = flatText.match(weightRegex);
    if (match) {
      weight = parseFloat(match[1]);
    }

    const weightG = Math.round(weight * 1000);
    const service = weightG <= 250 ? 20 : weightG <= 500 ? 150 : weightG <= 1000 ? 200 : 250;
    const natasha = weightG <= 299 ? 0 : weightG <= 549 ? 50 : weightG <= 1049 ? 100 : 150;

    rows.push({ weight, service });

    totalService += service;
    totalNatasha += natasha;

    tbody.innerHTML += `
      <tr>
        <td>${index++}</td>
        <td>${track}</td>
        <td>${weight.toFixed(3)}</td>
        <td>${service}</td>
        <td>${natasha}</td>
      </tr>
    `;
  }

  natashaTotal.textContent = parseInt(natashaTotal.textContent) + totalNatasha;

  const inputGroup = document.createElement('div');
  inputGroup.className = 'mt-2';
  inputGroup.innerHTML = `
    <label class="form-label fw-bold">Сума за пошту (грн):</label>
    <input type="number" class="form-control w-50" required>
  `;
  const postInput = inputGroup.querySelector('input');

  const msg = document.createElement('pre');
  msg.className = 'bg-light p-2 mt-2';

  const updateMsg = () => {
    const post = parseFloat(postInput.value);
    const total = isNaN(post) ? 0 : post + totalService;
    msg.textContent = `За пошту: ${isNaN(post) ? '—' : post} грн\n` +
                      `За послуги: ${totalService} грн\n` +
                      `Всього: ${isNaN(post) ? '—' : total} грн`;

    const prev = container.dataset.clientSum ? parseFloat(container.dataset.clientSum) : 0;
    totalClientSum -= prev;
    if (!isNaN(total)) {
      totalClientSum += total;
      container.dataset.clientSum = total;
    }
    clientTotal.textContent = totalClientSum;
  };

  postInput.addEventListener('input', updateMsg);
  updateMsg();

  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn btn-outline-primary btn-sm mt-2';
  copyBtn.textContent = 'Скопіювати повідомлення';
  copyBtn.onclick = () => {
    if (postInput.value === '') {
      postInput.classList.add('is-invalid');
      postInput.focus();
      return;
    }
    navigator.clipboard.writeText(msg.textContent);
    copyBtn.textContent = 'Скопійовано!';
    setTimeout(() => copyBtn.textContent = 'Скопіювати повідомлення', 1500);
  };

  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-danger btn-sm mt-2 ms-2';
  delBtn.textContent = 'Видалити клієнта';
  delBtn.onclick = () => {
    results.removeChild(container);
    natashaTotal.textContent = parseInt(natashaTotal.textContent) - totalNatasha;
    const removed = parseFloat(container.dataset.clientSum) || 0;
    totalClientSum -= removed;
    clientTotal.textContent = totalClientSum;

    totalMaximSum -= parseInt(container.dataset.maximSum || 0);
    maximTotal.textContent = totalMaximSum;

    smallGlobal -= parseInt(container.dataset.small || 0);
    bigGlobal -= parseInt(container.dataset.big || 0);
    updateMaximBlock();
  };

  container.dataset.clientSum = 0;
  container.dataset.maximSum = 0;
  container.dataset.small = 0;
  container.dataset.big = 0;

  container.appendChild(table);
  container.appendChild(inputGroup);
  container.appendChild(msg);
  container.appendChild(copyBtn);
  container.appendChild(delBtn);
  results.appendChild(container);

  // Максим ===
  let small = 0, big = 0;
  for (const r of rows) {
    if (r.weight < 0.25) small++;
    else big++;
  }
  const totalMaxim = small * 10 + big * 25;
  totalMaximSum += totalMaxim;
  maximTotal.textContent = totalMaximSum;

  smallGlobal += small;
  bigGlobal += big;

  container.dataset.maximSum = totalMaxim;
  container.dataset.small = small;
  container.dataset.big = big;

  updateMaximBlock();
});

function updateMaximBlock() {
  maximBlock.innerHTML = '';
  const total = smallGlobal * 10 + bigGlobal * 25;
  const text = `Маленьких посилок: ${smallGlobal} × 10 грн = ${smallGlobal * 10} грн\n` +
               `Великих посилок: ${bigGlobal} × 25 грн = ${bigGlobal * 25} грн\n` +
               `Усього Максиму: ${total} грн`;

  const msg = document.createElement('pre');
  msg.textContent = text;

  const btn = document.createElement('button');
  btn.className = 'btn btn-outline-primary btn-sm mt-2';
  btn.textContent = 'Скопіювати Максиму';
  btn.onclick = () => {
    navigator.clipboard.writeText(text);
    btn.textContent = 'Скопійовано Максиму';
    setTimeout(() => btn.textContent = 'Скопіювати Максиму', 1500);
  };

  maximBlock.appendChild(msg);
  maximBlock.appendChild(btn);
}
