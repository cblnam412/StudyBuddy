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
  const [userInfo, setUserInfo] = useState(null);
  const [isFetchingAuth, setFetchingAuth] = useState(true);
  const [isFetchingUserInfo, setFetchingUserInfo] = useState(true);

  const timeOutRef = useRef(null);
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const id = localStorage.getItem("userID");
    if (token) setAccessToken(token); // What about token is found but not id?
    if (id) setUserID(id);


    setFetchingUserInfo(false);
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

      setFetchingUserInfo(true);
      fetchUserInfo(accessToken);
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

  async function fetchUserInfo(token) {
    try {
      const res = await fetch(`${API}/user/view-profile`, {
        headers: {
          Authorization: `Bearer ${token}`, 
        },
      });
      if (res.ok) {
        const {user} = await res.json();
        setUserInfo(user);
      }
    } catch (error) {
      console.error("Failed to fetch user info", error);
    }
    finally {
      setFetchingUserInfo(false);
    }
  }

  async function login(username, password) {
    if (!username.trim()) {
      toast.warning("Vui lòng nhập tài khoản");
      return;
    }
    if (!password.trim()) {
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

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.warning(body.message || "Đăng nhập thất bại");
      return;
    }

    const { token, userId } = body;

    if (!token || !userId)
      throw new Error("Server trả thiếu thông tin người dùng");

    setFetchingUserInfo(true);
    setUserID(userId);
    setAccessToken(token);
  }

  function logout() {
    setUserID(null);
    setAccessToken(null);
    setUserInfo(null);
    if (timeOutRef.current) {
      clearTimeout(timeOutRef.current);
      timeOutRef.current = null;
    }
  }

  return (
    <AuthContext.Provider
      value={{ userID, accessToken, login, logout, userInfo, setUserInfo, isFetchingAuth, isFetchingUserInfo}}
    >
      {children}
    </AuthContext.Provider>
  );
}
