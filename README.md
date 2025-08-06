# Kontext Inpainting Tool

A standalone NextJS application for AI-powered image inpainting using FLUX.1 Kontext LoRA. This tool allows you to upload images, create masks by painting areas to modify, and generate new content in those areas using advanced AI models.

## Features

- **Drag & Drop Image Upload**: Easy image upload with preview
- **Advanced Mask Editor**: Interactive painting tools with brush/eraser
- **AI-Powered Inpainting**: FLUX.1 Kontext LoRA model integration
- **Real-time Preview**: Show/hide mask overlay for verification
- **Result Gallery**: View and download generated images
- **Clean Interface**: Single-page application focused on functionality

## Setup Instructions

### 1. Install Dependencies

```bash
cd inpainting
npm install
# or
pnpm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Required: Your FAL.AI API key
GEMINI_API_KEY=your_fal_ai_api_key_here

# Required: Vercel Blob storage (for image uploads)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
```

**Get your FAL.AI API key:**
1. Visit [FAL.AI](https://fal.ai/)
2. Sign up/login to your account
3. Go to API Keys section
4. Create a new API key and copy it

**Get your Vercel Blob token:**
1. Visit [Vercel Dashboard](https://vercel.com/dashboard)
2. Go to Storage → Blob
3. Create a new Blob store or use existing
4. Copy the read/write token

### 3. Run Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

### 1. Upload an Image
- Drag and drop an image onto the upload area, or click to select a file
- Supports PNG, JPG, GIF and other common image formats (max 10MB)
- The image will be uploaded to Vercel Blob storage and displayed

### 2. Create a Mask
- Click **"Create Mask"** to enter drawing mode
- Use the **brush tool** to paint white areas you want to inpaint (modify)
- Use the **eraser tool** to remove parts of the mask
- Adjust brush size with the slider (5-50px)
- Click **"Save Mask"** when finished

### 3. Verify Your Mask
- Click **"Show Mask"** to see the binary mask overlay
- White areas = will be inpainted (replaced)
- Black areas = will be preserved (unchanged)
- Use **"Download Mask"** to save the mask for reference

### 4. Enter Your Prompt
- In the right panel, describe what you want to replace the white areas with
- Be specific and descriptive for best results
- Keep prompts under 400 characters for optimal performance

### 5. Generate
- Click **"Generate"** to start the inpainting process
- Processing takes 30-60 seconds using FLUX.1 Kontext LoRA
- Results will appear in the gallery below

### 6. Download Results
- View generated images in the results gallery
- Click **"Download"** on any result to save it
- Each result includes the original prompt and generation details

## Technical Details

### Model Configuration
- **Model**: FLUX.1 Kontext LoRA
- **Inference Steps**: 30
- **Guidance Scale**: 2.5
- **Strength**: 0.88
- **Output Format**: PNG

### Architecture
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with custom UI components
- **Mask Editor**: ReactSketchCanvas for interactive painting
- **Image Storage**: Vercel Blob for temporary file storage
- **AI Processing**: FAL.AI API integration

### File Structure
```
inpainting/
├── src/
│   ├── app/
│   │   ├── api/kontext-image/    # API route for Fal.AI integration
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Main inpainting interface
│   ├── components/
│   │   ├── ImageUpload.tsx       # Drag & drop upload
│   │   ├── MaskEditor.tsx        # Interactive mask creation
│   │   ├── PromptPanel.tsx       # Controls and instructions
│   │   ├── ResultsPanel.tsx      # Generated images gallery
│   │   └── ui/                   # Reusable UI components
│   └── lib/
│       └── utils.ts              # Utility functions
├── package.json
├── tailwind.config.js
└── README.md
```

## Troubleshooting

### Common Issues

**"GEMINI_API_KEY environment variable not configured"**
- Make sure you've added your FAL.AI API key to `.env.local`
- Restart the development server after adding environment variables

**"Failed to upload image"**
- Check your Vercel Blob token in `.env.local`
- Ensure image is under 10MB and is a valid image format

**"Mask appears to be empty"**
- Make sure you've painted some white areas with the brush tool
- Click "Save Mask" before trying to generate
- Check mask size - it should be more than a few KB

**Slow generation times**
- FLUX.1 Kontext LoRA typically takes 30-60 seconds
- Complex prompts or large images may take longer
- Check your FAL.AI account for rate limits

### Getting Help

1. Check the browser console for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure your FAL.AI account has sufficient credits
4. Try with a smaller image (under 1MB) for faster processing

## License

This project is built for educational and development purposes. Please respect the terms of service for FAL.AI and Vercel Blob storage. 