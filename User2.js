import ioClient from "socket.io-client";

const SERVER_URL = "http://localhost:3000";  
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZDZlMDMxOTFhODY0NDVkZjk2MjYwZSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU5NDAxNjA0LCJleHAiOjE3NTk0ODgwMDR9.cQHoFi7e_NLZHi2tP_TKNR0fUUVvFVChXJk5tOBLDZ0";    
const NAME = process.argv[2] || "User2"; 

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
