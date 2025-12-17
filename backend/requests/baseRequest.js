
export class BaseRequest {
    constructor({ requesterId, models }) {
        this.requesterId = requesterId;
        this.models = models;
    }

    validate() {
        throw new Error("validate() must be implemented.");
    }

    async saveRequest() {
        throw new Error("saveRequest() must be implemented.");
    }

    async approve() {
        throw new Error("approve() must be implemented.");
    }

    async reject() {
        throw new Error("reject() must be implemented.");
    }
}
