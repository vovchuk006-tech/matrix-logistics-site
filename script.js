// ============ МАТРИЧНИЙ ДОЩ (стиль фільму "Матриця" з шарами глибини) ============
(function() {
  const canvas = document.getElementById('matrixRain');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Японська напівширока катакана + кілька цифр (як у фільмі)
  const SYMBOLS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';

  // Кольори (помаранчева гамма)
  const HEAD_RGB = '255, 255, 255';   // біла голова — інколи
  const BRIGHT_RGB = '255, 140, 80';  // яскраво-помаранчевий
  const MID_RGB = '255, 90, 31';      // основний помаранчевий
  const DIM_RGB = '180, 60, 20';      // тьмяний задній план

  const TRAIL_OPACITY = 0.06; // плавне затирання — довгі м'які хвости

  // Параметри шарів глибини:
  // back  — задній план: малі, повільні, бліді, без хвостів
  // mid   — середній план: середній розмір, нормальна яскравість
  // front — передній план: великі, яскраві, з білою головою
  const LAYERS = [
    { name: 'back',  fontSize: 12, speed: 0.0675,  brightness: 0.55, hasHead: false, count: 1.4 },
    { name: 'mid',   fontSize: 17, speed: 0.13125, brightness: 0.85, hasHead: true,  count: 0.9 },
    { name: 'front', fontSize: 24, speed: 0.20625, brightness: 1.0,  hasHead: true,  count: 0.35 }
  ];

  let drops = []; // масив усіх крапель (по всіх шарах)

  function pickSymbol() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }

  function createDrop(layer) {
    return {
      layer,
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      trailLen: 14 + Math.floor(Math.random() * 14), // 14..28 символів
      trail: [],
      // невелика варіація швидкості в межах шару
      speedMul: 0.85 + Math.random() * 0.3
    };
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    drops = [];
    // Створюємо краплі для кожного шару пропорційно ширині екрана
    LAYERS.forEach(layer => {
      const colsForLayer = Math.floor((canvas.width / layer.fontSize) * layer.count);
      for (let i = 0; i < colsForLayer; i++) {
        drops.push(createDrop(layer));
      }
    });
  }

  resize();
  window.addEventListener('resize', resize);

  let frameCount = 0;

  function draw() {
    // Якщо тема світла — дощ не показуємо, не марнуємо ресурси
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'light') {
      // очищаємо канвас на випадок переходу зі темної теми
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      requestAnimationFrame(draw);
      return;
    }

    // Плавне затирання — створює класичний слід Matrix
    ctx.fillStyle = `rgba(0, 0, 0, ${TRAIL_OPACITY})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textBaseline = 'top';

    for (let d = 0; d < drops.length; d++) {
      const drop = drops[d];
      const layer = drop.layer;
      const fontSize = layer.fontSize;

      ctx.font = `${fontSize}px "MS Gothic", "Hiragino Sans", monospace`;

      // Малюємо хвіст: trail[last] = голова (найнижче), trail[0] = найдальший
      for (let t = 0; t < drop.trail.length; t++) {
        const distFromHead = drop.trail.length - 1 - t;
        const symY = drop.y - distFromHead * fontSize;
        if (symY < -fontSize || symY > canvas.height) continue;

        const ratio = distFromHead / Math.max(1, drop.trailLen - 1);

        let colorRgb, alpha;
        if (distFromHead === 0 && layer.hasHead && Math.random() < 0.3) {
          // ~30% часу голова мерехтить білим (як у фільмі)
          colorRgb = HEAD_RGB;
          alpha = layer.brightness;
        } else if (distFromHead === 0 && layer.hasHead) {
          // Голова — яскраво-помаранчева
          colorRgb = BRIGHT_RGB;
          alpha = layer.brightness;
        } else if (ratio < 0.3) {
          // Передня частина хвоста — основний помаранчевий
          colorRgb = MID_RGB;
          alpha = layer.brightness * (1 - ratio * 0.3);
        } else {
          // Хвіст — затухає до DIM
          colorRgb = ratio < 0.6 ? MID_RGB : DIM_RGB;
          alpha = layer.brightness * Math.max(0, 1 - ratio * 1.1);
        }

        ctx.fillStyle = `rgba(${colorRgb}, ${alpha})`;
        ctx.fillText(drop.trail[t], drop.x, symY);
      }

      // Оновлення позиції
      const stepInterval = layer.name === 'back' ? 4 : (layer.name === 'mid' ? 3 : 2);
      if (frameCount % stepInterval === 0) {
        drop.y += layer.speed * layer.fontSize * drop.speedMul;

        // Додаємо новий символ у голову з певною частотою
        drop.trail.push(pickSymbol());
        if (drop.trail.length > drop.trailLen) drop.trail.shift();

        // Мерехтіння символів у хвості
        if (Math.random() < 0.1 && drop.trail.length > 1) {
          const idx = Math.floor(Math.random() * (drop.trail.length - 1));
          drop.trail[idx] = pickSymbol();
        }

        // Респаун коли крапля повністю вийшла знизу
        if (drop.y - drop.trail.length * fontSize > canvas.height) {
          drop.y = -Math.random() * 100;
          drop.x = Math.random() * canvas.width;
          drop.trail = [];
          drop.trailLen = 14 + Math.floor(Math.random() * 14);
          drop.speedMul = 0.85 + Math.random() * 0.3;
        }
      }
    }

    frameCount++;
    requestAnimationFrame(draw);
  }

  draw();
})();

// ============ ПЕРЕМИКАЧ ТЕМИ ============
(function() {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  // Завантажуємо збережену тему (за замовчуванням — світла)
  let savedTheme = 'light';
  try {
    savedTheme = localStorage.getItem('matrix-theme') || 'light';
  } catch(e) {}
  document.documentElement.setAttribute('data-theme', savedTheme);

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    try {
      localStorage.setItem('matrix-theme', newTheme);
    } catch(e) {}
  });
})();

// ============ ПАРАЛЛАКС СВІТІНЬ ============
(function() {
  const glowTop = document.querySelector('.glow-top');
  const glowBottom = document.querySelector('.glow-bottom');
  if (!glowTop || !glowBottom) return;

  const TRAVEL_DISTANCE = 800;

  let ticking = false;
  function update() {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? scrollY / maxScroll : 0;

    const topOffset = -progress * TRAVEL_DISTANCE;
    glowTop.style.transform = `translate3d(0, ${topOffset}px, 0)`;

    const bottomOffset = -progress * TRAVEL_DISTANCE;
    glowBottom.style.transform = `translate3d(0, ${bottomOffset}px, 0)`;

    ticking = false;
  }

  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  update();
})();

// ============ ТАБИ "ЯК ПРАЦЮЄ" ============
document.querySelectorAll('.step').forEach(step => {
  step.addEventListener('click', () => {
    const num = step.dataset.step;

    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    step.classList.add('active');

    document.querySelectorAll('.how-pane').forEach(p => p.classList.remove('active'));
    document.querySelector(`.how-pane[data-pane="${num}"]`).classList.add('active');
  });
});

// ============ КАЛЬКУЛЯТОР ============
function calculatePrice() {
  const from = document.getElementById('fromCountry').value;
  const to = document.getElementById('toCountry').value;
  const length = parseFloat(document.getElementById('length').value) || 0;
  const width = parseFloat(document.getElementById('width').value) || 0;
  const height = parseFloat(document.getElementById('height').value) || 0;
  const weight = parseFloat(document.getElementById('weight').value) || 0;
  const quantity = parseInt(document.getElementById('quantity').value) || 1;

  const result = document.getElementById('calcResult');

  if (!from || !to) {
    result.innerHTML = '<div class="price" style="color:#ff6b6b">⚠ Оберіть країни</div><div class="desc">Вкажіть звідки і куди доставити</div>';
    result.classList.add('show');
    return;
  }

  if (!weight || !length || !width || !height) {
    result.innerHTML = '<div class="price" style="color:#ff6b6b">⚠ Заповніть розміри</div><div class="desc">Потрібні всі параметри: довжина, ширина, висота, вага</div>';
    result.classList.add('show');
    return;
  }

  const volumeWeight = (length * width * height) / 5000;
  const calcWeight = Math.max(weight, volumeWeight);
  const pricePerKg = 4.5;
  const totalPrice = calcWeight * pricePerKg * quantity;
  const days = '10-15';

  result.innerHTML = `
    <div class="price">≈ $${totalPrice.toFixed(2)}</div>
    <div class="desc">
      Розрахункова вага: <b>${calcWeight.toFixed(2)} кг</b> ·
      Термін: <b>${days} днів</b><br>
      <small style="opacity:0.7">* Орієнтовна вартість. Менеджер уточнить точну ціну</small>
    </div>
  `;
  result.classList.add('show');

  setTimeout(() => {
    result.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}

// ============ ВІДПРАВКА ФОРМИ ============
function submitForm(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    name: form.name.value,
    phone: form.phone.value,
    email: form.email.value,
    comment: form.comment.value
  };

  console.log('Заявка надіслана:', data);

  const success = document.getElementById('formSuccess');
  success.classList.add('show');
  form.reset();
  setTimeout(() => success.classList.remove('show'), 5000);
}

// ============ МОДАЛКА КОНТАКТІВ ============
function openContactModal(panel) {
  const modal = document.getElementById('contactModal');
  if (!modal) return;
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  // Початкова панель: 'callback' — одразу форма заявки, інакше вибір месенджера
  switchContactPanel(panel === 'callback' ? 'callback' : 'choose');
}

function closeContactModal(e) {
  // Якщо передали event — закриваємо тільки якщо клік по фоновому шару (не по box)
  if (e && e.target && e.currentTarget && e.target !== e.currentTarget) return;
  const modal = document.getElementById('contactModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  document.body.style.overflow = '';
}

// Закриття по Esc
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeContactModal();
});

// Перемикання панелей у модалці контактів (choose ↔ callback)
function switchContactPanel(panelName) {
  const panels = document.querySelectorAll('.contact-modal__panel');
  panels.forEach(p => {
    if (p.dataset.panel === panelName) {
      p.classList.add('is-active');
    } else {
      p.classList.remove('is-active');
    }
  });
}

// Відправка форми "Замовити дзвінок"
function submitCallback(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    name: form.name.value,
    phone: form.phone.value,
    email: form.email.value || null,
    comment: form.comment.value || null
  };
  console.log('Замовлення дзвінка:', data);

  const success = document.getElementById('callbackSuccess');
  success.classList.add('show');
  form.reset();

  // Через 2.5 сек закриваємо модалку і повертаємо панель вибору
  setTimeout(() => {
    closeContactModal();
    setTimeout(() => {
      success.classList.remove('show');
      switchContactPanel('choose');
    }, 300);
  }, 2500);
}

// При закритті модалки — повертати панель вибору
(function() {
  const modal = document.getElementById('contactModal');
  if (!modal) return;
  // Спостерігаємо закриття
  new MutationObserver(() => {
    if (!modal.classList.contains('is-open')) {
      setTimeout(() => switchContactPanel('choose'), 300);
    }
  }).observe(modal, { attributes: true, attributeFilter: ['class'] });
})();

// ============ МАСКА ДЛЯ НОМЕРА ТЕЛЕФОНУ (+380 XX XXX XX XX) ============
(function() {
  const PREFIX = '+380 ';

  function formatUkraineNumber(rawDigits) {
    // rawDigits — лише цифри, без 380 на початку
    const d = rawDigits.slice(0, 9); // максимум 9 цифр після +380
    let result = PREFIX;
    if (d.length > 0) result += d.slice(0, 2);
    if (d.length > 2) result += ' ' + d.slice(2, 5);
    if (d.length > 5) result += ' ' + d.slice(5, 7);
    if (d.length > 7) result += ' ' + d.slice(7, 9);
    return result;
  }

  function extractDigits(value) {
    let digits = value.replace(/\D/g, ''); // тільки цифри
    // Прибираємо ведучі 380, якщо є
    if (digits.startsWith('380')) digits = digits.slice(3);
    else if (digits.startsWith('80')) digits = digits.slice(2);
    else if (digits.startsWith('0')) digits = digits.slice(1);
    return digits;
  }

  function attachPhoneMask(input) {
    if (!input || input.dataset.phoneMaskAttached) return;
    input.dataset.phoneMaskAttached = '1';

    // При фокусі — якщо порожнє, ставимо префікс
    input.addEventListener('focus', () => {
      if (!input.value || input.value.length < PREFIX.length) {
        input.value = PREFIX;
        // Курсор у кінець
        setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
      }
    });

    // При втраті фокусу — якщо там тільки префікс, очищаємо
    input.addEventListener('blur', () => {
      if (input.value === PREFIX) input.value = '';
    });

    // Форматування при вводі
    input.addEventListener('input', () => {
      const digits = extractDigits(input.value);
      input.value = formatUkraineNumber(digits);
      // Курсор завжди в кінці
      setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
    });

    // Не дати видалити префікс через Backspace
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        const pos = input.selectionStart;
        if (pos <= PREFIX.length && input.selectionEnd <= PREFIX.length) {
          e.preventDefault();
        }
      }
    });
  }

  // Прикріплюємо маску до всіх tel-полів зі спеціальним атрибутом, плюс конкретно до форми callback
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.callback-form input[name="phone"], input[data-mask="ua-phone"]').forEach(attachPhoneMask);
  });
})();

// ============ КАРТКИ ТАРИФІВ ============
// Деталі розкриваються при hover (через CSS). Клік деінде по картці не повинен
// стрибати по якорю (картка — це <a href="#">).
document.querySelectorAll('.tariff-card').forEach(card => {
  card.addEventListener('click', (e) => e.preventDefault());
});
