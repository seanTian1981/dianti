(function () {
  const MODE_DESCRIPTIONS = {
    components: "观察电梯核心部件的协同工作，钢丝绳、轿门与平衡重的律动帮助理解动力传递与安全机制。",
    run: "通过真实楼层调度体验电梯的加减速过程，感受平衡重与轿厢的同步协作。",
    maintenance: "模拟检修工程师的巡视、检测与调试过程，了解规范化维护如何保障乘梯安全。",
    rescue: "推演应急救援的关键步骤：安抚乘客、释放轿门以及安全撤离的指挥与配合。"
  };

  const MODE_PANEL_MESSAGES = {
    components: "部件动态展示，点击模式了解更多。",
    run: "运行控制台已就绪，选择楼层或开启自动运行。",
    maintenance: "检修人员正在进行例行检查，关注安全联锁与制动系统。",
    rescue: "应急状态开启：保持镇定，配合救援人员完成疏散。"
  };

  const FLOOR_HEIGHT = 104; // 同 CSS 中的 --floor-height
  const MIN_FLOOR = 1;
  const MAX_FLOOR = 5;

  const scene = document.getElementById("scene");
  const modeButtons = document.querySelectorAll(".mode-button");
  const modeDescription = document.getElementById("modeDescription");
  const runControls = document.querySelector(".run-controls");
  const runStatus = document.getElementById("runStatus");
  const autoRunToggle = document.getElementById("autoRunToggle");
  const floorButtons = document.querySelectorAll(".floor-buttons button");
  const elevatorCar = document.getElementById("elevatorCar");
  const counterweight = document.getElementById("counterweight");
  const panelFloor = document.getElementById("panelFloor");
  const panelMessage = document.getElementById("panelMessage");
  const panelArrows = document.getElementById("panelArrows");
  const upArrow = panelArrows.querySelector(".up");
  const downArrow = panelArrows.querySelector(".down");
  const floorIndicators = document.querySelectorAll("[data-floor-marker]");

  const allModes = ["components", "run", "maintenance", "rescue"];

  let currentMode = "components";
  let currentFloor = 1;
  let travelLock = false;
  let autoRunning = false;
  let autoDirection = 1;
  let autoTimer = null;

  function updateIndicators(floor) {
    floorIndicators.forEach((indicator) => {
      indicator.classList.toggle("active", Number(indicator.dataset.floorMarker) === floor);
    });
    panelFloor.textContent = floor;
  }

  function moveElevator(targetFloor, options = {}) {
    const { announce = true, reason = "manual" } = options;
    if (travelLock) {
      return 0;
    }

    const target = Math.max(MIN_FLOOR, Math.min(MAX_FLOOR, Number(targetFloor)));

    if (Number.isNaN(target)) {
      return 0;
    }

    if (target === currentFloor) {
      if (currentMode === "run" && announce) {
        runStatus.textContent = `电梯已在 ${target} 层待命`;
        panelMessage.textContent = `电梯静止于 ${target} 层，等待调度。`;
      }
      return 0;
    }

    const previousFloor = currentFloor;
    const floorsToTravel = Math.abs(target - previousFloor);
    const duration = 1.15 + floorsToTravel * 0.55; // 秒

    travelLock = true;
    currentFloor = target;

    elevatorCar.style.transitionDuration = `${duration}s`;
    elevatorCar.style.bottom = `${(target - 1) * FLOOR_HEIGHT}px`;

    const maxCounterTravel = (MAX_FLOOR - 1) * FLOOR_HEIGHT;
    counterweight.style.transitionDuration = `${duration}s`;
    counterweight.style.bottom = `${maxCounterTravel - (target - 1) * FLOOR_HEIGHT}px`;

    updateIndicators(target);

    const goingUp = target > previousFloor;
    upArrow.classList.toggle("active", goingUp);
    downArrow.classList.toggle("active", !goingUp);
    panelArrows.classList.add("moving");

    if (currentMode === "run") {
      if (reason === "auto") {
        panelMessage.textContent = `自动运行：从 ${previousFloor} 层前往 ${target} 层`;
        runStatus.textContent = `自动运行：驶向 ${target} 层`;
      } else if (announce) {
        panelMessage.textContent = `运行中：已驶离 ${previousFloor} 层，前往 ${target} 层`;
        runStatus.textContent = `电梯正在前往 ${target} 层...`;
      }
    }

    window.setTimeout(() => {
      panelArrows.classList.remove("moving");
      upArrow.classList.remove("active");
      downArrow.classList.remove("active");
      if (currentMode === "run") {
        panelMessage.textContent = `电梯已平稳停靠在 ${target} 层`;
        runStatus.textContent = `当前停靠：${target}层`;
      }
      travelLock = false;
    }, duration * 1000 + 120);

    return duration;
  }

  function scheduleAutoRun() {
    if (!autoRunning) {
      return;
    }

    let nextFloor = currentFloor + autoDirection;
    if (nextFloor > MAX_FLOOR) {
      autoDirection = -1;
      nextFloor = MAX_FLOOR - 1;
    } else if (nextFloor < MIN_FLOOR) {
      autoDirection = 1;
      nextFloor = MIN_FLOOR + 1;
    }

    const duration = moveElevator(nextFloor, { announce: false, reason: "auto" });
    const wait = Math.max(duration * 1000 + 900, 2600);

    autoTimer = window.setTimeout(() => {
      scheduleAutoRun();
    }, wait);
  }

  function startAutoRun() {
    if (autoRunning || currentMode !== "run") {
      return;
    }
    autoRunning = true;
    autoDirection = currentFloor >= MAX_FLOOR ? -1 : 1;
    panelMessage.textContent = "自动巡检运行中，系统按序往返各楼层。";
    runStatus.textContent = `自动运行巡检中，当前停靠：${currentFloor}层`;
    scheduleAutoRun();
  }

  function stopAutoRun() {
    autoRunning = false;
    if (autoTimer) {
      window.clearTimeout(autoTimer);
      autoTimer = null;
    }
  }

  function setMode(mode) {
    if (!allModes.includes(mode)) {
      return;
    }

    scene.classList.remove("mode-components", "mode-run", "mode-maintenance", "mode-rescue");
    scene.classList.add(`mode-${mode}`);
    currentMode = mode;

    modeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === mode);
    });

    modeDescription.textContent = MODE_DESCRIPTIONS[mode];
    panelMessage.textContent = MODE_PANEL_MESSAGES[mode];

    if (mode === "run") {
      runControls.classList.add("show");
      runStatus.textContent = `运行准备就绪，当前停靠：${currentFloor}层`;
      if (autoRunToggle.checked) {
        startAutoRun();
      }
    } else {
      runControls.classList.remove("show");
      stopAutoRun();
      panelArrows.classList.remove("moving");
      upArrow.classList.remove("active");
      downArrow.classList.remove("active");
    }
  }

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.mode;
      setMode(mode);
    });
  });

  floorButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const floor = Number(button.dataset.floor);
      if (travelLock) {
        runStatus.textContent = "电梯正在运行中，请稍候完成后再调度。";
        return;
      }

      if (currentMode !== "run") {
        autoRunToggle.checked = false;
        setMode("run");
      }

      if (autoRunToggle.checked) {
        autoRunToggle.checked = false;
      }
      stopAutoRun();
      moveElevator(floor, { announce: true, reason: "manual" });
    });
  });

  autoRunToggle.addEventListener("change", (event) => {
    if (currentMode !== "run") {
      setMode("run");
    }

    if (event.target.checked) {
      startAutoRun();
    } else {
      stopAutoRun();
      runStatus.textContent = `自动运行已暂停，当前停靠：${currentFloor}层`;
      panelMessage.textContent = "手动模式：请选择楼层进行调度。";
    }
  });

  // 初始化状态
  updateIndicators(currentFloor);
  counterweight.style.bottom = `${(MAX_FLOOR - currentFloor) * FLOOR_HEIGHT}px`;
  setMode("components");
})();
