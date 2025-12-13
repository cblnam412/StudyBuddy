import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API from "../../API/api";
import TagModal from './tagModal';
import { useAuth } from "../../context/AuthContext";

const TagManagementScreen = () => {
    const { accessToken } = useAuth();
    const [tags, setTags] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTag, setCurrentTag] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchTags = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${API}/tag`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                }
            });
            setTags(response.data);
        } catch (error) {
            console.error("Lỗi lấy danh sách tags:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (accessToken) {
            fetchTags();
        }
    }, [accessToken]);

    const handleDelete = async (id) => {
        if (window.confirm("Bạn có chắc muốn xóa tag này không?")) {
            try {
                await axios.delete(`${API}/tag/${id}`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });
                fetchTags();
            } catch (error) {
                console.error("Lỗi xóa tag:", error);
                alert("Không thể xóa tag này!");
            }
        }
    };

    const handleOpenAdd = () => {
        setCurrentTag(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (tag) => {
        setCurrentTag(tag);
        setIsModalOpen(true);
    };

    const handleSaveSuccess = () => {
        setIsModalOpen(false);
        fetchTags();
    };

    const styles = {
        container: {
            padding: '20px',
            backgroundColor: '#f3f4f6',
            minHeight: '100vh',
        },
        header: {
            marginBottom: '20px',
        },
        addButton: {
            marginBottom: '20px',
            padding: '10px 20px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        listContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
        },
        card: {
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        cardInfo: {
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
        },
        tagName: {
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#111827',
            margin: 0,
        },
        tagId: {
            fontSize: '14px',
            color: '#6b7280',
            margin: 0,
        },
        actions: {
            display: 'flex',
            gap: '10px',
        },
        editButton: {
            padding: '8px 16px',
            backgroundColor: '#eab308',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
        },
        deleteButton: {
            padding: '8px 16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
        },
        emptyState: {
            textAlign: 'center',
            color: '#6b7280',
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '12px',
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2>Quản lý Tags</h2>
            </div>

            <button onClick={handleOpenAdd} style={styles.addButton}>
                + THÊM TAG MỚI
            </button>

            <div style={styles.listContainer}>
                {isLoading ? (
                     <div style={styles.emptyState}>Đang tải dữ liệu...</div>
                ) : tags && tags.length > 0 ? (
                    tags.map((tag) => (
                        <div key={tag._id} style={styles.card}>
                            <div style={styles.cardInfo}>
                                <h3 style={styles.tagName}>{tag.tagName}</h3>
                            </div>

                            <div style={styles.actions}>
                                <button onClick={() => handleOpenEdit(tag)} style={styles.editButton}>
                                    Sửa
                                </button>
                                <button onClick={() => handleDelete(tag._id)} style={styles.deleteButton}>
                                    Xóa
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={styles.emptyState}>
                        Không có tag nào được tìm thấy.
                    </div>
                )}
            </div>

            {isModalOpen && (
                <TagModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleSaveSuccess}
                    initialData={currentTag}
                />
            )}
        </div>
    );
};

export default TagManagementScreen;