import mongoose from 'mongoose';
const { Schema } = mongoose;

const examAnswerSchema = new Schema({
    exam_id: {
        type: Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    question_id: {
        type: Schema.Types.ObjectId,
        ref: 'Question',
        required: true
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    selected_answer: {
        type: String,
        required: true
    },
    is_correct: {
        type: Boolean,
        default: null
    },
    points_earned: {
        type: Number,
        default: 0
    }
}, {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Index để tìm nhanh câu trả lời của học sinh cho một exam
examAnswerSchema.index({ exam_id: 1, user_id: 1 });
examAnswerSchema.index({ question_id: 1, user_id: 1 });
examAnswerSchema.index({ exam_id: 1, question_id: 1 });

const ExamAnswer = mongoose.model('ExamAnswer', examAnswerSchema);

export default ExamAnswer;
