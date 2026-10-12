import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import Peer from 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/+esm';

/* ============================================================
   CONSTANTS
   ============================================================ */
const CHUNK_SIZE   = 64;
const WORLD_HEIGHT = 8192;
const MAX_TERRAIN  = 8160;
const SEA_LEVEL    = 128;
const LOD_STEP     = 32;

const BLOCKS = {
    AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4,
    OAK_WOOD: 5, WATER: 6, SNOW: 7, OAK_LEAVES: 8,
    SPRUCE_WOOD: 9, SPRUCE_LEAVES: 10, ACACIA_WOOD: 11, ACACIA_LEAVES: 12,
    CACTUS: 13, BEDROCK: 14,
    OAK_PLANKS: 15, SPRUCE_PLANKS: 16, ACACIA_PLANKS: 17,
    STONE_BRICKS: 18, OVEN: 19, GLASS: 20, CRAFTING_TABLE: 21,
    TORCH: 22, RAW_MEAT: 23, COOKED_MEAT: 24
};

const TEXTURE_PATHS = {
    [BLOCKS.GRASS]: { top: 'textures/grass_top.png', side: 'textures/grass_side.png', bottom: 'textures/dirt.png' },
    [BLOCKS.DIRT]: 'textures/dirt.png',
    [BLOCKS.STONE]: 'textures/stone.png',
    [BLOCKS.SAND]: 'textures/sand.png',
    [BLOCKS.OAK_WOOD]: { top: 'textures/oak_log_top.png', side: 'textures/oak_log_side.png', bottom: 'textures/oak_log_top.png' },
    [BLOCKS.WATER]: 'textures/water.png',
    [BLOCKS.SNOW]: 'textures/snow.png',
    [BLOCKS.OAK_LEAVES]: 'textures/oak_leaves.png',
    [BLOCKS.SPRUCE_WOOD]: { top: 'textures/spruce_log_top.png', side: 'textures/spruce_log_side.png', bottom: 'textures/spruce_log_top.png' },
    [BLOCKS.SPRUCE_LEAVES]: 'textures/spruce_leaves.png',
    [BLOCKS.ACACIA_WOOD]: { top: 'textures/acacia_log_top.png', side: 'textures/acacia_log_side.png', bottom: 'textures/acacia_log_top.png' },
    [BLOCKS.ACACIA_LEAVES]: 'textures/acacia_leaves.png',
    [BLOCKS.CACTUS]: { top: 'textures/cactus_top.png', side: 'textures/cactus_side.png', bottom: 'textures/cactus_bottom.png' },
    [BLOCKS.BEDROCK]: 'textures/stone.png',
    [BLOCKS.OAK_PLANKS]:    'textures/plank_oak.png',
    [BLOCKS.SPRUCE_PLANKS]: 'textures/plank_spruce.png',
    [BLOCKS.ACACIA_PLANKS]: 'textures/plank_acacia.png',
    [BLOCKS.STONE_BRICKS]:  'textures/stone_brick.png',
    [BLOCKS.OVEN]: { top: 'textures/oven_side.png', side: 'textures/oven_front.png', bottom: 'textures/oven_side.png' },
    [BLOCKS.GLASS]: 'textures/glass.png',
    [BLOCKS.CRAFTING_TABLE]: {
        top: 'textures/crafting_table_top.png',
        side: 'textures/crafting_table_side.png',
        bottom: 'textures/plank_oak.png'
    },
    [BLOCKS.TORCH]:       'textures/torch.png',
    [BLOCKS.RAW_MEAT]:    'textures/raw_meat.png',
    [BLOCKS.COOKED_MEAT]: 'textures/cooked_meat.png'
};

const FALLBACK_COLORS = {
    'textures/grass_top.png': '#5fa73c', 'textures/grass_side.png': '#7b5c3a', 'textures/dirt.png': '#7b5c3a',
    'textures/stone.png': '#8d8d8d', 'textures/sand.png': '#ddd0a0',
    'textures/oak_log_top.png': '#b08a55', 'textures/oak_log_side.png': '#6b4f2a',
    'textures/water.png': '#2f6fd0', 'textures/snow.png': '#f2f7ff', 'textures/oak_leaves.png': '#3f7a2e',
    'textures/spruce_log_top.png': '#8b6b45', 'textures/spruce_log_side.png': '#4d3820',
    'textures/spruce_leaves.png': '#2f5c36',
    'textures/acacia_log_top.png': '#b4663a', 'textures/acacia_log_side.png': '#5a3a22',
    'textures/acacia_leaves.png': '#6f9a35',
    'textures/cactus_top.png': '#4f8f3a', 'textures/cactus_side.png': '#3f7c2e', 'textures/cactus_bottom.png': '#3f7c2e',
    'textures/plank_oak.png': '#b28a55', 'textures/plank_spruce.png': '#7a5a34', 'textures/plank_acacia.png': '#b4663a',
    'textures/stone_brick.png': '#9a9a9a',
    'textures/oven_front.png': '#5a5a5a', 'textures/oven_side.png': '#6c6c6c', 'textures/oven_active.png': '#ff8a45',
    'textures/glass.png': '#bfe0f0',
    'textures/crafting_table_top.png': '#8a6a3c', 'textures/crafting_table_side.png': '#7a5a34',
    'textures/torch.png': '#d9a440', 'textures/raw_meat.png': '#c76b6b', 'textures/cooked_meat.png': '#8a4a2b'
};

/* ============================================================
   MATERIAL TABLE
   ============================================================ */
const MATERIAL_SPECS = [];
const MAT_LUT = new Int16Array(32 * 3).fill(-1);
(function buildMaterialTable() {
    Object.keys(TEXTURE_PATHS).forEach(key => {
        const type = Number(key);
        const paths = TEXTURE_PATHS[key];
        if (typeof paths === 'string') {
            const slot = MATERIAL_SPECS.length;
            MATERIAL_SPECS.push({ type, path: paths });
            MAT_LUT[type * 3] = MAT_LUT[type * 3 + 1] = MAT_LUT[type * 3 + 2] = slot;
        } else {
            const side = MATERIAL_SPECS.length;
            MATERIAL_SPECS.push({ type, path: paths.side });
            const top = MATERIAL_SPECS.length;
            MATERIAL_SPECS.push({ type, path: paths.top });
            const bottom = MATERIAL_SPECS.length;
            MATERIAL_SPECS.push({ type, path: paths.bottom });
            MAT_LUT[type * 3] = side;
            MAT_LUT[type * 3 + 1] = top;
            MAT_LUT[type * 3 + 2] = bottom;
        }
    });
})();

/* ============================================================
   TERRAIN WORKER
   ============================================================ */
const WORKER_HEADER = `
const PAD = 4;
const PW = CHUNK + PAD * 2;
const COLS = PW * PW;
const COL_STRIDE = WORLD_H;
`;

const WORKER_TERRAIN = `
function splitmix32(a) {
    return function () {
        a |= 0; a = a + 0x9e3779b9 | 0;
        let t = a ^ a >>> 16; t = Math.imul(t, 0x21f0aaad);
        t = t ^ t >>> 15; t = Math.imul(t, 0x735a2d97);
        return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
    };
}
function permTable(seed) {
    const rng = splitmix32(seed);
    const list = [];
    for (let i = 0; i < 256; i++) list.push(i);
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const t = list[i]; list[i] = list[j]; list[j] = t;
    }
    const p = new Uint8Array(512);
    for (let i = 0; i < 256; i++) p[i] = p[i + 256] = list[i];
    return p;
}
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(t, a, b) { return a + t * (b - a); }
function mix(a, b, t) { return a + (b - a) * t; }
function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
function smoothstep(e0, e1, v) {
    const t = clamp01((v - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
}
function Noise2D(seed) {
    const p = permTable(seed);
    function grad(hash, x, y) {
        const h = hash & 7;
        const u = h < 4 ? x : y;
        const v = h < 4 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? 2 * v : -2 * v);
    }
    return function (x, y) {
        const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
        x -= Math.floor(x); y -= Math.floor(y);
        const u = fade(x), v = fade(y);
        const a = p[X] + Y, aa = p[a], ab = p[a + 1];
        const b = p[X + 1] + Y, ba = p[b], bb = p[b + 1];
        return 0.68 * lerp(v, lerp(u, grad(p[aa], x, y), grad(p[ba], x - 1, y)),
                              lerp(u, grad(p[ab], x, y - 1), grad(p[bb], x - 1, y - 1)));
    };
}
function Noise3D(seed) {
    const p = permTable(seed);
    function grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : (h === 12 || h === 14) ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    return function (x, y, z) {
        const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
        x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
        const u = fade(x), v = fade(y), w = fade(z);
        const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
        const Bc = p[X + 1] + Y, BA = p[Bc] + Z, BB = p[Bc + 1] + Z;
        return lerp(w,
            lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
                    lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
            lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
                    lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))));
    };
}
const ROT_C = Math.cos(0.7), ROT_S = Math.sin(0.7);
function fbm2(noise, x, z, octaves, persistence, freq) {
    let total = 0, amp = 1, max = 0, f = freq;
    let px = x, pz = z;
    for (let i = 0; i < octaves; i++) {
        total += noise(px * f, pz * f) * amp;
        max += amp; amp *= persistence; f *= 2;
        const nx = px * ROT_C - pz * ROT_S;
        pz = px * ROT_S + pz * ROT_C; px = nx;
    }
    const r = (total / max) * 1.42;
    return r < -1 ? -1 : (r > 1 ? 1 : r);
}
function ridged2(noise, x, z, octaves, freq) {
    let total = 0, amp = 1, max = 0, f = freq, weight = 1;
    let px = x, pz = z;
    for (let i = 0; i < octaves; i++) {
        let n = 1 - Math.abs(noise(px * f, pz * f));
        n = n * n * weight;
        weight = clamp01(n * 2.0);
        total += n * amp; max += amp; amp *= 0.5; f *= 2;
        const nx = px * ROT_C - pz * ROT_S;
        pz = px * ROT_S + pz * ROT_C; px = nx;
    }
    return total / max;
}
function fbm3(noise, x, y, z, octaves, persistence, freq) {
    let total = 0, amp = 1, max = 0, f = freq;
    for (let i = 0; i < octaves; i++) {
        total += noise(x * f, y * f, z * f) * amp;
        max += amp; amp *= persistence; f *= 2;
    }
    return total / max;
}
let worldSeed = 0;
let nContinent, nErosion, nRidge, nTemp, nHum, nRiver, nWarpA, nWarpB, nDetail, nLake;
let nCaveA, nCaveB, nCavern;
function hash3(x, y, z) {
    let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177) ^ worldSeed;
    n = (n ^ (n >>> 13)) | 0;
    n = Math.imul(n, 1274126177);
    n = (n ^ (n >>> 16)) >>> 0;
    return n / 4294967296;
}
const BIOME_FREQ = 0.0001, CONTINENT_FREQ = 0.000075, EROSION_FREQ = 0.000055;
const RIDGE_FREQ = 0.00015, RIVER_FREQ = 0.0005, DETAIL_FREQ = 0.00060;
const WARP_FREQ = 0.00008, WARP_AMP = 400;
const TUNNEL_T = 0.062, CAVERN_T = 0.46, CAVE_Y_MAX = 280;
const BIOME = { OCEAN: 0, BEACH: 1, PLAINS: 2, FOREST: 3, DESERT: 4, SAVANNA: 5, TAIGA: 6, TUNDRA: 7, MOUNTAIN: 8, PEAK: 9 };
const padVol = new Uint8Array(PW * PW * WORLD_H);
const colH = new Int32Array(COLS);
const colSurf = new Uint8Array(COLS);
const colSub = new Uint8Array(COLS);
const colSoil = new Uint8Array(COLS);
const colBiome = new Uint8Array(COLS);
const colTop = new Int16Array(COLS);
const GS = 4, GYS = 5;
const GXC = Math.floor((PW - 1) / GS) + 2, GZC = GXC;
const GYC = Math.floor(CAVE_Y_MAX / GYS) + 2;
const gridA = new Float32Array(GXC * GZC * GYC);
const gridB = new Float32Array(GXC * GZC * GYC);
const gridC = new Float32Array(GXC * GZC * GYC);
const colA = new Float32Array(GYC), colB = new Float32Array(GYC), colC = new Float32Array(GYC);
const maskBuf = new Int32Array(CHUNK * (WORLD_H + 2));
const tmpA = new Int32Array(3);

function elevationCurve(c) {
    let h = 24;
    h += 56 * smoothstep(-1.00, -0.45, c);
    h += 50 * smoothstep(-0.55, -0.10, c);
    h += 40 * smoothstep(-0.25,  0.10, c);
    h += 60 * smoothstep(-0.05,  0.30, c);
    h += 80 * smoothstep( 0.10,  0.55, c);
    h += 90 * smoothstep( 0.35,  0.90, c);
    return h;
}
function computeColumn(wx, wz, idx) {
    const warpA = fbm2(nWarpA, wx, wz, 2, 0.5, WARP_FREQ);
    const warpB = fbm2(nWarpB, wx, wz, 2, 0.5, WARP_FREQ);
    const qx = wx + warpA * WARP_AMP, qz = wz + warpB * WARP_AMP;
    const continent = fbm2(nContinent, qx, qz, 4, 0.45, CONTINENT_FREQ);
    const erosion = fbm2(nErosion, qx, qz, 3, 0.45, EROSION_FREQ);
    const ridge = ridged2(nRidge, qx, qz, 4, RIDGE_FREQ);
    const detail = fbm2(nDetail, wx, wz, 4, 0.50, DETAIL_FREQ);
    const rugged = 0.5 - 0.5 * erosion;
    let h = elevationCurve(continent);
    const land = smoothstep(-0.22, -0.05, continent);
    const reliefAmp = (2.0 + 26.0 * rugged) * land;
    h += detail * reliefAmp;
    const mountainMask = smoothstep(0.05, 0.60, continent) * (0.35 + 0.65 * rugged);
    const crest = ridge * ridge * (3 - 2 * ridge);
    h += mountainMask * crest * 850;
    const riverMask = smoothstep(-0.05, 0.20, continent) *
                      (1 - smoothstep(0.30, 0.65, mountainMask));
    if (riverMask > 0.001) {
        const riverVal = Math.abs(fbm2(nRiver, qx, qz, 3, 0.5, RIVER_FREQ));
        const bank = 0.085, core = 0.020;
        if (riverVal < bank) {
            const t = smoothstep(core, bank, riverVal);
            const seaFloor = SEA_LEVEL - 4;
            const localFloor = Math.max(seaFloor, h - 40);
            const target = localFloor + t * (h - localFloor);
            h = mix(h, target, riverMask);
        }
    }
    const lakeRaw = fbm2(nLake, qx * 1.7, qz * 1.7, 3, 0.5, 0.00050);
    const lakeMask = smoothstep(0.30, 0.55, lakeRaw) *
                     smoothstep(0.02, 0.15, continent) *
                     (1 - smoothstep(0.15, 0.35, mountainMask)) *
                     (1 - smoothstep(SEA_LEVEL + 10, SEA_LEVEL + 45, h));
    h -= lakeMask * 30;
    if (h > 900) h = 900 + 92 * (1 - Math.exp(-(h - 900) / 92));
    h = Math.floor(h);
    if (h < 2) h = 2;
    if (h > MAX_TERRAIN) h = MAX_TERRAIN;
    const temp = fbm2(nTemp, qx, qz, 2, 0.35, BIOME_FREQ);
    const hum = fbm2(nHum, qx + 4096, qz - 4096, 2, 0.35, BIOME_FREQ * 1.15);
    const t = temp - Math.max(0, h - SEA_LEVEL) * 0.0007;
    const snowLine = 600 + t * 300, rockLine = 350 + t * 250;
    let biome, surf, sub, soil = 3 + Math.floor(hash3(wx, 3, wz) * 3);
    if (h < SEA_LEVEL - 2) {
        biome = BIOME.OCEAN;
        surf = h > SEA_LEVEL - 14 ? B.SAND : B.DIRT;
        sub = surf;
    } else if (h <= SEA_LEVEL + 1) {
        biome = BIOME.BEACH;
        surf = t < -0.42 ? B.SNOW : B.SAND;
        sub = B.SAND;
    } else if (h >= snowLine) {
        biome = BIOME.PEAK; surf = B.SNOW; sub = B.STONE; soil = 2;
    } else if (h >= rockLine && mountainMask > 0.22) {
        biome = BIOME.MOUNTAIN; surf = B.STONE; sub = B.STONE; soil = 1;
    } else if (t < -0.52) { biome = BIOME.TUNDRA; surf = B.SNOW; sub = B.DIRT; }
    else if (t < -0.20) { biome = BIOME.TAIGA; surf = B.GRASS; sub = B.DIRT; }
    else if (t > 0.42 && hum < 0.05) { biome = BIOME.DESERT; surf = B.SAND; sub = B.SAND; soil = 4 + Math.floor(hash3(wx, 5, wz) * 3); }
    else if (t > 0.30) { biome = BIOME.SAVANNA; surf = B.GRASS; sub = B.DIRT; }
    else if (hum > 0.30) { biome = BIOME.FOREST; surf = B.GRASS; sub = B.DIRT; }
    else { biome = BIOME.PLAINS; surf = B.GRASS; sub = B.DIRT; }
    colH[idx] = h; colSurf[idx] = surf; colSub[idx] = sub; colSoil[idx] = soil; colBiome[idx] = biome;
}
function caveA(x, y, z) { return fbm3(nCaveA, x, y * 1.8, z, 2, 0.5, 0.0104); }
function caveB(x, y, z) { return fbm3(nCaveB, x + 811, y * 1.8, z - 397, 2, 0.5, 0.0104); }
function cavernN(x, y, z) { return fbm3(nCavern, x, y * 1.45, z, 2, 0.5, 0.0158); }
function fillCaveGrid(originX, originZ) {
    for (let ix = 0; ix < GXC; ix++) {
        const wx = originX + ix * GS - PAD;
        for (let iz = 0; iz < GZC; iz++) {
            const wz = originZ + iz * GS - PAD;
            const base = (ix * GZC + iz) * GYC;
            for (let iy = 0; iy < GYC; iy++) {
                const y = iy * GYS;
                gridA[base + iy] = caveA(wx, y, wz);
                gridB[base + iy] = caveB(wx, y, wz);
                gridC[base + iy] = cavernN(wx, y, wz);
            }
        }
    }
}
function prepareCaveColumn(px, pz) {
    const fx = (px + PAD) / GS, fz = (pz + PAD) / GS;
    const ix = Math.floor(fx), iz = Math.floor(fz);
    const tx = fx - ix, tz = fz - iz;
    const w00 = (1 - tx) * (1 - tz), w10 = tx * (1 - tz);
    const w01 = (1 - tx) * tz, w11 = tx * tz;
    const b00 = (ix * GZC + iz) * GYC;
    const b10 = ((ix + 1) * GZC + iz) * GYC;
    const b01 = (ix * GZC + iz + 1) * GYC;
    const b11 = ((ix + 1) * GZC + iz + 1) * GYC;
    for (let iy = 0; iy < GYC; iy++) {
        colA[iy] = gridA[b00 + iy] * w00 + gridA[b10 + iy] * w10 + gridA[b01 + iy] * w01 + gridA[b11 + iy] * w11;
        colB[iy] = gridB[b00 + iy] * w00 + gridB[b10 + iy] * w10 + gridB[b01 + iy] * w01 + gridB[b11 + iy] * w11;
        colC[iy] = gridC[b00 + iy] * w00 + gridC[b10 + iy] * w10 + gridC[b01 + iy] * w01 + gridC[b11 + iy] * w11;
    }
}
function isCave(y, h, underwater) {
    if (y < 5 || y > CAVE_Y_MAX - 6) return false;
    if (y > h - 6) return false;
    if (underwater && y > h - 12) return false;
    const fy = y / GYS, iy = Math.floor(fy), ty = fy - iy;
    const a = colA[iy] + (colA[iy + 1] - colA[iy]) * ty;
    const b = colB[iy] + (colB[iy + 1] - colB[iy]) * ty;
    let t = TUNNEL_T;
    if (y < 16) t *= 0.55;
    if (a > -t && a < t && b > -t && b < t) return true;
    if (y < 130) {
        const c = colC[iy] + (colC[iy + 1] - colC[iy]) * ty;
        const thr = CAVERN_T + Math.max(0, y - 66) * 0.005;
        if (c > thr) return true;
    }
    return false;
}
function voxAt(px, y, pz) {
    if (y < 0) return B.BEDROCK;
    if (y >= WORLD_H) return B.AIR;
    if (px < -PAD || px >= CHUNK + PAD || pz < -PAD || pz >= CHUNK + PAD) return B.AIR;
    return padVol[((px + PAD) * PW + (pz + PAD)) * COL_STRIDE + y];
}
function setVox(px, y, pz, type) {
    if (y < 0 || y >= WORLD_H) return;
    if (px < -PAD || px >= CHUNK + PAD || pz < -PAD || pz >= CHUNK + PAD) return;
    padVol[((px + PAD) * PW + (pz + PAD)) * COL_STRIDE + y] = type;
    if (type !== B.AIR) {
        const i = (px + PAD) * PW + (pz + PAD);
        if (y > colTop[i]) colTop[i] = y;
    }
}
function leaf(px, y, pz, type) { if (voxAt(px, y, pz) === B.AIR) setVox(px, y, pz, type); }
function treeChance(biome) {
    switch (biome) {
        case BIOME.FOREST: return 0.02125;
        case BIOME.PLAINS: return 0.001;
        case BIOME.TAIGA: return 0.0175;
        case BIOME.TUNDRA: return 0.0055;
        case BIOME.SAVANNA: return 0.003;
        case BIOME.DESERT: return 0.0025;
        default: return 0;
    }
}
function buildOak(px, h, pz, r) {
    const height = 4 + Math.floor(r * 3);
    for (let i = 1; i <= height; i++) setVox(px, h + i, pz, B.OAK_WOOD);
    for (let ly = height - 2; ly <= height + 1; ly++) {
        const rad = ly >= height ? 1 : 2;
        for (let lx = -rad; lx <= rad; lx++) for (let lz = -rad; lz <= rad; lz++) {
            if (rad > 1 && Math.abs(lx) === rad && Math.abs(lz) === rad) continue;
            if (lx === 0 && lz === 0 && ly <= height) continue;
            leaf(px + lx, h + ly, pz + lz, B.OAK_LEAVES);
        }
    }
}
function buildSpruce(px, h, pz, snowCap) {
    const height = 6 + Math.floor(hash3(px, 11, pz) * 4);
    for (let i = 1; i <= height; i++) setVox(px, h + i, pz, B.SPRUCE_WOOD);
    for (let ly = 2; ly <= height + 1; ly++) {
        const rad = (height + 1 - ly) % 2 === 0 ? 2 : 1;
        for (let lx = -rad; lx <= rad; lx++) for (let lz = -rad; lz <= rad; lz++) {
            if (rad > 1 && Math.abs(lx) === rad && Math.abs(lz) === rad) continue;
            if (lx === 0 && lz === 0 && ly <= height) continue;
            leaf(px + lx, h + ly, pz + lz, snowCap && ly === height + 1 ? B.SNOW : B.SPRUCE_LEAVES);
        }
    }
}
function buildAcacia(px, h, pz) {
    const height = 4 + Math.floor(hash3(px, 13, pz) * 3);
    for (let i = 1; i <= height; i++) setVox(px, h + i, pz, B.ACACIA_WOOD);
    for (let lx = -3; lx <= 3; lx++) for (let lz = -3; lz <= 3; lz++) {
        if (Math.abs(lx) + Math.abs(lz) > 4) continue;
        leaf(px + lx, h + height + 1, pz + lz, B.ACACIA_LEAVES);
        if (Math.abs(lx) + Math.abs(lz) <= 2) leaf(px + lx, h + height, pz + lz, B.ACACIA_LEAVES);
    }
}
function buildCactus(px, h, pz, r) {
    const height = 2 + Math.floor(r * 3);
    for (let i = 1; i <= height; i++) setVox(px, h + i, pz, B.CACTUS);
}
`;

