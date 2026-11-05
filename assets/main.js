import { SoundManager } from "./audio.js";
import { DIRECTION_DELTA } from "./dungeon.js";
import { canDescend, createFreshRun, experienceToNext, GameEngine, getAttack, getDefense, MAX_HUNGER } from "./engine.js";
import { itemDescription, itemDisplayName, itemDurability, itemIcon, itemKindLabel, itemMaxDurability } from "./items.js";
import { getShopSellPrice, remainingShopGoods, unpaidShopGoods } from "./shop.js";
import { RenderManager } from "./renderer.js";
import { DEFAULT_AUDIO_SETTINGS, SaveManager } from "./storage.js";
import { DUNGEON_MODES, MODE_ORDER, getModeConfig } from "./modes.js";
const APP_VERSION = '4.9.5';
const byId = (id) => {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`UI element not found: ${id}`);
    return element;
};
const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className)
        element.className = className;
    if (text !== undefined)
        element.textContent = text;
    return element;
};
class GameApp {
    save = new SaveManager();
    sound = new SoundManager();
    renderer = new RenderManager(byId('dungeon-canvas'));
    state = null;
    engine = null;
    settings = { ...DEFAULT_AUDIO_SETTINGS };
    busy = false;
    async init() {
        this.bindEvents();
        try {
            this.settings = await this.save.loadSettings();
        }
        catch (error) {
            console.warn('Audio settings could not be loaded.', error);
        }
        this.sound.setSettings(this.settings);
        try {
            const hasSave = await this.save.hasSave();
            byId('continue-game').disabled = !hasSave;
            byId('save-hint').textContent = hasSave
                ? '前回の冒険の記録があります'
                : '冒険の記録はこの端末に保存されます';
        }
        catch (error) {
            byId('continue-game').disabled = true;
            byId('save-hint').textContent = 'このブラウザではセーブ機能を利用できません';
            console.error(error);
        }
        this.registerServiceWorker();
    }
    bindEvents() {
        byId('new-game').addEventListener('click', () => this.openModeSelect());
        byId('continue-game').addEventListener('click', () => void this.continueRun());
        byId('open-title-settings').addEventListener('click', () => this.openSettings());
        byId('game-settings-button').addEventListener('click', () => this.openSettings());
        byId('inventory-button').addEventListener('click', () => this.openInventory());
        byId('equipment-button').addEventListener('click', () => this.openEquipment());
        byId('descend-button').addEventListener('click', () => void this.descend());
        byId('shop-button').addEventListener('click', () => this.openShop());
        byId('wait-button').addEventListener('click', () => this.performAction(() => this.engine?.wait(), 'move'));
        document.querySelectorAll('[data-direction]').forEach((button) => {
            button.addEventListener('click', () => {
                const direction = button.dataset.direction;
                if (direction)
                    this.handleDirection(direction);
            });
        });
        byId('modal-close').addEventListener('click', () => this.closeModal());
        byId('modal-root').querySelector('.modal-backdrop')?.addEventListener('click', () => this.closeModal());
        byId('result-primary').addEventListener('click', () => void this.startNewRun(this.state?.modeId ?? 'beginner'));
        byId('result-home').addEventListener('click', () => this.showTitle());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden)
                this.sound.stopBgm();
            else if (this.state?.status === 'playing')
                void this.resumeAudio();
        });
    }
    registerServiceWorker() {
        if (!('serviceWorker' in navigator))
            return;
        window.addEventListener('load', () => {
            void navigator.serviceWorker.register('./sw.js').then(async (registration) => {
                await navigator.serviceWorker.ready;
                const worker = navigator.serviceWorker.controller ?? registration.active ?? registration.waiting;
                const urls = performance.getEntriesByType('resource')
                    .map((entry) => entry.name)
                    .filter((url) => url.startsWith(location.origin))
                    .map((url) => new URL(url).pathname + new URL(url).search);
                worker?.postMessage({ type: 'PRECACHE_URLS', urls: [...new Set(urls)] });
            }).catch((error) => console.warn('Service worker registration failed.', error));
        }, { once: true });
    }
    openModeSelect() {
        const list = node('div', 'mode-list');
        list.append(node('p', 'modal-note', '挑戦するダンジョンを選んでください。深さ・魔物・装備品・専用BGMがそれぞれ異なります。'));
        for (const modeId of MODE_ORDER) {
            const mode = DUNGEON_MODES[modeId];
            const card = node('button', 'mode-card');
            const top = node('span', 'mode-card-top');
            top.append(node('strong', '', mode.name), node('small', '', mode.subtitle));
            card.append(top, node('span', 'mode-card-description', mode.description));
            card.addEventListener('click', () => void this.startNewRun(modeId));
            list.append(card);
        }
        this.openModal('ダンジョンを選択', list);
    }
    async startNewRun(modeId = 'beginner') {
        if (this.busy)
            return;
        this.busy = true;
        try {
            await this.sound.unlock();
            this.state = createFreshRun(modeId);
            this.engine = new GameEngine(this.state);
            this.sound.startBgm(modeId, false);
            this.showGame();
            this.refresh();
            await this.persist();
        }
        catch (error) {
            this.showMessage(`冒険を開始できませんでした: ${this.errorMessage(error)}`);
        }
        finally {
            this.busy = false;
        }
    }
    async continueRun() {
        if (this.busy)
            return;
        this.busy = true;
        try {
            await this.sound.unlock();
            const loaded = await this.save.load();
            if (!loaded) {
                byId('continue-game').disabled = true;
                this.showMessage('冒険の記録が見つかりません。');
                return;
            }
            this.state = loaded;
            this.engine = new GameEngine(loaded);
            if (loaded.status === 'gameover' || loaded.status === 'clear')
                this.showResult();
            else {
                this.sound.startBgm(loaded.modeId, loaded.floor === getModeConfig(loaded.modeId).floors);
                this.showGame();
                this.refresh();
            }
        }
        catch (error) {
            byId('continue-game').disabled = true;
            byId('save-hint').textContent = this.errorMessage(error);
        }
        finally {
            this.busy = false;
        }
    }
    handleDirection(direction) {
        const player = this.state?.player;
        const step = DIRECTION_DELTA[direction];
        const attacks = Boolean(player && this.state?.monsters.some((monster) => monster.x === player.x + step.x && monster.y === player.y + step.y));
        void this.performAction(() => this.engine?.move(direction), attacks ? 'attack' : 'move');
    }
    async performAction(action, defaultEffect = 'move') {
        if (this.busy || !this.engine || !this.state || this.state.status !== 'playing')
            return;
        this.busy = true;
        const oldTurn = this.state.turn;
        const oldLevel = this.state.player.level;
        const oldStatus = this.state.status;
        try {
            await this.sound.unlock();
            action();
            this.refresh();
            const postActionStatus = this.state.status;
            if (this.state.turn !== oldTurn || postActionStatus !== oldStatus) {
                const hitCount = this.engine.getCombatHitCount();
                const damageCues = Array.from({ length: hitCount }, () => 'damage');
                const leveledUp = this.state.player.level > oldLevel;
                const actionCues = defaultEffect === 'attack' ? ['attack'] : [];
                const resultCues = postActionStatus === 'gameover'
                    ? ['gameover']
                    : postActionStatus === 'clear' ? ['clear'] : [];
                const cues = [
                    ...actionCues,
                    ...(leveledUp ? ['level'] : []),
                    ...damageCues,
                    ...resultCues,
                ];
                if (cues.length)
                    this.sound.effectSequence(cues);
                else
                    this.sound.effect(defaultEffect);
                if (postActionStatus !== 'playing') {
                    this.sound.stopBgm();
                    this.showResult();
                }
                await this.persist();
            }
        }
        catch (error) {
            this.showMessage(`処理に失敗しました: ${this.errorMessage(error)}`);
        }
        finally {
            this.busy = false;
        }
    }
    async descend() {
        if (this.busy || !this.engine || !this.state || !canDescend(this.state))
            return;
        this.busy = true;
        try {
            await this.sound.unlock();
            const advanced = this.engine.descend();
            if (advanced) {
                const bossFloor = this.state.floor === getModeConfig(this.state.modeId).floors;
                this.sound.startBgm(this.state.modeId, bossFloor);
                if (bossFloor)
                    this.sound.effect('boss');
                this.refresh();
                await this.persist();
            }
        }
        catch (error) {
            this.showMessage(`階層を移動できませんでした: ${this.errorMessage(error)}`);
        }
        finally {
            this.busy = false;
        }
    }
    refresh() {
        if (!this.state)
            return;
        const state = this.state;
        const mode = getModeConfig(state.modeId);
        byId('dungeon-name').textContent = `${mode.name}${state.floor === mode.floors ? ' · 最深部' : ''}`;
        byId('floor-label').textContent = `地下 ${state.floor} 階`;
        byId('turn-value').textContent = String(state.turn);
        byId('gold-value').textContent = `${state.gold.toLocaleString('ja-JP')}G`;
        byId('hp-value').textContent = `${state.player.hp} / ${state.player.maxHp}`;
        byId('hp-fill').style.width = `${Math.max(0, state.player.hp / state.player.maxHp) * 100}%`;
        byId('hunger-value').textContent = `${state.player.hunger} / ${MAX_HUNGER}`;
        byId('hunger-fill').style.width = `${Math.max(0, Math.min(100, state.player.hunger / MAX_HUNGER * 100))}%`;
        byId('hunger-fill').classList.toggle('is-starving', state.player.hunger === 0);
        byId('level-value').textContent = String(state.player.level);
        byId('exp-value').textContent = `${state.player.exp} / ${experienceToNext(state.player.level)}`;
        byId('attack-value').textContent = String(getAttack(state));
        byId('defense-value').textContent = String(getDefense(state));
        byId('game-message').textContent = state.message;
        const shopButton = byId('shop-button');
        shopButton.disabled = !this.engine?.canTalkToShopkeeper();
        shopButton.textContent = state.shop?.hostile ? '閉店' : '店主';
        const canGoDown = canDescend(state);
        const descendButton = byId('descend-button');
        descendButton.disabled = !canGoDown;
        descendButton.textContent = canGoDown ? '降りる ↓' : '階段';
        descendButton.setAttribute('aria-label', canGoDown ? '次の階へ降りる' : '階段の上にいるとき使用できます');
        this.renderer.render(state);
    }
    showTitle() {
        this.closeModal();
        this.sound.stopBgm();
        byId('app').classList.remove('is-playing');
        byId('title-screen').classList.remove('hidden');
        byId('game-screen').classList.add('hidden');
        byId('result-screen').classList.add('hidden');
        void this.save.hasSave().then((hasSave) => {
            byId('continue-game').disabled = !hasSave;
        }).catch(() => { byId('continue-game').disabled = true; });
    }
    showGame() {
        this.closeModal();
        byId('app').classList.add('is-playing');
        byId('title-screen').classList.add('hidden');
        byId('result-screen').classList.add('hidden');
        byId('game-screen').classList.remove('hidden');
    }
    showResult() {
        if (!this.state)
            return;
        this.closeModal();
        const cleared = this.state.status === 'clear';
        const mode = getModeConfig(this.state.modeId);
        byId('app').classList.remove('is-playing');
        byId('title-screen').classList.add('hidden');
        byId('game-screen').classList.add('hidden');
        byId('result-screen').classList.remove('hidden');
        byId('result-symbol').textContent = cleared ? '✧' : '✦';
        byId('result-eyebrow').textContent = cleared ? 'DUNGEON CONQUERED' : 'AN ADVENTURE ENDS';
        byId('result-title').textContent = cleared ? 'ダンジョン踏破！' : '力尽きてしまった…';
        byId('result-description').textContent = cleared
            ? `${mode.name}の最深部を踏破した。ボスを打ち倒し、迷宮の試練を越えた。\nあなたの冒険は記録に刻まれた。`
            : `${mode.name}の地下${this.state.floor}階で力尽きた。持ち物と装備をすべて失った。\n装備と食料を整え、もう一度挑戦しよう。`;
        byId('result-primary').textContent = cleared ? 'このダンジョンに再挑戦  ›' : '同じダンジョンに再挑戦  ›';
        byId('result-stats').replaceChildren(this.resultStat('ダンジョン', mode.name), this.resultStat('到達階', `${this.state.floor} / ${mode.floors}F`), this.resultStat('レベル', String(this.state.player.level)), this.resultStat('討伐数', String(this.state.defeatedMonsters)), this.resultStat('累計ターン', String(this.state.turn)));
    }
    resultStat(label, value) {
        const wrapper = node('div');
        wrapper.append(node('span', '', label), node('strong', '', value));
        return wrapper;
    }
    async persist() {
        if (!this.state)
            return;
        await this.save.save(this.state);
        byId('continue-game').disabled = false;
        byId('save-hint').textContent = '冒険の記録を保存しました';
    }
    showMessage(message) {
        byId('game-message').textContent = message;
    }
    openModal(title, content) {
        byId('modal-title').textContent = title;
        byId('modal-content').replaceChildren(content);
        byId('modal-root').classList.remove('hidden');
    }
    closeModal() {
        byId('modal-root').classList.add('hidden');
    }
    openInventory() {
        if (!this.state)
            return;
        const list = node('div', 'inventory-list');
        if (!this.state.inventory.length)
            list.append(node('div', 'empty-state', '持ち物はありません。\nダンジョンでアイテムを探そう。'));
        for (const stack of this.state.inventory)
            list.append(this.inventoryEntry(stack));
        list.append(node('p', 'modal-note', '満腹度は最大120。新しい冒険は120から始まり、有効なプレイヤー行動4回ごとに1減少します。食料でまとまった量を回復できます。薬草・回復薬でも少し回復します。満腹度がある間は9ターンごとにHPが自然回復し、0の間は6ターンごとにHPが減少します（変化はメッセージ表示されません）。食事・薬の使用と装備変更も1ターン消費します。'));
        this.openModal('持ち物', list);
    }
    inventoryEntry(stack) {
        const row = node('div', 'inventory-entry');
        row.append(node('div', 'item-icon', itemIcon(stack.item.kind)));
        const info = node('div', 'item-info');
        info.append(node('strong', '', itemDisplayName(stack.item)));
        const isGear = stack.item.kind === 'weapon' || stack.item.kind === 'shield' || stack.item.kind === 'armor';
        const isStackable = stack.item.kind === 'potion' || stack.item.kind === 'food' || stack.item.kind === 'valuable';
        const condition = !isGear ? '' : ` · 耐久 ${itemDurability(stack.item)}/${itemMaxDurability(stack.item)}`;
        info.append(node('small', '', `${itemKindLabel(stack.item.kind)} · ${itemDescription(stack.item)}${condition}`));
        row.append(info);
        if (isStackable)
            row.append(node('span', 'item-count', `×${stack.count}`));
        const consumable = stack.item.kind === 'potion' || stack.item.kind === 'food';
        if (isGear || consumable) {
            const button = node('button', 'small-button', stack.item.kind === 'food' ? '食べる' : stack.item.kind === 'potion' ? '使う' : '装備');
            button.addEventListener('click', () => {
                if (!this.engine)
                    return;
                const beforeTurn = this.state?.turn ?? 0;
                void this.performAction(() => {
                    if (consumable)
                        this.engine?.useItem(stack.item.uid);
                    else
                        this.engine?.equip(stack.item.uid);
                }, 'item').then(() => {
                    if (this.state && this.state.turn !== beforeTurn)
                        this.closeModal();
                    else
                        this.openInventory();
                });
            });
            row.append(button);
        }
        return row;
    }
    openEquipment() {
        if (!this.state)
            return;
        const content = node('div', 'equipment-grid');
        const slots = [
            { key: 'weapon', title: '武器' }, { key: 'shield', title: '盾' }, { key: 'armor', title: '防具' },
        ];
        for (const slot of slots) {
            const box = node('div', 'equipment-slot');
            box.append(node('span', '', slot.title));
            const item = this.state.equipment[slot.key];
            const row = node('div', 'inventory-entry');
            row.append(node('div', 'item-icon', item ? itemIcon(item.kind) : '—'));
            const info = node('div', 'item-info');
            info.append(node('strong', '', item ? itemDisplayName(item) : '装備なし'));
            const condition = item ? ` · 耐久 ${itemDurability(item)}/${itemMaxDurability(item)}` : '';
            info.append(node('small', '', item ? `${item.description}${condition}` : '能力補正なし'));
            row.append(info);
            if (item) {
                const button = node('button', 'small-button', '外す');
                button.addEventListener('click', () => {
                    void this.performAction(() => this.engine?.unequip(slot.key), 'item').then(() => {
                        if (this.state?.status === 'playing')
                            this.openEquipment();
                        else
                            this.closeModal();
                    });
                });
                row.append(button);
            }
            box.append(row);
            content.append(box);
        }
        const available = this.state.inventory.filter((entry) => entry.item.kind === 'weapon' || entry.item.kind === 'shield' || entry.item.kind === 'armor');
        if (available.length) {
            content.append(node('p', 'modal-note', '持ち物から装備するアイテムを選んでください。'));
            for (const entry of available) {
                const row = node('div', 'inventory-entry');
                row.append(node('div', 'item-icon', itemIcon(entry.item.kind)));
                const info = node('div', 'item-info');
                info.append(node('strong', '', itemDisplayName(entry.item)));
                info.append(node('small', '', `${itemKindLabel(entry.item.kind)} · ${itemDescription(entry.item)} · 耐久 ${itemDurability(entry.item)}/${itemMaxDurability(entry.item)}`));
                row.append(info);
                const button = node('button', 'small-button', '装備');
                button.addEventListener('click', () => {
                    void this.performAction(() => this.engine?.equip(entry.item.uid), 'item').then(() => {
                        if (this.state?.status === 'playing')
                            this.openEquipment();
                        else
                            this.closeModal();
                    });
                });
                row.append(button);
                content.append(row);
            }
        }
        this.openModal('装備', content);
    }
    openShop() {
        if (!this.state || !this.engine)
            return;
        const shop = this.state.shop;
        if (!shop || !this.engine.canTalkToShopkeeper())
            return;
        const content = node('div', 'shop-view');
        const purse = node('div', 'shop-purse');
        purse.append(node('span', '', '所持金'), node('strong', '', `${this.state.gold.toLocaleString('ja-JP')} G`));
        content.append(purse);
        content.append(node('p', 'modal-note', `石翼の番商「品物は代価と引き換えに。売却も歓迎するぞ」\n購入・売却はターンを消費しません。未払いの商品を店の外へ持ち出すと店主が追跡します。換金品は高値で買い取ります。`));
        if (shop.stolenDebt > 0) {
            const debtRow = node('div', 'shop-debt');
            debtRow.append(node('strong', '', `未払い ${shop.stolenDebt.toLocaleString('ja-JP')} G`));
            const pendingNote = node('span', 'shop-pending-note', '購入せず店外へ出ると店主が追跡');
            debtRow.append(pendingNote);
            content.append(debtRow);
        }
        const pendingGoods = unpaidShopGoods(shop.goods);
        if (pendingGoods.length) {
            const purchaseRow = node('div', 'shop-selected');
            const purchaseInfo = node('div', 'shop-selected-info');
            purchaseInfo.append(node('strong', '', `拾った商品 ${pendingGoods.length}点（すべて購入対象）`), node('small', '', `合計 ${shop.stolenDebt.toLocaleString('ja-JP')} G`));
            const purchase = node('button', 'small-button shop-buy shop-purchase', 'まとめて購入');
            purchase.disabled = this.state.gold < shop.stolenDebt;
            purchase.title = purchase.disabled ? `あと${(shop.stolenDebt - this.state.gold).toLocaleString('ja-JP')}G必要` : '拾った商品をすべて購入します';
            purchase.addEventListener('click', () => void this.runShopTransaction(() => this.engine?.buyPickedUpShopGoods() ?? false));
            purchaseRow.append(purchaseInfo, purchase);
            content.append(purchaseRow);
            content.append(node('h3', 'shop-heading', '拾った商品（未払い）'));
            for (const good of pendingGoods) {
                const row = node('div', 'inventory-entry shop-entry');
                row.append(node('div', 'item-icon', itemIcon(good.item.kind)));
                const info = node('div', 'item-info');
                info.append(node('strong', '', itemDisplayName(good.item)));
                info.append(node('small', '', `${itemKindLabel(good.item.kind)} · ${good.price.toLocaleString('ja-JP')}G`));
                row.append(info);
                const giveBack = node('button', 'small-button shop-return', '戻す');
                giveBack.title = 'この商品を所持品から取り除き、店の商品棚へ戻します';
                giveBack.addEventListener('click', () => void this.runShopTransaction(() => this.engine?.returnUnpaidShopGood(good.id) ?? false));
                row.append(giveBack);
                content.append(row);
            }
        }
        content.append(node('h3', 'shop-heading', '商品'));
        const goods = remainingShopGoods(shop.goods);
        if (!goods.length)
            content.append(node('div', 'empty-state', '商品は売り切れました。'));
        for (const good of goods) {
            const row = node('div', 'inventory-entry shop-entry');
            row.append(node('div', 'item-icon', itemIcon(good.item.kind)));
            const info = node('div', 'item-info');
            info.append(node('strong', '', itemDisplayName(good.item)));
            info.append(node('small', '', `${itemKindLabel(good.item.kind)} · ${itemDescription(good.item)}`));
            row.append(info);
            row.append(node('strong', 'shop-price', `${good.price.toLocaleString('ja-JP')}G`));
            const pickup = node('button', 'small-button shop-pickup', '拾う');
            pickup.title = '拾った商品はすべて購入対象になります。不要なら「戻す」で棚へ戻せます';
            pickup.addEventListener('click', () => void this.runShopTransaction(() => this.engine?.pickUpShopGood(good.id) ?? false));
            row.append(pickup);
            content.append(row);
        }
        content.append(node('h3', 'shop-heading', '売却'));
        const inventory = this.state.inventory;
        const unpaidItemIds = new Set(pendingGoods.map((good) => good.item.uid));
        const legacyUnpaidTemplates = new Set(pendingGoods
            .filter((good) => ["potion", "food", "valuable"].includes(good.item.kind) &&
            !inventory.some((stack) => stack.item.uid === good.item.uid))
            .map((good) => good.item.templateId));
        const sellable = inventory.filter((stack) => !unpaidItemIds.has(stack.item.uid) && !legacyUnpaidTemplates.has(stack.item.templateId));
        if (!sellable.length)
            content.append(node('div', 'empty-state', '売却できる持ち物がありません。'));
        for (const stack of sellable) {
            const row = node('div', 'inventory-entry shop-entry');
            row.append(node('div', 'item-icon', itemIcon(stack.item.kind)));
            const info = node('div', 'item-info');
            info.append(node('strong', '', `${itemDisplayName(stack.item)}${stack.count > 1 ? ` ×${stack.count}` : ''}`));
            info.append(node('small', '', itemKindLabel(stack.item.kind)));
            row.append(info);
            row.append(node('strong', 'shop-price', `${getShopSellPrice(stack.item, this.state.floor)}G`));
            const sell = node('button', 'small-button shop-sell', '売却');
            sell.addEventListener('click', () => void this.runShopTransaction(() => this.engine?.sellInventoryItem(stack.item.uid) ?? false));
            row.append(sell);
            content.append(row);
        }
        this.openModal('石翼の番商', content);
    }
    async runShopTransaction(transaction) {
        if (!this.engine || !this.state || this.busy)
            return;
        this.busy = true;
        try {
            transaction();
            this.refresh();
            await this.persist();
            if (this.engine.canTalkToShopkeeper())
                this.openShop();
            else
                this.closeModal();
        }
        finally {
            this.busy = false;
        }
    }
    openSettings() {
        const content = node('div', 'settings-list');
        const bgm = this.rangeSetting('BGM 音量', this.settings.bgmVolume, (value) => { this.settings.bgmVolume = value; this.persistSettings(); });
        const sfx = this.rangeSetting('効果音 音量', this.settings.sfxVolume, (value) => { this.settings.sfxVolume = value; this.persistSettings(); });
        content.append(bgm, sfx);
        content.append(this.toggleSetting('BGMをミュート', this.settings.muteBgm, (checked) => { this.settings.muteBgm = checked; this.persistSettings(); }));
        content.append(this.toggleSetting('効果音をミュート', this.settings.muteSfx, (checked) => { this.settings.muteSfx = checked; this.persistSettings(); }));
        content.append(node('p', 'modal-note', '音声は最初の操作後に再生されます。音量設定はこの端末に保存されます。'));
        const version = node('div', 'version-row');
        version.append(node('span', '', 'アプリバージョン'), node('strong', '', `v${APP_VERSION}`));
        content.append(version);
        this.openModal('設定', content);
    }
    rangeSetting(label, value, update) {
        const wrapper = node('label', 'setting-row');
        const line = node('span', 'setting-label');
        const name = node('span', '', label);
        const output = node('span', '', `${Math.round(value * 100)}%`);
        line.append(name, output);
        const input = node('input');
        input.type = 'range';
        input.min = '0';
        input.max = '1';
        input.step = '0.05';
        input.value = String(value);
        input.addEventListener('input', () => {
            const next = Number(input.value);
            output.textContent = `${Math.round(next * 100)}%`;
            update(next);
        });
        wrapper.append(line, input);
        return wrapper;
    }
    toggleSetting(label, checked, update) {
        const wrapper = node('label', 'toggle-row');
        wrapper.append(node('span', '', label));
        const input = node('input');
        input.type = 'checkbox';
        input.checked = checked;
        input.addEventListener('change', () => update(input.checked));
        wrapper.append(input);
        return wrapper;
    }
    persistSettings() {
        this.sound.setSettings(this.settings);
        void this.save.saveSettings(this.settings).catch((error) => console.warn('Settings save failed.', error));
    }
    async resumeAudio() {
        try {
            await this.sound.unlock();
            if (this.state?.status === 'playing')
                this.sound.startBgm(this.state.modeId, this.state.floor === getModeConfig(this.state.modeId).floors);
        }
        catch (error) {
            console.warn('Audio resume failed.', error);
        }
    }
    errorMessage(error) {
        return error instanceof Error ? error.message : '不明なエラー';
    }
}
const app = new GameApp();
void app.init();
