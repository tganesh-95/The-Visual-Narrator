const Story = require('../models/Story');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateStory = async (req, res) => {
    try {
        const { images, context, language } = req.body;
        const userId = req.user._id;

        if (!images || images.length === 0) {
            return res.status(400).json({ message: 'No images provided' });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        // Prepare image parts and image notes for Gemini
        const imageNotes = [];
        const imageParts = images.map((img, index) => {
            const rawBase64 = typeof img === 'string' ? img : (img.base64 || img.data || '');
            let base64Data = rawBase64;
            let mimeType = 'image/jpeg';

            if (rawBase64.includes(',')) {
                const parts = rawBase64.split(',');
                base64Data = parts[1];
                const mimeMatch = parts[0].match(/:(.*?);/);
                if (mimeMatch) {
                    mimeType = mimeMatch[1];
                }
            } else if (img.mimeType) {
                mimeType = img.mimeType;
            }

            if (img.description && img.description.trim()) {
                imageNotes.push(`Scene ${index + 1} Note: ${img.description.trim()}`);
            }

            return {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType,
                },
            };
        });

        const notesSection = imageNotes.length > 0 
            ? `\nIndividual Scene Notes:\n${imageNotes.join('\n')}\n` 
            : '';

        const prompt = `
            You are 'The Visual Narrator', a magical storyteller. 
            Analyze the provided images and weave a cohesive, enchanting story in ${language || 'English'}.
            
            Overall story context provided by user: "${context || 'Create a magical journey based on these visuals.'}"
            ${notesSection}
            Strictly output a JSON object with the following schema:
            {
                "title": "Story Title in ${language || 'English'}",
                "pages": [
                    {
                        "text": "Narrative text for this page...",
                        "imageIndex": 0
                    }
                ]
            }

            Ensure the story connects the images logically, engagingly, and creatively.
        `;

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const text = response.text();

        let storyData;
        try {
            // Strip code fence if present
            const cleanText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            storyData = JSON.parse(cleanText);
        } catch (e) {
            console.error("JSON Parse Error:", text);
            return res.status(500).json({ message: 'Failed to generate valid JSON story', raw: text });
        }

        // Create Story in DB
        const savedImages = images.map(img => typeof img === 'string' ? img : (img.base64 || img.data || ''));
        const story = await Story.create({
            user: userId,
            title: storyData.title || "The Untold Legend",
            pages: storyData.pages || [],
            images: savedImages
        });

        res.status(201).json(story);

    } catch (error) {
        console.error("Story Generation Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const getMyStories = async (req, res) => {
    try {
        const stories = await Story.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(stories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getStoryById = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (story) {
            res.json(story);
        } else {
            res.status(404).json({ message: 'Story not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteStory = async (req, res) => {
    try {
        const story = await Story.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (story) {
            res.json({ message: 'Story deleted successfully' });
        } else {
            res.status(404).json({ message: 'Story not found or unauthorized' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { generateStory, getMyStories, getStoryById, deleteStory };
