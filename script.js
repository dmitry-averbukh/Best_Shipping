// ===== ФИНАЛЬНАЯ ВЕРСИЯ script.js с валидацией полей та оновленням заробітку =====

const processBtn = document.getElementById('processBtn');
const fileInput = document.getElementById('fileInput');
const fromInput = document.getElementById('fromInput');
const toInput = document.getElementById('toInput');
const results = document.getElementById('results');
const natashaTotal = document.getElementById('totalForNatasha');
const customNatasha80 = document.getElementById('customNatasha80');
const maximTotal = document.getElementById('totalForMaxim');
const clientTotal = document.getElementById('totalForClient');
const maximBlock = document.getElementById('maximBlock');
const finalProfit = document.getElementById('finalProfit');
const finalProfitText = document.getElementById('finalProfitText');
const finalProfitCard = document.getElementById('finalProfitCard');

let totalClientSum = 0;
let totalMaximSum = 0;
let smallGlobal = 0;
let bigGlobal = 0;
let prevGlobal = 0;

function updateFinalProfit() {
    const natashaSum = parseFloat(natashaTotal.textContent) || 0;
    const natasha80Sum = parseFloat(customNatasha80.value) || 0;
    const maximSum = parseFloat(maximTotal.textContent) || 0;

    let totalPost = 0;
    let allFilled = true;
    document.querySelectorAll('.client-block input[type="number"]').forEach(input => {
        if (input && input.previousElementSibling?.textContent?.includes('Сума за пошту')) {
            const val = parseFloat(input.value);
            if (isNaN(val)) {
                input.classList.add('is-invalid');
                allFilled = false;
            } else {
                input.classList.remove('is-invalid');
                totalPost += val;
            }
        }
    });

    const totalClient = parseFloat(clientTotal.textContent) || 0;
    const profit = (totalClient - natasha80Sum - maximSum - totalPost) / 2;
    finalProfit.textContent = Math.round(profit);

    if (allFilled) {
        finalProfitCard.classList.remove('danger');
        finalProfitCard.classList.add('success');
        finalProfitText.classList.remove('highlight-danger');
        finalProfitText.classList.add('highlight-success');
    } else {
        finalProfitCard.classList.remove('success');
        finalProfitCard.classList.add('danger');
        finalProfitText.classList.remove('highlight-success');
        finalProfitText.classList.add('highlight-danger');
    }
}

customNatasha80.addEventListener('input', updateFinalProfit);

function updateMaximBlock() {
    const total = smallGlobal * 10 + bigGlobal * 25 + prevGlobal * 20;
    maximTotal.textContent = totalMaximSum = total;

    maximBlock.innerHTML = '';
    const text = `Маленьких посилок: ${smallGlobal} × 10 грн = ${smallGlobal * 10} грн\n` +
        `Великих посилок: ${bigGlobal} × 25 грн = ${bigGlobal * 25} грн\n` +
        `Кількість перевищення ваги: ${prevGlobal} × 20 грн = ${prevGlobal * 20} грн\n` +
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
    updateFinalProfit();
}

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
        if (match) weight = parseFloat(match[1]);

        const weightG = Math.round(weight * 1000);
        const service = weightG <= 250 ? 20 : weightG <= 500 ? 150 : weightG <= 1000 ? 200 : 250;
        const natasha = weightG <= 299 ? 0 : weightG <= 549 ? 50 : weightG <= 1049 ? 100 : 150;

        rows.push({ weight, service });
        totalService += service;
        totalNatasha += natasha;

        tbody.innerHTML += `
      <tr><td>${index++}</td><td>${track}</td><td>${weight.toFixed(3)}</td><td>${service}</td><td>${natasha}</td></tr>
    `;
    }

    natashaTotal.textContent = parseInt(natashaTotal.textContent) + totalNatasha;
    customNatasha80.value = Math.round(parseInt(natashaTotal.textContent) * 0.8);

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
        updateFinalProfit();
    };

    postInput.addEventListener('input', updateMsg);
    updateMsg();

    const overweightGroup = document.createElement('div');
    overweightGroup.className = 'mt-2';
    overweightGroup.innerHTML = `
    <label class="form-label fw-bold">Кількість перевищення ваги:</label>
    <input type="number" min="0" value="0" class="form-control w-50">
  `;
    const overweightInput = overweightGroup.querySelector('input');

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
        customNatasha80.value = Math.round(parseInt(natashaTotal.textContent) * 0.8);
        totalClientSum -= parseFloat(container.dataset.clientSum || 0);
        clientTotal.textContent = totalClientSum;
        totalMaximSum -= parseInt(container.dataset.maximSum || 0);
        maximTotal.textContent = totalMaximSum;
        smallGlobal -= parseInt(container.dataset.small || 0);
        bigGlobal -= parseInt(container.dataset.big || 0);
        prevGlobal -= parseInt(container.dataset.prevCount || 0);
        updateMaximBlock();
    };

    container.dataset.clientSum = 0;
    container.dataset.maximSum = 0;
    container.dataset.small = 0;
    container.dataset.big = 0;
    container.dataset.prevCount = 0;

    container.appendChild(table);
    container.appendChild(overweightGroup);
    container.appendChild(inputGroup);
    container.appendChild(msg);
    container.appendChild(copyBtn);
    container.appendChild(delBtn);
    results.appendChild(container);

    overweightInput.addEventListener('input', () => {
        const count = parseInt(overweightInput.value) || 0;
        const prevCount = parseInt(container.dataset.prevCount || 0);
        prevGlobal += count - prevCount;
        container.dataset.prevCount = count;
        updateMaximBlock();
    });

    let small = 0, big = 0;
    for (const r of rows) {
        if (r.weight <= 0.25) small++;
        else big++;
    }
    const totalMaxim = small * 10 + big * 25;
    smallGlobal += small;
    bigGlobal += big;

    container.dataset.maximSum = totalMaxim;
    container.dataset.small = small;
    container.dataset.big = big;

    updateMaximBlock();
});
