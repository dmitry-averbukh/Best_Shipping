// ===== С НУЛЯ: ФИНАЛЬНАЯ ВЕРСИЯ script.js (СКЛЕЙКА ТЕКСТА) =====

const processBtn = document.getElementById('processBtn');
const fileInput = document.getElementById('fileInput');
const fromInput = document.getElementById('fromInput');
const toInput = document.getElementById('toInput');
const results = document.getElementById('results');
const natashaTotal = document.getElementById('totalForNatasha');
const clientTotal = document.getElementById('totalForClients'); // Добавлено
const maximTotal = document.getElementById('totalForMaxim'); // Добавлено

let grandTotal = 0; // Общая сумма по клиентам
let totalSmall = 0; // Маленькие посылки для Максима
let totalBig = 0; // Большие посылки для Максима

processBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];

    let currentFileName = '';
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) currentFileName = file.name;
    });

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
    let totalClientSum = 0;
    let index = 1;
    const rows = [];

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
        } else {
            console.warn(`⚠️ Вага не знайдена (сторінка ${i + 1})`);
        }

        const weightG = Math.round(weight * 1000);
        const service = weightG <= 250 ? 20 : weightG <= 500 ? 150 : weightG <= 1000 ? 200 : 250;
        const natasha = weightG <= 299 ? 0 : weightG <= 549 ? 50 : weightG <= 1049 ? 100 : 150;

        rows.push({ weight, service });

        table.querySelector('tbody').innerHTML += `
          <tr>
            <td>${index++}</td>
            <td>${track}</td>
            <td>${weight.toFixed(3)}</td>
            <td>${service}</td>
            <td>${natasha}</td>
          </tr>
        `;

        totalService += service;
        totalNatasha += natasha;
    }

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
        const total = isNaN(post) ? '—' : post + totalService;
        msg.textContent = `За пошту: ${isNaN(post) ? '—' : post} грн\n` +
            `За послуги: ${totalService} грн\n` +
            `Всього: ${total} грн`;
        if (!isNaN(post)) {
            grandTotal += post + totalService;
            clientTotal.textContent = grandTotal;
        }
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

    // === Подсчёт для Максима ===
    let smallCount = 0;
    let bigCount = 0;

    rows.forEach(row => {
        if (row.weight < 0.25) smallCount++;
        else bigCount++;
    });

    const totalMaxim = (smallCount * 10) + (bigCount * 25);
    totalSmall += smallCount;
    totalBig += bigCount;
    maximTotal.textContent = (totalSmall * 10 + totalBig * 25);

    const maximBlock = document.createElement('div');
    maximBlock.className = 'mt-2';
    const maximText = `Маленьких посилок: ${smallCount} × 10 грн = ${smallCount * 10} грн\nВеликих посилок: ${bigCount} × 25 грн = ${bigCount * 25} грн\nУсього Максиму: ${totalMaxim} грн`;

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

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger btn-sm mt-2 ms-2';
    delBtn.textContent = 'Видалити клієнта';
    delBtn.onclick = () => {
        results.removeChild(container);
        natashaTotal.textContent = parseInt(natashaTotal.textContent) - totalNatasha;
        clientTotal.textContent = grandTotal -= totalService + parseFloat(postInput.value);
        maximTotal.textContent = (totalSmall -= smallCount) * 10 + (totalBig -= bigCount) * 25;
    };

    const title = document.createElement('h5');
    title.className = 'fw-bold mt-3';
    title.textContent = `Файл: ${currentFileName}`;

    container.appendChild(title);
    container.appendChild(table);
    container.appendChild(inputGroup);
    container.appendChild(msg);
    container.appendChild(copyBtn);
    container.appendChild(maximBlock);
    container.appendChild(delBtn);
    results.appendChild(container);

    natashaTotal.textContent = parseInt(natashaTotal.textContent) + totalNatasha;
});
