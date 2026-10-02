const mongoose = require('mongoose');

const storySchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    title: {
        type: String,
        required: true
    },
    pages: [{
        text: { type: String, required: true },
        imageIndex: { type: Number, required: true }
    }],
    images: [{
        type: String // check if storing base64 strings is feasible for large datasets, might hit document limit. but requested by user.
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Story', storySchema);
