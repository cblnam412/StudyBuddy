const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({
    sendMail: mockSendMail,
}));

jest.mock('nodemailer', () => ({
    createTransport: mockCreateTransport,
}));

import request from 'supertest';
import { jest } from '@jest/globals';
import { app } from '../app.js';
import * as dbHelper from './dbHelper.js';
import { PendingUser } from '../models/index.js';
import nodemailer from 'nodemailer';

describe('Auth SendEmail API (/auth/send-email)', () => {
    beforeAll(async () => await dbHelper.connect());
    afterEach(async () => {
        await dbHelper.clearDatabase();
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });
    afterAll(async () => await dbHelper.closeDatabase());

    it('EID01 - Gửi OTP thành công khi email tồn tại trong pending', async () => {
        const pendingUser = await PendingUser.create({
            email: 'existing.pending@example.com',
            full_name: 'Test User',
        });

        mockSendMail.mockResolvedValue({ accepted: ['existing.pending@example.com'] });

        const res = await request(app)
            .post('/auth/send-email')
            .send({ email: 'existing.pending@example.com' });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Mã OTP đã được gửi tới email.');

        const updatedPending = await PendingUser.findById(pendingUser._id);
        expect(updatedPending.otp).toMatch(/^\d{6}$/);
    });

    it('EID02 - Thất bại (400) khi email không tồn tại trong pending', async () => {
        const res = await request(app)
            .post('/auth/send-email')
            .send({ email: 'notfound@example.com' });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('Chưa nhập thông tin cá nhân hoặc thông tin đã hết hạn');
        expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('EID03 - Thất bại (500) khi lưu OTP vào DB gặp lỗi', async () => {
        jest.spyOn(PendingUser, 'findOne').mockResolvedValueOnce({
            email: 'test@example.com',
            save: jest.fn(() => { throw new Error('Lỗi ghi DB mô phỏng'); }),
        });

        const res = await request(app)
            .post('/auth/send-email')
            .send({ email: 'test@example.com' });

        expect(res.statusCode).toBe(500);
        expect(res.body.message).toBe('Lỗi gửi OTP');
    });

    it('EID04 - Thất bại (500) khi gửi email OTP', async () => {
        jest.spyOn(PendingUser, 'findOne').mockResolvedValueOnce({
            email: 'test@example.com',
            save: jest.fn(() => { throw new Error('Lỗi ghi DB mô phỏng'); }),
        });

        const res = await request(app)
            .post('/auth/send-email')
            .send({ email: 'test@example.com' });

        expect(res.statusCode).toBe(500);
        expect(res.body.message).toBe('Lỗi gửi OTP');
    });
});
