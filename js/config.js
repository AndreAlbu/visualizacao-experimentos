// Paleta de cores e dimensões compartilhadas por toda a cena.
// Mantém o esquema neutro (ambiente) + cores de destaque (dados do experimento).
export const COLORS = {
  // Piso escuro em tom de concreto/porcelanato polido (referência: vídeo do experimento)
  floor: 0x363c44,
  floorGrid: 0x454c56,
  wall: 0xb9b6ae, // usado apenas como cor de fundo/fog; as laterais viram estantes
  wallBase: 0xb9b3a4,
  ceiling: 0x9a978f, // laje de concreto aparente
  ceilingRib: 0x86847c,
  doorFrame: 0x8c8577,
  doorPanel: 0xd9cdb6,
  fixture: 0xfff3d6,

  // Estante de biblioteca -- lado esquerdo (laranja vibrante) e direito (branco/claro)
  shelfOrangeFrame: 0xe1591c,
  shelfOrangeBoard: 0xc94e1a,
  shelfWhiteFrame: 0xeceae4,
  shelfWhiteBoard: 0xd8d5cc,
  bookColors: [0x2f4858, 0x6b7f5e, 0x8c3b3b, 0xc9a24b, 0x3b5a6b, 0x7a4b6b, 0x4f6b3b, 0xb0552e],

  // Parede-janela ao final do corredor
  mullionWhite: 0xf1efe9,
  mullionPink: 0xe1a3a0,
  mullionOrange: 0xe1591c,
  glass: 0xbfe0e8,
  skyOutside: 0xdcefe4,
  foliage: 0x5c8a52,
  trunk: 0x6b5334,

  // Mobiliário de leitura junto à janela
  furnitureRed: 0xe0431c,
  stoolWood: 0xb98a55,

  // Corredor institucional (escola / prédio público): paredes lisas iguais dos dois lados
  corridorFloor: 0xd9d5cb,
  corridorFloorGrid: 0xc0bbae,
  corridorWall: 0xeae8e1,
  corridorWainscot: 0x9db0ad, // faixa pintada na parte inferior da parede
  corridorBaseboard: 0x6d7877,
  corridorCeiling: 0xf5f4f0,

  // Calçada (ambiente externo)
  sidewalkPaving: 0xcac6bd,
  sidewalkJoint: 0xa9a59b,
  curb: 0xb5b1a8,
  asphalt: 0x494c50,
  roadLine: 0xd9d2b8,
  facade: 0xd5cec1,
  facadeWindow: 0x8ca6b4,
  sky: 0xc3daea,
  grass: 0x7d9464,
  lampPost: 0x545a5f,

  // Supermercado: gôndolas metálicas claras e produtos coloridos
  marketFloor: 0xe6e5e1,
  marketFloorGrid: 0xd2d0cb,
  marketGondola: 0xc2c6ca,
  marketGondolaBack: 0xd8dbde,
  marketPlinth: 0x8b9095,
  marketPriceStrip: 0xf6f4ee,
  marketSign: 0x2f6f9e,
  marketCeiling: 0xedebe6,
  marketCooler: 0x9fb6bd,
  productColors: [
    0xc0563a, 0xd8a13c, 0x4a7c59, 0x3d6b8a, 0x8c5a7a,
    0xb5603f, 0x5f8fa8, 0xa8a24b, 0x7a6bab, 0xd07f4a,
  ],

  // Obstáculos de rua
  binBody: 0x4d6b56,
  bikeFrame: 0x2f5d6b,
  signPost: 0x6f757a,
  signPlate: 0x3f6b8a,
  coneOrange: 0xd4642a,
  kioskCanvas: 0xb9553f,

  participantBody: 0x37454f,
  participantHead: 0x55636d,
  participantAccent: 0x2e86ab,

  cameraBody: 0x1f2933,
  cameraAccent: 0x2e86ab,

  fov: 0x5b9bd5,

  trajectory: 0x2a5c8a,
  trajectoryGhost: 0x9aa5ac,

  obstacleWood: 0x9c7b53,
  obstacleMetal: 0x76797d,
  obstacleFabric: 0x6d7f8c,

  riskZone: 0xc1440e,
  avoidance: 0x2f9e44,
};

export const DIM = {
  corridorLength: 44,
  corridorWidth: 6,
  corridorHeight: 4,
  shelfHeight: 2.3,
};

