
import * as assert from 'assert';
import { CharLexer, CharToken } from '../lib/char-lexer';

test(`CharLexer: test lexing`, () => {
    const lexer = new CharLexer();
    const t1 = lexer.parse('123');
    assert.strictEqual(t1.pos.index, 0);
    assert.strictEqual(t1.pos.rowBegin, 1);
    assert.strictEqual(t1.pos.rowEnd, 1);
    assert.strictEqual(t1.pos.columnBegin, 1);
    assert.strictEqual(t1.pos.columnEnd, 2);
    assert.strictEqual(t1.text, '1');
    const t2 = t1.next;
    assert.strictEqual(t2.pos.index, 1);
    assert.strictEqual(t2.pos.rowBegin, 1);
    assert.strictEqual(t2.pos.rowEnd, 1);
    assert.strictEqual(t2.pos.columnBegin, 2);
    assert.strictEqual(t2.pos.columnEnd, 3);
    assert.strictEqual(t2.text, '2');
    const t3 = t2.next;
    assert.strictEqual(t3.pos.index, 2);
    assert.strictEqual(t3.pos.rowBegin, 1);
    assert.strictEqual(t3.pos.rowEnd, 1);
    assert.strictEqual(t3.pos.columnBegin, 3);
    assert.strictEqual(t3.pos.columnEnd, 4);
    assert.strictEqual(t3.text, '3');
    const t4 = t3.next;
    assert.strictEqual(t4, undefined);
});


test(`CharLexer: test lexing rows`, () => {
    const lexer = new CharLexer();
    const t1 = lexer.parse('1\n2\n3');
    const t2 = t1.next;
    assert.strictEqual(t2.pos.index, 1);
    assert.strictEqual(t2.pos.rowBegin, 1);
    assert.strictEqual(t2.pos.rowEnd, 2);
    assert.strictEqual(t2.pos.columnBegin, 2);
    assert.strictEqual(t2.pos.columnEnd, 1);
    assert.strictEqual(t2.text, '\n');
    const t3 = t2.next;
    assert.strictEqual(t3.pos.index, 2);
    assert.strictEqual(t3.pos.rowBegin, 2);
    assert.strictEqual(t3.pos.rowEnd, 2);
    assert.strictEqual(t3.pos.columnBegin, 1);
    assert.strictEqual(t3.pos.columnEnd, 2);
    assert.strictEqual(t3.text, '2');
});
