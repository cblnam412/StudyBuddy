import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner/LoadingSpinner";
import { toast } from "react-toastify";
import { Lock, ArrowLeft, Send } from "lucide-react";

const API_BASE_URL = "http://localhost:3000";

export default function InviteJoinScreen() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { accessToken, isFetchingAuth } = useAuth();
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (isFetchingAuth) return <LoadingSpinner label="Đang kiểm tra thông tin..." />;

    if (!accessToken) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.iconCircle}>
                        <Lock size={32} color="#2563eb" />
                    </div>
                    <h2 style={styles.title}>Cần đăng nhập</h2>
                    <p style={styles.subtitle}>
                        Bạn cần đăng nhập tài khoản để tham gia nhóm riêng tư này.
                    </p>
                    <button
                        onClick={() => navigate("/login")}
                        style={styles.primaryButton}
                    >
                        Đến trang đăng nhập
                    </button>
                </div>
            </div>
        );
    }

    const handleJoin = async () => {
        if (!message.trim()) {
            toast.warn("Hãy nhắn một lời chào để Admin biết bạn là ai nhé!");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/room/join`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    invite_token: token,
                    message: message
                })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Đã gửi yêu cầu thành công! Vui lòng chờ duyệt.");
                navigate("/user/");
            } else {
                if(data.message?.includes("đã là thành viên")) {
                     toast.info("Bạn đã ở trong nhóm này rồi!");
                     navigate("/user/chat");
                } else {
                    toast.error(data.message || "Không thể tham gia nhóm");
                }
            }
        } catch (err) {
            console.error(err);
            toast.error("Lỗi kết nối server");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                {/* Header Icon */}
                <div style={styles.headerSection}>
                    <div style={styles.iconCircle}>
                        <Lock size={28} color="#2563eb" />
                    </div>
                    <h2 style={styles.title}>Tham gia nhóm kín</h2>
                    <p style={styles.subtitle}>
                        Bạn nhận được lời mời tham gia một nhóm riêng tư.<br/>
                        Hãy gửi lời nhắn để Quản trị viên phê duyệt.
                    </p>
                </div>

                {/* Form Input */}
                <div style={styles.inputSection}>
                    <label style={styles.label}>Lời nhắn của bạn</label>
                    <textarea
                        style={styles.textarea}
                        placeholder="VD: Chào admin, mình là thành viên mới..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        autoFocus
                    />
                </div>

                <div style={styles.buttonGroup}>
                    <button
                        onClick={() => navigate("/user")}
                        style={styles.secondaryButton}
                        disabled={isSubmitting}
                    >
                        <ArrowLeft size={18} /> Quay lại
                    </button>
                    <button
                        onClick={handleJoin}
                        disabled={isSubmitting}
                        style={{
                            ...styles.primaryButton,
                            opacity: isSubmitting ? 0.7 : 1,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isSubmitting ? "Đang gửi..." : <><Send size={18} /> Gửi yêu cầu</>}
                    </button>
                </div>
            </div>

            <p style={styles.footerText}>Study Buddy © 2026</p>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '20px',
        boxSizing: 'border-box',
    },
    card: {
        background: '#ffffff',
        padding: '40px',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        animation: 'fadeIn 0.5s ease-out',
    },
    headerSection: {
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    iconCircle: {
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        backgroundColor: '#eff6ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
        border: '1px solid #dbeafe'
    },
    title: {
        margin: '0 0 8px 0',
        color: '#1e293b',
        fontSize: '24px',
        fontWeight: '700',
    },
    subtitle: {
        margin: 0,
        color: '#64748b',
        fontSize: '15px',
        lineHeight: '1.5',
    },
    inputSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#334155',
        marginLeft: '4px',
    },
    textarea: {
        width: '100%',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid #cbd5e1',
        minHeight: '120px',
        fontSize: '15px',
        outline: 'none',
        background: '#f8fafc',
        resize: 'vertical',
        transition: 'all 0.2s',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
    },
    buttonGroup: {
        display: 'flex',
        gap: '12px',
        marginTop: '8px',
    },
    secondaryButton: {
        flex: 1,
        padding: '12px 20px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        cursor: 'pointer',
        color: '#64748b',
        fontWeight: '600',
        fontSize: '15px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    },
    primaryButton: {
        flex: 2,
        padding: '12px 20px',
        background: '#2563eb',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        color: '#ffffff',
        fontWeight: '600',
        fontSize: '15px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s',
        boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
    },
    footerText: {
        marginTop: '24px',
        color: '#94a3b8',
        fontSize: '13px',
    }
};

const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  textarea:focus {
    border-color: #2563eb !important;
    background-color: #fff !important;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
  button:hover {
    transform: translateY(-1px);
  }
  button:active {
    transform: translateY(0);
  }
`;
document.head.appendChild(styleSheet);