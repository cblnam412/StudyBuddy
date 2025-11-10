import { useState, useContext, useEffect, createContext } from "react";
import API from "../API/api";

const AuthContext = createContext();
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside the AuthProvider");
  return ctx;
}

export function AuthProvider({ children }) {
  const [userID, setUserID] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  // Try getting credentials from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const id = localStorage.getItem("userID");
    if (token) setAccessToken(token);
    if (id) setUserID(id);
  }, []);

  useEffect(() => {
    if (accessToken) localStorage.setItem("accessToken", accessToken);
    else if (!accessToken) localStorage.removeItem("accessToken");

    if (userID) localStorage.setItem("userID", userID);
    else if (!userID) localStorage.removeItem("userID");

    console.log(`Current user id is: ${userID ? userID : "Not found"}`);
    console.log(`Current access token is: ${accessToken ? accessToken : "Not found"}`);
  }, [userID, accessToken]);

  async function login(username, password) {
    if (!username.trim() || !password) {
      setError("Please enter username and password!");
      return;
    }

    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailOrPhone: username.trim(),
        password: password,
      }),
    });

    if (!res.ok) {
      setError(body.message);
    }

    const body = await res.json().catch(() => ({})); // Return empty object if parsing fails

    const { token, userId } = body;
    if (!token) throw new Error("No token returned from server");

    //console.log(`${token} || ${userId.toString()}`);
    setUserID(userId);
    setAccessToken(token);
  }

  function logout() {
    setUserID(null);
    setAccessToken(null);
  }

  return (
    <AuthContext.Provider value={{ userID, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
