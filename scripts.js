// Toggle from number mode to regular text mode
function toggleInputMode() {
    const inputBox = document.getElementById('inputBox');
    const textInputMode = document.getElementById('textInputMode').checked;
    inputBox.placeholder = textInputMode ? "Enter text (e.g., 'Hello')" : "Enter value (e.g., '0xFF')";
    inputBox.value = '';
}

// Making sure the input is valid
function validateInput(input) {
    const textInputMode = document.getElementById('textInputMode').checked;
    let valid = textInputMode ? /^[\x00-\x7F]+$/.test(input) : /^(0x)?[0-9a-fA-F\s]+$|^[01\s]+$|^\d+(\.\d+)?$/.test(input);
    document.getElementById('inputBox').style.borderColor = valid ? '#333' : 'red';
    return valid;
}

// Conversion
function convert() {
    const input = document.getElementById('inputBox').value.trim();
    if (!input) {
        document.getElementById('output').innerText = 'Result: (no input)';
        return;
    }

    const type = document.getElementById('conversionType').value;
    const textInputMode = document.getElementById('textInputMode').checked;
    
    if (!validateInput(input)) {
        document.getElementById('output').innerText = 'Result: Invalid input';
        return;
    }

    let result;
    try {
        result = textInputMode ? convertText(input, type) : convertValue(input, type);
    } catch (error) {
        result = 'Conversion failed: ' + error.message;
    }

    document.getElementById('output').innerText = `Result: ${result}`;
}

// Converting -> value(s)
function convertValue(input, type) {
    const cleanInput = input.replace(/\s+/g, '');
    let dec;

    if (/^(0x)?[0-9a-fA-F]+$/.test(cleanInput)) {
        dec = BigInt(`0x${cleanInput.replace(/^0x/i, '')}`);
    } else if (/^[01]+$/.test(cleanInput)) {
        dec = BigInt(`0b${cleanInput}`);
    } else if (/^\d+$/.test(cleanInput)) {
        dec = BigInt(cleanInput);
    } else {
        throw new Error('Invalid numeric input format');
    }

    switch (type) {
        case 'hex': return `0x${dec.toString(16).toUpperCase()}`;
        case 'dec': return dec.toString();
        case 'bin': return dec.toString(2);
        case 'octal': return dec.toString(8);
        case 'base32': return base32Encode(dec.toString(2));
        case 'base64': return btoa(decimalToUTF8String(dec));
        default: throw new Error('Unknown conversion type');
    }
}

// Dec string
function decimalToUTF8String(dec) {
    let str = '';
    let temp = dec;
    while (temp > 0n) {
        str = String.fromCharCode(Number(temp & 255n)) + str;
        temp >>= 8n;
    }
    return str;
}

// Text to selected format
function convertText(input, type) {
    const text = input.trim();
    if (!text) return '(empty)';

    switch (type) {
        case 'hex': return stringToHex(text);
        case 'dec': return stringToDecimal(text);
        case 'bin': return stringToBinary(text);
        case 'octal': return stringToOctal(text);
        case 'base32': return stringToBase32(text);
        case 'base64': return btoa(text);
        default: throw new Error('Unknown conversion type');
    }
}

// Str -> Hex
function stringToHex(str) {
    return Array.from(str).map(c => `0x${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`).join(' ');
}

// Str -> Dec
function stringToDecimal(str) {
    return Array.from(str).map(c => c.charCodeAt(0).toString(10)).join(' ');
}

// Str -> Bin
function stringToBinary(str) {
    return Array.from(str).map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
}

// Str -> Octal
function stringToOctal(str) {
    return Array.from(str).map(c => c.charCodeAt(0).toString(8).padStart(3, '0')).join(' ');
}

// Str -> base32
function stringToBase32(str) {
    const bin = Array.from(str).map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join('');
    return base32Encode(bin);
}

// Encoding for base32
function base32Encode(binaryStr) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    const padLength = (5 - (binaryStr.length % 5)) % 5;
    const padded = binaryStr + '0'.repeat(padLength);
    
    for (let i = 0; i < padded.length; i += 5) {
        result += alphabet[parseInt(padded.substr(i, 5), 2)];
    }
    return result;
}

// Reverse translation
function reverseTranslate() {
    const input = document.getElementById('reverseInputBox').value.trim();
    if (!input) {
        document.getElementById('reverseOutput').innerText = 'Reversed Result: (no input)';
        return;
    }

    const format = document.getElementById('reverseFormat').value;
    let result;
    
    try {
        result = reverseConversion(input, format);
    } catch (error) {
        result = 'Reversal failed: ' + error.message;
    }

    document.getElementById('reverseOutput').innerText = `Reversed Result: ${result}`;
}

// Reverse conversion
function reverseConversion(input, format) {
    const cleanInput = input.replace(/\s+/g, ' ').trim();
    const parts = cleanInput.split(' ').filter(Boolean);
    
    switch (format) {
        case 'hex':
            return parts.map(p => {
                const hex = p.replace(/^0x/, '');
                if (!/^[0-9a-fA-F]+$/.test(hex)) throw new Error('Invalid hex');
                return String.fromCharCode(parseInt(hex, 16));
            }).join('');
        case 'dec':
            return parts.map(p => {
                if (!/^\d+$/.test(p)) throw new Error('Invalid decimal');
                const code = parseInt(p, 10);
                if (code > 0xFFFF) throw new Error('Decimal too large');
                return String.fromCharCode(code);
            }).join('');
        case 'bin':
            return parts.map(p => {
                if (!/^[01]+$/.test(p)) throw new Error('Invalid binary');
                return String.fromCharCode(parseInt(p, 2));
            }).join('');
        case 'octal':
            return parts.map(p => {
                if (!/^[0-7]+$/.test(p)) throw new Error('Invalid octal');
                return String.fromCharCode(parseInt(p, 8));
            }).join('');
        case 'base32': return decodeBase32(cleanInput);
        case 'base64':
            try { return atob(cleanInput); }
            catch { throw new Error('Invalid Base64'); }
        default: throw new Error('Invalid format for reverse conversion');
    }
}

// Decoding for base32
function decodeBase32(encoded) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let binaryStr = '';
    const cleanEncoded = encoded.toUpperCase().replace(/=+$/, '');
    
    for (const char of cleanEncoded) {
        const index = alphabet.indexOf(char);
        if (index === -1) throw new Error('Invalid Base32 character');
        binaryStr += index.toString(2).padStart(5, '0');
    }
    
    const paddingBits = binaryStr.length % 8;
    if (paddingBits !== 0) binaryStr = binaryStr.slice(0, -paddingBits);
    
    const bytes = binaryStr.match(/.{8}/g) || [];
    return bytes.map(b => String.fromCharCode(parseInt(b, 2))).join('');
}

// Normal math calculation (I'll need to fix this in the future.)
function evaluateMath(expression) {
    try {
        if (!expression.trim()) {
            document.getElementById('mathOutput').innerText = 'Math Error: Empty expression';
            return;
        }
        const sanitized = expression.replace(/[^0-9+\-*/.()%&|^~<>!= ]/g, '');
        let func = new Function('return ' + sanitized);
        document.getElementById('mathOutput').innerText = `Math Result: ${func()}`;
    } catch {
        document.getElementById('mathOutput').innerText = 'Math Error: Invalid expression';
    }
}

// The download section
function downloadOutput() {
    const outputs = [
        document.getElementById('output').innerText,
        document.getElementById('reverseOutput').innerText,
        document.getElementById('mathOutput').innerText
    ].filter(Boolean).join('\n\n');
    
    const blob = new Blob([outputs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'recalc_converter_output.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}