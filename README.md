# LeetTracker

LeetTracker is a comprehensive solution for tracking and organizing your LeetCode problem-solving journey. It helps you keep track of problems you've solved, store solution patterns, tricks, and personal notes in one centralized location.

![LeetTracker Logo](generated-icon.png)

## Features

- **Problem Management**: Add, edit, and delete LeetCode problems
- **Filter and Search**: Quickly find problems by title, difficulty level, or problem number
- **Solution Patterns**: Document and categorize algorithmic patterns for each problem
- **Tricks Collection**: Save clever tricks and techniques used to solve problems
- **Personal Notes**: Keep track of your thought process and learnings
- **Dark Mode Support**: Toggle between light and dark themes for comfortable viewing
- **Privacy Controls**: Toggle visibility of solutions and notes when reviewing problems
- **Markdown Support**: Format your notes and explanations with Markdown

## Technology Stack

- **Frontend**: React, TypeScript, TailwindCSS, Shadcn UI
- **Backend**: Node.js, Express
- **Database**: Firebase
- **State Management**: React Query
- **Routing**: Wouter
- **Form Handling**: React Hook Form
- **Validation**: Zod
- **Styling**: Tailwind CSS with dark mode support
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Firebase account (for database)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/LeetcodeTracker.git
   cd LeetcodeTracker
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up Firebase
   - Create a new Firebase project
   - Enable Firestore database
   - Generate a service account key
   - Save the key as `serviceAccountKey.json` in the project root

4. Start the development server
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

### Adding a New Problem

1. Click the "Add Problem" button in the header
2. Fill in problem details:
   - Title
   - LeetCode URL
   - Problem number
   - Difficulty
   - Problem content
   - Constraints
   - Examples

### Adding Patterns and Tricks

1. Navigate to a problem detail page
2. Click the reveal button (eye icon) near the Patterns or Tricks section
3. Edit the problem to add patterns or tricks
4. Each pattern or trick should include a name and description

### Adding Personal Notes

1. Navigate to a problem detail page
2. Click the reveal button (eye icon) near the Notes section
3. Edit the problem to add your personal notes
4. Use Markdown for better formatting

### Using Dark Mode

- Click the theme toggle button in the header to switch between light and dark modes

## Building for Production

To build the application for production:

```bash
npm run build
```

To start the production server:

```bash
npm run start
```

## Project Structure

```
LeetcodeTracker/
├── client/              # Frontend code
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utility functions
│   │   ├── pages/       # Page components
│   ├── index.html       # HTML template
├── server/              # Backend code
│   ├── firebase.ts      # Firebase configuration
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Database operations
├── shared/              # Shared types and schemas
│   ├── schema.ts        # Zod schemas
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- LeetCode for providing the problem-solving platform
- Shadcn UI for the beautiful component library
- All the contributors who have helped improve this project