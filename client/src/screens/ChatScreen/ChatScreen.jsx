import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Paperclip, Phone, Video, Info,
  X, Image as ImageIcon, Users, Search,
  Settings, ShieldAlert, ChevronDown, ChevronRight, Home, Plus
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
const API_BASE_URL = "http://localhost:3000";
const SOCKET_URL = "http://localhost:3000";

export default function ChatScreen() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { accessToken, userInfo } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  const [activeRoom, setActiveRoom] = useState(roomId || null);
  const [activeRoomInfo, setActiveRoomInfo] = useState(null);

  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTypingUser, setIsTypingUser] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  const socketRef = useRef();
  const messagesEndRef = useRef(null);

  useEffect(() => {
     if(!accessToken) return;

     const fetchRooms = async () => {
         try {
             const response = await fetch(`${API_BASE_URL}/room/my`, {
                 headers: {
                     'Authorization': `Bearer ${accessToken}`,
                     'Content-Type': 'application/json'
                 }
             });

             if(response.ok) {
                 const data = await response.json();
                 setRooms(data.rooms || []);
             } else {
                 console.error("Không thể lấy danh sách phòng. Status:", response.status);
             }
         } catch (err) {
             console.error("Lỗi fetch rooms:", err);
         } finally {
             setIsLoadingRooms(false);
         }
     };

     fetchRooms();
  }, [accessToken]);

  useEffect(() => {
     if (roomId) {
         setActiveRoom(roomId);
         if (rooms.length > 0) {
             const current = rooms.find(r => r._id === roomId);
             if(current) setActiveRoomInfo(current);
         }
     }
  }, [roomId, rooms]);

  useEffect(() => {
    if (!accessToken) return;
    socketRef.current = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket']
    });

    socketRef.current.on("connect_error", (err) => {
        console.error("Socket connect error:", err.message);
        setConnectionError(err.message);
    });

    socketRef.current.on("connect", () => {
        setConnectionError(null);
    });

    socketRef.current.on("room:new_message", (data) => {
      if (data.room_id === activeRoom) {
         setMessages((prev) => [...prev, data]);
         scrollToBottom();
      }
    });

    socketRef.current.on("room:user_typing", ({ user_name, room_id }) => {
      if (room_id === activeRoom) setIsTypingUser(user_name);
    });

    socketRef.current.on("room:user_stop_typing", ({ room_id }) => {
      if (room_id === activeRoom) setIsTypingUser(null);
    });

    socketRef.current.on("room:error", (data) => {
        alert(data.message);
    });

    return () => socketRef.current?.disconnect();
  }, [accessToken, activeRoom]);

  useEffect(() => {
    if (socketRef.current && activeRoom) {
      socketRef.current.emit("room:join", activeRoom);
      setMessages([]);
    }
  }, [activeRoom]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeRoom) return;
    if(socketRef.current) {
        socketRef.current.emit("room:message", {
            roomId: activeRoom,
            content: inputText,
            reply_to: null
        });
        socketRef.current.emit("room:stop_typing", activeRoom);
    }
    setInputText('');
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    if(socketRef.current && activeRoom) {
        e.target.value.length > 0 ? socketRef.current.emit("room:typing", activeRoom) : socketRef.current.emit("room:stop_typing", activeRoom);
    }
  };

  return (
    <div className="chat-app-wrapper">
        <style>{`
          * { box-sizing: border-box; }
          .chat-app-wrapper { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; background-color: #ffffff; width: 100vw; height: 100vh; position: fixed; top: 0; left: 0; z-index: 9999; display: flex; overflow: hidden; }
          .chat-app-wrapper ::-webkit-scrollbar { width: 5px; }
          .chat-app-wrapper ::-webkit-scrollbar-track { background: transparent; }
          .chat-app-wrapper ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

          .sidebar-left { width: 320px; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; background: #fff; flex-shrink: 0; }
          .sidebar-header { padding: 16px; display: flex; align-items: center; gap: 12px; }
          .btn-back-home { width: 36px; height: 36px; border-radius: 50%; background: #f3f4f6; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #4b5563; }
          .search-box { padding: 0 16px 12px; }
          .search-input { width: 100%; background: #f3f4f6; border: none; padding: 10px 12px; border-radius: 8px; outline: none; font-size: 14px; }

          .room-list { flex: 1; overflow-y: auto; padding: 0 8px; }
          .room-item { display: flex; align-items: center; padding: 12px; margin-bottom: 2px; border-radius: 8px; cursor: pointer; transition: 0.2s; }
          .room-item:hover { background-color: #f3f4f6; }
          .room-item.active { background-color: #eff6ff; }
          .room-avatar { width: 48px; height: 48px; border-radius: 50%; margin-right: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; flex-shrink: 0; }

          .chat-main { flex: 1; display: flex; flex-direction: column; min-width: 0; background-color: #fff; }
          .chat-header { height: 64px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; flex-shrink: 0; }
          .message-area { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; background-image: radial-gradient(#f1f5f9 1px, transparent 1px); background-size: 20px 20px; }
          .msg-row { display: flex; max-width: 70%; }
          .msg-row.me { align-self: flex-end; flex-direction: row-reverse; }
          .msg-row.other { align-self: flex-start; }
          .msg-bubble { padding: 10px 16px; border-radius: 18px; font-size: 15px; line-height: 1.4; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          .msg-row.me .msg-bubble { background: #2563eb; color: white; border-bottom-right-radius: 2px; }
          .msg-row.other .msg-bubble { background: #ffffff; color: #1f2937; border-bottom-left-radius: 2px; border: 1px solid #f3f4f6; }
          .chat-footer { padding: 16px; border-top: 1px solid #e5e7eb; display: flex; align-items: flex-end; gap: 10px; background: #fff; flex-shrink: 0; }
          .input-wrapper { flex: 1; background: #f3f4f6; border-radius: 24px; padding: 8px 16px; display: flex; align-items: center; }
          .input-wrapper input { background: transparent; border: none; width: 100%; outline: none; font-size: 15px; padding: 4px 0;}

          .sidebar-right { width: 300px; border-left: 1px solid #e5e7eb; display: flex; flex-direction: column; overflow-y: auto; background: #fff; flex-shrink: 0; transition: width 0.3s ease; }
          @media (max-width: 1024px) { .sidebar-right { display: none; } }
        `}</style>

      <div className="sidebar-left">
         <div className="sidebar-header">
            <button className="btn-back-home" onClick={() => navigate('/user')}><Home size={20}/></button>
            <h2 style={{fontSize: 24, fontWeight: 'bold', color: '#2563eb', margin: 0}}>Chat</h2>
            <button style={{marginLeft:'auto', border:'none', background:'none', cursor:'pointer'}} onClick={() => navigate('/user/create-room')}>
                <Plus size={24} color="#2563eb"/>
            </button>
         </div>
         <div className="search-box">
             <input className="search-input" placeholder="Tìm kiếm đoạn chat..." />
         </div>

         <div className="room-list">
             {isLoadingRooms ? (
                 <div style={{padding: 20, textAlign: 'center', color: '#999'}}>Đang tải...</div>
             ) : rooms.length === 0 ? (
                 <div style={{padding: 20, textAlign: 'center', color: '#999'}}>Bạn chưa tham gia phòng nào.</div>
             ) : (
                 rooms.map((room) => (
                     <div
                        key={room._id}
                        className={`room-item ${activeRoom === room._id ? 'active' : ''}`}
                        onClick={() => navigate(`/user/chat/${room._id}`)}
                     >
                         <div className="room-avatar" style={{background: getRandomColor(room.name)}}>
                            {(room.name || room.room_name || "#").charAt(0).toUpperCase()}
                         </div>
                         <div style={{flex: 1, overflow: 'hidden'}}>
                             <h4 style={{margin: '0 0 4px', fontSize: 15, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                {room.name || room.room_name || "Phòng không tên"}
                             </h4>
                             <p style={{margin: 0, fontSize: 13, color: '#6b7280'}}>
                                Bấm để chat ngay
                             </p>
                         </div>
                     </div>
                 ))
             )}
         </div>
      </div>

      <div className="chat-main">
          {connectionError && (
              <div style={{padding: 10, background: '#fee2e2', color: '#dc2626', textAlign: 'center', fontSize: 13}}>
                  Mất kết nối Socket: {connectionError}
              </div>
          )}

          {!activeRoom ? (
             <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', color:'#9ca3af'}}>
                 <Users size={64} style={{marginBottom: 16, opacity: 0.5}}/>
                 <p>Chọn một phòng để bắt đầu trò chuyện</p>
             </div>
          ) : (
            <>
              <div className="chat-header">
                  <div>
                      <h3 style={{margin:0, fontSize:16}}>
                        {activeRoomInfo?.name || activeRoomInfo?.room_name || "Đang tải..."}
                      </h3>
                      <div style={{fontSize:12, color:'#16a34a', display:'flex', alignItems:'center', marginTop:2}}>
                        <span style={{width:6, height:6, background:'#16a34a', borderRadius:'50%', marginRight:4}}></span> Online
                      </div>
                  </div>
                  <div style={{display:'flex', gap:8}}>
                      <Info size={24} color="#2563eb" style={{cursor:'pointer'}} onClick={() => setShowRightSidebar(!showRightSidebar)}/>
                  </div>
              </div>
              <div className="message-area">
                  {messages.map((msg, i) => {
                      const isMe = msg.user_id === userInfo?._id || msg.user_id?._id === userInfo?._id;
                      return (
                          <div key={i} className={`msg-row ${isMe ? 'me' : 'other'}`}>
                              {!isMe && <div className="msg-avatar"></div>}
                              <div className="msg-bubble">
                                  {!isMe && <div style={{fontSize:11, color:'#6b7280', marginBottom:2}}>{msg.user_name}</div>}
                                  {msg.content}
                              </div>
                          </div>
                      )
                  })}
                  {isTypingUser && <div style={{fontSize:12, color:'#9ca3af', marginLeft: 40}}>{isTypingUser} đang nhập...</div>}
                  <div ref={messagesEndRef}></div>
              </div>

              <div className="chat-footer">
                  <div className="input-wrapper">
                      <input
                          placeholder="Nhập tin nhắn..."
                          value={inputText}
                          onChange={handleTyping}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <button style={{border:'none', background:'none', cursor:'pointer', color:'#2563eb'}} onClick={handleSendMessage}><Send size={20}/></button>
                  </div>
              </div>
            </>
          )}
      </div>

      {showRightSidebar && activeRoom && (
          <div className="sidebar-right">
              <div style={{padding: 24, display:'flex', flexDirection:'column', alignItems:'center', borderBottom:'1px solid #f3f4f6'}}>
                  <div style={{width:80, height:80, background: getRandomColor(activeRoomInfo?.name), borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:32, marginBottom:12}}>
                      {(activeRoomInfo?.name || activeRoomInfo?.room_name || "#").charAt(0).toUpperCase()}
                  </div>
                  <h3 style={{margin:'8px 0'}}>{activeRoomInfo?.name || activeRoomInfo?.room_name}</h3>
                  <span style={{fontSize: 12, color: '#999'}}>ID: {activeRoom}</span>
              </div>

              <div className="accordion-list">
                  <Accordion title="Tùy chỉnh">
                      <div className="list-row">Đổi chủ đề</div>
                  </Accordion>
                  <Accordion title="Thành viên">
                      <div className="list-row">Xem thành viên (Dev later)</div>
                  </Accordion>
                  <Accordion title="Hỗ trợ">
                      <div className="list-row" style={{color:'#dc2626'}}>Rời nhóm</div>
                  </Accordion>
              </div>
          </div>
      )}
    </div>
  );
}

function Accordion({ title, children }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="accordion-item" style={{padding: '8px 16px'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', fontWeight:600, fontSize:14, padding:'8px 6px'}} onClick={() => setOpen(!open)}>
                {title}
                {open ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
            </div>
            {open && <div style={{fontSize:14, color:'#4b5563', padding:'4px 8px'}}>{children}</div>}
        </div>
    )
}

function getRandomColor(name) {
    if(!name) return '#2563eb';
    const colors = ['#2563eb', '#db2777', '#ea580c', '#16a34a', '#7c3aed', '#0891b2'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}