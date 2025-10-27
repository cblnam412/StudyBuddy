import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const styles = {
    container: {
        padding: 40,
        maxWidth: 800,
        margin: '0 auto',
        backgroundColor: '#ffffff',
        minHeight: '100vh',
    },
    title: {
        fontSize: 28,
        color: '#0f1724',
        marginBottom: 30,
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: 10,
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    label: {
        marginBottom: 8,
        fontWeight: 'bold',
        color: '#334155',
        fontSize: 14,
    },
    input: {
        padding: '12px',
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        fontSize: 16,
    },
    textarea: {
        padding: '12px',
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        fontSize: 16,
        minHeight: 120,
        resize: 'vertical',
    },
    radioGroup: {
        display: 'flex',
        gap: 20,
    },
    radioOption: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    submitButton: {
        background: '#2563eb',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '12px 25px',
        fontSize: 18,
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: 10,
        transition: 'background 0.2s ease-in-out',
    },
    backButton: {
        background: '#94a3b8',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '12px 25px',
        fontSize: 18,
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: 10,
        transition: 'background 0.2s ease-in-out',
        marginRight: 10,
    },
    buttonContainer: {
        display: 'flex',
        justifyContent: 'flex-start',
        marginTop: 30,
    }
};

export default function CreateRoomPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        roomName: '',
        description: '',
        tags: '',
        status: 'public' // Mặc định là Public
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        // 1. Kiểm tra ràng buộc Tên phòng (Bắt buộc và Tối đa 255 ký tự) [cite: 756, 788]
        if (!formData.roomName || formData.roomName.length > 255) {
            setError('Tên phòng không được để trống và không vượt quá 255 ký tự.');
            return;
        }

        // 2. Chuyển đổi Tags thành mảng (Logic giả định)
        const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

        // 3. Giả định gửi yêu cầu tạo phòng (Mock logic)
        const submissionData = {
            ...formData,
            tagsArray, // Dữ liệu Tags đã xử lý
            requesterId: 'currentUserId123'
        };

        console.log("Dữ liệu yêu cầu tạo phòng:", submissionData);
        alert(`Yêu cầu tạo phòng "${formData.roomName}" (${formData.status}) đã được gửi đi. Moderator sẽ xem xét và phản hồi. (SRS FR3)`);

        // Sau khi gửi, chuyển hướng về trang khám phá phòng
        navigate('/home/explore');
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Gửi Yêu cầu Tạo Phòng Học Nhóm Mới</h1>

            <p style={{ color: '#64748b', marginBottom: 20 }}>
                Vui lòng điền thông tin chi tiết. Yêu cầu của bạn sẽ được Moderator kiểm duyệt trước khi phòng được tạo (SRS 3.4.1).
            </p>

            {error && <div style={{ color: 'red', marginBottom: 15 }}>{error}</div>}

            <form onSubmit={handleSubmit} style={styles.form}>

                {/* Tên phòng (room_name) - Bắt buộc */}
                <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="roomName">Tên Phòng Học (Tối đa 255 ký tự)</label>
                    <input
                        id="roomName"
                        name="roomName"
                        type="text"
                        style={styles.input}
                        value={formData.roomName}
                        onChange={handleChange}
                        placeholder="Ví dụ: Luyện thi Hóa hữu cơ | Tối đa 255 ký tự"
                        maxLength={255}
                        required
                    />
                </div>

                {/* Mô tả phòng (description) */}
                <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="description">Mô tả Phòng</label>
                    <textarea
                        id="description"
                        name="description"
                        style={styles.textarea}
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Nêu rõ mục tiêu, nội dung và quy tắc của phòng học."
                    />
                </div>

                {/* Tags (Chủ đề) - Theo SRS 4.4.1 [cite: 808] */}
                <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="tags">Tags / Từ khóa Chủ đề (Phân cách bởi dấu phẩy)</label>
                    <input
                        id="tags"
                        name="tags"
                        type="text"
                        style={styles.input}
                        value={formData.tags}
                        onChange={handleChange}
                        placeholder="Ví dụ: Toán, Giải tích, Đại số tuyến tính"
                    />
                </div>

                {/* Trạng thái phòng mong muốn (status) - public/private  */}
                <div style={styles.formGroup}>
                    <label style={styles.label}>Trạng thái Phòng mong muốn</label>
                    <div style={styles.radioGroup}>
                        <div style={styles.radioOption}>
                            <input
                                type="radio"
                                id="statusPublic"
                                name="status"
                                value="public"
                                checked={formData.status === 'public'}
                                onChange={handleChange}
                            />
                            <label htmlFor="statusPublic">Public (Công khai) - Mọi người có thể tìm thấy và gửi yêu cầu tham gia.</label>
                        </div>
                        <div style={styles.radioOption}>
                            <input
                                type="radio"
                                id="statusPrivate"
                                name="status"
                                value="private"
                                checked={formData.status === 'private'}
                                onChange={handleChange}
                            />
                            <label htmlFor="statusPrivate">Private (Riêng tư) - Chỉ người có link mới gửi yêu cầu tham gia.</label>
                        </div>
                    </div>
                </div>

                {/* Nút gửi yêu cầu */}
                <div style={styles.buttonContainer}>
                    <button type="button" style={styles.backButton} onClick={() => navigate(-1)}>
                        Quay lại
                    </button>
                    <button type="submit" style={styles.submitButton}>
                        Gửi Yêu cầu Tạo Phòng
                    </button>
                </div>
            </form>
        </div>
    );
}