const WORKER_CHUNK = `
function occludes(t) {
    return t !== B.AIR && t !== B.WATER && t !== B.GLASS && t !== B.TORCH &&
           t !== B.RAW_MEAT && t !== B.COOKED_MEAT &&
           t !== B.OAK_LEAVES && t !== B.SPRUCE_LEAVES && t !== B.ACACIA_LEAVES &&
           t !== B.CACTUS;
}
function faceVisible(self_, neighbour) {
    if (occludes(neighbour)) return false;
    if (neighbour === self_) return false;
    return true;
}
const AO_SHADE = [0.42, 0.63, 0.82, 1.0];
function aoPack(ox, oy, oz, u, v) {
    let packed = 0;
    for (let c = 0; c < 4; c++) {
        const du = (c === 1 || c === 2) ? 1 : -1;
        const dv = (c === 2 || c === 3) ? 1 : -1;
        tmpA[0] = ox; tmpA[1] = oy; tmpA[2] = oz;
        tmpA[u] += du;
        const s1 = occludes(voxAt(tmpA[0], tmpA[1], tmpA[2])) ? 1 : 0;
        tmpA[0] = ox; tmpA[1] = oy; tmpA[2] = oz;
        tmpA[v] += dv;
        const s2 = occludes(voxAt(tmpA[0], tmpA[1], tmpA[2])) ? 1 : 0;
        tmpA[u] += du;
        const cn = occludes(voxAt(tmpA[0], tmpA[1], tmpA[2])) ? 1 : 0;
        const ao = (s1 === 1 && s2 === 1) ? 0 : (3 - s1 - s2 - cn);
        packed |= ao << (c * 2);
    }
    return packed;
}
function newBucket() { return { pos: [], norm: [], uv: [], col: [], meta: [], quads: 0 }; }
function emitQuad(bucket, p, du, dv, nx, ny, nz, uvs, ao, flag, isBottomFace, forward) {
    const x0 = p[0], y0 = p[1], z0 = p[2];
    const vx = [x0, x0 + du[0], x0 + du[0] + dv[0], x0 + dv[0]];
    const vy = [y0, y0 + du[1], y0 + du[1] + dv[1], y0 + dv[1]];
    const vz = [z0, z0 + du[2], z0 + du[2] + dv[2], z0 + dv[2]];
    if (flag && !isBottomFace) {
        let maxY = vy[0];
        for (let i = 1; i < 4; i++) if (vy[i] > maxY) maxY = vy[i];
        for (let i = 0; i < 4; i++) if (vy[i] === maxY) vy[i] -= 0.125;
    }
    const a0 = ao & 3, a1 = (ao >> 2) & 3, a2 = (ao >> 4) & 3, a3 = (ao >> 6) & 3;
    const shade = [AO_SHADE[a0], AO_SHADE[a1], AO_SHADE[a2], AO_SHADE[a3]];
    for (let i = 0; i < 4; i++) {
        bucket.pos.push(vx[i], vy[i], vz[i]);
        bucket.norm.push(nx, ny, nz);
        bucket.uv.push(uvs[i * 2], uvs[i * 2 + 1]);
        const s = shade[i];
        bucket.col.push(s, s, s);
    }
    const flip = (a0 + a2) > (a1 + a3) ? 1 : 0;
    bucket.meta.push((forward << 1) | flip);
    bucket.quads++;
}
function greedyMesh(originX, originZ, yLimit, waterPass, buckets) {
    const dims = [CHUNK, yLimit, CHUNK];
    const x = [0, 0, 0], q = [0, 0, 0];
    const du = [0, 0, 0], dv = [0, 0, 0], pos = [0, 0, 0];
    const uvs = new Float32Array(8);
    for (let d = 0; d < 3; d++) {
        const u = (d + 1) % 3, v = (d + 2) % 3;
        const dimU = dims[u], dimV = dims[v];
        q[0] = q[1] = q[2] = 0; q[d] = 1;
        for (x[d] = -1; x[d] < dims[d];) {
            let n = 0;
            for (x[v] = 0; x[v] < dimV; x[v]++) {
                for (x[u] = 0; x[u] < dimU; x[u]++, n++) {
                    const a = voxAt(x[0], x[1], x[2]);
                    const b = voxAt(x[0] + q[0], x[1] + q[1], x[2] + q[2]);
                    let aWins, bWins;
                    if (waterPass) {
                        aWins = a === B.WATER && b === B.AIR;
                        bWins = !aWins && b === B.WATER && a === B.AIR;
                    } else {
                        aWins = a !== B.AIR && a !== B.WATER && faceVisible(a, b);
                        bWins = !aWins && b !== B.AIR && b !== B.WATER && faceVisible(b, a);
                    }
                    let src = 0, dir = 0, ox = 0, oy = 0, oz = 0;
                    if (aWins && x[d] >= 0) { src = a; dir = 1; ox = x[0] + q[0]; oy = x[1] + q[1]; oz = x[2] + q[2]; }
                    else if (bWins && x[d] < dims[d] - 1) { src = b; dir = 0; ox = x[0]; oy = x[1]; oz = x[2]; }
                    if (src === 0) { maskBuf[n] = 0; continue; }
                    let ao = 255, flag = 0;
                    if (waterPass) {
                        const cellY = dir === 1 ? x[1] : x[1] + q[1];
                        const cx2 = dir === 1 ? x[0] : x[0] + q[0];
                        const cz2 = dir === 1 ? x[2] : x[2] + q[2];
                        if (voxAt(cx2, cellY + 1, cz2) === B.AIR) flag = 1;
                    } else if (occludes(src)) ao = aoPack(ox, oy, oz, u, v);
                    maskBuf[n] = src | (dir << 5) | (ao << 6) | (flag << 14);
                }
            }
            x[d]++;
            n = 0;
            for (let j = 0; j < dimV; j++) {
                for (let i = 0; i < dimU;) {
                    const key = maskBuf[n];
                    if (key === 0) { i++; n++; continue; }
                    let w = 1;
                    while (i + w < dimU && maskBuf[n + w] === key) w++;
                    let h = 1, done = false;
                    while (j + h < dimV && !done) {
                        for (let k = 0; k < w; k++) {
                            if (maskBuf[n + k + h * dimU] !== key) { done = true; break; }
                        }
                        if (!done) h++;
                    }
                    const type = key & 31, dir = (key >> 5) & 1;
                    const ao = (key >> 6) & 255, flag = (key >> 14) & 1;
                    x[u] = i; x[v] = j;
                    du[0] = du[1] = du[2] = 0; dv[0] = dv[1] = dv[2] = 0;
                    du[u] = w; dv[v] = h;
                    pos[0] = x[0]; pos[1] = x[1]; pos[2] = x[2];
                    const sign = dir === 1 ? 1 : -1;
                    const nx = d === 0 ? sign : 0;
                    const ny = d === 1 ? sign : 0;
                    const nz = d === 2 ? sign : 0;
                    if (d === 2) {
                        const uo = originX;
                        uvs[0] = uo + i; uvs[1] = -j;
                        uvs[2] = uo + i + w; uvs[3] = -j;
                        uvs[4] = uo + i + w; uvs[5] = -(j + h);
                        uvs[6] = uo + i; uvs[7] = -(j + h);
                    } else if (d === 1) {
                        const uo = originX, vo = originZ;
                        uvs[0] = uo + j; uvs[1] = vo + i;
                        uvs[2] = uo + j; uvs[3] = vo + i + w;
                        uvs[4] = uo + j + h; uvs[5] = vo + i + w;
                        uvs[6] = uo + j + h; uvs[7] = vo + i;
                    } else {
                        const uo = originZ;
                        uvs[0] = uo + j; uvs[1] = -i;
                        uvs[2] = uo + j; uvs[3] = -(i + w);
                        uvs[4] = uo + j + h; uvs[5] = -(i + w);
                        uvs[6] = uo + j + h; uvs[7] = -i;
                    }
                    let slot;
                    if (waterPass) slot = 0;
                    else {
                        const faceKind = d === 1 ? (dir === 1 ? 1 : 2) : 0;
                        slot = MAT_LUT[type * 3 + faceKind];
                        if (slot < 0) slot = MAT_LUT[type * 3];
                    }
                    let bucket = buckets[slot];
                    if (!bucket) { bucket = newBucket(); buckets[slot] = bucket; }
                    emitQuad(bucket, pos, du, dv, nx, ny, nz, uvs, ao, flag, d === 1 && dir === 0, dir);
                    for (let l = 0; l < h; l++) for (let k = 0; k < w; k++) maskBuf[n + k + l * dimU] = 0;
                    i += w; n += w;
                }
            }
        }
    }
}
function packBuckets(buckets) {
    let totalQuads = 0;
    for (const slot in buckets) totalQuads += buckets[slot].quads;
    if (totalQuads === 0) return null;
    const positions = new Float32Array(totalQuads * 12);
    const normals = new Float32Array(totalQuads * 12);
    const uvs = new Float32Array(totalQuads * 8);
    const colors = new Float32Array(totalQuads * 12);
    const indices = new Uint32Array(totalQuads * 6);
    const groups = [];
    let vBase = 0, iBase = 0;
    const slots = Object.keys(buckets).map(Number).sort((a, b) => a - b);
    for (const slot of slots) {
        const bucket = buckets[slot];
        const groupStart = iBase;
        positions.set(bucket.pos, vBase * 3);
        normals.set(bucket.norm, vBase * 3);
        uvs.set(bucket.uv, vBase * 2);
        colors.set(bucket.col, vBase * 3);
        const meta = bucket.meta;
        for (let qi = 0; qi < bucket.quads; qi++) {
            const v0 = vBase + qi * 4;
            const m = meta[qi] || 0;
            const forward = (m >> 1) & 1, flipped = m & 1;
            let a, b, c, e, f, g;
            if (flipped) { a = v0 + 1; b = v0 + 2; c = v0 + 3; e = v0 + 1; f = v0 + 3; g = v0; }
            else { a = v0; b = v0 + 1; c = v0 + 2; e = v0; f = v0 + 2; g = v0 + 3; }
            if (forward) {
                indices[iBase++] = a; indices[iBase++] = b; indices[iBase++] = c;
                indices[iBase++] = e; indices[iBase++] = f; indices[iBase++] = g;
            } else {
                indices[iBase++] = c; indices[iBase++] = b; indices[iBase++] = a;
                indices[iBase++] = g; indices[iBase++] = f; indices[iBase++] = e;
            }
        }
        groups.push(groupStart, iBase - groupStart, slot);
        vBase += bucket.quads * 4;
    }
    return { positions, normals, uvs, colors, indices, groups: new Int32Array(groups) };
}
function generateChunk(req) {
    const cx = req.cx | 0, cz = req.cz | 0;
    const originX = cx * CHUNK, originZ = cz * CHUNK;
    padVol.fill(0);
    colTop.fill(-1);
    for (let px = -PAD; px < CHUNK + PAD; px++)
        for (let pz = -PAD; pz < CHUNK + PAD; pz++)
            computeColumn(originX + px, originZ + pz, (px + PAD) * PW + (pz + PAD));
    fillCaveGrid(originX, originZ);
    for (let px = -PAD; px < CHUNK + PAD; px++) {
        for (let pz = -PAD; pz < CHUNK + PAD; pz++) {
            const i = (px + PAD) * PW + (pz + PAD);
            const h = colH[i], surf = colSurf[i], sub = colSub[i], soil = colSoil[i];
            const underwater = h <= SEA_LEVEL;
            const base = i * COL_STRIDE;
            const wx = originX + px, wz = originZ + pz;
            prepareCaveColumn(px, pz);
            let top = -1;
            const fillTo = underwater ? SEA_LEVEL : h;
            for (let y = 0; y <= fillTo; y++) {
                let t;
                if (y > h) t = B.WATER;
                else if (y === 0) t = B.BEDROCK;
                else if (y <= 2 && hash3(wx, y, wz) < (y === 1 ? 0.74 : 0.26)) t = B.BEDROCK;
                else if (isCave(y, h, underwater)) continue;
                else if (y === h) t = surf;
                else if (y > h - soil) t = sub;
                else t = B.STONE;
                padVol[base + y] = t;
                if (y > top) top = y;
            }
            colTop[i] = top;
        }
    }
    for (let px = -PAD; px < CHUNK + PAD; px++) {
        for (let pz = -PAD; pz < CHUNK + PAD; pz++) {
            const i = (px + PAD) * PW + (pz + PAD);
            const h = colH[i], biome = colBiome[i];
            if (h <= SEA_LEVEL + 1) continue;
            const p = treeChance(biome);
            if (p <= 0) continue;
            const ground = voxAt(px, h, pz);
            if (ground !== colSurf[i] || ground === B.AIR) continue;
            const wx = originX + px, wz = originZ + pz;
            const r = hash3(wx, 7, wz);
            if (r >= p) continue;
            let winner = true;
            for (let ox = -2; ox <= 2 && winner; ox++) {
                for (let oz = -2; oz <= 2; oz++) {
                    if (ox === 0 && oz === 0) continue;
                    const nr = hash3(wx + ox, 7, wz + oz);
                    if (nr < p && nr > r) { winner = false; break; }
                }
            }
            if (!winner) continue;
            const shape = hash3(wx, 17, wz);
            if (biome === BIOME.DESERT) buildCactus(px, h, pz, shape);
            else if (biome === BIOME.TUNDRA) buildSpruce(px, h, pz, true);
            else if (biome === BIOME.TAIGA) buildSpruce(px, h, pz, shape > 0.75);
            else if (biome === BIOME.SAVANNA) buildAcacia(px, h, pz);
            else buildOak(px, h, pz, shape);
        }
    }
    const edits = req.edits;
    if (edits) {
        for (const chunkKey in edits) {
            const ck = chunkKey.split(',');
            const dx = (Number(ck[0]) - cx) * CHUNK;
            const dz = (Number(ck[1]) - cz) * CHUNK;
            const map = edits[chunkKey];
            for (const bk in map) {
                const parts = bk.split(',');
                const px = Number(parts[0]) + dx;
                const y = Number(parts[1]);
                const pz = Number(parts[2]) + dz;
                if (px < -PAD || px >= CHUNK + PAD || pz < -PAD || pz >= CHUNK + PAD) continue;
                if (y < 0 || y >= WORLD_H) continue;
                const i = (px + PAD) * PW + (pz + PAD);
                padVol[i * COL_STRIDE + y] = map[bk];
                if (map[bk] !== B.AIR && y > colTop[i]) colTop[i] = y;
                else if (map[bk] === B.AIR && y === colTop[i]) {
                    let ny = y - 1;
                    while (ny >= 0 && padVol[i * COL_STRIDE + ny] === B.AIR) ny--;
                    colTop[i] = ny;
                }
            }
        }
    }
    let maxTop = 0;
    for (let px = 0; px < CHUNK; px++)
        for (let pz = 0; pz < CHUNK; pz++) {
            const t = colTop[(px + PAD) * PW + (pz + PAD)];
            if (t > maxTop) maxTop = t;
        }
    const volH = Math.min(WORLD_H, maxTop + 9);
    const volume = new Uint8Array(CHUNK * CHUNK * volH);
    for (let px = 0; px < CHUNK; px++)
        for (let pz = 0; pz < CHUNK; pz++) {
            const src = ((px + PAD) * PW + (pz + PAD)) * COL_STRIDE;
            const dst = (px * CHUNK + pz) * volH;
            for (let y = 0; y < volH; y++) volume[dst + y] = padVol[src + y];
        }
    const solidBuckets = {};
    greedyMesh(originX, originZ, volH, false, solidBuckets);
    const solid = packBuckets(solidBuckets);
    const waterBuckets = {};
    greedyMesh(originX, originZ, volH, true, waterBuckets);
    const water = packBuckets(waterBuckets);
    const transfer = [volume.buffer];
    if (solid) transfer.push(solid.positions.buffer, solid.normals.buffer, solid.uvs.buffer, solid.colors.buffer, solid.indices.buffer, solid.groups.buffer);
    if (water) transfer.push(water.positions.buffer, water.normals.buffer, water.uvs.buffer, water.colors.buffer, water.indices.buffer, water.groups.buffer);
    self.postMessage({
        type: 'chunk', worldId: req.worldId, rev: req.rev, cx, cz,
        volH, volume, solid, water
    }, transfer);
}
`;

const WORKER_LOD = `
const LOD_WATER_COLOR = [0.16, 0.34, 0.58];
function biomeColor(b) {
    switch (b) {
        case BIOME.OCEAN:    return [0.16, 0.34, 0.58];
        case BIOME.BEACH:    return [0.84, 0.79, 0.55];
        case BIOME.PLAINS:   return [0.42, 0.65, 0.28];
        case BIOME.FOREST:   return [0.24, 0.46, 0.22];
        case BIOME.DESERT:   return [0.85, 0.76, 0.45];
        case BIOME.SAVANNA:  return [0.62, 0.64, 0.32];
        case BIOME.TAIGA:    return [0.27, 0.42, 0.30];
        case BIOME.TUNDRA:   return [0.76, 0.82, 0.86];
        case BIOME.MOUNTAIN: return [0.50, 0.50, 0.48];
        case BIOME.PEAK:     return [0.93, 0.95, 0.99];
        default:             return [0.50, 0.50, 0.50];
    }
}
function generateLodChunk(req) {
    const cx = req.cx | 0, cz = req.cz | 0;
    const originX = cx * CHUNK, originZ = cz * CHUNK;
    const step = LOD_STEP;
    const cells = CHUNK / step;
    const N = cells + 2;
    const sH = new Float32Array(N * N);
    const sB = new Uint8Array(N * N);
    const sW = new Uint8Array(N * N);
    for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
            const wx = originX + (i - 1 + 0.5) * step;
            const wz = originZ + (j - 1 + 0.5) * step;
            computeColumn(wx, wz, 0);
            const terrH = colH[0];
            const isWater = terrH < SEA_LEVEL;
            sH[j * N + i] = isWater ? SEA_LEVEL : terrH;
            sB[j * N + i] = colBiome[0];
            sW[j * N + i] = isWater ? 1 : 0;
        }
    }
    const positions = [], normals = [], colors = [], indices = [];
    function addQuad(a, b, c, d, nx, ny, nz, r, g, bl) {
        const base = positions.length / 3;
        positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
        normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
        colors.push(r, g, bl, r, g, bl, r, g, bl, r, g, bl);
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const TOP_SHADE = 1.00, NS_SHADE = 0.78, EW_SHADE = 0.58;
    for (let cj = 0; cj < cells; cj++) {
        for (let ci = 0; ci < cells; ci++) {
            const si = ci + 1, sj = cj + 1;
            const h = sH[sj * N + si];
            const b = sB[sj * N + si];
            const w = sW[sj * N + si];
            const baseCol = w ? LOD_WATER_COLOR : biomeColor(b);
            const [cr, cg, cb] = baseCol;
            const x0 = ci * step, x1 = x0 + step;
            const z0 = cj * step, z1 = z0 + step;
            addQuad([x0, h, z0], [x0, h, z1], [x1, h, z1], [x1, h, z0], 0, 1, 0,
                cr * TOP_SHADE, cg * TOP_SHADE, cb * TOP_SHADE);
            const hN = sH[(sj + 1) * N + si];
            if (hN < h) addQuad([x0, hN, z1], [x1, hN, z1], [x1, h, z1], [x0, h, z1],
                0, 0, 1, cr * NS_SHADE, cg * NS_SHADE, cb * NS_SHADE);
            const hS = sH[(sj - 1) * N + si];
            if (hS < h) addQuad([x1, hS, z0], [x0, hS, z0], [x0, h, z0], [x1, h, z0],
                0, 0, -1, cr * NS_SHADE, cg * NS_SHADE, cb * NS_SHADE);
            const hE = sH[sj * N + (si + 1)];
            if (hE < h) addQuad([x1, hE, z1], [x1, hE, z0], [x1, h, z0], [x1, h, z1],
                1, 0, 0, cr * EW_SHADE, cg * EW_SHADE, cb * EW_SHADE);
            const hW = sH[sj * N + (si - 1)];
            if (hW < h) addQuad([x0, hW, z0], [x0, hW, z1], [x0, h, z1], [x0, h, z0],
                -1, 0, 0, cr * EW_SHADE, cg * EW_SHADE, cb * EW_SHADE);
        }
    }
    const positionsArr = new Float32Array(positions);
    const normalsArr = new Float32Array(normals);
    const colorsArr = new Float32Array(colors);
    const indicesArr = new Uint32Array(indices);
    self.postMessage({
        type: 'lodChunk', worldId: req.worldId, rev: req.rev, cx, cz,
        positions: positionsArr, normals: normalsArr, colors: colorsArr, indices: indicesArr
    }, [positionsArr.buffer, normalsArr.buffer, colorsArr.buffer, indicesArr.buffer]);
}
`;

const WORKER_DISPATCH = `
self.onmessage = function (e) {
    const d = e.data;
    if (d.type === 'init') {
        worldSeed = d.seed | 0;
        const s = d.seed | 0;
        nContinent = Noise2D(s);
        nErosion = Noise2D(s + 131);
        nRidge = Noise2D(s + 277);
        nTemp = Noise2D(s + 419);
        nHum = Noise2D(s + 563);
        nRiver = Noise2D(s + 701);
        nWarpA = Noise2D(s + 859);
        nWarpB = Noise2D(s + 1013);
        nDetail = Noise2D(s + 1187);
        nLake = Noise2D(s + 1327);
        nCaveA = Noise3D(s + 1487);
        nCaveB = Noise3D(s + 1613);
        nCavern = Noise3D(s + 1789);
    } else if (d.type === 'generate') {
        if (!nContinent) return;
        generateChunk(d);
    } else if (d.type === 'generateLod') {
        if (!nContinent) return;
        generateLodChunk(d);
    }
};
`;

function workerSource() {
    return 'const CHUNK = ' + CHUNK_SIZE + ';\n' +
           'const WORLD_H = ' + WORLD_HEIGHT + ';\n' +
           'const MAX_TERRAIN = ' + MAX_TERRAIN + ';\n' +
           'const SEA_LEVEL = ' + SEA_LEVEL + ';\n' +
           'const LOD_STEP = ' + LOD_STEP + ';\n' +
           'const B = ' + JSON.stringify(BLOCKS) + ';\n' +
           'const MAT_LUT = ' + JSON.stringify(Array.from(MAT_LUT)) + ';\n' +
           WORKER_HEADER + WORKER_TERRAIN + WORKER_CHUNK + WORKER_LOD + WORKER_DISPATCH;
}

/* ============================================================
   ENGINE STATE
   ============================================================ */
let scene, camera, renderer, controls;
let sunLight, hemiLight, skyGroup, skyDome, sunSprite, moonSprite, moonGlowSprite;
let starField = null;
let workers = [], workerCursor = 0, workerUrl = null;

let RENDER_DISTANCE = 6;
let LOD_DISTANCE = 0;
let shadowsEnabled = true;

const chunkMeshes = new Map();
const lodMeshes = new Map();
const chunkData = new Map();
const pendingChunks = new Map();
const chunkRev = new Map();
const modifiedBlocks = new Map();

const materials = [];
let waterMaterial = null;
let lodMaterial = null;

let chunkQueue = [];
let readyQueue = [];
let lastCenterX = null, lastCenterZ = null;

let worldId = 0;
let currentSeedLabel = '';
let currentSeed = 0;
let gameState = 'menu';
let playerSpawned = false;
let coreKeys = null;
let initialTotal = 0, initialDone = 0, loadStartTime = 0;

const playerVelocity = new THREE.Vector3();
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let jumpHeld = false, sinkHeld = false, sprintHeld = false;
let onGround = false, inWater = false, submerged = false, wasInWater = false;
let waterSurfaceY = -Infinity;

const PLAYER_EYE = 1.62, PLAYER_HEAD = 0.18, PLAYER_RADIUS = 0.3;
const WALK_SPEED = 8, SPRINT_SPEED = 16, SWIM_SPEED = 4.3, JUMP_SPEED = 8.6;
const GRAVITY = 25.0, WATER_GRAVITY = 18.0, REACH = 7.0;

let prevTime = performance.now();
let frames = 0, lastFpsTime = 0, fps = 0;
let totalGameTime = 0.30 * 1440;
const DAY_DURATION = 1440;

const sunDir = new THREE.Vector3(0, 1, 0);
const moonDir = new THREE.Vector3(0, -1, 0);
let currentFogDensity = 0.012;
let baseFogDensity = 0.012;

const textureLoader = new THREE.TextureLoader();
const ui = {};

const ANIM = { walkPhase: 0, swimPhase: 0, jumpPose: 0, placePose: 0, moveAmount: 0, sprintAmount: 0 };
const ANIMBIT = {
    GROUND: 1 << 0, WATER: 1 << 1, SUBMERGED: 1 << 2, SPRINT: 1 << 3,
    JUMP: 1 << 4, PLACE: 1 << 5, MOVING: 1 << 6
};

/* ============================================================
   PLAYER AVATAR + FP ARMS
   ============================================================ */
let playerAvatar = null, fpArmsGroup = null, fpRightArmRef = null, fpLeftArmRef = null;
let heldBlockFP = null, heldBlockTP = null, thirdPerson = false, ownNameTag = null;

const SKIN_COLOR  = 0xe8b48a;
const SHIRT_COLOR = 0x3a6ea5;
const PANTS_COLOR = 0x2a3550;
const SHOE_COLOR  = 0x1a1a1a;
const HAIR_COLOR  = 0x3a2418;

function makeHeldBlockMaterial() { return new THREE.MeshLambertMaterial({ color: 0xffffff }); }

function updateHeldBlock() {
    const s = inventory.slots[inventory.selected];
    const type = s ? s.type : 0;
    if (!type) {
        if (heldBlockFP) heldBlockFP.visible = false;
        if (heldBlockTP) heldBlockTP.visible = false;
        return;
    }
    const sideSlot = MAT_LUT[type * 3];
    if (sideSlot < 0) return;
    const srcMap = materials[sideSlot] ? materials[sideSlot].map : null;
    for (const m of [heldBlockFP, heldBlockTP]) {
        if (!m || !m.material) continue;
        m.visible = true;
        m.material.map = srcMap;
        m.material.color.set(0xffffff);
        m.material.needsUpdate = true;
    }
}

function makeNameTagTexture(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const pad = 8, r = 24;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.moveTo(pad + r, pad);
    ctx.lineTo(canvas.width - pad - r, pad);
    ctx.quadraticCurveTo(canvas.width - pad, pad, canvas.width - pad, pad + r);
    ctx.lineTo(canvas.width - pad, canvas.height - pad - r);
    ctx.quadraticCurveTo(canvas.width - pad, canvas.height - pad, canvas.width - pad - r, canvas.height - pad);
    ctx.lineTo(pad + r, canvas.height - pad);
    ctx.quadraticCurveTo(pad, canvas.height - pad, pad, canvas.height - pad - r);
    ctx.lineTo(pad, pad + r);
    ctx.quadraticCurveTo(pad, pad, pad + r, pad);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(name || 'Player').slice(0, 20), canvas.width / 2, canvas.height / 2 + 4);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    return tex;
}
function makeNameTagSprite(name, scale) {
    const tex = makeNameTagTexture(name);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(scale || 2.4, (scale || 2.4) * 0.25, 1);
    sprite.renderOrder = 999;
    return sprite;
}
function updateNameTagSprite(sprite, name) {
    const oldTex = sprite.material.map;
    sprite.material.map = makeNameTagTexture(name);
    sprite.material.needsUpdate = true;
    if (oldTex) oldTex.dispose();
}

function buildFirstPersonArms() {
    fpArmsGroup = new THREE.Group();
    fpArmsGroup.renderOrder = 1000;
    camera.add(fpArmsGroup);
    const skinMat = new THREE.MeshLambertMaterial({ color: SKIN_COLOR });
    const sleeveMat = new THREE.MeshLambertMaterial({ color: SHIRT_COLOR });

    const rArmGeo = new THREE.BoxGeometry(0.16, 0.16, 0.58); rArmGeo.translate(0, 0, -0.29);
    fpRightArmRef = new THREE.Mesh(rArmGeo, skinMat);
    fpRightArmRef.position.set(0.38, -0.30, -0.14);
    fpRightArmRef.rotation.set(-0.12, 0.14, 0);
    fpArmsGroup.add(fpRightArmRef);
    const rSleeveGeo = new THREE.BoxGeometry(0.19, 0.19, 0.20); rSleeveGeo.translate(0, 0, -0.10);
    fpRightArmRef.add(new THREE.Mesh(rSleeveGeo, sleeveMat));

    const lArmGeo = new THREE.BoxGeometry(0.16, 0.16, 0.58); lArmGeo.translate(0, 0, -0.29);
    fpLeftArmRef = new THREE.Mesh(lArmGeo, skinMat);
    fpLeftArmRef.position.set(-0.42, -0.38, -0.10);
    fpLeftArmRef.rotation.set(-0.28, -0.12, 0);
    fpArmsGroup.add(fpLeftArmRef);
    const lSleeveGeo = new THREE.BoxGeometry(0.19, 0.19, 0.20); lSleeveGeo.translate(0, 0, -0.10);
    fpLeftArmRef.add(new THREE.Mesh(lSleeveGeo, sleeveMat));

    heldBlockFP = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.30, 0.30), makeHeldBlockMaterial());
    heldBlockFP.position.set(0, -0.02, -0.62);
    heldBlockFP.rotation.set(0.15, Math.PI / 8, 0);
    fpRightArmRef.add(heldBlockFP);
    updateHeldBlock();
}

