import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

import { COLORS, SCENARIOS, OBSTACLE_TYPES, START_LIMITS, START_DEFAULT, ENVIRONMENTS } from './config.js';
import { createEnvironmentManager } from './environment.js';
import { createParticipant } from './participant.js';
import { createScenarioManager } from './scenarioManager.js';
import { buildLegend } from './legend.js';
import { setupViewControls } from './viewControls.js';
import { setupAnimationController } from './animationController.js';

// --- Setup básico de cena, câmeras e renderizadores -------------------------
const container = document.getElementById('scene-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.wall);

const camera = new THREE.PerspectiveCamera(48, container.clientWidth / container.clientHeight, 0.1, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(container.clientWidth, container.clientHeight);
labelRenderer.domElement.className = 'css2d-layer';
container.appendChild(labelRenderer.domElement);

// Importante: os controles escutam eventos no canvas WebGL, não na camada de
// rótulos (que tem pointer-events: none para não bloquear o mouse).
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2;
controls.maxDistance = 55;
controls.maxPolarAngle = Math.PI * 0.495;

// --- Construção da cena -----------------------------------------------------
const environmentManager = createEnvironmentManager(scene);
let currentEnvId = ENVIRONMENTS[0].id;
const { ceiling } = environmentManager.load(currentEnvId);

const participant = createParticipant();
scene.add(participant.group);

const scenarioManager = createScenarioManager(scene);

// --- Painéis de interface (DOM) ---------------------------------------------
buildLegend(document.getElementById('legend-panel'));

const viewButtons = {
  egocentric: document.getElementById('btn-view-egocentric'),
  top: document.getElementById('btn-view-top'),
};
const viewControls = setupViewControls({ camera, controls, buttons: viewButtons, participantGroup: participant.group, ceiling });

const animationApi = setupAnimationController({
  participant,
  ui: {
    playBtn: document.getElementById('btn-play'),
    resetBtn: document.getElementById('btn-reset'),
    slider: document.getElementById('progress-slider'),
    timeLabel: document.getElementById('progress-label'),
  },
});

// --- Menu de ambiente, cenários, obstáculos e posição inicial -----------------
const scenarioPanel = document.getElementById('scenario-panel');

// Seletor de ambiente: troca todo o entorno mantendo o mesmo protocolo
const envTitle = document.createElement('div');
envTitle.className = 'panel-title';
envTitle.textContent = 'Ambiente';
scenarioPanel.appendChild(envTitle);

const envSelect = document.createElement('select');
envSelect.className = 'env-select';
ENVIRONMENTS.forEach((env) => {
  const option = document.createElement('option');
  option.value = env.id;
  option.textContent = env.label;
  envSelect.appendChild(option);
});
envSelect.addEventListener('change', () => {
  // O ambiente é reconstruído do zero; o teto acompanhado pela visão
  // superior muda junto (ambientes externos não têm teto). A lista de
  // obstáculos também muda: cada ambiente tem seus objetos típicos.
  currentEnvId = envSelect.value;
  const built = environmentManager.load(currentEnvId);
  viewControls.setCeiling(built.ceiling);
  renderObstacleChecks();
  rebuildScenario();
});
scenarioPanel.appendChild(envSelect);

const scenarioTitle = document.createElement('div');
scenarioTitle.className = 'panel-subtitle';
scenarioTitle.textContent = 'Cenário de navegação';
scenarioPanel.appendChild(scenarioTitle);

const scenarioButtons = new Map();
SCENARIOS.forEach((s, i) => {
  const btn = document.createElement('button');
  btn.className = 'scenario-btn';
  btn.textContent = `${i + 1}. ${s.label}`;
  btn.addEventListener('click', () => selectScenario(s.id));
  scenarioPanel.appendChild(btn);
  scenarioButtons.set(s.id, btn);
});

let currentScenarioId = SCENARIOS[0].id;

// Tipos de obstáculo disponíveis no ambiente ativo.
function typesForEnv(envId) {
  return OBSTACLE_TYPES.filter((t) => t.envs.includes(envId));
}

// Obstáculos padrão do cenário que existem no ambiente dado (ex.: 'mesa' em
// ambientes internos vira 'banca' na calçada).
function defaultsFor(envId, scenarioId) {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario || !scenario.obstacleSlots) return [];
  const available = new Set(typesForEnv(envId).map((t) => t.id));
  return (scenario.defaultObstacles || []).filter((id) => available.has(id));
}

// Seleção de obstáculos memorizada por combinação de ambiente + cenário.
const obstacleSelections = new Map();
function getSelection(envId = currentEnvId, scenarioId = currentScenarioId) {
  const key = `${envId}::${scenarioId}`;
  if (!obstacleSelections.has(key)) {
    obstacleSelections.set(key, new Set(defaultsFor(envId, scenarioId)));
  }
  return obstacleSelections.get(key);
}

const obstacleTitle = document.createElement('div');
obstacleTitle.className = 'panel-subtitle';
obstacleTitle.textContent = 'Obstáculos do cenário';
scenarioPanel.appendChild(obstacleTitle);

const obstacleList = document.createElement('div');
scenarioPanel.appendChild(obstacleList);

// Reconstrói a lista de checkboxes para os tipos válidos no ambiente ativo.
function renderObstacleChecks() {
  const scenario = SCENARIOS.find((s) => s.id === currentScenarioId);
  const selection = getSelection();
  const enabled = Boolean(scenario && scenario.obstacleSlots);
  obstacleList.innerHTML = '';

  typesForEnv(currentEnvId).forEach((type) => {
    const row = document.createElement('label');
    row.className = 'obstacle-check';
    if (!enabled) row.classList.add('disabled');

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = selection.has(type.id);
    input.disabled = !enabled;
    input.addEventListener('change', () => {
      if (input.checked) {
        selection.add(type.id);
      } else {
        // Cenário de parada exige bloqueio: não desmarca o último obstáculo.
        if (scenario.requireObstacle && selection.size === 1 && selection.has(type.id)) {
          input.checked = true;
          return;
        }
        selection.delete(type.id);
      }
      rebuildScenario();
    });

    const text = document.createElement('span');
    text.textContent = type.label;
    row.appendChild(input);
    row.appendChild(text);
    obstacleList.appendChild(row);
  });
}

// Controles de posição inicial do participante
const startPos = { ...START_DEFAULT };

const startTitle = document.createElement('div');
startTitle.className = 'panel-subtitle';
startTitle.textContent = 'Posição inicial do participante';
scenarioPanel.appendChild(startTitle);

function makeStartSlider(labelText, axis, [min, max]) {
  const row = document.createElement('div');
  row.className = 'start-slider';
  const label = document.createElement('span');
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = '0.1';
  input.value = String(startPos[axis]);
  const updateLabel = () => {
    label.textContent = `${labelText}: ${Number(startPos[axis]).toFixed(1)} m`;
  };
  input.addEventListener('input', () => {
    startPos[axis] = Number(input.value);
    updateLabel();
    rebuildScenario();
  });
  updateLabel();
  row.appendChild(label);
  row.appendChild(input);
  scenarioPanel.appendChild(row);
}

makeStartSlider('Lateral', 'x', START_LIMITS.x);
makeStartSlider('Distância', 'z', START_LIMITS.z);

// Reconstrói o cenário ativo com as opções atuais (obstáculos + posição inicial).
function rebuildScenario() {
  const scenario = SCENARIOS.find((s) => s.id === currentScenarioId);
  if (!scenario) return;
  const selection = getSelection();
  // A ordem de OBSTACLE_TYPES define a prioridade de preenchimento dos slots;
  // só entram tipos válidos no ambiente ativo.
  const types = typesForEnv(currentEnvId).filter((t) => selection.has(t.id)).map((t) => t.id);
  const { curve, riskZone } = scenarioManager.load(scenario, {
    types,
    start: startPos,
  });
  animationApi.setScenario({
    curve,
    riskZone,
    speed: scenario.speed,
    stop: scenario.stop,
  });
}

function selectScenario(id) {
  const scenario = SCENARIOS.find((s) => s.id === id);
  if (!scenario) return;
  currentScenarioId = id;
  // Ao entrar num cenário com o seletor vazio, reaplica os obstáculos padrão
  // dele — assim sempre "já vem algo marcado" ao escolher o cenário.
  const selection = getSelection();
  if (scenario.obstacleSlots && selection.size === 0) {
    defaultsFor(currentEnvId, id).forEach((t) => selection.add(t));
  }
  renderObstacleChecks();
  rebuildScenario();
  scenarioButtons.forEach((btn, key) => btn.classList.toggle('active', key === id));
}

// Cenário inicial
selectScenario(SCENARIOS[0].id);

// --- Liga/desliga os rótulos 3D da cena ---------------------------------------
// Todos os rótulos (marcadores, obstáculos, trajetórias...) vivem na camada
// CSS2D; alternar a visibilidade dela liga/desliga tudo de uma vez.
const labelsBtn = document.getElementById('btn-labels');
labelsBtn.addEventListener('click', () => {
  const visible = labelRenderer.domElement.style.display !== 'none';
  labelRenderer.domElement.style.display = visible ? 'none' : '';
  labelsBtn.classList.toggle('active', !visible);
});

// --- Liga/desliga o cone de campo de visão da câmera ---------------------------
const fovBtn = document.getElementById('btn-fov');
const fovCone = participant.group.getObjectByName('fov-cone');
fovBtn.addEventListener('click', () => {
  fovCone.visible = !fovCone.visible;
  fovBtn.classList.toggle('active', fovCone.visible);
});

// Handle de depuração (console): permite inspecionar câmera/participante e
// avançar quadros manualmente com __debugScene.step(dt).
window.__debugScene = {
  camera, controls, viewControls, animationApi, renderer, labelRenderer, scene, participant,
  step(dt = 0.05) {
    animationApi.update(dt);
    viewControls.update(dt);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  },
};

// --- Loop de renderização ----------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  animationApi.update(delta);
  viewControls.update(delta);
  controls.update();

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();

// --- Responsividade -----------------------------------------------------------
function onResize() {
  const w = container.clientWidth, h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
}
window.addEventListener('resize', onResize);
