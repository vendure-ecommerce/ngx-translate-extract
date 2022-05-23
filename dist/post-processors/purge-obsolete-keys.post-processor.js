export class PurgeObsoleteKeysPostProcessor {
    constructor() {
        this.name = 'PurgeObsoleteKeys';
    }
    process(draft, extracted, existing) {
        return draft.intersect(extracted);
    }
}
//# sourceMappingURL=purge-obsolete-keys.post-processor.js.map