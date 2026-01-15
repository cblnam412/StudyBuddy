import { CreateRoomRequest } from "./manageRoomRequest.js";
import { JoinRoomRequest } from "./manageJoinRoomRequest.js";

export class RequestFactory {
    constructor(models) {
        this.models = models;
        console.log("[Factory] Models:", Object.keys(models));
    }

    create(type, requesterId, data) {
        console.log("[Factory] create() called");
        console.log("type:", type);
        console.log("requesterId:", requesterId);
        console.log("data:", data);

        switch (type) {
            case "room_create":
                console.log("[Factory] CreateRoomRequest");
                return new CreateRoomRequest({ requesterId, data, models: this.models });

            case "join_room":
                console.log("[Factory] JoinRoomRequest");
                return new JoinRoomRequest({ requesterId, data, models: this.models });

            default:
                console.log("[Factory] UNKNOWN TYPE:", type);
                throw new Error("Unknown request type: " + type);
        }
    }
}