// ---------------------------------------------------------------------------
// Cenários de navegação do experimento.
// Geometria baseada no protocolo: START -> 5 m -> T1 (início do desvio)
// -> 1,5 m -> obstáculo -> 1,5 m -> T2 -> END. Eixo +z é a direção da
// caminhada; visto pelo participante, esquerda = +x e direita = -x.
// ---------------------------------------------------------------------------
// Perfil de velocidade: o participante caminha em `speed` (m/s) e desacelera
// suavemente até `slowSpeed` conforme se aproxima da zona de risco (dentro de
// `slowRadius` metros do centro dela); ao se afastar, reacelera para `speed`.
export const WALK_SPEED = 1.15; // m/s (ritmo normal de caminhada)
export const SLOW_SPEED = 0.45; // m/s (aproximação cautelosa do obstáculo)
export const SLOW_RADIUS = 4.5; // m (raio de influência da desaceleração)

// Ambientes disponíveis no seletor. O layout do experimento (largura útil,
// trajetórias e obstáculos) é o mesmo em todos; muda o entorno.
export const ENVIRONMENTS = [
  { id: 'biblioteca', label: 'Biblioteca' },
  { id: 'corredor', label: 'Corredor (escola / prédio)' },
  { id: 'supermercado', label: 'Supermercado' },
  { id: 'calcada', label: 'Calçada (externo)' },
];

// Tipos de obstáculo disponíveis no seletor (a ordem define a prioridade de
// preenchimento das posições/slots do cenário). `envs` limita cada tipo aos
// ambientes onde ele faz sentido.
const STUDY = ['biblioteca', 'corredor']; // ambientes com mobiliário de estudo
const ALL_ENVS = ['biblioteca', 'corredor', 'supermercado', 'calcada'];

export const OBSTACLE_TYPES = [
  // Presentes em qualquer ambiente
  { id: 'duas-pessoas', label: 'Duas pessoas', envs: ALL_ENVS },
  { id: 'pessoa', label: 'Uma pessoa', envs: ALL_ENVS },
  { id: 'caixa', label: 'Caixa', envs: ALL_ENVS },
  // Mobiliário interno
  { id: 'mesa', label: 'Mesa', envs: STUDY },
  { id: 'cadeira', label: 'Cadeira', envs: STUDY },
  { id: 'carrinho', label: 'Carrinho', envs: ['biblioteca', 'corredor', 'supermercado'] },
  // Típicos de supermercado
  { id: 'expositor', label: 'Expositor promocional', envs: ['supermercado'] },
  { id: 'palete', label: 'Palete de reposição', envs: ['supermercado'] },
  // Objetos típicos de via pública
  { id: 'banca', label: 'Banca / quiosque', envs: ['calcada'] },
  { id: 'lixeira', label: 'Lixeira', envs: ['calcada'] },
  { id: 'bicicleta', label: 'Bicicleta', envs: ['calcada'] },
  { id: 'placa', label: 'Placa de rua', envs: ['calcada'] },
  { id: 'cones', label: 'Cones de obra', envs: ['calcada'] },
];

// Limites do controle de posição inicial do participante (metros).
// O X desloca a faixa inteira do experimento (trajetória + obstáculos);
// limitado a ±0,7 m para o pico do desvio (±1,5 m + curvatura do spline)
// não encostar nas estantes.
export const START_LIMITS = { x: [-0.7, 0.7], z: [0.5, 5.5] };
export const START_DEFAULT = { x: 0, z: 2 };

