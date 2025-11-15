import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {useAuth} from './context/AuthContext';
import {UserHomeLayout} from './layouts/UserHomeLayout/UserHomeLayout.jsx';

import {
    Login,
    RegisterAccount,
    VerifyOTP,
    ForgotPassword,
    ResetPassword,
    ChatPage,
    ExploreRoomsPage,
    CreateRoom,
    JoinRequestsPage,
} from "./screens";

export default function App() {
    const { accessToken, logout} = useAuth();
    return (
        <BrowserRouter>
            <Routes>
                {/* --- AUTH ROUTES --- */}
                <Route
                    path="/login"
                    element={
                        accessToken ? (
                            <Navigate to="/home" replace />
                        ) : (
                            <Login/>
                        )
                    }
                />
                <Route path="/register" element={<RegisterAccount />} />
                <Route
                    path="/verify-otp"
                    element={accessToken ? <Navigate to="/home" replace /> : <VerifyOTP />}
                />
                <Route path="/forgotpass" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* --- PROTECTED ROUTES (PHẢI ĐĂNG NHẬP MỚI VÀO ĐƯỢC) --- */}
                <Route
                    path="/home/*"
                    element={
                        accessToken ? (
                            <UserHomeLayout />
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
                    <Route path="create-room" element={<CreateRoom />} />{" "}
                    <Route path="join-requests" element={<JoinRequestsPage />} />
                </Route>

                {/* --- DEFAULT ROUTE --- */}
                <Route
                    path="*"
                    element={<Navigate to={accessToken ? "/home" : "/login"} replace />}
                />
            </Routes>
        </BrowserRouter>
    );
}
