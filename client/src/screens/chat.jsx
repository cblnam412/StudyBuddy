import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Paperclip, MoreHorizontal, Phone, Video, Info,
  X, FileText, Image as ImageIcon, Users, Search,
  Settings, ShieldAlert, ChevronDown, ChevronRight
} from 'lucide-react';
import { io } from 'socket.io-client';

const SOCKET_URL = "http://localhost:3000";
const CURRENT_USER_ID = "user_123";

export default function ChatScreen() {
  const [activeRoom, setActiveRoom] = useState('room_id_1');
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
      { _id: 1, user_id: 'other', user_name: 'Nguyễn Văn A', content: 'Chào mọi người!', type: 'text' },
      { _id: 2, user_id: 'user_123', user_name: 'Tôi', content: 'Chào A, dự án thế nào rồi?', type: 'text' }
  ]);
  const [isTypingUser, setIsTypingUser] = useState(null);

  const socketRef = useRef();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      auth: { token: "YOUR_TEST_TOKEN" },
      transports: ['websocket']
    });

    socketRef.current.on("connect_error", (err) => {
        console.log("Lỗi kết nối socket (Do token giả):", err.message);
    });

    socketRef.current.on("room:new_message", (data) => {
      setMessages((prev) => [...prev, data]);
      scrollToBottom();
    });

    socketRef.current.on("room:user_typing", ({ user_name }) => {
      setIsTypingUser(user_name);
    });

    socketRef.current.on("room:user_stop_typing", () => {
      setIsTypingUser(null);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socketRef.current && activeRoom) {
      socketRef.current.emit("room:join", activeRoom);
    }
  }, [activeRoom]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const tempMsg = {
        _id: Date.now(),
        user_id: CURRENT_USER_ID,
        user_name: 'Tôi',
        content: inputText,
        type: 'text'
    };
    setMessages(prev => [...prev, tempMsg]);
    scrollToBottom();

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
    if(socketRef.current) {
        if (e.target.value.length > 0) {
            socketRef.current.emit("room:typing", activeRoom);
        } else {
            socketRef.current.emit("room:stop_typing", activeRoom);
        }
    }
  };

  return (
    <div className="chat-app-wrapper">

      <style>{`
        .chat-app-wrapper {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1f2937;
            background-color: #ffffff;
            height: 100vh;
            width: 100vw;
            overflow: hidden;
            display: flex;
        }

        * { box-sizing: border-box; }

        .chat-app-wrapper ::-webkit-scrollbar { width: 6px; }
        .chat-app-wrapper ::-webkit-scrollbar-track { background: transparent; }
        .chat-app-wrapper ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

        .sidebar-left {
            width: 300px;
            border-right: 1px solid #e5e7eb;
            display: flex;
            flex-direction: column;
            background: #fff;
        }
        .sidebar-header { padding: 16px; display: flex; justify-content: space-between; align-items: center; }
        .sidebar-header h2 { margin: 0; font-size: 24px; color: #2563eb; font-weight: bold; }

        .search-box { padding: 0 16px 12px; }
        .search-input {
            width: 100%; background: #f3f4f6; border: none; padding: 10px 16px;
            border-radius: 20px; outline: none; font-size: 14px;
        }

        .room-list { flex: 1; overflow-y: auto; padding: 0 8px; }
        .room-item {
            display: flex; align-items: center; padding: 10px; margin-bottom: 4px;
            border-radius: 8px; cursor: pointer; transition: 0.2s;
        }
        .room-item:hover { background-color: #f3f4f6; }
        .room-item.active { background-color: #eff6ff; }
        .room-avatar {
            width: 44px; height: 44px; border-radius: 50%; background: #93c5fd;
            margin-right: 12px; display: flex; align-items: center; justify-content: center;
            color: white; font-weight: bold;
        }
        .room-info h4 { margin: 0 0 4px; font-size: 15px; }
        .room-info p { margin: 0; font-size: 13px; color: #6b7280; }

        .chat-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

        .chat-header {
            height: 60px; border-bottom: 1px solid #e5e7eb; display: flex;
            align-items: center; justify-content: space-between; padding: 0 16px;
        }
        .chat-title h3 { margin: 0; font-size: 16px; }
        .chat-status { font-size: 12px; color: #16a34a; display: flex; align-items: center; }
        .status-dot { width: 8px; height: 8px; background: #16a34a; border-radius: 50%; margin-right: 4px; }

        .header-actions { display: flex; gap: 8px; }
        .icon-btn {
            padding: 8px; border-radius: 50%; cursor: pointer; color: #2563eb;
            border: none; background: transparent; display: flex; align-items: center;
        }
        .icon-btn:hover { background: #eff6ff; }
        .icon-btn.active { background: #dbeafe; }

        .message-area { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }

        .msg-row { display: flex; max-width: 70%; margin-bottom: 4px; }
        .msg-row.me { align-self: flex-end; flex-direction: row-reverse; }
        .msg-row.other { align-self: flex-start; }

        .msg-bubble {
            padding: 8px 14px; border-radius: 18px; font-size: 15px; line-height: 1.4; position: relative;
        }
        .msg-row.me .msg-bubble { background: #2563eb; color: white; border-bottom-right-radius: 4px; }
        .msg-row.other .msg-bubble { background: #f3f4f6; color: #1f2937; border-bottom-left-radius: 4px; }

        .msg-avatar { width: 30px; height: 30px; border-radius: 50%; background: #cbd5e1; margin: 0 8px; }

        .chat-footer { padding: 12px; border-top: 1px solid #e5e7eb; display: flex; align-items: flex-end; gap: 8px; }
        .input-wrapper {
            flex: 1; background: #f3f4f6; border-radius: 20px; padding: 8px 12px; display: flex; align-items: center;
        }
        .input-wrapper input { background: transparent; border: none; width: 100%; outline: none; font-size: 15px; }

        .sidebar-right { width: 300px; border-left: 1px solid #e5e7eb; display: flex; flex-direction: column; overflow-y: auto; }

        .profile-section { padding: 24px 16px; display: flex; flex-direction: column; align-items: center; border-bottom: 1px solid #f3f4f6; }
        .profile-avatar { width: 80px; height: 80px; background: #2563eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; margin-bottom: 12px; }

        .menu-grid { display: flex; justify-content: space-around; padding: 16px; border-bottom: 1px solid #f3f4f6; }
        .menu-item { display: flex; flex-direction: column; align-items: center; font-size: 12px; cursor: pointer; }
        .menu-icon-circle { width: 36px; height: 36px; background: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }

        .accordion-item { padding: 12px 16px; border-bottom: 1px solid transparent; }
        .accordion-header { display: flex; justify-content: space-between; cursor: pointer; font-weight: 600; font-size: 14px; margin-bottom: 8px; }
        .accordion-content { font-size: 14px; color: #4b5563; }
        .list-row { display: flex; align-items: center; padding: 6px 0; cursor: pointer; }
        .list-row:hover { color: #2563eb; }

      `}</style>

      <div className="sidebar-left">
         <div className="sidebar-header">
            <h2>Chat</h2>
            <button className="icon-btn"><Settings size={20}/></button>
         </div>
         <div className="search-box">
             <input className="search-input" placeholder="Tìm kiếm đoạn chat..." />
         </div>
         <div className="room-list">
             {['Dev Team', 'Marketing', 'Dự án A'].map((room, idx) => (
                 <div key={idx}
                      className={`room-item ${activeRoom === `room_id_${idx+1}` ? 'active' : ''}`}
                      onClick={() => setActiveRoom(`room_id_${idx+1}`)}
                 >
                     <div className="room-avatar">{room.charAt(0)}</div>
                     <div className="room-info">
                         <h4>{room}</h4>
                         <p>Bạn: File này ở đâu?... • 10p</p>
                     </div>
                 </div>
             ))}
         </div>
      </div>

      <div className="chat-main">
          <div className="chat-header">
              <div className="chat-title">
                  <h3>Dev Team</h3>
                  <div className="chat-status"><span className="status-dot"></span> Đang hoạt động</div>
              </div>
              <div className="header-actions">
                  <button className="icon-btn"><Phone size={20}/></button>
                  <button className="icon-btn"><Video size={20}/></button>
                  <button
                    className={`icon-btn ${showRightSidebar ? 'active' : ''}`}
                    onClick={() => setShowRightSidebar(!showRightSidebar)}
                  >
                      <Info size={20}/>
                  </button>
              </div>
          </div>

          <div className="message-area">
              {messages.map((msg, i) => {
                  const isMe = msg.user_id === CURRENT_USER_ID;
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
              <button className="icon-btn"><ImageIcon size={20}/></button>
              <button className="icon-btn"><Paperclip size={20}/></button>
              <div className="input-wrapper">
                  <input
                      placeholder="Nhập tin nhắn..."
                      value={inputText}
                      onChange={handleTyping}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button className="icon-btn" onClick={handleSendMessage}><Send size={20}/></button>
              </div>
          </div>
      </div>

      {showRightSidebar && (
          <div className="sidebar-right">
              <div className="profile-section">
                  <div className="profile-avatar">D</div>
                  <h3 style={{margin:'8px 0'}}>Dev Team</h3>
                  <span style={{fontSize:13, color:'#6b7280'}}>Nhóm công khai</span>
              </div>

              <div className="menu-grid">
                  <div className="menu-item">
                      <div className="menu-icon-circle"><Users size={18}/></div>
                      <span>Thành viên</span>
                  </div>
                  <div className="menu-item">
                      <div className="menu-icon-circle"><Search size={18}/></div>
                      <span>Tìm kiếm</span>
                  </div>
              </div>

              <div className="accordion-list">
                  <Accordion title="Tùy chỉnh đoạn chat">
                      <div className="list-row">🎨 Đổi chủ đề</div>
                      <div className="list-row">👍 Biểu tượng cảm xúc</div>
                  </Accordion>
                  <Accordion title="Thành viên nhóm">
                      <div className="list-row">
                          <div style={{width:24, height:24, background:'#ccc', borderRadius:'50%', marginRight:8}}></div>
                          Nguyễn Văn A (Leader)
                      </div>
                  </Accordion>
                  <Accordion title="File & Phương tiện">
                      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4}}>
                          {[1,2,3].map(i => <div key={i} style={{aspectRatio:1, background:'#e5e7eb', borderRadius:4}}></div>)}
                      </div>
                  </Accordion>
                  <Accordion title="Hỗ trợ">
                      <div className="list-row" style={{color:'#ea580c'}}><ShieldAlert size={16} style={{marginRight:8}}/> Báo cáo</div>
                      <div className="list-row" style={{color:'#dc2626'}}><X size={16} style={{marginRight:8}}/> Rời nhóm</div>
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
        <div className="accordion-item">
            <div className="accordion-header" onClick={() => setOpen(!open)}>
                {title}
                {open ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
            </div>
            {open && <div className="accordion-content">{children}</div>}
        </div>
    )
}