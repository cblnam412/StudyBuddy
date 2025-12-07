import { AuthService } from "../../service/authService";
import { beforeEach, afterEach, jest, expect } from "@jest/globals";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

describe("AUTH001 - Test Register function", () => {
  let authService;
  let mockUser;
  let mockPendingUser;
  let mockSendVerificationEmail;
  let mockSendResetPasswordEmail;
  let mockSession;

  const returnEmail = "test@example.com";
  const returnPhoneNumber = "0868539999";
  const returnStudentId = "23520001";

  beforeEach(() => {
    mockSession = {
      withTransaction: jest.fn((callback) => callback()),
      endSession: jest.fn(),
    };

    mockUser = {
      findOne: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue(null),
      }),
    };

    mockPendingUser = {
      findOne: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue(null),
      }),
      deleteMany: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue([{}]),
    };

    mockSendVerificationEmail = jest.fn().mockResolvedValue(true);
    mockSendResetPasswordEmail = jest.fn().mockResolvedValue(true);

    mongoose.startSession = jest.fn();
    mongoose.startSession.mockResolvedValue(mockSession);

    authService = new AuthService(
      mockUser,
      mockPendingUser,
      mockSendVerificationEmail,
      mockSendResetPasswordEmail
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("TC01 - Tạo tài khoản tạm thời nếu thông tin hợp lệ", async () => {
    const userData = {
      full_name: "Nguyễn Văn A",
      email: "baokhang0132@gmail.com",
      phone_number: "0123456789",
      studentId: "23520202",
      DOB: "2020-09-24",
      password: "abcdefgh123",
      address: "123 Lê Lợi, phường Biên Hòa, tỉnh Đồng Nai",
      enrollment_year: "2020",
      faculty: "IS",
    };

    const result = await authService.Register(userData);

    expect(result).toBe("baokhang0132@gmail.com");
    expect(mockPendingUser.create).toHaveBeenCalled();
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      "baokhang0132@gmail.com",
      expect.any(String)
    );
  });

  test("TC02 - Từ chối nếu email đăng ký đã được sử dụng", async () => {
    const existingEmail = "baokhang0132@gmail.com";
    mockUser.findOne.mockReturnValueOnce({
      session: jest.fn().mockResolvedValue({
        email: existingEmail,
        phone_number: returnPhoneNumber,
        studentId: returnStudentId,
      }),
    });

    const userData = {
      full_name: "Nguyễn Văn A",
      email: existingEmail,
      phone_number: "0123456789",
      studentId: "23520202",
      DOB: "2020-09-24",
      password: "abcdefgh123",
      address: "123 Lê Lợi, phường Biên Hòa, tỉnh Đồng Nai",
      enrollment_year: "2020",
      faculty: "IS",
    };

    await expect(authService.Register(userData)).rejects.toThrow(
      "Email này đã được sử dụng."
    );
  });

  test("TC03 - Từ chối nếu email đăng ký đang chờ xác thực", async () => {
    const pendingEmail = "baokhang0132@gmail.com";
    mockPendingUser.findOne.mockReturnValueOnce({
      session: jest.fn().mockResolvedValue({
        email: pendingEmail,
        phone_number: returnPhoneNumber,
        studentId: returnStudentId,
      }),
    });

    const userData = {
      full_name: "Nguyễn Văn A",
      email: pendingEmail,
      phone_number: "0123456789",
      studentId: "23520202",
      DOB: "2020-09-24",
      password: "abcdefgh123",
      address: "123 Lê Lợi, phường Biên Hòa, tỉnh Đồng Nai",
      enrollment_year: "2020",
      faculty: "IS",
    };

    await expect(authService.Register(userData)).rejects.toThrow(
      "Email đang được chờ xác thực."
    );
  });

  test("TC05 - Từ chối nếu SĐT đăng ký đã tồn tại", async () => {
    const existingPhoneNumber = "0123456789";

    mockUser.findOne.mockReturnValueOnce({
      session: jest.fn().mockResolvedValue({
        email: returnEmail,
        phone_number: existingPhoneNumber,
        studentId: returnStudentId,
      }),
    });

    const userData = {
      full_name: "Nguyễn Văn A",
      email: "baokhang0132@gmail.com",
      phone_number: existingPhoneNumber,
      studentId: "23520202",
      DOB: "2020-09-24",
      password: "abcdefgh123",
      address: "123 Lê Lợi, phường Biên Hòa, tỉnh Đồng Nai",
      enrollment_year: "2020",
      faculty: "IS",
    };

    await expect(authService.Register(userData)).rejects.toThrow(
      "Số điện thoại này đã được sử dụng."
    );
  });

  test("TC05 - Từ chối nếu SĐT đăng ký đang chờ xác thực", async () => {
    const pendingPhoneNumber = "0123456789";

    mockPendingUser.findOne.mockReturnValueOnce({
      session: jest.fn().mockResolvedValue({
        email: returnEmail,
        phone_number: pendingPhoneNumber,
        studentId: returnStudentId,
      }),
    });

    const userData = {
      full_name: "Nguyễn Văn A",
      email: "baokhang0132@gmail.com",
      phone_number: pendingPhoneNumber,
      studentId: "23520202",
      DOB: "2020-09-24",
      password: "abcdefgh123",
      address: "123 Lê Lợi, phường Biên Hòa, tỉnh Đồng Nai",
      enrollment_year: "2020",
      faculty: "IS",
    };

    await expect(authService.Register(userData)).rejects.toThrow(
      "Số điện thoại đang được chờ xác thực."
    );
  });

  test("TC06 - Từ chối nếu MSSV đăng ký đã tồn tại", async () => {
    const existingStudentId = "23520702";

    mockUser.findOne.mockReturnValueOnce({
      session: jest.fn().mockResolvedValue({
        email: returnEmail,
        phone_number: returnPhoneNumber,
        studentId: existingStudentId,
      }),
    });

    const userData = {
      full_name: "Nguyễn Văn A",
      email: "baokhang0132@gmail.com",
      phone_number: "0123456789",
      studentId: existingStudentId,
      DOB: "2020-09-24",
      password: "abcdefgh123",
      address: "123 Lê Lợi, phường Biên Hòa, tỉnh Đồng Nai",
      enrollment_year: "2020",
      faculty: "IS",
    };

    await expect(authService.Register(userData)).rejects.toThrow(
      "Mã số sinh viên này đã được sử dụng."
    );
  });

  test("TC07 - Từ chối nếu MSSV đăng ký đang chờ xác thực", async () => {
    const pendingStudentId = "23520702";

    mockPendingUser.findOne.mockReturnValueOnce({
      session: jest.fn().mockResolvedValue({
        email: returnEmail,
        phone_number: returnPhoneNumber,
        studentId: pendingStudentId,
      }),
    });

    const userData = {
      full_name: "Nguyễn Văn A",
      email: "baokhang0132@gmail.com",
      phone_number: "0123456789",
      studentId: pendingStudentId,
      DOB: "2020-09-24",
      password: "abcdefgh123",
      address: "123 Lê Lợi, phường Biên Hòa, tỉnh Đồng Nai",
      enrollment_year: "2020",
      faculty: "IS",
    };

    await expect(authService.Register(userData)).rejects.toThrow(
      "Mã số sinh viên này đang được chờ xác thực."
    );
  });

  test("TC08 - Từ chối nếu ngày sinh không đúng định dạng", async () => {
    const userData = {
      full_name: "Nguyễn Văn A",
      email: "baokhang0132@gmail.com",
      phone_number: "0123456789",
      studentId: "23520202",
      DOB: "abc",
      password: "abcdefgh123",
      address: "123 Lê Lợi, phường Biên Hòa, tỉnh Đồng Nai",
      enrollment_year: "2020",
      faculty: "IS",
    };

    await expect(authService.Register(userData)).rejects.toThrow(
      "Ngày sinh không hợp lệ."
    );
  });

  test("TC09 - Từ chối nếu ngày sinh ở trong tương lai", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const userData = {
      full_name: "Nguyễn Văn A",
      email: "baokhang0132@gmail.com",
      phone_number: "0123456789",
      studentId: "23520202",
      DOB: tomorrow,
      password: "abcdefgh123",
      address: "123 Lê Lợi, phường Biên Hòa, tỉnh Đồng Nai",
      enrollment_year: "2020",
      faculty: "IS",
    };

    await expect(authService.Register(userData)).rejects.toThrow(
      "Ngày sinh không thể là ngày trong tương lai."
    );
  });

  test("TC10 - Từ chối năm nhập học không đúng định dạng", async () => {
    const userData = {
      full_name: "Nguyễn Văn A",
      email: "baokhang0132@gmail.com",
      phone_number: "0123456789",
      studentId: "23520202",
      DOB: "2020-09-24",
      password: "abcdefgh123",
      address: "123 Lê Lợi, phường Biên Hòa, tỉnh Đồng Nai",
      enrollment_year: "abc",
      faculty: "IS",
    };

    await expect(authService.Register(userData)).rejects.toThrow(
      "Năm nhập học phải là số và không được để trống."
    );
  });

  test("TC11 - Từ chối năm nhập học trống", async () => {
    const userData = {
      full_name: "Nguyễn Văn A",
      email: "baokhang0132@gmail.com",
      phone_number: "0123456789",
      studentId: "23520202",
      DOB: "2020-09-24",
      password: "abcdefgh123",
      address: "123 Lê Lợi, phường Biên Hòa, tỉnh Đồng Nai",
      enrollment_year: "",
      faculty: "IS",
    };

    await expect(authService.Register(userData)).rejects.toThrow(
      "Năm nhập học phải là số và không được để trống."
    );
  });

  test("TC12 - Từ chối năm nhập học trước 1900", async () => {
    const currentYear = new Date().getFullYear();

    const userData = {
      full_name: "Nguyễn Văn A",
      email: "baokhang0132@gmail.com",
      phone_number: "0123456789",
      studentId: "23520202",
      DOB: "2020-09-24",
      password: "abcdefgh123",
      address: "123 Lê Lợi, phường Biên Hòa, tỉnh Đồng Nai",
      enrollment_year: "1899",
      faculty: "IS",
    };

    await expect(authService.Register(userData)).rejects.toThrow(
      `Năm nhập học phải nằm trong khoảng 1900 đến ${currentYear}.`
    );
  });

  test("TC13 - Từ chối nếu thiếu email", async () => {
    const userData = {
      full_name: "Nguyễn Văn A",
      email: "",
      phone_number: "0123456789",
      studentId: "23520202",
      DOB: "2020-09-24",
      password: "abcdefgh123",
      address: "123 Lê Lợi, phường Biên Hòa, tỉnh Đồng Nai",
      enrollment_year: "2020",
      faculty: "IS",
    };

    await expect(authService.Register(userData)).rejects.toThrow(
      `Thiếu thông tin xác thực!`
    );
  });

  // Hmm
  test("TC14 - Từ chối giá trị của khoa không hợp lệ", async () => {
    const falseFacultyValue = "ABC";
    mockPendingUser.create.mockRejectedValueOnce(
      new Error(
        `Path \`faculty\` ("${falseFacultyValue}") is not a valid enum value.`
      )
    );

    const userData = {
      full_name: "Nguyễn Văn A",
      email: "baokhang0132@gmail.com",
      phone_number: "0123456789",
      studentId: "23520202",
      DOB: "2020-09-24",
      password: "abcdefgh123",
      address: "123 Lê Lợi, phường Biên Hòa, tỉnh Đồng Nai",
      enrollment_year: "2020",
      faculty: "ABC",
    };

    await expect(authService.Register(userData)).rejects.toThrow(
      `Path \`faculty\` ("${falseFacultyValue}") is not a valid enum value.`
    );
  });

  test("TC15 - Từ chối nếu năm nhập học ở tương lai", async () => {
    const currentYear = new Date().getFullYear();
    const futureEnrollmentYear = new Date().getFullYear() + 1;

    const userData = {
      full_name: "Nguyễn Văn A",
      email: "baokhang0132@gmail.com",
      phone_number: "0123456789",
      studentId: "23520202",
      DOB: "2020-09-24",
      password: "abcdefgh123",
      address: "123 Lê Lợi, phường Biên Hòa, tỉnh Đồng Nai",
      enrollment_year: futureEnrollmentYear,
      faculty: "IS",
    };

    await expect(authService.Register(userData)).rejects.toThrow(
      `Năm nhập học phải nằm trong khoảng 1900 đến ${currentYear}.`
    );
  });
});

