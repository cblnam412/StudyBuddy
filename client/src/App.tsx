import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from './context/AuthContext';
import { UserHomeLayout } from './layouts/UserHomeLayout/UserHomeLayout.jsx';
import { LoadingSpinner } from "./components/LoadingSpinner/LoadingSpinner";

import {
    VerifyOTP,
    ForgotPassword,
    ResetPassword,
    ChatPage,
    ExploreRoomsPage,
    CreateRoom,
    JoinRequestsPage,
} from "./screens";
import AuthPage from "./screens/AuthPage";

export default function App() {
    const { accessToken, isFetchingAuth } = useAuth();

    if (isFetchingAuth) {
        return <LoadingSpinner label="Đang lấy thông tin đăng nhập" />;
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={
                        accessToken ? <Navigate to="/home" replace /> : <AuthPage />
                    }
                />
                <Route
                    path="/login"
                    element={
                        accessToken ? <Navigate to="/home" replace /> : <AuthPage />
                    }
                />
                <Route
                    path="/register"
                    element={
                        accessToken ? <Navigate to="/home" replace /> : <AuthPage />
                    }
                />
                <Route
                    path="/verify-otp"
                    element={accessToken ? <Navigate to="/home" replace /> : <VerifyOTP />}
                />
                <Route path="/forgotpass" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                    path="/home/*"
                    element={
                        accessToken ? <UserHomeLayout /> : <Navigate to="/" replace />
                    }
                >
                    <Route index element={<Navigate to="chat" replace />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="chat/:roomId" element={<ChatPage />} />
                    <Route path="explore" element={<ExploreRoomsPage />} />
                    <Route path="create-room" element={<CreateRoom />} />
                    <Route path="join-requests" element={<JoinRequestsPage />} />
                </Route>
                <Route
                    path="*"
                    element={<Navigate to={accessToken ? "/home" : "/"} replace />}
                />
            </Routes>
        </BrowserRouter>
    );
}
