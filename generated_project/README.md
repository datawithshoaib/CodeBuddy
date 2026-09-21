# MarkdownNoteTaker

A simple web application for writing, previewing, and managing markdown notes directly in the browser.

## Features
- Live markdown preview using the `marked` library.
- Automatic saving of notes to `localStorage`.
- Export notes as a markdown (`.md`) file.
- Clear all notes with a single click.
- Responsive layout for both desktop and mobile devices.

## Tech Stack
- **HTML** – Structure of the application.
- **CSS** – Styling and responsive design.
- **JavaScript** – Application logic, live preview, storage, and export functionality.
- **marked** – External library for converting markdown to HTML in real time.

## Setup
1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Open `index.html` in a web browser. No additional build steps or package installations are required.

## Usage
- **Write Markdown**: Type your markdown content into the left-hand textarea.
- **Live Preview**: As you type, the right-hand pane updates instantly to show the rendered HTML.
- **Export**: Click the **Export** button to download the current note as a `.md` file.
- **Clear**: Use the **Clear** button to remove all content from the editor.
- **Automatic Saving**: Your notes are automatically saved to `localStorage`, so they persist across page reloads and browser sessions.

## Responsive Design
- **Desktop**: The editor and preview are displayed side‑by‑side for a comfortable writing experience.
- **Mobile**: The layout stacks vertically, with the editor on top and the preview below, ensuring usability on smaller screens.

## License
MIT License (see `LICENSE` file for details).
