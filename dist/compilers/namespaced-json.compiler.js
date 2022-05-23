import { TranslationCollection } from '../utils/translation.collection.js';
import { stripBOM } from '../utils/utils.js';
import pkg from 'flat';
const { flatten, unflatten } = pkg;
export class NamespacedJsonCompiler {
    constructor(options) {
        this.indentation = '\t';
        this.extension = 'json';
        if (options && typeof options.indentation !== 'undefined') {
            this.indentation = options.indentation;
        }
    }
    compile(collection) {
        const values = unflatten(collection.values, {
            object: true
        });
        return JSON.stringify(values, null, this.indentation);
    }
    parse(contents) {
        const values = flatten(JSON.parse(stripBOM(contents)));
        return new TranslationCollection(values);
    }
}
//# sourceMappingURL=namespaced-json.compiler.js.map