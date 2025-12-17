import { User } from "../models/index.js";

const CHAR_TO_NUM_MAP = {
    'A': 1, 'J': 1, 'S': 1,
    'B': 2, 'K': 2, 'T': 2,
    'C': 3, 'L': 3, 'U': 3,
    'D': 4, 'M': 4, 'V': 4,
    'E': 5, 'N': 5, 'W': 5,
    'F': 6, 'O': 6, 'X': 6,
    'G': 7, 'P': 7, 'Y': 7,
    'H': 8, 'Q': 8, 'Z': 8,
    'I': 9, 'R': 9
};

function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str.toUpperCase(); // Chuyển hết về hoa
}

const VOWELS = ['A', 'E', 'I', 'O', 'U', 'Y']; 
const STRICT_VOWELS = ['A', 'E', 'I', 'O', 'U'];

const NUMBER_MEANINGS = {
    1: {
        personality: "Người tiên phong, độc lập, có tố chất lãnh đạo mạnh.",
        career: "Kinh doanh, quản lý, điều hành, khởi nghiệp, CEO, Marketing.",
        soul: "Khao khát được thể hiện bản thân, muốn trở thành người dẫn đầu.",
        expression: "Khả năng lãnh đạo bẩm sinh, sáng tạo và độc lập."
    },
    2: {
        personality: "Hòa giải, tinh tế, giỏi ngoại giao, thích hợp làm việc nhóm.",
        career: "HR, counselor, giáo viên, nghệ thuật nhẹ nhàng, chăm sóc khách hàng.",
        soul: "Mong muốn sự hài hòa, yêu thương và được công nhận.",
        expression: "Khả năng hợp tác, xây dựng mối quan hệ tốt đẹp."
    },
    3: {
        personality: "Sáng tạo, hoạt ngôn, giàu cảm xúc, biểu đạt tốt.",
        career: "Content creator, thiết kế, nghệ thuật, truyền thông, giải trí.",
        soul: "Khao khát được thể hiện cảm xúc và sáng tạo.",
        expression: "Tài năng giao tiếp, truyền cảm hứng và sáng tạo."
    },
    4: {
        personality: "Kỷ luật, ổn định, logic, làm việc có kế hoạch.",
        career: "Kỹ thuật, lập trình, xây dựng, vận hành hệ thống, kiểm toán.",
        soul: "Mong muốn sự ổn định, an toàn và trật tự.",
        expression: "Khả năng tổ chức, xây dựng hệ thống vững chắc."
    },
    5: {
        personality: "Tự do, linh hoạt, thích khám phá và trải nghiệm.",
        career: "Travel, freelance, marketing, kinh doanh tự do, IT, sáng tạo.",
        soul: "Khao khát tự do, phiêu lưu và trải nghiệm mới mẻ.",
        expression: "Khả năng thích nghi và tận hưởng sự đa dạng của cuộc sống."
    },
    6: {
        personality: "Yêu thương, trách nhiệm, bao dung, hướng về gia đình.",
        career: "Y tế, giáo dục, chăm sóc, nghệ thuật trang trí, dịch vụ cộng đồng.",
        soul: "Mong muốn được yêu thương, chăm sóc và bảo vệ người khác.",
        expression: "Khả năng chăm sóc, cố vấn và tạo dựng gia đình."
    },
    7: {
        personality: "Phân tích, chiêm nghiệm, thích đào sâu bản chất.",
        career: "Research, analyst, lập trình, khoa học, tâm lý, triết học.",
        soul: "Khao khát hiểu biết sâu sắc về bản chất sự việc.",
        expression: "Khả năng phân tích, nghiên cứu và khám phá chân lý."
    },
    8: {
        personality: "Tham vọng, mạnh mẽ, giỏi quản lý tài chính.",
        career: "Kinh doanh, đầu tư, ngân hàng, bất động sản, CEO.",
        soul: "Mong muốn thành công, quyền lực và công nhận xã hội.",
        expression: "Khả năng quản lý, lãnh đạo và tạo dựng tài sản."
    },
    9: {
        personality: "Nhân đạo, vị tha, có tầm nhìn lớn, yêu nghệ thuật.",
        career: "Xã hội, từ thiện, nghệ thuật, giảng dạy, sáng tạo.",
        soul: "Khao khát cống hiến cho cộng đồng và nhân loại.",
        expression: "Khả năng cảm thông, sáng tạo và truyền cảm hứng."
    },
    11: {
        personality: "Nhạy cảm, trực giác mạnh, người truyền cảm hứng tâm linh.",
        career: "Nhà tâm lý, cố vấn tâm linh, giáo viên, nghệ sĩ, diễn giả.",
        soul: "Mong muốn khai sáng tâm linh và đem lại sự hòa hợp.",
        expression: "Khả năng cảm nhận tinh tế, tầm nhìn xa và truyền lửa."
    },
    22: {
        personality: "Kiến tạo đại tài, biến giấc mơ thành hiện thực.",
        career: "Kiến trúc sư, nhà quy hoạch, lãnh đạo tổ chức lớn, chính trị gia.",
        soul: "Mong muốn tạo dựng những di sản lớn lao và bền vững.",
        expression: "Khả năng tổ chức quy mô lớn và thực thi kế hoạch vĩ mô."
    },
    33: {
        personality: "Bậc thầy chữa lành, tình yêu thương vô điều kiện.",
        career: "Nhà từ thiện, giáo viên tâm linh, bác sĩ chữa lành, công tác xã hội.",
        soul: "Khao khát nâng đỡ và chữa lành nỗi đau của nhân loại.",
        expression: "Khả năng lắng nghe, thấu cảm và nuôi dưỡng tâm hồn."
    }
};

