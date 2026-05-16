'use strict';

const BORDER_DEFAULT = '#333';
const BORDER_ERROR = '#ff5a66';
const BYTE_MAX = 0xff;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Missing required element: ${id}`);
    }
    return element;
}

function setOutput(id, label, value) {
    getElement(id).innerText = `${label}: ${value}`;
}

function normalizeNumericInput(input) {
    return input.replace(/[\s_]/g, '');
}

function bytesToText(bytes) {
    try {
        return textDecoder.decode(Uint8Array.from(bytes));
    } catch {
        throw new Error('Decoded bytes are not valid UTF-8 text');
    }
}

function textToBytes(text) {
    return Array.from(textEncoder.encode(text));
}

function numberToBytes(value) {
    if (value < 0n) {
        throw new Error('Negative values cannot be encoded as bytes');
    }

    if (value === 0n) {
        return [0];
    }

    const bytes = [];
    let current = value;
    while (current > 0n) {
        bytes.unshift(Number(current & 0xffn));
        current >>= 8n;
    }
    return bytes;
}

function bytesToBase64(bytes) {
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

function base64ToBytes(input) {
    const cleanInput = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    if (!cleanInput || cleanInput.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(cleanInput)) {
        throw new Error('Invalid Base64');
    }

    const padded = cleanInput.padEnd(Math.ceil(cleanInput.length / 4) * 4, '=');
    try {
        return Array.from(atob(padded), char => char.charCodeAt(0));
    } catch {
        throw new Error('Invalid Base64');
    }
}

function bytesToBase32(bytes) {
    let output = '';
    let buffer = 0;
    let bitsLeft = 0;

    for (const byte of bytes) {
        buffer = (buffer << 8) | byte;
        bitsLeft += 8;

        while (bitsLeft >= 5) {
            output += BASE32_ALPHABET[(buffer >> (bitsLeft - 5)) & 31];
            bitsLeft -= 5;
        }

        buffer &= bitsLeft ? (1 << bitsLeft) - 1 : 0;
    }

    if (bitsLeft > 0) {
        output += BASE32_ALPHABET[(buffer << (5 - bitsLeft)) & 31];
    }

    return output;
}

function base32ToBytes(input) {
    const cleanInput = input.toUpperCase().replace(/[\s=-]/g, '');
    if (!cleanInput) {
        return [];
    }

    let buffer = 0;
    let bitsLeft = 0;
    const bytes = [];

    for (const char of cleanInput) {
        const index = BASE32_ALPHABET.indexOf(char);
        if (index === -1) {
            throw new Error('Invalid Base32 character');
        }

        buffer = (buffer << 5) | index;
        bitsLeft += 5;

        if (bitsLeft >= 8) {
            bitsLeft -= 8;
            bytes.push((buffer >> bitsLeft) & BYTE_MAX);
            buffer &= bitsLeft ? (1 << bitsLeft) - 1 : 0;
        }
    }

    if (bitsLeft > 0 && (buffer & ((1 << bitsLeft) - 1)) !== 0) {
        throw new Error('Invalid Base32 padding bits');
    }

    return bytes;
}

function parseNumericValue(input) {
    const cleanInput = normalizeNumericInput(input);

    if (!cleanInput) {
        throw new Error('Missing numeric input');
    }

    if (/^0x[0-9a-f]+$/i.test(cleanInput)) {
        return BigInt(cleanInput);
    }

    if (/^0b[01]+$/i.test(cleanInput)) {
        return BigInt(cleanInput);
    }

    if (/^0o[0-7]+$/i.test(cleanInput)) {
        return BigInt(cleanInput);
    }

    if (/^\d+$/.test(cleanInput)) {
        return BigInt(cleanInput);
    }

    if (/^[0-9a-f]+$/i.test(cleanInput) && /[a-f]/i.test(cleanInput)) {
        return BigInt(`0x${cleanInput}`);
    }

    throw new Error('Invalid numeric input. Use decimal, 0x hex, 0b binary, 0o octal, or bare hex containing A-F.');
}

function parseByteToken(token, radix, label) {
    const value = parseInt(token, radix);
    if (!Number.isInteger(value) || value < 0 || value > BYTE_MAX) {
        throw new Error(`${label} byte must be between 0 and 255`);
    }
    return value;
}

function splitReverseInput(input) {
    return input
        .trim()
        .split(/[\s,;]+/)
        .map(part => part.trim())
        .filter(Boolean);
}

function parseHexBytes(input) {
    const normalized = input.trim();
    const tokenized = splitReverseInput(normalized);
    const hasExplicitSeparators = /[\s,;]/.test(normalized);

    if (hasExplicitSeparators || tokenized.some(token => /^0x/i.test(token))) {
        return tokenized.map(token => {
            const hex = token.replace(/^0x/i, '');
            if (!/^[0-9a-f]{1,2}$/i.test(hex)) {
                throw new Error('Invalid hex byte');
            }
            return parseByteToken(hex, 16, 'Hex');
        });
    }

    const cleanHex = normalized.replace(/^0x/i, '');
    if (!/^[0-9a-f]+$/i.test(cleanHex) || cleanHex.length % 2 !== 0) {
        throw new Error('Hex must use byte pairs, e.g. 48 65 or 4865');
    }

    return cleanHex.match(/.{2}/g).map(pair => parseByteToken(pair, 16, 'Hex'));
}

function parseDecimalBytes(input) {
    const parts = splitReverseInput(input);
    if (!parts.length) {
        throw new Error('No decimal bytes found');
    }

    return parts.map(part => {
        if (!/^\d+$/.test(part)) {
            throw new Error('Invalid decimal byte');
        }
        return parseByteToken(part, 10, 'Decimal');
    });
}

function parseBinaryBytes(input) {
    const parts = splitReverseInput(input);
    if (!parts.length) {
        throw new Error('No binary bytes found');
    }

    if (parts.length === 1 && parts[0].length > 8) {
        const compact = parts[0];
        if (!/^[01]+$/.test(compact) || compact.length % 8 !== 0) {
            throw new Error('Binary must use 8-bit byte groups');
        }
        return compact.match(/.{8}/g).map(part => parseByteToken(part, 2, 'Binary'));
    }

    return parts.map(part => {
        if (!/^[01]{1,8}$/.test(part)) {
            throw new Error('Invalid binary byte');
        }
        return parseByteToken(part, 2, 'Binary');
    });
}

function parseOctalBytes(input) {
    const parts = splitReverseInput(input);
    if (!parts.length) {
        throw new Error('No octal bytes found');
    }

    return parts.map(part => {
        if (!/^[0-7]{1,3}$/.test(part)) {
            throw new Error('Invalid octal byte');
        }
        return parseByteToken(part, 8, 'Octal');
    });
}

// Toggle from number mode to regular text mode
function toggleInputMode() {
    const inputBox = getElement('inputBox');
    const textInputMode = getElement('textInputMode').checked;
    inputBox.placeholder = textInputMode ? "Enter text (e.g., 'Hello')" : "Enter value (e.g., '0xFF', '0b1010', '255')";
    inputBox.value = '';
    inputBox.style.borderColor = BORDER_DEFAULT;
    setOutput('output', 'Result', '');
}

// Making sure the input is valid
function validateInput(input) {
    const textInputMode = getElement('textInputMode').checked;
    let valid = true;

    if (!textInputMode && input.trim()) {
        try {
            parseNumericValue(input);
        } catch {
            valid = false;
        }
    }

    getElement('inputBox').style.borderColor = valid ? BORDER_DEFAULT : BORDER_ERROR;
    return valid;
}

// Conversion
function convert() {
    const rawInput = getElement('inputBox').value;
    const textInputMode = getElement('textInputMode').checked;
    const input = textInputMode ? rawInput : rawInput.trim();

    if (!input.length) {
        setOutput('output', 'Result', '(no input)');
        return;
    }

    const type = getElement('conversionType').value;

    if (!validateInput(input)) {
        setOutput('output', 'Result', 'Invalid input');
        return;
    }

    let result;
    try {
        result = textInputMode ? convertText(input, type) : convertValue(input, type);
    } catch (error) {
        result = `Conversion failed: ${error.message}`;
    }

    setOutput('output', 'Result', result);
}

// Converting -> value(s)
function convertValue(input, type) {
    const dec = parseNumericValue(input);

    switch (type) {
        case 'hex': return `0x${dec.toString(16).toUpperCase()}`;
        case 'dec': return dec.toString();
        case 'bin': return dec.toString(2);
        case 'octal': return dec.toString(8);
        case 'base32': return bytesToBase32(numberToBytes(dec));
        case 'base64': return bytesToBase64(numberToBytes(dec));
        default: throw new Error('Unknown conversion type');
    }
}

// Dec string
function decimalToUTF8String(dec) {
    return bytesToText(numberToBytes(BigInt(dec)));
}

// Text to selected format
function convertText(input, type) {
    if (!input.length) return '(empty)';

    switch (type) {
        case 'hex': return stringToHex(input);
        case 'dec': return stringToDecimal(input);
        case 'bin': return stringToBinary(input);
        case 'octal': return stringToOctal(input);
        case 'base32': return stringToBase32(input);
        case 'base64': return bytesToBase64(textToBytes(input));
        default: throw new Error('Unknown conversion type');
    }
}

// Str -> Hex
function stringToHex(str) {
    return textToBytes(str).map(byte => `0x${byte.toString(16).toUpperCase().padStart(2, '0')}`).join(' ');
}

// Str -> Dec
function stringToDecimal(str) {
    return textToBytes(str).map(byte => byte.toString(10)).join(' ');
}

// Str -> Bin
function stringToBinary(str) {
    return textToBytes(str).map(byte => byte.toString(2).padStart(8, '0')).join(' ');
}

// Str -> Octal
function stringToOctal(str) {
    return textToBytes(str).map(byte => byte.toString(8).padStart(3, '0')).join(' ');
}

// Str -> base32
function stringToBase32(str) {
    return bytesToBase32(textToBytes(str));
}

// Encoding for base32
function base32Encode(binaryStr) {
    const normalizedBinary = String(binaryStr).replace(/\s+/g, '');
    if (!/^[01]*$/.test(normalizedBinary)) {
        throw new Error('Base32 encoder expects a binary string');
    }

    const bytes = [];
    for (let i = 0; i < normalizedBinary.length; i += 8) {
        const chunk = normalizedBinary.slice(i, i + 8).padEnd(8, '0');
        bytes.push(parseInt(chunk, 2));
    }
    return bytesToBase32(bytes);
}

// Reverse translation
function reverseTranslate() {
    const input = getElement('reverseInputBox').value.trim();
    if (!input) {
        setOutput('reverseOutput', 'Reversed Result', '(no input)');
        return;
    }

    const format = getElement('reverseFormat').value;
    let result;

    try {
        result = reverseConversion(input, format);
    } catch (error) {
        result = `Reversal failed: ${error.message}`;
    }

    setOutput('reverseOutput', 'Reversed Result', result);
}

// Reverse conversion
function reverseConversion(input, format) {
    switch (format) {
        case 'hex': return bytesToText(parseHexBytes(input));
        case 'dec': return bytesToText(parseDecimalBytes(input));
        case 'bin': return bytesToText(parseBinaryBytes(input));
        case 'octal': return bytesToText(parseOctalBytes(input));
        case 'base32': return bytesToText(base32ToBytes(input));
        case 'base64': return bytesToText(base64ToBytes(input));
        default: throw new Error('Invalid format for reverse conversion');
    }
}

// Decoding for base32
function decodeBase32(encoded) {
    return bytesToText(base32ToBytes(encoded));
}

function tokenizeExpression(expression) {
    const tokens = [];
    let index = 0;

    while (index < expression.length) {
        const char = expression[index];

        if (/\s/.test(char)) {
            index += 1;
            continue;
        }

        const rest = expression.slice(index);
        const prefixedNumber = rest.match(/^0[xX][0-9a-fA-F]+|^0[bB][01]+|^0[oO][0-7]+/);
        const decimalNumber = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);

        if (prefixedNumber) {
            tokens.push({ type: 'number', value: Number(BigInt(prefixedNumber[0])) });
            index += prefixedNumber[0].length;
            continue;
        }

        if (decimalNumber) {
            tokens.push({ type: 'number', value: Number(decimalNumber[0]) });
            index += decimalNumber[0].length;
            continue;
        }

        const identifier = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
        if (identifier) {
            tokens.push({ type: 'identifier', value: identifier[0] });
            index += identifier[0].length;
            continue;
        }

        const operator = rest.match(/^(?:>>>|<<|>>|\*\*|[()+\-*/%&,|^~])/);
        if (operator) {
            tokens.push({ type: 'operator', value: operator[0] });
            index += operator[0].length;
            continue;
        }

        throw new Error(`Unsupported character: ${char}`);
    }

    tokens.push({ type: 'end', value: '' });
    return tokens;
}

function createExpressionParser(tokens) {
    let position = 0;
    const functions = {
        abs: Math.abs,
        ceil: Math.ceil,
        floor: Math.floor,
        max: Math.max,
        min: Math.min,
        pow: Math.pow,
        round: Math.round,
        sqrt: Math.sqrt,
        trunc: Math.trunc
    };
    const constants = {
        e: Math.E,
        pi: Math.PI
    };

    function peek() {
        return tokens[position];
    }

    function consume(value) {
        if (peek().value === value) {
            position += 1;
            return true;
        }
        return false;
    }

    function expect(value) {
        if (!consume(value)) {
            throw new Error(`Expected '${value}'`);
        }
    }

    function parseArguments() {
        const args = [];
        if (consume(')')) {
            return args;
        }

        do {
            args.push(parseBitwiseOr());
        } while (consume(','));

        expect(')');
        return args;
    }

    function parsePrimary() {
        const token = peek();

        if (token.type === 'number') {
            position += 1;
            return token.value;
        }

        if (token.type === 'identifier') {
            const name = token.value.toLowerCase();
            position += 1;

            if (consume('(')) {
                if (!Object.prototype.hasOwnProperty.call(functions, name)) {
                    throw new Error(`Unknown function: ${token.value}`);
                }
                return functions[name](...parseArguments());
            }

            if (!Object.prototype.hasOwnProperty.call(constants, name)) {
                throw new Error(`Unknown constant: ${token.value}`);
            }
            return constants[name];
        }

        if (consume('(')) {
            const value = parseBitwiseOr();
            expect(')');
            return value;
        }

        throw new Error('Expected a number, function, or parenthesized expression');
    }

    function parseUnary() {
        if (consume('+')) return parseUnary();
        if (consume('-')) return -parseUnary();
        if (consume('~')) return ~parseUnary();
        return parsePrimary();
    }

    function parsePower() {
        const left = parseUnary();
        if (consume('**')) {
            return left ** parsePower();
        }
        return left;
    }

    function parseMultiplicative() {
        let value = parsePower();
        while (true) {
            if (consume('*')) value *= parsePower();
            else if (consume('/')) value /= parsePower();
            else if (consume('%')) value %= parsePower();
            else return value;
        }
    }

    function parseAdditive() {
        let value = parseMultiplicative();
        while (true) {
            if (consume('+')) value += parseMultiplicative();
            else if (consume('-')) value -= parseMultiplicative();
            else return value;
        }
    }

    function parseShift() {
        let value = parseAdditive();
        while (true) {
            if (consume('>>>')) value >>>= parseAdditive();
            else if (consume('<<')) value <<= parseAdditive();
            else if (consume('>>')) value >>= parseAdditive();
            else return value;
        }
    }

    function parseBitwiseAnd() {
        let value = parseShift();
        while (consume('&')) {
            value &= parseShift();
        }
        return value;
    }

    function parseBitwiseXor() {
        let value = parseBitwiseAnd();
        while (consume('^')) {
            value ^= parseBitwiseAnd();
        }
        return value;
    }

    function parseBitwiseOr() {
        let value = parseBitwiseXor();
        while (consume('|')) {
            value |= parseBitwiseXor();
        }
        return value;
    }

    const result = parseBitwiseOr();
    if (peek().type !== 'end') {
        throw new Error('Unexpected input after expression');
    }
    if (!Number.isFinite(result)) {
        throw new Error('Result is not finite');
    }
    return result;
}

// Normal math calculation
function evaluateMath(expression) {
    try {
        if (!expression.trim()) {
            setOutput('mathOutput', 'Math Error', 'Empty expression');
            return;
        }

        const result = createExpressionParser(tokenizeExpression(expression));
        setOutput('mathOutput', 'Math Result', Number.isInteger(result) ? result.toString() : String(result));
    } catch (error) {
        setOutput('mathOutput', 'Math Error', error.message || 'Invalid expression');
    }
}

// The download section
function downloadOutput() {
    const outputs = [
        getElement('output').innerText,
        getElement('reverseOutput').innerText,
        getElement('mathOutput').innerText
    ].filter(Boolean).join('\n\n');

    const contents = `RECalc Results\nGenerated: ${new Date().toISOString()}\n\n${outputs}\n`;
    const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'recalc_converter_output.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
