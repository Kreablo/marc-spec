# Marc spec

This is an implementation of http://marcspec.github.io/MARCspec/marc-spec.html with some modifications.

It is most conveniently used via the utility class MarcSpecCollection:

```
import { MarcSpecCollection } from '../lib/marc-spec-collection';

const c = new MarcSpecCollection();
const first_isbn = c.addSpec('020[0]$a');
const all_titles = c.addSpec('245');
const media_type = c.addSpec('007/0');
const movie_dimensions = c.addSpec('007/7{007/0="m"}');
const cinematographer = c.addSpec('100$a{$e=cng}');

c.loadRecordBase64('...');

const isbn_str = `ISBN: ${first_isbn.evaluate_str}`;

all_titles.fieldDelimiter = ', ';
all_titles.subfieldDelimiter = '';
const title_str = `Title information: ${all_titles.evaluate_str}`;
```
