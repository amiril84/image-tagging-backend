require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3001;

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OpenAI API key is not configured. Please add your API key to the .env file.');
  process.exit(1);
}

console.log('Initializing OpenAI with API key format:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'));
    }
  }
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
});

// Test OpenAI connection
const testOpenAIConnection = async () => {
  try {
    console.log('Testing OpenAI connection...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Test connection" }],
      max_tokens: 5
    });
    console.log('OpenAI connection successful');
    return true;
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    return false;
  }
};

// Helper function to extract JSON from markdown response
const extractJsonFromResponse = (content) => {
  try {
    // First try direct JSON parse
    return JSON.parse(content);
  } catch (e) {
    try {
      // Try to extract JSON from markdown
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Try to find the first occurrence of { and last occurrence of }
      const start = content.indexOf('{');
      const end = content.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        const jsonStr = content.substring(start, end + 1);
        return JSON.parse(jsonStr);
      }
    } catch (e2) {
      console.error('Failed to parse JSON from response:', e2);
      throw new Error('Failed to parse AI response');
    }
  }
};

// Routes
app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    console.log('Processing image:', req.file.filename);
    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);

    try {
      console.log('Sending request to OpenAI...');
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image and provide a detailed description and relevant tags. Return the response in this exact JSON format without any markdown formatting or additional text: { \"description\": \"<detailed description>\", \"tags\": [\"tag1\", \"tag2\", ...] }"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      });

      console.log('Received response from OpenAI');

      // Clean up uploaded file
      fs.unlinkSync(imagePath);

      // Parse the response content as JSON
      const analysisResult = extractJsonFromResponse(response.choices[0].message.content);
      
      res.json({
        description: analysisResult.description,
        tags: analysisResult.tags,
        confidence: 95 // Mock confidence score for demo
      });

    } catch (openaiError) {
      console.error('OpenAI API Error:', openaiError);
      console.error('Error details:', {
        status: openaiError.status,
        message: openaiError.message,
        type: openaiError.type
      });

      // Clean up uploaded file if it exists
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      if (openaiError.error?.type === 'invalid_request_error') {
        return res.status(401).json({ 
          error: 'Invalid API key or authentication error. Please check your OpenAI API key configuration.' 
        });
      }
      throw openaiError;
    }

  } catch (error) {
    console.error('General Error:', error);
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      error: 'Failed to analyze image. Please try again later or contact support if the problem persists.' 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error middleware:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size is too large. Max size is 5MB.' });
    }
  }
  res.status(500).json({ error: err.message });
});

// Test OpenAI connection on startup
testOpenAIConnection().then(isConnected => {
  if (isConnected) {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log('OpenAI connection verified successfully');
    });
  } else {
    console.error('Failed to connect to OpenAI. Please check your API key and try again.');
    process.exit(1);
  }
});
