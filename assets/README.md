# Splash Screen Assets

## splash.jpg

Place your splash screen image here as `splash.jpg`.

**Recommended specifications:**
- **Dimensions:** 512x384 pixels (4:3 aspect ratio)
- **Format:** JPEG
- **File size:** Under 1MB for fast loading
- **Content:** Your app logo, branding, or themed artwork

The splash screen will:
- Display your image at full size (512x384px)
- Show for a minimum of 4 seconds
- Fall back to text if image is missing
- Scale/crop the image to fit if needed

**Alternative sizes that work well:**
- 640x480 (classic 4:3)
- 800x600 (larger 4:3)
- 1024x768 (high-res 4:3)

Just update the BrowserWindow dimensions in `src/main.ts` if you choose a different size.