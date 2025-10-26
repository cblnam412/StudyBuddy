import request from 'supertest';
import { jest } from '@jest/globals';
import { app } from '../app.js';
import * as dbHelper from './dbHelper.js';
import { User, Room, RoomUser, Event } from '../models/index.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

let leaderToken, leader, room, event;

beforeAll(async () => await dbHelper.connect());
afterEach(async () => {
    await dbHelper.clearDatabase();
    jest.clearAllMocks();
    jest.restoreAllMocks(); 
});
afterAll(async () => {
    await dbHelper.closeDatabase();
});

beforeEach(async () => {
    leader = await User.create({
        full_name: 'Room Leader',
        email: 'leader@example.com',
        password: '123456',
        faculty: 'SE',
        status: 'active',
        studentId: `student-${Date.now()}` 
    });
    leaderToken = jwt.sign({ id: leader._id, role: leader.system_role }, process.env.JWT_SECRET);

    room = await Room.create({ room_name: 'Test Room', status: 'public' });

    await RoomUser.create({ room_id: room._id, user_id: leader._id, room_role: 'leader' });

    event = await Event.create({
        room_id: room._id,
        user_id: leader._id,
        title: 'Test Event Active',
        description: 'Event to be cancelled',
        start_time: new Date(Date.now() + 100000), 
        end_time: new Date(Date.now() + 200000),
        status: 'upcoming'
    });
});

describe('Event API - Cancel Event (/event/:room_id/:id/cancel)', () => {

    it('UTCID01 - PATCH /event/:room_id/:id/cancel - Hủy event thành công (với quyền leader)', async () => {
        const response = await request(app)
            .patch(`/event/${room._id}/${event._id}/cancel`) 
            .set('Authorization', `Bearer ${leaderToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Sự kiện đã được huỷ');

        const cancelledEvent = await Event.findById(event._id);
        expect(cancelledEvent).not.toBeNull();
        expect(cancelledEvent.status).toBe('cancelled');
    });

    it('UTCID02 - PATCH /event/:room_id/:id/cancel - Thất bại (404) khi event ID không tồn tại', async () => {
        const nonExistentEventId = new mongoose.Types.ObjectId();

        const response = await request(app)
            .patch(`/event/${room._id}/${nonExistentEventId}/cancel`) 
            .set('Authorization', `Bearer ${leaderToken}`);

        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe('Không tìm thấy sự kiện');
    });

    it('UTCID03 - PATCH /event/:room_id/:id/cancel - Thành công (200) ngay cả khi event đã bị hủy trước đó', async () => {
        await Event.findByIdAndUpdate(event._id, { status: 'cancelled' });
        const alreadyCancelledEvent = await Event.findById(event._id);
        expect(alreadyCancelledEvent.status).toBe('cancelled'); 

        const response = await request(app)
            .patch(`/event/${room._id}/${event._id}/cancel`)
            .set('Authorization', `Bearer ${leaderToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Sự kiện đã được huỷ');

        const finalEventState = await Event.findById(event._id);
        expect(finalEventState.status).toBe('cancelled');
    });

    it('UTCID04 - PATCH /event/:room_id/:id/cancel - Thất bại (500) khi có lỗi DB lúc cập nhật', async () => {
        const updateMock = jest.spyOn(Event, 'findByIdAndUpdate').mockImplementation(() => {
            throw new Error('Lỗi DB mô phỏng!');
        });

        const response = await request(app)
            .patch(`/event/${room._id}/${event._id}/cancel`)
            .set('Authorization', `Bearer ${leaderToken}`);

        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBe('Lỗi khi huỷ sự kiện');

    });

    it('PATCH /event/:room_id/:id/cancel - Thất bại (403) khi không có quyền leader', async () => {

        const regularUser = await User.create({
            full_name: 'Regular User', email: 'regular@example.com', password: '123', faculty: 'IS', status: 'active'
        });

        await RoomUser.create({ room_id: room._id, user_id: regularUser._id, room_role: 'member' });
        const regularToken = jwt.sign({ id: regularUser._id, role: regularUser.system_role }, process.env.JWT_SECRET);

        const response = await request(app)
            .patch(`/event/${room._id}/${event._id}/cancel`)
            .set('Authorization', `Bearer ${regularToken}`); 

        expect(response.statusCode).toBe(403); 
        expect(response.body.message).toMatch(/Chỉ leader mới được thực hiện thao tác này/i);

        const unchangedEvent = await Event.findById(event._id);
        expect(unchangedEvent.status).not.toBe('cancelled');
    });

});