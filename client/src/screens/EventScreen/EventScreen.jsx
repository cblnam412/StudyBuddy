import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import styles from "./EventScreen.module.css";
import { toast } from "react-toastify";
import { Button } from "../../components/Button/Button";
import {
  Calendar,
  Info,
  Send,
  Paperclip,
  FilePlusCorner,
  Sparkles,
  Upload,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  ChartColumn,
  Download,
} from "lucide-react";
import io from "socket.io-client";

const API_BASE_URL = "http://localhost:3000";
const SOCKET_URL = "http://localhost:3000";

export default function EventScreen() {
  const { eventId: urlEventId } = useParams();
  const { accessToken, userInfo, userID } = useAuth();
  const navigate = useNavigate();

  // Event ID Input State
  const [eventIdInput, setEventIdInput] = useState("");
  const [validatedEventId, setValidatedEventId] = useState(urlEventId || null);
  const [isValidating, setIsValidating] = useState(false);

  // Sync validatedEventId with URL params
  useEffect(() => {
    if (urlEventId) {
      setValidatedEventId(urlEventId);
    }
  }, [urlEventId]);

  // Event Room State
  const [eventData, setEventData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsMap, setParticipantsMap] = useState({});
  const [isLoading, setIsLoading] = useState(!!urlEventId);
  const [isOwner, setIsOwner] = useState(false);
  const [exams, setExams] = useState([]);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTypingUser, setIsTypingUser] = useState(null);

  // Exam Creation State
  const [showExamModal, setShowExamModal] = useState(false);
  const [currentExamId, setCurrentExamId] = useState(null);
  const [examTitle, setExamTitle] = useState("");
  const [examDuration, setExamDuration] = useState(30);
  const [examType, setExamType] = useState("exam"); // "exam" or "discussion"
  const [questions, setQuestions] = useState([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [isModifyingExistingExam, setIsModifyingExistingExam] = useState(false);

  // UI State
  const [showParticipants, setShowParticipants] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showExamDetailModal, setShowExamDetailModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [isLoadingExam, setIsLoadingExam] = useState(false);
  
  // Exam Taking State
  const [showTakingExamModal, setShowTakingExamModal] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionId: "option" }
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  
  // Exam Result State
  const [showResultModal, setShowResultModal] = useState(false);
  const [examResult, setExamResult] = useState(null);

  // Statistics Modal State
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  const [statisticsData, setStatisticsData] = useState(null);
  const [isLoadingStatistics, setIsLoadingStatistics] = useState(false);

  // Refs
  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const docxInputRef = useRef(null);

  // Validate Event ID
  const handleValidateEventId = async () => {
    const id = eventIdInput.trim();
    if (!id) {
      toast.error("Vui lòng nhập ID sự kiện");
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/event/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json();

      if (response.ok && data) {
        navigate(`/user/event/${id}`);
      } else {
        // Check if it's a MongoDB ObjectId casting error
        if (data.message && data.message.includes("Cast to ObjectId")) {
          toast.error("ID sự kiện sai định dạng");
        } else {
          toast.error(data.message || "ID sự kiện không hợp lệ");
        }
      }
    } catch (error) {
      toast.error("Không thể kết nối đến server");
    } finally {
      setIsValidating(false);
    }
  };

  // Fetch Event Data
  useEffect(() => {
    if (!validatedEventId || !accessToken) return;

    const fetchEventData = async () => {
      setIsLoading(true);
      try {
        const [eventRes, messagesRes, examsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/event/${validatedEventId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch(`${API_BASE_URL}/event/${validatedEventId}/messages`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch(`${API_BASE_URL}/exam?event_id=${validatedEventId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);

        const eventData = await eventRes.json();
        const messagesData = await messagesRes.json();

        if (eventRes.ok && eventData) {
          // Check if event status is "ongoing" (owners can join completed events)
          const isHost = eventData.user_id._id === userID;
          if (eventData.status !== "ongoing" && !(isHost && eventData.status === "completed")) {
            toast.error(`Sự kiện này ${eventData.status === "upcoming" ? "chưa bắt đầu" : eventData.status === "completed" ? "đã kết thúc" : "đã bị hủy"}. Bạn không thể tham gia lúc này.`);
            setValidatedEventId(null);
            navigate("/user");
            return;
          }

          // Check if user is registered for the event
          // Support both userStatus.isRegistered and top-level isUserRegistered
          const isRegistered = eventData.userStatus?.isRegistered ?? eventData.isUserRegistered ?? false;
          
          if (!isRegistered) {
            toast.error("Bạn chưa đăng ký tham gia sự kiện này. Vui lòng đăng ký trước khi tham gia.");
            setValidatedEventId(null);
            navigate("/user");
            return;
          }

          setEventData(eventData);
          // Extract participants from event response
          const participantsList = eventData.participants || [];
          setParticipants(participantsList);
          
          // Build participants map for quick lookup
          const pMap = {};
          participantsList.forEach(p => {
            if (p.user_id) {
              pMap[p.user_id.full_name] = p.user_id;
            }
          });
          setParticipantsMap(pMap);
          
          setIsOwner(isHost);

          // Mark user as attended
          try {
            await fetch(`${API_BASE_URL}/event/${eventData.room_id}/${validatedEventId}/attend`, {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}` },
            });
          } catch (error) {
            console.error("Error marking attendance:", error);
            // Don't block user from entering if attendance fails
          }
        }


        if (messagesRes.ok && messagesData) {
          setMessages(messagesData.messages || []);
        }
        
        if (examsRes.ok) {
          const examsData = await examsRes.json();
          setExams(Array.isArray(examsData) ? examsData : []);
        }
      } catch (error) {
        toast.error("Không thể tải thông tin sự kiện");
        setValidatedEventId(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventData();
  }, [validatedEventId, accessToken, userInfo]);

  // Socket Connection
  useEffect(() => {
    if (!accessToken || !validatedEventId || !eventData?.room_id) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ["websocket"],
    });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("room:join", eventData.room_id);
    });

    socketRef.current.on("room:new_message", (data) => {
      if (data.event_id && data.event_id.toString() === validatedEventId.toString()) {
        // Normalize socket response to match API response structure
        const normalizedMessage = {
          ...data,
          user_id: {
            _id: data.user_id,
            full_name: data.user_name,
            avatarUrl: data.user_avatar
          }
        };
        setMessages((prev) => [...prev, normalizedMessage]);
        scrollToBottom();
      }
    });

    socketRef.current.on("room:user_typing", ({ user_name, room_id }) => {
      if (room_id === eventData.room_id) setIsTypingUser(user_name);
    });

    socketRef.current.on("room:user_stop_typing", ({ room_id }) => {
      if (room_id === eventData.room_id) setIsTypingUser(null);
    });

    return () => socketRef.current?.disconnect();
  }, [accessToken, validatedEventId, eventData]);

  const scrollToBottom = () => {
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !validatedEventId) return;

    if (socketRef.current) {
      socketRef.current.emit("room:message", {
        roomId: eventData?.room_id,
        content: inputText,
        reply_to: null,
        eventId: validatedEventId,
      });
      socketRef.current.emit("room:stop_typing", eventData?.room_id);
    }
    setInputText("");
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (socketRef.current && eventData?.room_id) {
      e.target.value.length > 0
        ? socketRef.current.emit("room:typing", eventData.room_id)
        : socketRef.current.emit("room:stop_typing", eventData.room_id);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("roomId", eventData?.room_id);
    formData.append("eventId", validatedEventId);

    try {
      const res = await fetch(`${API_BASE_URL}/document/upload`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await res.json();
      if (res.ok) {
        if (socketRef.current) {
          socketRef.current.emit("room:message", {
            roomId: eventData.room_id,
            content: data.url,
            reply_to: null,
            eventId: validatedEventId,
          });
        }
        toast.success("Upload file thành công!");
      } else {
        toast.error(`Lỗi upload: ${data.message}`);
      }
    } catch (err) {
      toast.error("Không thể upload file");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  const handleAddManualQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now(),
        question: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
      },
    ]);
  };

  const handleQuestionChange = (id, field, value) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const handleOptionChange = (qId, optionIndex, value) => {
    setQuestions(
      questions.map((q) =>
        q.id === qId
          ? {
              ...q,
              options: q.options.map((opt, idx) =>
                idx === optionIndex ? value : opt
              ),
            }
          : q
      )
    );
  };

  const handleRemoveQuestion = (id) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  // Create exam when modal opens
  const handleOpenExamModal = async () => {
    if (!examTitle.trim()) {
      setExamTitle("Bài kiểm tra mới");
    }

    setIsCreatingExam(true);
    setIsModifyingExistingExam(false); // Mark as new exam
    try {
      const response = await fetch(`${API_BASE_URL}/exam`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: validatedEventId,
          examType: examType,
          title: examTitle.trim() || "Bài kiểm tra mới",
          description: "Bài kiểm tra",
          duration: examDuration,
        }),
      });

      const data = await response.json();

      if (response.ok && data._id) {
        setCurrentExamId(data._id);
        setShowExamModal(true);
      } else {
        toast.error(data.message || "Không thể tạo bài kiểm tra");
      }
    } catch (error) {
      console.error("Error creating exam:", error);
      toast.error("Không thể tạo bài kiểm tra");
    } finally {
      setIsCreatingExam(false);
    }
  };

  // Handle closing modal - delete exam if not completed
  const handleCloseExamModal = async () => {
    // Only delete if it's a new exam draft (not modifying existing)
    if (currentExamId && !isModifyingExistingExam) {
      try {
        // Delete the exam since it wasn't completed
        await fetch(`${API_BASE_URL}/exam/${currentExamId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        toast.info("Đã hủy tạo bài kiểm tra");
      } catch (error) {
        console.error("Error deleting exam:", error);
      }
    }

    // Reset all state
    setShowExamModal(false);
    setCurrentExamId(null);
    setExamTitle("");
    setExamDuration(30);
    setExamType("exam");
    setQuestions([]);
    setAiPrompt("");
    setIsModifyingExistingExam(false);
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Vui lòng nhập prompt để AI tạo câu hỏi");
      return;
    }

    if (!currentExamId) {
      toast.error("Vui lòng tạo bài kiểm tra trước");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/exam/${currentExamId}/questions/ai-generated`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic: aiPrompt,
            quantity: 5,
            difficulty: "medium",
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.questions) {
        // Convert backend format to frontend format
        const baseTimestamp = Date.now();
        const generatedQuestions = data.questions
          .filter(q => q && q.question_text && q.options && q.options.length > 0)
          .map((q, idx) => {
            // Find the actual correct answer text
            let correctIndex = 0;
            if (q.correct_answers && q.correct_answers.length > 0) {
              const correctAnswerText = q.correct_answers[0];
              const foundIndex = q.options.indexOf(correctAnswerText);
              if (foundIndex !== -1) {
                correctIndex = foundIndex;
              }
            }
            return {
              id: baseTimestamp + idx * 100,
              question: q.question_text,
              options: q.options,
              correctAnswer: correctIndex,
            };
          });

        setQuestions([...questions, ...generatedQuestions]);
        toast.success(`Đã tạo ${generatedQuestions.length} câu hỏi từ AI`);
        setAiPrompt("");
      } else {
        toast.error(data.message || "Không thể tạo câu hỏi từ AI");
      }
    } catch (error) {
      console.error("Error generating AI questions:", error);
      toast.error("Không thể tạo câu hỏi từ AI");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDocxUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!currentExamId) {
      toast.error("Vui lòng tạo bài kiểm tra trước");
      if (docxInputRef.current) docxInputRef.current.value = null;
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `${API_BASE_URL}/exam/${currentExamId}/questions/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok && data.questions) {
        // Convert backend format to frontend format
        const parsedQuestions = data.questions.map((q, idx) => ({
          id: Date.now() + idx,
          question: q.question_text,
          options: q.options,
          correctAnswer: 0, // Default to first option since DOCX doesn't have correct answers
        }));

        setQuestions([...questions, ...parsedQuestions]);
        toast.success(`Đã import ${parsedQuestions.length} câu hỏi từ DOCX`);
      } else {
        toast.error(data.message || "Không thể đọc file DOCX");
      }
    } catch (error) {
      console.error("Error uploading DOCX:", error);
      toast.error("Không thể đọc file DOCX");
    } finally {
      if (docxInputRef.current) docxInputRef.current.value = null;
    }
  };

  const handleCreateExam = async () => {
    if (!currentExamId) {
      toast.error("Không tìm thấy ID bài kiểm tra");
      return;
    }

    if (questions.length === 0) {
      toast.error("Vui lòng thêm ít nhất một câu hỏi");
      return;
    }

    try {
      // Update exam basic info
      await fetch(`${API_BASE_URL}/exam/${currentExamId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: examTitle.trim(),
          duration: examDuration,
          examType: examType,
        }),
      });

      if (isModifyingExistingExam) {
        // MODIFY MODE: Update or add questions
        toast.info("Đang cập nhật câu hỏi...");
        
        // Get existing question IDs from examQuestions
        const existingQuestionIds = examQuestions.map(q => q._id);
        const currentQuestionIds = questions.map(q => q.id).filter(id => id && typeof id === 'string' && id.length === 24);
        
        // Delete removed questions
        const questionsToDelete = existingQuestionIds.filter(id => !currentQuestionIds.includes(id));
        for (const qId of questionsToDelete) {
          try {
            await fetch(`${API_BASE_URL}/exam/questions/${qId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${accessToken}` },
            });
          } catch (error) {
            console.error("Error deleting question:", error);
          }
        }
        
        // Update or add questions
        let successCount = 0;
        for (const q of questions) {
          try {
            if (!q.question || !q.question.trim()) continue;
            if (!q.options || q.options.length < 2) continue;
            if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) continue;
            
            const correctAnswerText = q.options[q.correctAnswer];
            const questionData = {
              question_text: q.question.trim(),
              options: q.options.filter(opt => opt.trim()),
              correct_answers: [correctAnswerText],
              points: 1,
            };
            
            if (q.id && typeof q.id === 'string' && q.id.length === 24) {
              // Update existing question
              const response = await fetch(`${API_BASE_URL}/exam/questions/${q.id}`, {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(questionData),
              });
              if (response.ok) successCount++;
            } else {
              // Add new question
              const response = await fetch(`${API_BASE_URL}/exam/${currentExamId}/questions`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(questionData),
              });
              if (response.ok) successCount++;
            }
          } catch (error) {
            console.error("Error updating/adding question:", error);
          }
        }
        
        toast.success(`Cập nhật bài kiểm tra thành công với ${successCount} câu hỏi!`);
      } else {
        // CREATE MODE: Add all questions
        toast.info("Đang thêm câu hỏi...");

        let successCount = 0;
        for (const q of questions) {
          try {
            if (!q.question || !q.question.trim()) continue;
            if (!q.options || q.options.length < 2) continue;
            if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) continue;
            
            const correctAnswerText = q.options[q.correctAnswer];
            
            const questionResponse = await fetch(
              `${API_BASE_URL}/exam/${currentExamId}/questions`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  question_text: q.question.trim(),
                  options: q.options.filter(opt => opt.trim()),
                  correct_answers: [correctAnswerText],
                  points: 1,
                }),
              }
            );

            if (questionResponse.ok) {
              successCount++;
            }
          } catch (error) {
            console.error("Error adding question:", error);
          }
        }

        if (successCount === 0) {
          toast.error("Không thể thêm câu hỏi. Đang xóa bài kiểm tra...");
          await fetch(`${API_BASE_URL}/exam/${currentExamId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          setShowExamModal(false);
          setCurrentExamId(null);
          setExamTitle("");
          setExamDuration(30);
          setExamType("exam");
          setQuestions([]);
          setIsModifyingExistingExam(false);
          return;
        }

        toast.success(`Tạo bài kiểm tra thành công với ${successCount} câu hỏi!`);
        
        // Publish exam after creation
        try {
          const publishResponse = await fetch(
            `${API_BASE_URL}/exam/${currentExamId}/publish`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          
          if (publishResponse.ok) {
            console.log("Exam published successfully");
          }
        } catch (publishError) {
          console.error("Error publishing exam:", publishError);
        }
        
        // Send exam notification via socket
        if (socketRef.current && eventData?.room_id) {
          socketRef.current.emit("room:message", {
            roomId: eventData.room_id,
            content: `EXAM:${currentExamId}:${examTitle}`,
            reply_to: null,
            eventId: validatedEventId,
          });
        }
      }
      
      // Refresh exams list
      try {
        const examsRes = await fetch(
          `${API_BASE_URL}/exam?event_id=${validatedEventId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (examsRes.ok) {
          const examsData = await examsRes.json();
          setExams(Array.isArray(examsData) ? examsData : []);
        }
      } catch (error) {
        console.error("Error refreshing exams:", error);
      }
      
      // Reset state
      setShowExamModal(false);
      setCurrentExamId(null);
      setExamTitle("");
      setExamDuration(30);
      setExamType("exam");
      setQuestions([]);
      setIsModifyingExistingExam(false);
    } catch (error) {
      console.error("Error completing exam:", error);
      toast.error("Không thể hoàn tất bài kiểm tra");
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isImageUrl = (url) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  const isExamMessage = (content) => {
    return content && content.startsWith("EXAM:");
  };

  const parseExamMessage = (content) => {
    if (!isExamMessage(content)) return null;
    const parts = content.split(":");
    return {
      examId: parts[1],
      examTitle: parts.slice(2).join(":"),
    };
  };

  const getRandomColor = (name) => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA07A",
      "#98D8C8",
      "#F7DC6F",
    ];
    const index = name?.charCodeAt(0) % colors.length || 0;
    return colors[index];
  };

  // Handle opening exam detail modal
  const handleOpenExamDetail = async (examId) => {
    if (!examId) return;
    
    setIsLoadingExam(true);
    try {
      const response = await fetch(`${API_BASE_URL}/exam/${examId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json();

      if (response.ok) {
        setSelectedExam(data);
        setExamQuestions(data.questions || []);
        setShowExamDetailModal(true);
      } else {
        toast.error(data.message || "Không thể tải bài kiểm tra");
      }
    } catch (error) {
      toast.error("Không thể kết nối đến server");
    } finally {
      setIsLoadingExam(false);
    }
  };

  const handleCloseExamDetail = () => {
    setShowExamDetailModal(false);
    setSelectedExam(null);
    setExamQuestions([]);
  };

  const isExamAvailable = (exam) => {
    if (!exam || !exam.createdAt || !exam.duration) return false;
    
    const createdAt = new Date(exam.createdAt);
    const durationMs = exam.duration * 60 * 1000; // Convert minutes to milliseconds
    const expirationTime = new Date(createdAt.getTime() + durationMs);
    const now = new Date();
    
    return now <= expirationTime;
  };

  const handleTakeExam = () => {
    if (!selectedExam) return;
    
    if (!isExamAvailable(selectedExam)) {
      toast.error("Bài kiểm tra đã hết thời gian");
      return;
    }
    
    if (!examQuestions || examQuestions.length === 0) {
      toast.error("Bài kiểm tra không có câu hỏi");
      return;
    }
    
    // Just close detail modal, keeping examQuestions and selectedExam
    setShowExamDetailModal(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowTakingExamModal(true);
  };

  const handleCloseTakingExam = () => {
    if (Object.keys(selectedAnswers).length > 0) {
      const confirm = window.confirm("Bạn có chắc muốn thoát? Câu trả lời chưa được lưu sẽ bị mất.");
      if (!confirm) return;
    }
    setShowTakingExamModal(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
  };

  const handleSelectAnswer = (questionId, option) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < examQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleSubmitExam = async () => {
    // Check if all questions are answered
    const unansweredCount = examQuestions.filter(
      q => !selectedAnswers[q._id]
    ).length;

    if (unansweredCount > 0) {
      const confirm = window.confirm(
        `Bạn còn ${unansweredCount} câu chưa trả lời. Bạn có chắc muốn nộp bài?`
      );
      if (!confirm) return;
    }

    setIsSubmittingExam(true);
    try {
      // Send selected option text as-is
      const answers = Object.entries(selectedAnswers).map(([questionId, selectedAnswer]) => {
        return {
          questionId,
          selectedAnswer: selectedAnswer
        };
      });

      const response = await fetch(
        `${API_BASE_URL}/exam/${selectedExam._id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ answers }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Không thể nộp bài");
      }

      const result = await response.json();
      
      // Close taking modal and show result
      setShowTakingExamModal(false);
      setExamResult(result);
      setShowResultModal(true);
      
      // Reset taking state
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
    } catch (error) {
      console.error("Error submitting exam:", error);
      toast.error(error.message || "Không thể nộp bài");
    } finally {
      setIsSubmittingExam(false);
    }
  };

  const handleCloseResult = () => {
    setShowResultModal(false);
    setExamResult(null);
    // Clear exam-related state
    setSelectedExam(null);
    setExamQuestions([]);
  };

  const handleModifyExam = () => {
    if (!selectedExam) return;
    
    // Close exam detail modal and open exam creation modal with existing data
    setShowExamDetailModal(false);
    setIsModifyingExistingExam(true); // Mark as modifying existing exam
    setCurrentExamId(selectedExam._id);
    setExamTitle(selectedExam.title);
    setExamDuration(selectedExam.duration);
    setExamType(selectedExam.examType);
    setQuestions(
      examQuestions.map((q) => {
        // Find the correct answer index by matching the text with options
        let correctIndex = 0;
        if (q.correct_answers && q.correct_answers.length > 0) {
          const correctAnswerText = q.correct_answers[0];
          const foundIndex = q.options?.indexOf(correctAnswerText);
          if (foundIndex !== -1 && foundIndex !== undefined) {
            correctIndex = foundIndex;
          }
        }
        
        return {
          id: q._id,
          question: q.question_text,
          options: q.options || ["", "", "", ""],
          correctAnswer: correctIndex,
        };
      })
    );
    setShowExamModal(true);
  };

  // Handle opening statistics modal
  const handleOpenStatistics = async (examId) => {
    setIsLoadingStatistics(true);
    setShowStatisticsModal(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/exam/${examId}/statistics`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatisticsData(data);
      } else {
        toast.error("Không thể tải thống kê");
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
      toast.error("Lỗi khi tải thống kê");
    } finally {
      setIsLoadingStatistics(false);
    }
  };

  const handleCloseStatistics = () => {
    setShowStatisticsModal(false);
    setStatisticsData(null);
  };

  // Handle opening statistics for all exams
  const handleOpenAllStatistics = async () => {
    setIsLoadingStatistics(true);
    setShowStatisticsModal(true);
    
    try {
      if (exams.length === 0) {
        toast.info("Không có bài kiểm tra nào trong sự kiện");
        setShowStatisticsModal(false);
        return;
      }
      
      // Fetch results for all exams
      const statisticsPromises = exams.map(exam =>
        fetch(`${API_BASE_URL}/exam/${exam._id}/results`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then(res => res.json())
      );
      
      const allStatistics = await Promise.all(statisticsPromises);
      
      // Combine all statistics - flatten the results array
      const combinedData = {
        examType: "all",
        statistics: allStatistics.flat()
      };
      
      setStatisticsData(combinedData);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      toast.error("Lỗi khi tải thống kê");
    } finally {
      setIsLoadingStatistics(false);
    }
  };

  // Render Event ID Input Screen
  if (!validatedEventId) {
    return (
      <div className={styles.container}>
        <div className={styles.eventIdScreen}>
          <div className={styles.eventIdCard}>
            <div className={styles.iconCircle}>
              <Calendar size={48} />
            </div>
            <h1 className={styles.eventIdTitle}>Tham gia sự kiện</h1>
            <p className={styles.eventIdSubtitle}>
              Nhập ID sự kiện để tham gia
            </p>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>ID Sự kiện</label>
              <input
                type="text"
                className={styles.eventIdInput}
                placeholder="Nhập ID sự kiện"
                value={eventIdInput}
                onChange={(e) => setEventIdInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleValidateEventId()}
              />
            </div>

            <Button
              onClick={handleValidateEventId}
              disabled={isValidating}
            >
              {isValidating ? "Đang kiểm tra..." : "Tham gia sự kiện"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return <div className={styles.loading}>Đang tải...</div>;
  }

  // Main Event Room UI
  return (
    <div className={`${styles.container} ${showParticipants ? styles.sidebarPush : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Calendar size={24} />
          <div>
            <h1 className={styles.eventTitle}>{eventData?.title}</h1>
            <p className={styles.eventSubtitle}>
              {participants.length} thành viên
            </p>
          </div>
        </div>
        <div className={styles.headerRight}>
          {isOwner && (
            <>
              <Button 
                onClick={handleOpenExamModal}
                disabled={isCreatingExam}
                icon={FilePlusCorner}
                hooverColor="#667eea"
              >
              </Button>
              <Button 
                onClick={handleOpenAllStatistics}
                icon={ChartColumn}
                hooverColor="#667eea"
              >
              </Button>
            </>
          )}
          <Button 
            onClick={() => setShowParticipants(!showParticipants)} 
            icon={Info}
            hooverColor="#667eea"
          >
          </Button>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Chat Area */}
        <div className={styles.chatArea}>
          <div className={styles.messagesContainer}>
            {messages.map((msg, idx) => {
              const isCurrentUser = msg.user_id?._id === userID;
              return (
                <div
                  key={idx}
                  className={`${styles.messageWrapper} ${
                    isCurrentUser ? styles.messageRight : styles.messageLeft
                  }`}
                >
                  {!isCurrentUser && (
                    msg.user_id?.avatarUrl ? (
                      <img
                        src={msg.user_id.avatarUrl}
                        alt={msg.user_id.full_name}
                        className={styles.messageAvatar}
                      />
                    ) : (
                      <div
                        className={styles.messageAvatar}
                        style={{
                          backgroundColor: getRandomColor(msg.user_id.full_name),
                        }}
                      >
                        {msg.user_id.full_name?.[0]?.toUpperCase()}
                      </div>
                    )
                  )}
                  <div className={styles.messageContent}>
                    {!isCurrentUser && (
                      <span className={styles.messageSender}>
                        {msg.user_id.full_name}
                      </span>
                    )}
                    {isImageUrl(msg.content) ? (
                      <img
                        src={msg.content}
                        alt="Uploaded"
                        className={styles.messageImage}
                      />
                    ) : isExamMessage(msg.content) ? (
                      <div className={styles.examCard}>
                        <div className={styles.examIcon}>
                          <FilePlusCorner size={24} />
                        </div>
                        <div className={styles.examInfo}>
                          <span className={styles.examName}>
                            {parseExamMessage(msg.content)?.examTitle || "Bài kiểm tra"}
                          </span>
                          <span className={styles.examType}>
                            Bài kiểm tra
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            const examData = parseExamMessage(msg.content);
                            if (examData?.examId) {
                              handleOpenExamDetail(examData.examId);
                            }
                          }}
                          className={styles.takeTestButton}
                        >
                          Làm bài
                        </button>
                      </div>
                    ) : msg.content.startsWith("http") ? (
                      <div className={styles.documentCard}>
                        <div className={styles.documentIcon}>
                          <FilePlusCorner  size={24} />
                        </div>
                        <div className={styles.documentInfo}>
                          <span className={styles.documentName}>
                            {decodeURIComponent(msg.content.split("/").pop())}
                          </span>
                          <span className={styles.documentSize}>
                            Tài liệu
                          </span>
                        </div>
                        <button
                          onClick={() => window.open(msg.content, '_blank')}
                          className={styles.downloadButton}
                        >
                          <Download size={16} />
                          Tải xuống
                        </button>
                      </div>
                    ) : (
                      <p className={styles.messageText}>{msg.content}</p>
                    )}
                    <span className={styles.messageTime}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
            {isTypingUser && (
              <div className={styles.typingIndicator}>
                {participantsMap[isTypingUser]?.avatarUrl ? (
                  <img
                    src={participantsMap[isTypingUser].avatarUrl}
                    alt={isTypingUser}
                    className={styles.typingAvatar}
                  />
                ) : (
                  <div
                    className={styles.typingAvatar}
                    style={{
                      backgroundColor: getRandomColor(isTypingUser),
                    }}
                  >
                    {isTypingUser?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className={styles.typingBubble}>
                  <div className={styles.typingDot}></div>
                  <div className={styles.typingDot}></div>
                  <div className={styles.typingDot}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className={styles.chatFooter}>
            <Button
              className={styles.iconButton}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={20} />
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            <input
              type="text"
              className={styles.chatInput}
              placeholder="Nhập tin nhắn..."
              value={inputText}
              onChange={handleTyping}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <Button className={styles.sendButton} hooverColor="#1E90FF" onClick={handleSendMessage}>
              <Send size={20} />
            </Button>
          </div>
        </div>
      </div>

      {/* Exam Creation Modal */}
      {showExamModal && (
        <div className={styles.modalOverlay} onClick={handleCloseExamModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Tạo bài kiểm tra {currentExamId && <span style={{fontSize: '14px', color: '#666'}}>(ID: {currentExamId.slice(-6)})</span>}</h2>
              <Button
                className={styles.closeButton}
                hooverColor="#EF4444"
                onClick={handleCloseExamModal}
              >
                <X size={24} />
              </Button>
            </div>

            <div className={styles.modalBody}>
              {/* Exam Basic Info Section */}
              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>Thông tin cơ bản</h3>
                
                {/* Exam Title */}
                <div className={styles.formGroup}>
                  <label>Tiêu đề bài kiểm tra <span className={styles.required}>*</span></label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Nhập tiêu đề bài kiểm tra..."
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                  />
                </div>

                {/* Duration and Type in row */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Thời gian (phút) <span className={styles.required}>*</span></label>
                    <input
                      type="number"
                      className={styles.formInput}
                      value={examDuration}
                      onChange={(e) => setExamDuration(parseInt(e.target.value))}
                      min="1"
                      max="180"
                    />
                  </div>

                  {/* Exam Type */}
                  <div className={styles.formGroup}>
                    <label>Loại bài kiểm tra <span className={styles.required}>*</span></label>
                    <select
                      className={styles.formInput}
                      value={examType}
                      onChange={(e) => setExamType(e.target.value)}
                    >
                      <option value="exam">Bài kiểm tra (có điểm)</option>
                      <option value="discussion">Thảo luận (không có điểm)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Question Generation Section */}
              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>Tạo câu hỏi</h3>
                <p className={styles.sectionDescription}>Chọn một trong các phương thức bên dưới để thêm câu hỏi</p>
                
                {/* Action Buttons */}
                <div className={styles.actionButtons}>
                  <Button
                    onClick={() => docxInputRef.current?.click()}
                    icon={Upload}
                    hooverColor="#667eea"
                    disabled={!currentExamId}
                  >
                    Upload DOCX
                  </Button>
                  <Button
                    onClick={handleAddManualQuestion}
                    icon={Plus}
                    hooverColor="#667eea"
                  >
                    Thêm thủ công
                  </Button>
                  <input
                    type="file"
                    ref={docxInputRef}
                    accept=".docx"
                    style={{ display: "none" }}
                    onChange={handleDocxUpload}
                  />
                </div>

                {/* AI Prompt Section */}
                <div className={styles.aiSection}>
                  <label className={styles.aiLabel}>
                    <Sparkles size={16} /> AI tạo câu hỏi
                  </label>
                  <div className={styles.aiInputGroup}>
                    <textarea
                      className={styles.aiPromptInput}
                      placeholder="VD: Tạo 5 câu hỏi về lịch sử Việt Nam thế kỷ 20..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={2}
                      disabled={!currentExamId}
                    />
                    <Button
                      onClick={handleAIGenerate}
                      disabled={isGenerating || !currentExamId || !aiPrompt.trim()}
                      icon={Sparkles}
                      hooverColor="#667eea"
                    >
                      {isGenerating ? "Đang tạo..." : "Tạo câu hỏi"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Manual Question Section */}
              {questions.length > 0 && (
                <div className={styles.formSection}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h3 className={styles.sectionTitle}>Danh sách câu hỏi</h3>
                      <p className={styles.questionCount}>{questions.length} câu hỏi</p>
                    </div>
                  </div>

                  <div className={styles.questionsList}>
                    {questions.map((q, qIdx) => (
                      <QuestionItem
                        key={q.id}
                        question={q}
                        index={qIdx}
                        onQuestionChange={handleQuestionChange}
                        onOptionChange={handleOptionChange}
                        onRemove={handleRemoveQuestion}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Create Button */}
              <div className={styles.modalFooter}>
                {questions.length === 0 && (
                  <p className={styles.emptyQuestionsHint}>
                    💡 Vui lòng thêm ít nhất một câu hỏi để tạo bài kiểm tra
                  </p>
                )}
                <Button
                  onClick={handleCreateExam}
                  disabled={!examTitle.trim() || questions.length === 0}
                  fullwidth
                  hooverColor="#667eea"
                >
                  {questions.length === 0 
                    ? "Chưa có câu hỏi" 
                    : `Tạo bài kiểm tra (${questions.length} câu hỏi)`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Participants Sidebar */}
      <div className={`${styles.participantsSidebar} ${showParticipants ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeaderBar}>
          <h2>Thông tin sự kiện</h2>
          <Button
            className={styles.closeSidebarButton}
            hooverColor="#EF4444"
            onClick={() => setShowParticipants(false)}
          >
            <X size={24} />
          </Button>
        </div>
        <div className={styles.sidebarContent}>
          <div className={styles.eventInfo}>
            <h3>Chi tiết</h3>
            <p><strong>Tiêu đề:</strong> {eventData?.title}</p>
            <p><strong>Mô tả:</strong> {eventData?.description}</p>
            <p><strong>Thời gian bắt đầu:</strong> {new Date(eventData?.start_time).toLocaleString('vi-VN')}</p>
            <p><strong>Thời gian kết thúc:</strong> {new Date(eventData?.end_time).toLocaleString('vi-VN')}</p>
            <p><strong>Số lượng tối đa:</strong> {eventData?.max_participants}</p>
            <p><strong>Trạng thái:</strong> {eventData?.status}</p>
          </div>
          <div className={styles.examsSection}>
            <h3>Bài kiểm tra ({exams.length})</h3>
            <div className={styles.examsList}>
              {exams.length === 0 ? (
                <p className={styles.noExams}>Chưa có bài kiểm tra nào</p>
              ) : (
                exams.map((exam) => (
                  <div key={exam._id} className={styles.examItem}>
                    <div className={styles.examItemIcon}>
                      <FilePlusCorner size={20} />
                    </div>
                    <div className={styles.examItemInfo}>
                      <span className={styles.examItemTitle}>{exam.title}</span>
                      <span className={styles.examItemMeta}>
                        {exam.examType === "exam" ? "Có điểm" : "Thảo luận"} •{" "}
                        {exam.duration} phút •{" "}
                        {exam.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                      </span>
                    </div>
                    <button
                      onClick={() => handleOpenExamDetail(exam._id)}
                      className={styles.examItemButton}
                    >
                      Xem
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className={styles.participantsSection}>
            <h3>Thành viên ({participants.length})</h3>
            <div className={styles.participantsList}>
              {participants.map((member) => (
                <div key={member._id} className={styles.participantItem}>
                  {member.user_id?.avatarUrl ? (
                    <img
                      src={member.user_id.avatarUrl}
                      alt={member.user_id.full_name}
                      className={styles.participantAvatar}
                    />
                  ) : (
                    <div
                      className={styles.participantAvatar}
                      style={{
                        backgroundColor: getRandomColor(member.user_id?.full_name),
                      }}
                    >
                      {member.user_id?.full_name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className={styles.participantInfo}>
                    <span className={styles.participantName}>{member.user_id?.full_name}</span>
                    {member.is_attended && (
                      <span className={styles.attendedBadge}>Đã tham gia</span>
                    )}
                  </div>
                  {member.user_id?._id === eventData?.creator?._id && (
                    <span className={styles.ownerBadge}>Chủ</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {showParticipants && (
        <div 
          className={styles.sidebarOverlay} 
          onClick={() => setShowParticipants(false)}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className={styles.modalOverlay} onClick={() => setShowReportModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Báo cáo sự kiện</h2>
              <Button
                className={styles.closeButton}
                hooverColor="#EF4444"
                onClick={() => setShowReportModal(false)}
              >
                <X size={24} />
              </Button>
            </div>
            <div className={styles.modalBody}>
              <p>Chức năng báo cáo sự kiện sẽ được cập nhật sau.</p>
            </div>
          </div>
        </div>
      )}

      {/* Exam Detail Modal */}
      {showExamDetailModal && selectedExam && (
        <div className={styles.modalOverlay} onClick={handleCloseExamDetail}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{selectedExam.title}</h2>
              <Button
                className={styles.closeButton}
                hooverColor="#EF4444"
                onClick={handleCloseExamDetail}
              >
                <X size={24} />
              </Button>
            </div>
            <div className={styles.modalBody}>
              {isLoadingExam ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p>Đang tải...</p>
                </div>
              ) : (
                <>
                  {/* Exam Info Section */}
                  <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>Thông tin bài kiểm tra</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <p><strong>Loại:</strong> {selectedExam.examType === 'exam' ? 'Bài kiểm tra (có điểm)' : 'Thảo luận (không có điểm)'}</p>
                      <p><strong>Thời gian:</strong> {selectedExam.duration} phút</p>
                      <p><strong>Số câu hỏi:</strong> {examQuestions.length}</p>
                      {selectedExam.description && (
                        <p><strong>Mô tả:</strong> {selectedExam.description}</p>
                      )}
                      <p>
                        <strong>Thời gian còn lại:</strong>{' '}
                        {isExamAvailable(selectedExam) ? (
                          <span style={{ color: '#10b981' }}>Còn thời gian làm bài</span>
                        ) : (
                          <span style={{ color: '#ef4444' }}>Đã hết thời gian</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Questions Preview - Only for owner */}
                  {isOwner && examQuestions.length > 0 && (
                    <div className={styles.formSection}>
                      <h3 className={styles.sectionTitle}>Danh sách câu hỏi ({examQuestions.length})</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {examQuestions.map((q, idx) => (
                          <div key={q._id} style={{ 
                            padding: '12px', 
                            background: 'white', 
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                          }}>
                            <p style={{ fontWeight: '600', marginBottom: '8px' }}>
                              Câu {idx + 1}: {q.question_text}
                            </p>
                            <div style={{ paddingLeft: '12px', fontSize: '14px', color: '#666' }}>
                              {q.options?.map((opt, optIdx) => (
                                <p key={optIdx} style={{ margin: '4px 0' }}>
                                  {String.fromCharCode(65 + optIdx)}. {opt}
                                </p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className={styles.modalFooter}>
                    {isOwner ? (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <Button
                          onClick={handleTakeExam}
                          disabled={!isExamAvailable(selectedExam)}
                          fullwidth
                          hooverColor="#667eea"
                        >
                          {!isExamAvailable(selectedExam)
                            ? 'Đã hết thời gian làm bài'
                            : 'Bắt đầu làm bài'}
                        </Button>
                        <Button
                          onClick={handleModifyExam}
                          fullwidth
                          hooverColor="#667eea"
                        >
                          Chỉnh sửa
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={handleTakeExam}
                        disabled={!isExamAvailable(selectedExam)}
                        fullwidth
                        hooverColor="#667eea"
                      >
                        {!isExamAvailable(selectedExam)
                          ? 'Đã hết thời gian làm bài'
                          : 'Bắt đầu làm bài'}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exam Taking Modal */}
      {showTakingExamModal && selectedExam && examQuestions.length > 0 && (
        <div className={styles.modalOverlay} onClick={handleCloseTakingExam}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{selectedExam.title}</h2>
                <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>
                  Câu {currentQuestionIndex + 1}/{examQuestions.length}
                </p>
              </div>
              <Button
                className={styles.closeButton}
                hooverColor="#EF4444"
                onClick={handleCloseTakingExam}
              >
                <X size={24} />
              </Button>
            </div>

            <div className={styles.modalBody}>
              {/* Current Question */}
              <div className={styles.formSection} style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)', border: '2px solid #3b82f6' }}>
                <h3 className={styles.sectionTitle} style={{ fontSize: '18px', marginBottom: '16px' }}>
                  Câu hỏi {currentQuestionIndex + 1}
                </h3>
                <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '24px', color: '#1a1a1a' }}>
                  {examQuestions[currentQuestionIndex].question_text}
                </p>

                {/* Answer Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {examQuestions[currentQuestionIndex].options?.map((option, optIdx) => {
                    const optionLetter = String.fromCharCode(65 + optIdx);
                    const isSelected = selectedAnswers[examQuestions[currentQuestionIndex]._id] === option;
                    
                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleSelectAnswer(examQuestions[currentQuestionIndex]._id, option)}
                        style={{
                          padding: '16px 20px',
                          background: isSelected ? '#3b82f6' : 'white',
                          color: isSelected ? 'white' : '#1a1a1a',
                          border: isSelected ? '2px solid #2563eb' : '2px solid #e5e7eb',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          fontSize: '15px',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = '#f3f4f6';
                            e.currentTarget.style.borderColor = '#3b82f6';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.borderColor = '#e5e7eb';
                          }
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isSelected ? 'white' : '#f3f4f6',
                            color: isSelected ? '#3b82f6' : '#666',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '14px',
                            flexShrink: 0,
                          }}
                        >
                          {optionLetter}
                        </div>
                        <span style={{ flex: 1 }}>{option}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress Indicator */}
              <div style={{ 
                display: 'flex', 
                gap: '4px', 
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '8px',
                overflowX: 'auto',
                marginTop: '16px'
              }}>
                {examQuestions.map((q, idx) => (
                  <div
                    key={q._id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    style={{
                      minWidth: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      background: selectedAnswers[q._id] 
                        ? '#10b981' 
                        : idx === currentQuestionIndex 
                          ? '#3b82f6' 
                          : '#e5e7eb',
                      color: selectedAnswers[q._id] || idx === currentQuestionIndex ? 'white' : '#666',
                      border: idx === currentQuestionIndex ? '2px solid #2563eb' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    {idx + 1}
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Footer */}
            <div className={styles.modalFooter} style={{ background: 'white', borderTop: '2px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <Button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  hooverColor="#667eea"
                  style={{ 
                    flex: 1,
                    opacity: currentQuestionIndex === 0 ? 0.5 : 1,
                    cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Câu trước
                </Button>
                
                {currentQuestionIndex === examQuestions.length - 1 ? (
                  <Button
                    onClick={handleSubmitExam}
                    disabled={isSubmittingExam}
                    fullwidth
                    hooverColor="#10b981"
                    style={{ flex: 2 }}
                  >
                    {isSubmittingExam ? 'Đang nộp bài...' : 'Nộp bài'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextQuestion}
                    fullwidth
                    hooverColor="#667eea"
                    style={{ flex: 2 }}
                  >
                    Câu tiếp
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exam Result Modal */}
      {showResultModal && examResult && selectedExam && (
        <div className={styles.modalOverlay} onClick={handleCloseResult}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className={styles.modalHeader}>
              <h2>{selectedExam.title}</h2>
              <Button
                className={styles.closeButton}
                hooverColor="#EF4444"
                onClick={handleCloseResult}
              >
                <X size={24} />
              </Button>
            </div>

            <div className={styles.modalBody}>
              {/* Score Display */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                padding: '40px 20px',
                background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                borderRadius: '12px',
                marginBottom: '24px'
              }}>
                {selectedExam.examType === 'exam' ? (
                  <>
                    <div style={{
                      width: '160px',
                      height: '160px',
                      borderRadius: '50%',
                      background: examResult.correctCount / examResult.totalQuestions >= 0.8 
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : examResult.correctCount / examResult.totalQuestions >= 0.5
                          ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                          : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      marginBottom: '24px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
                    }}>
                      <div style={{ fontSize: '48px', fontWeight: '700' }}>
                        {Math.round((examResult.correctCount / examResult.totalQuestions) * 100)}%
                      </div>
                      <div style={{ fontSize: '16px', marginTop: '4px' }}></div>
                    </div>
                    <h3 style={{ 
                      fontSize: '24px', 
                      fontWeight: '700', 
                      color: '#1a1a1a', 
                      margin: '0 0 8px 0' 
                    }}>
                      {examResult.correctCount / examResult.totalQuestions >= 0.8 
                        ? 'Xuất sắc!'
                        : examResult.correctCount / examResult.totalQuestions >= 0.5
                          ? 'Khá tốt!'
                          : 'Cần cố gắng thêm!'}
                    </h3>
                    <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
                      Bạn trả lời đúng {examResult.correctCount}/{examResult.totalQuestions} câu
                    </p>
                  </>
                ) : (
                  <>
                    <div style={{
                      width: '160px',
                      height: '160px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      marginBottom: '24px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                      fontSize: '48px'
                    }}>
                      ✓
                    </div>
                    <h3 style={{ 
                      fontSize: '24px', 
                      fontWeight: '700', 
                      color: '#1a1a1a', 
                      margin: '0 0 8px 0' 
                    }}>
                      Hoàn thành!
                    </h3>
                    <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
                      Đã nộp {examResult.answeredCount} câu trả lời
                    </p>
                  </>
                )}
              </div>

              {/* Answer Review - Only for exam type */}
              {selectedExam.examType === 'exam' && examResult.answers && (
                <div className={styles.formSection}>
                  <h3 className={styles.sectionTitle}>Chi tiết câu trả lời</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {examResult.answers.map((answer, idx) => {
                      const question = examQuestions.find(q => q._id === answer.question_id);
                      if (!question) return null;
                      
                      return (
                        <div key={answer._id} style={{ 
                          padding: '16px', 
                          background: answer.is_correct ? '#f0fdf4' : '#fef2f2',
                          borderRadius: '8px',
                          border: answer.is_correct ? '2px solid #10b981' : '2px solid #ef4444'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a' }}>
                              {idx + 1}. {question.question_text}
                            </span>
                          </div>
                          <div style={{ fontSize: '14px' }}>
                            <p style={{ margin: '4px 0', color: answer.is_correct ? '#059669' : '#dc2626' }}>
                              <strong>Bạn chọn:</strong> {answer.selected_answer}
                            </p>
                            {!answer.is_correct && question.correct_answers && question.correct_answers.length > 0 && (
                              <p style={{ margin: '4px 0', color: '#059669' }}>
                                <strong>Đáp án đúng:</strong> {question.correct_answers.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <Button
                onClick={handleCloseResult}
                fullwidth
                hooverColor="#667eea"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Modal */}
      {showStatisticsModal && (
        <div className={styles.modalOverlay} onClick={handleCloseStatistics}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className={styles.modalHeader}>
              <h2>📊 Thống kê câu trả lời</h2>
              <Button
                className={styles.closeButton}
                hooverColor="#EF4444"
                onClick={handleCloseStatistics}
              >
                <X size={24} />
              </Button>
            </div>

            <div className={styles.modalBody}>
              {isLoadingStatistics ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div className={styles.loadingSpinner}></div>
                  <p style={{ marginTop: '16px', color: '#666' }}>Đang tải thống kê...</p>
                </div>
              ) : statisticsData && statisticsData.statistics && statisticsData.statistics.length > 0 ? (
                <>
                  {/* Summary Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                    padding: '32px',
                    marginBottom: '24px',
                    color: 'white',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
                  }}>
                    <h3 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 16px 0' }}>
                      Tổng quan
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>Tổng câu hỏi</div>
                        <div style={{ fontSize: '32px', fontWeight: '700' }}>{statisticsData.statistics.length}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>Loại bài</div>
                        <div style={{ fontSize: '24px', fontWeight: '600' }}>
                          {statisticsData.examType === 'discussion' ? 'Thảo luận' : 'Kiểm tra'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Questions Statistics */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {statisticsData.statistics.map((stat, index) => {
                      const totalAnswers = stat.totalAnswers || 0;
                      const answerCount = stat.answerCount || {};
                      const maxCount = Object.keys(answerCount).length > 0 
                        ? Math.max(...Object.values(answerCount))
                        : 0;
                      
                      return (
                        <div key={stat.questionId} className={styles.statisticsCard}>
                          <div className={styles.statisticsHeader}>
                            <div className={styles.questionNumberBadge}>
                              Câu {index + 1}
                            </div>
                            <div className={styles.totalAnswersBadge}>
                              {totalAnswers} câu trả lời
                            </div>
                          </div>
                          
                          <h4 className={styles.statisticsQuestionText}>
                            {stat.questionText}
                          </h4>
                          
                          <div className={styles.statisticsOptions}>
                            {stat.options?.map((option, optIdx) => {
                              const count = answerCount[option] || 0;
                              const percentage = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0;
                              const isMaxCount = count === maxCount && count > 0;
                              
                              return (
                                <div key={optIdx} className={styles.statisticsOption}>
                                  <div className={styles.optionHeader}>
                                    <span className={styles.optionLabel}>{String.fromCharCode(65 + optIdx)}. {option}</span>
                                    <span className={styles.optionCount}>
                                      {count} ({percentage.toFixed(1)}%)
                                    </span>
                                  </div>
                                  <div className={styles.progressBarContainer}>
                                    <div 
                                      className={`${styles.progressBar} ${isMaxCount ? styles.progressBarHighlight : ''}`}
                                      style={{ 
                                        width: `${percentage}%`,
                                        background: isMaxCount 
                                          ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                                          : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                                      }}
                                    >
                                      {percentage > 10 && (
                                        <span className={styles.progressBarLabel}>
                                          {percentage.toFixed(0)}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: '#666', fontSize: '16px' }}>Không có dữ liệu thống kê</p>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <Button
                onClick={handleCloseStatistics}
                fullwidth
                hooverColor="#667eea"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Question Item Component
function QuestionItem({
  question,
  index,
  onQuestionChange,
  onOptionChange,
  onRemove,
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={styles.questionItem}>
      <div className={styles.questionHeader}>
        <button
          className={styles.expandButton}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        <span className={styles.questionNumber}>Câu {index + 1}</span>
        <button
          className={styles.removeButton}
          onClick={() => onRemove(question.id)}
        >
          <X size={16} />
        </button>
      </div>

      {isExpanded && (
        <div className={styles.questionBody}>
          <input
            type="text"
            className={styles.questionInput}
            placeholder="Nhập câu hỏi..."
            value={question.question}
            onChange={(e) =>
              onQuestionChange(question.id, "question", e.target.value)
            }
          />

          <div className={styles.optionsGroup}>
            {question.options.map((opt, optIdx) => (
              <div key={optIdx} className={styles.optionItem}>
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={question.correctAnswer === optIdx}
                  onChange={() =>
                    onQuestionChange(question.id, "correctAnswer", optIdx)
                  }
                />
                <input
                  type="text"
                  className={styles.optionInput}
                  placeholder={`Đáp án ${String.fromCharCode(65 + optIdx)}`}
                  value={opt}
                  onChange={(e) =>
                    onOptionChange(question.id, optIdx, e.target.value)
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
