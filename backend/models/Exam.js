import mongoose from 'mongoose';
const { Schema } = mongoose;

const examSchema = new Schema({
    event_id: {
        type: Schema.Types.ObjectId,
        ref: 'Event'
    },
    examType: {
        type: String,
        enum: ['discussion', 'exam'],
        required: [true]
    },
    title: {
        type: String,
        required: [true]
    },
    description: {
        type: String
    },
    duration: {
        type: Number // Thời lượng tính bằng phút
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    }
}, {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

const Exam = mongoose.model('Exam', examSchema);

export default Exam;