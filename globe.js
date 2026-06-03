/* ============================================================
   3D ГЛОБУС (Three.js) — нічна Земля, маркери міст, літаки
   Потребує window.THREE (підключається з CDN перед цим файлом)
   ============================================================ */
(function () {
  if (typeof THREE === 'undefined') {
    console.warn('Three.js не завантажився — глобус не побудовано');
    return;
  }

  const canvas = document.getElementById('globeCanvas');
  const wrap = document.getElementById('worldMap');
  if (!canvas || !wrap) return;

  // ---------- Дані міст ----------
  const CITIES = [
    { name: 'Київ',      lat: 50.4501, lng: 30.5234, accent: false, dx: 0,   dy: 0 },
    { name: 'Пекін',     lat: 39.9042, lng: 116.4074, accent: false, dx: 0,   dy: 0 },
    { name: 'Гуанчжоу',  lat: 23.1291, lng: 113.2644, accent: false, dx: -34, dy: -6 },
    { name: 'Шеньчжень', lat: 22.5431, lng: 114.0579, accent: true,  dx: 44,  dy: -16 },
    { name: 'Гонконг',   lat: 22.3193, lng: 114.1694, accent: false, dx: 50,  dy: 26 }
  ];
  // Маршрути (індекси міст): Київ→Пекін, Київ→Шеньчжень

  const R = 1;                 // радіус Землі

  // ---------- Сцена / камера / рендерер ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 3.35);

  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));
  renderer.setClearColor(0x000000, 0);
  if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;

  // Група, що обертається (Земля + маркери + літаки разом)
  const globe = new THREE.Group();
  globe.position.y = 0;          // куля по центру (рука тримає її знизу)
  scene.add(globe);
  // Початковий поворот: Євразія дивиться на камеру
  globe.rotation.y = -1.95;
  globe.rotation.x = 0.25;

  // ---------- lat/lng → 3D ----------
  function latLngToVec3(lat, lng, radius) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lng + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
       radius * Math.cos(phi),
       radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  // ---------- Земля ----------
  const earthGeo = new THREE.SphereGeometry(R, 192, 192);
  // Чорний прозорий — невидимий поки тeкстура не загрузилась (не показуємо синю заглушку)
  const earthMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 });
  const earth = new THREE.Mesh(earthGeo, earthMat);
  globe.add(earth);

  // Плавна поява кулі коли текстура готова
  function fadeInEarth() {
    if (earthMat.opacity < 1) {
      earthMat.opacity = Math.min(1, earthMat.opacity + 0.05);
      requestAnimationFrame(fadeInEarth);
    }
  }

  // Текстура нічної Землі: пробуємо CDN (легші — першими), інакше — процедурна
  const texLoader = new THREE.TextureLoader();
  texLoader.setCrossOrigin('anonymous');
  const TEX_URLS = [
    'https://unpkg.com/three-globe/example/img/earth-night.jpg',                      // ~2K, легка — швидко
    'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg',           // дзеркало
    'https://www.solarsystemscope.com/textures/download/8k_earth_nightmap.jpg',       // 8K — найкраща якість
    'https://cdn.jsdelivr.net/gh/turban/webgl-earth@master/images/5_night_16k.jpg'    // 16K
  ];
  function tryTexture(i) {
    if (i >= TEX_URLS.length) {
      earthMat.map = makeProceduralTexture();
      earthMat.color.set(0xffffff);
      earthMat.needsUpdate = true;
      fadeInEarth();
      return;
    }
    texLoader.load(
      TEX_URLS[i],
      (tex) => {
        if (tex.anisotropy !== undefined) tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        tex.needsUpdate = true;
        earthMat.map = tex;
        earthMat.color.set(0xffffff);
        earthMat.needsUpdate = true;
        fadeInEarth();
      },
      undefined,
      () => tryTexture(i + 1)
    );
  }
  tryTexture(0);


  // Запасна процедурна текстура (темно-синя + помаранчеві "вогні")
  function makeProceduralTexture() {
    const c = document.createElement('canvas');
    c.width = 2048; c.height = 1024;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, c.height);
    grd.addColorStop(0, '#0a1428');
    grd.addColorStop(0.5, '#0d1d3a');
    grd.addColorStop(1, '#0a1428');
    g.fillStyle = grd; g.fillRect(0, 0, c.width, c.height);
    // кластери вогнів
    for (let k = 0; k < 70; k++) {
      const cx = Math.random() * c.width;
      const cy = (0.2 + Math.random() * 0.6) * c.height;
      const n = 30 + Math.random() * 80;
      for (let j = 0; j < n; j++) {
        const x = cx + (Math.random() - 0.5) * 120;
        const y = cy + (Math.random() - 0.5) * 80;
        const r = Math.random() * 1.6 + 0.4;
        const a = Math.random() * 0.6 + 0.2;
        g.fillStyle = `rgba(255,${140 + Math.random() * 70 | 0},${40 + Math.random() * 40 | 0},${a})`;
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
    }
    const t = new THREE.Texture(c);
    t.needsUpdate = true;
    return t;
  }

  // ---------- Атмосфера (Fresnel halo) ----------
  const atmoGeo = new THREE.SphereGeometry(R * 1.06, 64, 64);
  const atmoMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(0x3b82f6) } },
    vertexShader: `
      varying vec3 vN;
      void main(){
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }`,
    fragmentShader: `
      varying vec3 vN;
      uniform vec3 uColor;
      void main(){
        float intensity = pow(max(0.0, 0.62 - dot(vN, vec3(0,0,1.0))), 2.2);
        gl_FragColor = vec4(uColor, 1.0) * intensity;
      }`
  });
  const atmo = new THREE.Mesh(atmoGeo, atmoMat);
  globe.add(atmo);

  // ---------- Маркери міст + HTML підписи ----------
  const labels = [];
  CITIES.forEach((city) => {
    const v = latLngToVec3(city.lat, city.lng, R * 1.01);
    const color = city.accent ? 0xff5a1f : 0xffffff;

    const dotGeo = new THREE.SphereGeometry(0.007, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.copy(v);
    globe.add(dot);

    // ореол
    const haloGeo = new THREE.SphereGeometry(0.014, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(v);
    globe.add(halo);

    // HTML-підпис
    const el = document.createElement('div');
    el.className = 'globe-label' + (city.accent ? ' accent' : '');
    el.textContent = city.name;
    wrap.appendChild(el);
    labels.push({ el, pos: v.clone(), dx: city.dx || 0, dy: city.dy || 0 });
  });

  // ---------- Транспорт: 3D літаки (в повітрі) + кораблі (морем) ----------

  // Модель літака — силует Boeing 747-400F (вид зверху), ніс по +Y.
  function makePlane() {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const s = 0.00075; // масштаб (удвічі менше)

    function meshFromPts(pts) {
      const sh = new THREE.Shape();
      sh.moveTo(pts[0][0] * s, pts[0][1] * s);
      for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0] * s, pts[i][1] * s);
      sh.closePath();
      return new THREE.Mesh(new THREE.ShapeGeometry(sh), mat);
    }

    // Основний силует: фюзеляж + стрілоподібні крила + хвостові стабілізатори
    const body = [
      [0, 35],                          // ніс
      [1.9, 24], [2.3, 8],              // правий борт до кореня крила
      [28, -10], [29.5, -13.5], [3.2, -1],  // праве крило (стрілоподібне)
      [2.5, -16], [2.7, -24],          // фюзеляж до кореня стабілізатора
      [12.5, -30], [12.5, -32.5], [2.3, -27], // правий стабілізатор
      [1.6, -34], [0, -35.5],          // хвіст
      [-1.6, -34], [-2.3, -27], [-12.5, -32.5], [-12.5, -30], // лівий стабілізатор
      [-2.7, -24], [-2.5, -16],        // фюзеляж
      [-3.2, -1], [-29.5, -13.5], [-28, -10], // ліве крило
      [-2.3, 8], [-1.9, 24]            // лівий борт до носа
    ];
    g.add(meshFromPts(body));

    // 4 двигуни (гондоли), виступають уперед з-під крил
    const engines = [[11, -1], [20, -4.5], [-11, -1], [-20, -4.5]];
    engines.forEach(([ex, ey]) => {
      const w = 2.4, l = 7;
      g.add(meshFromPts([
        [ex - w / 2, ey + l / 2], [ex + w / 2, ey + l / 2],
        [ex + w / 2, ey - l / 2], [ex - w / 2, ey - l / 2]
      ]));
    });

    return g;
  }

  // Модель корабля — контейнеровоз MSC Irina (ULCV). Ніс по +Y, палуба по +Z.
  function makeShip() {
    const g = new THREE.Group();
    const hullMat  = new THREE.MeshBasicMaterial({ color: 0x12233f }); // темно-синій корпус MSC
    const bandMat  = new THREE.MeshBasicMaterial({ color: 0xc9a24b }); // золотиста смуга борту
    const deckMat  = new THREE.MeshBasicMaterial({ color: 0x1a1f2a });
    const brIdge   = new THREE.MeshBasicMaterial({ color: 0xeef2f7 }); // білий місток
    const funnel   = new THREE.MeshBasicMaterial({ color: 0x2b3242 }); // труба
    // палітра контейнерів (домінують жовті/охра як MSC + різні лінії)
    const cont = [0xcf9b2f, 0xd9a93f, 0x2f6fb0, 0x3fae5a, 0xc23a3a, 0x8a8f98, 0xd9a93f, 0x2f6fb0];

    const W = 0.026, Lh = 0.115;   // видовжений корпус ULCV

    // Корпус — обтічний (гострий ніс, пряма корма)
    const hull = new THREE.Shape();
    hull.moveTo(0, Lh / 2);
    hull.quadraticCurveTo(W / 2, Lh / 3, W / 2, Lh / 6);
    hull.lineTo(W / 2, -Lh / 2);
    hull.lineTo(-W / 2, -Lh / 2);
    hull.lineTo(-W / 2, Lh / 6);
    hull.quadraticCurveTo(-W / 2, Lh / 3, 0, Lh / 2);
    const hullGeo = new THREE.ExtrudeGeometry(hull, { depth: 0.015, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.0018, bevelSegments: 2 });
    const body = new THREE.Mesh(hullGeo, hullMat);
    body.rotation.x = -Math.PI / 2;
    body.position.z = -0.0075;
    g.add(body);

    // Золотиста смуга вздовж борту (верхня частина корпусу)
    const band = new THREE.Mesh(new THREE.BoxGeometry(W * 1.005, Lh * 0.96, 0.004), bandMat);
    band.position.z = 0.006;
    g.add(band);

    // Палуба
    const deck = new THREE.Mesh(new THREE.BoxGeometry(W * 0.82, Lh * 0.9, 0.002), deckMat);
    deck.position.z = 0.0095;
    g.add(deck);

    // Місток (житлова надбудова) — зміщений ближче до носа (риса нових ULCV)
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(W * 0.8, 0.014, 0.02), brIdge);
    bridge.position.set(0, Lh * 0.26, 0.019);
    g.add(bridge);
    // вікна містка
    const win = new THREE.Mesh(new THREE.BoxGeometry(W * 0.82, 0.003, 0.004), deckMat);
    win.position.set(0, Lh * 0.26 + 0.006, 0.027);
    g.add(win);

    // Труба (димохід) — окремо ближче до корми
    const fun = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.012, 0.016), funnel);
    fun.position.set(0, -Lh * 0.34, 0.018);
    g.add(fun);

    // Контейнери — рядами по всій довжині палуби (крім містка й труби)
    let idx = 0;
    const rows = 9;
    for (let r = 0; r < rows; r++) {
      const y = Lh * 0.40 - (r / (rows - 1)) * Lh * 0.74;
      // пропускаємо зони містка і труби
      if (Math.abs(y - Lh * 0.26) < 0.012) continue;
      if (Math.abs(y + Lh * 0.34) < 0.012) continue;
      for (let c = 0; c < 2; c++) {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(W * 0.36, Lh * 0.066, 0.008),
          new THREE.MeshBasicMaterial({ color: cont[(idx++) % cont.length] })
        );
        box.position.set((c - 0.5) * W * 0.42, y, 0.0145);
        g.add(box);
      }
    }

    g.scale.setScalar(0.275);
    return g;
  }

  // Побудова шляху по waypoints (масив lat/lng) на поверхні сфери
  function buildPath(waypoints) {
    const verts = waypoints.map(w => latLngToVec3(w[0], w[1], R).normalize());
    const segs = []; let total = 0;
    for (let i = 0; i < verts.length - 1; i++) {
      const a = verts[i], b = verts[i + 1];
      const ang = Math.acos(Math.min(1, Math.max(-1, a.dot(b))));
      segs.push({ a, b, ang, start: total });
      total += ang;
    }
    return { segs, total };
  }

  function pathPoint(path, t, arc) {
    let tt = ((t % 1) + 1) % 1;
    const target = tt * path.total;
    let seg = path.segs[0];
    for (const s of path.segs) {
      if (target >= s.start && target <= s.start + s.ang) { seg = s; break; }
    }
    const lt = seg.ang < 1e-6 ? 0 : (target - seg.start) / seg.ang;
    const omega = seg.ang;
    let p;
    if (omega < 1e-4) p = seg.a.clone();
    else {
      const s1 = Math.sin((1 - lt) * omega) / Math.sin(omega);
      const s2 = Math.sin(lt * omega) / Math.sin(omega);
      p = seg.a.clone().multiplyScalar(s1).add(seg.b.clone().multiplyScalar(s2));
    }
    const lift = R + 0.006 + Math.sin(tt * Math.PI) * arc;
    return p.normalize().multiplyScalar(lift);
  }

  // Реальний морський маршрут Шеньчжень → Одеса (через Малакку, Суец, Босфор)
  const SEA_ROUTE = [
    [22.5, 114.1],  // Шеньчжень
    [14.0, 112.0],  // Південно-Китайське море
    [6.0, 105.5],   // південь В'єтнаму
    [1.5, 104.6],   // Сінгапур / Малаккська протока
    [5.0, 98.5],    // Малаккська протока
    [7.0, 94.0],    // Андаманське море
    [6.0, 80.0],    // південь Шрі-Ланки
    [11.0, 60.0],   // Аравійське море
    [13.0, 52.0],   // біля Сокотри
    [12.5, 43.5],   // Баб-ель-Мандеб
    [18.0, 40.0],   // Червоне море південь
    [27.0, 34.5],   // Червоне море північ
    [30.0, 32.5],   // Суецький канал
    [32.0, 30.0],   // Середземне (схід)
    [34.0, 25.0],   // південь Криту
    [38.0, 25.5],   // Егейське море
    [40.2, 26.2],   // Дарданелли
    [41.2, 29.1],   // Босфор
    [43.5, 32.0],   // Чорне море
    [46.3, 30.7]    // Одеса
  ];
  const seaPath = buildPath(SEA_ROUTE);

  // Альтернативний маршрут навколо Африки (мис Доброї Надії, в обхід Суецу)
  const AFRICA_ROUTE = [
    [22.5, 114.1],  // Шеньчжень
    [12.0, 112.0],  // Південно-Китайське море
    [4.0, 106.0],   // південь В'єтнаму
    [1.5, 104.6],   // Сінгапур
    [3.0, 95.0],    // Андаманське море
    [2.0, 80.0],    // південь Шрі-Ланки
    [-8.0, 70.0],   // Індійський океан
    [-20.0, 58.0],  // схід від Маврикію
    [-28.0, 45.0],  // південь Мадагаскару
    [-35.0, 28.0],  // підхід до півдня Африки
    [-35.5, 20.0],  // мис Голковий (південь ПАР)
    [-34.0, 17.0],  // Кейптаун (offshore)
    [-26.0, 13.0],  // Намібія
    [-15.0, 11.0],  // Ангола
    [-5.0, 10.0],   // Габон
    [1.0, 6.0],     // Гвінейська затока
    [4.0, -3.0],    // Гвінейська затока захід
    [7.0, -13.0],   // Ліберія (offshore)
    [14.0, -19.0],  // Сенегал/Дакар (offshore)
    [23.0, -18.0],  // Західна Сахара (offshore)
    [31.0, -11.0],  // Марокко (offshore)
    [35.5, -7.0],   // північ Марокко
    [36.0, -5.5],   // Гібралтарська протока
    [37.0, 3.0],    // Середземне (Альборан)
    [37.0, 13.0],   // Середземне центр
    [37.0, 17.0],   // Сицилійська протока
    [36.5, 20.0],   // Іонічне море
    [38.0, 24.0],   // Егейське море
    [40.2, 26.2],   // Дарданелли
    [41.2, 29.1],   // Босфор
    [43.5, 32.0],   // Чорне море
    [46.3, 30.7]    // Одеса
  ];
  const africaPath = buildPath(AFRICA_ROUTE);

  // Авіамаршрути (пряма дуга між 2 містами)
  function cityPath(ci, cj) {
    return buildPath([
      [CITIES[ci].lat, CITIES[ci].lng],
      [CITIES[cj].lat, CITIES[cj].lng]
    ]);
  }

  const vehicles = [];
  function addVehicle(mesh, path, o) {
    globe.add(mesh);
    vehicles.push({ mesh, path, t: o.t || 0, sp: o.sp, dir: o.dir || 1, arc: o.arc || 0 });
  }

  // Літаки (полога дуга — летять горизонтально, як крейсер)
  addVehicle(makePlane(), cityPath(0, 1), { sp: 0.000065, t: 0.00, dir:  1, arc: 0.05 });
  addVehicle(makePlane(), cityPath(0, 1), { sp: 0.000050, t: 0.50, dir: -1, arc: 0.05 });
  addVehicle(makePlane(), cityPath(0, 3), { sp: 0.000055, t: 0.25, dir:  1, arc: 0.05 });
  // Кораблі через Суец (по поверхні, повільні і плавні)
  addVehicle(makeShip(), seaPath, { sp: 0.0000126, t: 0.00, dir: 1, arc: 0.0 });
  addVehicle(makeShip(), seaPath, { sp: 0.0000126, t: 0.30, dir: 1, arc: 0.0 });
  addVehicle(makeShip(), seaPath, { sp: 0.0000126, t: 0.65, dir: 1, arc: 0.0 });
  // Кораблі навколо Африки (довший маршрут — трохи повільніші)
  addVehicle(makeShip(), africaPath, { sp: 0.0000100, t: 0.10, dir: 1, arc: 0.0 });
  addVehicle(makeShip(), africaPath, { sp: 0.0000100, t: 0.40, dir: 1, arc: 0.0 });
  addVehicle(makeShip(), africaPath, { sp: 0.0000100, t: 0.72, dir: 1, arc: 0.0 });

  const _right = new THREE.Vector3(), _fwd = new THREE.Vector3(), _up = new THREE.Vector3();
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
  function updateVehicles(dt) {
    vehicles.forEach((v) => {
      v.t += v.sp * dt * v.dir;
      if (v.t > 1) v.t -= 1;
      if (v.t < 0) v.t += 1;

      // більший look-ahead → плавніший напрям на кутах маршруту
      const la = v.arc > 0 ? 0.006 : 0.012;
      const pos = pathPoint(v.path, v.t, v.arc);
      const ahead = pathPoint(v.path, v.t + la * v.dir, v.arc);
      v.mesh.position.copy(pos);

      _up.copy(pos).normalize();
      _fwd.copy(ahead).sub(pos).normalize();
      _right.crossVectors(_fwd, _up).normalize();
      _fwd.crossVectors(_up, _right).normalize();
      _m.makeBasis(_right, _fwd, _up);
      _q.setFromRotationMatrix(_m);
      // плавне доповертання (slerp), а не миттєвий поворот
      const turn = v.initialized ? 0.08 : 1;
      v.mesh.quaternion.slerp(_q, turn);
      v.initialized = true;
    });
  }

  // ---------- Контроли: drag + інерція + автокрутіння ----------
  let dragging = false, lastX = 0, lastY = 0;
  let velY = 0, velX = 0;
  const MAX_TILT = 1.2;

  function down(e) {
    dragging = true; canvas.classList.add('dragging');
    const p = e.touches ? e.touches[0] : e;
    lastX = p.clientX; lastY = p.clientY; velX = velY = 0;
  }
  function move(e) {
    if (!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - lastX, dy = p.clientY - lastY;
    lastX = p.clientX; lastY = p.clientY;
    globe.rotation.y += dx * 0.006;
    globe.rotation.x += dy * 0.006;
    globe.rotation.x = Math.max(-MAX_TILT, Math.min(MAX_TILT, globe.rotation.x));
    velY = dx * 0.006; velX = dy * 0.006;
  }
  function up() { dragging = false; canvas.classList.remove('dragging'); }

  canvas.addEventListener('mousedown', down);
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  canvas.addEventListener('touchstart', down, { passive: true });
  window.addEventListener('touchmove', move, { passive: true });
  window.addEventListener('touchend', up);

  // ---------- Проекція HTML-підписів ----------
  const tmp = new THREE.Vector3();
  function updateLabels() {
    const rect = canvas.getBoundingClientRect();
    labels.forEach((l) => {
      tmp.copy(l.pos);
      globe.localToWorld(tmp);
      const world = tmp.clone();
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * rect.width;
      const y = (-tmp.y * 0.5 + 0.5) * rect.height;
      // чи точка на видимому боці (ближче за центр globe)
      const camDir = world.clone().sub(camera.position);
      const visible = tmp.z < 1 && camDir.length() < camera.position.length() + 0.2;
      l.el.style.left = (x + l.dx) + 'px';
      l.el.style.top = (y + l.dy) + 'px';
      l.el.style.opacity = (tmp.z < 1 && world.z > -0.15) ? '1' : '0';
    });
  }

  // ---------- Resize ----------
  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- Render loop ----------
  let last = performance.now();
  function animate(now) {
    const dt = Math.min(60, now - last); last = now;

    if (!dragging) {
      globe.rotation.y += velY;
      globe.rotation.x += velX;
      globe.rotation.x = Math.max(-MAX_TILT, Math.min(MAX_TILT, globe.rotation.x));
      velX *= 0.94; velY *= 0.94;
      // автокрутіння коли інерція згасла
      if (Math.abs(velY) < 0.0005) globe.rotation.y += 0.0012;
      // м'яке вирівнювання нахилу
      globe.rotation.x += (0 - globe.rotation.x) * 0.008;
    }

    updateVehicles(dt);
    renderer.render(scene, camera);
    if (!canvasShown) {           // показуємо полотно лише після першого кадру
      canvasShown = true;
      renderer.domElement.style.opacity = '1';
    }
    updateLabels();
    requestAnimationFrame(animate);
  }
  let canvasShown = false;
  requestAnimationFrame(animate);
})();
