const processBtn = document.getElementById('processBtn');
const fileInput = document.getElementById('fileInput');
const fromInput = document.getElementById('fromInput');
const toInput = document.getElementById('toInput');
const results = document.getElementById('results');
const natashaTotal = document.getElementById('totalForNatasha');
const maximTotal = document.getElementById('totalForMaxim');
const clientTotal = document.getElementById('totalForClient');

let currentFileName = '';
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) currentFileName = file.name;
});

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

  let totalService = 0;
  let totalNatasha = 0;
  let index = 1;
  const rows = [];

  for (let i = 0; i < pdf.numPages; i++) {
    if (i < from || i >= to) continue;

    const page = await pdf.getPage(i + 1);
    const content = await page.getTextContent();
    const lines = content.items.map(item => item.str.trim()).filter(Boolean);
    const flatText = content.items.map(item => item.str).join('\n');

    // Трек-номер
    let track = 'N/A';
    for (const line of lines) {
      const cleaned = line.replace(/\s+/g, '');
      if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(cleaned)) {
        track = cleaned;
        break;
      }
    }

    // Вага
    let weight = 0;
    const weightRegex = /(\d+\.\d+)\s*kg/i;
    const match = flatText.match(weightRegex);
    if (match) {
      weight = parseFloat(match[1]);
    } else {
      console.warn(`⚠️ Вага не знайдена (сторінка ${i + 1})`);
    }

    const weightG = Math.round(weight * 1000);
    const service = weightG <= 250 ? 20 : weightG <= 500 ? 150 : weightG <= 1000 ? 200 : 250;
    const natasha = weightG <= 299 ? 0 : weightG <= 549 ? 50 : weightG <= 1049 ? 100 : 150;

    totalService += service;
    totalNatasha += natasha;

    rows.push({ track, weight, service, natasha });

    table.querySelector('tbody').innerHTML += `
      <tr>
        <td>${index++}</td>
        <td>${track}</td>
        <td>${weight.toFixed(3)}</td>
        <td>${service}</td>
        <td>${natasha}</td>
      </tr>
    `;
  }

  // === Ввод суми за пошту ===
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
    msg.textContent = `За пошту: ${isNaN(post) ? '—' : post} грн\n` +
                      `За послуги: ${totalService} грн\n` +
                      `Всього: ${isNaN(post) ? '—' : post + totalService} грн`;
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
    updateClientSum();
  };

  // === Кнопка видалення ===
  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-danger btn-sm mt-2 ms-2';
  delBtn.textContent = 'Видалити клієнта';
  delBtn.onclick = () => {
    results.removeChild(container);
    updateClientSum();
    updateMaxim();
    updateNatasha();
  };

  // === Название файла ===
  const title = document.createElement('h5');
  title.className = 'fw-bold mt-3';
  title.textContent = `Файл: ${currentFileName}`;

  // === Подсчёт для Максима ===
  const smallCount = rows.filter(r => r.weight < 0.25).length;
  const bigCount = rows.filter(r => r.weight >= 0.25).length;
  const totalMaxim = smallCount * 10 + bigCount * 25;

  const maximBlock = document.createElement('div');
  maximBlock.className = 'mt-2';

  const maximText = `Маленьких посилок: ${smallCount} × 10 грн = ${smallCount * 10} грн\n` +
                    `Великих посилок: ${bigCount} × 25 грн = ${bigCount * 25} грн\n` +
                    `Усього Максиму: ${totalMaxim} грн`;

  const maximMsg = document.createElement('pre');
  maximMsg.textContent = maximText;

  const maximBtn = document.createElement('button');
  maximBtn.className = 'btn btn-outline-primary btn-sm mb-2';
  maximBtn.textContent = 'Скопіювати Максиму';
  maximBtn.onclick = () => {
    navigator.clipboard.writeText(maximText);
    maximBtn.textContent = 'Скопійовано!';
    setTimeout(() => maximBtn.textContent = 'Скопіювати Максиму', 1500);
  };

  maximBlock.appendChild(maximMsg);
  maximBlock.appendChild(maximBtn);

  container.appendChild(title);
  container.appendChild(table);
  container.appendChild(inputGroup);
  container.appendChild(msg);
  container.appendChild(copyBtn);
  container.appendChild(delBtn);
  container.appendChild(maximBlock);
  results.appendChild(container);

  updateNatasha();
  updateClientSum();
  updateMaxim();
});

// === Оновлення сум ===
function updateNatasha() {
  let total = 0;
  document.querySelectorAll('.client-block').forEach(block => {
    const cells = block.querySelectorAll('table tbody tr td:last-child');
    cells.forEach(cell => total += parseInt(cell.textContent));
  });
  natashaTotal.textContent = total;
}

function updateClientSum() {
  let total = 0;
  document.querySelectorAll('.client-block').forEach(block => {
    const input = block.querySelector('input');
    const post = parseFloat(input?.value);
    const cells = block.querySelectorAll('table tbody tr td:nth-child(4)');
    let service = 0;
    cells.forEach(c => service += parseInt(c.textContent));
    if (!isNaN(post)) total += post + service;
  });
  clientTotal.textContent = total;
}

function updateMaxim() {
  let small = 0, big = 0;
  document.querySelectorAll('.client-block').forEach(block => {
    const rows = block.querySelectorAll('table tbody tr');
    rows.forEach(row => {
      const weight = parseFloat(row.children[2].textContent);
      if (weight < 0.25) small++;
      else big++;
    });
  });
  const sum = small * 10 + big * 25;
  maximTotal.textContent = sum;
}
