import request from 'supertest';
import { jest } from '@jest/globals';
import { app } from '../app.js';
import * as dbHelper from './dbHelper.js';
import { User, PendingUser } from '../models/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'; 

jest.mock('../utils/sendEmail.js', () => ({
    __esModule: true,
    default: jest.fn(() => Promise.resolve(true)),
    sendResetPasswordEmail: jest.fn(() => Promise.resolve()),
}));

beforeAll(async () => await dbHelper.connect());
afterEach(async () => {
    await dbHelper.clearDatabase();
    jest.clearAllMocks();
    jest.restoreAllMocks(); 
});
afterAll(async () => {
    await dbHelper.closeDatabase();
    jest.clearAllMocks(); 
});

async function createActiveUser(overrides = {}) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    return await User.create({
        full_name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        faculty: 'SE',
        status: 'active',
        ...overrides
    });
}

async function createPendingUser(overrides = {}) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    return await PendingUser.create({
        full_name: 'Pending User',
        email: 'pending@example.com',
        password: hashedPassword,
        faculty: 'IS',
        otp: '123456',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), 
        ...overrides
    });
}

describe('Auth API', () => {

    it('POST /auth/login - Đăng nhập thành công', async () => {
        await createActiveUser();
        const response = await request(app)
            .post('/auth/login')
            .send({ emailOrPhone: 'test@example.com', password: 'password123' });
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body.message).toBe('Đăng nhập thành công');
    });


    it('POST /auth/login - Đăng nhập thất bại (tài khoản không tồn tại)', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({ emailOrPhone: 'nonexisting@example.com', password: 'password123' });
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Tài khoản không tồn tại');
    });

    it('POST /auth/login - Đăng nhập thất bại (sai mật khẩu)', async () => {
        await createActiveUser();
        const response = await request(app)
            .post('/auth/login')
            .send({ emailOrPhone: 'test@example.com', password: 'wrongpassword' });
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Sai mật khẩu');
    });

    it('POST /auth/login - Đăng nhập thất bại (tài khoản bị khóa)', async () => {
        await createActiveUser({ status: 'banned' });
        const response = await request(app)
            .post('/auth/login')
            .send({ emailOrPhone: 'test@example.com', password: 'password123' });
        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Tài khoản đang bị khóa');
    });

    it('POST /auth/login - Lỗi 500 (Giả lập lỗi User.findOne)', async () => {
        const findOneMock = jest.spyOn(User, 'findOne').mockImplementation(() => {
            throw new Error('Lỗi DB mô phỏng!');
        });
        const response = await request(app)
            .post('/auth/login')
            .send({ emailOrPhone: 'test@example.com', password: 'password123' });
        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBe('Lỗi server');
    });

    it('POST /auth/login - Lỗi 500 (Giả lập lỗi bcrypt.compare)', async () => {
        await createActiveUser();
        const bcryptMock = jest.spyOn(bcrypt, 'compare').mockImplementation(() => {
            throw new Error('Lỗi bcrypt mô phỏng!');
        });
        const response = await request(app)
            .post('/auth/login')
            .send({ emailOrPhone: 'test@example.com', password: 'password123' });
        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBe('Lỗi server');
    });

    it('POST /auth/login - Lỗi 500 (Giả lập lỗi jwt.sign)', async () => {
        await createActiveUser();
        const signMock = jest.spyOn(jwt, 'sign').mockImplementation(() => {
            throw new Error('Lỗi JWT mô phỏng!');
        });
        const response = await request(app)
            .post('/auth/login')
            .send({ emailOrPhone: 'test@example.com', password: 'password123' });
        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBe('Lỗi server');
    });


    it('POST /auth/verify-otp-register - Xác thực OTP và tạo user thành công', async () => {
        await createPendingUser();
        const response = await request(app)
            .post('/auth/verify-otp-register')
            .send({ email: 'pending@example.com', otp: '123456' });
        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe('Tạo tài khoản thành công');
        const newUser = await User.findOne({ email: 'pending@example.com' });
        const pendingUser = await PendingUser.findOne({ email: 'pending@example.com' });
        expect(newUser).not.toBeNull();
        expect(newUser.full_name).toBe('Pending User');
        expect(pendingUser).toBeNull();
    });

    it('POST /auth/verify-otp-register - Thất bại (email không tồn tại trong pending)', async () => {
        const response = await request(app)
            .post('/auth/verify-otp-register')
            .send({ email: 'nonexisting@example.com', otp: '123456' });
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Thông tin đã hết hạn hoặc chưa nhập thông tin cá nhân');
    });

    it('POST /auth/verify-otp-register - Thất bại (sai OTP)', async () => {
        await createPendingUser();
        const response = await request(app)
            .post('/auth/verify-otp-register')
            .send({ email: 'pending@example.com', otp: '654321' });
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Mã OTP không đúng');
        const newUser = await User.findOne({ email: 'pending@example.com' });
        const pendingUser = await PendingUser.findOne({ email: 'pending@example.com' });
        expect(newUser).toBeNull();
        expect(pendingUser).not.toBeNull();
    });

    it('POST /auth/verify-otp-register - Lỗi 500 (Giả lập lỗi User.prototype.save)', async () => {
        await createPendingUser();
        const saveMock = jest.spyOn(User.prototype, 'save').mockImplementation(() => {
            throw new Error('Lỗi lưu DB mô phỏng!');
        });
        const response = await request(app)
            .post('/auth/verify-otp-register')
            .send({ email: 'pending@example.com', otp: '123456' });
        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBe('Lỗi server');
    });

    it('POST /auth/verify-otp-register - Lỗi 500 (Giả lập lỗi PendingUser.deleteOne)', async () => {
        await createPendingUser();

        const deleteMock = jest.spyOn(PendingUser, 'deleteOne').mockImplementation(() => {
            throw new Error('Lỗi xóa PendingUser mô phỏng!');
        });

        const response = await request(app)
            .post('/auth/verify-otp-register')
            .send({ email: 'pending@example.com', otp: '123456' });

        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBe('Lỗi server');


        const newUser = await User.findOne({ email: 'pending@example.com' });
        expect(newUser).not.toBeNull();
    });

    it('POST /auth/verify-otp-register - Lỗi 500 (Giả lập lỗi PendingUser.findOne)', async () => {
        const findPendingMock = jest.spyOn(PendingUser, 'findOne').mockImplementation(() => {
            throw new Error('Lỗi tìm PendingUser mô phỏng!');
        });
        const response = await request(app)
            .post('/auth/verify-otp-register')
            .send({ email: 'pending@example.com', otp: '123456' });
        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBe('Lỗi server');
    });

});