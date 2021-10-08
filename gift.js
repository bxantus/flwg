const el = document.createElement.bind(document);
function decode(b64) {
    const binString = atob(b64);
    const size = binString.length;
    const bytes = new Uint8Array(size);
    for(let i = 0; i < size; i++){
        bytes[i] = binString.charCodeAt(i);
    }
    return bytes;
}
class Decoder {
    buf;
    dv;
    offset = 0;
    constructor(data){
        const changes = {
            "-": "+",
            "_": "/",
            ".": "="
        };
        data = data.replace(/\-|\_|\./g, (match)=>changes[match]
        );
        this.buf = decode(data);
        this.dv = new DataView(this.buf.buffer, this.buf.byteOffset);
    }
    readVLI() {
        let b = 0;
        var shift = 0;
        var num = 0;
        do {
            b = this.dv.getUint8(this.offset++);
            num = num | (b & 127) << shift;
            shift += 7;
        }while ((b & 128) != 0)
        if (!(b & 64) || shift >= 32) return num;
        return (-1 << shift) + num;
    }
    readString() {
        const len = this.readVLI();
        const s = new TextDecoder().decode(this.buf.subarray(this.offset, this.offset + len));
        this.offset += len;
        return s;
    }
    readByte() {
        return this.dv.getUint8(this.offset++);
    }
}
class Flowers {
    get length() {
        return 12;
    }
    getPath(idx) {
        return `img/flower${idx + 1}.svg`;
    }
    *items() {
        const len = this.length;
        for(let i = 0; i < len; ++i)yield {
            path: this.getPath(i),
            id: i
        };
    }
}
const flowers = new Flowers;
const actionTypes = [
    {
        name: "delay",
        numParams: 1
    },
    {
        name: "resize",
        numParams: 2
    },
    {
        name: "lifetime",
        numParams: 1
    }
];
var FlowerSettings;
(function(FlowerSettings1) {
    FlowerSettings1[FlowerSettings1["HasRotate"] = 32] = "HasRotate";
    FlowerSettings1[FlowerSettings1["HasActions"] = 64] = "HasActions";
    FlowerSettings1[FlowerSettings1["HasAnims"] = 128] = "HasAnims";
})(FlowerSettings || (FlowerSettings = {
}));
function decodeGift(encoded) {
    const decoder = new Decoder(encoded);
    const version = decoder.readVLI();
    const message = decoder.readString();
    const signature = decoder.readString();
    const year = decoder.readVLI();
    const month = decoder.readVLI();
    const day = decoder.readVLI();
    const startDate = new Date(year, month, day);
    const numPrograms = decoder.readVLI();
    const programs = [];
    for(let i = 0; i < numPrograms; ++i)programs.push(decodeProgram(decoder));
    const numFlowers = decoder.readVLI();
    const flowers1 = [];
    for(let i1 = 0; i1 < numFlowers; ++i1){
        const header = decoder.readByte();
        const id = header & 31;
        const x = decoder.readVLI();
        const y = decoder.readVLI();
        const size = decoder.readVLI();
        const rotate = header & FlowerSettings.HasRotate ? decoder.readVLI() : 0;
        const program = header & FlowerSettings.HasActions ? programs[decoder.readVLI()] : [];
        flowers1.push({
            id,
            x,
            y,
            size,
            rotate,
            program
        });
    }
    return {
        message,
        signature,
        startDate,
        flowers: flowers1
    };
}
function decodeProgram(decoder) {
    const prog = [];
    const len = decoder.readVLI();
    for(let num = 0; num < len; ++num){
        const desc = decoder.readByte();
        const typeIdx = desc >> 5;
        const actType = actionTypes[typeIdx];
        const action = {
            name: actType.name,
            params: []
        };
        const firstParam = desc & 31;
        let idx = 0;
        if (firstParam < 31) {
            action.params.push(firstParam);
            idx = 1;
        }
        for(; idx < actType.numParams; ++idx)action.params.push(decoder.readVLI());
        prog.push(action);
    }
    return prog;
}
globalThis.decodeGift = decodeGift;
const canvas = createCanvas();
const message = el("div");
const signature = el("div");
const flowers1 = [];
const giftData = {
    startDate: new Date(),
    ellapsed: undefined
};
window.onload = ()=>{
    message.classList.add("message", "text");
    signature.classList.add("signature", "text");
    document.body.append(message, canvas, signature);
    const params = new URLSearchParams(window.location.search);
    const data1 = params.get("data");
    if (data1) {
        try {
            const gift = decodeGift(data1);
            const ellapsed = params.get("days");
            if (ellapsed) giftData.ellapsed = Number.parseFloat(ellapsed);
            else {
                if (gift.startDate.getTime() > Date.now()) {
                    showGiftWrap(gift.startDate);
                    updateFlowers();
                    return;
                }
                giftData.startDate = gift.startDate;
                startUpdateTimer();
            }
            message.innerText = gift.message;
            addFlowers(gift.flowers);
            signature.innerText = gift.signature;
        } catch (err) {
            console.log(":( can't work with data");
        }
    }
};
window.onresize = ()=>{
    updateFlowers();
};
function createCanvas() {
    const canvas1 = el("div");
    canvas1.classList.add("canvas");
    return canvas1;
}
function showGiftWrap(startDate) {
    const wrap = el("div");
    wrap.classList.add("gift-wrap");
    const img = el("img");
    img.draggable = false;
    img.src = "img/gift1.svg";
    wrap.append(img);
    message.innerText = "You received a gift!";
    message.append(wrap);
    signature.innerText = `Gift opens at: ${startDate.toDateString()}`;
}
function addFlowers(flowerCfgs) {
    for (const cfg of flowerCfgs){
        const flower = new Flower(cfg);
        canvas.append(flower.element);
        flowers1.push(flower);
    }
    updateFlowers();
}
function startUpdateTimer() {
    setInterval(updateFlowers, 10000);
}
function updateFlowers() {
    const canvasRect = canvas.getBoundingClientRect();
    const ratio = canvasRect.width / 500;
    const ellapsed = giftData.ellapsed ?? (Date.now() - giftData.startDate.getTime()) / (1000 * 3600 * 24);
    let height = 0;
    for (const flower of flowers1){
        const props = flower.update(ratio, ellapsed);
        if (props.bottom > height) height = props.bottom;
    }
    canvas.style.height = `${height * 1.1}px`;
    message.style.fontSize = `${40 * ratio}px`;
    signature.style.fontSize = `${18 * ratio}px`;
}
class Flower {
    config;
    element;
    constructor(config){
        this.config = config;
        this.element = el("div");
        this.element.classList.add("flower");
        const img = el("img");
        img.draggable = false;
        img.src = flowers.getPath(config.id);
        this.element.appendChild(img);
    }
    update(ratio, daysEllapsed = 0) {
        const x = this.config.x * ratio;
        const y = this.config.y * ratio;
        const state = this.runProgram(daysEllapsed, {
            size: this.config.size
        });
        const size = state.size * ratio;
        const style = this.element.style;
        if (state.visible) {
            style.display = "";
            style.left = `${x - size / 2}px`;
            style.top = `${y - size / 2}px`;
            style.width = `${size}px`;
            style.transform = `rotate(${this.config.rotate}deg)`;
        } else {
            style.display = "none";
            style.left = `0px`;
            style.top = `0px`;
        }
        return {
            size,
            top: y - size / 2,
            bottom: y + size / 2
        };
    }
    runProgram(ellapsed, props) {
        if (ellapsed < 0) ellapsed = 0;
        const prog = this.config.program;
        let size = props.size;
        let visible = true;
        const actions = {
            delay: (duration)=>{
                if (ellapsed < duration) {
                    if (i == 0) visible = false;
                }
                ellapsed -= duration;
            },
            resize: (duration, targetSize)=>{
                if (ellapsed < duration) {
                    size += (targetSize - size) * ellapsed / duration;
                } else size = targetSize;
                ellapsed -= duration;
            },
            lifetime: (duration)=>{
                if (ellapsed >= duration) {
                    visible = false;
                }
                ellapsed -= duration;
            }
        };
        let i = 0;
        for(; i < prog.length && ellapsed >= 0; ++i){
            const action = prog[i];
            actions[action.name](...action.params);
        }
        return {
            visible,
            size
        };
    }
}

//# sourceMappingURL=gift.js.map
