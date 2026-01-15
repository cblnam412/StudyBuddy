import { Event, EventUser, RoomUser, Document, Room, Message,
    User, ModeratorApplication, UserWarning, ReputationLog, ReputationScore, Exam,
    Question
 } from "../models/index.js";
import { EventService } from "../service/eventService.js"; 
import { UserService } from "../service/userService.js"; 
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const eventService = new EventService(Event, EventUser, RoomUser, Document, Room, Message, User, Exam, Question);
const userService = new UserService(User, ModeratorApplication, UserWarning, Document, EventUser, supabase, ReputationLog, ReputationScore);


export const getEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        if (!eventId) {
            return res.status(400).json({ message: "Thiếu Event ID" });
        }

        const event = await eventService.getEvent(eventId, userId);
        return res.status(200).json(event);
    } catch (error) {
        const status = error.message.includes("Không tìm thấy") ? 404 : 400;
        return res.status(status).json({ message: error.message });
    }
};

export const findEvents = async (req, res) => {
    try {
        const { page, limit, sort, room_id, status, created_by, registered_by } = req.query;

        const filters = { room_id, status };
        const options = { page, limit, sort };

        if (created_by === 'me') {
            filters.created_by = req.user.id;
        } else if (created_by) {
            filters.created_by = created_by;
        }

        if (registered_by === 'me') {
            filters.registered_by = req.user.id;
        } else if (registered_by) {
            filters.registered_by = registered_by;
        }

        Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);
        Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

        const result = await eventService.findEvents(filters, options, req.user.id);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

export const unregisterEvent = async (req, res) => {
    try {
        await eventService.unregisterEvent(req.body, req.user.id);

        return res.status(200).json({
            message: "Huỷ đăng ký tham gia thành công",
        });
    } catch (error) {
        const status = error.message.includes("Không tìm thấy") ? 404 : 400;
        return res.status(status).json({
            message: error.message,
        });
    }
};

export const createEvent = async (req, res) => {

    try {
        const userId = req.user.id;
        const event = await eventService.createEvent(req.body, req.user.id);

        // cộng điểm cho người tạo sự kiện
        await userService.incrementUserReputation(
            userId,
            3,
            `Created event "${event.title}"`,
            "event"
        );

        return res.status(201).json({ message: "Tạo sự kiện thành công", event });

    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

export const cancelEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        console.log("Cancelling event ID:", id, "by user ID:", userId);
        const event = await eventService.cancelEvent(id);

        // trừ điểm cho người tạo sự kiện khi huỷ sự kiện
        await userService.incrementUserReputation(
            userId,
            -3,
            `Cancelled event "${event.title}"`,
            "event"
        );

        return res.status(200).json({ message: "Sự kiện đã được huỷ", event });

    } catch (error) {
        const status = error.message.includes("Không tìm thấy") ? 404 : 400;
        return res.status(status).json({ message: error.message });
    }
};

export const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        await eventService.updateEvent(id, req.body);
        return res.status(200).json({
            message: "Cập nhật sự kiện thành công",
        });
    } catch (error) {
        const status = error.message.includes("Không tìm thấy") ? 404 : 400;
        return res.status(status).json({
            message: error.message,
        });
    }
};

export const registerEvent = async (req, res) => {
    try {
        const record = await eventService.registerEvent(req.body, req.user.id);
        return res.status(201).json({
            message: "Đăng ký tham gia thành công",
            record,
        });
    } catch (error) {
        const status = error.message.includes("Không tìm thấy") ? 404 : 400;
        return res.status(status).json({
            message: error.message,
        });
    }
};

export const attendedEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const data = await eventService.attendedEvent(eventId, req.user.id);

        // Cộng điểm nếu tham gia sự kiện
        await userService.incrementUserReputation(
            req.user.id,
            1,
            `Attended event ID "${eventId}"`,
            "event"
        );

        return res.status(200).json({ message: "Điểm danh thành công!", data });
    } catch (error) {
        if (error.message === "Bạn đã điểm danh tham gia sự kiện này rồi.")
        {
            return res.status(200).json({ message: "Bạn đã điểm danh rồi!" }); 
        }
        const status = error.message.includes("Bạn chưa đăng ký") ? 404 : 400;
        return res.status(status).json({ message: error.message });
    }
};

