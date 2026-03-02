(() => {
  const asciiLayer = document.getElementById("ascii-layer");
  const envImage = document.getElementById("environment-image");
  const clockEl = document.getElementById("projection-clock");
  const prevArrow = document.getElementById("prev-mode");
  const nextArrow = document.getElementById("next-mode");

  const MODES = {
    calm: {
      key: "calm",
      cssClass: "ascii-layer--calm",
      palette: ["#4fd1ff", "#63b3ed", "#90cdf4"],
      targetCoverage: 0.4,
      background: "rgba(0, 6, 20, 0.35)",
    },
    fire: {
      key: "fire",
      cssClass: "ascii-layer--fire",
      palette: [
        "rgba(255,159,28,0.55)",
        "rgba(255,59,48,0.55)",
        "rgba(255,209,102,0.55)",
        "rgba(249,115,22,0.55)",
      ],
      targetCoverage: 0.75,
      background: "rgba(0, 0, 0, 0.3)",
    },
    forest: {
      key: "forest",
      cssClass: "ascii-layer--forest",
      palette: ["#22c55e", "#16a34a", "#4ade80", "#6ee7b7"],
      targetCoverage: 1,
      background: "rgba(0, 20, 10, 0.3)",
    },
  };

  const STAMPS = {
    calm: [
      {
        width: 5,
        height: 2,
        pattern: ["   ~~", " ~~  "],
      },
      {
        width: 7,
        height: 3,
        pattern: ["   /~~~", "  /~~~ ", " /~~   "],
      },
      {
        width: 6,
        height: 2,
        pattern: ["  ~~ /", " ~~ / "],
      },
    ],
    fire: [
      {
        width: 3,
        height: 3,
        pattern: [" ^ ", "/#^", "|||"],
      },
      {
        width: 4,
        height: 3,
        pattern: [" ^^ ", "/##^", " |||"],
      },
      {
        width: 4,
        height: 4,
        pattern: ["  ^ ", " /^/", "/##^", " |||"],
      },
    ],
    forest: [
      {
        width: 3,
        height: 3,
        pattern: [" ^ ", "/Y\\", " | "],
      },
      {
        width: 5,
        height: 4,
        pattern: ["  ^  ", " /Y\\ ", "/YYY\\", "  |  "],
      },
      {
        width: 5,
        height: 4,
        pattern: ["  ^  ", " /Y\\ ", "/YYY\\", " /|\\ "],
      },
    ],
  };

  const MODE_ORDER = ["calm", "fire", "forest"];

  let currentMode = null;
  let grid = [];
  let rows = 0;
  let cols = 0;
  let filledCount = 0;
  let animationId = null;
  let coverageTarget = 0;
  let lastStepTime = 0;
  const STEP_INTERVAL_MS = 90;

  function updateClock() {
    if (!clockEl) return;
    if (!currentMode || coverageTarget <= 0) {
      clockEl.textContent = "00:00:00.0 000";
      return;
    }

    const totalSlots = rows * cols * coverageTarget;
    if (totalSlots <= 0) {
      clockEl.textContent = "00:00:00.0 000";
      return;
    }

    const fraction = Math.max(
      0,
      Math.min(1, filledCount / totalSlots)
    );

    const totalMillisInDay = 24 * 60 * 60 * 1000;
    let millis = Math.round(fraction * totalMillisInDay);
    if (millis >= totalMillisInDay) {
      millis = totalMillisInDay - 1;
    }

    const totalSeconds = Math.floor(millis / 1000);
    const ms = millis % 1000;

    const hours = Math.floor(totalSeconds / 3600);
    const remaining = totalSeconds % 3600;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;

    const deciseconds = Math.floor(ms / 100);

    const hh = String(hours).padStart(2, "0");
    const mm = String(mins).padStart(2, "0");
    const ss = String(secs).padStart(2, "0");
    const d = String(deciseconds);
    const mmm = String(ms).padStart(3, "0");

    clockEl.textContent = `${hh}:${mm}:${ss}.${d} ${mmm}`;
  }

  function initGrid() {
    const width = asciiLayer.clientWidth || asciiLayer.offsetWidth || 800;
    const height = asciiLayer.clientHeight || asciiLayer.offsetHeight || 450;

    const approxCharW = 8;
    const approxCharH = 10;

    cols = Math.max(40, Math.floor(width / approxCharW));
    rows = Math.max(18, Math.floor(height / approxCharH));

    grid = new Array(rows * cols).fill(null);
    filledCount = 0;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function stepFill(timestamp) {
    if (!currentMode) return;

    if (timestamp == null) {
      animationId = requestAnimationFrame(stepFill);
      return;
    }

    if (timestamp - lastStepTime < STEP_INTERVAL_MS) {
      animationId = requestAnimationFrame(stepFill);
      return;
    }
    lastStepTime = timestamp;

    const total = rows * cols;
    const target = total * coverageTarget;

    if (filledCount >= target) {
      animationId = requestAnimationFrame(stepFill);
      return;
    }

    const batch = Math.max(1, Math.floor(total * 0.004));
    let placed = 0;

    while (placed < batch && filledCount < target) {
      const stampsForMode = STAMPS[currentMode.key];
      const stamp = stampsForMode
        ? pickRandom(stampsForMode)
        : {
            width: 1,
            height: 1,
            pattern: ["*"],
          };

      if (cols < stamp.width || rows < stamp.height) {
        break;
      }

      const maxCol = cols - stamp.width;
      const maxRow = rows - stamp.height;
      const baseCol = Math.floor(Math.random() * (maxCol + 1));
      const baseRow = Math.floor(Math.random() * (maxRow + 1));

      let wroteSomething = false;

      for (let sy = 0; sy < stamp.height; sy++) {
        const line = stamp.pattern[sy] || "";
        for (let sx = 0; sx < stamp.width; sx++) {
          const ch = line[sx] || " ";
          if (ch === " ") continue;

          const col = baseCol + sx;
          const row = baseRow + sy;
          const idx = row * cols + col;
          if (grid[idx]) continue;

          const color = pickRandom(currentMode.palette);
          grid[idx] = `<span style="color:${color}">${ch}</span>`;
          filledCount += 1;
          wroteSomething = true;
        }
      }

      if (wroteSomething) {
        placed += 1;
      }
    }

    updateClock();

    const lines = [];
    for (let r = 0; r < rows; r++) {
      const slice = grid.slice(r * cols, (r + 1) * cols).map((cell) => {
        if (cell) return cell;
        return "&nbsp;";
      });
      lines.push(slice.join(""));
    }

    asciiLayer.innerHTML = `<pre>${lines.join("\n")}</pre>`;

    animationId = requestAnimationFrame(stepFill);
  }

  function stopAnimation() {
    if (animationId != null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function setMode(modeKey) {
    const mode = MODES[modeKey];
    if (!mode) return;

    stopAnimation();
    initGrid();
    currentMode = mode;
    coverageTarget = mode.targetCoverage;

    if (envImage) {
      if (modeKey === "fire") {
        envImage.src = "landfill-img.jpeg";
      } else if (modeKey === "forest") {
        envImage.src = "forest-img.jpg";
      } else {
        envImage.src = "earth-img.jpg";
      }
    }

    asciiLayer.className = `ascii-layer is-visible ${mode.cssClass}`;
    asciiLayer.style.backgroundColor = mode.background;

    filledCount = 0;
    lastStepTime = 0;
    updateClock();
    stepFill();
  }

  function resetView() {
    stopAnimation();
    currentMode = null;
    coverageTarget = 0;
    asciiLayer.className = "ascii-layer";
    asciiLayer.style.backgroundColor = "transparent";
    asciiLayer.innerHTML = "";
    updateClock();
  }

  function stepToOffset(offset) {
    if (!currentMode) {
      setMode("calm");
      return;
    }
    const currentKey = currentMode.key;
    const idx = MODE_ORDER.indexOf(currentKey);
    if (idx === -1) {
      setMode("calm");
      return;
    }
    const nextIndex =
      (idx + offset + MODE_ORDER.length) % MODE_ORDER.length;
    const nextKey = MODE_ORDER[nextIndex];
    if (nextKey === currentKey) return;
    setMode(nextKey);
  }

  if (prevArrow) {
    prevArrow.addEventListener("click", () => {
      stepToOffset(-1);
    });
  }

  if (nextArrow) {
    nextArrow.addEventListener("click", () => {
      stepToOffset(1);
    });
  }

  window.addEventListener("resize", () => {
    if (!currentMode) return;
    setMode(currentMode.key);
  });

  // Start in calm mode so there is a subtle ASCII presence.
  setMode("calm");
})();

