// [file name]: Event.jsx - Fixed with API base URL
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Event.css';

// Set base URL for API calls
const API_BASE_URL = 'http://localhost:3000';

const EventScreen = () => {
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        page: 1,
        limit: 10,
        room_id: '',
        status: '',
        created_by: '',
        registered_by: ''
    });

    // Form states
    const [eventForm, setEventForm] = useState({
        room_id: '',
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        max_participants: ''
    });

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            console.log('Fetching events with token:', token ? 'Present' : 'Missing');

            const response = await axios.get(`${API_BASE_URL}/event`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params: filters
            });
            console.log('Events API Response:', response.data);
            setEvents(response.data.data || []);
        } catch (error) {
            console.error('Error fetching events:', error);
            console.error('Error details:', error.response?.data);
            alert('Lỗi khi tải sự kiện: ' + (error.response?.data?.message || error.message));
        }
        setLoading(false);
    };

    const fetchEventDetails = async (eventId) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get(`${API_BASE_URL}/event/${eventId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            setSelectedEvent(response.data);
        } catch (error) {
            console.error('Error fetching event details:', error);
            alert('Lỗi khi tải chi tiết sự kiện: ' + (error.response?.data?.message || error.message));
        }
    };

    const createEvent = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.post(`${API_BASE_URL}/event`, eventForm, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            alert('Tạo sự kiện thành công!');
            setEventForm({
                room_id: '', title: '', description: '', start_time: '', end_time: '', max_participants: ''
            });
            fetchEvents();
        } catch (error) {
            console.error('Error creating event:', error);
            alert('Lỗi khi tạo sự kiện: ' + (error.response?.data?.message || error.message));
        }
    };

    const registerForEvent = async (eventId) => {
        try {
            const token = localStorage.getItem('accessToken');
            const event = events.find(e => e._id === eventId);
            await axios.post(`${API_BASE_URL}/event/register`, {
                event_id: eventId,
                room_id: event?.room_id?._id || event?.room_id || filters.room_id
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            alert('Đăng ký sự kiện thành công!');
            fetchEvents();
        } catch (error) {
            console.error('Error registering for event:', error);
            alert('Lỗi khi đăng ký: ' + (error.response?.data?.message || error.message));
        }
    };

    const unregisterEvent = async (eventId) => {
        try {
            const token = localStorage.getItem('accessToken');
            const event = events.find(e => e._id === eventId);
            await axios.delete(`${API_BASE_URL}/event/register`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    event_id: eventId,
                    room_id: event?.room_id?._id || event?.room_id
                }
            });
            alert('Hủy đăng ký thành công!');
            fetchEvents();
        } catch (error) {
            console.error('Error unregistering from event:', error);
            alert('Lỗi khi hủy đăng ký: ' + (error.response?.data?.message || error.message));
        }
    };

    const cancelEvent = async (eventId) => {
        try {
            const token = localStorage.getItem('accessToken');
            const event = events.find(e => e._id === eventId);
            if (!event) {
                alert('Không tìm thấy sự kiện');
                return;
            }

            const roomId = event.room_id?._id || event.room_id;
            if (!roomId) {
                alert('Không tìm thấy room_id cho sự kiện này');
                return;
            }

            await axios.patch(`${API_BASE_URL}/event/${roomId}/${eventId}/cancel`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            alert('Hủy sự kiện thành công!');
            fetchEvents();
        } catch (error) {
            console.error('Error canceling event:', error);
            alert('Lỗi khi hủy sự kiện: ' + (error.response?.data?.message || error.message));
        }
    };

    const updateEvent = async (eventId) => {
        try {
            const token = localStorage.getItem('accessToken');
            const event = events.find(e => e._id === eventId);
            if (!event) {
                alert('Không tìm thấy sự kiện');
                return;
            }

            const newTitle = prompt('Nhập tiêu đề mới:', event.title) || event.title;
            const newDescription = prompt('Nhập mô tả mới:', event.description) || event.description;

            const roomId = event.room_id?._id || event.room_id;
            if (!roomId) {
                alert('Không tìm thấy room_id cho sự kiện này');
                return;
            }

            await axios.post(`${API_BASE_URL}/event/${roomId}/${eventId}/update`, {
                title: newTitle,
                description: newDescription
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            alert('Cập nhật sự kiện thành công!');
            fetchEvents();
        } catch (error) {
            console.error('Error updating event:', error);
            alert('Lỗi khi cập nhật sự kiện: ' + (error.response?.data?.message || error.message));
        }
    };

    const attendedEvent = async (eventId) => {
        try {
            const token = localStorage.getItem('accessToken');
            const event = events.find(e => e._id === eventId);
            if (!event) {
                alert('Không tìm thấy sự kiện');
                return;
            }

            const roomId = event.room_id?._id || event.room_id;
            if (!roomId) {
                alert('Không tìm thấy room_id cho sự kiện này');
                return;
            }

            await axios.post(`${API_BASE_URL}/event/${roomId}/${eventId}/attend`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            alert('Điểm danh thành công!');
            fetchEvents();
        } catch (error) {
            console.error('Error attending event:', error);
            alert('Lỗi khi điểm danh: ' + (error.response?.data?.message || error.message));
        }
    };

    const markAsCompleted = async (eventId) => {
        try {
            const token = localStorage.getItem('accessToken');
            const event = events.find(e => e._id === eventId);
            if (!event) {
                alert('Không tìm thấy sự kiện');
                return;
            }

            const roomId = event.room_id?._id || event.room_id;
            if (!roomId) {
                alert('Không tìm thấy room_id cho sự kiện này');
                return;
            }

            await axios.post(`${API_BASE_URL}/event/${roomId}/${eventId}/markEvent`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            alert('Đánh dấu hoàn thành thành công!');
            fetchEvents();
        } catch (error) {
            console.error('Error marking event as completed:', error);
            alert('Lỗi khi đánh dấu hoàn thành: ' + (error.response?.data?.message || error.message));
        }
    };

    const downloadReport = async (eventId) => {
        try {
            const token = localStorage.getItem('accessToken');
            const event = events.find(e => e._id === eventId);
            if (!event) {
                alert('Không tìm thấy sự kiện');
                return;
            }

            const roomId = event.room_id?._id || event.room_id;
            if (!roomId) {
                alert('Không tìm thấy room_id cho sự kiện này');
                return;
            }

            const response = await axios.get(`${API_BASE_URL}/event/${roomId}/${eventId}/getReport`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `event_report_${eventId}.txt`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading report:', error);
            alert('Lỗi khi tải báo cáo: ' + (error.response?.data?.message || error.message));
        }
    };

    // Test API connection on component mount
    useEffect(() => {
        console.log('EventScreen mounted, testing API connection...');
        fetchEvents();
    }, [filters]);

    // Add debug info component
    const DebugInfo = () => (
        <div style={{
            background: '#f8f9fa',
            padding: '10px',
            margin: '10px 0',
            border: '1px solid #ddd',
            fontSize: '12px',
            borderRadius: '4px'
        }}>
            <strong>Debug Info:</strong>
            <div>Events count: {events.length}</div>
            <div>Loading: {loading ? 'Yes' : 'No'}</div>
            <div>Token: {localStorage.getItem('accessToken') ? 'Present' : 'Missing'}</div>
            <div>API Base: {API_BASE_URL}</div>
        </div>
    );

    return (
        <div className="event-screen">
            <h1>Quản lý Sự kiện</h1>

            <DebugInfo />

            {/* Filter Section */}
            <div className="filter-section">
                <h3>Bộ lọc</h3>
                <div className="filter-controls">
                    <input
                        type="text"
                        placeholder="Room ID"
                        value={filters.room_id}
                        onChange={(e) => setFilters({ ...filters, room_id: e.target.value })}
                    />
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="upcoming">Sắp diễn ra</option>
                        <option value="ongoing">Đang diễn ra</option>
                        <option value="completed">Đã hoàn thành</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Created By (User ID)"
                        value={filters.created_by}
                        onChange={(e) => setFilters({ ...filters, created_by: e.target.value })}
                    />
                    <button onClick={fetchEvents}>Tải lại</button>
                </div>
            </div>

            {/* Create Event Form */}
            <div className="create-event-section">
                <h3>Tạo sự kiện mới</h3>
                <form onSubmit={createEvent}>
                    <input
                        type="text"
                        placeholder="Room ID (bắt buộc)"
                        value={eventForm.room_id}
                        onChange={(e) => setEventForm({ ...eventForm, room_id: e.target.value })}
                        required
                    />
                    <input
                        type="text"
                        placeholder="Tiêu đề (bắt buộc)"
                        value={eventForm.title}
                        onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                        required
                    />
                    <textarea
                        placeholder="Mô tả"
                        value={eventForm.description}
                        onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    />
                    <input
                        type="datetime-local"
                        placeholder="Thời gian bắt đầu"
                        value={eventForm.start_time}
                        onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                        required
                    />
                    <input
                        type="datetime-local"
                        placeholder="Thời gian kết thúc"
                        value={eventForm.end_time}
                        onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                        required
                    />
                    <input
                        type="number"
                        placeholder="Số người tham gia tối đa"
                        value={eventForm.max_participants}
                        onChange={(e) => setEventForm({ ...eventForm, max_participants: e.target.value })}
                        min="1"
                        max="100"
                    />
                    <button type="submit">Tạo sự kiện</button>
                </form>
            </div>

            {/* Events List */}
            <div className="events-list">
                <h3>Danh sách sự kiện ({events.length})</h3>
                {loading && <p>Đang tải sự kiện...</p>}

                {events.length === 0 && !loading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                        <p>Không có sự kiện nào.</p>
                        <p>Hãy tạo sự kiện mới hoặc kiểm tra bộ lọc.</p>
                    </div>
                ) : (
                    events.map(event => (
                        <div key={event._id} className="event-card">
                            <h4>{event.title}</h4>
                            <p><strong>Trạng thái:</strong> <span style={{
                                color: event.status === 'upcoming' ? '#007bff' :
                                    event.status === 'ongoing' ? '#28a745' :
                                        event.status === 'completed' ? '#6c757d' : '#dc3545',
                                fontWeight: 'bold'
                            }}>{event.status}</span></p>
                            <p><strong>Phòng:</strong> {event.room_id?.room_name || event.room_id}</p>
                            <p><strong>Thời gian:</strong> {new Date(event.start_time).toLocaleString()} - {new Date(event.end_time).toLocaleString()}</p>
                            <p><strong>Người tạo:</strong> {event.user_id?.user_name || 'Unknown'}</p>

                            <div className="event-actions">
                                <button onClick={() => fetchEventDetails(event._id)}>
                                    Chi tiết
                                </button>
                                <button onClick={() => registerForEvent(event._id)}>
                                    Đăng ký
                                </button>
                                <button onClick={() => unregisterEvent(event._id)}>
                                    Hủy ĐK
                                </button>
                                <button onClick={() => attendedEvent(event._id)}>
                                    Điểm danh
                                </button>
                                <button onClick={() => updateEvent(event._id)}>
                                    Cập nhật
                                </button>
                                <button onClick={() => cancelEvent(event._id)}>
                                    Hủy SK
                                </button>
                                <button onClick={() => markAsCompleted(event._id)}>
                                    Hoàn thành
                                </button>
                                <button onClick={() => downloadReport(event._id)}>
                                    Báo cáo
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Event Details Modal */}
            {selectedEvent && (
                <div className="event-details">
                    <h3>Chi tiết sự kiện</h3>
                    <button onClick={() => setSelectedEvent(null)}>Đóng</button>
                    <div className="event-details-content">
                        <p><strong>ID:</strong> {selectedEvent._id}</p>
                        <p><strong>Tiêu đề:</strong> {selectedEvent.title}</p>
                        <p><strong>Mô tả:</strong> {selectedEvent.description || 'Không có mô tả'}</p>
                        <p><strong>Trạng thái:</strong> {selectedEvent.status}</p>
                        <p><strong>Thời gian bắt đầu:</strong> {new Date(selectedEvent.start_time).toLocaleString()}</p>
                        <p><strong>Thời gian kết thúc:</strong> {new Date(selectedEvent.end_time).toLocaleString()}</p>
                        <p><strong>Số người tối đa:</strong> {selectedEvent.max_participants}</p>

                        {selectedEvent.stats && (
                            <div>
                                <h4>Thống kê</h4>
                                <p><strong>Đã đăng ký:</strong> {selectedEvent.stats.totalRegistered}</p>
                                <p><strong>Đã tham gia:</strong> {selectedEvent.stats.totalAttended}</p>
                                <p><strong>Tối đa:</strong> {selectedEvent.stats.maxParticipants}</p>
                            </div>
                        )}

                        {selectedEvent.userStatus && (
                            <div>
                                <h4>Trạng thái của bạn</h4>
                                <p><strong>Đã đăng ký:</strong> {selectedEvent.userStatus.isRegistered ? '✅ Có' : '❌ Không'}</p>
                                <p><strong>Đã tham gia:</strong> {selectedEvent.userStatus.isAttended ? '✅ Có' : '❌ Không'}</p>
                                <p><strong>Là chủ sự kiện:</strong> {selectedEvent.userStatus.isHost ? '✅ Có' : '❌ Không'}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventScreen;