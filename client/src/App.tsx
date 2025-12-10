import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from './context/AuthContext';
import { UserHomeLayout } from './layouts/UserHomeLayout/UserHomeLayout.jsx';
import { AdminHomeLayout } from './layouts/AdminHomeLayout/AdminHomeLayout.jsx';
import { LoadingSpinner } from "./components/LoadingSpinner/LoadingSpinner";
import { UserHomeScreen } from "./screens/UserHomeScreen/UserHomeScreen.jsx"; 

import {
    VerifyOTP,
    ForgotPassword,
    ResetPassword,
    ChatPage,
    ExploreRoomsPage,
    CreateRoom,
    JoinRequestsPage,
    UserInfoPage,
    ManageReportPage,
    StatisticsPage
} from "./screens";
import AuthPage from "./screens/AuthPage";

export default function App() {
    const { accessToken, isFetchingAuth, userInfo, isFetchingUserInfo} = useAuth();

    if (isFetchingAuth || isFetchingUserInfo || (accessToken && !userInfo)) {
        return <LoadingSpinner label="Đang lấy thông tin đăng nhập" />;
    }

    //console.log(`Access token currently is ${accessToken}`);
    const homeRoute = (!accessToken) ? "/" : (userInfo.system_role === "admin" ? "/admin" : "/user");
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={
                        accessToken ? <Navigate to={homeRoute} replace /> : <AuthPage />
                    }
                />
                <Route
                    path="/login"
                    element={
                        accessToken ? <Navigate to={homeRoute} replace /> : <AuthPage />
                    }
                />
                <Route
                    path="/register"
                    element={
                        accessToken ? <Navigate to={homeRoute} replace /> : <AuthPage />
                    }
                />
                <Route
                    path="/verify-otp"
                    element={accessToken ? <Navigate to={homeRoute} replace /> : <VerifyOTP />}
                />
                <Route path="/forgotpass" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* User-role */}
                <Route
                    path="/user/*"
                    element={
                        accessToken ? <UserHomeLayout />  : <Navigate to="/" replace />
                    }
                >
                    <Route index element={<UserHomeScreen />} />
                    <Route path="info" element={<UserInfoPage />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="chat/:roomId" element={<ChatPage />} />
                    <Route path="explore" element={<ExploreRoomsPage />} />
                    <Route path="create-room" element={<CreateRoom />} />
                    <Route path="join-requests" element={<JoinRequestsPage />} />
                </Route>

                {/* Admin-role */}
                <Route  
                    path="/admin/*"
                    element = {accessToken && userInfo?.system_role === "admin" ? ( <AdminHomeLayout /> ) : (<Navigate to = "/" replace/>) }
                >
                    
                    <Route path="report" element={<ManageReportPage />} />
                    <Route path="stats" element={<StatisticsPage />} />
                </Route>

                <Route
                    path="*"
                    element={<Navigate to={homeRoute} replace />}
                />
            </Routes>

                
        </BrowserRouter>
    );
}