function buildPlayerAvatar() {
    playerAvatar = new THREE.Group();
    playerAvatar.visible = false;
    scene.add(playerAvatar);

    const skinMat  = new THREE.MeshLambertMaterial({ color: SKIN_COLOR });
    const shirtMat = new THREE.MeshLambertMaterial({ color: SHIRT_COLOR });
    const pantsMat = new THREE.MeshLambertMaterial({ color: PANTS_COLOR });
    const shoeMat  = new THREE.MeshLambertMaterial({ color: SHOE_COLOR });
    const hairMat  = new THREE.MeshLambertMaterial({ color: HAIR_COLOR });
    const eyeMat   = new THREE.MeshBasicMaterial({ color: 0x1a1a2a });

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
    head.position.set(0, 1.55, 0);
    playerAvatar.add(head);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.10, 0.52), hairMat);
    hair.position.set(0, 1.83, 0);
    playerAvatar.add(hair);
    const eyeGeo = new THREE.BoxGeometry(0.10, 0.09, 0.02);
    for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(sx * 0.11, 1.60, -0.251);
        playerAvatar.add(eye);
    }
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), shirtMat);
    torso.position.set(0, 1.05, 0);
    playerAvatar.add(torso);
    const armGeo = new THREE.BoxGeometry(0.18, 0.70, 0.18); armGeo.translate(0, -0.35, 0);
    const armL = new THREE.Mesh(armGeo, skinMat); armL.position.set(-0.34, 1.42, 0); playerAvatar.add(armL);
    const armR = new THREE.Mesh(armGeo, skinMat); armR.position.set(0.34, 1.42, 0); playerAvatar.add(armR);
    const sleeveGeo = new THREE.BoxGeometry(0.20, 0.24, 0.20); sleeveGeo.translate(0, -0.12, 0);
    armL.add(new THREE.Mesh(sleeveGeo, shirtMat));
    armR.add(new THREE.Mesh(sleeveGeo, shirtMat));
    const legGeo = new THREE.BoxGeometry(0.20, 0.75, 0.20); legGeo.translate(0, -0.375, 0);
    const legL = new THREE.Mesh(legGeo, pantsMat); legL.position.set(-0.13, 0.75, 0); playerAvatar.add(legL);
    const legR = new THREE.Mesh(legGeo, pantsMat); legR.position.set(0.13, 0.75, 0); playerAvatar.add(legR);
    const shoeGeo = new THREE.BoxGeometry(0.22, 0.10, 0.26);
    const shoeL = new THREE.Mesh(shoeGeo, shoeMat); shoeL.position.set(-0.13, 0.05, -0.02); playerAvatar.add(shoeL);
    const shoeR = new THREE.Mesh(shoeGeo, shoeMat); shoeR.position.set(0.13, 0.05, -0.02); playerAvatar.add(shoeR);

    heldBlockTP = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), makeHeldBlockMaterial());
    heldBlockTP.position.set(0, -0.78, -0.02);
    heldBlockTP.rotation.set(0, Math.PI / 8, 0);
    armR.add(heldBlockTP);
    ownNameTag = makeNameTagSprite(NET.myName || 'You', 2.4);
    ownNameTag.position.set(0, 2.85, 0);
    playerAvatar.add(ownNameTag);

    playerAvatar.userData.armL = armL;
    playerAvatar.userData.armR = armR;
    playerAvatar.userData.legL = legL;
    playerAvatar.userData.legR = legR;
    playerAvatar.userData.lean = 0;
    updateHeldBlock();
}

function computePoseInputs(delta) {
    const vx = playerVelocity.x, vz = playerVelocity.z;
    const horizontalSpeed = Math.sqrt(vx * vx + vz * vz);
    const moving = horizontalSpeed > 0.6;
    const sprinting = sprintHeld && moveForward && !inWater;
    ANIM.sprintAmount += ((sprinting ? 1 : 0) - ANIM.sprintAmount) * Math.min(1, delta * 6);
    ANIM.moveAmount += ((moving ? Math.min(1, horizontalSpeed / WALK_SPEED) : 0) - ANIM.moveAmount) * Math.min(1, delta * 8);
    const swimming = inWater && !onGround;
    const jumping = !onGround && !inWater && playerVelocity.y > 0.5;
    ANIM.jumpPose += ((jumping ? 1 : 0) - ANIM.jumpPose) * Math.min(1, delta * (jumping ? 14 : 8));
    if (ANIM.placePose > 0) ANIM.placePose = Math.max(0, ANIM.placePose - delta * 3.6);
    if (swimming) ANIM.swimPhase += delta * (5 + horizontalSpeed * 0.35);
    else if (moving) ANIM.walkPhase += delta * (sprinting ? 14 : 9) * (0.6 + 0.4 * ANIM.moveAmount);
    else { ANIM.walkPhase *= Math.max(0, 1 - delta * 8); if (Math.abs(ANIM.walkPhase) < 0.02) ANIM.walkPhase = 0; }
    if (ANIM.walkPhase > 1e6 || ANIM.walkPhase < -1e6) ANIM.walkPhase = 0;
    return { swimming };
}

function poseFirstPersonArms(delta, pose) {
    if (!fpArmsGroup) return;
    const walk = Math.sin(ANIM.walkPhase), walkAlt = Math.cos(ANIM.walkPhase);
    const moveA = ANIM.moveAmount, sprintA = ANIM.sprintAmount;
    const jumpA = ANIM.jumpPose, placeA = Math.sin(ANIM.placePose * Math.PI);
    const swimA = pose.swimming ? 1 : 0;
    let baseY = -0.02 + walkAlt * 0.018 * moveA + sprintA * -0.02 + jumpA * 0.08;
    let baseRZ = walk * 0.04 * moveA, baseRX = walk * 0.03 * moveA - sprintA * 0.15 - jumpA * 0.35;
    if (swimA > 0.5) {
        baseY += Math.sin(ANIM.swimPhase) * 0.05;
        baseRX += Math.sin(ANIM.swimPhase) * 0.35 - 0.2;
        baseRZ += Math.cos(ANIM.swimPhase) * 0.12;
    }
    fpArmsGroup.position.set(walk * 0.012 * moveA, baseY, 0);
    fpArmsGroup.rotation.z = baseRZ; fpArmsGroup.rotation.x = baseRX;
    if (fpRightArmRef) {
        let rx = -0.12 + walk * 0.06 * moveA - sprintA * 0.10 - jumpA * 0.15;
        let ry = 0.14;
        if (swimA > 0.5) { rx = -0.4 + Math.sin(ANIM.swimPhase) * 0.5; ry = 0.14 + Math.cos(ANIM.swimPhase) * 0.25; }
        if (placeA > 0.01) { rx -= placeA * 1.1; ry -= placeA * 0.25; }
        fpRightArmRef.rotation.set(rx, ry, 0);
    }
    if (fpLeftArmRef) {
        let rx = -0.28 - walk * 0.05 * moveA - sprintA * 0.10 - jumpA * 0.20;
        let ry = -0.12;
        if (swimA > 0.5) { rx = -0.4 + Math.sin(ANIM.swimPhase + Math.PI) * 0.5; ry = -0.14 - Math.cos(ANIM.swimPhase + Math.PI) * 0.25; }
        fpLeftArmRef.rotation.set(rx, ry, fpLeftArmRef.rotation.z);
    }
}

function poseThirdPersonAvatar(delta, pose) {
    if (!playerAvatar || !playerAvatar.visible) return;
    playerAvatar.position.set(camera.position.x, camera.position.y - PLAYER_EYE, camera.position.z);
    playerAvatar.rotation.y = camera.rotation.y;
    const armL = playerAvatar.userData.armL, armR = playerAvatar.userData.armR;
    const legL = playerAvatar.userData.legL, legR = playerAvatar.userData.legR;
    const walk = Math.sin(ANIM.walkPhase);
    const moveA = ANIM.moveAmount, sprintA = ANIM.sprintAmount;
    const jumpA = ANIM.jumpPose, placeA = Math.sin(ANIM.placePose * Math.PI);
    const swimA = pose.swimming ? 1 : 0;
    let targetLean = sprintA * 0.22;
    if (swimA > 0.5) targetLean = 1.15;
    else if (jumpA > 0.5) targetLean = -jumpA * 0.1;
    playerAvatar.userData.lean += (targetLean - playerAvatar.userData.lean) * Math.min(1, delta * 8);
    playerAvatar.rotation.x = -playerAvatar.userData.lean;
    if (swimA > 0.5) playerAvatar.position.y += 0.9;
    let legSwing = walk * 0.85 * moveA, armSwing = walk * 0.9 * moveA;
    legSwing *= 1 + sprintA * 0.4; armSwing *= 1 + sprintA * 0.3;
    if (legL && legR) { legL.rotation.x = -legSwing + jumpA * 0.6; legR.rotation.x = legSwing + jumpA * 0.6; }
    let aL, aR;
    if (swimA > 0.5) {
        const s = Math.sin(ANIM.swimPhase);
        aL = -0.5 + s * 0.7; aR = -0.5 - s * 0.7;
    } else {
        aL = armSwing - jumpA - sprintA * 0.15;
        aR = -armSwing - jumpA - sprintA * 0.15;
    }
    if (placeA > 0.01) aR -= placeA * 1.2;
    if (armL) armL.rotation.x = aL;
    if (armR) armR.rotation.x = aR;
}

function updateAvatarVisuals(delta) {
    const pose = computePoseInputs(delta);
    poseFirstPersonArms(delta, pose);
    poseThirdPersonAvatar(delta, pose);
}
function toggleThirdPerson() {
    thirdPerson = !thirdPerson;
    if (playerAvatar) playerAvatar.visible = thirdPerson;
    if (fpArmsGroup) fpArmsGroup.visible = !thirdPerson;
    if (ownNameTag) ownNameTag.visible = thirdPerson;
}
function triggerPlaceAnimation() { ANIM.placePose = 1.0; }

/* ============================================================
   TEXTURES & MATERIALS
   ============================================================ */
function makeFallbackCanvas(hex) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = hex || '#888';
    ctx.fillRect(0, 0, 16, 16);
    for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) {
        const n = (Math.random() - 0.5) * 0.18;
        ctx.fillStyle = 'rgba(' + (n > 0 ? '255,255,255' : '0,0,0') + ',' + Math.abs(n) + ')';
        ctx.fillRect(x, y, 1, 1);
    }
    return canvas;
}
function loadTexture(url) {
    const tex = textureLoader.load(url, undefined, undefined, () => {
        tex.image = makeFallbackCanvas(FALLBACK_COLORS[url]);
        tex.needsUpdate = true;
    });
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestMipmapLinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
}
function createMaterial(type, path) {
    const isWater = type === BLOCKS.WATER;
    const isLeaves = type === BLOCKS.OAK_LEAVES || type === BLOCKS.SPRUCE_LEAVES || type === BLOCKS.ACACIA_LEAVES;
    const isCactus = type === BLOCKS.CACTUS;
    const isBedrock = type === BLOCKS.BEDROCK;
    const isGlass = type === BLOCKS.GLASS;
    const options = { map: loadTexture(path), roughness: isBedrock ? 0.95 : 0.85, metalness: 0, vertexColors: true };
    if (isWater) Object.assign(options, { transparent: true, opacity: 0.86, depthWrite: true, side: THREE.DoubleSide, roughness: 0.12 });
    else if (isGlass) Object.assign(options, { transparent: true, opacity: 0.72, depthWrite: true, side: THREE.DoubleSide, roughness: 0.08, alphaTest: 0.02 });
    else if (isLeaves) Object.assign(options, { alphaTest: 0.5, side: THREE.DoubleSide });
    else if (isCactus) Object.assign(options, { alphaTest: 0.5, side: THREE.FrontSide });
    if (isBedrock) options.color = new THREE.Color(0x3a3a3a);
    return new THREE.MeshStandardMaterial(options);
}
function buildMaterials() {
    MATERIAL_SPECS.forEach((spec, i) => {
        materials[i] = createMaterial(spec.type, spec.path);
        if (spec.type === BLOCKS.WATER) waterMaterial = materials[i];
    });
    lodMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, fog: true, side: THREE.FrontSide });
}

/* ============================================================
   SKY
   ============================================================ */
const SKY_KEYS = [
    { t: 0.00, top: 0x0a1226, mid: 0x121a34, hor: 0x1c2438, light: 0xa8bce0, li: 0.64, hemi: 0.80 },
    { t: 0.21, top: 0x1c2442, mid: 0x424a7a, hor: 0x5c4c76, light: 0xb0a2d0, li: 0.88, hemi: 1.05 },
    { t: 0.26, top: 0x2e4a7d, mid: 0x8a6fa0, hor: 0xf0a15a, light: 0xffb07c, li: 0.70, hemi: 0.50 },
    { t: 0.33, top: 0x3d7bd6, mid: 0x86c0ef, hor: 0xd9ecfb, light: 0xffffff, li: 1.00, hemi: 0.70 },
    { t: 0.50, top: 0x2f6fd8, mid: 0x7fbcf0, hor: 0xcfe8fb, light: 0xffffff, li: 1.05, hemi: 0.75 },
    { t: 0.66, top: 0x3d7bd6, mid: 0x86c0ef, hor: 0xe8dfc6, light: 0xfff0d0, li: 0.95, hemi: 0.66 },
    { t: 0.74, top: 0x24365e, mid: 0x8a4a6e, hor: 0xf0713c, light: 0xff8a45, li: 0.58, hemi: 0.40 },
    { t: 0.80, top: 0x1c2442, mid: 0x424a7a, hor: 0x5c4c76, light: 0xa8a8d0, li: 0.88, hemi: 1.00 },
    { t: 1.00, top: 0x0a1226, mid: 0x121a34, hor: 0x1c2438, light: 0xa8bce0, li: 0.64, hemi: 0.80 }
];
const skyTop = new THREE.Color(), skyMid = new THREE.Color(), skyHor = new THREE.Color();
const lightColor = new THREE.Color(), tmpColorA = new THREE.Color(), tmpColorB = new THREE.Color();

function makeSunTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
    g.addColorStop(0.00, 'rgba(255,255,245,1)');
    g.addColorStop(0.34, 'rgba(255,241,190,1)');
    g.addColorStop(0.42, 'rgba(255,203,110,0.55)');
    g.addColorStop(0.70, 'rgba(255,170,70,0.16)');
    g.addColorStop(1.00, 'rgba(255,150,60,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    ctx.beginPath(); ctx.arc(64, 64, 40, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,250,228,1)'; ctx.fill();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
function makeMoonTexture(phase) {
    const S = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = S;
    const ctx = canvas.getContext('2d');
    const cx = S / 2, cy = S / 2, R = S * 0.42;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = '#e8e4d8'; ctx.fill();
    let s = 987654321;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let i = 0; i < 22; i++) {
        const a = rnd() * Math.PI * 2;
        const d = Math.sqrt(rnd()) * R * 0.82;
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, r = 2 + rnd() * 7;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(150,145,130,0.55)'; ctx.fill();
    }
    ctx.globalCompositeOperation = 'destination-out';
    const shadowOff = 2 * R - (phase / 8) * 4 * R;
    ctx.beginPath(); ctx.arc(cx + shadowOff, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = '#000'; ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    return tex;
}
function makeMoonGlowTexture() {
    const S = 128;
    const c = document.createElement('canvas'); c.width = c.height = S;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.22, S / 2, S / 2, S * 0.5);
    g.addColorStop(0.0, 'rgba(200,218,255,0.30)');
    g.addColorStop(0.5, 'rgba(170,195,255,0.10)');
    g.addColorStop(1.0, 'rgba(150,180,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
function makeStarField() {
    const COUNT = 1800;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const R = 1900;
    for (let i = 0; i < COUNT; i++) {
        const u = Math.random() * 2 - 1;
        const t = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.max(0, 1 - u * u));
        pos[i * 3] = Math.cos(t) * r * R;
        pos[i * 3 + 1] = u * R;
        pos[i * 3 + 2] = Math.sin(t) * r * R;
        const b = 0.26 + Math.pow(Math.random(), 2.4) * 0.74;
        let cr = 1, cg = 1, cb = 1;
        const tint = Math.random();
        if (tint < 0.14) { cr = 0.72; cg = 0.82; cb = 1.00; }
        else if (tint < 0.26) { cr = 1.00; cg = 0.86; cb = 0.68; }
        col[i * 3] = b * cr; col[i * 3 + 1] = b * cg; col[i * 3 + 2] = b * cb;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
        size: 2, sizeAttenuation: false, vertexColors: true,
        transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geo, mat);
    points.renderOrder = -998;
    points.frustumCulled = false;
    return points;
}

/* ---------- Clouds ---------- */
const cloudClusters = [];
let cloudGroup = null;
const CLOUD_Y_MIN = 350, CLOUD_Y_MAX = 600, CLOUD_TILE = 1600, CLOUD_COUNT = 48;
const CLOUD_LIGHT = new THREE.Vector3(0.35, 0.9, 0.25).normalize();

function buildCloudGeometry() {
    const positions = [], normals = [], colors = [], indices = [];
    const puffCount = 10 + Math.floor(Math.random() * 10);
    const spreadXZ = 40 + Math.random() * 40;
    const spreadY = 10 + Math.random() * 14;
    const puffs = [];
    for (let i = 0; i < puffCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.pow(Math.random(), 0.55);
        const px = Math.cos(angle) * radius * spreadXZ;
        const pz = Math.sin(angle) * radius * spreadXZ * 0.75;
        const py = (Math.random() - 0.5) * spreadY;
        const r = 20 + Math.random() * 26;
        puffs.push({ x: px, y: py, z: pz, r });
    }
    const SEG = 8, RING = 6;
    for (const puff of puffs) {
        const base = positions.length / 3;
        for (let iy = 0; iy <= RING; iy++) {
            const phi = (iy / RING) * Math.PI;
            const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);
            for (let ix = 0; ix <= SEG; ix++) {
                const theta = (ix / SEG) * Math.PI * 2;
                const nx = sinPhi * Math.cos(theta), ny = cosPhi, nz = sinPhi * Math.sin(theta);
                positions.push(puff.x + nx * puff.r, puff.y + ny * puff.r, puff.z + nz * puff.r);
                normals.push(nx, ny, nz);
                const dot = nx * CLOUD_LIGHT.x + ny * CLOUD_LIGHT.y + nz * CLOUD_LIGHT.z;
                let shade = 0.72 + 0.28 * (ny * 0.5 + 0.5) + 0.06 * dot;
                if (shade < 0.55) shade = 0.55;
                if (shade > 1.00) shade = 1.00;
                colors.push(shade, shade, shade);
            }
        }
        for (let iy = 0; iy < RING; iy++) for (let ix = 0; ix < SEG; ix++) {
            const a = base + iy * (SEG + 1) + ix, b = a + SEG + 1;
            indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeBoundingSphere();
    return geo;
}
function buildClouds() {
    cloudGroup = new THREE.Group();
    cloudGroup.renderOrder = -500;
    scene.add(cloudGroup);
    for (let i = 0; i < CLOUD_COUNT; i++) {
        const geo = buildCloudGeometry();
        const mat = new THREE.MeshBasicMaterial({
            vertexColors: true, fog: false, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.FrontSide
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = -500;
        cloudGroup.add(mesh);
        cloudClusters.push({
            mesh, mat,
            bx: (Math.random() - 0.5) * CLOUD_TILE,
            bz: (Math.random() - 0.5) * CLOUD_TILE,
            by: CLOUD_Y_MIN + Math.random() * (CLOUD_Y_MAX - CLOUD_Y_MIN),
            drift: 0.5 + Math.random() * 1.1,
            color: new THREE.Color()
        });
    }
}
function updateClouds() {
    if (!cloudGroup) return;
    const cam = camera.position;
    const drift = totalGameTime * 1.6;
    const dayFactor = THREE.MathUtils.clamp(sunDir.y * 3.0 + 0.15, 0, 1);
    const horizon = scene.fog.color;
    for (const c of cloudClusters) {
        let dx = c.bx + drift * c.drift - cam.x;
        dx -= Math.round(dx / CLOUD_TILE) * CLOUD_TILE;
        let dz = c.bz - cam.z;
        dz -= Math.round(dz / CLOUD_TILE) * CLOUD_TILE;
        c.mesh.position.set(cam.x + dx, c.by, cam.z + dz);
        const dist = Math.sqrt(dx * dx + dz * dz);
        const fade = THREE.MathUtils.clamp((dist - 280) / 480, 0, 1);
        if (fade >= 0.995) { c.mesh.visible = false; continue; }
        c.mesh.visible = true;
        c.color.copy(lightColor).multiplyScalar(0.30 + 0.70 * dayFactor);
        c.color.lerp(horizon, fade);
        c.mat.color.copy(c.color);
        c.mat.opacity = 0.95 * (1 - fade);
    }
}
function buildSky() {
    skyGroup = new THREE.Group();
    skyGroup.renderOrder = -1000;
    const skyMat = new THREE.ShaderMaterial({
        uniforms: {
            uTop: { value: new THREE.Color(0x2f6fd8) },
            uMid: { value: new THREE.Color(0x7fbcf0) },
            uHorizon: { value: new THREE.Color(0xcfe8fb) },
            uSunDir: { value: new THREE.Vector3(0, 1, 0) },
            uGlow: { value: new THREE.Color(0xffd9a0) },
            uGlowStrength: { value: 0.0 }
        },
        vertexShader: 'varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: [
            'uniform vec3 uTop;uniform vec3 uMid;uniform vec3 uHorizon;',
            'uniform vec3 uSunDir;uniform vec3 uGlow;uniform float uGlowStrength;',
            'varying vec3 vDir;',
            'void main(){',
            '  vec3 dir=normalize(vDir);',
            '  float h=clamp(dir.y*0.5+0.5,0.0,1.0);',
            '  vec3 col=mix(uHorizon,uMid,smoothstep(0.46,0.60,h));',
            '  col=mix(col,uTop,smoothstep(0.58,0.95,h));',
            '  float d=max(dot(dir,normalize(uSunDir)),0.0);',
            '  col+=uGlow*pow(d,8.0)*uGlowStrength;',
            '  col+=uGlow*pow(d,2.0)*uGlowStrength*0.12;',
            '  gl_FragColor=vec4(col,1.0);',
            '  #include <colorspace_fragment>',
            '}'
        ].join('\n'),
        side: THREE.BackSide, depthWrite: false, fog: false
    });
    skyDome = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), skyMat);
    skyDome.renderOrder = -1000; skyDome.frustumCulled = false;
    skyGroup.add(skyDome);
    starField = makeStarField();
    skyGroup.add(starField);
    sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeSunTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sunSprite.scale.set(240, 240, 1); sunSprite.renderOrder = -997; skyGroup.add(sunSprite);
    moonGlowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeMoonGlowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    moonGlowSprite.scale.set(460, 460, 1); moonGlowSprite.renderOrder = -998; skyGroup.add(moonGlowSprite);
    moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeMoonTexture(0), transparent: true, depthWrite: false, fog: false }));
    moonSprite.scale.set(200, 200, 1); moonSprite.renderOrder = -997; skyGroup.add(moonSprite);
    scene.add(skyGroup);
}

