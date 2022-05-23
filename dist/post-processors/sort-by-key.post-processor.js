export class SortByKeyPostProcessor {
    constructor() {
        this.name = 'SortByKey';
    }
    process(draft, extracted, existing) {
        return draft.sort();
    }
}
//# sourceMappingURL=sort-by-key.post-processor.js.map