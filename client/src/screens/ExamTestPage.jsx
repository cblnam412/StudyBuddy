// screens/ExamTestPage.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../API/api";

export default function ExamTestPage() {
  const { accessToken } = useAuth();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeQuestionTab, setActiveQuestionTab] = useState("manual");
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Form states
  const [examForm, setExamForm] = useState({
    event_id: "65a1b2c3d4e5f67890123456",
    examType: "exam",
    title: "",
    description: "",
    duration: 60
  });

  // Manual question form
  const [manualQuestionForm, setManualQuestionForm] = useState({
    question_text: "",
    options: ["", "", "", ""],
    correct_answers: [],
    points: 1.0
  });

  // AI question form
  const [aiQuestionForm, setAiQuestionForm] = useState({
    topic: "",
    quantity: 5,
    difficulty: "medium"
  });

  // DOCX file state
  const [docxFile, setDocxFile] = useState(null);

  // CSS Styles
  const styles = {
    container: {
      padding: "20px",
      maxWidth: "1200px",
      margin: "0 auto",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      backgroundColor: "#f5f7fa",
      minHeight: "100vh"
    },
    header: {
      color: "#2c3e50",
      textAlign: "center",
      marginBottom: "30px",
      fontSize: "2.5rem",
      fontWeight: "600",
      textShadow: "1px 1px 2px rgba(0,0,0,0.1)"
    },
    section: {
      backgroundColor: "white",
      borderRadius: "12px",
      padding: "25px",
      marginBottom: "30px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      border: "1px solid #e1e8ed"
    },
    formGroup: {
      marginBottom: "20px"
    },
    label: {
      display: "block",
      marginBottom: "8px",
      fontWeight: "600",
      color: "#34495e",
      fontSize: "14px"
    },
    input: {
      width: "100%",
      padding: "12px",
      border: "2px solid #e1e8ed",
      borderRadius: "8px",
      fontSize: "14px",
      transition: "border-color 0.3s ease",
      boxSizing: "border-box"
    },
    inputFocus: {
      borderColor: "#3498db",
      outline: "none"
    },
    textarea: {
      width: "100%",
      padding: "12px",
      border: "2px solid #e1e8ed",
      borderRadius: "8px",
      fontSize: "14px",
      minHeight: "100px",
      resize: "vertical",
      transition: "border-color 0.3s ease",
      boxSizing: "border-box"
    },
    select: {
      width: "100%",
      padding: "12px",
      border: "2px solid #e1e8ed",
      borderRadius: "8px",
      fontSize: "14px",
      backgroundColor: "white",
      transition: "border-color 0.3s ease"
    },
    button: {
      padding: "12px 24px",
      border: "none",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
      marginRight: "10px",
      marginBottom: "10px"
    },
    primaryButton: {
      backgroundColor: "#3498db",
      color: "white"
    },
    successButton: {
      backgroundColor: "#27ae60",
      color: "white"
    },
    warningButton: {
      backgroundColor: "#f39c12",
      color: "white"
    },
    dangerButton: {
      backgroundColor: "#e74c3c",
      color: "white"
    },
    secondaryButton: {
      backgroundColor: "#95a5a6",
      color: "white"
    },
    buttonHover: {
      transform: "translateY(-2px)",
      boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
    },
    buttonDisabled: {
      opacity: "0.6",
      cursor: "not-allowed",
      transform: "none"
    },
    tabContainer: {
      marginBottom: "20px",
      borderBottom: "2px solid #e1e8ed"
    },
    tab: {
      padding: "12px 24px",
      backgroundColor: "transparent",
      border: "none",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
      borderRadius: "8px 8px 0 0",
      marginRight: "5px"
    },
    activeTab: {
      backgroundColor: "#3498db",
      color: "white"
    },
    examCard: {
      backgroundColor: "white",
      borderRadius: "10px",
      padding: "20px",
      marginBottom: "15px",
      cursor: "pointer",
      transition: "all 0.3s ease",
      border: "2px solid transparent",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    },
    examCardHover: {
      transform: "translateY(-3px)",
      boxShadow: "0 6px 12px rgba(0,0,0,0.15)",
      borderColor: "#3498db"
    },
    selectedExam: {
      backgroundColor: "#e8f4fd",
      borderColor: "#3498db"
    },
    statusBadge: {
      padding: "4px 12px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "600",
      marginLeft: "10px"
    },
    publishedStatus: {
      backgroundColor: "#d5f4e6",
      color: "#27ae60"
    },
    draftStatus: {
      backgroundColor: "#fef9e7",
      color: "#f39c12"
    },
    questionItem: {
      backgroundColor: "#f8f9fa",
      borderRadius: "10px",
      padding: "20px",
      marginBottom: "15px",
      border: "1px solid #e1e8ed"
    },
    optionItem: {
      padding: "8px 0",
      borderBottom: "1px solid #eee"
    },
    correctOption: {
      color: "#27ae60",
      fontWeight: "600"
    },
    errorBox: {
      backgroundColor: "#ffe6e6",
      color: "#e74c3c",
      padding: "15px",
      borderRadius: "8px",
      marginBottom: "20px",
      border: "1px solid #e74c3c"
    },
    successBox: {
      backgroundColor: "#e6ffe6",
      color: "#27ae60",
      padding: "15px",
      borderRadius: "8px",
      marginBottom: "20px",
      border: "1px solid #27ae60"
    },
    loadingText: {
      textAlign: "center",
      color: "#7f8c8d",
      fontSize: "16px",
      padding: "20px"
    },
    flexBetween: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    },
    grid2: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "20px"
    },
    optionInputContainer: {
      display: "flex",
      alignItems: "center",
      marginBottom: "10px"
    },
    optionInput: {
      flex: "1",
      marginRight: "10px"
    },
    checkbox: {
      marginRight: "8px",
      transform: "scale(1.2)"
    }
  };

  // Fetch exams
  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/exam`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      } else {
        setError("Failed to fetch exams");
      }
    } catch (err) {
      console.error("Failed to fetch exams:", err);
      setError("Network error while fetching exams");
    } finally {
      setLoading(false);
    }
  };

  // Create exam
  const createExam = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/exam`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(examForm),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Exam created successfully!");
        setExamForm({
          event_id: "65a1b2c3d4e5f67890123456",
          examType: "exam",
          title: "",
          description: "",
          duration: 60
        });
        fetchExams();
      } else {
        setError(data.message || "Failed to create exam");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Get exam details with questions
  const getExamDetails = async (examId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/exam/${examId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedExam(data);
        setQuestions(data.questions || []);
      } else {
        setError("Failed to fetch exam details");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Add manual question
  const addManualQuestion = async (examId) => {
    if (!manualQuestionForm.question_text.trim()) {
      alert("Please enter question text");
      return;
    }

    const validOptions = manualQuestionForm.options.filter(opt => opt.trim() !== "");
    if (validOptions.length < 2) {
      alert("Please provide at least 2 non-empty options");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/exam/${examId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          question_text: manualQuestionForm.question_text.trim(),
          options: validOptions,
          correct_answers: manualQuestionForm.correct_answers,
          points: manualQuestionForm.points
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Question added successfully!");
        setManualQuestionForm({
          question_text: "",
          options: ["", "", "", ""],
          correct_answers: [],
          points: 1.0
        });
        getExamDetails(examId);
      } else {
        setError(data.message || "Failed to add question");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Add AI generated questions
  const addAIQuestions = async (examId) => {
    if (!aiQuestionForm.topic.trim()) {
      alert("Please enter a topic");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/exam/${examId}/questions/ai-generated`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(aiQuestionForm),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Successfully added ${data.questions?.length || 0} AI-generated questions!`);
        setAiQuestionForm({
          topic: "",
          quantity: 5,
          difficulty: "medium"
        });
        getExamDetails(examId);
      } else {
        setError(data.message || "Failed to generate AI questions");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Add questions from DOCX
  const addQuestionsFromDocx = async (examId) => {
    if (!docxFile) {
      alert("Please select a DOCX file");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", docxFile);

      const res = await fetch(`${API}/exam/${examId}/questions/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Successfully added ${data.questions?.length || 0} questions from DOCX!`);
        setDocxFile(null);
        const fileInput = document.getElementById('docx-file');
        if (fileInput) fileInput.value = '';
        getExamDetails(examId);
      } else {
        setError(data.message || "Failed to upload DOCX file");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Update question
  const updateQuestion = async (questionId, updates) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/exam/questions/${questionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Question updated successfully!");
        setEditingQuestion(null);
        getExamDetails(selectedExam._id);
      } else {
        setError(data.message || "Failed to update question");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Delete question
  const deleteQuestion = async (questionId) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    setLoading(true);
    try {
      const res = await fetch(`${API}/exam/questions/${questionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        alert("Question deleted successfully!");
        getExamDetails(selectedExam._id);
      } else {
        setError(data.message || "Failed to delete question");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Publish exam
  const publishExam = async (examId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/exam/${examId}/publish`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        alert("Exam published successfully!");
        getExamDetails(examId);
      } else {
        setError(data.message || "Failed to publish exam");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Delete exam
  const deleteExam = async (examId) => {
    if (!confirm("Are you sure you want to delete this exam and all its questions?")) return;

    setLoading(true);
    try {
      const res = await fetch(`${API}/exam/${examId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        alert("Exam deleted successfully!");
        setSelectedExam(null);
        setQuestions([]);
        fetchExams();
      } else {
        setError(data.message || "Failed to delete exam");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Start editing a question
  const startEditingQuestion = (question) => {
    setEditingQuestion({ ...question });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingQuestion(null);
  };

  // Handle edit form change
  const handleEditChange = (field, value) => {
    setEditingQuestion(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle option change in edit form
  const handleEditOptionChange = (index, value) => {
    setEditingQuestion(prev => {
      const newOptions = [...prev.options];
      newOptions[index] = value;
      return { ...prev, options: newOptions };
    });
  };

  // Handle correct answers change
  const handleCorrectAnswersChange = (optionIndex) => {
    const letter = String.fromCharCode(65 + optionIndex);
    setEditingQuestion(prev => {
      const currentAnswers = prev.correct_answers || [];
      const newAnswers = currentAnswers.includes(letter)
        ? currentAnswers.filter(a => a !== letter)
        : [...currentAnswers, letter];
      return { ...prev, correct_answers: newAnswers };
    });
  };

  // Handle manual question option change
  const handleManualOptionChange = (index, value) => {
    const newOptions = [...manualQuestionForm.options];
    newOptions[index] = value;
    setManualQuestionForm({ ...manualQuestionForm, options: newOptions });
  };

  // Handle manual correct answer toggle
  const handleManualCorrectAnswer = (optionIndex) => {
    const letter = String.fromCharCode(65 + optionIndex);
    setManualQuestionForm(prev => {
      const currentAnswers = prev.correct_answers || [];
      const newAnswers = currentAnswers.includes(letter)
        ? currentAnswers.filter(a => a !== letter)
        : [...currentAnswers, letter];
      return { ...prev, correct_answers: newAnswers };
    });
  };

  useEffect(() => {
    fetchExams();
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Exam Management System</h1>

      {/* Error Display */}
      {error && (
        <div style={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Create Exam Form */}
      <div style={styles.section}>
        <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>Create New Exam</h2>
        <form onSubmit={createExam}>
          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Event ID</label>
              <input
                type="text"
                value={examForm.event_id}
                onChange={(e) => setExamForm({ ...examForm, event_id: e.target.value })}
                style={styles.input}
                required
                placeholder="Enter event ID"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Exam Type</label>
              <select
                value={examForm.examType}
                onChange={(e) => setExamForm({ ...examForm, examType: e.target.value })}
                style={styles.select}
              >
                <option value="exam">Exam</option>
                <option value="discussion">Discussion</option>
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Title</label>
            <input
              type="text"
              value={examForm.title}
              onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
              style={styles.input}
              required
              placeholder="Enter exam title"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              value={examForm.description}
              onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
              style={styles.textarea}
              placeholder="Enter exam description"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Duration (minutes)</label>
            <input
              type="number"
              value={examForm.duration}
              onChange={(e) => setExamForm({ ...examForm, duration: parseInt(e.target.value) })}
              style={{ ...styles.input, width: "200px" }}
              min="1"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              ...styles.button,
              ...styles.primaryButton,
              ...(loading ? styles.buttonDisabled : {})
            }}
            onMouseOver={(e) => !loading && (e.target.style.transform = styles.buttonHover.transform)}
            onMouseOut={(e) => !loading && (e.target.style.transform = "none")}
          >
            {loading ? "Creating..." : "Create Exam"}
          </button>
        </form>
      </div>

      {/* Exam List */}
      <div style={styles.section}>
        <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>Exams List</h2>
        {loading ? (
          <div style={styles.loadingText}>Loading exams...</div>
        ) : exams.length === 0 ? (
          <div style={styles.loadingText}>No exams found. Create one first.</div>
        ) : (
          <div>
            {exams.map((exam) => (
              <div
                key={exam._id}
                style={{
                  ...styles.examCard,
                  ...(selectedExam?._id === exam._id ? styles.selectedExam : {}),
                }}
                onClick={() => getExamDetails(exam._id)}
                onMouseOver={(e) => e.target.style.transform = styles.examCardHover.transform}
                onMouseOut={(e) => e.target.style.transform = "none"}
              >
                <div style={styles.flexBetween}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: "0 0 10px 0", color: "#2c3e50" }}>
                      {exam.title}
                      <span style={{
                        ...styles.statusBadge,
                        ...(exam.status === "published" ? styles.publishedStatus : styles.draftStatus)
                      }}>
                        {exam.status}
                      </span>
                    </h3>
                    <p style={{ margin: "5px 0", color: "#7f8c8d" }}>{exam.description}</p>
                    <div style={{ color: "#95a5a6", fontSize: "14px" }}>
                      <strong>Type:</strong> {exam.examType} | 
                      <strong> Duration:</strong> {exam.duration}min | 
                      <strong> Event:</strong> {exam.event_id}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteExam(exam._id);
                    }}
                    style={{
                      ...styles.button,
                      ...styles.dangerButton,
                      padding: "8px 16px",
                      fontSize: "12px"
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Exam Details */}
      {selectedExam && (
        <div style={styles.section}>
          <div style={{ ...styles.flexBetween, marginBottom: "25px" }}>
            <div>
              <h2 style={{ margin: "0 0 10px 0", color: "#2c3e50" }}>{selectedExam.title}</h2>
              <p style={{ margin: "5px 0", color: "#7f8c8d" }}>{selectedExam.description}</p>
              <p style={{ color: "#95a5a6" }}>
                <strong>Status:</strong> {selectedExam.status} | 
                <strong> Questions:</strong> {questions.length} | 
                <strong> Type:</strong> {selectedExam.examType} | 
                <strong> Duration:</strong> {selectedExam.duration}min
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={() => publishExam(selectedExam._id)}
                disabled={selectedExam.status === "published" || loading}
                style={{
                  ...styles.button,
                  ...styles.successButton,
                  ...((selectedExam.status === "published" || loading) ? styles.buttonDisabled : {})
                }}
              >
                {selectedExam.status === "published" ? "Published" : "Publish Exam"}
              </button>
              <button 
                onClick={() => deleteExam(selectedExam._id)}
                style={{
                  ...styles.button,
                  ...styles.dangerButton
                }}
              >
                Delete Exam
              </button>
            </div>
          </div>

          {/* Add Question Section */}
          <div style={{ ...styles.section, backgroundColor: "#f8f9fa", padding: "20px" }}>
            <h3 style={{ color: "#2c3e50", marginBottom: "20px" }}>Add Questions</h3>
            
            {/* Question Type Tabs */}
            <div style={styles.tabContainer}>
              {["manual", "ai", "docx"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveQuestionTab(tab)}
                  style={{
                    ...styles.tab,
                    ...(activeQuestionTab === tab ? styles.activeTab : {})
                  }}
                >
                  {tab === "manual" && "Manual Question"}
                  {tab === "ai" && "AI Generated"}
                  {tab === "docx" && "From DOCX"}
                </button>
              ))}
            </div>

            {/* Manual Question Form */}
            {activeQuestionTab === "manual" && (
              <div>
                <h4 style={{ color: "#34495e", marginBottom: "15px" }}>Add Manual Question</h4>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Question Text</label>
                  <textarea
                    value={manualQuestionForm.question_text}
                    onChange={(e) => setManualQuestionForm({ ...manualQuestionForm, question_text: e.target.value })}
                    style={styles.textarea}
                    placeholder="Enter your question here..."
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Options</label>
                  {manualQuestionForm.options.map((option, index) => (
                    <div key={index} style={styles.optionInputContainer}>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleManualOptionChange(index, e.target.value)}
                        style={{ ...styles.input, ...styles.optionInput }}
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      />
                      <label style={{ display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
                        <input
                          type="checkbox"
                          checked={manualQuestionForm.correct_answers?.includes(String.fromCharCode(65 + index))}
                          onChange={() => handleManualCorrectAnswer(index)}
                          style={styles.checkbox}
                        />
                        Correct
                      </label>
                    </div>
                  ))}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Points</label>
                  <input
                    type="number"
                    step="0.5"
                    value={manualQuestionForm.points}
                    onChange={(e) => setManualQuestionForm({ ...manualQuestionForm, points: parseFloat(e.target.value) })}
                    style={{ ...styles.input, width: "150px" }}
                    min="0"
                  />
                </div>

                <button 
                  onClick={() => addManualQuestion(selectedExam._id)}
                  disabled={loading}
                  style={{
                    ...styles.button,
                    ...styles.successButton,
                    ...(loading ? styles.buttonDisabled : {})
                  }}
                >
                  {loading ? "Adding..." : "Add Manual Question"}
                </button>
              </div>
            )}

            {/* AI Question Form */}
            {activeQuestionTab === "ai" && (
              <div>
                <h4 style={{ color: "#34495e", marginBottom: "15px" }}>Generate AI Questions</h4>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Topic</label>
                  <input
                    type="text"
                    value={aiQuestionForm.topic}
                    onChange={(e) => setAiQuestionForm({ ...aiQuestionForm, topic: e.target.value })}
                    style={styles.input}
                    placeholder="Enter topic for AI to generate questions about..."
                  />
                </div>
                
                <div style={styles.grid2}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Quantity</label>
                    <input
                      type="number"
                      value={aiQuestionForm.quantity}
                      onChange={(e) => setAiQuestionForm({ ...aiQuestionForm, quantity: parseInt(e.target.value) })}
                      style={styles.input}
                      min="1"
                      max="20"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Difficulty</label>
                    <select
                      value={aiQuestionForm.difficulty}
                      onChange={(e) => setAiQuestionForm({ ...aiQuestionForm, difficulty: e.target.value })}
                      style={styles.select}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={() => addAIQuestions(selectedExam._id)}
                  disabled={loading}
                  style={{
                    ...styles.button,
                    ...styles.warningButton,
                    ...(loading ? styles.buttonDisabled : {})
                  }}
                >
                  {loading ? "Generating..." : "Generate AI Questions"}
                </button>
              </div>
            )}

            {/* DOCX Upload Form */}
            {activeQuestionTab === "docx" && (
              <div>
                <h4 style={{ color: "#34495e", marginBottom: "15px" }}>Upload DOCX File</h4>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Select DOCX File</label>
                  <input
                    id="docx-file"
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => setDocxFile(e.target.files[0])}
                    style={styles.input}
                  />
                </div>
                
                {docxFile && (
                  <div style={styles.successBox}>
                    Selected file: <strong>{docxFile.name}</strong>
                  </div>
                )}

                <button 
                  onClick={() => addQuestionsFromDocx(selectedExam._id)}
                  disabled={loading || !docxFile}
                  style={{
                    ...styles.button,
                    ...styles.warningButton,
                    ...((loading || !docxFile) ? styles.buttonDisabled : {})
                  }}
                >
                  {loading ? "Uploading..." : "Upload DOCX and Extract Questions"}
                </button>
              </div>
            )}
          </div>

          {/* Questions List with Edit/Delete */}
          <div style={{ marginTop: "30px" }}>
            <h3 style={{ color: "#2c3e50", marginBottom: "20px" }}>
              Questions ({questions.length})
            </h3>
            {questions.length === 0 ? (
              <div style={styles.loadingText}>No questions yet. Add some questions above.</div>
            ) : (
              <div>
                {questions.map((q, index) => (
                  <div key={q._id} style={styles.questionItem}>
                    {editingQuestion && editingQuestion._id === q._id ? (
                      // Edit Form
                      <div>
                        <h4 style={{ color: "#34495e", marginBottom: "15px" }}>
                          Edit Question {index + 1}
                        </h4>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Question Text</label>
                          <textarea
                            value={editingQuestion.question_text}
                            onChange={(e) => handleEditChange("question_text", e.target.value)}
                            style={styles.textarea}
                          />
                        </div>
                        
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Options</label>
                          {editingQuestion.options.map((option, optIndex) => (
                            <div key={optIndex} style={styles.optionInputContainer}>
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => handleEditOptionChange(optIndex, e.target.value)}
                                style={{ ...styles.input, ...styles.optionInput }}
                              />
                              <label style={{ display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
                                <input
                                  type="checkbox"
                                  checked={editingQuestion.correct_answers?.includes(String.fromCharCode(65 + optIndex))}
                                  onChange={() => handleCorrectAnswersChange(optIndex)}
                                  style={styles.checkbox}
                                />
                                Correct
                              </label>
                            </div>
                          ))}
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>Points</label>
                          <input
                            type="number"
                            step="0.5"
                            value={editingQuestion.points}
                            onChange={(e) => handleEditChange("points", parseFloat(e.target.value))}
                            style={{ ...styles.input, width: "150px" }}
                            min="0"
                          />
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                          <button 
                            onClick={() => updateQuestion(q._id, editingQuestion)}
                            disabled={loading}
                            style={{
                              ...styles.button,
                              ...styles.successButton,
                              ...(loading ? styles.buttonDisabled : {})
                            }}
                          >
                            {loading ? "Saving..." : "Save Changes"}
                          </button>
                          <button 
                            onClick={cancelEditing}
                            style={{
                              ...styles.button,
                              ...styles.secondaryButton
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Display Mode
                      <div>
                        <div style={styles.flexBetween}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: "0 0 15px 0", color: "#2c3e50" }}>
                              Q{index + 1}: {q.question_text}
                            </h4>
                            <ul style={{ margin: "15px 0", paddingLeft: "20px" }}>
                              {q.options.map((opt, optIndex) => (
                                <li 
                                  key={optIndex}
                                  style={{
                                    ...styles.optionItem,
                                    ...(q.correct_answers?.includes(String.fromCharCode(65 + optIndex)) 
                                      ? styles.correctOption 
                                      : {})
                                  }}
                                >
                                  <strong>{String.fromCharCode(65 + optIndex)}.</strong> {opt}
                                  {q.correct_answers?.includes(String.fromCharCode(65 + optIndex)) && " ✓"}
                                </li>
                              ))}
                            </ul>
                            <div style={{ color: "#7f8c8d", fontSize: "14px" }}>
                              <strong>Points:</strong> {q.points}
                              {q.correct_answers && q.correct_answers.length > 0 && (
                                <span style={{ marginLeft: "20px" }}>
                                  <strong>Correct Answers:</strong> {q.correct_answers.join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "5px", flexDirection: "column" }}>
                            <button
                              onClick={() => startEditingQuestion(q)}
                              style={{
                                ...styles.button,
                                ...styles.primaryButton,
                                padding: "8px 16px",
                                fontSize: "12px"
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteQuestion(q._id)}
                              style={{
                                ...styles.button,
                                ...styles.dangerButton,
                                padding: "8px 16px",
                                fontSize: "12px"
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}