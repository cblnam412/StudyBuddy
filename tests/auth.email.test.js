import request from 'supertest';
import { jest } from '@jest/globals';
import nodemailer from 'nodemailer';
import { app } from '../app.js';
import * as dbHelper from './dbHelper.js';
import { PendingUser } from '../models/index.js';

const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: mockSendMail,
    }),
}));

beforeAll(async () => await dbHelper.connect());
afterEach(async () => {
    await dbHelper.clearDatabase();
    jest.clearAllMocks(); 
});
afterAll(async () => {
    await dbHelper.closeDatabase();
});

async function createPendingUser(overrides = {}) {
    return await PendingUser.create({
        full_name: 'Pending Email User',
        email: 'pending.email@example.com',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        ...overrides
    });
}

describe('Auth SendEmail API (/auth/send-email)', () => {

    it('EID01 - Gửi OTP thành công khi email tồn tại trong pending', async () => {
 
        await createPendingUser({ email: 'existing.pending@example.com' })
        mockSendMail.mockResolvedValueOnce({ messageId: 'test-id' });

        const response = await request(app)
            .post('/auth/send-email')
            .send({ email: 'existing.pending@example.com' });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Mã OTP đã được gửi tới email.');

        const pendingUser = await PendingUser.findOne({ email: 'existing.pending@example.com' });
        expect(pendingUser).not.toBeNull();
        expect(pendingUser.otp).toBeDefined(); 
        expect(pendingUser.otp).toMatch(/^\d{6}$/);

        expect(nodemailer.createTransport).toHaveBeenCalledTimes(1); 
        expect(mockSendMail).toHaveBeenCalledTimes(1);
        expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'existing.pending@example.com', 
            subject: 'Xác thực Email',
            text: expect.stringContaining(`Mã OTP của bạn là: ${pendingUser.otp}`),
        }));
    });

    it('EID02 - Thất bại (400) khi email không tồn tại trong pending', async () => {

        const response = await request(app)
            .post('/auth/send-email')
            .send({ email: 'nonexisting.pending@example.com' });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Chưa nhập thông tin cá nhân hoặc thông tin đã hết hạn');

        expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('EID03 - Thất bại (500) khi lưu OTP vào DB gặp lỗi', async () => {

        await createPendingUser({ email: 'save.error@example.com' });
        mockSendMail.mockResolvedValueOnce({ messageId: 'test-id' });

        const saveMock = jest.spyOn(PendingUser.prototype, 'save').mockImplementation(() => {
            throw new Error('Lỗi save OTP mô phỏng!');
        });

        const response = await request(app)
            .post('/auth/send-email')
            .send({ email: 'save.error@example.com' });

        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBe('Lỗi gửi OTP'); 

        expect(mockSendMail).not.toHaveBeenCalled();

    });

    it('EID04 - Thất bại (500) khi hàm gửi email (nodemailer) gặp lỗi', async () => {

        await createPendingUser({ email: 'send.error@example.com' });

        mockSendMail.mockRejectedValueOnce(new Error('Lỗi gửi email mô phỏng!')); 

        const response = await request(app)
            .post('/auth/send-email')
            .send({ email: 'send.error@example.com' });

        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBe('Lỗi gửi OTP');

        const pendingUser = await PendingUser.findOne({ email: 'send.error@example.com' });
        expect(pendingUser).not.toBeNull();
        expect(pendingUser.otp).toBeDefined(); 

        expect(mockSendMail).toHaveBeenCalledTimes(1);
    });

});