export const SCENARIOS = [
  {
    id: 'desvio-esquerda',
    label: 'Desvio à esquerda',
    requireObstacle: true, // não faz sentido desviar de nada: sempre ao menos 1 obstáculo
    speed: WALK_SPEED,
    // Como no protocolo real: caminha reto, desvia do obstáculo e SEGUE RETO
    // na nova faixa (não retorna ao centro).
    path: [
      [0, 0, 2], [0, 0, 8], [0, 0, 12],
      [1.5, 0, 13.4], [1.5, 0, 16.6],
      [1.5, 0, 18], [1.5, 0, 23],
    ],
    ghost: [[0, 0, 12], [0, 0, 19.5]], // curso original que atravessaria a mesa
    detourZ: [12.3, 16.8], // faixa da trajetória destacada como desvio
    risk: { center: [0, 0, 15], radius: 1.8 },
    // Slots (offsets x/z relativos ao centro da zona de risco) preenchidos
    // pelos tipos de obstáculo selecionados no painel. Nos cenários de desvio
    // os obstáculos se enfileiram AO LONGO do corredor (coluna em z), mantendo
    // a lateral livre para o participante passar com folga constante.
    obstacleSlots: [[0, 0], [0, 0.8], [0, -0.8], [0, 1.4], [0, -1.4]],
    // Os padrões são filtrados pelos tipos disponíveis no ambiente ativo
    // (ex.: 'mesa' em ambientes internos, 'banca' na calçada).
    defaultObstacles: ['mesa', 'expositor', 'banca'],
    markers: [
      { id: 'START', pos: [0, 0, 2] },
      { id: 'T1', pos: [0, 0, 12] },
      { id: 'T2', pos: [1.5, 0, 18] },
      { id: 'END', pos: [1.5, 0, 23] },
    ],
  },
  {
    id: 'desvio-direita',
    label: 'Desvio à direita',
    requireObstacle: true, // não faz sentido desviar de nada: sempre ao menos 1 obstáculo
    speed: WALK_SPEED,
    path: [
      [0, 0, 2], [0, 0, 8], [0, 0, 12],
      [-1.5, 0, 13.4], [-1.5, 0, 16.6],
      [-1.5, 0, 18], [-1.5, 0, 23],
    ],
    ghost: [[0, 0, 12], [0, 0, 19.5]],
    detourZ: [12.3, 16.8],
    risk: { center: [0, 0, 15], radius: 1.8 },
    obstacleSlots: [[0, 0], [0, 0.8], [0, -0.8], [0, 1.4], [0, -1.4]],
    defaultObstacles: ['duas-pessoas'],
    markers: [
      { id: 'START', pos: [0, 0, 2] },
      { id: 'T1', pos: [0, 0, 12] },
      { id: 'T2', pos: [-1.5, 0, 18] },
      { id: 'END', pos: [-1.5, 0, 23] },
    ],
  },
  {
    id: 'aproximacao-parada',
    label: 'Parada',
    requireObstacle: true, // a parada só existe se houver bloqueio: sempre ao menos 1 obstáculo
    speed: WALK_SPEED,
    path: [
      [0, 0, 2], [0, 0, 6], [0, 0, 10], [0, 0, 12],
    ],
    stop: true, // o corredor está bloqueado: o participante para ~2 m antes
    risk: { center: [0, 0, 14], radius: 1.8 },
    // Slots distribuídos pela largura do corredor (bloqueio da passagem).
    obstacleSlots: [[-1.3, 0.1], [0.5, 0], [1.5, 0.1], [-0.5, 0.8], [1.0, 0.9]],
    obstacleLabel: 'Obstáculo (passagem bloqueada)',
    defaultObstacles: ['mesa', 'expositor', 'banca', 'duas-pessoas', 'pessoa'],
    markers: [
      { id: 'START', pos: [0, 0, 2] },
      { id: 'T1', pos: [0, 0, 10] },
      { id: 'PARADA', pos: [0, 0, 12] },
    ],
  },
  {
    id: 'caminhada-livre',
    label: 'Caminho livre',
    speed: 1.7, // caminhada livre: ritmo mais acelerado
    path: [
      [0, 0, 2], [0, 0, 12], [0, 0, 24], [0, 0, 36],
    ],
    defaultObstacles: [], // corredor livre: seleção de obstáculos desabilitada
    markers: [
      { id: 'START', pos: [0, 0, 2] },
      { id: 'END', pos: [0, 0, 36] },
    ],
  },
];

// Recanto de leitura junto à parede-janela ao final do corredor
// (mesa/cadeiras tipo tubo vermelho + pessoa sentada, como no vídeo de referência).
export const READING_NOOK = { pos: [1.3, 0, 41.5], rotY: Math.PI * 0.85 };

// Gaps na estante lateral onde uma porta de passagem é inserida.
export const DOORS_LEFT_Z = [8, 30];
export const DOORS_RIGHT_Z = [17, 39];
export const CEILING_LIGHTS_Z = [4, 12, 20, 28, 36];
