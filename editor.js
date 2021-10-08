const base64abc = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "+",
    "/"
];
function encode(data) {
    const uint8 = typeof data === "string" ? new TextEncoder().encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
    let result = "", i;
    const l = uint8.length;
    for(i = 2; i < l; i += 3){
        result += base64abc[uint8[i - 2] >> 2];
        result += base64abc[(uint8[i - 2] & 3) << 4 | uint8[i - 1] >> 4];
        result += base64abc[(uint8[i - 1] & 15) << 2 | uint8[i] >> 6];
        result += base64abc[uint8[i] & 63];
    }
    if (i === l + 1) {
        result += base64abc[uint8[i - 2] >> 2];
        result += base64abc[(uint8[i - 2] & 3) << 4];
        result += "==";
    }
    if (i === l) {
        result += base64abc[uint8[i - 2] >> 2];
        result += base64abc[(uint8[i - 2] & 3) << 4 | uint8[i - 1] >> 4];
        result += base64abc[(uint8[i - 1] & 15) << 2];
        result += "=";
    }
    return result;
}
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
function actionEquals(a1, a2) {
    if (a1.name != a2.name || a1.params.length != a2.params.length) return false;
    for(let idx = 0; idx < a1.params.length; ++idx)if (a1.params[idx] != a2.params[idx]) return false;
    return true;
}
function programEquals(p1, p2) {
    if (p1.length != p2.length) return false;
    for(let idx = 0; idx < p1.length; ++idx)if (!actionEquals(p1[idx], p2[idx])) return false;
    return true;
}
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
const el = document.createElement.bind(document);
class PropertyControls {
    properties = el("div");
    flwConfig;
    props = {
    };
    get flowerConfig() {
        return this.flwConfig;
    }
    set flowerConfig(flwConfig) {
        this.flwConfig = flwConfig;
        if (flwConfig) {
            this.props.size.value = flwConfig.size.toString();
            this.props.rotate.value = flwConfig.rotate.toString();
        }
    }
    get element() {
        return this.properties;
    }
    constructor(){
        this.properties.classList.add("props", "grid");
        this.addNumericProperty("size", (val)=>{
            if (this.flowerConfig) this.flowerConfig.size = val;
        });
        this.addNumericProperty("rotate", (val)=>{
            if (this.flowerConfig) this.flowerConfig.rotate = val;
        });
    }
    addNumericProperty(name, onChange) {
        const input = el("input");
        input.id = `prop-${name}`;
        input.value = "10";
        const label = el("label");
        label.htmlFor = input.id;
        label.innerText = name;
        this.properties.append(label, input);
        input.oninput = (evt)=>{
            if (input.value.length > 0) onChange(Number.parseInt(input.value));
        };
        const direction = {
            ArrowUp: 1,
            ArrowDown: -1
        };
        input.onkeydown = (evt)=>{
            const dir = direction[evt.key];
            if (!dir) return;
            let val = Number.parseInt(input.value);
            val += dir * (evt.ctrlKey ? 10 : 1);
            input.value = val.toString();
            input.select();
            onChange(val);
            evt.preventDefault();
            evt.stopPropagation();
        };
        this.props[name] = input;
    }
}
function inList(__char, charList) {
    return __char.length == 1 && charList.indexOf(__char) >= 0;
}
function inRange(__char, start, end) {
    return __char >= start && __char <= end;
}
class Lexer {
    s;
    offs = 0;
    constructor(s1){
        this.s = s1;
    }
    get eof() {
        return this.offs >= this.s.length;
    }
    get current() {
        return this.s[this.offs];
    }
    next() {
        if (!this.eof) ++this.offs;
        return this.current;
    }
    parseId() {
        const start = this.offs;
        let c = this.current;
        if (c && (inRange(c, 'a', 'z') || inRange(c, 'A', 'Z') || inList(c, "_$"))) {
            c = this.next();
            for(; c; c = this.next()){
                if (!inRange(c, 'a', 'z') && !inRange(c, 'A', 'Z') && !inList(c, "_$") && !inRange(c, '0', '9')) break;
            }
        }
        if (this.offs > start) return this.s.substring(start, this.offs);
        else return undefined;
    }
    isIdChar(c = undefined) {
        if (c == undefined) c = this.current;
        return c ? inRange(c, 'a', 'z') || inRange(c, 'A', 'Z') || inList(c, "_$") || inRange(c, '0', '9') : false;
    }
    parseString() {
        const start = this.offs + 1;
        let delimiter = this.current;
        if (!inList(delimiter, `"'`)) return undefined;
        let prev = delimiter;
        for(let c = this.next(); c; c = this.next()){
            if (c == delimiter && prev != "\\") {
                let s1 = this.s.substring(start, this.offs).replace("\\" + delimiter, delimiter);
                this.next();
                return s1;
            }
            prev = c;
        }
        this.offs = start - 1;
        return undefined;
    }
    parseInt() {
        const start = this.offs;
        let c = this.current;
        if (c && inRange(c, '0', '9')) {
            c = this.next();
            for(; c; c = this.next()){
                if (!inRange(c, '0', '9')) break;
            }
        }
        if (this.offs > start) return Number.parseInt(this.s.substring(start, this.offs));
        else return undefined;
    }
    skipWs() {
        this.skipSpaces();
        if (this.skipComment()) this.skipSpaces();
    }
    skipSpaces() {
        for(let c = this.current; c; c = this.next()){
            if (!inList(c, " \t\r\n")) break;
        }
    }
    skipComment() {
        if (!this.match("//")) return false;
        const eol = this.s.indexOf("\n", this.offs);
        this.offs = eol == -1 ? this.s.length : eol + 1;
        return true;
    }
    match(s) {
        if (this.s.startsWith(s, this.offs)) {
            this.offs += s.length;
            return true;
        }
        return false;
    }
    matchAnyChar(s) {
        let c = this.current;
        if (!c || !inList(c, s)) return undefined;
        this.offs += 1;
        return c;
    }
    matchAndSkipWs(s) {
        const matched = this.match(s);
        if (matched) this.skipWs();
        return matched;
    }
}
const validActions = new Map([
    [
        "delay",
        1
    ],
    [
        "resize",
        2
    ],
    [
        "lifetime",
        1
    ]
]);
function compileError(message, lexer) {
    return new Error(`${message} around '${lexer.s.substring(lexer.offs - 10, lexer.offs + 10)}'`);
}
function compile(program) {
    const lexer = new Lexer(program);
    const errors = [];
    const actions = [];
    lexer.skipWs();
    while(!lexer.eof){
        const id = lexer.parseId();
        if (!id) {
            errors.push(compileError("Expected an action", lexer));
            break;
        }
        const valid = validActions.has(id);
        if (!valid) {
            errors.push(compileError(`Unknown action ${id}`, lexer));
        }
        lexer.skipWs();
        if (!lexer.matchAndSkipWs('(')) {
            errors.push(compileError("Expected `(`", lexer));
            break;
        }
        const params = [];
        let paramError = false;
        while(!lexer.eof && !paramError){
            if (lexer.match(')')) break;
            const p = lexer.parseInt();
            if (!p) {
                paramError = true;
                errors.push(compileError("Expected a numeric parameter", lexer));
                break;
            }
            params.push(p);
            lexer.skipWs();
            if (lexer.match(')')) break;
            if (!lexer.matchAndSkipWs(',')) {
                paramError = true;
                errors.push(compileError("Expected `,` or `)`", lexer));
            }
        }
        if (paramError) break;
        if (valid) {
            const requiredParams = validActions.get(id);
            if (requiredParams == params.length) actions.push({
                name: id,
                params
            });
            else errors.push(compileError(`${id} requires ${requiredParams}. Got: ${params.length}`, lexer));
        }
        lexer.skipWs();
    }
    return {
        actions,
        errors
    };
}
class Encoder {
    buf = new Uint8Array(4096);
    dv = new DataView(this.buf.buffer);
    offs = 0;
    writeVLI(num) {
        num = Math.round(num);
        let part = num >>> 0 & 127;
        num = num >> 7;
        while(num != (part & 64 ? -1 : 0)){
            this.writeByte(part | 128);
            part = num >>> 0 & 127;
            num = num >> 7;
        }
        this.writeByte(part);
    }
    writeString(s) {
        const utf8Stream = new TextEncoder().encode(s);
        this.writeVLI(utf8Stream.byteLength);
        this.buf.set(utf8Stream, this.incOffset(utf8Stream.byteLength));
    }
    encode() {
        const changes1 = {
            "+": "-",
            "/": "_",
            "=": "."
        };
        return encode(this.buf.subarray(0, this.offs)).replace(/\+|\/|\=/g, (match)=>changes1[match]
        );
    }
    incOffset(size) {
        const old = this.offs;
        this.offs += size;
        return old;
    }
    writeByte(val) {
        this.dv.setUint8(this.incOffset(1), val);
    }
}
window.onload = ()=>{
    const sideBar = document.body.querySelector("#side");
    editor.displayControls(sideBar);
    projectSettings.displayControls(sideBar);
    editor.canvas = document.body.querySelector("#canvas");
    const proj = loadProject("1");
    if (!proj) return;
    projectSettings.name = proj.name;
    projectSettings.startDate = new Date(proj.startDate);
    projectSettings.message = proj.message;
    projectSettings.signature = proj.signature;
    for (const f of proj.flowers){
        editor.addSaved(f);
    }
};
function flowerIcon(flower) {
    const icon = el("div");
    icon.classList.add("flower", "icon");
    const img = el("img");
    img.src = flower.path;
    icon.appendChild(img);
    icon.ondblclick = ()=>{
        editor.addFlower(flower);
    };
    return icon;
}
function sectionHeader(text) {
    const header = el("div");
    header.classList.add("header");
    header.innerText = text;
    return header;
}
class Editor {
    canvas = el('div');
    items = [];
    propertyControls = new PropertyControls;
    selectedFlower;
    program = el("textarea");
    displayControls(parent) {
        const flowerSelection = el("div");
        parent.appendChild(flowerSelection);
        flowerSelection.classList.add("flowers", "grid");
        for (const flower of flowers.items())flowerSelection.appendChild(flowerIcon(flower));
        parent.append(sectionHeader("Properties"));
        parent.appendChild(this.propertyControls.element);
        parent.appendChild(sectionHeader("Program"));
        parent.appendChild(this.program);
        this.program.classList.add("program");
        this.program.rows = 3;
        this.program.oninput = ()=>{
            const res = this.validateProgram();
            if (this.selectedFlower) {
                this.selectedFlower.programText = this.program.value;
                this.selectedFlower.program = res.actions;
            }
        };
        document.body.onkeydown = (evt)=>{
            if (evt.target != document.body) return;
            if (evt.key == "Delete" && this.selectedFlower) {
                this.selectedFlower.element.remove();
                const idx = this.items.indexOf(this.selectedFlower);
                this.items.splice(idx, 1);
            }
        };
    }
    addFlower(f) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const size = canvasRect.width * 15 / 100;
        const flower = new FlowerItem(f, {
            size,
            x: canvasRect.width / 2,
            y: canvasRect.height / 2
        });
        this.canvas.appendChild(flower.element);
        this.items.push(flower);
        flower.ongrabbed = ()=>{
            this.select(flower);
        };
        this.select(flower);
    }
    addSaved(f) {
        const flower = new FlowerItem({
            id: f.id,
            path: flowers.getPath(f.id)
        }, {
            size: f.size,
            x: f.x,
            y: f.y
        });
        flower.rotate = f.rotate;
        flower.programText = f.programText;
        this.canvas.appendChild(flower.element);
        this.items.push(flower);
        flower.ongrabbed = ()=>{
            this.select(flower);
        };
    }
    select(flowerItem) {
        if (this.selectedFlower == flowerItem) return;
        if (this.selectedFlower) this.selectedFlower.selected = false;
        this.selectedFlower = flowerItem;
        if (flowerItem) flowerItem.selected = true;
        this.propertyControls.flowerConfig = flowerItem;
        this.program.value = flowerItem?.programText ?? "";
        this.validateProgram();
    }
    validateProgram() {
        const res = compile(this.program.value);
        if (res.errors.length) this.program.setCustomValidity(res.errors.join("\n"));
        else this.program.setCustomValidity("");
        return res;
    }
}
class FlowerItem {
    element;
    pos = {
        x: 0,
        y: 0
    };
    props = {
        size: 0,
        rotate: 0
    };
    programText = "";
    program = [];
    id;
    get x() {
        return this.pos.x;
    }
    get y() {
        return this.pos.y;
    }
    get size() {
        return this.props.size;
    }
    get rotate() {
        return this.props.rotate;
    }
    ongrabbed;
    constructor(f, options){
        this.id = f.id;
        this.element = el("div");
        this.element.classList.add("flower", "item");
        const style = this.element.style;
        style.position = "absolute";
        this.x = options.x;
        this.y = options.y;
        this.size = options.size;
        const img = el("img");
        img.draggable = false;
        img.src = f.path;
        this.element.appendChild(img);
        this.installHandlers();
    }
    get selected() {
        return this.element.classList.contains("selected");
    }
    set selected(sel) {
        if (sel) this.element.classList.add("selected");
        else this.element.classList.remove("selected");
    }
    set x(x) {
        this.pos.x = x;
        this.element.style.left = `${x - this.size / 2}px`;
    }
    set y(y) {
        this.pos.y = y;
        this.element.style.top = `${y - this.size / 2}px`;
    }
    set size(size) {
        const oldSize = this.props.size;
        const diff = size - oldSize;
        if (diff == 0) return;
        this.props.size = size;
        this.element.style.width = `${size}px`;
        this.element.style.left = `${this.x - size / 2}px`;
        this.element.style.top = `${this.y - size / 2}px`;
    }
    set rotate(rotate) {
        this.props.rotate = rotate;
        this.element.style.transform = `rotate(${rotate}deg)`;
    }
    installHandlers() {
        let startPos = {
            x: 0,
            y: 0
        };
        let start = {
            x: 0,
            y: 0
        };
        const slide = (e)=>{
            this.x = start.x + e.clientX - startPos.x;
            this.y = start.y + e.clientY - startPos.y;
        };
        this.element.onpointerdown = (e)=>{
            this.ongrabbed?.();
            this.element.onpointermove = slide;
            this.element.setPointerCapture(e.pointerId);
            startPos.x = e.clientX;
            startPos.y = e.clientY;
            start = {
                x: this.x,
                y: this.y
            };
        };
        this.element.onpointerup = (e)=>{
            this.element.releasePointerCapture(e.pointerId);
            this.element.onpointermove = null;
        };
    }
}
const editor = new Editor();
class ProjectSettings {
    startDateVal = new Date();
    nameVal = "";
    nameInput;
    dateInput;
    container = el("div");
    messageInput = el("textarea");
    signatureInput = el("textarea");
    constructor(){
        const container = this.container;
        container.classList.add("settings", "props", "grid");
        const dateInput = this.addSetting("Start date");
        dateInput.type = "date";
        dateInput.valueAsDate = this.startDateVal;
        dateInput.oninput = ()=>{
            const newDate = dateInput.valueAsDate;
            if (newDate) this.startDateVal = newDate;
        };
        this.dateInput = dateInput;
        const nameInput = this.addSetting("Name");
        nameInput.value = this.nameVal;
        nameInput.oninput = ()=>{
            this.nameVal = nameInput.value;
        };
        this.nameInput = nameInput;
        this.addNamedInput(this.messageInput, "Message");
        this.addNamedInput(this.signatureInput, "Signature");
        const saveBtn = el("button");
        saveBtn.id = "save";
        saveBtn.innerText = "Save";
        saveBtn.onclick = ()=>{
            saveProject("1");
            console.log("Encoded: ", encodeProject());
        };
        container.append(saveBtn);
    }
    displayControls(parent) {
        parent.appendChild(sectionHeader("Settings"));
        parent.append(this.container);
    }
    addSetting(name) {
        const input = el("input");
        input.id = `setting-${name}`;
        const label = el("label");
        label.htmlFor = input.id;
        label.innerText = name;
        this.container.append(label, input);
        return input;
    }
    addNamedInput(input, name) {
        input.id = `setting-${name}`;
        const label = el("label");
        label.htmlFor = input.id;
        label.innerText = name;
        this.container.append(label, input);
    }
    get name() {
        return this.nameVal;
    }
    get startDate() {
        return this.dateInput.valueAsDate ?? new Date();
    }
    set name(name) {
        this.nameVal = name;
        this.nameInput.value = name;
    }
    set startDate(date) {
        this.startDateVal = date;
        this.dateInput.valueAsDate = date;
    }
    get message() {
        return this.messageInput.value;
    }
    set message(msg) {
        this.messageInput.value = msg;
    }
    get signature() {
        return this.signatureInput.value;
    }
    set signature(sign) {
        this.signatureInput.value = sign;
    }
}
const projectSettings = new ProjectSettings;
function saveProject(id) {
    const proj = {
        startDate: projectSettings.startDate,
        name: projectSettings.name,
        message: projectSettings.message,
        signature: projectSettings.signature,
        flowers: []
    };
    for (const f1 of editor.items){
        proj.flowers.push({
            id: f1.id,
            x: f1.x,
            y: f1.y,
            size: f1.size,
            rotate: f1.rotate,
            program: [],
            programText: f1.programText
        });
    }
    localStorage.setItem(id, JSON.stringify(proj));
}
function loadProject(id) {
    const data1 = localStorage.getItem(id);
    if (!data1) return undefined;
    const parsed = JSON.parse(data1);
    if (!parsed.message) parsed.message = "";
    if (!parsed.signature) parsed.signature = "";
    return parsed;
}
function encodeProject() {
    const enc = new Encoder();
    const VERSION = 0;
    enc.writeVLI(0);
    enc.writeString(projectSettings.message);
    enc.writeString(projectSettings.signature);
    enc.writeVLI(projectSettings.startDate.getFullYear());
    enc.writeVLI(projectSettings.startDate.getMonth());
    enc.writeVLI(projectSettings.startDate.getDate());
    const programSet = gatherPrograms(editor.items);
    enc.writeVLI(programSet.programs.length);
    for (const prog of programSet.programs){
        enc.writeVLI(prog.length);
        for (const a of prog)encodeAction(enc, a);
    }
    enc.writeVLI(editor.items.length);
    editor.items.forEach((f1, idx)=>{
        let header = f1.id;
        if (f1.rotate != 0) header = header | FlowerSettings.HasRotate;
        const progIdx = programSet.progIdxs[idx];
        if (progIdx >= 0) header = header | FlowerSettings.HasActions;
        enc.writeByte(header);
        enc.writeVLI(f1.x);
        enc.writeVLI(f1.y);
        enc.writeVLI(f1.size);
        if (f1.rotate != 0) enc.writeVLI(f1.rotate);
        if (progIdx >= 0) enc.writeVLI(progIdx);
    });
    return enc.encode();
}
function encodeAction(enc, a) {
    const typeIdx = actionTypes.findIndex((t)=>t.name == a.name
    );
    let descriptor = typeIdx << 5;
    const firstParam = a.params[0];
    const firstParamIncluded = firstParam >= 0 && firstParam < 31;
    if (firstParamIncluded) descriptor = descriptor | firstParam;
    else descriptor = descriptor | 31;
    enc.writeByte(descriptor);
    for(let pidx = firstParamIncluded ? 1 : 0; pidx < a.params.length; ++pidx){
        enc.writeVLI(a.params[pidx]);
    }
}
function gatherPrograms(items) {
    const programs = [];
    const progIdxs = [];
    for (const f1 of items){
        const prog = f1.program;
        if (prog.length == 0) {
            progIdxs.push(-1);
            continue;
        }
        let idx = -1;
        for(let pidx = programs.length - 1; pidx >= 0; --pidx){
            if (programEquals(prog, programs[pidx])) {
                idx = pidx;
                break;
            }
        }
        if (idx == -1) {
            idx = programs.length;
            programs.push(prog);
        }
        progIdxs.push(idx);
    }
    return {
        programs,
        progIdxs
    };
}

//# sourceMappingURL=editor.js.map
