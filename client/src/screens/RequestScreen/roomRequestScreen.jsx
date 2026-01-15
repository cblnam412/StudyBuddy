import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API from "../../API/api";
import { useAuth } from "../../context/AuthContext";
import RequestDetailModal from './requestDetailModal';
import { LoadingSpinner } from "../../components/LoadingSpinner/LoadingSpinner";

const RoomRequestScreen = () => {
    const { accessToken, user } = useAuth();
    const role = user?.role;
    const isAdmin = role === 'admin';

    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [tagsMap, setTagsMap] = useState({});
    const [statusFilter, setStatusFilter] = useState('pending');
    const [typeFilter, setTypeFilter] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    /* ================= TAGS ================= */
    useEffect(() => {
        const fetchAllTags = async () => {
            try {
                const res = await axios.get(`${API}/tag`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                const tagList = res.data.tags || res.data || [];
                const map = {};
                if (Array.isArray(tagList)) {
                    tagList.forEach(tag => {
                        map[tag._id] = tag.tagName || tag.name;
                    });
                }
                setTagsMap(map);
            } catch (error) {
                console.error("Fetch tags error:", error);
            }
        };

        if (accessToken) fetchAllTags();
    }, [accessToken]);

    /* ================= DATA ================= */
    const fetchData = async () => {
        setIsLoading(true);
        setRequests([]);

        try {
            let combinedData = [];
            const headers = { Authorization: `Bearer ${accessToken}` };

            /* ===== ROOM CREATE REQUEST ===== */
            if (typeFilter === 'all' || typeFilter === 'room_create') {
                try {
                    const res = await axios.get(`${API}/room-request`, { headers });
                    let rooms = res.data || [];
                    if (statusFilter !== 'all') {
                        rooms = rooms.filter(r => r.status === statusFilter);
                    }
                    rooms = rooms.map(r => ({ ...r, requestType: 'room_create' }));
                    combinedData = [...combinedData, ...rooms];
                } catch (e) {
                    console.error("Fetch room requests error:", e);
                }
            }

            /* ===== MODERATOR PROMOTE (ADMIN ONLY) ===== */
            if (
                isAdmin &&
                (typeFilter === 'all' || typeFilter === 'moderator_promote')
            ) {
                try {
                    const res = await axios.get(
                        `${API}/admin/moderator-applications`,
                        {
                            headers,
                            params: { status: statusFilter }
                        }
                    );

                    let mods =
                        res.data.applications ||
                        res.data.data ||
                        res.data.docs ||
                        [];

                    mods = mods.map(m => ({
                        ...m,
                        requestType: 'moderator_promote'
                    }));

                    combinedData = [...combinedData, ...mods];
                } catch (e) {
                    console.error("Fetch moderator applications error:", e);
                }
            }

            combinedData.sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );

            setRequests(combinedData);
        } catch (error) {
            console.error("Fetch data error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    /* ===== FORCE SAFE FILTER FOR MOD ===== */
    useEffect(() => {
        if (!isAdmin && typeFilter === 'moderator_promote') {
            setTypeFilter('room_create');
        }
    }, [isAdmin, typeFilter]);

    useEffect(() => {
        if (accessToken) fetchData();
    }, [accessToken, statusFilter, typeFilter, isAdmin]);

    /* ================= UI HELPERS ================= */
    const handleOpenDetail = (request) => {
        const requestWithTagName = { ...request };
        if (request.tags && Array.isArray(request.tags)) {
            requestWithTagName.tags = request.tags.map(tag => {
                const tagId = typeof tag === 'object' ? tag._id : tag;
                return {
                    _id: tagId,
                    tagName: tagsMap[tagId] || tagId
                };
            });
        }
        setSelectedRequest(requestWithTagName);
        setIsModalOpen(true);
    };

    const handleActionSuccess = () => {
        setIsModalOpen(false);
        fetchData();
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'pending':
                return { color: '#b45309', bg: '#fffbeb', label: 'Chờ duyệt' };
            case 'approved':
                return { color: '#15803d', bg: '#f0fdf4', label: 'Đã duyệt' };
            case 'rejected':
                return { color: '#b91c1c', bg: '#fef2f2', label: 'Đã từ chối' };
            default:
                return { color: '#374151', bg: '#f3f4f6', label: status };
        }
    };

    const getCardInfo = (req) => {
        if (req.requestType === 'room_create') {
            return {
                title: req.room_name,
                user: req.requester_id?.email || "Unknown User",
                time: req.createdAt,
                typeLabel: "Tạo phòng",
                tags: req.tags
            };
        }

        const userEmail = req.user_id?.email || req.user?.email || "Unknown User";
        const userName = req.user_id?.full_name || req.user?.full_name;

        return {
            title: userName ? `${userName} (${userEmail})` : userEmail,
            user: userEmail,
            time: req.createdAt,
            typeLabel: "Ứng tuyển Mod",
            tags: []
        };
    };

    /* ================= STYLES ================= */
    const styles = {
        container: { padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' },
        header: { marginBottom: '24px' },
        pageTitle: { fontSize: '24px', fontWeight: '600', color: '#0f172a', margin: 0 },
        filterBar: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
        selectGroup: { minWidth: '220px' },
        select: {
            width: '100%', padding: '12px 16px', borderRadius: '10px',
            border: '1px solid #e2e8f0', backgroundColor: 'white',
            fontSize: '14px', fontWeight: '500'
        },
        cardList: { display: 'flex', flexDirection: 'column', gap: '12px' },
        card: {
            backgroundColor: 'white', padding: '20px', borderRadius: '12px',
            border: '1px solid #e2e8f0', cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between'
        },
        cardTitle: { fontSize: '16px', fontWeight: '700', color: '#1e293b' },
        badge: (status) => {
            const s = getStatusStyle(status);
            return {
                padding: '4px 10px', borderRadius: '20px',
                fontSize: '12px', fontWeight: '600',
                color: s.color, backgroundColor: s.bg
            };
        },
        emptyState: {
            textAlign: 'center', padding: '60px',
            color: '#64748b', backgroundColor: 'white',
            borderRadius: '12px', border: '1px dashed #e2e8f0'
        }
    };

    /* ================= RENDER ================= */
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
                        <option value="all">Tất cả loại yêu cầu</option>
                        <option value="room_create">Yêu cầu tạo phòng</option>
                        {isAdmin && (
                            <option value="moderator_promote">
                                Đơn ứng tuyển Moderator
                            </option>
                        )}
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
                    requests.map(req => {
                        const info = getCardInfo(req);
                        return (
                            <div
                                key={req._id}
                                style={styles.card}
                                onClick={() => handleOpenDetail(req)}
                            >
                                <div>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <span style={styles.cardTitle}>{info.title}</span>
                                        <span style={styles.badge(req.status)}>
                                            {getStatusStyle(req.status).label}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#64748b' }}>
                                        {info.user} · {new Date(info.time).toLocaleDateString('vi-VN')}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div style={styles.emptyState}>
                        Không tìm thấy yêu cầu nào.
                    </div>
                )}
            </div>

            {isModalOpen && selectedRequest && (
                <RequestDetailModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    request={selectedRequest}
                    type={selectedRequest.requestType}
                    onSuccess={handleActionSuccess}
                />
            )}
        </div>
    );
};

export default RoomRequestScreen;
