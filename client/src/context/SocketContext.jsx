import { useEffect, useState, useRef, createContext, useContext } from "react";
import { useAuth } from "./AuthContext";
import { io } from "socket.io-client";
import API from "../API/api";

const SocketContext = createContext();

export function useSocket() {
  const socketCtx = useContext(SocketContext);
  if (!socketCtx)
    throw new Error("useSocket must be used inside SocketProvider!");
  return socketCtx;
}

export function SocketProvider({ children }) {
  const { accessToken } = useAuth();
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loadingSocket, setLoadingSocket] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      //console.log(`Access token not found | ${accessToken}`);
      return;
    }

    const socket = io(API, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setTimeout(() => setLoadingSocket(false), 1000);
    });

    socket.on("connect_error", (err) => {
      console.error(
        "Socket connect_error:",
        err && err.message ? err.message : err
      );
      if (err && err.message && /unauthor/i.test(err.message)) {
        logout();
        navigate("/login");
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    socket.on("global:user_online", ({ userName }) => {
      setOnlineUsers((prev) =>
        prev.includes(userName) ? prev : [...prev, userName]
      );
    });

    socket.on("global:user_offline", ({ userName }) => {
      setOnlineUsers((prev) => prev.filter((n) => n !== userName));
    });

    return () => {
      if (socketRef) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [accessToken]);

  return (
    <SocketContext.Provider value={{ socketRef, onlineUsers, loadingSocket }}>
      {children}
    </SocketContext.Provider>
  );
}
