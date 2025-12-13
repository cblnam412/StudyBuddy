import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API from "../../API/api";
import { useAuth } from "../../context/AuthContext";

const TagModal = ({ isOpen, onClose, onSuccess, initialData }) => {
    const { accessToken } = useAuth();
    const [tagName, setTagName] = useState('');

    useEffect(() => {
        if (initialData) {
            setTagName(initialData.tagName);
        } else {
            setTagName('');
        }
    }, [initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const config = {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            }
        };

        try {
            if (initialData) {
                await axios.put(`${API}/tag/${initialData._id}`, { tagName: tagName }, config);
            } else {
                await axios.post(`${API}/tag`, { tagName: tagName }, config);
            }

            onSuccess();
        } catch (error) {
            console.error("Lỗi lưu tag:", error);
            const msg = error.response?.data?.message || "Có lỗi xảy ra khi lưu!";
            alert(msg);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h3>{initialData ? 'Sửa Tag' : 'Thêm Tag Mới'}</h3>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                        <label>Tên Tag (Mới):</label>
                        <input
                            type="text"
                            value={tagName}
                            onChange={(e) => setTagName(e.target.value)}
                            required
                            placeholder="Nhập tên tag..."
                            style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
                        />
                        <small style={{color: 'gray'}}>* Tự động viết thường khi lưu</small>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button type="button" onClick={onClose} style={{cursor: 'pointer', padding: '8px 15px'}}>Hủy</button>
                        <button type="submit" style={{cursor: 'pointer', padding: '8px 15px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px'}}>Lưu</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    modal: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        width: '400px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }
};

export default TagModal;