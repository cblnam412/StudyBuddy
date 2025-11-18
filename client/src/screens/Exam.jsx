// [file name]: Exam.jsx - Fixed
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Exam.css';

// Set base URL for API calls
const API_BASE_URL = 'http://localhost:3000';

const ExamScreen = () => {
    const [exams, setExams] = useState([]);
    const [selectedExam, setSelectedExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form states
    const [examForm, setExamForm] = useState({
        event_id: '',
        examType: 'exam',
        title: '',
        description: '',
        duration: ''
    });

    const [questionForm, setQuestionForm] = useState({
        question_text: '',
        options: ['', '', '', ''],
        correct_answers: [],
        points: 1
    });

    const [selectedFile, setSelectedFile] = useState(null);

    const fetchExams = async () => {
        setLoading(true);
        try {
            // Note: You might need to implement an endpoint to list exams
            // For now, we'll work with individual exam operations
            setExams([]); // Clear exams since we don't have a list endpoint
        } catch (error) {
            console.error('Error fetching exams:', error);
        }
        setLoading(false);
    };

    const createExam = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('accessToken');
            console.log('Creating exam with data:', examForm);

            const response = await axios.post(`${API_BASE_URL}/exam`, examForm, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            alert('Tạo bài kiểm tra thành công!');
            setExamForm({ event_id: '', examType: 'exam', title: '', description: '', duration: '' });
            console.log('Exam created:', response.data);
        } catch (error) {
            console.error('Error creating exam:', error);
            alert('Lỗi khi tạo bài kiểm tra: ' + (error.response?.data?.message || error.message));
        }
    };

    const getExam = async (examId) => {
        try {
            const token = localStorage.getItem('accessToken');
            console.log('Fetching exam:', examId);

            const response = await axios.get(`${API_BASE_URL}/exam/${examId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('Exam response:', response.data);
            setSelectedExam(response.data);
            setQuestions(response.data.questions || []);
        } catch (error) {
            console.error('Error fetching exam:', error);
            alert('Lỗi khi tải bài kiểm tra: ' + (error.response?.data?.message || error.message));
        }
    };

    const updateExam = async (examId, updates) => {
        try {
            const token = localStorage.getItem('accessToken');
            await axios.patch(`${API_BASE_URL}/exam/${examId}`, updates, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            alert('Cập nhật bài kiểm tra thành công!');
            if (selectedExam && selectedExam._id === examId) {
                getExam(examId);
            }
        } catch (error) {
            console.error('Error updating exam:', error);
            alert('Lỗi khi cập nhật bài kiểm tra: ' + (error.response?.data?.message || error.message));
        }
    };

    const deleteExam = async (examId) => {
        try {
            const token = localStorage.getItem('accessToken');
            await axios.delete(`${API_BASE_URL}/exam/${examId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            alert('Xóa bài kiểm tra thành công!');
            setSelectedExam(null);
            setQuestions([]);
        } catch (error) {
            console.error('Error deleting exam:', error);
            alert('Lỗi khi xóa bài kiểm tra: ' + (error.response?.data?.message || error.message));
        }
    };

    const publishExam = async (examId) => {
        try {
            const token = localStorage.getItem('accessToken');
            await axios.patch(`${API_BASE_URL}/exam/${examId}/publish`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            alert('Xuất bản bài kiểm tra thành công!');
            if (selectedExam && selectedExam._id === examId) {
                getExam(examId);
            }
        } catch (error) {
            console.error('Error publishing exam:', error);
            alert('Lỗi khi xuất bản bài kiểm tra: ' + (error.response?.data?.message || error.message));
        }
    };

    const addQuestion = async (examId, e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('accessToken');
            console.log('Adding question:', questionForm);

            await axios.post(`${API_BASE_URL}/exam/${examId}/questions`, questionForm, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            alert('Thêm câu hỏi thành công!');
            setQuestionForm({
                question_text: '',
                options: ['', '', '', ''],
                correct_answers: [],
                points: 1
            });
            if (selectedExam && selectedExam._id === examId) {
                getExam(examId);
            }
        } catch (error) {
            console.error('Error adding question:', error);
            alert('Lỗi khi thêm câu hỏi: ' + (error.response?.data?.message || error.message));
        }
    };

    const uploadQuestionsFromDocx = async (examId) => {
        if (!selectedFile) {
            alert('Vui lòng chọn file DOCX');
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            const formData = new FormData();
            formData.append('file', selectedFile);

            await axios.post(`${API_BASE_URL}/exam/${examId}/questions/upload`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            alert('Tải lên câu hỏi từ DOCX thành công!');
            setSelectedFile(null);
            if (selectedExam && selectedExam._id === examId) {
                getExam(examId);
            }
        } catch (error) {
            console.error('Error uploading questions:', error);
            alert('Lỗi khi tải lên câu hỏi: ' + (error.response?.data?.message || error.message));
        }
    };

    const updateQuestion = async (questionId, updates) => {
        try {
            const token = localStorage.getItem('accessToken');
            await axios.patch(`${API_BASE_URL}/exam/questions/${questionId}`, updates, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            alert('Cập nhật câu hỏi thành công!');
            if (selectedExam) {
                getExam(selectedExam._id);
            }
        } catch (error) {
            console.error('Error updating question:', error);
            alert('Lỗi khi cập nhật câu hỏi: ' + (error.response?.data?.message || error.message));
        }
    };

    const deleteQuestion = async (questionId) => {
        try {
            const token = localStorage.getItem('accessToken');
            await axios.delete(`${API_BASE_URL}/exam/questions/${questionId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            alert('Xóa câu hỏi thành công!');
            if (selectedExam) {
                getExam(selectedExam._id);
            }
        } catch (error) {
            console.error('Error deleting question:', error);
            alert('Lỗi khi xóa câu hỏi: ' + (error.response?.data?.message || error.message));
        }
    };

    useEffect(() => {
        console.log('ExamScreen mounted');
        fetchExams();
    }, []);

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
            <div>Selected Exam: {selectedExam ? selectedExam._id : 'None'}</div>
            <div>Questions count: {questions.length}</div>
            <div>Token: {localStorage.getItem('accessToken') ? 'Present' : 'Missing'}</div>
            <div>API Base: {API_BASE_URL}</div>
        </div>
    );

    return (
        <div className="exam-screen">
            <h1>Quản lý Bài kiểm tra</h1>

            <DebugInfo />

            {/* Create Exam Form */}
            <div className="create-exam-section">
                <h3>Tạo bài kiểm tra mới</h3>
                <form onSubmit={createExam}>
                    <input
                        type="text"
                        placeholder="Event ID (bắt buộc)"
                        value={examForm.event_id}
                        onChange={(e) => setExamForm({ ...examForm, event_id: e.target.value })}
                        required
                    />
                    <select
                        value={examForm.examType}
                        onChange={(e) => setExamForm({ ...examForm, examType: e.target.value })}
                    >
                        <option value="exam">Bài kiểm tra</option>
                        <option value="discussion">Thảo luận</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Tiêu đề (bắt buộc)"
                        value={examForm.title}
                        onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                        required
                    />
                    <textarea
                        placeholder="Mô tả"
                        value={examForm.description}
                        onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                    />
                    <input
                        type="number"
                        placeholder="Thời gian (phút)"
                        value={examForm.duration}
                        onChange={(e) => setExamForm({ ...examForm, duration: e.target.value })}
                        min="1"
                    />
                    <button type="submit">Tạo bài kiểm tra</button>
                </form>
            </div>

            {/* Get Exam Section */}
            <div className="get-exam-section">
                <h3>Tìm bài kiểm tra</h3>
                <div className="exam-search">
                    <input
                        type="text"
                        placeholder="Nhập Exam ID"
                        id="examIdInput"
                    />
                    <button onClick={() => {
                        const examId = document.getElementById('examIdInput').value;
                        if (examId) {
                            getExam(examId);
                        } else {
                            alert('Vui lòng nhập Exam ID');
                        }
                    }}>
                        Tải bài kiểm tra
                    </button>
                </div>
            </div>

            {/* Selected Exam Details */}
            {selectedExam && (
                <div className="exam-details">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3>Chi tiết bài kiểm tra</h3>
                        <button
                            onClick={() => {
                                setSelectedExam(null);
                                setQuestions([]);
                            }}
                            style={{
                                padding: '8px 16px',
                                background: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Đóng
                        </button>
                    </div>

                    <div className="exam-info">
                        <h4>{selectedExam.title}</h4>
                        <p><strong>ID:</strong> {selectedExam._id}</p>
                        <p><strong>Loại:</strong>
                            <span style={{
                                color: selectedExam.examType === 'exam' ? '#dc3545' : '#007bff',
                                fontWeight: 'bold',
                                marginLeft: '5px'
                            }}>
                                {selectedExam.examType === 'exam' ? 'Bài kiểm tra' : 'Thảo luận'}
                            </span>
                        </p>
                        <p><strong>Trạng thái:</strong>
                            <span style={{
                                color: selectedExam.status === 'published' ? '#28a745' :
                                    selectedExam.status === 'draft' ? '#ffc107' : '#6c757d',
                                fontWeight: 'bold',
                                marginLeft: '5px'
                            }}>
                                {selectedExam.status}
                            </span>
                        </p>
                        <p><strong>Mô tả:</strong> {selectedExam.description || 'Không có mô tả'}</p>
                        <p><strong>Thời gian:</strong> {selectedExam.duration ? `${selectedExam.duration} phút` : 'Không giới hạn'}</p>
                        <p><strong>Event ID:</strong> {selectedExam.event_id}</p>
                    </div>

                    {/* Exam Actions */}
                    <div className="exam-actions">
                        <button onClick={() => {
                            const newTitle = prompt('Nhập tiêu đề mới:', selectedExam.title);
                            const newDescription = prompt('Nhập mô tả mới:', selectedExam.description);
                            if (newTitle !== null) {
                                updateExam(selectedExam._id, {
                                    title: newTitle,
                                    description: newDescription
                                });
                            }
                        }}>
                            Cập nhật
                        </button>
                        <button onClick={() => publishExam(selectedExam._id)}>
                            Xuất bản
                        </button>
                        <button onClick={() => {
                            if (window.confirm('Bạn có chắc chắn muốn xóa bài kiểm tra này?')) {
                                deleteExam(selectedExam._id);
                            }
                        }}>
                            Xóa bài kiểm tra
                        </button>
                    </div>

                    {/* Add Question Form */}
                    <div className="add-question-section">
                        <h4>Thêm câu hỏi mới</h4>
                        <form onSubmit={(e) => addQuestion(selectedExam._id, e)}>
                            <textarea
                                placeholder="Nội dung câu hỏi *"
                                value={questionForm.question_text}
                                onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                                required
                                rows="3"
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {questionForm.options.map((option, index) => (
                                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontWeight: 'bold', minWidth: '20px' }}>
                                            {String.fromCharCode(65 + index)}.
                                        </span>
                                        <input
                                            type="text"
                                            placeholder={`Lựa chọn ${String.fromCharCode(65 + index)}`}
                                            value={option}
                                            onChange={(e) => {
                                                const newOptions = [...questionForm.options];
                                                newOptions[index] = e.target.value;
                                                setQuestionForm({ ...questionForm, options: newOptions });
                                            }}
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <input
                                type="text"
                                placeholder="Đáp án đúng (ví dụ: A,B) - để trống nếu chưa có"
                                onChange={(e) => setQuestionForm({
                                    ...questionForm,
                                    correct_answers: e.target.value.split(',').map(a => a.trim()).filter(a => a)
                                })}
                            />
                            <input
                                type="number"
                                placeholder="Điểm"
                                value={questionForm.points}
                                onChange={(e) => setQuestionForm({ ...questionForm, points: parseFloat(e.target.value) || 1 })}
                                step="0.5"
                                min="0"
                            />
                            <button type="submit">Thêm câu hỏi</button>
                        </form>
                    </div>

                    {/* Upload Questions from DOCX */}
                    <div className="upload-questions-section">
                        <h4>Tải lên câu hỏi từ file DOCX</h4>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input
                                type="file"
                                accept=".docx"
                                onChange={(e) => setSelectedFile(e.target.files[0])}
                                style={{ flex: 1 }}
                            />
                            <button onClick={() => uploadQuestionsFromDocx(selectedExam._id)}>
                                Tải lên câu hỏi
                            </button>
                        </div>
                        {selectedFile && (
                            <p style={{ margin: '5px 0', color: '#28a745', fontSize: '14px' }}>
                                Đã chọn: {selectedFile.name}
                            </p>
                        )}
                    </div>

                    {/* Questions List */}
                    <div className="questions-list">
                        <h4>Danh sách câu hỏi ({questions.length})</h4>
                        {questions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                <p>Chưa có câu hỏi nào.</p>
                                <p>Hãy thêm câu hỏi thủ công hoặc tải lên từ file DOCX.</p>
                            </div>
                        ) : (
                            questions.map((question, index) => (
                                <div key={question._id} className="question-card">
                                    <h5>Câu {index + 1}: {question.question_text}</h5>
                                    <ul>
                                        {question.options.map((option, optIndex) => (
                                            <li key={optIndex}>
                                                <strong>{String.fromCharCode(65 + optIndex)}.</strong> {option}
                                            </li>
                                        ))}
                                    </ul>
                                    <p><strong>Đáp án đúng:</strong>
                                        <span style={{
                                            color: question.correct_answers?.length > 0 ? '#28a745' : '#dc3545',
                                            fontWeight: 'bold',
                                            marginLeft: '5px'
                                        }}>
                                            {question.correct_answers?.join(', ') || 'Chưa thiết lập'}
                                        </span>
                                    </p>
                                    <p><strong>Điểm:</strong> {question.points}</p>
                                    <div className="question-actions">
                                        <button onClick={() => {
                                            const newText = prompt('Nhập nội dung câu hỏi mới:', question.question_text);
                                            if (newText) {
                                                updateQuestion(question._id, { question_text: newText });
                                            }
                                        }}>
                                            Sửa
                                        </button>
                                        <button onClick={() => {
                                            if (window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
                                                deleteQuestion(question._id);
                                            }
                                        }}>
                                            Xóa
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamScreen;