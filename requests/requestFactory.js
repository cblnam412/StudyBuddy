import { CreateRoomRequest } from "./manageRoomRequest.js";
import { JoinRoomRequest } from "./manageJoinRoomRequest.js";

export class RequestFactory {
    constructor(models) {
        this.models = models;
    }

    create(type, requesterId, data) {
        switch (type) {
            case "room_create":
                return new CreateRoomRequest({ requesterId, data, models: this.models });
            case "join_room":
                return new JoinRoomRequest({ requesterId, data, models: this.models });
        }

        throw new Error("Unknown request type.");
    }
}