export const markEventAsCompleted = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await eventService.markEventAsCompleted(eventId);
        return res.status(200).json({
            message: "Đánh dấu sự kiện hoàn thành thành công.",
            event,
        });
    } catch (error) {
        const status = error.message.includes("Không tìm thấy") ? 404 : 400;
        return res.status(status).json({ message: error.message });
    }
};


export const isUserRegistered = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user.id;

        const isRegistered = await eventService.isUserRegistered(eventId, userId);

        return res.status(200).json({
            isRegistered,
            userId,
            eventId
        });
    } catch (error) {
        const status = error.message.includes("Thiếu") ? 400 : 500;
        return res.status(status).json({ message: error.message });
    }
};

export const getEventParticipantCount = async (req, res) => {
    try {
        const { eventId } = req.params;

        const totalParticipants = await eventService.getParticipantCount(eventId);

        res.json({
            message: "Lấy số lượng người tham gia sự kiện thành công.",
            total: totalParticipants
        });
    } catch (error) {
        const status = error.message.includes("Thiếu") ? 400 : 500;
        res.status(status).json({ message: error.message });
    }
};

export const getEventAttendanceRate = async (req, res) => {
    try {
        const { eventId } = req.params;

        const result = await eventService.getEventAttendanceRate(eventId);

        res.json({
            message: "Lấy tỷ lệ tham gia sự kiện thành công.",
            ...result
        });

    } catch (error) {
        res.status(500).json({
            message: error.message || "Lỗi server khi lấy tỷ lệ tham gia sự kiện."
        });
    }
};

export const getEventReport = async (req, res) => {
    try {
        const { eventId } = req.params;
        const result = await eventService.exportEventReportAsDocx(eventId);
        
        const fs = await import('fs');
        const filePath = result.filePath;
        
        const fileContent = fs.readFileSync(filePath);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
        res.status(200).send(fileContent);
        
         fs.unlinkSync(filePath);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getAllEventsReport = async (req, res) => {
    try {
        const filters = {};
        
        if (req.query.status) {
            filters.status = req.query.status;
        }

        const report = await eventService.getAllEventsReport(filters);
        res.status(200).json(report);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getEventMessageStatistics = async (req, res) => {
    try {
        const { eventId } = req.params;
        const stats = await eventService.getMessageStatistics(eventId);
        res.status(200).json(stats);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getEventDocumentStatistics = async (req, res) => {
    try {
        const { eventId } = req.params;
        const stats = await eventService.getDocumentStatistics(eventId);
        res.status(200).json(stats);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const exportEventReport = async (req, res) => {
    let filePath = null;
    try {
        const { eventId } = req.params;
        
        const result = await eventService.exportEventReportAsDocx(eventId);
        filePath = result.filePath;

        const fs = await import('fs');
        
        // Check if file exists before reading
        if (!fs.existsSync(filePath)) {
            throw new Error("File báo cáo không tồn tại sau khi tạo");
        }
        
        const fileContent = fs.readFileSync(filePath);
        
        // Set headers before sending
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
        res.status(200).send(fileContent);
        
        // Clean up file after successful send
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (cleanupError) {
            console.error('Error cleaning up file:', cleanupError);
            // Don't throw - file is already sent
        }
    } catch (error) {
        // Clean up file on error
        if (filePath) {
            try {
                const fs = await import('fs');
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (cleanupError) {
                console.error('Error cleaning up file on error:', cleanupError);
            }
        }
        
        // Ensure we send JSON with proper headers
        if (!res.headersSent) {
            res.status(400).json({ message: error.message });
        } else {
            // If headers already sent, we can't send JSON - log error instead
            console.error('Cannot send error response - headers already sent:', error.message);
        }
    }
};

export const getStreamToken = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user.id;

        const token = await eventService.generateStreamToken(eventId, userId);
        
        return res.status(200).json({ 
            token,
            userId 
        });
    } catch (error) {
        const status = error.message.includes("Không tìm thấy") ? 404 : 
                       error.message.includes("không được phép") ? 403 : 400;
        return res.status(status).json({ message: error.message });
    }
};

export const getEventMessages = async (req, res) => {
  try {
    const { eventId } = req.params;

    const messages = await eventService.getEventMessages(eventId);

    res.json({
      event_id: eventId,
      total: messages.length,
      messages
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEventDocuments = async (req, res) => {
  try {
    const { eventId } = req.params;

    const documents = await eventService.getEventDocuments(eventId);

    res.json({
      event_id: eventId,
      total: documents.length,
      documents
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};