import mongoose from 'mongoose';
const { Schema } = mongoose;

const questionSchema = new Schema({
    exam_id: {
        type: Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    question_text: {
        type: String,
        required: true
    },
    options: {
        type: [String]
    },
    correct_answers: {
        type: String,
        default: null,
    },
    points: {
        type: Number,
        default: 0.0,
    }
});

const Question = mongoose.model('Question', questionSchema);

export default Question;