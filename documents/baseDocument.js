export class BaseDocument {
    constructor(file, supabase) {
        this.file = file;
        this.supabase = supabase;
    }

    validate() { throw new Error("validate() must be implemented."); }
    getFolder() { throw new Error("getFolder() must be implemented."); }
    getType() { throw new Error("getType() must be implemented."); }
}
