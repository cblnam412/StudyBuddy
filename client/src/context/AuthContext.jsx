import { useState, useContext, useEffect, useRef, createContext } from "react";
import API from "../API/api";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";

const AuthContext = createContext();
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside the AuthProvider");
  return ctx;
}

export function AuthProvider({ children }) {
  const [userID, setUserID] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isFetchingAuth, setFetchingAuth] = useState(true);

  const timeOutRef = useRef(null);

  // Try getting credentials from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const id = localStorage.getItem("userID");
    if (token) setAccessToken(token);
    if (id) setUserID(id);
    setFetchingAuth(false);
  }, []);

  useEffect(() => {
    if (accessToken && userID) {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("userID", userID);

      const { exp } = jwtDecode(accessToken);
      const remainingTime = exp * 1000 - Date.now();
      if (remainingTime <= 0) {
        logout();
        return;
      }

      timeOutRef.current = setTimeout(() => {
        toast.warning("Your session has expired!");
        logout();
      }, remainingTime);
    }

    if (!accessToken || !userID) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userID");
    }
    console.log(`Current user id is: ${userID ? userID : "Not found"}`);
    console.log(
      `Current access token is: ${accessToken ? accessToken : "Not found"}`
    );

    return () => {
      if (timeOutRef.current) {
        clearTimeout(timeOutRef.current);
        timeOutRef.current = null;
      }
    };
  }, [userID, accessToken]);

  async function login(username, password) {
    if (!username.trim()) {
      toast.warning("Vui lòng nhập tài khoản");
      return;
    }
    if (!password.trim()) // Remember to check the register logic for handling password spaces later
    {
      toast.warning("Vui lòng nhập mật khẩu");
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

    const body = await res.json().catch(() => ({})); // Return empty object if parsing fails

    if (!res.ok) {
      toast.warning(body.message);
    }

    const { token, userId } = body;

    if (!token) throw new Error("No token returned from server");

    // const { exp, iat, ...claims } = jwtDecode(token);
    // console.log(`Expiry is: ${exp * 1000}`);
    // console.log(`Date now: ${Date.now()}`);
    // console.log(`Difference ${exp * 1000 - Date.now()}`);
    //console.log(`${token} || ${userId.toString()}`);
    setUserID(userId);
    setAccessToken(token);
  }

  function logout() {
    setUserID(null);
    setAccessToken(null);

    if (timeOutRef.current) {
      clearTimeout(timeOutRef.current);
      timeOutRef.current = null;
    }
  }

  return (
    <AuthContext.Provider value={{ userID, accessToken, login, logout, isFetchingAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
