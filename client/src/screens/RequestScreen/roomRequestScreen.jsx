import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API from "../../API/api";
import { useAuth } from "../../context/AuthContext";
import RequestDetailModal from './requestDetailModal';
import { LoadingSpinner } from "../../components/LoadingSpinner/LoadingSpinner";
import { Home, Shield, User, Clock, ChevronRight, Filter } from "lucide-react";

const RoomRequestScreen = () => {
    const { accessToken } = useAuth();
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const [statusFilter, setStatusFilter] = useState('pending');
    const [typeFilter, setTypeFilter] = useState('room_create');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    const fetchData = async () => {
        setIsLoading(true);
        setRequests([]);
        try {
            let endpoint = "";
            let params = {};

            if (typeFilter === 'room_create') {
                endpoint = `${API}/room-request`;
            } else {
                endpoint = `${API}/admin/moderator-applications`;
                params = { status: statusFilter };
            }

            const response = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: params
            });

            let data = response.data;
            if (data.applications) data = data.applications;
            else if (data.data) data = data.data;
            else if (data.docs) data = data.docs;

            if (typeFilter === 'room_create' && Array.isArray(data) && statusFilter !== 'all') {
                data = data.filter(item => item.status === statusFilter);
            }

            setRequests(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Lỗi lấy dữ liệu:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (accessToken) {
            fetchData();
        }
    }, [accessToken, statusFilter, typeFilter]);

    const handleOpenDetail = (request) => {
        setSelectedRequest(request);
        setIsModalOpen(true);
    };

    const handleActionSuccess = () => {
        setIsModalOpen(false);
        fetchData();
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'pending': return { color: '#b45309', bg: '#fffbeb', label: 'Chờ duyệt' };
            case 'approved': return { color: '#15803d', bg: '#f0fdf4', label: 'Đã duyệt' };
            case 'rejected': return { color: '#b91c1c', bg: '#fef2f2', label: 'Đã từ chối' };
            default: return { color: '#374151', bg: '#f3f4f6', label: status };
        }
    };

    const getCardInfo = (req) => {
        if (typeFilter === 'room_create') {
            return {
                title: req.room_name,
                user: req.requester_id?.email || "Unknown User",
                time: req.createdAt,
                typeIcon: <Home size={18} color="#2563eb" />,
                typeLabel: "Tạo phòng"
            };
        } else {
            const userEmail = req.user_id?.email || req.user?.email || "Unknown User";
            const userName = req.user_id?.full_name || req.user?.full_name;
            return {
                title: userName ? `${userName} (${userEmail})` : userEmail,
                user: userEmail,
                time: req.createdAt,
                typeIcon: <Shield size={18} color="#7c3aed" />,
                typeLabel: "Ứng tuyển Mod"
            };
        }
    };

    const styles = {
        container: { padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' },
        header: { marginBottom: '24px' },
        pageTitle: { fontSize: '24px', fontWeight: '600', color: '#0f172a', margin: 0 },

        filterBar: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
        selectGroup: { position: 'relative', minWidth: '200px' },
        select: {
            width: '100%', padding: '10px 16px', borderRadius: '8px',
            border: '1px solid #e2e8f0', backgroundColor: 'white',
            fontSize: '14px', fontWeight: '500', color: '#334155',
            appearance: 'none', cursor: 'pointer', outline: 'none'
        },

        cardList: { display: 'flex', flexDirection: 'column', gap: '12px' },
        card: {
            backgroundColor: 'white', padding: '16px 20px', borderRadius: '8px',
            border: '1px solid #e2e8f0', cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            transition: 'border-color 0.2s, box-shadow 0.2s'
        },
        cardLeft: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
        cardHeader: { display: 'flex', alignItems: 'center', gap: '12px' },
        cardTitle: { fontSize: '16px', fontWeight: '600', color: '#1e293b' },

        metaInfo: { display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b', marginTop: '6px' },
        metaItem: { display: 'flex', alignItems: 'center', gap: '6px' },

        badge: (status) => {
            const s = getStatusStyle(status);
            return {
                padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                color: s.color, backgroundColor: s.bg, textTransform: 'uppercase', letterSpacing: '0.5px'
            };
        },
        emptyState: { textAlign: 'center', padding: '40px', color: '#64748b', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #e2e8f0' }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.pageTitle}>Xử lý yêu cầu</h2>
            </div>

            <div style={styles.filterBar}>
                <div style={styles.selectGroup}>
                    <select
                        style={styles.select}
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option value="room_create">Yêu cầu tạo phòng</option>
                        <option value="moderator_promote">Đơn ứng tuyển Moderator</option>
                    </select>
                </div>

                <div style={styles.selectGroup}>
                    <select
                        style={styles.select}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="pending">Đang chờ duyệt</option>
                        <option value="approved">Đã chấp thuận</option>
                        <option value="rejected">Đã từ chối</option>
                    </select>
                </div>
            </div>

            <div style={styles.cardList}>
                {isLoading ? (
                    <LoadingSpinner label="Đang tải dữ liệu..." />
                ) : requests.length > 0 ? (
                    requests.map((req) => {
                        const info = getCardInfo(req);
                        return (
                            <div
                                key={req._id}
                                style={styles.card}
                                onClick={() => handleOpenDetail(req)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#94a3b8';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={styles.cardLeft}>
                                    <div style={styles.cardHeader}>
                                        {info.typeIcon}
                                        <span style={styles.cardTitle}>{info.title}</span>
                                        <span style={styles.badge(req.status)}>
                                            {getStatusStyle(req.status).label}
                                        </span>
                                    </div>
                                    <div style={styles.metaInfo}>
                                        <div style={styles.metaItem}>
                                            <User size={14} /> {info.user}
                                        </div>
                                        <div style={styles.metaItem}>
                                            <Clock size={14} /> {new Date(info.time).toLocaleDateString('vi-VN')}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={20} color="#cbd5e1" />
                            </div>
                        )
                    })
                ) : (
                    <div style={styles.emptyState}>
                        <Filter size={40} strokeWidth={1} style={{marginBottom: '10px', opacity: 0.5}}/>
                        <p>Không tìm thấy yêu cầu nào phù hợp.</p>
                    </div>
                )}
            </div>

            {isModalOpen && selectedRequest && (
                <RequestDetailModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    request={selectedRequest}
                    type={typeFilter}
                    onSuccess={handleActionSuccess}
                />
            )}
        </div>
    );
};

export default RoomRequestScreen;