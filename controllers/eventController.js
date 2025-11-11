import { Event, EventUser, RoomUser, Document } from "../models/index.js";
import { EventService } from "../service/eventService.js"; 

const eventService = new EventService(Event, EventUser, RoomUser, Document);

export const createEvent = async (req, res) => {
    try {
        const event = await eventService.createEvent(req.body, req.user.id);
        return res.status(201).json({ message: "Tạo sự kiện thành công", event });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

export const cancelEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await eventService.cancelEvent(id);
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
        return res.status(200).json({ message: "Điểm danh thành công!", data });
    } catch (error) {
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

export const getEventReport = async (req, res) => {
    try {
        const { eventId } = req.params;
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        const { reportContent, fileName } = await eventService.getEventReport(eventId, baseUrl);

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(reportContent);

    } catch (error) {
        const status = error.message.includes("Không tìm thấy") ? 404 : 400;
        return res.status(status).json({ message: error.message });
    }
};