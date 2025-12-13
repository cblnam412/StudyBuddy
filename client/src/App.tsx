import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from './context/AuthContext';
import { UserHomeLayout } from './layouts/UserHomeLayout/UserHomeLayout.jsx';
import { AdminHomeLayout } from './layouts/AdminHomeLayout/AdminHomeLayout.jsx';
import { LoadingSpinner } from "./components/LoadingSpinner/LoadingSpinner";
import ChatScreen from "./screens/ChatScreen/ChatScreen.jsx";
import TagManagementScreen from "./screens/TagManagementScreen/tagManagementScreen";
import RoomRequestScreen from "./screens/RequestScreen/roomRequestScreen";
import {
    VerifyOTP,
    ForgotPassword,
    ResetPassword,
    ExploreRoomsPage,
    CreateRoom,
    JoinRequestsPage,
    UserInfoPage,
    ManageReportPage,
    StatisticsPage,
    AdminHomeScreen,
    UserHomeScreen,
    EventScreen
} from "./screens";
import AuthPage from "./screens/AuthPage";

export default function App() {
    const { accessToken, isFetchingAuth, userInfo, isFetchingUserInfo} = useAuth();

    if (isFetchingAuth || isFetchingUserInfo || (accessToken && !userInfo)) {
        return <LoadingSpinner label="Đang lấy thông tin đăng nhập" />;
    }

    const homeRoute = (!accessToken) ? "/" : (userInfo?.system_role === "admin" ? "/admin" : "/user");

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/user/chat" element={accessToken ? <ChatScreen /> : <Navigate to="/" replace />} />
                <Route path="/user/chat/:roomId" element={accessToken ? <ChatScreen /> : <Navigate to="/" replace />} />

                <Route path="/" element={accessToken ? <Navigate to={homeRoute} replace /> : <AuthPage />} />
                <Route path="/login" element={accessToken ? <Navigate to={homeRoute} replace /> : <AuthPage />} />
                <Route path="/register" element={accessToken ? <Navigate to={homeRoute} replace /> : <AuthPage />} />
                <Route path="/verify-otp" element={accessToken ? <Navigate to={homeRoute} replace /> : <VerifyOTP />} />
                <Route path="/forgotpass" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route path="/user/*" element={accessToken ? <UserHomeLayout />  : <Navigate to="/" replace />}>
                    <Route index element={<UserHomeScreen />} />
                    <Route path="info" element={<UserInfoPage />} />
                    <Route path="explore" element={<ExploreRoomsPage />} />
                    <Route path="create-room" element={<CreateRoom />} />
                    <Route path="join-requests" element={<JoinRequestsPage />} />
                    <Route path="event" element={<EventScreen />} />
                </Route>

                <Route path="/admin/*" element={accessToken && userInfo?.system_role === "admin" ? (<AdminHomeLayout />) : (<Navigate to="/" replace/>)}>
                    <Route index element={<AdminHomeScreen />} />
                    <Route path="report" element={<ManageReportPage />} />
                    <Route path="stats" element={<StatisticsPage />} />
                    <Route path="tag" element={<TagManagementScreen />} />
                    <Route path="requests" element={<RoomRequestScreen />} />
                </Route>

                <Route path="*" element={<Navigate to={homeRoute} replace />} />
            </Routes>
        </BrowserRouter>
    );
}