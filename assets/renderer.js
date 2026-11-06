import { getModeConfig } from "./modes.js";
import { getEnemyLevel } from "./enemy-level.mjs";
const TILE = 36;
const COLS = 16;
const ROWS = 12;
const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE;
export const MONSTER_SHAPE_BY_KIND = {
 slime:'blob',bat:'wing',kobold:'humanoid',mushroom:'fungus','cave-moth':'wing','cave-crab':'crab','moss-pup':'beast','glow-worm':'serpent','stone-imp':'demon','root-sprite':'plant',
 goblin:'humanoid',skeleton:'skeleton',wolf:'beast','giant-rat':'beast','sting-beetle':'insect','bone-hound':'skeletonBeast','bog-frog':'beast','goblin-guard':'armored','cave-ape':'beast','copper-scorpion':'scorpion',
 orc:'humanoid',wraith:'ghost','dark-knight':'armored','giant-spider':'spider',troll:'giant',lamia:'serpent','shadow-hound':'beast','guardian-statue':'golem','blood-wisp':'ghost','iron-golem':'golem',
 'fire-lizard':'serpent','ash-golem':'golem',basilisk:'serpent',wyvern:'dragon',succubus:'demon',salamander:'serpent','crystal-gargoyle':'wing','storm-harpy':'bird',hellhound:'beast','ember-ent':'plant',
 'black-drake':'dragon','abyss-reaper':'skeleton','cursed-paladin':'armored','magma-giant':'giant','phantom-lord':'ghost','frost-drake':'dragon','demon-general':'demon',beholder:'eye','abyss-knight':'armored','corpse-eater':'beast',
 'void-hydra':'hydra','astral-lich':'skeleton','calamity-beast':'giant','star-eater':'eye','ancient-warden':'golem','void-dragon':'dragon','star-phoenix':'bird','night-emperor':'armored','dimensional-fiend':'demon','primal-guardian':'golem'
};
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
            const visible = monster.boss
                ? point.x < WIDTH && point.y < HEIGHT && point.x + TILE * 2 > 0 && point.y + TILE * 2 > 0
                : this.onScreen(point);
            if (!visible)
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
    drawMonsterSprite(x,y,kind,body) {
        const ctx=this.context, rect=(a,b,w,h,c=body)=>{ctx.fillStyle=c;ctx.fillRect(x+a,y+b,w,h);};
        const eye=(a=12,b=20,y0=13,c='#f0d7ae')=>{rect(a,y0,3,3,c);rect(b,y0,3,3,c);rect(a+1,y0+1,1,2,'#20272a');rect(b+1,y0+1,1,2,'#20272a');};
        const sh='rgba(24,30,32,.5)';
        switch(MONSTER_SHAPE_BY_KIND[kind]||'humanoid'){
            case 'blob':rect(7,15,19,9);rect(10,10,13,7);rect(14,7,6,4);eye(11,20,15);break;
            case 'wing':rect(2,11,9,10,sh);rect(21,11,9,10,sh);rect(4,9,7,7);rect(21,9,7,7);rect(11,10,10,13);rect(13,6,6,8);eye(12,19,11);break;
            case 'beast':rect(5,13,19,9);rect(19,8,9,10);rect(21,6,3,4);rect(26,7,3,4);rect(7,20,4,6,sh);rect(13,20,4,6);rect(21,20,4,6);rect(25,13,5,3);eye(22,26,11);break;
            case 'humanoid':rect(10,14,13,9);rect(12,7,9,8);rect(10,21,4,5,sh);rect(19,21,4,5,sh);rect(6,14,5,8);rect(22,14,5,8);rect(12,5,3,3,'#f0d7ae');rect(19,5,3,3,'#f0d7ae');eye(13,19,11);break;
            case 'fungus':rect(12,15,8,11,'#d6c4a4');rect(8,13,16,5);rect(5,9,22,7);rect(9,6,14,5);rect(8,10,4,3,'#f0d7ae');rect(19,9,4,3,'#f0d7ae');break;
            case 'insect':rect(10,11,13,12,sh);rect(11,12,11,10);rect(12,7,9,6);rect(7,14,4,3,'#f0d7ae');rect(22,14,4,3,'#f0d7ae');rect(7,21,4,3);rect(22,21,4,3);rect(10,7,1,5,'#f0d7ae');rect(21,7,1,5,'#f0d7ae');eye(13,19,10);break;
            case 'crab':rect(7,12,18,10,sh);rect(8,10,16,10);rect(2,12,7,7);rect(23,12,7,7);rect(1,8,5,6);rect(26,8,5,6);rect(8,21,3,4);rect(21,21,3,4);eye(12,20,11);break;
            case 'scorpion':rect(9,14,14,8);rect(12,10,9,6);rect(3,17,8,3);rect(1,14,5,5);rect(23,12,4,5);rect(25,8,3,5);rect(24,4,5,5,'#f0d7ae');rect(8,21,3,4);rect(21,21,3,4);eye(13,19,12);break;
            case 'spider':rect(11,12,11,10);rect(9,9,8,8);for(const [a,b,w,h] of [[3,8,8,2],[1,12,9,2],[3,18,7,2],[20,8,8,2],[22,12,9,2],[22,18,7,2]])rect(a,b,w,h,sh);rect(6,8,5,5);rect(23,8,5,5);eye(11,19,13);break;
            case 'serpent':rect(4,19,8,4);rect(9,15,8,4);rect(14,11,8,4);rect(19,7,9,8);rect(23,5,4,4);eye(22,26,9);break;
            case 'ghost':rect(9,9,14,13);rect(7,14,4,7);rect(21,14,4,7);rect(10,6,12,6);rect(9,21,4,4);rect(15,22,4,3);rect(21,21,4,4);eye(12,19,13,'#26313b');break;
            case 'plant':rect(14,13,5,12,'#8e704b');rect(12,8,9,8);rect(5,9,9,6);rect(18,7,9,7);rect(9,4,8,6);rect(7,14,5,4,'#a9c578');rect(21,13,5,4,'#a9c578');eye(13,19,11);break;
            case 'armored':rect(9,13,15,11,sh);rect(11,13,11,9);rect(12,6,10,9);rect(10,4,14,5,'#d5c69c');rect(5,14,6,8);rect(23,14,5,8);rect(7,12,3,10,'#9baeb0');rect(25,10,2,15,'#d9c58c');eye(13,19,10);break;
            case 'golem':rect(6,10,20,15,sh);rect(8,8,16,15);rect(10,4,12,7);rect(4,13,5,9);rect(23,13,5,9);rect(10,23,5,4,'#303c40');rect(19,23,5,4,'#303c40');rect(12,15,3,3,'#f6d48a');rect(19,15,3,3,'#f6d48a');break;
            case 'dragon':rect(3,17,8,4,sh);rect(8,14,14,8);rect(20,9,9,8);rect(23,6,4,5);rect(8,9,9,6,sh);rect(5,7,8,8);rect(9,5,3,6,'#f0d7ae');rect(15,4,3,6,'#f0d7ae');rect(12,21,4,5,sh);rect(20,21,4,5,sh);eye(23,27,10);break;
            case 'bird':rect(3,12,10,8,sh);rect(19,12,10,8,sh);rect(7,9,8,9);rect(17,9,8,9);rect(12,10,9,13);rect(13,5,7,7);rect(16,3,3,5,'#f0d7ae');rect(20,10,7,3,'#e7bb6d');rect(12,21,3,5,sh);rect(19,21,3,5,sh);eye(14,19,9);break;
            case 'eye':rect(7,7,18,17,sh);rect(9,8,14,14);rect(12,11,8,7,'#f0d7ae');rect(15,10,3,10,'#7c4251');rect(15,12,3,5,'#20272a');rect(6,11,3,3,'#f0d7ae');rect(24,11,3,3,'#f0d7ae');rect(13,4,2,4,sh);rect(18,3,2,5,sh);break;
            case 'giant':rect(5,9,22,16,sh);rect(8,7,16,16);rect(10,3,12,8);rect(3,12,7,11);rect(22,12,7,11);rect(9,22,5,5,sh);rect(19,22,5,5,sh);eye(11,19,14);break;
            case 'hydra':rect(8,15,17,9,sh);rect(12,12,11,9);rect(7,7,5,11);rect(14,4,5,14);rect(21,7,5,11);rect(5,5,8,5);rect(12,2,9,5);rect(20,5,8,5);rect(7,8,2,2,'#f0d7ae');rect(15,5,2,2,'#f0d7ae');rect(22,8,2,2,'#f0d7ae');break;
            case 'demon':rect(3,11,9,11,sh);rect(20,11,9,11,sh);rect(10,13,13,10);rect(12,6,9,9);rect(10,3,4,7,'#f0d7ae');rect(20,3,4,7,'#f0d7ae');rect(11,22,4,5,sh);rect(19,22,4,5,sh);eye(13,19,11);break;
            case 'skeleton':rect(11,6,11,10,'#d1c9ae');rect(12,8,2,2,'#273033');rect(19,8,2,2,'#273033');rect(13,16,7,2,'#f0d7ae');rect(11,18,2,5,'#f0d7ae');rect(20,18,2,5,'#f0d7ae');rect(7,15,5,2,'#f0d7ae');rect(21,15,5,2,'#f0d7ae');rect(10,23,4,3,sh);rect(19,23,4,3,sh);break;
            case 'skeletonBeast':rect(5,14,19,8,'#b5ae9b');rect(20,9,8,9);rect(7,20,3,6,sh);rect(14,20,3,6,sh);rect(22,20,3,6,sh);rect(3,12,5,3,'#f0d7ae');rect(11,15,11,2,'#eee4c8');eye(22,26,12);break;
            default:rect(8,13,16,11);rect(11,7,10,9);eye();
        }
        if(kind==='star-phoenix'){rect(14,2,4,4,'#fff1b0');rect(5,8,4,3,'#e4a85d');rect(24,8,4,3,'#e4a85d');}
        else if(kind==='void-hydra'){rect(7,4,3,3,'#a8a0dc');rect(22,4,3,3,'#a8a0dc');}
        else if(kind==='cursed-paladin'||kind==='abyss-knight')rect(15,3,2,5,'#d4c58f');
    }
    drawMonster(x, y, monster) {
        const ctx = this.context;
        ctx.fillStyle = 'rgba(5,10,11,.4)';
        ctx.fillRect(x + 6, y + 26, 21, 4);
        if (monster.shopkeeper) {
            this.drawShopkeeper(x, y);
        }
        else if (monster.boss) {
            this.drawBoss(x, y, monster);
            return;
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
            this.drawMonsterSprite(x, y, monster.kind, body);
        }
        if (monster.hp < monster.maxHp) {
            ctx.fillStyle = '#1a2021';
            ctx.fillRect(x + 4, y + 1, 24, 3);
            ctx.fillStyle = '#bd6c5d';
            ctx.fillRect(x + 4, y + 1, Math.max(1, 24 * monster.hp / monster.maxHp), 3);
        }
        const levelText = monster.hunterVariant ? `Lv${monster.hunterLevel ?? 1}` : `Lv${getEnemyLevel(monster)}`;
        let levelFontSize = 6;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${levelFontSize}px sans-serif`;
        while (ctx.measureText(levelText).width > 14 && levelFontSize > 4) {
            levelFontSize -= 0.5;
            ctx.font = `bold ${levelFontSize}px sans-serif`;
        }
        const levelBadgeWidth = Math.min(18, Math.max(13, Math.ceil(ctx.measureText(levelText).width + 4)));
        ctx.fillStyle = monster.boss ? 'rgba(76,36,44,.96)' : 'rgba(12,22,24,.92)';
        ctx.fillRect(x + 1, y + 23, levelBadgeWidth, 9);
        ctx.strokeStyle = monster.boss ? '#b77d70' : 'rgba(215,181,109,.72)';
        ctx.lineWidth = 0.7;
        ctx.strokeRect(x + 1, y + 23, levelBadgeWidth, 9);
        ctx.fillStyle = '#fff1cf';
        ctx.fillText(levelText, x + 1 + levelBadgeWidth / 2, y + 27.5);
        if (monster.rareVariant) {
            const speed = monster.actionSpeed ?? 'normal';
            const badge = monster.hunterVariant ? '狩' : speed === 'fast' ? 'Ⅱ' : speed === 'slow' ? '½' : '★';
            ctx.fillStyle = monster.hunterVariant ? '#76528f' : speed === 'fast' ? '#9c574f' : speed === 'slow' ? '#607c91' : '#9b8050';
            ctx.fillRect(x + 20, y + 23, 11, 9);
            ctx.fillStyle = '#fff1cf';
            ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badge, x + 25.5, y + 27.5);
        }
    }
    drawBoss(x, y, monster) {
        const ctx = this.context;
        ctx.fillStyle = 'rgba(5,10,11,.58)';
        ctx.fillRect(x + 8, y + 61, 56, 7);
        // Broad armored body and shoulders span all four floor tiles.
        ctx.fillStyle = '#563642';
        ctx.fillRect(x + 12, y + 25, 48, 34);
        ctx.fillRect(x + 6, y + 26, 15, 25);
        ctx.fillRect(x + 51, y + 26, 15, 25);
        ctx.fillStyle = '#8f4d56';
        ctx.fillRect(x + 18, y + 21, 36, 33);
        ctx.fillRect(x + 22, y + 12, 28, 20);
        ctx.fillStyle = '#c49a65';
        ctx.fillRect(x + 15, y + 7, 8, 12);
        ctx.fillRect(x + 49, y + 7, 8, 12);
        ctx.fillRect(x + 21, y + 15, 5, 9);
        ctx.fillRect(x + 46, y + 15, 5, 9);
        ctx.fillStyle = '#f6d18a';
        ctx.fillRect(x + 27, y + 23, 5, 4);
        ctx.fillRect(x + 42, y + 23, 5, 4);
        ctx.fillStyle = '#281e27';
        ctx.fillRect(x + 29, y + 34, 14, 5);
        ctx.fillStyle = '#d4bd87';
        ctx.fillRect(x + 23, y + 43, 26, 5);
        ctx.fillStyle = '#3a2a32';
        ctx.fillRect(x + 19, y + 54, 13, 8);
        ctx.fillRect(x + 41, y + 54, 13, 8);
        // A full-width health bar makes the large target easy to read.
        ctx.fillStyle = '#1a2021';
        ctx.fillRect(x + 8, y + 2, 56, 5);
        ctx.fillStyle = '#d16d63';
        ctx.fillRect(x + 8, y + 2, Math.max(1, 56 * monster.hp / monster.maxHp), 5);
        ctx.strokeStyle = '#e3bd8d';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 8, y + 2, 56, 5);
        ctx.fillStyle = 'rgba(42,25,31,.96)';
        ctx.fillRect(x + 12, y + 63, 48, 8);
        ctx.strokeStyle = '#b77d70';
        ctx.lineWidth = 0.7;
        ctx.strokeRect(x + 12, y + 63, 48, 8);
        ctx.fillStyle = '#fff1cf';
        ctx.font = 'bold 6px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Lv${getEnemyLevel(monster)} BOSS`, x + 36, y + 67);
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
