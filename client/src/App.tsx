import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from './context/AuthContext';
import { UserHomeLayout } from './layouts/UserHomeLayout/UserHomeLayout.jsx';
import { LoadingSpinner } from "./components/LoadingSpinner/LoadingSpinner";
import NotificationListPage from "./screens/notifications/notificationListPage";
import AuthPage from "./screens/AuthPage";
import {
    VerifyOTP,
    ForgotPassword,
    ResetPassword,
    ChatPage,
    ExploreRoomsPage,
    CreateRoom,
    JoinRequestsPage,
} from "./screens";


export default function App() {
    const { accessToken, isFetchingAuth } = useAuth();

    if (isFetchingAuth) {
        return <LoadingSpinner label="Đang lấy thông tin đăng nhập" />;
    }

    return (
        <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/notifications" />} />
                <Route path="/notifications" element={<NotificationListPage />} />
              </Routes>
            </BrowserRouter>
    );
}
