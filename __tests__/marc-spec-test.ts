import * as assert from 'assert';
import { expectSingleResult, expectEOF } from 'typescript-parsec';
import { newMarcSpecLexer, subTermSet, fullSpec, characterSpec, IndexSpec, CharacterSpec, FieldSpec, TokenType, SubfieldCode, SubfieldSpec, IndicatorSpec, subAndSpec, ComparisonString, MARCSpec, marcSpec, parseMarcSpec, serializeMarcSpec, BinaryOperator, BinarySubTermSet, UnaryOperator, UnarySubTermSet, AbbrFieldSpec, AbbrSubfieldSpec } from '../lib/marc-spec';


test('MarcSpec: character_Spec', () => {

    const lexer = newMarcSpecLexer();

    const t1 = lexer.parse('/0');
    assert.strictEqual(t1.kind, TokenType.BEGIN_CHARACTER);

    const t2 = t1.next;
    assert.strictEqual(t2.kind, TokenType.ZERO);

    const parse = (input: string) => expectSingleResult(expectEOF(characterSpec.parse(newMarcSpecLexer().parse(input))));
    const zero = parse('/0');

    assert.deepStrictEqual(zero, new CharacterSpec(0));

    const one = parse('/1');
    assert.deepStrictEqual(one, new CharacterSpec(1));


    const other = parse('/101');
    assert.deepStrictEqual(other, new CharacterSpec(101));

    const hash = parse('/#');
    assert.deepStrictEqual(hash, new CharacterSpec('#'));

    const range1 = parse('/0-1');
    assert.deepStrictEqual(range1, new CharacterSpec({ start: 0, end: 1 }));

    const range2 = parse('/2-10');
    assert.deepStrictEqual(range2, new CharacterSpec({ start: 2, end: 10 }));

    const range3 = parse('/2-#');
    assert.deepStrictEqual(range3, new CharacterSpec({ start: 2, end: '#' }));

    const range4 = parse('/0-#');
    assert.deepStrictEqual(range4, new CharacterSpec({ start: 0, end: '#' }));

    const range5 = parse('/100-#');
    assert.deepStrictEqual(range5, new CharacterSpec({ start: 100, end: '#' }));

});

test('MarcSpec: fieldSpec', () => {
    const parse = (input: string) => expectSingleResult(expectEOF(fullSpec.parse(newMarcSpecLexer().parse(input))));

    const ldr = parse('LDR');
    assert.deepStrictEqual(ldr([]), new FieldSpec('LDR', undefined, undefined, []));

    const ldr9 = parse('ldr/9');
    assert.deepStrictEqual(ldr9([]), new FieldSpec('ldr', undefined, new CharacterSpec(9), []));

    const m020 = parse('020[0-#]/0-#');
    assert.deepStrictEqual(m020([]), new FieldSpec('020', new IndexSpec({ start: 0, end: '#' }), new CharacterSpec({ start: 0, end: '#' }), []));

    const m020a = parse('020[10-11]$a-c[12-13]/14-#');
    assert.deepStrictEqual(m020a([]), new SubfieldSpec('020', new IndexSpec({ start: 10, end: 11 }), new SubfieldCode('a', 'c'), new IndexSpec({ start: 12, end: 13 }), new CharacterSpec({ start: 14, end: '#' }), []));

    const ind = parse('100[100-#]^1');
    assert.deepStrictEqual(ind([]), new IndicatorSpec('100', 1, new IndexSpec({ start: 100, end: '#' }), []));
});

test('MarcSpec: subTermSet', () => {
    const parse = (input: string) => expectSingleResult(expectEOF(subTermSet.parse(newMarcSpecLexer().parse(input))));
    const unused = new ComparisonString('unused', "\\");

    const s1 = parse('001');
    assert.deepStrictEqual(s1(unused), new UnarySubTermSet(undefined, new FieldSpec('001', undefined, undefined, [])));

    const s2 = parse('?001');
    assert.deepStrictEqual(s2(unused), new UnarySubTermSet(UnaryOperator.EXISTS, new FieldSpec('001', undefined, undefined, [])));
});

test('MarcSpec: subAndSpec', () => {
    const parse = (input: string) => expectSingleResult(expectEOF(subAndSpec.parse(newMarcSpecLexer().parse(input))));
    const applyUnused = (s) => s.map((s0) => s0.map((s1) => s1(new ComparisonString('unused', '\\'))));

    const s1 = parse('{001}');
    assert.deepStrictEqual(applyUnused(s1), [[new UnarySubTermSet(undefined, new FieldSpec('001', undefined, undefined, []))]]);

    const s2 = parse('{001|020[0]$a!=\\foo}');
    assert.deepStrictEqual(applyUnused(s2), [[
        new UnarySubTermSet(undefined, new FieldSpec('001', undefined, undefined, [])),
        new BinarySubTermSet(new SubfieldSpec('020', new IndexSpec(0), new SubfieldCode('a', 'a'), undefined, undefined, []), BinaryOperator.NOT_EQUALS, new ComparisonString('foo', '\\'))
    ]]);

    const empty = parse('');
    assert.deepStrictEqual(empty, []);
});

test('MarcSpec: MARCSpec', () => {
    const parse = (input: string) => expectSingleResult(expectEOF(marcSpec.parse(newMarcSpecLexer().parse(input))));

    const m = parse('LDR');
    assert.deepStrictEqual(m, new MARCSpec(new FieldSpec('LDR', undefined, undefined, [])));

    const m0 = parse('001/2-#{\\foo\\=\\{\\}\\!\\\\=[0]}');
    assert.deepStrictEqual(m0, new MARCSpec(new FieldSpec('001', undefined, new CharacterSpec({ start: 2, end: '#' }), [[new BinarySubTermSet(new ComparisonString('foo={}!\\', '\\'), BinaryOperator.EQUALS, new AbbrFieldSpec(new IndexSpec(0), undefined))]])));
});

test('MarcSpec: parseMarcSpec', () => {
    const result = parseMarcSpec('foo\nbar\n');
    assert.ok(!(result instanceof MARCSpec));

    assert.strictEqual(result.message, "failed-lexing-top-context");
    assert.deepStrictEqual(result.pos, { index: 3, columnBegin: 4, columnEnd: 4, rowBegin: 1, rowEnd: 1 });

    const result0 = parseMarcSpec('5..{$a=[1]$a[0]}');
    assert.ok(result0 instanceof MARCSpec);
    assert.deepStrictEqual(result0, new MARCSpec(new FieldSpec('5..', undefined, undefined, [
        [
            new BinarySubTermSet(
                new AbbrSubfieldSpec(undefined, new SubfieldCode("a", "a"), undefined, undefined),
                BinaryOperator.EQUALS,
                new AbbrSubfieldSpec(new IndexSpec(1), new SubfieldCode("a", "a"), new IndexSpec(0), undefined)
            )
        ]
    ])));

});

test('MarcSpec: serializeMarcSpec', () => {
    const testSerialize = (input: string) => {
        const result = parseMarcSpec(input);
        if (result instanceof MARCSpec) {
            assert.strictEqual(serializeMarcSpec(result), input);
        } else {
            console.log(result);
            assert.ok(false);
        }
    };

    testSerialize('LDR');
    testSerialize('999[0-#]^2');
    testSerialize('998[1-2]$a-c[0-1]/2-3{/1!=\\1|\\\\\\~997$a}');

    testSerialize('111$a{$b="double\\\\\\"\'"}');
    testSerialize("111$a{$b='single\\\\\\'\"'}");
});
