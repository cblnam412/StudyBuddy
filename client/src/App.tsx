import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {Login, UserHomeScreen, RegisterAccount, VerifyOTP, ForgotPassword, ResetPassword,ChatPage, ExploreRoomsPage} from "./screens"

export default function App() {
  const [user, setUser] = React.useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (data: any) => {
    const payload = data.token;
    setUser(payload);
    localStorage.setItem("user", JSON.stringify(payload));
    //console.log(localStorage.getItem("user"));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/home"/> : <Login onSuccess={handleLoginSuccess} />}
        />
        <Route
          path="/register"
          element={<RegisterAccount />}
        />
        <Route
          path="/verify-otp"
          element={user ? <Navigate to="/home" /> : <VerifyOTP />}
        />
        <Route
          path="/forgotpass"
          element= <ForgotPassword />
        />
        <Route
          path="reset-password"
          element= <ResetPassword />
        />

        {/* SỬA LỖI CÚ PHÁP: Route /home được chuyển thành thẻ mở và bao bọc các Route con */}
        <Route
          path="/home"
          element={user ? <UserHomeScreen onLogout={handleLogout} /> : <Navigate to="/login" replace />}
        >
          {/* CÁC ROUTE CON BẮT BUỘC PHẢI Ở GIỮA */}
          <Route index element={<Navigate to="chat" replace />} /> {/* Mặc định vào /home sẽ chuyển đến /home/chat */}
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/:roomId" element={<ChatPage />} /> {/* Route cho chat theo phòng cụ thể */}
          <Route path="explore" element={<ExploreRoomsPage />} />

        </Route> {/* <-- Dấu đóng Route /home ở đây */}

        <Route path="*" element={<Navigate to={user ? "/home" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
