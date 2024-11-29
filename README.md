# AI Image Analysis Backend

Backend server for the AI Image Analysis application, built with Node.js, Express, and OpenAI's Vision API.

## Features

- Image upload handling with Multer
- OpenAI Vision API integration using gpt-4o model
- Secure file handling with automatic cleanup
- CORS enabled for frontend communication
- Robust error handling and logging

## Setup

1. Clone the repository:
```bash
git clone [your-repo-url]
cd ai-image-analysis-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a .env file in the root directory:
```env
PORT=3001
OPENAI_API_KEY=your_openai_api_key_here
```

4. Start the server:
```bash
node server.js
```

The server will start on http://localhost:3001

## API Endpoints

### POST /api/analyze
Analyzes an uploaded image using OpenAI's Vision API.

Request:
- Method: POST
- Content-Type: multipart/form-data
- Body: form-data with 'image' field containing the image file

Response:
```json
{
  "description": "Detailed description of the image",
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 95
}
```

## Environment Variables

- `PORT`: Server port (default: 3001)
- `OPENAI_API_KEY`: Your OpenAI API key (required)

## Error Handling

The server includes comprehensive error handling for:
- Invalid file types
- File size limits (max 5MB)
- API authentication errors
- General server errors

## Security

- Automatic file cleanup after processing
- Input validation
- Secure error messages
- CORS configuration for frontend access
