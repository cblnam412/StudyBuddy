import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const styles = {
    container: {
        padding: 20,
        backgroundColor: '#f7f9fc',
        minHeight: '100vh',
        boxSizing: 'border-box',
        overflow: 'hidden',
    },
    headerContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        color: '#0f1724',
        margin: 0,
    },
    createRoomButton: {
        background: '#10b981',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '10px 20px',
        fontSize: 16,
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'background 0.2s ease-in-out',
        '&:hover': {
            background: '#059669',
        },
    },
    statusText: {
        textAlign: 'center',
        fontSize: 18,
        color: '#6b7280',
        marginTop: 50,
    },
    roomList: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 20,
    },
    roomCard: {
        background: '#ffffff',
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(20,30,50,0.05)',
        padding: 20,
        cursor: 'pointer',
    },
    roomName: {
        fontSize: 18,
        color: '#2563eb',
        marginBottom: 8,
    },
    roomDescription: {
        fontSize: 14,
        color: '#546176',
        marginBottom: 12,
    },
    joinButton: {
        background: '#2563eb',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '10px 15px',
        fontSize: 14,
        cursor: 'pointer',
    },
};

// Dữ liệu giả định (MOCK DATA)
const mockRooms = [
    { id: 'r1', name: 'Toán Cao Cấp A1', description: 'Ôn tập giải tích và đại số tuyến tính' },
    { id: 'r2', name: 'Lập Trình Web Cơ Bản', description: 'Học HTML, CSS, JavaScript và React' },
    { id: 'r3', name: 'Vật Lý Đại Cương', description: 'Thảo luận các bài tập điện từ' },
    { id: 'r4', name: 'Tiếng Anh Giao Tiếp', description: 'Luyện nói và nghe hàng ngày' },
    { id: 'r5', name: 'Kinh Tế Vĩ Mô', description: 'Phân tích chính sách tiền tệ và tài khóa' },
    { id: 'r6', name: 'Cấu Trúc Dữ Liệu', description: 'Thực hành với cây, đồ thị và thuật toán' },
];

export default function ExploreRoomsPage() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => {
            setRooms(mockRooms);
            setLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    const handleJoinRoom = (roomId) => {
        alert(`Đã tham gia phòng ${roomId}`);
        navigate(`/home/chat/${roomId}`);
    };

    // Cập nhật: Chuyển hướng đến màn hình tạo phòng mới
    const handleCreateRoom = () => {
        navigate('/home/create-room');
    };

    if (loading) {
        return <div style={styles.statusText}>Đang tải danh sách phòng...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.headerContainer}>
                <h1 style={styles.title}>Khám phá phòng mới ({rooms.length} phòng có sẵn)</h1>
                {/* Nút Tạo phòng mới */}
                <button
                    style={styles.createRoomButton}
                    onClick={handleCreateRoom}
                >
                    + Tạo phòng mới
                </button>
            </div>

            {rooms.length === 0 ? (
                <div style={styles.statusText}>Không tìm thấy phòng học nào.</div>
            ) : (
                <div style={styles.roomList}>
                    {rooms.map(room => (
                        <div key={room.id} style={styles.roomCard}>
                            <h2 style={styles.roomName}>{room.name}</h2>
                            <p style={styles.roomDescription}>{room.description || "Chủ đề học tập chung."}</p>
                            <button style={styles.joinButton} onClick={() => handleJoinRoom(room.id)}>
                                Tham gia
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}