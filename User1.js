import ioClient from "socket.io-client";

const SERVER_URL = "http://localhost:3000";
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZGU1NWQ0MTVhNWUxMWEyNjJmY2ZhMiIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU5NDAxNDY1LCJleHAiOjE3NTk0ODc4NjV9.ZmRhLussqN3w1dfITictTQSMSF_oOZ-ZF5GrMWQBUL4";
const NAME = process.argv[2] || "User1";

const socket = ioClient(SERVER_URL, {
    auth: { token: TOKEN },
    transports: ["websocket"],
});

socket.on("connect", () => {
    console.log(`[${NAME}] Connected: ${socket.id}`);
    socket.emit("user:online");
    console.log(`[${NAME}] ▶ emitted "user:online"`);
});

socket.on("disconnect", (reason) => {
    console.log(`[${NAME}] Disconnected (${reason})`);
});

socket.on("user:role_updated", (data) => {
    console.log(`[${NAME}] Role updated:`, data);
});

socket.on("global:user_online", (data) => {
    console.log(`[${NAME}] Global online event:`, data);
});

socket.onAny((event, ...args) => {
    if (!["connect", "disconnect"].includes(event)) {
        console.log(`[${NAME}] Event: ${event}`, ...args);
    }
});