describe("AUTH002 - Test SendEmail function", () => {
  let mockPendingUser;
  let mockSendVerificationEmail;
  let authService;

  beforeEach(() => {
    mockPendingUser = {
      findOne: jest.fn(),
    };

    mockSendVerificationEmail = jest.fn().mockResolvedValue({});

    authService = new AuthService(
      null,
      mockPendingUser,
      mockSendVerificationEmail,
      null
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("TC01 - Gửi email xác nhận OTP nếu tìm thấy người dùng chờ xác thực", async () => {
    const email = "existingEmail@gmail.com";

    // Hmm
    const mockPendingUserInstance = {
      email,
      otp: "123456",
      save: jest.fn().mockResolvedValue({}),
    };

    mockPendingUser.findOne.mockResolvedValue(mockPendingUserInstance);

    const result = await authService.SendEmail({ email });

    expect(result).toBeUndefined();
    expect(mockPendingUserInstance.save).toHaveBeenCalledTimes(1);
    expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  test("TC02 - Từ chối gửi mail nếu không tìm thấy người dùng chờ xác thực", async () => {
    const email = "notExistingEmail@gmail.com";

    mockPendingUser.findOne.mockResolvedValue();

    expect(authService.SendEmail({ email })).rejects.toThrow(
      "Chưa đăng ký thông tin hoặc thông tin đã hết hạn"
    );
  });
});

describe("AUTH003 - Test VerifyOTP function", () => {
  let mockPendingUser;
  let mockUser;
  let authService;

  beforeEach(() => {
    mockPendingUser = {
      findOne: jest.fn(),
      deleteOne: jest.fn().mockResolvedValue({}),
    };

    mockUser = jest.fn().mockImplementation((userData) => ({
      ...userData,
      save: jest.fn().mockResolvedValue({}),
      toObject: jest.fn().mockReturnValue(userData),
    }));

    authService = new AuthService(mockUser, mockPendingUser, null, null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("TC01 - Tạo user mới nếu OTP chính xác", async () => {
    const email = "existEmail@gmail.com";
    const otp = "123456";

    const user = {
      full_name: "Nguyễn Văn A",
      email,
      phone_number: "0123456789",
      studentId: "23520202",
      DOB: "2000-01-01",
      password: "hashedPassword",
      address: "123 Lê Lợi",
      enrollment_year: "2020",
      faculty: "IS",
      otp,
    };
    mockPendingUser.findOne.mockResolvedValue({ ...user, otp });

    const result = await authService.VerifyOTP({ email, otp });

    expect(mockUser.mock.results[0].value.save).toHaveBeenCalledTimes(1);
    expect(mockPendingUser.deleteOne).toHaveBeenCalledWith({ email });
    expect(result).toEqual(
      expect.objectContaining({
        email,
        full_name: "Nguyễn Văn A",
        status: "active",
      })
    );
  });

  test("TC02 - Từ chối tạo tài khoản mới nếu OTP sai", async () => {
    const email = "existEmail@gmail.com";
    const otp = "123456";
    const wrongOTP = "123455";

    const user = {
      full_name: "Nguyễn Văn A",
      email,
      phone_number: "0123456789",
      studentId: "23520202",
      DOB: "2000-01-01",
      password: "hashedPassword",
      address: "123 Lê Lợi",
      enrollment_year: "2020",
      faculty: "IS",
      otp,
    };
    mockPendingUser.findOne.mockResolvedValue({ ...user, otp });

    expect(authService.VerifyOTP({ email, otp: wrongOTP })).rejects.toThrow(
      "Mã OTP không đúng"
    );
  });

  test("TC03 - Từ chối tạo tài khoản mới nếu trống OTP", async () => {
    const email = "existEmail@gmail.com";
    const otp = "123456";

    const user = {
      full_name: "Nguyễn Văn A",
      email,
      phone_number: "0123456789",
      studentId: "23520202",
      DOB: "2000-01-01",
      password: "hashedPassword",
      address: "123 Lê Lợi",
      enrollment_year: "2020",
      faculty: "IS",
      otp,
    };
    mockPendingUser.findOne.mockResolvedValue({ ...user, otp });

    expect(authService.VerifyOTP({ email, otp: "" })).rejects.toThrow(
      "Mã OTP không đúng"
    );
  });

  test("TC04 - Từ chối tạo tài khoản mới nếu không tìm thấy người dùng", async () => {
    const email = "notExistEmail@gmail.com";
    const otp = "123456";

    mockPendingUser.findOne.mockResolvedValue(null);

    expect(authService.VerifyOTP({ email, otp })).rejects.toThrow(
      "Chưa đăng ký thông tin hoặc thông tin đã hết hạn"
    );
  });
});

describe("AUTH004 - Test login function", () => {
  let mockUser;
  let authService;

  beforeEach(() => {
    mockUser = {
      findOne: jest.fn().mockResolvedValue({}),
    };

    authService = new AuthService(mockUser, null, null, null);

    jest.spyOn(jwt, "sign").mockReturnValue("fakeToken");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("TC01 - Cho phép đăng nhập nếu email/sđt và mật khẩu hợp lệ", async () => {
    const email = "existEmail@gmail.com";
    const password = "validPassword";

    jest.spyOn(bcrypt, "compare").mockImplementation(async (a, b) => a === b);

    mockUser.findOne.mockResolvedValue({
      email,
      password: "validPassword",
      status: "active",
      toObject: jest.fn().mockReturnValue({
        email,
        password: "validPassword",
        status: "active",
      }),
    });

    const res = await authService.Login({ emailOrPhone: email, password });

    expect(jwt.sign).toHaveBeenCalledTimes(1);
    
    expect(res).toEqual(
      expect.objectContaining({
        token: "fakeToken",
        user: expect.objectContaining({
          email,
          password: "validPassword",
          status: "active",
        }),
      })
    );
  });

  test("TC02 - Từ chối đăng nhập nếu mật khẩu không chính xác", async () => {
    const email = "existEmail@gmail.com";
    const password = "invalidPassword";

    jest.spyOn(bcrypt, "compare").mockImplementation(async (a, b) => a === b);

    mockUser.findOne.mockResolvedValue({
      email,
      password: "validPassword",
      status: "active",
      toObject: jest.fn().mockReturnValue({
        email,
        password: "validPassword",
        status: "active",
      }),
    });

    expect(authService.Login({ emailOrPhone: email, password })).rejects.toThrow("Sai mật khẩu");
    expect(jwt.sign).toHaveBeenCalledTimes(0);
  });

  test("TC03 - Từ chối đăng nhập nếu mật khẩu trống", async () => {
    const email = "existEmail@gmail.com";
    const password = "";

    jest.spyOn(bcrypt, "compare").mockImplementation(async (a, b) => a === b);

    mockUser.findOne.mockResolvedValue({
      email,
      password: "validPassword",
      status: "active",
      toObject: jest.fn().mockReturnValue({
        email,
        password: "validPassword",
        status: "active",
      }),
    });

    expect(authService.Login({ emailOrPhone: email, password })).rejects.toThrow("Sai mật khẩu");
    expect(jwt.sign).toHaveBeenCalledTimes(0);
  });

  test("TC04 - Từ chối đăng nhập nếu email/sđt không tồn tại", async () => {
    const email = "notExistEmail@gmail.com";
    const password = "";

    mockUser.findOne.mockResolvedValue(null);

    expect(authService.Login({ emailOrPhone: email, password })).rejects.toThrow("Tài khoản không tồn tại");
    expect(jwt.sign).toHaveBeenCalledTimes(0);
  });
});

describe("AUTH005 - Test forgotPassword function", () => {
    let mockUser;
    let mockSendResetPasswordEmail;
    let authService;

    beforeEach(() => {
        mockUser = {
            findOne: jest.fn().mockResolvedValue({}),
        };

        mockSendResetPasswordEmail = jest.fn().mockImplementation(async (email, resetUrl) => {});
        
        authService = new AuthService(mockUser, null, null, mockSendResetPasswordEmail);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("TC01 - Gửi email reset mật khẩu nếu email tồn tại trong hệ thống", async () => {
        const email = "existEmail@gmail.com";

        mockUser.findOne.mockResolvedValue({
            email: "existEmail@gmail.com",
            restPasswordToken: "",
            resetPasswordExpires: "",
            save: jest.fn().mockResolvedValue({})
        });

        const res = await authService.ForgotPassword({email});

        expect(res).toBeTruthy();
        expect(mockSendResetPasswordEmail).toHaveBeenCalledTimes(1);
    });

    test("TC02 - Không gửi email reset mật khẩu nếu email không tồn tại trong hệ thống", async () => {
        const email = "existEmail@gmail.com";

        mockUser.findOne.mockResolvedValue(null);

        expect(authService.ForgotPassword({email})).rejects.toThrow("Không tìm thấy email");
        expect(mockSendResetPasswordEmail).toHaveBeenCalledTimes(0);
    });
});

describe("AUTH006 - Test resetPassword function", () => {
    let mockUser;
    let authService;

    beforeEach(() => {
        mockUser = {
            findOne: jest.fn().mockResolvedValue({})
        };

        authService = new AuthService(mockUser, null, null, null);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    test("TC01 - Reset mật khẩu nếu token hợp lệ", async () => {
        const token = "validToken";
        const newPassword = "newPassword";
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const mockSave = jest.fn().mockResolvedValue({});
        // Deterministic Date.now() 
        const fakeNow = 1700000000000;
        jest.spyOn(Date, "now").mockReturnValue(fakeNow);

        mockUser.findOne.mockResolvedValue({
            username: "Nguyễn Văn A",
            password: "oldPassword",
            resetPasswordToken: token,
            resetPasswordExpires: tomorrow,
            save: mockSave,
        });

        const res = await authService.ResetPassword({token, newPassword});

        expect(res).toBe(true);
        expect(mockUser.findOne).toHaveBeenCalledWith({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: fakeNow }
        });
        expect(mockSave).toHaveBeenCalledTimes(1);
    });

    test("TC02 - Từ chối reset mật khẩu nếu token không hợp lệ", async() => {
        const token = "invalidToken";
        const newPassword = "newPassword";


        mockUser.findOne.mockResolvedValue(null);

        expect(authService.ResetPassword({token, newPassword})).rejects
        .toThrow("Token không hợp lệ hoặc đã hết hạn");
    });

    test("TC03 - Từ chối reset mật khẩu nếu token hết hạn", async() => {
        const token = "expiredToken";
        const newPassword = "newPassword";

        mockUser.findOne.mockResolvedValue(null);

        expect(authService.ResetPassword({token, newPassword})).rejects
        .toThrow("Token không hợp lệ hoặc đã hết hạn");
    });
});