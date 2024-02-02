import * as assert from 'assert';

import { extractFields, base64RecordAsByteArray, Subscriber, DataField, ControlField, Subfield } from '../lib/marc-parser';

class MockFieldSubscriber implements Subscriber {
    public i: number = 0;
    constructor(
        public readonly tagPattern: string,
        public readonly expect: any[]
    ) { }

    public receiveDataField = (field: DataField) => {
        assert.ok(this.i < this.expect.length);
        assert.deepStrictEqual(field, this.expect[this.i++]);
    }

    public receiveControlField = (field: ControlField) => {
        assert.ok(this.i < this.expect.length);
        assert.deepStrictEqual(field, this.expect[this.i++]);
    }

    public noneLeft = () => {
        assert.strictEqual(this.i, this.expect.length);
    }
};

test('Marc parser: extractDirectoryEntries', () => {
    const marc_data = "MDE5MjNuYW0gYTIyMDAzMDE3YSA0NTAwMDAxMDAwODAwMDAwMDA4MDAzOTAwMDA4MDIwMDAyMjAw\nMDQ3MDIwMDAxODAwMDY5MDgxMDAzNzAwMDg3MTAwMDAyMjAwMTI0MjQ1MDExNjAwMTQ2MjYwMDAy\nODAwMjYyMzAwMDAwODAwMjkwMzUwMDAyMjAwMjk4MzUwMDAxODAwMzIwNTAwMDA0NDAwMzM4NTA1\nMDcxODAwMzgyNTMxMDA1ODAxMTAwNTM4MDAxMzAxMTU4NTM4MDAxMzAxMTcxNjgxMDA5MDAxMTg0\nNzAwMDAyMDAxMjc0ODg2MDAzMzAxMjk0ODg3MDAzMzAxMzI3OTUyMDE4MTAxMzYwOTk4MDA1OTAx\nNTQxOTk5MDAyMTAxNjAwHjQ5OTA1MDQeMDkwOTEzICAgICAgICAgc3cgICAgIGogICAgICAgICAg\nMSBzd2UeICAfYTk3OC05MS03Njk0LTc3OC00HiAgH2E5MS03Njk0LTc3OC01HiAgH2FYcWphH3NP\nH2tZcWphH3NPH2tIYy4wNx9zTx9odVgvTx4xIB9hQsO2cmplc3NvbiwgTGluZGEeMTAfYU9yZHNw\ncsOla3Nza2F0dGVuIB9oW0tvbWJpbmVyYXQgbWF0ZXJpYWxdIC8gH2NMaW5kYSBCw7ZyamVzc29u\nIFt0ZXh0ICYgbXVzaWtdIDsgS2FyZW4gT3RoZWxpdXMgW2lsbHVzdHJhdGlvbmVyXR4wIB9hSGVz\ndHJhH2JJc2FiZXJnH2NbMjAwOV0eICAfdkJvax4wMB9jOTc4LTkxLTc2OTQtNzc4LTQeMDAfYzkx\nLTc2OTQtNzc4LTUeMyAfYU1lbG9kaXN0w6RtbWEgbWVkIHRleHQgb2NoIGFja29yZGFuYWx5cx4g\nIB9hSW5uZWjDpWxsOiBNYW4gc2thIGludGUgZ8O2cmEgZW4gaMO2bmEgYXYgZW4gZmrDpGRlciA7\nIE7DpHIga2F0dGVuIMOkciBib3J0YSBkYW5zYXIgcsOldHRvcm5hIHDDpSBib3JkZXQgOyBUYWxh\nIMOkciBzaWx2ZXIgbWVuIHRpZ2Egw6RyIGd1bGQgOyBTb20gbWFuIHJvcGFyIHV0aSBza29nZW4g\nZsOlciBtYW4gc3ZhciA7IELDpHR0cmUgZW4gZsOlZ2VsIGkgaGFuZGVuIMOkbiB0aW8gaSBza29n\nZW4gOyBTbcOlIGdyeXRvciBoYXIgb2Nrc8OlIMO2cm9uIDsgQm9ydGEgYnJhIG1lbiBoZW1tYSBi\nw6RzdCA7IERlbiBzb20gZ2FwYXIgZWZ0ZXIgbXlja2V0IG1pc3RlciBvZnRhIGhlbGEgc3R5Y2tl\ndCA7IEdyw6RzZXQgw6RyIGludGUgZ3LDtm5hcmUgcMOlIGFuZHJhIHNpZGFuIHN0YWtldGV0IDsg\nU29tIG1hbiBiw6RkZGFyIGbDpXIgbWFuIGxpZ2dhIDsgTGl0ZW4gdHV2YSBzdGrDpGxwZXIgb2Z0\nYSBzdG9yYSBsYXNzIDsgVG9tbWEgdHVubm9yIDsgQXJnYSBrYXR0ZXIgZsOlciByaXZldCBza2lu\nbiA7IERlbiBzb20gZ3LDpHZlciBlbiBncm9wIMOldCBuw6Vnb24gYW5uYW4gZmFsbGVyIG9mdGEg\nc2rDpGx2IGTDpHJpIDsgRGV0IHNvbSBnw7ZtcyBpIHNuw7Yga29tbWVyIHVwcCBpIHTDtiA7IE1h\nbiBza2EgaW50ZSBnw6Ugw7Z2ZXIgw6VuIGVmdGVyIHZhdHRlbiA7IEh1didldCB1bmRlciBhcm1l\nbiAoYm9udXN2aXNhIG1lZCBmeXJhIHRhbGVzw6R0dCkeICAfYUFubmF0IGFudGFsIGtvbXBvbmVu\ndGVyIGthbiBhbmdlcyBpIGxva2FsIGFubcOkcmtuaW5nHjcgH2EwOTEyMzYwMB43IB9hMDkxMjM2\nMDEeICAfYUJhcm52aXNvch9hTXVzaWthbGllch9hU8OlbmcfYVZpc29yH2FWb2thbG11c2lrOiBz\nw6Ryc2tpbGRhIGZvcm1lch9hTXVzaWtpbnNwZWxuaW5nYXIeMTMfYU90aGVsaXVzLCBLYXJlbh4w\nIB9iTENNQVNXU1cwMDAwU1dFUyBCRB8yQlVSSyBJVh4wIB8yQlVSSyBJVh9iUE8gQVNXU1cwMDAw\nU1dFUyBCRB4gIB8wMB8xMB80MB82VVhPHzcwHzhCQVJOHzkxNzk4MTg1H2FBUkJPR0EfYkFSQk9H\nQR9jT1BQRU5IWUxMQR9kMjAxMC0wMS0wNR9nMjk2LjAwH2w0H20xH291WC9PH3A4MDA0MDEwMzIx\nMR9yMjAyMS0wNi0yOCAwMDowMDowMB9zMjAyMS0wNS0yNB92Mjk2LjAwH3hDRDpuIHNha25hcyAy\nMDEyLTA2LTI1H3lCTk9URVIeICAfdWh0dHA6Ly90aWZvLmJ0ai5zZS84NDA4MTg5MjIyMDMwODI1\nH3hFeHRyYSBpbmZvcm1hdGlvbh4gIB9jMTYwNDk0MB9kMTYwNTAyNx4d\n";

    const record = base64RecordAsByteArray(marc_data);

    const subscribers = [
        new MockFieldSubscriber('001', [new ControlField('001', '4990504')]),
        new MockFieldSubscriber('008', [new ControlField('008', '090913         sw     j          1 swe')]),
        new MockFieldSubscriber('020', [
            new DataField('020', '  ', new Map<string, Subfield[]>([['a', [{ code: 'a', data: '978-91-7694-778-4' }]]])),
            new DataField('020', '  ', new Map<string, Subfield[]>([['a', [{ code: 'a', data: '91-7694-778-5' }]]]))
        ]),
        new MockFieldSubscriber('793', []),
        new MockFieldSubscriber('5..', [
            new DataField('500', '3 ', new Map<string, Subfield[]>([['a', [{ code: 'a', data: 'Melodistämma med text och ackordanalys' }]]])),
            new DataField('505', '  ', new Map<string, Subfield[]>([['a', [{ code: 'a', data: 'Innehåll: Man ska inte göra en höna av en fjäder ; När katten är borta dansar råttorna på bordet ; Tala är silver men tiga är guld ; Som man ropar uti skogen får man svar ; Bättre en fågel i handen än tio i skogen ; Små grytor har också öron ; Borta bra men hemma bäst ; Den som gapar efter mycket mister ofta hela stycket ; Gräset är inte grönare på andra sidan staketet ; Som man bäddar får man ligga ; Liten tuva stjälper ofta stora lass ; Tomma tunnor ; Arga katter får rivet skinn ; Den som gräver en grop åt någon annan faller ofta själv däri ; Det som göms i snö kommer upp i tö ; Man ska inte gå över ån efter vatten ; Huv\'et under armen (bonusvisa med fyra talesätt)' }]]])),
            new DataField('531', '  ', new Map<string, Subfield[]>([['a', [{ code: 'a', data: 'Annat antal komponenter kan anges i lokal anmärkning' }]]])),
            new DataField('538', '7 ', new Map<string, Subfield[]>([['a', [{ code: 'a', data: '09123600' }]]])),
            new DataField('538', '7 ', new Map<string, Subfield[]>([['a', [{ code: 'a', data: '09123601' }]]])),
        ])

    ];

    extractFields(record, subscribers);

    for (const s of subscribers) {
        s.noneLeft();
    }

});