let lastMoonPhase = -1;
function updateMoonPhase(dayNumber) {
    const phase = ((dayNumber % 8) + 8) % 8;
    if (phase === lastMoonPhase) return;
    lastMoonPhase = phase;
    const old = moonSprite.material.map;
    moonSprite.material.map = makeMoonTexture(phase);
    moonSprite.material.needsUpdate = true;
    if (old) old.dispose();
}
function sampleSky(progress) {
    let i = 0;
    while (i < SKY_KEYS.length - 2 && progress > SKY_KEYS[i + 1].t) i++;
    const a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
    const span = b.t - a.t;
    const t = span <= 0 ? 0 : THREE.MathUtils.clamp((progress - a.t) / span, 0, 1);
    skyTop.lerpColors(tmpColorA.setHex(a.top), tmpColorB.setHex(b.top), t);
    skyMid.lerpColors(tmpColorA.setHex(a.mid), tmpColorB.setHex(b.mid), t);
    skyHor.lerpColors(tmpColorA.setHex(a.hor), tmpColorB.setHex(b.hor), t);
    lightColor.lerpColors(tmpColorA.setHex(a.light), tmpColorB.setHex(b.light), t);
    return { intensity: THREE.MathUtils.lerp(a.li, b.li, t), hemi: THREE.MathUtils.lerp(a.hemi, b.hemi, t) };
}
function phaseName(p) {
    if (p < 0.21) return 'Night';
    if (p < 0.30) return 'Dawn';
    if (p < 0.45) return 'Morning';
    if (p < 0.62) return 'Day';
    if (p < 0.74) return 'Dusk';
    if (p < 0.82) return 'Evening';
    return 'Night';
}
function updateDayNightCycle(delta) {
    if (!NET.peer || NET.isHost) totalGameTime += delta;
    else {
        totalGameTime += delta;
        const target = NET.timeTarget;
        if (target !== null && target !== undefined) {
            const drift = target - totalGameTime;
            if (Math.abs(drift) > 5) totalGameTime = target;
            else totalGameTime += drift * Math.min(1, delta * 0.4);
        }
    }
    const progress = (totalGameTime % DAY_DURATION) / DAY_DURATION;
    const dayNumber = Math.floor(totalGameTime / DAY_DURATION);
    const angle = (progress - 0.25) * Math.PI * 2;
    sunDir.set(Math.cos(angle), Math.sin(angle), 0.32).normalize();
    moonDir.copy(sunDir).multiplyScalar(-1);
    const s = sampleSky(progress);
    const u = skyDome.material.uniforms;
    u.uTop.value.copy(skyTop); u.uMid.value.copy(skyMid); u.uHorizon.value.copy(skyHor);
    u.uSunDir.value.copy(sunDir);
    u.uGlowStrength.value = THREE.MathUtils.clamp(1.0 - Math.abs(sunDir.y) * 1.6, 0, 1) *
                            THREE.MathUtils.clamp((sunDir.y + 0.35) / 0.35, 0, 1);
    u.uGlow.value.copy(lightColor);

    const RADIUS = 1600;
    sunSprite.position.copy(sunDir).multiplyScalar(RADIUS);
    moonSprite.position.copy(moonDir).multiplyScalar(RADIUS);
    moonGlowSprite.position.copy(moonSprite.position);
    sunSprite.material.opacity = THREE.MathUtils.clamp((sunDir.y + 0.22) * 4.0, 0, 1);
    sunSprite.visible = sunSprite.material.opacity > 0.01;
    const moonOpacity = THREE.MathUtils.clamp((moonDir.y + 0.12) * 3.2, 0, 1);
    moonSprite.material.opacity = moonOpacity;
    moonSprite.visible = moonOpacity > 0.01;
    moonGlowSprite.material.opacity = moonOpacity * 0.9;
    moonGlowSprite.visible = moonOpacity > 0.01;
    updateMoonPhase(dayNumber);

    const nightFactor = THREE.MathUtils.clamp(-sunDir.y * 2.4 + 0.15, 0, 1);
    if (starField) {
        const starAlpha = Math.pow(nightFactor, 1.5);
        starField.material.opacity = starAlpha;
        starField.visible = starAlpha > 0.02;
        starField.rotation.y = progress * Math.PI * 2 * 0.35;
    }
    updateClouds();

    const dir = sunDir.y > 0.02 ? sunDir : moonDir;
    const follow = camera.position;
    sunLight.position.set(follow.x + dir.x * 320, follow.y + dir.y * 320, follow.z + dir.z * 320);
    sunLight.target.position.copy(follow);
    sunLight.target.updateMatrixWorld();
    sunLight.color.copy(lightColor);
    sunLight.intensity = s.intensity;
    sunLight.castShadow = shadowsEnabled && s.intensity > 0.3;
    hemiLight.intensity = s.hemi;
    hemiLight.color.copy(skyMid);

    const targetDensity = submerged ? 0.10 : baseFogDensity;
    currentFogDensity += (targetDensity - currentFogDensity) * Math.min(1, delta * 4);
    scene.fog.density = currentFogDensity;
    if (submerged) scene.fog.color.copy(skyHor).lerp(tmpColorA.setHex(0x1b4f86), 0.85);
    else scene.fog.color.copy(skyHor);

    const gameHours = Math.floor(progress * 24);
    const gameMinutes = Math.floor((progress * 24 % 1) * 60);
    return String(gameHours).padStart(2, '0') + ':' + String(gameMinutes).padStart(2, '0') + ' (' + phaseName(progress) + ')';
}

/* ============================================================
   WORLD ACCESS
   ============================================================ */
function getBlock(wx, wy, wz) {
    if (wy < 0 || wy >= WORLD_HEIGHT) return BLOCKS.AIR;
    const cx = Math.floor(wx / CHUNK_SIZE), cz = Math.floor(wz / CHUNK_SIZE);
    const rec = chunkData.get(cx + ',' + cz);
    if (!rec) return -1;
    if (wy >= rec.h) return BLOCKS.AIR;
    const lx = wx - cx * CHUNK_SIZE, lz = wz - cz * CHUNK_SIZE;
    return rec.data[(lx * CHUNK_SIZE + lz) * rec.h + wy];
}
function setBlockLocal(wx, wy, wz, type) {
    if (wy < 0 || wy >= WORLD_HEIGHT) return;
    const cx = Math.floor(wx / CHUNK_SIZE), cz = Math.floor(wz / CHUNK_SIZE);
    const rec = chunkData.get(cx + ',' + cz);
    if (!rec || wy >= rec.h) return;
    const lx = wx - cx * CHUNK_SIZE, lz = wz - cz * CHUNK_SIZE;
    rec.data[(lx * CHUNK_SIZE + lz) * rec.h + wy] = type;
}
function columnTop(wx, wz) {
    const cx = Math.floor(wx / CHUNK_SIZE), cz = Math.floor(wz / CHUNK_SIZE);
    const rec = chunkData.get(cx + ',' + cz);
    return rec ? rec.h - 1 : -1;
}
function isSolid(type) { return type > 0 && type !== BLOCKS.WATER; }
function isWater(type) { return type === BLOCKS.WATER; }

/* ============================================================
   CHUNK STREAMING
   ============================================================ */
function collectEdits(cx, cz) {
    const out = {};
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        const key = (cx + dx) + ',' + (cz + dz);
        const edits = modifiedBlocks.get(key);
        if (edits) out[key] = edits;
    }
    return out;
}
function postToWorker(msg) {
    if (workers.length === 0) return;
    workers[workerCursor].postMessage(msg);
    workerCursor = (workerCursor + 1) % workers.length;
}
function chunkRevOf(key) { const r = chunkRev.get(key); return r === undefined ? 0 : r; }
function bumpChunkRev(key) { chunkRev.set(key, chunkRevOf(key) + 1); }
function requestChunk(cx, cz, lod) {
    const key = cx + ',' + cz;
    if (pendingChunks.has(key)) return;
    if (lod) { if (lodMeshes.has(key) || chunkData.has(key)) return; }
    else if (chunkData.has(key)) return;
    pendingChunks.set(key, lod ? 1 : 0);
    postToWorker({
        type: lod ? 'generateLod' : 'generate',
        worldId, rev: chunkRevOf(key), cx, cz,
        edits: lod ? null : collectEdits(cx, cz)
    });
}
function refreshChunk(cx, cz) {
    const key = cx + ',' + cz;
    if (!chunkData.has(key)) return;
    bumpChunkRev(key);
    postToWorker({ type: 'generate', worldId, rev: chunkRevOf(key), cx, cz, edits: collectEdits(cx, cz) });
}
function disposeChunkMeshes(key) {
    const entry = chunkMeshes.get(key);
    if (!entry) return;
    for (const mesh of [entry.solid, entry.water]) {
        if (!mesh) continue;
        scene.remove(mesh);
        mesh.geometry.dispose();
    }
    chunkMeshes.delete(key);
}
function disposeLodMesh(key) {
    const mesh = lodMeshes.get(key);
    if (!mesh) return;
    scene.remove(mesh);
    mesh.geometry.dispose();
    lodMeshes.delete(key);
}
function buildGeometry(payload) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(payload.positions, 3));
    geo.setAttribute('normal',   new THREE.BufferAttribute(payload.normals, 3));
    geo.setAttribute('uv',       new THREE.BufferAttribute(payload.uvs, 2));
    geo.setAttribute('color',    new THREE.BufferAttribute(payload.colors, 3));
    geo.setIndex(new THREE.BufferAttribute(payload.indices, 1));
    const g = payload.groups;
    for (let i = 0; i < g.length; i += 3) geo.addGroup(g[i], g[i + 1], g[i + 2]);
    geo.computeBoundingSphere();
    return geo;
}
function uploadChunk(data) {
    const key = data.cx + ',' + data.cz;
    disposeChunkMeshes(key);
    disposeLodMesh(key);
    chunkData.set(key, { data: data.volume, h: data.volH });
    const offsetX = data.cx * CHUNK_SIZE - 0.5;
    const offsetZ = data.cz * CHUNK_SIZE - 0.5;
    const entry = { solid: null, water: null };
    if (data.solid) {
        const mesh = new THREE.Mesh(buildGeometry(data.solid), materials);
        mesh.position.set(offsetX, -0.5, offsetZ);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        entry.solid = mesh;
    }
    if (data.water) {
        const mesh = new THREE.Mesh(buildGeometry(data.water), waterMaterial);
        mesh.position.set(offsetX, -0.5, offsetZ);
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        mesh.renderOrder = 1;
        scene.add(mesh);
        entry.water = mesh;
    }
    chunkMeshes.set(key, entry);
}
function uploadLodChunk(data) {
    const key = data.cx + ',' + data.cz;
    disposeLodMesh(key);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute('normal',   new THREE.BufferAttribute(data.normals, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(data.colors, 3));
    geo.setIndex(new THREE.BufferAttribute(data.indices, 1));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, lodMaterial);
    mesh.position.set(data.cx * CHUNK_SIZE - 0.5, -0.5, data.cz * CHUNK_SIZE - 0.5);
    mesh.renderOrder = -1;
    scene.add(mesh);
    lodMeshes.set(key, mesh);
}
function onChunkReady(data) {
    if (data.worldId !== worldId) return;
    const key = data.cx + ',' + data.cz;
    pendingChunks.delete(key);
    if ((data.rev | 0) < chunkRevOf(key)) return;
    if (data.type === 'lodChunk' && chunkData.has(key)) return;
    readyQueue.push(data);
}
function drainReadyQueue(budget) {
    let built = 0;
    while (readyQueue.length > 0 && built < budget) {
        const data = readyQueue.shift();
        const key = data.cx + ',' + data.cz;
        if ((data.rev | 0) < chunkRevOf(key)) continue;
        if (data.type === 'lodChunk') { if (chunkData.has(key)) continue; uploadLodChunk(data); }
        else uploadChunk(data);
        built++;
        if (coreKeys && coreKeys.has(key)) { coreKeys.delete(key); initialDone++; updateLoadingBar(); }
    }
    if (gameState === 'loading' && coreKeys && coreKeys.size === 0) finishLoading();
}
function rebuildChunkQueue(pcx, pcz) {
    chunkQueue.length = 0;
    const r = RENDER_DISTANCE;
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
        const cx = pcx + x, cz = pcz + z;
        const key = cx + ',' + cz;
        if (chunkData.has(key) || pendingChunks.has(key)) continue;
        chunkQueue.push({ cx, cz, d: x * x + z * z, lod: 0 });
    }
    const L = LOD_DISTANCE;
    if (L > r) {
        const rr = r * r, ll = L * L;
        for (let x = -L; x <= L; x++) for (let z = -L; z <= L; z++) {
            const d2 = x * x + z * z;
            if (d2 <= rr || d2 > ll) continue;
            const cx = pcx + x, cz = pcz + z;
            const key = cx + ',' + cz;
            if (chunkData.has(key) || lodMeshes.has(key) || pendingChunks.has(key)) continue;
            chunkQueue.push({ cx, cz, d: d2, lod: 1 });
        }
    }
    chunkQueue.sort((a, b) => a.d - b.d);
}
function unloadFar(pcx, pcz) {
    const limit = RENDER_DISTANCE + 2;
    const lodLimit = LOD_DISTANCE > 0 ? LOD_DISTANCE + 2 : limit;
    for (const key of Array.from(chunkData.keys())) {
        const parts = key.split(',');
        const cx = Number(parts[0]), cz = Number(parts[1]);
        if (Math.abs(cx - pcx) > limit || Math.abs(cz - pcz) > limit) {
            disposeChunkMeshes(key);
            chunkData.delete(key);
        }
    }
    for (const key of Array.from(lodMeshes.keys())) {
        const parts = key.split(',');
        const cx = Number(parts[0]), cz = Number(parts[1]);
        if (Math.abs(cx - pcx) > lodLimit || Math.abs(cz - pcz) > lodLimit) disposeLodMesh(key);
    }
    if (chunkRev.size > 4096) {
        for (const key of Array.from(chunkRev.keys())) {
            const parts = key.split(',');
            if (Math.abs(Number(parts[0]) - pcx) > lodLimit * 2 || Math.abs(Number(parts[1]) - pcz) > lodLimit * 2) chunkRev.delete(key);
        }
    }
}
function dispatchChunkRequests() {
    const maxInFlight = Math.max(4, workers.length * 4);
    while (pendingChunks.size < maxInFlight && chunkQueue.length > 0) {
        const job = chunkQueue.shift();
        requestChunk(job.cx, job.cz, job.lod);
    }
}
function updateChunks() {
    if (!playerSpawned) return;
    const pcx = Math.floor(camera.position.x / CHUNK_SIZE);
    const pcz = Math.floor(camera.position.z / CHUNK_SIZE);
    if (pcx !== lastCenterX || pcz !== lastCenterZ) {
        lastCenterX = pcx; lastCenterZ = pcz;
        unloadFar(pcx, pcz);
        rebuildChunkQueue(pcx, pcz);
    } else if (chunkQueue.length === 0 && pendingChunks.size === 0) {
        rebuildChunkQueue(pcx, pcz);
    }
    dispatchChunkRequests();
}

/* ============================================================
   WORLD LIFECYCLE
   ============================================================ */
function hashSeed(text) {
    const trimmed = (text || '').trim();
    if (trimmed === '') return (Math.random() * 0xffffffff) | 0;
    if (/^-?\d+$/.test(trimmed)) {
        const n = Number(trimmed);
        if (Number.isSafeInteger(n)) return n | 0;
    }
    let h = 2166136261;
    for (let i = 0; i < trimmed.length; i++) {
        h ^= trimmed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h | 0;
}
function createWorkers() {
    destroyWorkers();
    const blob = new Blob([workerSource()], { type: 'application/javascript' });
    workerUrl = URL.createObjectURL(blob);
    const cores = navigator.hardwareConcurrency || 4;
    const count = Math.max(1, Math.min(4, cores - 1));
    for (let i = 0; i < count; i++) {
        const w = new Worker(workerUrl);
        w.onmessage = e => {
            if (e.data && (e.data.type === 'chunk' || e.data.type === 'lodChunk')) onChunkReady(e.data);
        };
        workers.push(w);
    }
    workerCursor = 0;
}
function destroyWorkers() {
    workers.forEach(w => w.terminate());
    workers = [];
    if (workerUrl) { URL.revokeObjectURL(workerUrl); workerUrl = null; }
}
function clearWorld() {
    worldId++;
    destroyWorkers();
    clearRemotePlayers();
    for (const key of Array.from(chunkMeshes.keys())) disposeChunkMeshes(key);
    for (const key of Array.from(lodMeshes.keys())) disposeLodMesh(key);
    chunkData.clear();
    pendingChunks.clear();
    chunkRev.clear();
    modifiedBlocks.clear();
    chunkQueue.length = 0;
    readyQueue.length = 0;
    coreKeys = null;
    lastCenterX = lastCenterZ = null;
    playerSpawned = false;
    playerVelocity.set(0, 0, 0);
    Object.assign(ANIM, { walkPhase: 0, swimPhase: 0, jumpPose: 0, placePose: 0, moveAmount: 0, sprintAmount: 0 });
    if (uiOverlay.mode) closeOverlay();
    resetMining();
    for (let i = drops.length - 1; i >= 0; i--) removeDrop(i);
    ovens.clear();
    clearAnimals();
    clearTorchLights();
    player.health = player.maxHealth;
    hunger.value = hunger.max;
    hunger.drainTimer = hunger.regenTimer = hunger.starveTimer = 0;
    damageFlash = 0;
    if (ui.damageOverlay) ui.damageOverlay.style.opacity = '0';
    updateHealthUI();
    updateHungerUI();
}
function applyViewDistance() {
    const dist = LOD_DISTANCE > 0 ? LOD_DISTANCE : RENDER_DISTANCE;
    baseFogDensity = 0.85 / (dist * CHUNK_SIZE);
    if (scene) scene.fog.density = submerged ? 0.10 : baseFogDensity;
}
function startWorld(seed, initialEdits) {
    clearWorld();
    createWorkers();
    currentSeed = seed | 0;
    currentSeedLabel = String(currentSeed);
    if (initialEdits) {
        for (const ck in initialEdits) modifiedBlocks.set(ck, Object.assign({}, initialEdits[ck]));
    }
    workers.forEach(w => w.postMessage({ type: 'init', seed: currentSeed }));
    applyViewDistance();
    const core = Math.min(RENDER_DISTANCE, 3);
    coreKeys = new Set();
    for (let x = -core; x <= core; x++) for (let z = -core; z <= core; z++) coreKeys.add(x + ',' + z);
    initialTotal = coreKeys.size;
    initialDone = 0;
    loadStartTime = performance.now();
    setState('loading');
    updateLoadingBar();
    rebuildChunkQueue(0, 0);
    dispatchChunkRequests();
}
function findSpawn() {
    for (let radius = 0; radius <= 3 * CHUNK_SIZE; radius += 2) {
        for (let dx = -radius; dx <= radius; dx += 2) for (let dz = -radius; dz <= radius; dz += 2) {
            if (radius > 0 && Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue;
            const top = columnTop(dx, dz);
            if (top < 0) continue;
            for (let y = top; y > 1; y--) {
                const b = getBlock(dx, y, dz);
                if (b === -1) break;
                if (b === BLOCKS.AIR) continue;
                if (!isSolid(b)) break;
                if (getBlock(dx, y + 1, dz) === BLOCKS.AIR && getBlock(dx, y + 2, dz) === BLOCKS.AIR) {
                    return { x: dx, y, z: dz };
                }
                break;
            }
        }
    }
    return null;
}
function finishLoading() {
    if (gameState !== 'loading') return;
    const spawn = findSpawn();
    if (spawn) camera.position.set(spawn.x, spawn.y + 0.5 + PLAYER_EYE + 0.01, spawn.z);
    else camera.position.set(0, SEA_LEVEL + 24, 0);
    camera.rotation.set(0, 0, 0);
    playerVelocity.set(0, 0, 0);
    playerSpawned = true;
    coreKeys = null;
    lastCenterX = lastCenterZ = null;
    setState('ready');
    /* Animal groups are spawned lazily by the animal-system tick. */
}
function updateLoadingBar() {
    const pct = initialTotal === 0 ? 0 : Math.round((initialDone / initialTotal) * 100);
    if (ui.loadingBar) ui.loadingBar.style.width = pct + '%';
    if (ui.loadingPct) ui.loadingPct.textContent = pct + '%';
}

/* ============================================================
   UI STATE
   ============================================================ */
function setState(next) {
    gameState = next;
    ui.menu.classList.toggle('hidden', next !== 'menu');
    ui.loading.classList.toggle('hidden', next !== 'loading');
    ui.ready.classList.toggle('hidden', next !== 'ready');
    ui.pause.classList.toggle('hidden', next !== 'paused');
    ui.hud.classList.toggle('hidden', next !== 'playing');
    ui.hotbar.classList.toggle('hidden', next !== 'playing');
    ui.crosshair.classList.toggle('hidden', next !== 'playing');
    if (ui.statusBars) ui.statusBars.classList.toggle('hidden', next !== 'playing');
    if (next !== 'playing') {
        moveForward = moveBackward = moveLeft = moveRight = false;
        jumpHeld = sinkHeld = sprintHeld = false;
        closeChat();
    }
}
function tryLock() {
    try { controls.lock(); }
    catch (err) { setTimeout(() => { try { controls.lock(); } catch (e) {} }, 300); }
}

/* ============================================================
   CHAT
   ============================================================ */
const CHAT = { open: false, log: [], maxLog: 60 };
function pushChatLine(name, text, isSystem) {
    CHAT.log.push({ name, text, sys: !!isSystem, ts: performance.now() });
    if (CHAT.log.length > CHAT.maxLog) CHAT.log.shift();
    renderChatLog();
}
function renderChatLog() {
    if (!ui.chatLog) return;
    const now = performance.now();
    ui.chatLog.innerHTML = CHAT.log.map(line => {
        const age = (now - line.ts) / 1000;
        const fade = !CHAT.open && age > 8 ? 'opacity:' + Math.max(0, 1 - (age - 8) / 4) + ';' : '';
        if (line.sys) return '<div class="chat-line chat-sys" style="' + fade + '">' + escapeHtml(line.text) + '</div>';
        return '<div class="chat-line" style="' + fade + '"><span class="chat-name">' + escapeHtml(line.name) + ':</span> ' + escapeHtml(line.text) + '</div>';
    }).join('');
    ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
}
function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function openChat() {
    if (!ui.chatInput || CHAT.open) return;
    CHAT.open = true;
    ui.chatInput.classList.remove('hidden');
    ui.chatInput.value = '';
    ui.chatInput.focus();
    moveForward = moveBackward = moveLeft = moveRight = false;
    jumpHeld = sinkHeld = sprintHeld = false;
}
function closeChat() {
    if (!ui.chatInput || !CHAT.open) return;
    CHAT.open = false;
    ui.chatInput.classList.add('hidden');
    ui.chatInput.value = '';
    ui.chatInput.blur();
    if (gameState === 'playing' && controls && !controls.isLocked && !uiOverlay.mode) tryLock();
}
function sendChat() {
    if (!ui.chatInput) return;
    const text = ui.chatInput.value.trim();
    if (text.length > 0) {
        if (text.startsWith('/')) handleAdminCommand(text);
        else {
            pushChatLine(NET.myName || 'You', text, false);
            broadcastNet({ t: 'chat', n: NET.myName || 'You', m: text.slice(0, 200) });
        }
    }
    closeChat();
}

/* ============================================================
   SURVIVAL — INVENTORY / HEALTH / HUNGER / MINING / DROPS / CRAFT / OVEN
   ============================================================ */
const INV_HOTBAR = 10, INV_MAIN = 30, INV_TOTAL = INV_HOTBAR + INV_MAIN, STACK_MAX = 32;
const inventory = { slots: new Array(INV_TOTAL).fill(null), selected: 0 };

function invAdd(type, count) {
    if (count <= 0 || !type) return 0;
    let remaining = count;
    for (let i = 0; i < INV_TOTAL && remaining > 0; i++) {
        const s = inventory.slots[i];
        if (s && s.type === type && s.count < STACK_MAX) {
            const add = Math.min(remaining, STACK_MAX - s.count);
            s.count += add; remaining -= add;
        }
    }
    for (let i = 0; i < INV_TOTAL && remaining > 0; i++) {
        if (!inventory.slots[i]) {
            const add = Math.min(remaining, STACK_MAX);
            inventory.slots[i] = { type, count: add };
            remaining -= add;
        }
    }
    if (remaining !== count) {
        renderInventoryUI();
        renderHotbarUI();
    }
    return count - remaining;
}
function invRemoveAt(index, count) {
    const s = inventory.slots[index];
    if (!s) return false;
    s.count -= count;
    if (s.count <= 0) inventory.slots[index] = null;
    return true;
}
function invWouldAccept(type, count) {
    let remaining = count;
    for (let i = 0; i < INV_TOTAL && remaining > 0; i++) {
        const s = inventory.slots[i];
        if (s && s.type === type && s.count < STACK_MAX) remaining -= Math.min(remaining, STACK_MAX - s.count);
    }
    for (let i = 0; i < INV_TOTAL && remaining > 0; i++) {
        if (!inventory.slots[i]) remaining -= Math.min(remaining, STACK_MAX);
    }
    return remaining <= 0;
}

/* ---------- Health & Hunger ---------- */
const player = { maxHealth: 12, health: 12 };
let damageFlash = 0, fallStartY = 0, wasOnGroundPrev = true;
const hunger = { max: 20, value: 20, drainTimer: 0, regenTimer: 0, starveTimer: 0 };
const HUNGER_DRAIN_PERIOD = 20, REGEN_PERIOD = 4, REGEN_HUNGER_COST = 0.5, STARVE_PERIOD = 4;
const FOOD_VALUES = { [BLOCKS.RAW_MEAT]: 3, [BLOCKS.COOKED_MEAT]: 8 };
function isFood(type) { return FOOD_VALUES[type] !== undefined; }

function damagePlayer(dmg) {
    if (dmg <= 0) return;
    player.health = Math.max(0, Math.min(player.maxHealth, player.health - dmg));
    damageFlash = Math.min(1, damageFlash + 0.6);
    updateHealthUI();
    if (player.health <= 0) respawnPlayer();
}
function healPlayer(amount) {
    player.health = Math.max(0, Math.min(player.maxHealth, player.health + amount));
    updateHealthUI();
}
function respawnPlayer() {
    player.health = player.maxHealth;
    updateHealthUI();
    if (playerSpawned) {
        const spawn = findSpawn();
        if (spawn) camera.position.set(spawn.x, spawn.y + 1.5 + PLAYER_EYE, spawn.z);
        playerVelocity.set(0, 0, 0);
    }
}
function updateHunger(delta) {
    hunger.drainTimer += delta;
    while (hunger.drainTimer >= HUNGER_DRAIN_PERIOD) {
        hunger.drainTimer -= HUNGER_DRAIN_PERIOD;
        if (hunger.value > 0) { hunger.value = Math.max(0, hunger.value - 1); updateHungerUI(); }
    }
    if (hunger.value >= 18 && player.health < player.maxHealth) {
        hunger.regenTimer += delta;
        if (hunger.regenTimer >= REGEN_PERIOD) {
            hunger.regenTimer = 0;
            healPlayer(0.5);
            hunger.value = Math.max(0, hunger.value - REGEN_HUNGER_COST);
            updateHungerUI();
        }
    } else hunger.regenTimer = 0;
    if (hunger.value <= 0) {
        hunger.starveTimer += delta;
        if (hunger.starveTimer >= STARVE_PERIOD) { hunger.starveTimer = 0; damagePlayer(0.5); }
    } else hunger.starveTimer = 0;
}
function eatFood() {
    const slot = inventory.slots[inventory.selected];
    if (!slot) return false;
    const val = FOOD_VALUES[slot.type];
    if (val === undefined) return false;
    if (hunger.value >= hunger.max && player.health >= player.maxHealth) return false;
    hunger.value = Math.min(hunger.max, hunger.value + val);
    if (slot.type === BLOCKS.RAW_MEAT && Math.random() < 0.25) damagePlayer(0.5);
    invRemoveAt(inventory.selected, 1);
    renderHotbarUI();
    updateHungerUI();
    if (uiOverlay.mode) refreshCurrentOverlay();
    return true;
}
function updateHealthUI() {
    if (!ui.hearts) return;
    const hp = Math.max(0, Math.min(player.maxHealth, player.health));
    const perHeart = player.maxHealth / 6;
    let html = '';
    for (let i = 0; i < 6; i++) {
        const val = hp - i * perHeart;
        let cls = 'heart';
        if (val >= perHeart) cls += ' full';
        else if (val > 0) cls += ' half';
        html += '<div class="' + cls + '"></div>';
    }
    ui.hearts.innerHTML = html;
}
function updateHungerUI() {
    if (!ui.hungries) return;
    const v = Math.max(0, Math.min(hunger.max, hunger.value));
    const per = hunger.max / 10;
    let html = '';
    for (let i = 0; i < 10; i++) {
        const val = v - i * per;
        let cls = 'hunger';
        if (val >= per) cls += ' full';
        else if (val > 0) cls += ' half';
        html += '<div class="' + cls + '"></div>';
    }
    ui.hungries.innerHTML = html;
}

/* ---------- Torch lights ---------- */
const torchLights = new Map();
const MAX_TORCH_LIGHTS = 48;
function torchKey(x, y, z) { return x + ',' + y + ',' + z; }
function addTorchLight(x, y, z) {
    const k = torchKey(x, y, z);
    if (torchLights.has(k)) return;
    if (torchLights.size >= MAX_TORCH_LIGHTS) {
        const first = torchLights.keys().next().value;
        const l = torchLights.get(first);
        scene.remove(l);
        torchLights.delete(first);
    }
    const light = new THREE.PointLight(0xffcc66, 1.6, 13, 2);
    light.position.set(x, y + 0.15, z);
    scene.add(light);
    torchLights.set(k, light);
}
function removeTorchLight(x, y, z) {
    const k = torchKey(x, y, z);
    const l = torchLights.get(k);
    if (l) { scene.remove(l); torchLights.delete(k); }
}
function clearTorchLights() {
    for (const l of torchLights.values()) scene.remove(l);
    torchLights.clear();
}

/* ---------- Mining ---------- */
const HARDNESS = {
    [BLOCKS.DIRT]: 0.35, [BLOCKS.GRASS]: 0.40, [BLOCKS.SAND]: 0.35, [BLOCKS.SNOW]: 0.30,
    [BLOCKS.STONE]: 1.50, [BLOCKS.CACTUS]: 0.50, [BLOCKS.BEDROCK]: Infinity,
    [BLOCKS.OAK_WOOD]: 0.90, [BLOCKS.SPRUCE_WOOD]: 0.90, [BLOCKS.ACACIA_WOOD]: 0.90,
    [BLOCKS.OAK_LEAVES]: 0.20, [BLOCKS.SPRUCE_LEAVES]: 0.20, [BLOCKS.ACACIA_LEAVES]: 0.20,
    [BLOCKS.OAK_PLANKS]: 0.70, [BLOCKS.SPRUCE_PLANKS]: 0.70, [BLOCKS.ACACIA_PLANKS]: 0.70,
    [BLOCKS.STONE_BRICKS]: 1.50, [BLOCKS.OVEN]: 1.80, [BLOCKS.GLASS]: 0.35,
    [BLOCKS.CRAFTING_TABLE]: 0.80, [BLOCKS.TORCH]: 0.05,
    [BLOCKS.RAW_MEAT]: Infinity, [BLOCKS.COOKED_MEAT]: Infinity
};
function blockHardness(type) { const h = HARDNESS[type]; return h === undefined ? 0.6 : h; }
const mining = { active: false, x: 0, y: 0, z: 0, progress: 0, duration: 0, type: 0 };
let mouseLeftDown = false, mineHighlight = null;

function resetMining() {
    mining.active = false;
    mining.progress = 0;
    if (mineHighlight) mineHighlight.visible = false;
    if (ui.mineHud) ui.mineHud.classList.add('hidden');
}
function startMining() {
    const hit = raycastVoxel(REACH);
    if (!hit || hit.type === BLOCKS.BEDROCK) { resetMining(); return; }
    mining.active = true;
    mining.x = hit.x; mining.y = hit.y; mining.z = hit.z;
    mining.type = hit.type;
    mining.progress = 0;
    mining.duration = blockHardness(hit.type);
    if (mineHighlight) { mineHighlight.position.set(hit.x, hit.y, hit.z); mineHighlight.visible = true; }
    if (ui.mineHud) ui.mineHud.classList.remove('hidden');
}
function tickMining(delta) {
    if (!mining.active || !mouseLeftDown) { resetMining(); return; }
    const hit = raycastVoxel(REACH);
    if (!hit || hit.x !== mining.x || hit.y !== mining.y || hit.z !== mining.z || hit.type !== mining.type) {
        resetMining();
        if (hit && hit.type !== BLOCKS.BEDROCK && mouseLeftDown) startMining();
        return;
    }
    if (!isFinite(mining.duration)) return;
    mining.progress += delta;
    const pct = Math.min(1, mining.progress / mining.duration);
    if (ui.mineFill) ui.mineFill.style.width = (pct * 100).toFixed(1) + '%';
    if (mineHighlight) mineHighlight.material.opacity = 0.25 + 0.55 * pct;
    if (mining.progress >= mining.duration) {
        breakBlock(mining.x, mining.y, mining.z, mining.type);
        resetMining();
        if (mouseLeftDown) startMining();
    }
}
function breakBlock(x, y, z, type) {
    markEdit(x, y, z, BLOCKS.AIR, true);
    if (waterShouldFill(x, y, z)) markEdit(x, y, z, BLOCKS.WATER, true);
    if (type !== BLOCKS.BEDROCK && type !== BLOCKS.AIR && type !== BLOCKS.WATER) spawnDrop(type, x, y, z);
}

/* ---------- Drops ---------- */
const drops = [];
const DROP_SIZE = 0.28, PICKUP_RADIUS = 1.5, PICKUP_GRAB = 0.55;
const _dropMatCache = new Map();
const _dropGeo = new THREE.BoxGeometry(DROP_SIZE, DROP_SIZE, DROP_SIZE);
function getDropMaterial(type) {
    if (_dropMatCache.has(type)) return _dropMatCache.get(type);
    const slot = MAT_LUT[type * 3];
    const src = (slot >= 0 && materials[slot]) ? materials[slot] : null;
    const mat = new THREE.MeshLambertMaterial({
        map: src ? src.map : null,
        transparent: type === BLOCKS.GLASS,
        opacity: type === BLOCKS.GLASS ? 0.8 : 1
    });
    _dropMatCache.set(type, mat);
    return mat;
}
function spawnDrop(type, x, y, z) {
    const mesh = new THREE.Mesh(_dropGeo, getDropMaterial(type));
    mesh.position.set(x, y + 0.35, z);
    scene.add(mesh);
    drops.push({
        type, mesh, pos: mesh.position,
        vel: new THREE.Vector3(
            (Math.random() - 0.5) * 1.6,
            2.2 + Math.random() * 1.2,
            (Math.random() - 0.5) * 1.6
        ),
        age: 0
    });
}
function removeDrop(index) { scene.remove(drops[index].mesh); drops.splice(index, 1); }
function updateDrops(delta) {
    if (drops.length === 0) return;
    const p = camera.position;
    for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.age += delta;
        d.vel.y -= 22 * delta;
        if (d.vel.y < -30) d.vel.y = -30;
        const nextY = d.pos.y + d.vel.y * delta;
        const bx = Math.round(d.pos.x), bz = Math.round(d.pos.z);
        const belowY = Math.floor(nextY - DROP_SIZE * 0.5 + 0.02);
        if (isSolid(getBlock(bx, belowY, bz)) && d.pos.y > belowY) {
            d.pos.y = belowY + 1 + DROP_SIZE * 0.5;
            d.vel.y = 0;
            d.vel.x *= 0.75; d.vel.z *= 0.75;
        } else d.pos.y = nextY;
        d.pos.x += d.vel.x * delta;
        d.pos.z += d.vel.z * delta;
        d.vel.x *= 0.96; d.vel.z *= 0.96;
        d.mesh.rotation.y += delta * 1.8;
        if (d.age < 0.35) continue;
        const dx = p.x - d.pos.x, dy = (p.y - 0.6) - d.pos.y, dz = p.z - d.pos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < PICKUP_RADIUS) {
            const pull = Math.min(1, delta * 9 * (1 - dist / PICKUP_RADIUS) + delta * 3);
            d.pos.x += dx * pull; d.pos.y += dy * pull; d.pos.z += dz * pull;
            d.vel.set(0, 0, 0);
            if (dist < PICKUP_GRAB) { if (invAdd(d.type, 1) > 0) removeDrop(i); }
        }
        if (d.pos.y < -30) removeDrop(i);
    }
}

