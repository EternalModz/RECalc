'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const elements = {
    mathOutput: { innerText: '' },
    output: { innerText: '', style: {} },
    reverseOutput: { innerText: '' },
    inputBox: { value: '', style: {}, placeholder: '' },
    textInputMode: { checked: false },
    conversionType: { value: 'hex' },
    reverseInputBox: { value: '' },
    reverseFormat: { value: 'hex' }
};

const context = {
    console,
    TextEncoder,
    TextDecoder,
    btoa,
    atob,
    document: {
        getElementById(id) {
            if (!elements[id]) {
                elements[id] = { innerText: '', style: {} };
            }
            return elements[id];
        }
    },
    Blob: class BlobMock {},
    URL: {
        createObjectURL() { return 'blob:mock'; },
        revokeObjectURL() {}
    }
};

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'scripts.js'), 'utf8'), context);

function assertEqual(name, actual, expected) {
    if (actual !== expected) {
        throw new Error(`${name}: expected ${expected}, got ${actual}`);
    }
}

assertEqual('0xFF to decimal', context.convertValue('0xFF', 'dec'), '255');
assertEqual('0b1010 to decimal', context.convertValue('0b1010', 'dec'), '10');
assertEqual('plain digits remain decimal', context.convertValue('1010', 'dec'), '1010');
assertEqual('bare A-F hex still works', context.convertValue('FF', 'dec'), '255');
assertEqual('text to hex', context.convertText('Hello', 'hex'), '0x48 0x65 0x6C 0x6C 0x6F');
assertEqual('text to Base64', context.convertText('Hello', 'base64'), 'SGVsbG8=');
assertEqual('unicode to Base64', context.convertText('😀', 'base64'), '8J+YgA==');
assertEqual('reverse spaced hex', context.reverseConversion('0x48 0x65 0x6C 0x6C 0x6F', 'hex'), 'Hello');
assertEqual('reverse compact hex', context.reverseConversion('48656c6c6f', 'hex'), 'Hello');
assertEqual('reverse decimal bytes', context.reverseConversion('72 101 108 108 111', 'dec'), 'Hello');
assertEqual('reverse compact binary', context.reverseConversion('0100100001100101', 'bin'), 'He');
assertEqual('reverse Base64', context.reverseConversion('SGVsbG8=', 'base64'), 'Hello');
assertEqual('reverse Base32', context.reverseConversion('JBSWY3DP', 'base32'), 'Hello');

const longText = `${'Hello '.repeat(100)}😀`;
assertEqual('Base32 long round trip', context.reverseConversion(context.convertText(longText, 'base32'), 'base32'), longText);
assertEqual('Base64 long round trip', context.reverseConversion(context.convertText(longText, 'base64'), 'base64'), longText);

context.evaluateMath('5 + 3 * 2');
assertEqual('math precedence', elements.mathOutput.innerText, 'Math Result: 11');
context.evaluateMath('0x20 << 2');
assertEqual('math hex shift', elements.mathOutput.innerText, 'Math Result: 128');
context.evaluateMath('sqrt(81) + pow(2, 3)');
assertEqual('math helpers', elements.mathOutput.innerText, 'Math Result: 17');
context.evaluateMath('constructor.constructor("alert(1)")()');
if (!elements.mathOutput.innerText.startsWith('Math Error:')) {
    throw new Error('unsafe expression was not rejected');
}

console.log('RECalc checks passed');
