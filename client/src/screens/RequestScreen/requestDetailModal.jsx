import React, { useState } from 'react';
import axios from 'axios';
import API from "../../API/api";
import { useAuth } from "../../context/AuthContext";
import { X, Check, AlertCircle } from "lucide-react";

const RequestDetailModal = ({ isOpen, onClose, request, type, onSuccess }) => {
    const { accessToken } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    if (!isOpen || !request) return null;

    const isRoomRequest = type === 'room_create';
    const isModRequest = type === 'moderator_promote';

    const handleAction = async (action) => {
        setIsProcessing(true);
        try {
            let url = "";
            let body = {};

            if (isRoomRequest) {
                url = `${API}/room-request/${request._id}/${action}`;
                if (action === 'reject') body = { reason: rejectReason };
            } else {
                url = `${API}/admin/moderator-applications/${request._id}/${action}`;
                if (action === 'reject') body = { reason: rejectReason };
            }

            await axios.post(url, body, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            onSuccess();
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || error.message;
            alert(`Thao tác thất bại: ${msg}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const styles = {
        overlay: {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backdropFilter: 'blur(2px)'
        },
        modal: {
            backgroundColor: 'white', width: '600px', maxWidth: '95%',
            borderRadius: '12px', padding: '0', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column'
        },
        header: {
            padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: '#f8fafc'
        },
        title: { margin: 0, fontSize: '18px', fontWeight: '600', color: '#0f172a' },
        body: { padding: '24px', overflowY: 'auto', maxHeight: '70vh' },

        section: { marginBottom: '20px' },
        label: { fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' },
        value: { fontSize: '15px', color: '#334155', lineHeight: '1.6' },

        row: { display: 'flex', gap: '20px', marginBottom: '20px' },
        col: { flex: 1 },

        tagContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
        tag: { backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '4px', fontSize: '13px', fontWeight: '500' },

        footer: {
            padding: '16px 24px', borderTop: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'flex-end', gap: '12px',
            backgroundColor: 'white'
        },
        btn: {
            padding: '10px 20px', borderRadius: '6px', border: 'none',
            cursor: 'pointer', fontWeight: '600', fontSize: '14px',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
        },
        btnSecondary: { backgroundColor: 'white', border: '1px solid #cbd5e1', color: '#475569' },
        btnDanger: { backgroundColor: '#ef4444', color: 'white' },
        btnSuccess: { backgroundColor: '#10b981', color: 'white' },

        rejectBox: { backgroundColor: '#fef2f2', padding: '16px', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '20px' },
        textarea: { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '8px', minHeight: '80px', fontSize: '14px' }
    };

    const requester = isRoomRequest ? request.requester_id : (request.user_id || request.user);

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={styles.header}>
                    <h3 style={styles.title}>
                        {isRoomRequest ? "Chi tiết Yêu cầu Tạo phòng" : "Chi tiết Đơn ứng tuyển"}
                    </h3>
                    <button onClick={onClose} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#64748b'}}>
                        <X size={24} />
                    </button>
                </div>

                <div style={styles.body}>
                    <div style={styles.row}>
                        <div style={styles.col}>
                            <div style={styles.label}>Người gửi</div>
                            <div style={styles.value}>
                                <strong>{requester?.full_name || "N/A"}</strong>
                                <div style={{fontSize: '13px', color: '#64748b'}}>{requester?.email}</div>
                            </div>
                        </div>
                        <div style={styles.col}>
                            <div style={styles.label}>Thời gian gửi</div>
                            <div style={styles.value}>{new Date(request.createdAt).toLocaleString('vi-VN')}</div>
                        </div>
                    </div>

                    {isRoomRequest && (
                        <>
                            <div style={styles.section}>
                                <div style={styles.label}>Thông tin phòng</div>
                                <div style={{...styles.value, fontSize: '16px', fontWeight: '600', color: '#0f172a'}}>
                                    {request.room_name}
                                </div>
                                <div style={{fontSize: '13px', color: '#64748b', marginTop: '4px'}}>
                                    Chế độ: {request.room_status === 'public' ? 'Công khai' : 'Riêng tư'}
                                </div>
                            </div>

                            <div style={styles.section}>
                                <div style={styles.label}>Mô tả</div>
                                <div style={styles.value}>{request.description || "Chưa có mô tả"}</div>
                            </div>

                            <div style={styles.section}>
                                <div style={styles.label}>Tags</div>
                                <div style={styles.tagContainer}>
                                    {request.tags && request.tags.length > 0 ? (
                                        request.tags.map((tag, idx) => (
                                            <span key={idx} style={styles.tag}>#{tag.tagName || tag}</span>
                                        ))
                                    ) : ( <span style={{color: '#94a3b8', fontStyle: 'italic'}}>Không có tag</span> )}
                                </div>
                            </div>
                        </>
                    )}

                    {isModRequest && (
                        <>
                            <div style={styles.section}>
                                <div style={styles.label}>Lý do ứng tuyển</div>
                                <div style={{...styles.value, backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0'}}>
                                    {request.reason || request.message || "Không có nội dung"}
                                </div>
                            </div>
                            {request.experience && (
                                <div style={styles.section}>
                                    <div style={styles.label}>Kinh nghiệm</div>
                                    <div style={styles.value}>{request.experience}</div>
                                </div>
                            )}
                            {request.contact_info && (
                                <div style={styles.section}>
                                    <div style={styles.label}>Thông tin liên hệ</div>
                                    <div style={styles.value}>{request.contact_info}</div>
                                </div>
                            )}
                        </>
                    )}

                    {request.status === 'rejected' && (request.reason || request.rejection_reason) && (
                        <div style={{...styles.section, marginTop: '20px', padding: '16px', backgroundColor: '#fef2f2', borderRadius: '8px', borderLeft: '4px solid #ef4444'}}>
                            <div style={{...styles.label, color: '#b91c1c'}}>Lý do từ chối</div>
                            <div style={{...styles.value, color: '#7f1d1d'}}>{request.reason || request.rejection_reason}</div>
                        </div>
                    )}

                    {showRejectInput && (
                        <div style={styles.section}>
                            <div style={styles.label}>Nhập lý do từ chối</div>
                            <textarea
                                style={styles.textarea}
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Vui lòng nhập lý do cụ thể để phản hồi cho người dùng..."
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                <div style={styles.footer}>
                    {!showRejectInput ? (
                        <>
                            <button onClick={onClose} style={{...styles.btn, ...styles.btnSecondary}}>
                                Đóng
                            </button>
                            {request.status === 'pending' && (
                                <>
                                    <button
                                        onClick={() => setShowRejectInput(true)}
                                        style={{...styles.btn, ...styles.btnDanger}}
                                        disabled={isProcessing}
                                    >
                                        <AlertCircle size={18} /> Từ chối
                                    </button>
                                    <button
                                        onClick={() => handleAction('approve')}
                                        style={{...styles.btn, ...styles.btnSuccess}}
                                        disabled={isProcessing}
                                    >
                                        <Check size={18} /> Duyệt
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <button onClick={() => setShowRejectInput(false)} style={{...styles.btn, ...styles.btnSecondary}}>
                                Hủy bỏ
                            </button>
                            <button onClick={() => handleAction('reject')} style={{...styles.btn, ...styles.btnDanger}}>
                                Xác nhận từ chối
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RequestDetailModal;