/* ============================================================
   CRAFTING
   ============================================================ */
const RECIPES = [
    { size: 2, shapeless: ['LOG_ANY'], out: ['CRAFTING_TABLE', 1] },
    { size: 3, shape: [['OAK_WOOD', 'OAK_WOOD'], ['OAK_WOOD', 'OAK_WOOD']], out: ['OAK_PLANKS', 16] },
    { size: 3, shape: [['SPRUCE_WOOD', 'SPRUCE_WOOD'], ['SPRUCE_WOOD', 'SPRUCE_WOOD']], out: ['SPRUCE_PLANKS', 16] },
    { size: 3, shape: [['ACACIA_WOOD', 'ACACIA_WOOD'], ['ACACIA_WOOD', 'ACACIA_WOOD']], out: ['ACACIA_PLANKS', 16] },
    { size: 3, shape: [['PLANK_ANY'], ['PLANK_ANY']], out: ['TORCH', 4] },
    { size: 3, shapeless: ['STONE', 'STONE', 'STONE', 'STONE'], out: ['STONE_BRICKS', 2] },
    { size: 3, shapeless: ['STONE_BRICKS', 'STONE_BRICKS', 'STONE_BRICKS', 'STONE_BRICKS'], out: ['OVEN', 1] }
];
function cellMatches(cell, want) {
    if (want === null) return cell === 0;
    if (want === 'LOG_ANY') return cell === BLOCKS.OAK_WOOD || cell === BLOCKS.SPRUCE_WOOD || cell === BLOCKS.ACACIA_WOOD;
    if (want === 'PLANK_ANY') return cell === BLOCKS.OAK_PLANKS || cell === BLOCKS.SPRUCE_PLANKS || cell === BLOCKS.ACACIA_PLANKS;
    return cell === (BLOCKS[want] | 0);
}
function matchShaped(grid, size, shape) {
    let minR = size, maxR = -1, minC = size, maxC = -1;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
        if (grid[r * size + c]) {
            if (r < minR) minR = r;
            if (r > maxR) maxR = r;
            if (c < minC) minC = c;
            if (c > maxC) maxC = c;
        }
    }
    if (maxR < 0) return false;
    const h = maxR - minR + 1, w = maxC - minC + 1;
    if (h !== shape.length) return false;
    if (w !== shape[0].length) return false;
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
        const want = shape[r][c];
        const cell = grid[(r + minR) * size + (c + minC)];
        if (!cellMatches(cell, want)) return false;
    }
    return true;
}
function matchShapeless(grid, required) {
    const items = grid.filter(x => x);
    if (items.length !== required.length) return false;
    const used = new Array(items.length).fill(false);
    for (const req of required) {
        let found = false;
        for (let i = 0; i < items.length; i++) {
            if (used[i]) continue;
            if (cellMatches(items[i], req)) { used[i] = true; found = true; break; }
        }
        if (!found) return false;
    }
    return true;
}
function findRecipe(grid, size) {
    for (const r of RECIPES) {
        if (r.size !== size) continue;
        if (r.shape && matchShaped(grid, size, r.shape)) return r;
        if (r.shapeless && matchShapeless(grid, r.shapeless)) return r;
    }
    return null;
}

/* ============================================================
   OVERLAY UI
   ============================================================ */
const uiOverlay = {
    root: null, content: null, bg: null, cursorEl: null, cursorCountEl: null,
    cursorItem: { type: 0, count: 0 },
    mode: null, oven: null,
    craft2Grid: new Array(4).fill(0),
    craft3Grid: new Array(9).fill(0)
};
function uiOverlayOpen() { return uiOverlay.mode !== null; }

function buildOverlayRoot() {
    const root = document.createElement('div');
    root.id = 'overlay-root';
    root.innerHTML = '<div id="overlay-bg"></div><div id="overlay-content"></div><div id="cursor-item"><span class="count"></span></div>';
    document.body.appendChild(root);
    uiOverlay.root = root;
    uiOverlay.content = root.querySelector('#overlay-content');
    uiOverlay.bg = root.querySelector('#overlay-bg');
    uiOverlay.cursorEl = root.querySelector('#cursor-item');
    uiOverlay.cursorCountEl = root.querySelector('#cursor-item .count');
    uiOverlay.bg.addEventListener('mousedown', (e) => { if (e.target === uiOverlay.bg) closeOverlay(); });
    document.addEventListener('mousemove', (e) => {
        if (!uiOverlayOpen()) return;
        uiOverlay.cursorEl.style.left = e.clientX + 'px';
        uiOverlay.cursorEl.style.top = e.clientY + 'px';
    });
    document.addEventListener('contextmenu', (e) => { if (uiOverlayOpen()) e.preventDefault(); });
}
function returnToInventoryOrDrop(type, count) {
    if (!type || count <= 0) return;
    const accepted = invAdd(type, count);
    const leftover = count - accepted;
    if (leftover > 0) {
        const p = camera.position;
        for (let i = 0; i < leftover; i++) spawnDrop(type, Math.round(p.x), Math.round(p.y - 1), Math.round(p.z));
    }
}
function closeOverlay() {
    const c = uiOverlay.cursorItem;
    if (c.type && c.count > 0) returnToInventoryOrDrop(c.type, c.count);
    uiOverlay.cursorItem = { type: 0, count: 0 };
    for (const t of uiOverlay.craft2Grid) if (t) returnToInventoryOrDrop(t, 1);
    for (const t of uiOverlay.craft3Grid) if (t) returnToInventoryOrDrop(t, 1);
    uiOverlay.craft2Grid.fill(0);
    uiOverlay.craft3Grid.fill(0);
    uiOverlay.mode = null;
    uiOverlay.oven = null;
    uiOverlay.root.classList.remove('open');
    uiOverlay.content.innerHTML = '';
    uiOverlay.cursorEl.style.display = 'none';
    if (gameState === 'playing' && controls && !controls.isLocked && !CHAT.open) tryLock();
}
function setCursorItemVisual() {
    const c = uiOverlay.cursorItem;
    if (c.type && c.count > 0) {
        uiOverlay.cursorEl.style.display = 'block';
        const slot = MAT_LUT[c.type * 3];
        const path = MATERIAL_SPECS[slot] ? MATERIAL_SPECS[slot].path : '';
        uiOverlay.cursorEl.style.backgroundImage = "url('" + path + "')";
        uiOverlay.cursorCountEl.textContent = c.count > 1 ? c.count : '';
    } else {
        uiOverlay.cursorEl.style.display = 'none';
    }
}
function makeSlotEl(type, count, onClick, onRightClick) {
    const el = document.createElement('div');
    el.className = 'islot';
    if (type && count > 0) {
        const slot = MAT_LUT[type * 3];
        const path = MATERIAL_SPECS[slot] ? MATERIAL_SPECS[slot].path : '';
        const icon = document.createElement('div');
        icon.className = 'icon';
        icon.style.backgroundImage = "url('" + path + "')";
        el.appendChild(icon);
        if (count > 1) {
            const c = document.createElement('span');
            c.className = 'count';
            c.textContent = count;
            el.appendChild(c);
        }
    }
    el.addEventListener('mousedown', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.button === 0) onClick && onClick();
        else if (e.button === 2) onRightClick && onRightClick();
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    return el;
}
function openInventoryUI() {
    if (uiOverlay.mode === 'inventory') { closeOverlay(); return; }
    if (uiOverlay.mode !== null) closeOverlay();
    uiOverlay.mode = 'inventory';
    uiOverlay.root.classList.add('open');
    renderInventoryUI();
    moveForward = moveBackward = moveLeft = moveRight = false;
    if (controls && controls.isLocked) controls.unlock();
}
function renderInventoryUI() {
    if (uiOverlay.mode !== 'inventory') return;
    const c = uiOverlay.content;
    c.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'panel-ui';
    const h = document.createElement('h2');
    h.textContent = 'Inventory';
    panel.appendChild(h);
    const craftRow = document.createElement('div');
    craftRow.className = 'ui-row';
    const lbl = document.createElement('span');
    lbl.className = 'ui-label';
    lbl.textContent = 'Craft';
    craftRow.appendChild(lbl);
    const g2 = document.createElement('div');
    g2.className = 'slot-grid cols-2';
    for (let i = 0; i < 4; i++) {
        const t = uiOverlay.craft2Grid[i];
        g2.appendChild(makeSlotEl(t, t ? 1 : 0, () => onCraftSlotClick(2, i), () => onCraftSlotRightClick(2, i)));
    }
    craftRow.appendChild(g2);
    const arrow = document.createElement('div');
    arrow.className = 'craft-arrow';
    arrow.textContent = '→';
    craftRow.appendChild(arrow);
    const recipe2 = findRecipe(uiOverlay.craft2Grid, 2);
    craftRow.appendChild(makeSlotEl(
        recipe2 ? BLOCKS[recipe2.out[0]] : 0,
        recipe2 ? recipe2.out[1] : 0,
        () => onCraftOutputClick(2)
    ));
    panel.appendChild(craftRow);
    panel.appendChild(Object.assign(document.createElement('div'), { className: 'divider' }));
    const storageLabel = document.createElement('div');
    storageLabel.className = 'ui-label';
    storageLabel.style.marginBottom = '8px';
    storageLabel.textContent = 'Storage';
    panel.appendChild(storageLabel);
    const mainGrid = document.createElement('div');
    mainGrid.className = 'slot-grid cols-10';
    for (let i = INV_HOTBAR; i < INV_TOTAL; i++) {
        const s = inventory.slots[i];
        mainGrid.appendChild(makeSlotEl(s ? s.type : 0, s ? s.count : 0, () => onInvSlotClick(i), () => onInvSlotRightClick(i)));
    }
    panel.appendChild(mainGrid);
    panel.appendChild(Object.assign(document.createElement('div'), { className: 'divider' }));
    const hotLabel = document.createElement('div');
    hotLabel.className = 'ui-label';
    hotLabel.style.marginBottom = '8px';
    hotLabel.textContent = 'Hotbar';
    panel.appendChild(hotLabel);
    const hotGrid = document.createElement('div');
    hotGrid.className = 'slot-grid cols-10';
    for (let i = 0; i < INV_HOTBAR; i++) {
        const s = inventory.slots[i];
        hotGrid.appendChild(makeSlotEl(s ? s.type : 0, s ? s.count : 0, () => onInvSlotClick(i), () => onInvSlotRightClick(i)));
    }
    panel.appendChild(hotGrid);
    const hint = document.createElement('p');
    hint.className = 'hint-line';
    hint.innerHTML = '<kbd>I</kbd> close · <kbd>LMB</kbd> move · <kbd>RMB</kbd> split';
    panel.appendChild(hint);
    c.appendChild(panel);
    setCursorItemVisual();
}
function openCraftingTableUI() {
    if (uiOverlay.mode !== null) closeOverlay();
    uiOverlay.mode = 'table';
    uiOverlay.root.classList.add('open');
    renderCraftingTableUI();
    moveForward = moveBackward = moveLeft = moveRight = false;
    if (controls && controls.isLocked) controls.unlock();
}
function renderCraftingTableUI() {
    if (uiOverlay.mode !== 'table') return;
    const c = uiOverlay.content;
    c.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'panel-ui';
    const h = document.createElement('h2');
    h.textContent = 'Crafting Table';
    panel.appendChild(h);
    const row = document.createElement('div');
    row.className = 'ui-row';
    const g3 = document.createElement('div');
    g3.className = 'slot-grid cols-3';
    for (let i = 0; i < 9; i++) {
        const t = uiOverlay.craft3Grid[i];
        g3.appendChild(makeSlotEl(t, t ? 1 : 0, () => onCraftSlotClick(3, i), () => onCraftSlotRightClick(3, i)));
    }
    row.appendChild(g3);
    const arrow = document.createElement('div');
    arrow.className = 'craft-arrow';
    arrow.textContent = '→';
    row.appendChild(arrow);
    const recipe3 = findRecipe(uiOverlay.craft3Grid, 3);
    row.appendChild(makeSlotEl(
        recipe3 ? BLOCKS[recipe3.out[0]] : 0,
        recipe3 ? recipe3.out[1] : 0,
        () => onCraftOutputClick(3)
    ));
    panel.appendChild(row);
    panel.appendChild(Object.assign(document.createElement('div'), { className: 'divider' }));
    const mainGrid = document.createElement('div');
    mainGrid.className = 'slot-grid cols-10';
    for (let i = INV_HOTBAR; i < INV_TOTAL; i++) {
        const s = inventory.slots[i];
        mainGrid.appendChild(makeSlotEl(s ? s.type : 0, s ? s.count : 0, () => onInvSlotClick(i), () => onInvSlotRightClick(i)));
    }
    panel.appendChild(mainGrid);
    panel.appendChild(Object.assign(document.createElement('div'), { className: 'divider' }));
    const hotGrid = document.createElement('div');
    hotGrid.className = 'slot-grid cols-10';
    for (let i = 0; i < INV_HOTBAR; i++) {
        const s = inventory.slots[i];
        hotGrid.appendChild(makeSlotEl(s ? s.type : 0, s ? s.count : 0, () => onInvSlotClick(i), () => onInvSlotRightClick(i)));
    }
    panel.appendChild(hotGrid);
    const hint = document.createElement('p');
    hint.className = 'hint-line';
    hint.innerHTML = '2×2 logs → planks · 4 stone → bricks · 4 bricks → oven · 2 planks → torches';
    panel.appendChild(hint);
    c.appendChild(panel);
    setCursorItemVisual();
}
function onInvSlotClick(i) {
    const cur = uiOverlay.cursorItem;
    const s = inventory.slots[i];
    if (!cur.type) {
        if (!s) return;
        uiOverlay.cursorItem = { type: s.type, count: s.count };
        inventory.slots[i] = null;
    } else {
        if (!s) {
            inventory.slots[i] = { type: cur.type, count: cur.count };
            uiOverlay.cursorItem = { type: 0, count: 0 };
        } else if (s.type === cur.type) {
            const add = Math.min(cur.count, STACK_MAX - s.count);
            s.count += add; cur.count -= add;
            if (cur.count <= 0) uiOverlay.cursorItem = { type: 0, count: 0 };
        } else {
            const tmp = { type: s.type, count: s.count };
            inventory.slots[i] = { type: cur.type, count: cur.count };
            uiOverlay.cursorItem = tmp;
        }
    }
    refreshCurrentOverlay();
}
function onInvSlotRightClick(i) {
    const cur = uiOverlay.cursorItem;
    const s = inventory.slots[i];
    if (!cur.type) {
        if (!s) return;
        const half = Math.ceil(s.count / 2);
        uiOverlay.cursorItem = { type: s.type, count: half };
        s.count -= half;
        if (s.count <= 0) inventory.slots[i] = null;
    } else {
        if (!s) {
            inventory.slots[i] = { type: cur.type, count: 1 };
            cur.count -= 1;
        } else if (s.type === cur.type && s.count < STACK_MAX) {
            s.count += 1;
            cur.count -= 1;
        }
        if (cur.count <= 0) uiOverlay.cursorItem = { type: 0, count: 0 };
    }
    refreshCurrentOverlay();
}
function onCraftSlotClick(size, i) {
    const grid = size === 2 ? uiOverlay.craft2Grid : uiOverlay.craft3Grid;
    const cur = uiOverlay.cursorItem;
    const t = grid[i];
    if (!cur.type) {
        if (!t) return;
        uiOverlay.cursorItem = { type: t, count: 1 };
        grid[i] = 0;
    } else {
        if (t === 0) { grid[i] = cur.type; cur.count -= 1; }
        if (cur.count <= 0) uiOverlay.cursorItem = { type: 0, count: 0 };
    }
    refreshCurrentOverlay();
}
function onCraftSlotRightClick(size, i) {
    const grid = size === 2 ? uiOverlay.craft2Grid : uiOverlay.craft3Grid;
    if (grid[i]) {
        const t = grid[i];
        grid[i] = 0;
        invAdd(t, 1);
    }
    refreshCurrentOverlay();
}
function onCraftOutputClick(size) {
    const grid = size === 2 ? uiOverlay.craft2Grid : uiOverlay.craft3Grid;
    const recipe = findRecipe(grid, size);
    if (!recipe) return;
    const outType = BLOCKS[recipe.out[0]];
    const outCount = recipe.out[1];
    const cur = uiOverlay.cursorItem;
    if (!cur.type) {
        uiOverlay.cursorItem = { type: outType, count: outCount };
    } else if (cur.type === outType && cur.count + outCount <= STACK_MAX) {
        cur.count += outCount;
    } else if (invWouldAccept(outType, outCount)) {
        invAdd(outType, outCount);
    } else return;
    for (let i = 0; i < grid.length; i++) grid[i] = 0;
    refreshCurrentOverlay();
}
function refreshCurrentOverlay() {
    if (uiOverlay.mode === 'inventory') renderInventoryUI();
    else if (uiOverlay.mode === 'table') renderCraftingTableUI();
    else if (uiOverlay.mode === 'oven') renderOvenUI();
    renderHotbarUI();
}

/* ============================================================
   OVEN
   ============================================================ */
const ovens = new Map();
function ovenKey(x, y, z) { return x + ',' + y + ',' + z; }
function getOven(x, y, z) {
    const k = ovenKey(x, y, z);
    let ov = ovens.get(k);
    if (!ov) {
        ov = { x, y, z, input: null, fuel: null, output: null, fuelUses: 0, progress: 0 };
        ovens.set(k, ov);
    }
    return ov;
}
function isOvenFuel(type) {
    return type === BLOCKS.OAK_WOOD || type === BLOCKS.SPRUCE_WOOD || type === BLOCKS.ACACIA_WOOD ||
           type === BLOCKS.OAK_PLANKS || type === BLOCKS.SPRUCE_PLANKS || type === BLOCKS.ACACIA_PLANKS;
}
function isLogType(type) {
    return type === BLOCKS.OAK_WOOD || type === BLOCKS.SPRUCE_WOOD || type === BLOCKS.ACACIA_WOOD;
}
const SMELT_RECIPES = {
    [BLOCKS.SAND]:     { out: BLOCKS.GLASS,       count: 1 },
    [BLOCKS.RAW_MEAT]: { out: BLOCKS.COOKED_MEAT, count: 1 }
};
const SMELT_TIME = 15;

