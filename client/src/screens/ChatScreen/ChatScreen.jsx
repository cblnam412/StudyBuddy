import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Info, Users, Crown, Check, X,
  ChevronDown, ChevronRight, Home, Plus
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
  const [members, setMembers] = useState([]);

  const [joinRequests, setJoinRequests] = useState([]);
  const [isLeader, setIsLeader] = useState(false);

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
                 headers: { 'Authorization': `Bearer ${accessToken}` }
             });
             if(response.ok) {
                 const data = await response.json();
                 setRooms(data.rooms || []);
             }
         } catch (err) { console.error(err); }
         finally { setIsLoadingRooms(false); }
     };
     fetchRooms();
  }, [accessToken]);

  useEffect(() => {
     if (roomId) {
         setActiveRoom(roomId);
         if (rooms.length > 0) {
             const current = rooms.find(r => r._id === roomId);
             if(current) {
                 setActiveRoomInfo(current);
                 const amILeader = current.room_role === 'leader';
                 setIsLeader(amILeader);
                 if (amILeader) fetchJoinRequests(roomId); else setJoinRequests([]);

                 fetchRoomMembers(roomId);
                 fetchMessages(roomId);
             }
         }
     }
  }, [roomId, rooms]);

  const fetchRoomMembers = async (rId) => {
      try {
          const res = await fetch(`${API_BASE_URL}/room/${rId}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
          const data = await res.json();
          if (res.ok && data.data) setMembers(data.data.members || []);
      } catch (err) { console.error(err); }
  };

  const fetchJoinRequests = async (rId) => {
      try {
          const res = await fetch(`${API_BASE_URL}/room/join-requests?room_id=${rId}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
          const data = await res.json();
          if (res.ok) setJoinRequests(data.requests || []);
      } catch (err) { console.error(err); }
  };

  const fetchMessages = async (rId) => {
      try {
          const res = await fetch(`${API_BASE_URL}/message/${rId}?limit=50`, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          const data = await res.json();
          if (res.ok) {
              const loadedMsgs = (data.messages || []).map(msg => ({
                  _id: msg._id,
                  content: msg.content,
                  user_id: msg.user_id?._id || msg.user_id,
                  user_name: msg.user_id?.full_name || "Unknown",
                  created_at: msg.created_at
              }));
              setMessages(loadedMsgs);
              scrollToBottom();
          }
      } catch (err) { console.error("Lỗi tải tin nhắn:", err); }
  };

  const handleApproveRequest = async (reqId) => {
      if(!window.confirm("Duyệt thành viên này?")) return;
      try {
          const res = await fetch(`${API_BASE_URL}/room/${reqId}/approve`, { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}` } });
          if(res.ok) {
              setJoinRequests(prev => prev.filter(req => req._id !== reqId));
              fetchRoomMembers(activeRoom);
              alert("Đã duyệt!");
          }
      } catch (err) { console.error(err); }
  };

  const handleRejectRequest = async (reqId) => {
      const reason = prompt("Lý do từ chối:");
      if(reason === null) return;
      try {
          const res = await fetch(`${API_BASE_URL}/room/${reqId}/reject`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason })
          });
          if(res.ok) {
              setJoinRequests(prev => prev.filter(req => req._id !== reqId));
              alert("Đã từ chối.");
          }
      } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!accessToken) return;
    socketRef.current = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket']
    });

    socketRef.current.on("connect_error", (err) => setConnectionError(err.message));
    socketRef.current.on("connect", () => setConnectionError(null));

    socketRef.current.on("room:new_message", (data) => {
        if (data.room_id === activeRoom) {
            setMessages(prev => [...prev, data]);
            scrollToBottom();
        }
    });

    socketRef.current.on("room:user_typing", ({ user_name, room_id }) => {
      if (room_id === activeRoom) setIsTypingUser(user_name);
    });
    socketRef.current.on("room:user_stop_typing", ({ room_id }) => {
      if (room_id === activeRoom) setIsTypingUser(null);
    });

    return () => socketRef.current?.disconnect();
  }, [accessToken, activeRoom]);

  useEffect(() => {
    if (socketRef.current && activeRoom) {
      socketRef.current.emit("room:join", activeRoom);
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

  const getRoomName = (r) => r?.room_name || r?.name || "Phòng chưa đặt tên";

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
          .msg-row { display: flex; max-width: 70%; margin-bottom: 4px; }
          .msg-row.me { align-self: flex-end; flex-direction: row-reverse; }
          .msg-row.other { align-self: flex-start; }
          .msg-bubble { padding: 10px 16px; border-radius: 18px; font-size: 15px; line-height: 1.4; box-shadow: 0 1px 2px rgba(0,0,0,0.05); position: relative; min-width: 60px; }
          .msg-row.me .msg-bubble { background: #2563eb; color: white; border-bottom-right-radius: 2px; }
          .msg-row.other .msg-bubble { background: #ffffff; color: #1f2937; border-bottom-left-radius: 2px; border: 1px solid #f3f4f6; }
          .msg-avatar { width: 32px; height: 32px; border-radius: 50%; background: #cbd5e1; margin: 0 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: #fff; }
          .msg-sender-name { font-size: 11px; color: #6b7280; margin-bottom: 4px; display: block; }

          .chat-footer { padding: 16px; border-top: 1px solid #e5e7eb; display: flex; align-items: flex-end; gap: 10px; background: #fff; flex-shrink: 0; }
          .input-wrapper { flex: 1; background: #f3f4f6; border-radius: 24px; padding: 8px 16px; display: flex; align-items: center; }
          .input-wrapper input { background: transparent; border: none; width: 100%; outline: none; font-size: 15px; padding: 4px 0;}

          .sidebar-right { width: 300px; border-left: 1px solid #e5e7eb; display: flex; flex-direction: column; overflow-y: auto; background: #fff; flex-shrink: 0; transition: width 0.3s ease; }

          .req-item { padding: 10px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
          .req-header { display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 4px; }
          .req-msg { color: #6b7280; font-style: italic; margin-bottom: 8px; font-size: 12px; }
          .req-actions { display: flex; gap: 6px; }
          .btn-approve { background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; }
          .btn-reject { background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; }

          .member-item { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f9fafb; font-size: 13px; }
          .member-avatar { width: 32px; height: 32px; background: #e5e7eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold; color: #4b5563; font-size: 12px; }
          .member-info { flex: 1; overflow: hidden; }
          .member-name { font-weight: 500; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .member-role { font-size: 11px; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 2px; }
          .role-leader { background: #fef3c7; color: #d97706; }
          .role-member { background: #f3f4f6; color: #6b7280; }

          @media (max-width: 1024px) { .sidebar-right { display: none; } }
        `}</style>

      <div className="sidebar-left">
         <div className="sidebar-header">
            <button className="btn-back-home" onClick={() => navigate('/user')}><Home size={20}/></button>
            <h2 style={{fontSize: 24, fontWeight: 'bold', color: '#2563eb', margin: 0}}>Chat</h2>
            <button style={{marginLeft:'auto', border:'none', background:'none', cursor:'pointer'}} onClick={() => navigate('/user/create-room')}><Plus size={24} color="#2563eb"/></button>
         </div>
         <div className="search-box"><input className="search-input" placeholder="Tìm kiếm đoạn chat..." /></div>
         <div className="room-list">
             {rooms.map((room) => (
                 <div key={room._id} className={`room-item ${activeRoom === room._id ? 'active' : ''}`} onClick={() => navigate(`/user/chat/${room._id}`)}>
                     <div className="room-avatar" style={{background: getRandomColor(getRoomName(room))}}>
                        {getRoomName(room).charAt(0).toUpperCase()}
                     </div>
                     <div style={{flex: 1, overflow: 'hidden'}}>
                         <h4 style={{margin: '0 0 4px', fontSize: 15, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{getRoomName(room)}</h4>
                         <p style={{margin: 0, fontSize: 13, color: '#6b7280'}}>Bấm để chat ngay</p>
                     </div>
                 </div>
             ))}
         </div>
      </div>

      <div className="chat-main">
          {!activeRoom ? (
             <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', color:'#9ca3af'}}>
                 <Users size={64} style={{marginBottom: 16, opacity: 0.5}}/>
                 <p>Chọn một phòng để bắt đầu trò chuyện</p>
             </div>
          ) : (
            <>
              <div className="chat-header">
                  <div>
                      <h3 style={{margin:0, fontSize:16}}>{getRoomName(activeRoomInfo) || "Đang tải..."}</h3>
                      <div style={{fontSize:12, color:'#16a34a', display:'flex', alignItems:'center', marginTop:2}}><span style={{width:6, height:6, background:'#16a34a', borderRadius:'50%', marginRight:4}}></span> Online</div>
                  </div>
                  <div style={{display:'flex', gap:8}}><Info size={24} color="#2563eb" style={{cursor:'pointer'}} onClick={() => setShowRightSidebar(!showRightSidebar)}/></div>
              </div>
              <div className="message-area">
                  {messages.map((msg, i) => {
                      const isMe = msg.user_id === userInfo?._id || msg.user_id?._id === userInfo?._id;
                      return (
                          <div key={i} className={`msg-row ${isMe ? 'me' : 'other'}`}>
                              {!isMe && (
                                <div className="msg-avatar" style={{background: getRandomColor(msg.user_name)}}>
                                    {msg.user_name?.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="msg-bubble">
                                  {!isMe && <span className="msg-sender-name">{msg.user_name}</span>}
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
                      <input placeholder="Nhập tin nhắn..." value={inputText} onChange={handleTyping} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
                      <button style={{border:'none', background:'none', cursor:'pointer', color:'#2563eb'}} onClick={handleSendMessage}><Send size={20}/></button>
                  </div>
              </div>
            </>
          )}
      </div>

      {showRightSidebar && activeRoom && (
          <div className="sidebar-right">
              <div style={{padding: 24, display:'flex', flexDirection:'column', alignItems:'center', borderBottom:'1px solid #f3f4f6'}}>
                  <div style={{width:80, height:80, background: getRandomColor(getRoomName(activeRoomInfo)), borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:32, marginBottom:12}}>
                    {getRoomName(activeRoomInfo).charAt(0).toUpperCase()}
                  </div>
                  <h3 style={{margin:'8px 0'}}>{getRoomName(activeRoomInfo)}</h3>
                  <span style={{fontSize: 12, color: '#999'}}>ID: {activeRoom}</span>
              </div>

              <div className="accordion-list">
                  {isLeader && (
                      <Accordion title={`Yêu cầu tham gia (${joinRequests.length})`}>
                          {joinRequests.length === 0 ? <div style={{padding:10,color:'#999',fontSize:13,textAlign:'center'}}>Không có yêu cầu</div> :
                              joinRequests.map(req => (
                                  <div key={req._id} className="req-item">
                                      <div className="req-header"><span>{req.user_id?.full_name}</span></div>
                                      <div className="req-msg">"{req.message}"</div>
                                      <div className="req-actions">
                                          <button className="btn-approve" onClick={() => handleApproveRequest(req._id)}><Check size={12}/> Duyệt</button>
                                          <button className="btn-reject" onClick={() => handleRejectRequest(req._id)}><X size={12}/> Từ chối</button>
                                      </div>
                                  </div>
                              ))
                          }
                      </Accordion>
                  )}
                  <Accordion title={`Thành viên (${members.length})`}>
                      {members.map(m => (
                          <div key={m._id} className="member-item">
                              <div className="member-avatar" style={{background: getRandomColor(m.full_name)}}>{m.full_name?.charAt(0)}</div>
                              <div className="member-info">
                                  <div className="member-name">{m.full_name} {m.room_role === 'leader' && <Crown size={12} color="#d97706" style={{marginLeft: 4, display:'inline'}} fill="#d97706"/>}</div>
                                  <span className={`member-role ${m.room_role === 'leader' ? 'role-leader' : 'role-member'}`}>{m.room_role === 'leader' ? 'Trưởng nhóm' : 'Thành viên'}</span>
                              </div>
                          </div>
                      ))}
                  </Accordion>
                  <Accordion title="Tùy chỉnh"><div className="list-row">Đổi chủ đề</div></Accordion>
                  <Accordion title="Hỗ trợ"><div className="list-row" style={{color:'#dc2626'}}>Rời nhóm</div></Accordion>
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