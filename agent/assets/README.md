This directory should contain:
- icon.ico: Windows icon file for system tray

The icon.ico file should be:
- Format: Windows ICO format
- Sizes: 16x16, 32x32 pixels minimum
- Color depth: 32-bit with alpha channel
- Design: Simple, recognizable at small sizes

If icon.ico is missing, the system tray will use the default Windows application icon.

To add an icon:
1. Create or obtain a .ico file
2. Save as assets/icon.ico  
3. Rebuild the agent with: make build-tray