function canSmelt(ov) {
    if (!ov.input || ov.input.count <= 0) return false;
    const rec = SMELT_RECIPES[ov.input.type];
    if (!rec) return false;
    if (ov.output) {
        if (ov.output.type !== rec.out) return false;
        if (ov.output.count + rec.count > STACK_MAX) return false;
    }
    return true;
}
function tickOven(ov, delta) {
    if (ov.fuelUses <= 0) {
        if (!canSmelt(ov)) return;
        if (!ov.fuel || ov.fuel.count <= 0) return;
        const ftype = ov.fuel.type;
        ov.fuel.count -= 1;
        if (ov.fuel.count <= 0) ov.fuel = null;
        ov.fuelUses = isLogType(ftype) ? 4 : 1;
    }
    if (!canSmelt(ov)) { ov.progress = 0; return; }
    ov.progress += delta;
    while (ov.progress >= SMELT_TIME && canSmelt(ov) && ov.fuelUses > 0) {
        const rec = SMELT_RECIPES[ov.input.type];
        ov.progress -= SMELT_TIME;
        ov.fuelUses -= 1;
        ov.input.count -= 1;
        if (ov.input.count <= 0) ov.input = null;
        if (!ov.output) ov.output = { type: rec.out, count: rec.count };
        else ov.output.count += rec.count;
    }
    if (!canSmelt(ov)) ov.progress = 0;
}
function tickAllOvens(delta) { for (const ov of ovens.values()) tickOven(ov, delta); }

function openOvenUI(x, y, z) {
    if (uiOverlay.mode !== null) closeOverlay();
    uiOverlay.mode = 'oven';
    uiOverlay.oven = getOven(x, y, z);
    uiOverlay.root.classList.add('open');
    renderOvenUI();
    moveForward = moveBackward = moveLeft = moveRight = false;
    if (controls && controls.isLocked) controls.unlock();
}
function renderOvenUI() {
    if (uiOverlay.mode !== 'oven' || !uiOverlay.oven) return;
    const ov = uiOverlay.oven;
    const c = uiOverlay.content;
    c.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'panel-ui';
    const h = document.createElement('h2');
    h.textContent = 'Oven';
    panel.appendChild(h);
    const row = document.createElement('div');
    row.className = 'ui-row';
    const inL = document.createElement('span');
    inL.className = 'ui-label';
    inL.style.marginRight = '6px';
    inL.textContent = 'Input';
    row.appendChild(inL);
    row.appendChild(makeSlotEl(ov.input ? ov.input.type : 0, ov.input ? ov.input.count : 0,
        () => onOvenSlotClick('input'), () => onOvenSlotRightClick('input')));
    row.appendChild(Object.assign(document.createElement('div'), { style: 'width:12px' }));
    const fuelL = document.createElement('span');
    fuelL.className = 'ui-label';
    fuelL.style.marginRight = '6px';
    fuelL.textContent = 'Fuel';
    row.appendChild(fuelL);
    row.appendChild(makeSlotEl(ov.fuel ? ov.fuel.type : 0, ov.fuel ? ov.fuel.count : 0,
        () => onOvenSlotClick('fuel'), () => onOvenSlotRightClick('fuel')));
    row.appendChild(Object.assign(document.createElement('div'), { style: 'width:14px' }));
    const prog = document.createElement('div');
    prog.className = 'oven-progress';
    const fill = document.createElement('div');
    fill.id = 'oven-progress-fill';
    fill.style.width = Math.min(100, (ov.progress / SMELT_TIME) * 100) + '%';
    prog.appendChild(fill);
    row.appendChild(prog);
    const flame = document.createElement('div');
    flame.id = 'oven-flame';
    flame.textContent = '🔥';
    if (ov.fuelUses > 0) flame.classList.add('lit');
    row.appendChild(flame);
    row.appendChild(Object.assign(document.createElement('div'), { style: 'width:14px' }));
    const outL = document.createElement('span');
    outL.className = 'ui-label';
    outL.style.marginRight = '6px';
    outL.textContent = 'Output';
    row.appendChild(outL);
    row.appendChild(makeSlotEl(ov.output ? ov.output.type : 0, ov.output ? ov.output.count : 0,
        () => onOvenSlotClick('output'), () => onOvenSlotRightClick('output')));
    panel.appendChild(row);
    panel.appendChild(Object.assign(document.createElement('div'), { className: 'divider' }));
    const mainGrid = document.createElement('div');
    mainGrid.className = 'slot-grid cols-10';
    for (let i = INV_HOTBAR; i < INV_TOTAL; i++) {
        const s = inventory.slots[i];
        mainGrid.appendChild(makeSlotEl(s ? s.type : 0, s ? s.count : 0, () => onInvSlotClick(i), () => onInvSlotRightClick(i)));
    }
    panel.appendChild(mainGrid);
    panel.appendChild(Object.assign(document.createElement('div'), { className: 'divider' }));
    const hotGrid = document.createElement('div');
    hotGrid.className = 'slot-grid cols-10';
    for (let i = 0; i < INV_HOTBAR; i++) {
        const s = inventory.slots[i];
        hotGrid.appendChild(makeSlotEl(s ? s.type : 0, s ? s.count : 0, () => onInvSlotClick(i), () => onInvSlotRightClick(i)));
    }
    panel.appendChild(hotGrid);
    const hint = document.createElement('p');
    hint.className = 'hint-line';
    hint.innerHTML = 'Sand → glass · raw meat → cooked meat · 15 s per unit<br>Fuel: planks (1 use) or logs (4 uses)';
    panel.appendChild(hint);
    c.appendChild(panel);
    setCursorItemVisual();
}
function onOvenSlotClick(which) {
    const ov = uiOverlay.oven;
    const cur = uiOverlay.cursorItem;
    const target = ov[which];
    if (!cur.type) {
        if (!target) return;
        if (which === 'input' && !SMELT_RECIPES[target.type]) return;
        if (which === 'fuel' && !isOvenFuel(target.type)) return;
        uiOverlay.cursorItem = { type: target.type, count: target.count };
        ov[which] = null;
    } else {
        if (which === 'input' && !SMELT_RECIPES[cur.type]) return;
        if (which === 'fuel' && !isOvenFuel(cur.type)) return;
        if (!target) {
            ov[which] = { type: cur.type, count: cur.count };
            uiOverlay.cursorItem = { type: 0, count: 0 };
        } else if (target.type === cur.type) {
            const add = Math.min(cur.count, STACK_MAX - target.count);
            target.count += add;
            cur.count -= add;
            if (cur.count <= 0) uiOverlay.cursorItem = { type: 0, count: 0 };
        } else {
            const tmp = { type: target.type, count: target.count };
            ov[which] = { type: cur.type, count: cur.count };
            uiOverlay.cursorItem = tmp;
        }
    }
    refreshCurrentOverlay();
}
function onOvenSlotRightClick(which) {
    const ov = uiOverlay.oven;
    const cur = uiOverlay.cursorItem;
    const target = ov[which];
    if (!cur.type) {
        if (!target) return;
        const half = Math.ceil(target.count / 2);
        uiOverlay.cursorItem = { type: target.type, count: half };
        target.count -= half;
        if (target.count <= 0) ov[which] = null;
    } else {
        if (which === 'input' && !SMELT_RECIPES[cur.type]) return;
        if (which === 'fuel' && !isOvenFuel(cur.type)) return;
        if (!target) {
            ov[which] = { type: cur.type, count: 1 };
            cur.count -= 1;
        } else if (target.type === cur.type && target.count < STACK_MAX) {
            target.count += 1;
            cur.count -= 1;
        }
        if (cur.count <= 0) uiOverlay.cursorItem = { type: 0, count: 0 };
    }
    refreshCurrentOverlay();
}

/* ---------- Hotbar ---------- */
function renderHotbarUI() {
    if (!ui.hotbar) return;
    ui.hotbar.innerHTML = '';
    for (let i = 0; i < INV_HOTBAR; i++) {
        const s = inventory.slots[i];
        const slot = document.createElement('div');
        slot.className = 'slot' + (i === inventory.selected ? ' active' : '');
        const key = document.createElement('span');
        key.className = 'key';
        key.textContent = (i === 9 ? 0 : i + 1);
        slot.appendChild(key);
        if (s) {
            const icon = document.createElement('div');
            icon.className = 'icon';
            const matSlot = MAT_LUT[s.type * 3];
            const path = MATERIAL_SPECS[matSlot] ? MATERIAL_SPECS[matSlot].path : '';
            icon.style.backgroundImage = "url('" + path + "')";
            slot.appendChild(icon);
            if (s.count > 1) {
                const c = document.createElement('span');
                c.className = 'count';
                c.textContent = s.count;
                slot.appendChild(c);
            }
        }
        ui.hotbar.appendChild(slot);
    }
    updateHeldBlock();
}

/* ============================================================
   ANIMALS — group spawning + infinite breeding
   ============================================================
   • One group of 8 same-type animals per 4×4 chunk cell.
   • Origin is deterministic per cell + world seed → returning to an area
     gives the same spawn point.
   • Each adult has a 5–10 min breeding timer. When two same-type adults
     are ready and near, they walk to their midpoint and produce one baby.
   • Babies are 50% size and grow to full over 90 s.
   ============================================================ */
const ANIMAL_TYPES = {
    PIG: {
        hp: 5, walkSpeed: 1.8, fleeSpeed: 6.5,
        body: 0xE8A8A8, snout: 0xC77F7F, drop: BLOCKS.RAW_MEAT,
        dropMin: 1, dropMax: 2, scale: 0.85
    },
    COW: {
        hp: 7, walkSpeed: 1.5, fleeSpeed: 6.0,
        body: 0x8b6b45, snout: 0x6a4a2a, drop: BLOCKS.RAW_MEAT,
        dropMin: 2, dropMax: 3, scale: 1.0
    }
};

const animals = [];
const ANIMAL_CAP = 64;

/* --- Group spawning --- */
const ANIMAL_GROUP_CHUNKS = 4;      // group cell = 4×4 chunks
const ANIMAL_GROUP_SIZE   = 8;      // animals per group
const ANIMAL_GROUP_CELL   = ANIMAL_GROUP_CHUNKS * CHUNK_SIZE;
const ANIMAL_GROUP_CHECK  = 1.5;    // seconds between group scans
const spawnedGroups = new Set();
let animalGroupCheckAccum = ANIMAL_GROUP_CHECK;

/* --- Breeding --- */
const BREED_MIN_SECONDS   = 5 * 60;
const BREED_MAX_SECONDS   = 10 * 60;
const BREED_SEARCH_RADIUS = 24;     // how far apart ready partners may be
const BREED_ARRIVE_DIST   = 1.6;    // distance considered "met"
const BREED_CHECK_PERIOD  = 1.5;    // seconds between pairing scans
const GROW_SECONDS        = 90;     // time for a baby to become adult
let breedCheckAccum = BREED_CHECK_PERIOD;

function randomBreedTime() {
    return BREED_MIN_SECONDS + Math.random() * (BREED_MAX_SECONDS - BREED_MIN_SECONDS);
}

function animalGroupKey(gx, gz) { return gx + ',' + gz; }

/* Deterministic origin for a group cell. */
function animalGroupOrigin(gx, gz) {
    let h = Math.imul(gx | 0, 0x9e3779b1) ^ Math.imul(gz | 0, 0x85ebca77) ^ (currentSeed | 0);
    h = (h ^ (h >>> 16)) | 0;
    let h2 = Math.imul(h, 0x27d4eb2d) | 0;
    const r1 = ((h >>> 0) / 4294967296);
    const r2 = ((h2 >>> 0) / 4294967296);
    const cx = gx * ANIMAL_GROUP_CELL + Math.floor(r1 * ANIMAL_GROUP_CELL);
    const cz = gz * ANIMAL_GROUP_CELL + Math.floor(r2 * ANIMAL_GROUP_CELL);
    return { x: cx, z: cz };
}

/* Find a standing position near (x, z). Returns { x, y, z } or null. */
function findStandingSpot(x, z) {
    const top = columnTop(x, z);
    if (top < 0) return null;
    for (let y = top; y > 1; y--) {
        const b = getBlock(x, y, z);
        if (b < 0) return null;         // chunk unloaded
        if (b === BLOCKS.AIR || b === BLOCKS.WATER) continue;
        if (isSolid(b) &&
            getBlock(x, y + 1, z) === BLOCKS.AIR &&
            getBlock(x, y + 2, z) === BLOCKS.AIR) {
            return { x, y: y + 1, z };
        }
        return null;
    }
    return null;
}

/* Try to spawn one group. Silent if chunks aren't ready — retried later. */
function trySpawnAnimalGroup(gx, gz) {
    const key = animalGroupKey(gx, gz);
    if (spawnedGroups.has(key)) return;
    if (animals.length >= ANIMAL_CAP) return;

    const origin = animalGroupOrigin(gx, gz);
    // Spiral outward to find a walkable origin
    let base = null;
    for (let r = 0; r < 32 && !base; r += 2) {
        const count = r === 0 ? 1 : 8;
        for (let a = 0; a < count; a++) {
            const ang = (a / count) * Math.PI * 2 + r * 0.7;
            const tx = Math.round(origin.x + Math.cos(ang) * r);
            const tz = Math.round(origin.z + Math.sin(ang) * r);
            const spot = findStandingSpot(tx, tz);
            if (spot) { base = spot; break; }
        }
    }
    if (!base) return;   // chunks not ready — retry next tick

    spawnedGroups.add(key);

    // Same type per group so breeding works nicely
    const type = (Math.random() < 0.5) ? 'PIG' : 'COW';
    for (let i = 0; i < ANIMAL_GROUP_SIZE; i++) {
        if (animals.length >= ANIMAL_CAP) break;
        // Scatter around base
        const ang = Math.random() * Math.PI * 2;
        const dist = Math.random() * 6;
        const tx = Math.round(base.x + Math.cos(ang) * dist);
        const tz = Math.round(base.z + Math.sin(ang) * dist);
        const spot = findStandingSpot(tx, tz) || base;
        spawnAnimal(type, spot.x, spot.y, spot.z);
    }
}

function updateAnimalGroups(delta) {
    if (!playerSpawned) return;
    animalGroupCheckAccum += delta;
    if (animalGroupCheckAccum < ANIMAL_GROUP_CHECK) return;
    animalGroupCheckAccum = 0;

    const pcx = Math.floor(camera.position.x / CHUNK_SIZE);
    const pcz = Math.floor(camera.position.z / CHUNK_SIZE);
    const gx0 = Math.floor(pcx / ANIMAL_GROUP_CHUNKS);
    const gz0 = Math.floor(pcz / ANIMAL_GROUP_CHUNKS);
    for (let gx = gx0 - 1; gx <= gx0 + 1; gx++) {
        for (let gz = gz0 - 1; gz <= gz0 + 1; gz++) {
            trySpawnAnimalGroup(gx, gz);
        }
    }
}

/* --- Animal meshes --- */
function buildAnimalMesh(type) {
    const spec = ANIMAL_TYPES[type];
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: spec.body });
    const snoutMat = new THREE.MeshLambertMaterial({ color: spec.snout });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.62, 0.62), mat);
    body.position.set(0, 0.72, 0);
    g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat);
    head.position.set(0, 1.02, -0.58);
    g.add(head);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.16), snoutMat);
    snout.position.set(0, 0.96, -0.88);
    g.add(snout);
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.02);
    for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(sx * 0.12, 1.08, -0.84);
        g.add(eye);
    }
    const legGeo = new THREE.BoxGeometry(0.2, 0.62, 0.2);
    legGeo.translate(0, -0.31, 0);
    for (const [lx, lz] of [[-0.32, -0.24], [0.32, -0.24], [-0.32, 0.24], [0.32, 0.24]]) {
        const leg = new THREE.Mesh(legGeo, mat);
        leg.position.set(lx, 0.42, lz);
        g.add(leg);
    }
    return g;
}

function spawnAnimal(type, x, y, z, isBaby) {
    const spec = ANIMAL_TYPES[type];
    if (!spec) return null;
    const mesh = buildAnimalMesh(type);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    const a = {
        type, mesh,
        pos: new THREE.Vector3(x, y, z),
        vel: new THREE.Vector3(0, 0, 0),
        health: spec.hp,
        state: 'wander',
        wanderDir: new THREE.Vector3(0, 0, 0), wanderTimer: 0,
        fleeDir: new THREE.Vector3(0, 0, 0), fleeTimer: 0,
        age: Math.random() * 10,
        hurtFlash: 0,
        /* breeding */
        isBaby: !!isBaby,
        sizeScale: isBaby ? 0.5 : 1,
        growTimer: isBaby ? GROW_SECONDS : 0,
        breedTimer: isBaby ? Infinity : randomBreedTime(),
        partner: null,
        breedTarget: null
    };
    mesh.scale.setScalar(spec.scale * a.sizeScale);
    animals.push(a);
    return a;
}

function updateAnimal(a, delta) {
    a.age += delta;
    if (a.hurtFlash > 0) a.hurtFlash = Math.max(0, a.hurtFlash - delta * 3);
    const spec = ANIMAL_TYPES[a.type];

    /* Baby growth */
    if (a.isBaby) {
        a.growTimer -= delta;
        a.sizeScale = 0.5 + 0.5 * (1 - Math.max(0, a.growTimer) / GROW_SECONDS);
        if (a.growTimer <= 0) {
            a.isBaby = false;
            a.sizeScale = 1;
            a.breedTimer = randomBreedTime();
        }
    } else if (a.breedTimer > 0 && Number.isFinite(a.breedTimer)) {
        a.breedTimer -= delta;
    }

    /* State changes */
    if (a.state === 'flee') {
        a.fleeTimer -= delta;
        if (a.fleeTimer <= 0) { a.state = 'wander'; a.wanderTimer = 0; }
    }

    /* Movement inputs */
    let vx = 0, vz = 0;
    if (a.state === 'flee') {
        vx = a.fleeDir.x * spec.fleeSpeed;
        vz = a.fleeDir.z * spec.fleeSpeed;
    } else if (a.state === 'breed' && a.breedTarget && a.partner) {
        const tdx = a.breedTarget.x - a.pos.x;
        const tdz = a.breedTarget.z - a.pos.z;
        const tdist = Math.hypot(tdx, tdz);
        if (tdist > 0.5) {
            const inv = 1 / tdist;
            vx = tdx * inv * spec.walkSpeed * 1.6;
            vz = tdz * inv * spec.walkSpeed * 1.6;
        }
    } else {
        /* wander */
        a.wanderTimer -= delta;
        if (a.wanderTimer <= 0) {
            a.wanderTimer = 2.5 + Math.random() * 4;
            if (Math.random() < 0.35) a.wanderDir.set(0, 0, 0);
            else {
                const ang = Math.random() * Math.PI * 2;
                a.wanderDir.set(Math.cos(ang), 0, Math.sin(ang));
            }
        }
        vx = a.wanderDir.x * spec.walkSpeed;
        vz = a.wanderDir.z * spec.walkSpeed;
    }

    /* Gravity */
    a.vel.y -= 22 * delta;
    if (a.vel.y < -30) a.vel.y = -30;

    /* Vertical move */
    const nextY = a.pos.y + a.vel.y * delta;
    const bx = Math.round(a.pos.x), bz = Math.round(a.pos.z);
    const belowY = Math.floor(nextY - 0.02);
    const groundBlock = getBlock(bx, belowY, bz);
    if (groundBlock > 0 && groundBlock !== BLOCKS.WATER && nextY <= belowY + 1) {
        a.pos.y = belowY + 1;
        a.vel.y = 0;
    } else a.pos.y = nextY;

    /* Horizontal step with 1-block climb */
    const nx = a.pos.x + vx * delta;
    const nz = a.pos.z + vz * delta;
    const stepX = Math.round(nx), stepZ = Math.round(nz);
    let canWalk = true;
    const feetY = Math.floor(a.pos.y);
    for (let dy = 0; dy <= 1; dy++) {
        const b = getBlock(stepX, feetY + dy, stepZ);
        if (b > 0 && b !== BLOCKS.WATER) { canWalk = false; break; }
    }
    if (canWalk) { a.pos.x = nx; a.pos.z = nz; }
    else {
        a.wanderDir.set(-a.wanderDir.x, 0, -a.wanderDir.z);
        if (a.state === 'flee') a.fleeDir.set(-a.fleeDir.z, 0, a.fleeDir.x);
        /* If blocked while breeding, we'll re-plan next tick */
        if (a.state === 'breed') {
            a.partner && (a.partner.state = 'wander');
            if (a.partner) a.partner.partner = null;
            a.state = 'wander';
            a.partner = null;
            a.breedTarget = null;
        }
    }

    /* Mesh sync */
    a.mesh.position.set(a.pos.x, a.pos.y, a.pos.z);
    if (Math.abs(vx) + Math.abs(vz) > 0.05) {
        const targetYaw = Math.atan2(vx, vz);
        let dy = targetYaw - a.mesh.rotation.y;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        a.mesh.rotation.y += dy * Math.min(1, delta * 8);
    }
    const bobbing = Math.min(1, Math.abs(vx) + Math.abs(vz));
    a.mesh.position.y += Math.sin(a.age * 9) * 0.03 * bobbing;
    const pop = 1 + a.hurtFlash * 0.14;
    a.mesh.scale.setScalar(spec.scale * a.sizeScale * pop);
}

function updateAllAnimals(delta) {
    for (let i = animals.length - 1; i >= 0; i--) {
        const a = animals[i];
        updateAnimal(a, delta);
        if (a.pos.y < -50) {
            if (a.partner) { a.partner.partner = null; a.partner.state = 'wander'; }
            scene.remove(a.mesh);
            a.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
            animals.splice(i, 1);
        }
    }
}

/* --- Breeding --- */
function completeBreed(a, b) {
    /* Spawn baby between them */
    if (animals.length < ANIMAL_CAP) {
        const bx = (a.pos.x + b.pos.x) / 2;
        const bz = (a.pos.z + b.pos.z) / 2;
        const by = Math.max(a.pos.y, b.pos.y);
        const baby = spawnAnimal(a.type, bx, by, bz, true);
        if (baby) baby.hurtFlash = 0.6;
    }
    /* Reset parents */
    for (const p of [a, b]) {
        p.partner = null;
        p.breedTarget = null;
        p.state = 'wander';
        p.wanderTimer = 0;
        p.wanderDir.set(0, 0, 0);
        p.breedTimer = randomBreedTime();
    }
}

function updateBreeding(delta) {
    /* 1) Complete pairs that have met */
    const completed = new Set();
    const toComplete = [];
    for (const a of animals) {
        if (a.state !== 'breed' || !a.partner) continue;
        if (completed.has(a)) continue;
        const p = a.partner;
        if (p.partner !== a) {
            /* partner broke off */
            a.partner = null; a.breedTarget = null; a.state = 'wander';
            continue;
        }
        if (a.pos.distanceTo(p.pos) < BREED_ARRIVE_DIST) {
            completed.add(a); completed.add(p);
            toComplete.push([a, p]);
        }
    }
    for (const [a, b] of toComplete) completeBreed(a, b);

    /* 2) Pair up newly ready animals every BREED_CHECK_PERIOD */
    breedCheckAccum += delta;
    if (breedCheckAccum < BREED_CHECK_PERIOD) return;
    breedCheckAccum = 0;

    const ready = [];
    for (const a of animals) {
        if (a.isBaby) continue;
        if (a.state === 'flee') continue;
        if (a.partner) continue;
        if (!Number.isFinite(a.breedTimer)) continue;
        if (a.breedTimer <= 0) ready.push(a);
    }
    for (const a of ready) {
        if (a.partner) continue;
        let best = null, bestDist = BREED_SEARCH_RADIUS;
        for (const b of ready) {
            if (b === a || b.partner) continue;
            if (b.type !== a.type) continue;
            const d = a.pos.distanceTo(b.pos);
            if (d < bestDist) { bestDist = d; best = b; }
        }
        if (!best) continue;
        a.partner = best;
        best.partner = a;
        const mx = (a.pos.x + best.pos.x) / 2;
        const mz = (a.pos.z + best.pos.z) / 2;
        const my = Math.max(a.pos.y, best.pos.y);
        a.breedTarget = new THREE.Vector3(mx, my, mz);
        best.breedTarget = new THREE.Vector3(mx, my, mz);
        a.state = 'breed';
        best.state = 'breed';
    }
}

