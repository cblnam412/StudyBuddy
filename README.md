## STUDYBUDDY DESCRIPTION
A role-based online study collaboration platform where students create and join study rooms, chat in real time, and participate in events like video calls, exams, and discussions. Leaders manage rooms, moderators handle room requests and reports, and admins oversee the entire system and moderator management.
You can try it here: 

## TECH STACK
- Backend: Node.js, Express.js, 
- Frontend: HTML5, Tailwind CSS, ReactJS, TypeScript
- Database: MongoDB 

## HOW TO RUN
### 1. Clone project
```bash
git clone https://github.com/cblnam412/StudyBuddy
cd StudyBuddy
```
### 2. Run Backend
You can either run the 3rd or the 4th command line after moving to backend folder
```bash
cd backend
npm install
npm run dev  
node --watch server.js
```

### 3. Run Frontend
```bash
cd client
npm install
npm run dev
```

## TEAM MEMBERS
| STT | MSSV     | Họ và Tên            | GitHub                              | Email                  |
|-----|----------|----------------------|-------------------------------------|------------------------|
| 1   | 23521533 | Chế Vũ Anh Thư       | https://github.com/anhthucv       | 23521533@gm.uit.edu.vn |
| 2   | 23520436 | Phan Thị Ngọc Hân    | https://github.com/ngochan0215    | 23520436@gm.uit.edu.vn |
| 3   | 23520979 | Nguyễn Phương Nam    | https://github.com/cblnam412      | 23520979@gm.uit.edu.vn |
| 4   | 23520702 | Phạm Bảo Khang       | https://github.com/bkhang2005     | 23520702@gm.uit.edu.vn |

## FILE .env
```bash
PORT=your_port
DB_URI=your_db_uri
MGAL_URI=your_extra_db_uri
JWT_SECRET=your_secret_key

EMAIL_USER=your_gmail
EMAIL_PASS=your_name

WEATHER_API=your_weather_api
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key

STREAM_API_KEY=your_stream_api_key
STREAM_SECRET_KEY=your_stream_secret_key
```
