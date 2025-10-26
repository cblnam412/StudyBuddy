import request from 'supertest';
import { jest } from '@jest/globals';
import { app } from '../app.js';
import * as dbHelper from './dbHelper.js';
import { User, Document } from '../models/index.js';
import jwt from 'jsonwebtoken';

// Tạo mock functions trước
const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockFrom = jest.fn();

// Mock supabase
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        storage: {
            from: mockFrom,
        },
    })),
}));

// Import sau khi mock
import { supabase } from '../controllers/documentController.js';

let userToken, user;
const fakeRoomId = '60c72b9a9b1d8e001f8e8b8b';

beforeAll(async () => await dbHelper.connect());
afterEach(async () => {
    await dbHelper.clearDatabase();
    jest.clearAllMocks();
    jest.restoreAllMocks();
});
afterAll(async () => await dbHelper.closeDatabase());

beforeEach(async () => {
    user = await User.create({
        full_name: 'File Uploader',
        email: 'uploader@example.com',
        password: '123456',
        faculty: 'CS',
        status: 'active'
    });
    userToken = jwt.sign({ id: user._id, role: user.system_role }, process.env.JWT_SECRET);

    // Setup mock implementations
    mockFrom.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
    });

    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: `http://fake-supabase.com/uploads/${Date.now()}_fake_file.txt` }
    });
});

describe('Document API (/document/upload)', () => {
    it('UF001 - Upload file thành công', async () => {
        const response = await request(app)
            .post('/document/upload')
            .set('Authorization', `Bearer ${userToken}`)
            .field('roomId', fakeRoomId)
            .attach('file', Buffer.from('content'), 'testfile.txt');

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Upload thành công');
        expect(response.body).toHaveProperty('url');
        expect(response.body).toHaveProperty('document');

        const doc = await Document.findById(response.body.document._id);
        expect(doc).not.toBeNull();
        expect(doc.file_name).toBe('testfile.txt');
        expect(doc.uploader_id.toString()).toBe(user._id.toString());

        // Kiểm tra mock được gọi
        expect(mockFrom).toHaveBeenCalledWith('uploads');
        expect(mockUpload).toHaveBeenCalledTimes(1);
    });

    it('UF002 - Thất bại (400) khi không đính kèm file', async () => {
        const response = await request(app)
            .post('/document/upload')
            .set('Authorization', `Bearer ${userToken}`)
            .field('roomId', fakeRoomId);

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Thiếu file');
        expect(mockUpload).not.toHaveBeenCalled();
    });

    it('UF003 - Thất bại (400) khi file vượt quá 20MB', async () => {
        const largeBuffer = Buffer.alloc(21 * 1024 * 1024, 'a');

        const response = await request(app)
            .post('/document/upload')
            .set('Authorization', `Bearer ${userToken}`)
            .field('roomId', fakeRoomId)
            .attach('file', largeBuffer, 'largefile.txt');

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Dung lượng file tối đa 20MB');
        expect(mockUpload).not.toHaveBeenCalled();
    });

    it('UF004 - Thất bại (400) khi thiếu roomId', async () => {
        const response = await request(app)
            .post('/document/upload')
            .set('Authorization', `Bearer ${userToken}`)
            .attach('file', Buffer.from('content'), 'testfile.txt');

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Thiếu room_id');
        expect(mockUpload).not.toHaveBeenCalled();
    });

    it('UF005 - Thất bại (500) khi tạo Document trong DB gặp lỗi', async () => {
        // Mock lỗi khi tạo document
        const createMock = jest.spyOn(Document, 'create').mockImplementationOnce(() => {
            throw new Error('Lỗi tạo Document mô phỏng!');
        });

        const response = await request(app)
            .post('/document/upload')
            .set('Authorization', `Bearer ${userToken}`)
            .field('roomId', fakeRoomId)
            .attach('file', Buffer.from('content'), 'testfile.txt');

        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBe('Lỗi server');

        // Supabase vẫn được gọi trước khi lỗi DB xảy ra
        expect(mockUpload).toHaveBeenCalledTimes(1);
    });
});