/* --- Damage / death --- */
function damageAnimal(a, dmg, sx, sz) {
    a.health -= dmg;
    a.hurtFlash = 1;
    if (a.health <= 0) { killAnimal(a); return; }

    /* Cancel any breeding */
    if (a.partner) {
        const p = a.partner;
        if (p.partner === a) { p.partner = null; p.breedTarget = null; p.state = 'wander'; }
        a.partner = null;
        a.breedTarget = null;
    }
    const dx = a.pos.x - sx, dz = a.pos.z - sz;
    const len = Math.hypot(dx, dz) || 1;
    a.fleeDir.set(dx / len, 0, dz / len);
    a.fleeTimer = Math.max(4, 32 / ANIMAL_TYPES[a.type].fleeSpeed);
    a.state = 'flee';
}
function killAnimal(a) {
    const spec = ANIMAL_TYPES[a.type];
    const count = spec.dropMin + Math.floor(Math.random() * (spec.dropMax - spec.dropMin + 1));
    for (let i = 0; i < count; i++) spawnDrop(spec.drop, a.pos.x, a.pos.y, a.pos.z);
    if (a.partner) {
        const p = a.partner;
        if (p.partner === a) { p.partner = null; p.breedTarget = null; p.state = 'wander'; }
    }
    scene.remove(a.mesh);
    a.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    const idx = animals.indexOf(a);
    if (idx >= 0) animals.splice(idx, 1);
}
function tryHitAnimal() {
    if (animals.length === 0) return false;
    const origin = camera.position;
    camera.getWorldDirection(rayDir);
    const REACH_ANIMAL = 3.2;
    let best = null, bestDist = Infinity;
    for (const a of animals) {
        const tx = a.pos.x, ty = a.pos.y + 0.7, tz = a.pos.z;
        _meleeTmp.set(tx - origin.x, ty - origin.y, tz - origin.z);
        const dist = _meleeTmp.length();
        if (dist > REACH_ANIMAL) continue;
        _meleeTmp.multiplyScalar(1 / Math.max(dist, 0.0001));
        const dot = _meleeTmp.dot(rayDir);
        if (dot < 0.5) continue;
        if (dist < bestDist) { bestDist = dist; best = a; }
    }
    if (!best) return false;
    damageAnimal(best, 2, origin.x, origin.z);
    triggerPlaceAnimation();
    return true;
}
function clearAnimals() {
    for (const a of animals) {
        scene.remove(a.mesh);
        a.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    animals.length = 0;
    spawnedGroups.clear();
    animalGroupCheckAccum = ANIMAL_GROUP_CHECK;
    breedCheckAccum = BREED_CHECK_PERIOD;
}

/* ---------- Melee against players ---------- */
const MELEE_RANGE = 2.5, MELEE_DAMAGE = 1;
const _meleeTmp = new THREE.Vector3();

function tryMelee() {
    if (remotePlayers.size === 0) return false;
    const origin = camera.position;
    camera.getWorldDirection(rayDir);
    let best = null, bestDist = Infinity;
    for (const [id, rp] of remotePlayers) {
        const tx = rp.curPos.x, ty = rp.curPos.y + 1.2, tz = rp.curPos.z;
        _meleeTmp.set(tx - origin.x, ty - origin.y, tz - origin.z);
        const dist = _meleeTmp.length();
        if (dist > MELEE_RANGE) continue;
        _meleeTmp.multiplyScalar(1 / Math.max(dist, 0.0001));
        const dot = _meleeTmp.dot(rayDir);
        if (dot < 0.55) continue;
        if (dist < bestDist) { bestDist = dist; best = { id, rp }; }
    }
    if (!best) return false;
    const kx = rayDir.x, kz = rayDir.z;
    const klen = Math.hypot(kx, kz) || 1;
    sendHit(best.id, MELEE_DAMAGE, kx / klen, kz / klen);
    triggerPlaceAnimation();
    return true;
}
function applyHitToSelf(dmg, kx, kz) {
    damagePlayer(dmg);
    playerVelocity.x += (kx || 0) * 9;
    playerVelocity.z += (kz || 0) * 9;
    playerVelocity.y = Math.max(playerVelocity.y, 4);
    onGround = false;
}

/* ============================================================
   INPUT
   ============================================================ */
function onKeyDown(e) {
    if (CHAT.open) {
        if (e.code === 'Enter') { e.preventDefault(); sendChat(); }
        else if (e.code === 'Escape') { e.preventDefault(); closeChat(); }
        return;
    }
    if (e.code === 'Escape') {
        if (uiOverlayOpen()) { e.preventDefault(); closeOverlay(); }
        return;
    }
    if (uiOverlayOpen()) {
        if (e.code === 'KeyI') { closeOverlay(); e.preventDefault(); }
        return;
    }
    if (gameState !== 'playing') return;
    switch (e.code) {
        case 'KeyW': case 'ArrowUp': moveForward = true; break;
        case 'KeyS': case 'ArrowDown': moveBackward = true; break;
        case 'KeyA': case 'ArrowLeft': moveLeft = true; break;
        case 'KeyD': case 'ArrowRight': moveRight = true; break;
        case 'Space': jumpHeld = true; e.preventDefault(); break;
        case 'ShiftLeft': case 'ShiftRight': sprintHeld = true; break;
        case 'ControlLeft': case 'ControlRight': sinkHeld = true; e.preventDefault(); break;
        case 'Digit1': inventory.selected = 0; renderHotbarUI(); break;
        case 'Digit2': inventory.selected = 1; renderHotbarUI(); break;
        case 'Digit3': inventory.selected = 2; renderHotbarUI(); break;
        case 'Digit4': inventory.selected = 3; renderHotbarUI(); break;
        case 'Digit5': inventory.selected = 4; renderHotbarUI(); break;
        case 'Digit6': inventory.selected = 5; renderHotbarUI(); break;
        case 'Digit7': inventory.selected = 6; renderHotbarUI(); break;
        case 'Digit8': inventory.selected = 7; renderHotbarUI(); break;
        case 'Digit9': inventory.selected = 8; renderHotbarUI(); break;
        case 'Digit0': inventory.selected = 9; renderHotbarUI(); break;
        case 'KeyI': openInventoryUI(); e.preventDefault(); break;
        case 'KeyT': openChat(); e.preventDefault(); break;
        case 'F5': toggleThirdPerson(); e.preventDefault(); break;
        case 'KeyN': renameSelf(); e.preventDefault(); break;
    }
}
function onKeyUp(e) {
    if (CHAT.open) return;
    switch (e.code) {
        case 'KeyW': case 'ArrowUp': moveForward = false; break;
        case 'KeyS': case 'ArrowDown': moveBackward = false; break;
        case 'KeyA': case 'ArrowLeft': moveLeft = false; break;
        case 'KeyD': case 'ArrowRight': moveRight = false; break;
        case 'Space': jumpHeld = false; break;
        case 'ShiftLeft': case 'ShiftRight': sprintHeld = false; break;
        case 'ControlLeft': case 'ControlRight': sinkHeld = false; break;
    }
}
function onWheel(e) {
    if (gameState !== 'playing' || CHAT.open || uiOverlayOpen()) return;
    inventory.selected = (inventory.selected + (e.deltaY > 0 ? 1 : -1) + INV_HOTBAR) % INV_HOTBAR;
    renderHotbarUI();
}
function blockIntersectsPlayer(bx, by, bz) {
    const p = camera.position;
    const minY = p.y - PLAYER_EYE, maxY = p.y + PLAYER_HEAD;
    return Math.abs(bx - p.x) < 0.5 + PLAYER_RADIUS &&
           Math.abs(bz - p.z) < 0.5 + PLAYER_RADIUS &&
           by + 0.5 > minY && by - 0.5 < maxY;
}
function markEdit(wx, wy, wz, type, broadcast) {
    const prevType = getBlock(wx, wy, wz);
    const cx = Math.floor(wx / CHUNK_SIZE), cz = Math.floor(wz / CHUNK_SIZE);
    const lx = wx - cx * CHUNK_SIZE, lz = wz - cz * CHUNK_SIZE;
    const key = cx + ',' + cz;
    if (!modifiedBlocks.has(key)) modifiedBlocks.set(key, {});
    modifiedBlocks.get(key)[lx + ',' + wy + ',' + lz] = type;
    setBlockLocal(wx, wy, wz, type);
    if (prevType === BLOCKS.TORCH && type !== BLOCKS.TORCH) removeTorchLight(wx, wy, wz);
    if (type === BLOCKS.TORCH && prevType !== BLOCKS.TORCH) addTorchLight(wx, wy, wz);
    refreshChunk(cx, cz);
    if (lx === 0) refreshChunk(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) refreshChunk(cx + 1, cz);
    if (lz === 0) refreshChunk(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) refreshChunk(cx, cz + 1);
    if (broadcast !== false) netSendEdit(key, lx + ',' + wy + ',' + lz, type);
}
function waterShouldFill(wx, wy, wz) {
    if (getBlock(wx + 1, wy, wz) === BLOCKS.WATER) return true;
    if (getBlock(wx - 1, wy, wz) === BLOCKS.WATER) return true;
    if (getBlock(wx, wy, wz + 1) === BLOCKS.WATER) return true;
    if (getBlock(wx, wy, wz - 1) === BLOCKS.WATER) return true;
    if (getBlock(wx, wy + 1, wz) === BLOCKS.WATER) return true;
    return false;
}
const rayDir = new THREE.Vector3();
function raycastVoxel(maxDistance) {
    const origin = camera.position;
    camera.getWorldDirection(rayDir);
    let bx = Math.round(origin.x), by = Math.round(origin.y), bz = Math.round(origin.z);
    const stepX = rayDir.x > 0 ? 1 : -1, stepY = rayDir.y > 0 ? 1 : -1, stepZ = rayDir.z > 0 ? 1 : -1;
    const invX = rayDir.x !== 0 ? Math.abs(1 / rayDir.x) : Infinity;
    const invY = rayDir.y !== 0 ? Math.abs(1 / rayDir.y) : Infinity;
    const invZ = rayDir.z !== 0 ? Math.abs(1 / rayDir.z) : Infinity;
    let tMaxX = rayDir.x !== 0 ? ((bx + stepX * 0.5) - origin.x) / rayDir.x : Infinity;
    let tMaxY = rayDir.y !== 0 ? ((by + stepY * 0.5) - origin.y) / rayDir.y : Infinity;
    let tMaxZ = rayDir.z !== 0 ? ((bz + stepZ * 0.5) - origin.z) / rayDir.z : Infinity;
    let prevX = bx, prevY = by, prevZ = bz, t = 0;
    for (let i = 0; i < 256; i++) {
        const block = getBlock(bx, by, bz);
        if (block > 0 && block !== BLOCKS.WATER) return { x: bx, y: by, z: bz, px: prevX, py: prevY, pz: prevZ, type: block };
        prevX = bx; prevY = by; prevZ = bz;
        if (tMaxX < tMaxY && tMaxX < tMaxZ) { bx += stepX; t = tMaxX; tMaxX += invX; }
        else if (tMaxY < tMaxZ) { by += stepY; t = tMaxY; tMaxY += invY; }
        else { bz += stepZ; t = tMaxZ; tMaxZ += invZ; }
        if (t > maxDistance) break;
    }
    return null;
}
function onMouseDown(e) {
    if (uiOverlayOpen()) return;
    if (gameState !== 'playing' || !controls.isLocked || CHAT.open) return;

    if (e.button === 0) {
        if (tryMelee()) return;
        if (tryHitAnimal()) return;
        mouseLeftDown = true;
        startMining();
    } else if (e.button === 2) {
        const held = inventory.slots[inventory.selected];
        if (held && isFood(held.type)) {
            if (eatFood()) { triggerPlaceAnimation(); return; }
        }
        const hit = raycastVoxel(REACH);
        if (!hit) return;
        if (hit.type === BLOCKS.CRAFTING_TABLE) { openCraftingTableUI(); return; }
        if (hit.type === BLOCKS.OVEN) { openOvenUI(hit.x, hit.y, hit.z); return; }
        if (!held || held.count <= 0) return;
        if (isFood(held.type)) return;
        const target = getBlock(hit.px, hit.py, hit.pz);
        if ((target === BLOCKS.AIR || target === BLOCKS.WATER) &&
            hit.py >= 0 && hit.py < WORLD_HEIGHT &&
            !blockIntersectsPlayer(hit.px, hit.py, hit.pz)) {
            markEdit(hit.px, hit.py, hit.pz, held.type, true);
            invRemoveAt(inventory.selected, 1);
            renderHotbarUI();
            if (uiOverlay.mode) refreshCurrentOverlay();
            triggerPlaceAnimation();
        }
    }
}
function onMouseUp(e) {
    if (e.button === 0) { mouseLeftDown = false; resetMining(); }
}

/* ============================================================
   PHYSICS
   ============================================================ */
function collides(pos) {
    const minX = Math.round(pos.x - PLAYER_RADIUS + 0.001);
    const maxX = Math.round(pos.x + PLAYER_RADIUS - 0.001);
    const minY = Math.round(pos.y - PLAYER_EYE + 0.001);
    const maxY = Math.round(pos.y + PLAYER_HEAD - 0.001);
    const minZ = Math.round(pos.z - PLAYER_RADIUS + 0.001);
    const maxZ = Math.round(pos.z + PLAYER_RADIUS - 0.001);
    for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) for (let z = minZ; z <= maxZ; z++) {
        if (isSolid(getBlock(x, y, z))) return true;
    }
    return false;
}
function sampleWater() {
    const p = camera.position;
    const bx = Math.round(p.x), bz = Math.round(p.z);
    const feetBlock = Math.round(p.y - PLAYER_EYE + 0.3);
    let top = -Infinity;
    for (let y = feetBlock; y <= feetBlock + 3; y++) {
        if (isWater(getBlock(bx, y, bz))) top = y;
        else break;
    }
    wasInWater = inWater;
    inWater = top > -Infinity;
    waterSurfaceY = inWater ? top + 0.375 : -Infinity;
    submerged = inWater && p.y < waterSurfaceY;
}
const _stepVec = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _physPos = new THREE.Vector3();

function applyPhysics(delta) {
    if (!playerSpawned) return;
    const p = camera.position;
    if (getBlock(Math.round(p.x), 0, Math.round(p.z)) === -1) return;
    sampleWater();
    if (ui.waterOverlay) ui.waterOverlay.style.opacity = submerged ? '1' : '0';
    if (inWater && !wasInWater && playerVelocity.y < -6) playerVelocity.y *= 0.25;

    if (inWater) {
        const bodyY = p.y - 0.72;
        const depth = THREE.MathUtils.clamp((waterSurfaceY - bodyY) / 0.8, 0, 1);
        const buoyancy = THREE.MathUtils.lerp(6.0, 24.0, depth);
        playerVelocity.y += (buoyancy - WATER_GRAVITY) * delta;
        playerVelocity.y -= playerVelocity.y * 5.0 * delta;
        if (jumpHeld && !(onGround && !submerged)) playerVelocity.y += 26.0 * delta;
        if (sinkHeld) playerVelocity.y -= 26.0 * delta;
        playerVelocity.y = THREE.MathUtils.clamp(playerVelocity.y, -5.0, 5.0);
    } else {
        playerVelocity.y -= GRAVITY * delta;
        playerVelocity.y = Math.max(playerVelocity.y, -45.0);
    }
    if (jumpHeld && onGround && (!inWater || !submerged)) { playerVelocity.y = JUMP_SPEED; onGround = false; }

    _moveDir.set(0, 0, 0);
    _moveDir.z = Number(moveForward) - Number(moveBackward);
    _moveDir.x = Number(moveRight) - Number(moveLeft);
    if (_moveDir.lengthSq() > 0) _moveDir.normalize();

    const sprinting = sprintHeld && moveForward;
    const speed = inWater ? SWIM_SPEED : (sprinting ? SPRINT_SPEED : WALK_SPEED);
    const damping = inWater ? 6.0 : 10.0;
    playerVelocity.x += _moveDir.x * speed * damping * delta;
    playerVelocity.z += _moveDir.z * speed * damping * delta;
    playerVelocity.x -= playerVelocity.x * damping * delta;
    playerVelocity.z -= playerVelocity.z * damping * delta;

    _physPos.copy(p);
    _physPos.y += playerVelocity.y * delta;
    if (collides(_physPos)) {
        if (playerVelocity.y <= 0) {
            const feetY = _physPos.y - PLAYER_EYE;
            _physPos.y = Math.floor(feetY + 0.5) + 0.5 + PLAYER_EYE;
            onGround = true;
        } else {
            const headY = _physPos.y + PLAYER_HEAD;
            _physPos.y = Math.ceil(headY - 0.5) - 0.5 - PLAYER_HEAD - 0.001;
        }
        playerVelocity.y = 0;
    } else onGround = false;

    const yaw = camera.rotation.y;
    const sinY = Math.sin(yaw), cosY = Math.cos(yaw);
    _stepVec.set(
        (-sinY * playerVelocity.z + cosY * playerVelocity.x) * delta,
        0,
        (-cosY * playerVelocity.z - sinY * playerVelocity.x) * delta
    );
    let blockedHorizontally = false;
    _physPos.x += _stepVec.x;
    if (collides(_physPos)) { _physPos.x -= _stepVec.x; playerVelocity.x *= 0.4; blockedHorizontally = true; }
    _physPos.z += _stepVec.z;
    if (collides(_physPos)) { _physPos.z -= _stepVec.z; playerVelocity.z *= 0.4; blockedHorizontally = true; }
    if (inWater && blockedHorizontally && _moveDir.lengthSq() > 0 && _physPos.y > waterSurfaceY - 1.6) {
        playerVelocity.y = Math.max(playerVelocity.y, JUMP_SPEED);
    }
    p.copy(_physPos);

    /* Fall damage */
    if (inWater && !wasInWater) fallStartY = camera.position.y;
    if (!inWater) {
        const justLanded = !wasOnGroundPrev && onGround;
        if (justLanded) {
            const fell = fallStartY - camera.position.y;
            if (fell > 3.0) {
                const dmg = (fell - 3.0) * 0.5;
                if (dmg > 0) damagePlayer(dmg);
            }
        }
        if (onGround) fallStartY = camera.position.y;
        else fallStartY = Math.max(fallStartY, camera.position.y);
    } else fallStartY = camera.position.y;
    wasOnGroundPrev = onGround;

    if (p.y < -20) {
        const top = columnTop(Math.round(p.x), Math.round(p.z));
        p.y = (top > 0 ? top : SEA_LEVEL) + 4;
        playerVelocity.set(0, 0, 0);
        fallStartY = p.y;
        wasOnGroundPrev = true;
    }
}

/* ============================================================
   MULTIPLAYER
   ============================================================ */
const NET = {
    peer: null, isHost: false, roomId: '', myId: 0, myName: '',
    connections: new Map(), hostConn: null, nextRemoteId: 1,
    lastSendTime: 0, sendInterval: 66, serverConfig: null,
    timeTarget: null, lastTimeSync: 0
};
const BANNED_PEERS = new Set();
const remotePlayers = new Map();