function cleanString(str) {
    return str.toString()
        .trim()
        .replace(/đ/g, 'd').replace(/Đ/g, 'D') 
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z]/g, "")
        .toUpperCase();
}

function getNumberFromChar(char) {
    return CHAR_TO_NUM_MAP[char] || 0;
}

function reduceToSingleDigit(num) {
    let n = parseInt(num);

    while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
        n = n.toString()
            .split('')
            .reduce((sum, digit) => sum + parseInt(digit), 0);
    }
    return n;
}

function reduceStrictly(num) {
    let n = parseInt(num);
    while (n > 9) {
        n = n.toString().split('').reduce((a, b) => a + parseInt(b), 0);
    }
    return n;
}

function getLifePath(day, month, year) {

    const rDay = reduceToSingleDigit(day);
    const rMonth = reduceToSingleDigit(month);
    const rYear = reduceToSingleDigit(year);

    const total = rDay + rMonth + rYear;
    return reduceToSingleDigit(total);
}

function getExpressionSoulPerson(fullName) {
    const cleanName = cleanString(fullName);

    let expressionSum = 0;
    let soulSum = 0;
    let personalitySum = 0;

    for (let char of cleanName) {
        const num = getNumberFromChar(char);
        if (num === 0) continue;

        expressionSum += num;

        if (STRICT_VOWELS.includes(char)) {
            soulSum += num;
        } else {
            personalitySum += num;
        }
    }

    return {
        expression: reduceToSingleDigit(expressionSum),
        soul: reduceToSingleDigit(soulSum),
        personality: reduceToSingleDigit(personalitySum)
    };
}

function calculateNumerologyMatrix(day, month, year, fullName) {
    const matrix = {
        "1": 0, "2": 0, "3": 0,
        "4": 0, "5": 0, "6": 0,
        "7": 0, "8": 0, "9": 0
    };

    const dateStr = `${day}${month}${year}`;
    for (let char of dateStr) {
        if (matrix[char] !== undefined) matrix[char]++;
    }

    const cleanName = cleanString(fullName);
    for (let char of cleanName) {
        const num = getNumberFromChar(char);
        if (num > 0) matrix[num.toString()]++;
    }

    return matrix;
}


function generateReport(data) {
    const { fullName, day, month, year } = data;

    const lifePath = getLifePath(day, month, year);
    const birthday = reduceToSingleDigit(day); 
    const nameNumbers = getExpressionSoulPerson(fullName);
    const matrix = calculateNumerologyMatrix(day, month, year, fullName);

    const getText = (num, type) => {
        return NUMBER_MEANINGS[num]?.[type] || "Đang cập nhật...";
    };

    return `
                THÔNG TIN CÁ NHÂN
        - Họ tên: ${fullName.toUpperCase()}
        - Ngày sinh: ${day}/${month}/${year}

         CÁC CHỈ SỐ CỐT LÕI

         SỐ ĐƯỜNG ĐỜI (LIFE PATH): [ ${lifePath} ]
           - Đặc điểm: ${getText(lifePath, 'personality')}
           - Định hướng: ${getText(lifePath, 'career')}

         SỐ BIỂU ĐẠT (EXPRESSION): [ ${nameNumbers.expression} ]
           - Sứ mệnh: ${getText(nameNumbers.expression, 'expression')}

         SỐ LINH HỒN (SOUL URGE): [ ${nameNumbers.soul} ]
           - Khao khát: ${getText(nameNumbers.soul, 'soul')}

         SỐ TƯƠNG TÁC (PERSONALITY): [ ${nameNumbers.personality} ]
           - Biểu hiện bên ngoài: ${getText(nameNumbers.personality, 'personality')}

         SỐ NGÀY SINH (BIRTHDAY): [ ${birthday} ]
           - Năng lực bổ trợ: ${getText(birthday, 'personality')}
`;
}


export default {
    name: "numerology",
    description: "Xem thần số học về bản thân",
    usage: "/numerology",
    role: "member",

    async execute(socket, args, io, roomId) {

        const user = await User.findOne({ _id: socket.user.id });

        if (!user) return;

        if (!user.DOB) {
            return socket.emit("room:system_message", {
                message: "Bạn chưa cập nhật ngày sinh. Vui lòng cập nhật hồ sơ trước."
            });
        }

        const birthday = user.DOB;
        const fullName = user.full_name;

        const day = birthday.getDate();
        const month = birthday.getMonth() + 1;
        const year = birthday.getFullYear();


        const data = {
            fullName,
            day,
            month,
            year
        };

        const result = await generateReport(data);

        io.to(roomId).emit("room:system_message", {
            user: "Hệ thống",
            message: result
        });
    }
};

