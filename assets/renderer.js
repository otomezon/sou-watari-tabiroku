import { getModeConfig } from "./modes.js";
const TILE = 32;
const COLS = 17;
const ROWS = 10;
const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE;
export class RenderManager {
    context;
    canvas;
    pixelRatio = 1;
    constructor(canvas) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context)
            throw new Error('Canvasを初期化できませんでした。');
        this.context = context;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    render(state) {
        this.currentTiles = state.dungeon.tiles;
        this.currentPalette = getModeConfig(state.modeId).palette;
        const ctx = this.context;
        ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#101a1e';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        const originX = Math.floor(state.player.x - Math.floor(COLS / 2));
        const originY = Math.floor(state.player.y - Math.floor(ROWS / 2));
        const toScreen = (point) => ({ x: (point.x - originX) * TILE, y: (point.y - originY) * TILE });
        for (let row = 0; row < ROWS; row += 1) {
            for (let col = 0; col < COLS; col += 1) {
                const mapX = originX + col;
                const mapY = originY + row;
                const tile = state.dungeon.tiles[mapY]?.[mapX] ?? 0;
                const x = col * TILE;
                const y = row * TILE;
                if (tile === 1)
                    this.drawFloor(x, y, mapX, mapY, Boolean(state.shop && this.inShopBounds(mapX, mapY, state.shop.bounds)));
                else
                    this.drawWall(x, y, mapX, mapY);
            }
        }
        if (state.dungeon.stairs) {
            const stairs = toScreen(state.dungeon.stairs);
            if (this.onScreen(stairs))
                this.drawStairs(stairs.x, stairs.y, state.turn);
        }
        if (state.shop && !state.shop.hostile) {
            for (const good of state.shop.goods) {
                if (good.sold || good.stolen)
                    continue;
                const point = toScreen(good);
                if (this.onScreen(point))
                    this.drawShopGood(point.x, point.y, good.item.kind, good.price);
            }
            const keeper = toScreen(state.shop.keeper);
            if (this.onScreen(keeper))
                this.drawShopkeeper(keeper.x, keeper.y);
        }
        for (const gold of state.groundGold) {
            const point = toScreen(gold);
            if (this.onScreen(point))
                this.drawGold(point.x, point.y, gold.amount);
        }
        for (const ground of state.groundItems) {
            const point = toScreen(ground);
            if (!this.onScreen(point))
                continue;
            this.drawItem(point.x, point.y, ground.item.kind);
        }
        for (const monster of state.monsters) {
            const point = toScreen(monster);
            if (!this.onScreen(point))
                continue;
            this.drawMonster(point.x, point.y, monster);
        }
        const player = toScreen(state.player);
        this.drawPlayer(player.x, player.y);
        this.drawVignette();
    }
    resize() {
        this.pixelRatio = Math.min(2.5, window.devicePixelRatio || 1);
        this.canvas.width = Math.round(WIDTH * this.pixelRatio);
        this.canvas.height = Math.round(HEIGHT * this.pixelRatio);
        this.context.imageSmoothingEnabled = false;
    }
    onScreen(point) {
        return point.x >= 0 && point.y >= 0 && point.x < WIDTH && point.y < HEIGHT;
    }
    currentPalette = getModeConfig('beginner').palette;
    drawFloor(x, y, mapX, mapY, isShop = false) {
        const ctx = this.context;
        const variation = (mapX * 13 + mapY * 7) % 3;
        ctx.fillStyle = this.currentPalette.floor[variation] ?? this.currentPalette.floor[0];
        ctx.fillRect(x, y, TILE, TILE);
        if (isShop) {
            ctx.fillStyle = 'rgba(196,157,87,.18)';
            ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        }
        ctx.fillStyle = 'rgba(7,15,17,.16)';
        ctx.fillRect(x, y + TILE - 2, TILE, 2);
        ctx.fillRect(x + TILE - 2, y, 2, TILE);
        if ((mapX * 11 + mapY * 3) % 7 === 0) {
            ctx.fillStyle = 'rgba(126,151,126,.15)';
            ctx.fillRect(x + 7, y + 8, 3, 2);
            ctx.fillRect(x + 21, y + 21, 2, 2);
        }
    }
    inShopBounds(x, y, bounds) {
        return x >= bounds.x && y >= bounds.y && x < bounds.x + bounds.width && y < bounds.y + bounds.height;
    }
    drawShopGood(x, y, kind, price) {
        const ctx = this.context;
        ctx.fillStyle = 'rgba(224,190,111,.18)';
        ctx.fillRect(x + 4, y + 4, 24, 24);
        ctx.fillStyle = '#d3b56e';
        ctx.fillRect(x + 10, y + 8, 12, 13);
        ctx.fillStyle = '#fff0bf';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const glyph = kind === 'weapon' ? '⚔' : kind === 'shield' ? '⬟' : kind === 'armor' ? '◈' : kind === 'potion' ? '⚗' : kind === 'valuable' ? '◆' : '♨';
        ctx.fillText(glyph, x + 16, y + 15);
        ctx.fillStyle = '#201f1a';
        ctx.fillRect(x + 4, y + 23, 24, 8);
        ctx.fillStyle = '#ffe6a5';
        ctx.font = 'bold 7px sans-serif';
        ctx.fillText(`${price}G`, x + 16, y + 27);
    }
    drawGold(x, y, amount) {
        const ctx = this.context;
        ctx.fillStyle = 'rgba(236,195,86,.2)';
        ctx.beginPath();
        ctx.arc(x + 16, y + 17, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d4a640';
        ctx.beginPath();
        ctx.arc(x + 16, y + 16, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffe6a5';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#fff2c0';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('G', x + 16, y + 16);
        if (amount >= 100) {
            ctx.fillStyle = '#fff3c4';
            ctx.font = 'bold 7px sans-serif';
            ctx.fillText('·', x + 25, y + 7);
        }
    }
    drawShopkeeper(x, y) {
        const ctx = this.context;
        // Original stone-winged merchant: a horned basalt sentinel with a brass apron.
        ctx.fillStyle = 'rgba(4,8,10,.42)';
        ctx.fillRect(x + 4, y + 27, 24, 4);
        ctx.fillStyle = '#4c5960';
        ctx.fillRect(x + 1, y + 9, 9, 16);
        ctx.fillRect(x + 22, y + 9, 9, 16);
        ctx.fillStyle = '#748188';
        ctx.fillRect(x + 5, y + 10, 22, 17);
        ctx.fillStyle = '#9ba5a0';
        ctx.fillRect(x + 8, y + 4, 16, 13);
        ctx.fillStyle = '#d1b36f';
        ctx.fillRect(x + 8, y + 1, 4, 7);
        ctx.fillRect(x + 20, y + 1, 4, 7);
        ctx.fillStyle = '#e7c66e';
        ctx.fillRect(x + 11, y + 9, 3, 2);
        ctx.fillRect(x + 18, y + 9, 3, 2);
        ctx.fillStyle = '#273139';
        ctx.fillRect(x + 11, y + 15, 10, 4);
        ctx.fillStyle = '#bd9654';
        ctx.fillRect(x + 10, y + 20, 12, 7);
        ctx.fillStyle = '#f3d98f';
        ctx.fillRect(x + 14, y + 21, 4, 4);
    }
    drawWall(x, y, mapX, mapY) {
        const ctx = this.context;
        const adjacentFloor = this.hasAdjacentFloor(mapX, mapY);
        ctx.fillStyle = this.currentPalette.wall[0];
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = adjacentFloor ? this.currentPalette.wall[1] : this.currentPalette.wall[0];
        ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
        ctx.fillStyle = this.currentPalette.wall[2];
        ctx.fillRect(x + 2, y + 2, TILE - 4, 3);
        ctx.fillStyle = this.currentPalette.wall[3];
        ctx.fillRect(x + 2, y + 7, TILE - 4, TILE - 10);
        ctx.fillStyle = 'rgba(6,13,15,.48)';
        ctx.fillRect(x + 2, y + TILE - 4, TILE - 4, 2);
        if ((mapX + mapY) % 3 === 0) {
            ctx.fillStyle = 'rgba(110,133,126,.18)';
            ctx.fillRect(x + 8, y + 12, 3, 2);
            ctx.fillRect(x + 22, y + 18, 2, 3);
        }
    }
    hasAdjacentFloor(x, y) {
        const tiles = this.currentTiles;
        if (!tiles)
            return false;
        return tiles[y - 1]?.[x] === 1 || tiles[y + 1]?.[x] === 1 || tiles[y]?.[x - 1] === 1 || tiles[y]?.[x + 1] === 1;
    }
    currentTiles = null;
    drawStairs(x, y, turn) {
        const ctx = this.context;
        ctx.fillStyle = 'rgba(215,181,109,.14)';
        ctx.fillRect(x + 4, y + 4, 24, 24);
        ctx.fillStyle = '#8f7849';
        ctx.fillRect(x + 7, y + 7, 18, 19);
        ctx.fillStyle = '#d6b66e';
        for (let step = 0; step < 4; step += 1)
            ctx.fillRect(x + 8 + step, y + 8 + step * 4, 16 - step * 2, 2);
        ctx.fillStyle = '#f6df9b';
        ctx.fillRect(x + 14, y + (turn % 2 ? 11 : 12), 4, 3);
    }
    drawItem(x, y, kind) {
        const ctx = this.context;
        if (kind === 'valuable') {
            ctx.fillStyle = 'rgba(108,173,231,.22)';
            ctx.fillRect(x + 5, y + 5, 22, 22);
            ctx.fillStyle = '#8bd8f4';
            ctx.beginPath();
            ctx.moveTo(x + 16, y + 6);
            ctx.lineTo(x + 25, y + 15);
            ctx.lineTo(x + 16, y + 26);
            ctx.lineTo(x + 7, y + 15);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#e9fbff';
            ctx.fillRect(x + 13, y + 10, 5, 3);
            return;
        }
        ctx.fillStyle = 'rgba(117,190,168,.2)';
        ctx.fillRect(x + 5, y + 5, 22, 22);
        ctx.fillStyle = '#78b9a4';
        ctx.fillRect(x + 12, y + 8, 8, 15);
        ctx.fillStyle = '#c1e5bc';
        ctx.fillRect(x + 13, y + 5, 6, 5);
        ctx.fillStyle = '#d9c58b';
        ctx.fillRect(x + 14, y + 13, 4, 5);
    }
    drawPlayer(x, y) {
        const ctx = this.context;
        ctx.fillStyle = 'rgba(7,12,13,.42)';
        ctx.fillRect(x + 7, y + 25, 19, 4);
        ctx.fillStyle = '#5c7180';
        ctx.fillRect(x + 8, y + 15, 17, 12);
        ctx.fillStyle = '#b9d0c6';
        ctx.fillRect(x + 10, y + 13, 13, 9);
        ctx.fillStyle = '#e5d39b';
        ctx.fillRect(x + 10, y + 5, 13, 11);
        ctx.fillStyle = '#34464b';
        ctx.fillRect(x + 9, y + 4, 15, 6);
        ctx.fillRect(x + 12, y + 2, 9, 3);
        ctx.fillStyle = '#26393d';
        ctx.fillRect(x + 12, y + 12, 2, 2);
        ctx.fillRect(x + 19, y + 12, 2, 2);
        ctx.fillStyle = '#e7c879';
        ctx.fillRect(x + 14, y + 19, 5, 4);
        ctx.fillStyle = '#c5d3c8';
        ctx.fillRect(x + 4, y + 14, 4, 13);
        ctx.fillRect(x + 25, y + 13, 3, 12);
        ctx.fillStyle = '#9c744c';
        ctx.fillRect(x + 10, y + 26, 5, 4);
        ctx.fillRect(x + 19, y + 26, 5, 4);
    }
    drawMonster(x, y, monster) {
        const ctx = this.context;
        ctx.fillStyle = 'rgba(5,10,11,.4)';
        ctx.fillRect(x + 6, y + 26, 21, 4);
        if (monster.shopkeeper) {
            this.drawShopkeeper(x, y);
        }
        else if (monster.boss) {
            ctx.fillStyle = '#633f4a';
            ctx.fillRect(x + 5, y + 8, 22, 19);
            ctx.fillStyle = '#a85e5a';
            ctx.fillRect(x + 8, y + 3, 16, 12);
            ctx.fillStyle = '#d5b477';
            ctx.fillRect(x + 6, y + 1, 4, 9);
            ctx.fillRect(x + 22, y + 1, 4, 9);
            ctx.fillStyle = '#f4c57d';
            ctx.fillRect(x + 10, y + 8, 4, 3);
            ctx.fillRect(x + 19, y + 8, 4, 3);
            ctx.fillStyle = '#281e25';
            ctx.fillRect(x + 8, y + 21, 16, 5);
        }
        else {
            const colors = {
                slime: '#5f9d83', bat: '#687c9b', kobold: '#a87858', goblin: '#76935e',
                skeleton: '#c1b79a', wolf: '#8d8f83', orc: '#8e7954', wraith: '#7a7eae', 'dark-knight': '#6a7c82',
                mushroom: '#9b7663', 'cave-moth': '#a99b72', 'cave-crab': '#887b67', 'moss-pup': '#6f8e72',
                'glow-worm': '#a5b86b', 'stone-imp': '#7d8177', 'root-sprite': '#7e9b6c', 'bone-hound': '#b5ae9b',
                'bog-frog': '#638f6a', 'goblin-guard': '#6f8957', 'cave-ape': '#98775e', 'copper-scorpion': '#b17b50',
                lamia: '#9b6a91', 'shadow-hound': '#565b78', 'guardian-statue': '#838e8b', 'blood-wisp': '#b45c68', 'iron-golem': '#7e9294',
                salamander: '#ba6849', 'crystal-gargoyle': '#6e9aab', 'storm-harpy': '#8295b7', hellhound: '#a44f49', 'ember-ent': '#9b684d',
                'frost-drake': '#7da8c0', 'demon-general': '#9f515c', beholder: '#9b8f63', 'abyss-knight': '#565b72', 'corpse-eater': '#7f8063',
                'void-dragon': '#645b9a', 'star-phoenix': '#c28b65', 'night-emperor': '#75618f', 'dimensional-fiend': '#905c9c', 'primal-guardian': '#a09a70',
            };
            const body = colors[monster.kind] ?? '#a66c62';
            ctx.fillStyle = body;
            if (monster.kind === 'bat') {
                ctx.fillRect(x + 3, y + 11, 26, 11);
                ctx.fillRect(x + 10, y + 7, 12, 15);
            }
            else if (monster.kind === 'slime') {
                ctx.fillRect(x + 7, y + 12, 19, 13);
                ctx.fillRect(x + 10, y + 8, 13, 5);
            }
            else {
                ctx.fillRect(x + 7, y + 11, 19, 16);
                ctx.fillRect(x + 9, y + 6, 15, 10);
            }
            ctx.fillStyle = '#e8d7b0';
            ctx.fillRect(x + 11, y + 12, 3, 3);
            ctx.fillRect(x + 20, y + 12, 3, 3);
            ctx.fillStyle = '#273033';
            ctx.fillRect(x + 12, y + 13, 1, 2);
            ctx.fillRect(x + 21, y + 13, 1, 2);
        }
        if (monster.hp < monster.maxHp) {
            ctx.fillStyle = '#1a2021';
            ctx.fillRect(x + 4, y + 1, 24, 3);
            ctx.fillStyle = '#bd6c5d';
            ctx.fillRect(x + 4, y + 1, Math.max(1, 24 * monster.hp / monster.maxHp), 3);
        }
        if (monster.rareVariant) {
            const speed = monster.actionSpeed ?? 'normal';
            const badge = speed === 'fast' ? 'Ⅱ' : speed === 'slow' ? '½' : '★';
            ctx.fillStyle = speed === 'fast' ? '#9c574f' : speed === 'slow' ? '#607c91' : '#9b8050';
            ctx.fillRect(x + 20, y + 23, 11, 9);
            ctx.fillStyle = '#fff1cf';
            ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badge, x + 25.5, y + 27.5);
        }
    }
    drawVignette() {
        const ctx = this.context;
        const gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 90, WIDTH / 2, HEIGHT / 2, 245);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(5,11,13,.32)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
}
