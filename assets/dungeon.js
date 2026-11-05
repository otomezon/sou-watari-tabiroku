import { Random } from "./random.js";
const WIDTH = 38;
const HEIGHT = 38;
const MIN_ROOMS = 4;
const MAX_ROOMS = 6;
const CARDINAL_DIRECTIONS = ['up', 'right', 'down', 'left'];
const DIRECTIONS_8 = ['up', 'right', 'down', 'left', 'up-right', 'down-right', 'down-left', 'up-left'];
export const DIRECTION_DELTA = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
    'up-left': { x: -1, y: -1 }, 'up-right': { x: 1, y: -1 }, 'down-left': { x: -1, y: 1 }, 'down-right': { x: 1, y: 1 },
};
export function generateDungeon(seed) {
    const random = new Random(seed);
    const tiles = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));
    const rooms = [];
    const desired = random.int(MIN_ROOMS, MAX_ROOMS);
    for (let attempt = 0; attempt < 350 && rooms.length < desired; attempt += 1) {
        const width = random.int(5, 9);
        const height = random.int(5, 8);
        const x = random.int(2, WIDTH - width - 3);
        const y = random.int(2, HEIGHT - height - 3);
        const candidate = { x, y, width, height };
        const overlaps = rooms.some((room) => x < room.x + room.width + 2 && x + width + 2 > room.x &&
            y < room.y + room.height + 2 && y + height + 2 > room.y);
        if (!overlaps)
            rooms.push(candidate);
    }
    // A deterministic fallback keeps the minimum-room guarantee even on an unusual RNG sequence.
    if (rooms.length < MIN_ROOMS) {
        rooms.length = 0;
        rooms.push({ x: 3, y: 3, width: 7, height: 6 }, { x: 26, y: 3, width: 7, height: 6 }, { x: 3, y: 27, width: 7, height: 7 }, { x: 26, y: 27, width: 7, height: 7 });
    }
    for (const room of rooms) {
        for (let y = room.y; y < room.y + room.height; y += 1) {
            for (let x = room.x; x < room.x + room.width; x += 1)
                tiles[y][x] = 1;
        }
    }
    // Sequential orthogonal corridors connect every room to the previous room.
    for (let index = 1; index < rooms.length; index += 1) {
        const from = roomCenter(rooms[index - 1]);
        const to = roomCenter(rooms[index]);
        const horizontalFirst = random.chance(0.5);
        if (horizontalFirst) {
            carveHorizontal(tiles, from.x, to.x, from.y);
            carveVertical(tiles, from.y, to.y, to.x);
        }
        else {
            carveVertical(tiles, from.y, to.y, from.x);
            carveHorizontal(tiles, from.x, to.x, to.y);
        }
    }
    const start = roomCenter(rooms[0]);
    const stairs = roomCenter(rooms[rooms.length - 1]);
    // Defensive verification; the constructive corridors should make this redundant.
    if (!isReachable(tiles, start, stairs)) {
        for (let index = 1; index < rooms.length; index += 1) {
            const a = roomCenter(rooms[index - 1]);
            const b = roomCenter(rooms[index]);
            carveHorizontal(tiles, a.x, b.x, a.y);
            carveVertical(tiles, a.y, b.y, b.x);
        }
    }
    return { width: WIDTH, height: HEIGHT, tiles, start, stairs, rooms };
}
function roomCenter(room) {
    return { x: Math.floor(room.x + room.width / 2), y: Math.floor(room.y + room.height / 2) };
}
function carveHorizontal(tiles, x1, x2, y) {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1)
        tiles[y][x] = 1;
}
function carveVertical(tiles, y1, y2, x) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1)
        tiles[y][x] = 1;
}
export function isWalkable(tiles, point) {
    return Boolean(tiles[point.y]?.[point.x] === 1);
}

export function canStepBetween(tiles, from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || (dx === 0 && dy === 0)) return false;
    if (!isWalkable(tiles, to)) return false;
    if (dx !== 0 && dy !== 0) {
        return isWalkable(tiles, { x: from.x + dx, y: from.y }) && isWalkable(tiles, { x: from.x, y: from.y + dy });
    }
    return true;
}

export function isReachable(tiles, from, to) {
    if (!isWalkable(tiles, from) || !isWalkable(tiles, to))
        return false;
    const key = (point) => `${point.x},${point.y}`;
    const queue = [from];
    const seen = new Set([key(from)]);
    for (let head = 0; head < queue.length; head += 1) {
        const current = queue[head];
        if (current.x === to.x && current.y === to.y)
            return true;
        for (const direction of CARDINAL_DIRECTIONS) {
            const delta = DIRECTION_DELTA[direction];
            const next = { x: current.x + delta.x, y: current.y + delta.y };
            const nextKey = key(next);
            if (!seen.has(nextKey) && isWalkable(tiles, next)) {
                seen.add(nextKey);
                queue.push(next);
            }
        }
    }
    return false;
}
export function nextPathStep(tiles, from, target, blocked) {
    const key = (point) => `${point.x},${point.y}`;
    const queue = [from];
    const firstStep = new Map();
    const seen = new Set([key(from)]);
    for (let head = 0; head < queue.length; head += 1) {
        const current = queue[head];
        if (current.x === target.x && current.y === target.y)
            return firstStep.get(key(current)) ?? null;
        for (const direction of DIRECTIONS_8) {
            const delta = DIRECTION_DELTA[direction];
            const next = { x: current.x + delta.x, y: current.y + delta.y };
            const nextKey = key(next);
            if (seen.has(nextKey) || !canStepBetween(tiles, current, next))
                continue;
            if (blocked.has(nextKey) && !(next.x === target.x && next.y === target.y))
                continue;
            if (delta.x !== 0 && delta.y !== 0) {
                const sideX = key({ x: current.x + delta.x, y: current.y });
                const sideY = key({ x: current.x, y: current.y + delta.y });
                if (blocked.has(sideX) && blocked.has(sideY)) continue;
            }
            seen.add(nextKey);
            firstStep.set(nextKey, firstStep.get(key(current)) ?? next);
            queue.push(next);
        }
    }
    return null;
}
export function pointKey(point) {
    return `${point.x},${point.y}`;
}
