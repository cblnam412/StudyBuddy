import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  Login,
  UserHomeScreen,
  RegisterAccount,
  VerifyOTP,
  ForgotPassword,
  ResetPassword,
  ChatPage,
  ExploreRoomsPage,
  CreateRoom, // ✅ import
} from "./screens";

export default function App() {
  const [user, setUser] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (data) => {
    const payload = data.token;
    setUser(payload);
    localStorage.setItem("user", JSON.stringify(payload));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* --- AUTH ROUTES --- */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/home" replace />
            ) : (
              <Login onSuccess={handleLoginSuccess} />
            )
          }
        />
        <Route path="/register" element={<RegisterAccount />} />
        <Route
          path="/verify-otp"
          element={user ? <Navigate to="/home" replace /> : <VerifyOTP />}
        />
        <Route path="/forgotpass" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* --- PROTECTED ROUTES (PHẢI ĐĂNG NHẬP MỚI VÀO ĐƯỢC) --- */}
        <Route
          path="/home/*"
          element={
            user ? (
              <UserHomeScreen onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          {/* CÁC ROUTE CON CỦA /home */}
          <Route index element={<Navigate to="chat" replace />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/:roomId" element={<ChatPage />} />
          <Route path="explore" element={<ExploreRoomsPage />} />
          <Route path="create-room" element={<CreateRoom />} /> {/* ✅ Sửa để khớp navigate */}
        </Route>

        {/* --- DEFAULT ROUTE --- */}
        <Route
          path="*"
          element={<Navigate to={user ? "/home" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
