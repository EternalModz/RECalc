function toggleInputMode() {
    const inputBox = document.getElementById('inputBox');
    const textInputMode = document.getElementById('textInputMode').checked;
    if (textInputMode) {
        inputBox.placeholder = "Enter text (e.g., 'Hello')";
    } else {
        inputBox.placeholder = "Enter value (e.g., '0xFF')";
    }
    inputBox.value = ''; // Clear input when switching modes
}

function validateInput(input) {
    const textInputMode = document.getElementById('textInputMode').checked;
    let valid;

    if (textInputMode) {
        // Allow letters, spaces, symbols, and punctuation
        valid = /^[a-zA-Z0-9\s,.;:!?()<>\"'-]+$/.test(input);
    } else {
        // Allow numbers, spaces, hex, and decimal numbers
        valid = /^(0x)?[0-9a-fA-F\s]+$|^[01\s]+$|^\d+(\.\d+)?$/.test(input);
    }

    document.getElementById('inputBox').style.borderColor = valid ? '#333' : 'red';
}

function convert() {
    const input = document.getElementById('inputBox').value;
    const type = document.getElementById('conversionType').value;
    const textInputMode = document.getElementById('textInputMode').checked;
    let result;

    if (textInputMode) {
        result = convertText(input, type);
    } else {
        result = convertValue(input, type);
    }

    document.getElementById('output').innerText = `Result: ${result}`;
}

function convertValue(input, type) {
    let result;
    try {
        let dec;

        if (/^(0x)?[0-9a-fA-F]+$/.test(input)) {
            dec = BigInt(`0x${input.replace(/^0x/, '')}`);
        } else if (/^[01]+$/.test(input)) {
            dec = BigInt(`0b${input}`);
        } else if (/^\d+$/.test(input)) {
            dec = BigInt(input);
        } else {
            throw new Error('Invalid input format');
        }

        switch (type) {
            case 'hex':
                result = `0x${dec.toString(16).toUpperCase()}`;
                break;
            case 'dec':
                result = dec.toString();
                break;
            case 'bin':
                result = dec.toString(2);
                break;
            case 'octal':
                result = dec.toString(8);
                break;
            case 'base32':
                result = base32Encode(dec.toString(2));
                break;
            case 'base64':
                const utf8String = decimalToUTF8String(dec);
                result = btoa(utf8String);
                break;
            default:
                throw new Error('Unknown conversion type');
        }
    } catch (error) {
        result = 'Conversion failed. Check your input.';
    }
    return result;
}

function decimalToUTF8String(dec) {
    let str = '';
    while (dec > 0n) {
        str = String.fromCharCode(Number(dec & 255n)) + str;
        dec >>= 8n;
    }
    return str;
}

function convertText(input, type) {
    let result;
    const text = input.trim();

    switch (type) {
        case 'hex':
            result = stringToHex(text);
            break;
        case 'dec':
            result = stringToDecimal(text);
            break;
        case 'bin':
            result = stringToBinary(text);
            break;
        case 'octal':
            result = stringToOctal(text);
            break;
        case 'base32':
            result = stringToBase32(text);
            break;
        case 'base64':
            result = btoa(text);
            break;
        default:
            result = 'Unknown conversion type';
    }

    return result;
}

function stringToHex(str) {
    return str.split('').map(c => `0x${c.charCodeAt(0).toString(16).toUpperCase()}`).join(' ');
}

function stringToDecimal(str) {
    return str.split('').map(c => c.charCodeAt(0).toString(10)).join(' ');
}

function stringToBinary(str) {
    return str.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
}

function stringToOctal(str) {
    return str.split('').map(c => c.charCodeAt(0).toString(8).padStart(3, '0')).join(' ');
}

function stringToBase32(str) {
    const bin = str.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join('');
    return base32Encode(bin);
}

function base32Encode(binaryStr) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    for (let i = 0; i < binaryStr.length; i += 5) {
        let chunk = binaryStr.slice(i, i + 5).padEnd(5, '0');
        let index = parseInt(chunk, 2);
        result += alphabet[index];
    }
    return result;
}

function reverseTranslate() {
    const input = document.getElementById('reverseInputBox').value;
    const format = document.getElementById('reverseFormat').value;
    let result = reverseConversion(input, format);

    document.getElementById('reverseOutput').innerText = `Reversed Result: ${result}`;
}

function reverseConversion(input, format) {
    let result;
    const parts = input.split(' ').filter(Boolean);
    switch (format) {
        case 'hex':
            result = parts.map(p => String.fromCharCode(parseInt(p, 16))).join('');
            break;
        case 'bin':
            result = parts.map(p => String.fromCharCode(parseInt(p, 2))).join('');
            break;
        case 'dec':
            result = parts.map(p => String.fromCharCode(parseInt(p, 10))).join('');
            break;
        case 'octal':
            result = parts.map(p => String.fromCharCode(parseInt(p, 8))).join('');
            break;
        case 'base32':
            result = decodeBase32(parts.join(''));
            break;
        case 'base64':
            result = atob(parts.join(''));
            break;
        default:
            result = 'Invalid format for reverse conversion';
    }
    return result;
}

function decodeBase32(encoded) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let binaryStr = '';
    for (let i = 0; i < encoded.length; i++) {
        let index = alphabet.indexOf(encoded[i]);
        if (index === -1) return 'Invalid Base32 string';
        binaryStr += index.toString(2).padStart(5, '0');
    }
    return binaryStr.match(/.{8}/g).map(b => String.fromCharCode(parseInt(b, 2))).join('');
}

function evaluateMath(expression) {
    try {
        let result = eval(expression);
        document.getElementById('mathOutput').innerText = `Math Result: ${result}`;
    } catch (error) {
        document.getElementById('mathOutput').innerText = 'Math Error: Invalid expression';
    }
}

function downloadOutput() {
    const output = document.getElementById('output').innerText + '\n' + document.getElementById('reverseOutput').innerText + '\n' + document.getElementById('mathOutput').innerText;
    const blob = new Blob([output], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'converter_output.txt';
    link.click();
}
