import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {Login, UserHomeScreen, RegisterAccount, VerifyOTP} from "./screens"

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
          element= <RegisterAccount />
        />
        <Route
          path="/verify-otp"
          element={user ? <Navigate to="/home" /> : <VerifyOTP onSuccess={handleLoginSuccess} />}
        />
        <Route
          path="/home"
          element={user ? <UserHomeScreen onLogout={handleLogout} /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to={user ? "/home" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}