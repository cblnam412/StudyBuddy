import { CreateRoomRequest } from "./createRoomRequest.js";
import { JoinRoomRequest } from "./joinRoomRequest.js";

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
            case "apply_moderator":
                return new JoinRoomRequest({ requesterId, data, models: this.models })
            // sau này thêm:
            // case "room_join": return new JoinRoomRequest(...)
            // case "mod_apply": return new ModeratorRequest(...)
        }

        throw new Error("Unknown request type.");
    }
}
