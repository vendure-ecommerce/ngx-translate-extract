export class StringAsDefaultValuePostProcessor {
    constructor(options) {
        this.options = options;
        this.name = 'StringAsDefaultValue';
    }
    process(draft, extracted, existing) {
        return draft.map((key, val) => (existing.get(key) === undefined ? this.options.defaultValue : val));
    }
}
//# sourceMappingURL=string-as-default-value.post-processor.js.map