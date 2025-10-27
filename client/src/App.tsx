import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {Login, HomeScreen} from "./screens"

export default function App() {
  const [user, setUser] = React.useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (data: any) => {
    // adapt this to the shape your API returns
    const payload = data?.user ?? data;
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
        <Route
          path="/login"
          element={user ? <Navigate to="/home" replace /> : <Login onSuccess={handleLoginSuccess} />}
        />
        <Route
          path="/home"
          element={user ? <HomeScreen onLogout={handleLogout} /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to={user ? "/home" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}