function netEncodeAnim() {
    let bits = 0;
    if (onGround) bits |= ANIMBIT.GROUND;
    if (inWater) bits |= ANIMBIT.WATER;
    if (submerged) bits |= ANIMBIT.SUBMERGED;
    if (ANIM.sprintAmount > 0.5) bits |= ANIMBIT.SPRINT;
    if (ANIM.jumpPose > 0.3) bits |= ANIMBIT.JUMP;
    if (ANIM.placePose > 0.3) bits |= ANIMBIT.PLACE;
    if (ANIM.moveAmount > 0.1) bits |= ANIMBIT.MOVING;
    return bits;
}
function broadcastNet(msg, excludeId) {
    if (NET.isHost) {
        for (const [id, conn] of NET.connections) {
            if (id === excludeId) continue;
            if (conn.open) { try { conn.send(msg); } catch (e) {} }
        }
    } else if (NET.hostConn && NET.hostConn.open) {
        try { NET.hostConn.send(msg); } catch (e) {}
    }
}
function netSendEdit(chunkKey, blockKey, type) {
    if (!NET.peer) return;
    broadcastNet({ t: 'edit', ck: chunkKey, bk: blockKey, y: type });
}
function sendHit(targetId, dmg, kx, kz) {
    if (NET.isHost) {
        if (targetId === 0) applyHitToSelf(dmg, kx, kz);
        else {
            const conn = NET.connections.get(targetId);
            if (conn && conn.open) { try { conn.send({ t: 'hit', dmg, kx, kz }); } catch (e) {} }
        }
    } else broadcastNet({ t: 'hit', id: targetId, dmg, kx, kz });
}
function generateRoomId() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}
function makeInviteUrl(roomId) {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    url.hash = '';
    return url.toString();
}
function makeGmailInviteUrl(roomId, hostName) {
    const link = makeInviteUrl(roomId);
    const subject = encodeURIComponent(hostName + ' invited you to a voxel world!');
    const body = encodeURIComponent('Hey!\n\nJoin my voxel world by opening this link:\n' + link + '\n\nRoom code: ' + roomId + '\n');
    return 'https://mail.google.com/mail/?view=cm&fs=1&su=' + subject + '&body=' + body;
}
function buildRemoteAvatar(name) {
    const g = new THREE.Group();
    const skinMat = new THREE.MeshLambertMaterial({ color: SKIN_COLOR });
    const shirtMat = new THREE.MeshLambertMaterial({ color: SHIRT_COLOR });
    const pantsMat = new THREE.MeshLambertMaterial({ color: PANTS_COLOR });
    const shoeMat = new THREE.MeshLambertMaterial({ color: SHOE_COLOR });
    const hairMat = new THREE.MeshLambertMaterial({ color: HAIR_COLOR });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2a });

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
    head.position.set(0, 1.55, 0); g.add(head);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.10, 0.52), hairMat);
    hair.position.set(0, 1.83, 0); g.add(hair);
    const eyeGeo = new THREE.BoxGeometry(0.10, 0.09, 0.02);
    for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(sx * 0.11, 1.60, -0.251); g.add(eye);
    }
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), shirtMat);
    torso.position.set(0, 1.05, 0); g.add(torso);
    const armGeo = new THREE.BoxGeometry(0.18, 0.70, 0.18); armGeo.translate(0, -0.35, 0);
    const armL = new THREE.Mesh(armGeo, skinMat); armL.position.set(-0.34, 1.42, 0); g.add(armL);
    const armR = new THREE.Mesh(armGeo, skinMat); armR.position.set(0.34, 1.42, 0); g.add(armR);
    const sleeveGeo = new THREE.BoxGeometry(0.20, 0.24, 0.20); sleeveGeo.translate(0, -0.12, 0);
    armL.add(new THREE.Mesh(sleeveGeo, shirtMat));
    armR.add(new THREE.Mesh(sleeveGeo, shirtMat));
    const legGeo = new THREE.BoxGeometry(0.20, 0.75, 0.20); legGeo.translate(0, -0.375, 0);
    const legL = new THREE.Mesh(legGeo, pantsMat); legL.position.set(-0.13, 0.75, 0); g.add(legL);
    const legR = new THREE.Mesh(legGeo, pantsMat); legR.position.set(0.13, 0.75, 0); g.add(legR);
    const shoeGeo = new THREE.BoxGeometry(0.22, 0.10, 0.26);
    const shoeL = new THREE.Mesh(shoeGeo, shoeMat); shoeL.position.set(-0.13, 0.05, -0.02); g.add(shoeL);
    const shoeR = new THREE.Mesh(shoeGeo, shoeMat); shoeR.position.set(0.13, 0.05, -0.02); g.add(shoeR);
    const label = makeNameTagSprite(name, 2.4);
    label.position.set(0, 2.85, 0); g.add(label);
    return { group: g, rig: { armL, armR, legL, legR, torso, head }, label, labelTex: label.material.map };
}
function addRemotePlayer(id, name, pos, rot, animBits) {
    const feetY = pos[1] - PLAYER_EYE;
    if (remotePlayers.has(id)) {
        const rp = remotePlayers.get(id);
        rp.targetPos.set(pos[0], feetY, pos[2]);
        rp.targetRot.y = rot;
        rp.animBits = animBits | 0;
        rp.lastUpdate = performance.now();
        if (name && name !== rp.name) { rp.name = name; updateNameTagSprite(rp.label, name); }
        return;
    }
    const built = buildRemoteAvatar(name);
    built.group.position.set(pos[0], feetY, pos[2]);
    built.group.rotation.y = rot;
    scene.add(built.group);
    remotePlayers.set(id, {
        group: built.group, rig: built.rig, name,
        targetPos: new THREE.Vector3(pos[0], feetY, pos[2]),
        targetRot: { y: rot },
        curPos: new THREE.Vector3(pos[0], feetY, pos[2]),
        curRot: { y: rot },
        animBits: animBits | 0,
        walkPhase: 0, swimPhase: 0, jumpPose: 0, placePose: 0,
        moveAmount: 0, sprintAmount: 0, lean: 0,
        label: built.label, labelTex: built.labelTex,
        lastUpdate: performance.now()
    });
}
function setRemoteTarget(id, pos, rot, animBits) {
    const rp = remotePlayers.get(id);
    if (!rp) return;
    rp.targetPos.set(pos[0], pos[1] - PLAYER_EYE, pos[2]);
    rp.targetRot.y = rot;
    rp.animBits = animBits | 0;
    rp.lastUpdate = performance.now();
}
function setRemoteName(id, name) {
    const rp = remotePlayers.get(id);
    if (!rp || rp.name === name) return;
    rp.name = name;
    updateNameTagSprite(rp.label, name);
}
function removeRemotePlayer(id) {
    const rp = remotePlayers.get(id);
    if (!rp) return;
    scene.remove(rp.group);
    rp.group.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
    });
    if (rp.labelTex) rp.labelTex.dispose();
    remotePlayers.delete(id);
}
function clearRemotePlayers() {
    for (const id of Array.from(remotePlayers.keys())) removeRemotePlayer(id);
}
function updateRemotePlayers(delta) {
    const lerpSpeed = Math.min(1, delta * 12);
    for (const [, rp] of remotePlayers) {
        rp.curPos.lerp(rp.targetPos, lerpSpeed);
        let dy = rp.targetRot.y - rp.curRot.y;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        rp.curRot.y += dy * lerpSpeed;
        rp.group.position.copy(rp.curPos);
        rp.group.rotation.y = rp.curRot.y;
        const bits = rp.animBits;
        const targetMove = (bits & ANIMBIT.MOVING) ? 1 : 0;
        const targetSprint = (bits & ANIMBIT.SPRINT) ? 1 : 0;
        const targetJump = (bits & ANIMBIT.JUMP) ? 1 : 0;
        const targetPlace = (bits & ANIMBIT.PLACE) ? 1 : 0;
        const isSwim = (bits & ANIMBIT.WATER) && !(bits & ANIMBIT.GROUND);
        rp.moveAmount += (targetMove - rp.moveAmount) * Math.min(1, delta * 10);
        rp.sprintAmount += (targetSprint - rp.sprintAmount) * Math.min(1, delta * 8);
        rp.jumpPose += (targetJump - rp.jumpPose) * Math.min(1, delta * (targetJump ? 12 : 8));
        rp.placePose += (targetPlace - rp.placePose) * Math.min(1, delta * 14);
        if (isSwim) rp.swimPhase += delta * 6;
        else if (targetMove) rp.walkPhase += delta * (targetSprint ? 14 : 9);
        else rp.walkPhase *= Math.max(0, 1 - delta * 8);
        const walk = Math.sin(rp.walkPhase);
        const rig = rp.rig;
        let legSwing = walk * 0.85 * rp.moveAmount;
        let armSwing = walk * 0.9 * rp.moveAmount;
        legSwing *= 1 + rp.sprintAmount * 0.4;
        armSwing *= 1 + rp.sprintAmount * 0.3;
        let aL, aR;
        if (isSwim) {
            const s = Math.sin(rp.swimPhase);
            aL = -0.5 + s * 0.7; aR = -0.5 - s * 0.7;
        } else {
            aL = armSwing - rp.jumpPose - rp.sprintAmount * 0.15;
            aR = -armSwing - rp.jumpPose - rp.sprintAmount * 0.15;
        }
        if (rp.placePose > 0.01) aR -= rp.placePose * 1.2;
        rig.armL.rotation.x = aL;
        rig.armR.rotation.x = aR;
        rig.legL.rotation.x = -legSwing + rp.jumpPose * 0.6;
        rig.legR.rotation.x = legSwing + rp.jumpPose * 0.6;
        let targetLean = rp.sprintAmount * 0.22;
        if (isSwim) targetLean = 1.15;
        else if (rp.jumpPose > 0.5) targetLean = -rp.jumpPose * 0.1;
        rp.lean += (targetLean - rp.lean) * Math.min(1, delta * 8);
        rp.group.rotation.x = -rp.lean;
    }
}
function initPeerHost(name, roomId) {
    disconnectMultiplayer(false);
    NET.isHost = true; NET.roomId = roomId; NET.myName = name; NET.myId = 0; NET.nextRemoteId = 1;
    NET.peer = new Peer('voxel-' + roomId, NET.serverConfig);
    NET.peer.on('open', () => {
        if (ui.netStatus) { ui.netStatus.textContent = 'Hosting room ' + roomId; ui.netStatus.classList.add('ok'); }
    });
    NET.peer.on('connection', (conn) => {
        if (conn.peer && BANNED_PEERS.has(conn.peer)) { try { conn.close(); } catch (e) {} return; }
        conn.on('open', () => {
            const remoteId = NET.nextRemoteId++;
            NET.connections.set(remoteId, conn);
            conn._remoteId = remoteId;
            conn._remoteName = 'Player';
            const editsObj = {};
            for (const [ck, map] of modifiedBlocks) editsObj[ck] = map;
            const players = [];
            for (const [id, rp] of remotePlayers) {
                players.push({
                    id, name: rp.name,
                    pos: [rp.curPos.x, rp.curPos.y + PLAYER_EYE, rp.curPos.z],
                    rot: rp.curRot.y, anim: rp.animBits
                });
            }
            conn.send({
                t: 'welcome', id: remoteId, seed: currentSeed,
                edits: editsObj, players, hostName: NET.myName, time: totalGameTime
            });
            pushChatLine('', (name || 'Player') + ' is joining…', true);
        });
        conn.on('data', (data) => handleClientData(conn._remoteId, data, conn));
        conn.on('close', () => {
            const id = conn._remoteId;
            if (id === undefined) return;
            const rp = remotePlayers.get(id);
            const nm = rp ? rp.name : (conn._remoteName || 'Player');
            NET.connections.delete(id);
            removeRemotePlayer(id);
            broadcastNet({ t: 'leave', id });
            pushChatLine('', nm + ' left the world.', true);
        });
        conn.on('error', () => {});
    });
    NET.peer.on('error', (err) => {
        if (ui.netStatus) { ui.netStatus.textContent = 'Peer error: ' + err.type; ui.netStatus.classList.add('error'); }
    });
}
function initPeerClient(name, roomId) {
    disconnectMultiplayer(false);
    NET.isHost = false; NET.roomId = roomId; NET.myName = name; NET.myId = -1;
    NET.peer = new Peer(NET.serverConfig);
    NET.peer.on('open', () => {
        if (ui.netStatus) ui.netStatus.textContent = 'Connecting to room ' + roomId + '…';
        const conn = NET.peer.connect('voxel-' + roomId, { reliable: true });
        conn.on('open', () => { NET.hostConn = conn; conn.send({ t: 'hello', name: NET.myName }); });
        conn.on('data', (data) => handleHostData(data));
        conn.on('close', () => {
            if (ui.netStatus) ui.netStatus.textContent = 'Host disconnected.';
            pushChatLine('', 'Disconnected from host.', true);
            clearRemotePlayers();
            NET.hostConn = null;
        });
        conn.on('error', () => {});
    });
    NET.peer.on('error', (err) => {
        if (ui.netStatus) {
            ui.netStatus.textContent = err.type === 'peer-unavailable' ? ('Room not found: ' + roomId) : ('Peer error: ' + err.type);
            ui.netStatus.classList.add('error');
        }
    });
}
function handleClientData(remoteId, data, conn) {
    if (!data || typeof data !== 'object') return;
    switch (data.t) {
        case 'hello': {
            const nm = (data.name || 'Player').slice(0, 24);
            conn._remoteName = nm;
            addRemotePlayer(remoteId, nm, [0, SEA_LEVEL + 24, 0], 0, 0);
            broadcastNet({ t: 'join', id: remoteId, name: nm }, remoteId);
            pushChatLine('', nm + ' joined the world.', true);
            break;
        }
        case 'pos':
            setRemoteTarget(remoteId, data.p, data.r, data.a);
            broadcastNet({ t: 'pos', id: remoteId, p: data.p, r: data.r, a: data.a }, remoteId);
            break;
        case 'edit':
            applyRemoteEdit(data.ck, data.bk, data.y);
            broadcastNet(data, remoteId);
            break;
        case 'chat': {
            const nm = (data.n || 'Player').slice(0, 24);
            const msg = String(data.m || '').slice(0, 200);
            pushChatLine(nm, msg, false);
            broadcastNet(data, remoteId);
            break;
        }
        case 'name': {
            const nm = (data.name || 'Player').slice(0, 24);
            conn._remoteName = nm;
            setRemoteName(remoteId, nm);
            broadcastNet({ t: 'name', id: remoteId, name: nm }, remoteId);
            break;
        }
        case 'hit': {
            if (data.id === 0) applyHitToSelf(data.dmg, data.kx, data.kz);
            else {
                const target = NET.connections.get(data.id);
                if (target && target.open) { try { target.send({ t: 'hit', dmg: data.dmg, kx: data.kx, kz: data.kz }); } catch (e) {} }
            }
            break;
        }
    }
}
function handleHostData(data) {
    if (!data || typeof data !== 'object') return;
    switch (data.t) {
        case 'welcome': {
            NET.myId = data.id;
            if (ui.netStatus) { ui.netStatus.textContent = 'Connected to room ' + NET.roomId; ui.netStatus.classList.add('ok'); }
            pushChatLine('', 'Joined room ' + NET.roomId, true);
            if (typeof data.time === 'number') NET.timeTarget = data.time;
            startWorld(data.seed | 0, data.edits || {});
            for (const p of (data.players || [])) {
                if (p.id === NET.myId) continue;
                addRemotePlayer(p.id, p.name, p.pos, p.rot, p.anim || 0);
            }
            break;
        }
        case 'join':
            if (data.id === NET.myId) break;
            addRemotePlayer(data.id, data.name, [0, SEA_LEVEL + 24, 0], 0, 0);
            pushChatLine('', data.name + ' joined the world.', true);
            break;
        case 'leave': {
            const rp = remotePlayers.get(data.id);
            const nm = rp ? rp.name : 'Player';
            removeRemotePlayer(data.id);
            pushChatLine('', nm + ' left the world.', true);
            break;
        }
        case 'pos':
            if (data.id === NET.myId) break;
            if (!remotePlayers.has(data.id)) addRemotePlayer(data.id, 'Player', data.p, data.r, data.a || 0);
            else setRemoteTarget(data.id, data.p, data.r, data.a);
            break;
        case 'edit': applyRemoteEdit(data.ck, data.bk, data.y); break;
        case 'chat': pushChatLine((data.n || 'Player').slice(0, 24), String(data.m || '').slice(0, 200), false); break;
        case 'name': setRemoteName(data.id, (data.name || 'Player').slice(0, 24)); break;
        case 'hit': applyHitToSelf(data.dmg, data.kx, data.kz); break;
        case 'time': if (typeof data.v === 'number') NET.timeTarget = data.v; break;
    }
}
function applyRemoteEdit(chunkKey, blockKey, type) {
    let map = modifiedBlocks.get(chunkKey);
    if (!map) { map = {}; modifiedBlocks.set(chunkKey, map); }
    map[blockKey] = type;
    const ck = chunkKey.split(',');
    const cx = Number(ck[0]), cz = Number(ck[1]);
    const bk = blockKey.split(',');
    const lx = Number(bk[0]), y = Number(bk[1]), lz = Number(bk[2]);
    const wx = cx * CHUNK_SIZE + lx, wz = cz * CHUNK_SIZE + lz;
    const prevType = getBlock(wx, y, wz);
    const rec = chunkData.get(chunkKey);
    if (rec && y >= 0 && y < rec.h) rec.data[(lx * CHUNK_SIZE + lz) * rec.h + y] = type;
    if (prevType === BLOCKS.TORCH && type !== BLOCKS.TORCH) removeTorchLight(wx, y, wz);
    if (type === BLOCKS.TORCH && prevType !== BLOCKS.TORCH) addTorchLight(wx, y, wz);
    refreshChunk(cx, cz);
    if (lx === 0) refreshChunk(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) refreshChunk(cx + 1, cz);
    if (lz === 0) refreshChunk(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) refreshChunk(cx, cz + 1);
}
const _sendPayload = { t: 'pos', p: [0, 0, 0], r: 0, a: 0 };
function sendMyPosition() {
    if (!NET.peer) return;
    _sendPayload.p[0] = camera.position.x;
    _sendPayload.p[1] = camera.position.y;
    _sendPayload.p[2] = camera.position.z;
    _sendPayload.r = camera.rotation.y;
    _sendPayload.a = netEncodeAnim();
    broadcastNet(_sendPayload);
}
function disconnectMultiplayer(showUI) {
    if (NET.peer) { try { NET.peer.destroy(); } catch (e) {} NET.peer = null; }
    NET.connections.clear();
    NET.hostConn = null;
    NET.isHost = false;
    NET.roomId = '';
    NET.myId = 0;
    NET.timeTarget = null;
    clearRemotePlayers();
    if (showUI !== false && ui.netStatus) {
        ui.netStatus.textContent = 'Not connected';
        ui.netStatus.classList.remove('error', 'ok');
        if (ui.mpHost) ui.mpHost.disabled = false;
        if (ui.mpJoinToggle) ui.mpJoinToggle.disabled = false;
        if (ui.mpDisconnect) ui.mpDisconnect.classList.add('hidden');
        if (ui.mpInvite) ui.mpInvite.classList.add('hidden');
    }
}
function handleAdminCommand(text) {
    if (!NET.isHost) { pushChatLine('', 'Only the host can use admin commands.', true); return; }
    const parts = text.slice(1).split(/\s+/);
    const cmd = (parts[0] || '').toLowerCase();
    const arg = parts[1];
    switch (cmd) {
        case 'kick': {
            if (!arg) { pushChatLine('', 'Usage: /kick [id]', true); return; }
            const id = parseInt(arg, 10);
            const conn = NET.connections.get(id);
            if (!conn) { pushChatLine('', 'No player id ' + id, true); return; }
            const rp = remotePlayers.get(id);
            const nm = rp ? rp.name : 'Player';
            pushChatLine('', 'Kicked ' + nm + '.', true);
            try { conn.close(); } catch (e) {}
            NET.connections.delete(id);
            removeRemotePlayer(id);
            broadcastNet({ t: 'leave', id });
            break;
        }
        case 'ban': {
            if (!arg) { pushChatLine('', 'Usage: /ban [id]', true); return; }
            const id = parseInt(arg, 10);
            const conn = NET.connections.get(id);
            const peerId = conn ? conn.peer : null;
            if (peerId) BANNED_PEERS.add(peerId);
            const rp = remotePlayers.get(id);
            const nm = rp ? rp.name : 'Player';
            pushChatLine('', 'Banned ' + nm + '.', true);
            if (conn) {
                try { conn.close(); } catch (e) {}
                NET.connections.delete(id);
                removeRemotePlayer(id);
                broadcastNet({ t: 'leave', id });
            }
            break;
        }
        case 'players': {
            const ids = [];
            for (const [id] of NET.connections) {
                const rp = remotePlayers.get(id);
                ids.push(id + '=' + (rp ? rp.name : '?'));
            }
            pushChatLine('', 'Connected: ' + (ids.join(', ') || 'none'), true);
            break;
        }
        default: pushChatLine('', 'Commands: /kick /ban /players', true);
    }
}
function renameSelf() {
    const nn = prompt('New name:', NET.myName || 'Player');
    if (nn === null) return;
    const trimmed = nn.trim().slice(0, 24);
    if (!trimmed) return;
    NET.myName = trimmed;
    if (ui.mpName) ui.mpName.value = trimmed;
    if (ownNameTag) updateNameTagSprite(ownNameTag, trimmed);
    broadcastNet({ t: 'name', name: trimmed });
    pushChatLine('', 'You are now "' + trimmed + '".', true);
}

/* ---------- Injected UI ---------- */
function injectChatUI() {
    if (document.getElementById('chat-log')) return;
    const log = document.createElement('div');
    log.id = 'chat-log';
    document.body.appendChild(log);
    ui.chatLog = log;

    const input = document.createElement('input');
    input.id = 'chat-input';
    input.className = 'hidden';
    input.type = 'text';
    input.maxLength = 200;
    input.placeholder = 'Type a message and press Enter…';
    document.body.appendChild(input);
    ui.chatInput = input;

    const hint = document.createElement('div');
    hint.id = 'chat-hint';
    hint.textContent = 'T · chat    N · rename    F5 · 3rd person    I · inventory';
    document.body.appendChild(hint);

    input.addEventListener('keydown', (e) => {
        if (e.code === 'Enter') { e.preventDefault(); sendChat(); }
        else if (e.code === 'Escape') { e.preventDefault(); closeChat(); }
    });
}
function wireMultiplayerUI() {
    ui.mpName = document.getElementById('mp-name');
    ui.mpHost = document.getElementById('mp-host');
    ui.mpJoinToggle = document.getElementById('mp-join-toggle');
    ui.mpJoinRow = document.getElementById('mp-join-row');
    ui.mpRoom = document.getElementById('mp-room');
    ui.mpJoin = document.getElementById('mp-join');
    ui.mpInvite = document.getElementById('mp-invite');
    ui.mpRoomDisplay = document.getElementById('mp-room-display');
    ui.mpInviteGmail = document.getElementById('mp-invite-gmail');
    ui.mpCopyLink = document.getElementById('mp-copy-link');
    ui.mpInviteLink = document.getElementById('mp-invite-link');
    ui.mpDisconnect = document.getElementById('mp-disconnect');
    ui.netStatus = document.getElementById('mp-status');

    const saved = (typeof localStorage !== 'undefined') && localStorage.getItem('voxel.name');
    ui.mpName.value = saved || ('Player' + Math.floor(Math.random() * 1000));
    NET.myName = ui.mpName.value;

    ui.mpName.addEventListener('change', () => {
        const v = ui.mpName.value.trim().slice(0, 24);
        if (v) {
            NET.myName = v;
            if (ownNameTag) updateNameTagSprite(ownNameTag, v);
            try { localStorage.setItem('voxel.name', v); } catch (e) {}
        }
    });
    ui.mpHost.addEventListener('click', () => {
        const name = ui.mpName.value.trim() || 'Host';
        NET.myName = name;
        if (ownNameTag) updateNameTagSprite(ownNameTag, name);
        const roomId = generateRoomId();
        const seedText = ui.seedInput.value || String(Math.floor(Math.random() * 2147483647));
        startWorld(hashSeed(seedText), null);
        initPeerHost(name, roomId);
        ui.mpInvite.classList.remove('hidden');
        ui.mpDisconnect.classList.remove('hidden');
        ui.mpHost.disabled = true;
        ui.mpJoinToggle.disabled = true;
        ui.mpRoomDisplay.textContent = roomId;
        ui.mpInviteLink.textContent = makeInviteUrl(roomId);
    });
    ui.mpJoinToggle.addEventListener('click', () => ui.mpJoinRow.classList.toggle('hidden'));
    ui.mpJoin.addEventListener('click', () => {
        const room = ui.mpRoom.value.trim().toLowerCase();
        const name = ui.mpName.value.trim() || 'Player';
        NET.myName = name;
        if (ownNameTag) updateNameTagSprite(ownNameTag, name);
        if (!room) return;
        initPeerClient(name, room);
        ui.mpDisconnect.classList.remove('hidden');
        ui.mpHost.disabled = true;
        ui.mpJoinToggle.disabled = true;
    });
    ui.mpInviteGmail.addEventListener('click', () => window.open(makeGmailInviteUrl(NET.roomId, NET.myName), '_blank'));
    ui.mpCopyLink.addEventListener('click', () => {
        const link = makeInviteUrl(NET.roomId);
        if (navigator.clipboard) navigator.clipboard.writeText(link);
        ui.mpInviteLink.textContent = 'Copied: ' + link;
    });
    ui.mpDisconnect.addEventListener('click', () => disconnectMultiplayer(true));
    const dq = ui.mpDisconnect.querySelector('button');
    if (dq) dq.addEventListener('click', () => disconnectMultiplayer(true));
}
function checkAutoJoin() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (!room) return;
    const name = ui.mpName.value.trim() || ('Guest' + Math.floor(Math.random() * 1000));
    ui.mpName.value = name;
    NET.myName = name;
    if (ownNameTag) updateNameTagSprite(ownNameTag, name);
    initPeerClient(name, room.toLowerCase());
    ui.mpDisconnect.classList.remove('hidden');
    ui.mpHost.disabled = true;
    ui.mpJoinToggle.disabled = true;
}

/* ============================================================
   SETUP
   ============================================================ */
function cacheUI() {
    ui.menu = document.getElementById('menu');
    ui.loading = document.getElementById('loading');
    ui.ready = document.getElementById('ready');
    ui.pause = document.getElementById('pause');
    ui.hud = document.getElementById('hud');
    ui.hotbar = document.getElementById('hotbar');
    ui.crosshair = document.getElementById('crosshair');
    ui.waterOverlay = document.getElementById('water-overlay');
    ui.damageOverlay = document.getElementById('damage-overlay');
    ui.loadingBar = document.getElementById('loading-bar');
    ui.loadingPct = document.getElementById('loading-pct');
    ui.seedInput = document.getElementById('seed-input');
    ui.hearts = document.getElementById('hearts');
    ui.hungries = document.getElementById('hungries');
    ui.statusBars = document.getElementById('status-bars');
    ui.mineHud = document.getElementById('mine-hud');
    ui.mineFill = document.getElementById('mine-hud-fill');
}
function wireMenu() {
    document.getElementById('generate-btn').addEventListener('click', () => startWorld(hashSeed(ui.seedInput.value), null));
    ui.seedInput.addEventListener('keydown', e => { if (e.key === 'Enter') startWorld(hashSeed(ui.seedInput.value), null); });
    document.getElementById('random-seed-btn').addEventListener('click', () => {
        ui.seedInput.value = String(Math.floor(Math.random() * 2147483647));
        ui.seedInput.focus();
    });
    document.querySelectorAll('[data-distance]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-distance]').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            RENDER_DISTANCE = Number(btn.dataset.distance);
            LOD_DISTANCE = Number(btn.dataset.lod) || 0;
            applyViewDistance();
        });
        if (btn.classList.contains('selected')) {
            RENDER_DISTANCE = Number(btn.dataset.distance);
            LOD_DISTANCE = Number(btn.dataset.lod) || 0;
        }
    });
    const shadowToggle = document.getElementById('shadow-toggle');
    shadowToggle.addEventListener('change', () => {
        shadowsEnabled = shadowToggle.checked;
        renderer.shadowMap.enabled = shadowsEnabled;
        renderer.shadowMap.needsUpdate = true;
        materials.forEach(m => { m.needsUpdate = true; });
    });
    shadowsEnabled = shadowToggle.checked;
    ui.ready.addEventListener('click', tryLock);
    document.getElementById('resume-btn').addEventListener('click', tryLock);
    document.getElementById('menu-btn').addEventListener('click', () => {
        disconnectMultiplayer(true);
        clearWorld();
        setState('menu');
    });
    wireMultiplayerUI();
    injectChatUI();
}
function init() {
    cacheUI();
    scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0xcfe8fb, currentFogDensity);
    camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 6000);
    camera.rotation.order = 'YXZ';
    camera.position.set(0, SEA_LEVEL + 24, 0);
    camera.rotation.x = 0.12;
    scene.add(camera);

    hemiLight = new THREE.HemisphereLight(0xffffff, 0x4a4a4a, 0.6);
    scene.add(hemiLight);
    sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 900;
    const d = 110;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.05;
    sunLight.shadow.intensity = 0.125;
    scene.add(sunLight);
    scene.add(sunLight.target);

    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0x000000, 1);
    document.body.appendChild(renderer.domElement);

    buildMaterials();
    buildSky();
    buildClouds();
    buildFirstPersonArms();
    buildPlayerAvatar();

    mineHighlight = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1.005, 1.005, 1.005)),
        new THREE.LineBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.6 })
    );
    mineHighlight.visible = false;
    mineHighlight.renderOrder = 2;
    scene.add(mineHighlight);

    buildOverlayRoot();

    controls = new PointerLockControls(camera, document.body);
    controls.addEventListener('lock', () => setState('playing'));
    controls.addEventListener('unlock', () => {
        if (gameState === 'playing' && !CHAT.open && !uiOverlayOpen()) setState('paused');
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('blur', () => {
        moveForward = moveBackward = moveLeft = moveRight = false;
        jumpHeld = sinkHeld = sprintHeld = false;
        mouseLeftDown = false;
        resetMining();
    });

    wireMenu();

    inventory.slots[0] = { type: BLOCKS.OAK_WOOD, count: 16 };
    inventory.slots[1] = { type: BLOCKS.STONE, count: 16 };
    inventory.slots[2] = { type: BLOCKS.SAND, count: 16 };
    inventory.slots[3] = { type: BLOCKS.OAK_PLANKS, count: 16 };
    inventory.slots[4] = { type: BLOCKS.TORCH, count: 8 };
    inventory.slots[5] = { type: BLOCKS.CRAFTING_TABLE, count: 1 };
    inventory.slots[6] = { type: BLOCKS.OVEN, count: 1 };
    inventory.slots[7] = { type: BLOCKS.COOKED_MEAT, count: 3 };

    renderHotbarUI();
    updateHealthUI();
    updateHungerUI();
    applyViewDistance();
    setState('menu');
    setTimeout(checkAutoJoin, 100);
}
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
function updateHUD(timeText) {
    const p = camera.position;
    const tris = renderer.info.render.triangles;
    let netLine = '';
    if (NET.peer) {
        if (NET.isHost) netLine = '<br>Host ' + NET.roomId + ' (' + NET.connections.size + ')';
        else netLine = '<br>Client ' + NET.roomId;
    }
    ui.hud.innerHTML =
        'FPS ' + fps +
        '<br>XYZ ' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ' ' + p.z.toFixed(1) +
        '<br>HP ' + player.health.toFixed(1).replace(/\.0$/, '') + '/' + player.maxHealth +
        '<br>Food ' + hunger.value.toFixed(0) + '/' + hunger.max +
        '<br>Animals ' + animals.length +
        '<br>Chunks ' + chunkData.size + (pendingChunks.size ? ' (+' + pendingChunks.size + ')' : '') +
        (lodMeshes.size ? '<br>LOD ' + lodMeshes.size : '') +
        (drops.length ? '<br>Drops ' + drops.length : '') +
        '<br>Tris ' + (tris > 1000 ? (tris / 1000).toFixed(1) + 'k' : tris) +
        '<br>Time ' + timeText +
        netLine;
}
let chatRedrawAccum = 0;
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = Math.min((time - prevTime) / 1000, 0.1);
    prevTime = time;
    const overlay = uiOverlayOpen();

    if (gameState === 'playing' && !overlay) {
        if (!CHAT.open) applyPhysics(delta);
        updateChunks();
        drainReadyQueue(4);
        updateAvatarVisuals(delta);
        updateRemotePlayers(delta);
        tickMining(delta);
        updateDrops(delta);
        tickAllOvens(delta);
        updateAnimalGroups(delta);
        updateAllAnimals(delta);
        updateBreeding(delta);
        if (!CHAT.open) updateHunger(delta);
        if (NET.peer && time - NET.lastSendTime >= NET.sendInterval) {
            NET.lastSendTime = time;
            sendMyPosition();
        }
        if (NET.isHost && NET.peer && time - NET.lastTimeSync >= 1000) {
            NET.lastTimeSync = time;
            broadcastNet({ t: 'time', v: totalGameTime });
        }
    } else if (gameState === 'playing' && overlay) {
        tickAllOvens(delta);
        updateAllAnimals(delta);
        updateBreeding(delta);
        if (uiOverlay.mode === 'oven' && uiOverlay.oven) {
            const ov = uiOverlay.oven;
            const fill = document.getElementById('oven-progress-fill');
            const flame = document.getElementById('oven-flame');
            if (fill) fill.style.width = Math.min(100, (ov.progress / SMELT_TIME) * 100) + '%';
            if (flame) flame.classList.toggle('lit', ov.fuelUses > 0);
        }
    } else if (gameState === 'menu') {
        camera.rotation.y -= delta * 0.015;
        updateAvatarVisuals(delta);
    } else if (gameState === 'loading') {
        dispatchChunkRequests();
        drainReadyQueue(16);
        if (initialDone > initialTotal * 0.5 && time - loadStartTime > 25000) {
            coreKeys = null;
            finishLoading();
        }
    } else drainReadyQueue(2);

    if (damageFlash > 0) {
        damageFlash = Math.max(0, damageFlash - delta * 1.6);
        if (ui.damageOverlay) ui.damageOverlay.style.opacity = damageFlash.toFixed(3);
    } else if (ui.damageOverlay && ui.damageOverlay.style.opacity !== '0') {
        ui.damageOverlay.style.opacity = '0';
    }

    const timeText = updateDayNightCycle(delta);
    skyGroup.position.copy(camera.position);

    if (waterMaterial && waterMaterial.map) {
        waterMaterial.map.offset.x = (waterMaterial.map.offset.x + delta * 0.03) % 1;
        waterMaterial.map.offset.y = (waterMaterial.map.offset.y - delta * 0.02 + 1) % 1;
    }
    chatRedrawAccum += delta;
    if (chatRedrawAccum > 0.5) {
        chatRedrawAccum = 0;
        if (!CHAT.open && CHAT.log.length > 0) renderChatLog();
    }
    frames++;
    if (time - lastFpsTime >= 500) {
        fps = Math.round(frames * 1000 / (time - lastFpsTime));
        frames = 0;
        lastFpsTime = time;
        if (gameState === 'playing') updateHUD(timeText);
    }

    let savedCamPos = null;
    if (thirdPerson && playerSpawned) {
        savedCamPos = camera.position.clone();
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        camera.position.addScaledVector(forward, -3.5);
        camera.position.y += 1.1;
    }
    renderer.render(scene, camera);
    if (savedCamPos) camera.position.copy(savedCamPos);
}
init();
animate();