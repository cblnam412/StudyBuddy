import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const styles = {
    container: {
        padding: 20,
        backgroundColor: '#ffffff',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        fontSize: 24,
        color: '#0f1724',
        marginBottom: 20,
        borderBottom: '1px solid #e6e9ef',
        paddingBottom: 10,
    },
    messageList: {
        flexGrow: 1,
        overflowY: 'auto',
        marginBottom: 15,
        border: '1px solid #e6e9ef',
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#fdfefe',
    },
    message: {
        marginBottom: 10,
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#e0f2fe',
        alignSelf: 'flex-start',
    },
    myMessage: {
        marginBottom: 10,
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#d1e7dd',
        alignSelf: 'flex-end',
        textAlign: 'right',
    },
    inputArea: {
        display: 'flex',
        gap: 10,
    },
    input: {
        flexGrow: 1,
        height: 44,
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid #e6e9ef',
        fontSize: 14,
        outline: 'none',
    },
    sendButton: {
        background: '#2563eb',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '10px 20px',
        fontSize: 15,
        cursor: 'pointer',
    },
    // Style cho thông báo khi chưa có phòng
    noRoomContainer: {
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: 40,
        backgroundColor: '#eef2ff',
        borderRadius: 12,
        margin: '50px auto',
        maxWidth: 600,
    },
    noRoomText: {
        fontSize: 20,
        color: '#374151',
        marginBottom: 15,
        fontWeight: '600',
    },
    exploreButton: {
        background: '#22c55e',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '12px 25px',
        fontSize: 16,
        cursor: 'pointer',
        marginTop: 10,
        boxShadow: '0 4px 6px rgba(34, 197, 94, 0.3)',
    }
};

export default function ChatPage() {
    const { roomId } = useParams(); // Lấy roomId từ URL
    const navigate = useNavigate();
    const [message, setMessage] = React.useState('');
    const [messages, setMessages] = React.useState([
        { id: 1, text: 'Chào mừng bạn đến với phòng chat!', sender: 'System' },
        { id: 2, text: 'Bạn có câu hỏi gì không?', sender: 'Alice' },
    ]);

    const handleSendMessage = () => {
        if (message.trim()) {
            setMessages([...messages, { id: messages.length + 1, text: message, sender: 'You' }]);
            setMessage('');
        }
    };
    
    // Logic 1: Kiểm tra xem có roomId nào được chọn hay không
    if (!roomId) {
        return (
            <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
                <div style={styles.noRoomContainer}>
                    <p style={styles.noRoomText}>Hiện bạn chưa tham gia phòng học nào.</p>
                    <p style={{ color: '#6b7280', marginBottom: 20 }}>
                        Hãy khám phá các phòng mới để bắt đầu trò chuyện.
                    </p>
                    <button 
                        style={styles.exploreButton} 
                        onClick={() => navigate('/home/explore')}
                    >
                        Khám phá phòng mới ngay!
                    </button>
                </div>
            </div>
        );
    }

    // Logic 2: Hiển thị giao diện chat nếu đã có roomId
    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Phòng chat {roomId}</h1>
            <div style={styles.messageList}>
                {messages.map(msg => (
                    <div key={msg.id} style={msg.sender === 'You' ? styles.myMessage : styles.message}>
                        <strong>{msg.sender}:</strong> {msg.text}
                    </div>
                ))}
            </div>
            <div style={styles.inputArea}>
                <input
                    type="text"
                    style={styles.input}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                    placeholder={`Nhập tin nhắn trong phòng ${roomId}...`}
                />
                <button style={styles.sendButton} onClick={handleSendMessage}>
                    Gửi
                </button>
            </div>
        </div>
    );
}

