import { jest } from '@jest/globals';

// Mock modules that are imported at module scope in userService
await jest.unstable_mockModule('bcrypt', () => ({
	default: {
		compare: jest.fn(),
		hash: jest.fn(),
	}
}));
await jest.unstable_mockModule('../../utils/sendEmail.js', () => ({
	default: jest.fn(),
}));

const { UserService } = await import('../../service/userService.js');
const bcrypt = (await import('bcrypt')).default;
const sendVerificationEmail = (await import('../../utils/sendEmail.js')).default;

describe('UserService (unit)', () => {
	let mocks;
	let service;

	beforeEach(() => {
		// Reset module-level mocks
		jest.clearAllMocks();

		// Basic mock models and dependencies
		// create a shared storage mock so calls to `from(...)` return the same object
		const storageObj = { upload: jest.fn(), getPublicUrl: jest.fn(), remove: jest.fn() };

		mocks = {
			User: {
				findById: jest.fn(),
				findOne: jest.fn(),
			},
			ModeratorApplication: {
				findOne: jest.fn(),
				create: jest.fn(),
			},
			UserWarning: {
				countDocuments: jest.fn(),
			},
			Document: {
				countDocuments: jest.fn(),
			},
			EventUser: {
				countDocuments: jest.fn(),
				find: jest.fn(),
			},
			supabase: {
				storage: {
					from: jest.fn(() => storageObj),
				},
			},
			ReputationLog: {
				create: jest.fn(),
			},
			ReputationScore: {
				findOne: jest.fn(),
				create: jest.fn(),
			},
		};

		service = new UserService(
			mocks.User,
			mocks.ModeratorApplication,
			mocks.UserWarning,
			mocks.Document,
			mocks.EventUser,
			mocks.supabase,
			mocks.ReputationLog,
			mocks.ReputationScore
		);
	});

	describe('viewUserInfo', () => {
		it('trả về user khi tồn tại', async () => {
			const user = { _id: 'u1', full_name: 'A' };
			const select = jest.fn().mockResolvedValue(user);
			mocks.User.findById.mockReturnValue({ select });

			const res = await service.viewUserInfo('u1');

			expect(mocks.User.findById).toHaveBeenCalledWith('u1');
			expect(select).toHaveBeenCalledWith('-password -resetPasswordToken -resetPasswordExpires -create_at -update_at -__v');
			expect(res).toBe(user);
		});

		it('ném lỗi khi không tìm thấy user', async () => {
			const select = jest.fn().mockResolvedValue(null);
			mocks.User.findById.mockReturnValue({ select });

			await expect(service.viewUserInfo('missing')).rejects.toThrow('Không tìm thấy người dùng.');
		});
	});

	describe('updateUserInfo', () => {
		it('ném lỗi khi không tìm thấy user', async () => {
			mocks.User.findById.mockResolvedValue(null);
			await expect(service.updateUserInfo('u', {})).rejects.toThrow('Không tìm thấy người dùng.');
		});

		it('ném lỗi khi phone hoặc studentId đã tồn tại', async () => {
			const user = { save: jest.fn() };
			mocks.User.findById.mockResolvedValue(user);
			mocks.User.findOne.mockResolvedValue({ _id: 'other' });

			await expect(service.updateUserInfo('u1', { phone_number: '0123' })).rejects.toThrow('Số điện thoại hoặc MSSV đã tồn tại.');
			expect(mocks.User.findOne).toHaveBeenCalled();
		});

		it('ném lỗi DOB không hợp lệ', async () => {
			const user = { save: jest.fn() };
			mocks.User.findById.mockResolvedValue(user);
			await expect(service.updateUserInfo('u1', { DOB: 'not-a-date' })).rejects.toThrow('Ngày sinh không hợp lệ.');
		});

		it('ném lỗi DOB là ngày trong tương lai', async () => {
			const user = { save: jest.fn() };
			mocks.User.findById.mockResolvedValue(user);
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 2);
			await expect(service.updateUserInfo('u1', { DOB: tomorrow.toISOString() })).rejects.toThrow('Ngày sinh không thể là ngày trong tương lai.');
		});

		it('cập nhật thành công và trả về user đã cập nhật', async () => {
			const user = {
				save: jest.fn().mockResolvedValue(true),
				full_name: '',
				address: '',
				phone_number: '',
				studentId: '',
				faculty: '',
			};
			mocks.User.findById.mockResolvedValue(user);
			const select = jest.fn().mockResolvedValue({ _id: 'u1', full_name: 'New' });
			mocks.User.findById.mockResolvedValueOnce(user).mockReturnValueOnce({ select });

			const res = await service.updateUserInfo('u1', { full_name: 'New', phone_number: '09', studentId: 's1' });

			expect(res).toEqual({ _id: 'u1', full_name: 'New' });
		});
	});

	describe('changePassword', () => {
		it('ném lỗi khi không tìm thấy user', async () => {
			mocks.User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
			await expect(service.changePassword('u', 'a', 'b')).rejects.toThrow('Không tìm thấy người dùng.');
		});

		it('ném lỗi khi mật khẩu cũ không đúng', async () => {
			const user = { password: 'hash' };
			mocks.User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
			bcrypt.compare.mockResolvedValue(false);
			await expect(service.changePassword('u', 'old', 'new')).rejects.toThrow('Mật khẩu cũ không đúng.');
		});

		it('thành công khi mật khẩu đúng', async () => {
			const user = { password: 'hash', save: jest.fn() };
			mocks.User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
			bcrypt.compare.mockResolvedValue(true);
			bcrypt.hash.mockResolvedValue('newhash');

			await service.changePassword('u', 'old', 'new');
			expect(bcrypt.hash).toHaveBeenCalledWith('new', 10);
			expect(user.password).toBe('newhash');
			expect(user.save).toHaveBeenCalled();
		});
	});

	describe('sendEmailChangeOtp & verifyEmailChange', () => {
		it('sendEmailChangeOtp ném lỗi khi không tìm thấy user', async () => {
			mocks.User.findById.mockResolvedValue(null);
			await expect(service.sendEmailChangeOtp('u', 'a@b.c')).rejects.toThrow('Không tìm thấy người dùng.');
		});

		it('sendEmailChangeOtp lưu otp và gọi sendVerificationEmail', async () => {
			const user = { save: jest.fn() };
			mocks.User.findById.mockResolvedValue(user);
			sendVerificationEmail.mockResolvedValue(true);

			await service.sendEmailChangeOtp('u', 'x@y.z');

			expect(user.emailChangeOtp).toBeDefined();
			expect(user.emailChangeNew).toBe('x@y.z');
			expect(user.emailChangeExpires).toBeGreaterThan(Date.now());
			expect(user.save).toHaveBeenCalled();
			expect(sendVerificationEmail).toHaveBeenCalledWith('x@y.z', expect.any(String));
		});

		it('verifyEmailChange ném lỗi khi không tìm thấy user', async () => {
			mocks.User.findById.mockResolvedValue(null);
			await expect(service.verifyEmailChange('u', '123456')).rejects.toThrow('Không tìm thấy người dùng.');
		});

		it('verifyEmailChange ném lỗi khi otp không hợp lệ hoặc hết hạn', async () => {
			const user = { emailChangeOtp: '111111', emailChangeExpires: 0 };
			mocks.User.findById.mockResolvedValue(user);
			await expect(service.verifyEmailChange('u', '111111')).rejects.toThrow('Mã OTP không hợp lệ hoặc đã hết hạn.');
		});

		it('verifyEmailChange thành công', async () => {
			const user = { emailChangeOtp: '222222', emailChangeExpires: Date.now() + 10000, emailChangeNew: 'ok@ok.com', save: jest.fn() };
			mocks.User.findById.mockResolvedValue(user);
			const res = await service.verifyEmailChange('u', '222222');
			expect(res).toBe('ok@ok.com');
			expect(user.email).toBe('ok@ok.com');
			expect(user.emailChangeOtp).toBeUndefined();
			expect(user.save).toHaveBeenCalled();
		});
	});

	describe('updateAvatar', () => {
		it('ném lỗi khi thiếu file', async () => {
			await expect(service.updateAvatar('u', null)).rejects.toThrow('Thiếu file ảnh');
		});

		it('ném lỗi khi không tìm thấy user', async () => {
			const file = { mimetype: 'image/png', size: 100, originalname: 'a.png', buffer: Buffer.from('') };
			mocks.User.findById.mockResolvedValue(null);
			await expect(service.updateAvatar('u', file)).rejects.toThrow('Không tìm thấy người dùng');
		});

		it('ném lỗi khi không phải ảnh', async () => {
			const file = { mimetype: 'text/plain', size: 10, originalname: 'a.txt', buffer: Buffer.from('') };
			mocks.User.findById.mockResolvedValue({});
			await expect(service.updateAvatar('u', file)).rejects.toThrow('Chỉ cho phép upload ảnh (jpg, png, webp, ...)');
		});

		it('ném lỗi khi file quá lớn', async () => {
			const file = { mimetype: 'image/png', size: 4 * 1024 * 1024, originalname: 'a.png', buffer: Buffer.from('') };
			mocks.User.findById.mockResolvedValue({});
			await expect(service.updateAvatar('u', file)).rejects.toThrow('Dung lượng ảnh tối đa 3MB');
		});

		it('thành công upload và trả về publicUrl', async () => {
			const file = { mimetype: 'image/png', size: 100, originalname: 'a.png', buffer: Buffer.from('') };
			const user = { avatarUrl: null, save: jest.fn() };
			mocks.User.findById.mockResolvedValue(user);

			const storageFrom = mocks.supabase.storage.from();
			storageFrom.upload.mockResolvedValue({ error: null });
			storageFrom.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn/avatars/a.png' } });

			const res = await service.updateAvatar('u', file);
			expect(res).toBe('https://cdn/avatars/a.png');
			expect(user.avatarUrl).toBe('https://cdn/avatars/a.png');
			expect(user.save).toHaveBeenCalled();
		});
	});

	describe('applyForModerator', () => {
		it('ném lỗi khi không tìm thấy user', async () => {
			mocks.User.findById.mockResolvedValue(null);
			await expect(service.applyForModerator('u', 'r')).rejects.toThrow('Không tìm thấy người dùng.');
		});

		it('ném lỗi khi user đã có role khác user', async () => {
			mocks.User.findById.mockResolvedValue({ system_role: 'admin' });
			await expect(service.applyForModerator('u', 'r')).rejects.toThrow('Bạn đã có quyền admin');
		});

		it('ném lỗi khi đã có application approved/reviewed', async () => {
			mocks.User.findById.mockResolvedValue({ system_role: 'user' });
			mocks.ModeratorApplication.findOne.mockResolvedValue({ status: 'approved' });
			await expect(service.applyForModerator('u', 'r')).rejects.toThrow('Bạn đã có yêu cầu đang chờ duyệt hoặc đã được duyệt.');
		});

		it('tạo application rejected khi không đủ điều kiện', async () => {
			const now = new Date();
			const user = { system_role: 'user', create_at: now, reputation_score: 10 };
			mocks.User.findById.mockResolvedValue(user);
			mocks.ModeratorApplication.findOne.mockResolvedValue(null);
			mocks.Document.countDocuments.mockResolvedValue(0);
			mocks.EventUser.countDocuments.mockResolvedValue(0);
			mocks.EventUser.find.mockResolvedValue([]);
			mocks.UserWarning.countDocuments.mockResolvedValue(0);
			mocks.ModeratorApplication.create.mockResolvedValue({ user_id: 'u', status: 'rejected' });

			const res = await service.applyForModerator('u', 'reason');
			expect(res.application.status).toBe('rejected');
			expect(res.message).toMatch(/không đủ điều kiện/i);
		});

		it('thành công khi đủ điều kiện', async () => {
			const past = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
			const user = { system_role: 'user', create_at: past, reputation_score: 100 };
			mocks.User.findById.mockResolvedValue(user);
			mocks.ModeratorApplication.findOne.mockResolvedValue(null);
			mocks.Document.countDocuments.mockResolvedValue(10);
			mocks.EventUser.countDocuments.mockResolvedValue(0);
			mocks.EventUser.find.mockResolvedValue([]);
			mocks.UserWarning.countDocuments.mockResolvedValue(0);
			mocks.ModeratorApplication.create.mockResolvedValue({ user_id: 'u', status: 'reviewed' });

			const res = await service.applyForModerator('u', 'reason');
			expect(res.application.status).toBe('reviewed');
			expect(res.message).toMatch(/đang chờ Admim xem xét hồ sơ/);
		});
	});

	describe('incrementUserReputation', () => {
		it('ném lỗi khi thiếu tham số', async () => {
			await expect(service.incrementUserReputation(null, 10)).rejects.toThrow('UserId và points không được rỗng');
			await expect(service.incrementUserReputation('u', null)).rejects.toThrow('UserId và points không được rỗng');
		});

		it('tạo ReputationScore mới nếu chưa có và cập nhật điểm', async () => {
			mocks.ReputationScore.findOne.mockResolvedValue(null);
			mocks.ReputationScore.create.mockResolvedValue({ user_id: 'u', document_score: 0, save: jest.fn(), total_score: 0 });
			mocks.ReputationLog.create.mockResolvedValue(true);
			const user = { reputation_score: 0, save: jest.fn() };
			mocks.User.findById.mockResolvedValue(user);

			const rep = await service.incrementUserReputation('u', 5, 'r', 'document');
			expect(mocks.ReputationLog.create).toHaveBeenCalled();
			expect(user.save).toHaveBeenCalled();
		});
	});
});


