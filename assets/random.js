export class Random {
    state;
    constructor(seed) {
        this.state = seed >>> 0 || 0x9e3779b9;
    }
    next() {
        let x = this.state;
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        this.state = x >>> 0;
        return this.state / 0x1_0000_0000;
    }
    int(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    pick(values) {
        return values[this.int(0, values.length - 1)];
    }
    chance(probability) {
        return this.next() < probability;
    }
}
export function makeSeed() {
    const bytes = new Uint32Array(1);
    if (globalThis.crypto?.getRandomValues)
        globalThis.crypto.getRandomValues(bytes);
    else
        bytes[0] = (Date.now() ^ Math.floor(Math.random() * 0xffff_ffff)) >>> 0;
    return bytes[0] || 1;
}
export function floorSeed(runSeed, floor, salt = 0) {
    let value = (runSeed ^ Math.imul(floor + 17, 0x45d9f3b) ^ salt) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
    return (value ^ (value >>> 16)) >>> 0 || floor;
}
