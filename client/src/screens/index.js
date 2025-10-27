import Login from "./login"
import UserHomeScreen from "./userHomeScreen"
import RegisterAccount from "./register.tsx"
import VerifyOTP from "./verifyOTP"
import ForgotPassword from "./forgotPassword"
import ResetPassword from "./resetPassword"
import ChatPage from "./chat.jsx"
import ExploreRoomsPage from "./exploreRooms.jsx"
import CreateRoomPage from "./createRoom.jsx";

export {
  Login,
  UserHomeScreen,
  RegisterAccount,
  VerifyOTP,
  ForgotPassword,
  ResetPassword,
  ChatPage,
  ExploreRoomsPage,
  CreateRoomPage as CreateRoom, // ✅ export lại đúng tên App.jsx đang dùng
};
