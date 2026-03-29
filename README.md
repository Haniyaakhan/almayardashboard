# Labor Timesheet Application

A modern React-based labor timesheet management system built with Next.js, TypeScript, and Tailwind CSS.

## Features

- ✅ **Dynamic Date Generation**: Automatically generates dates based on selected month and year
- ✅ **Auto-calculation**: Automatically calculates total worked hours, overtime, and actual worked hours
- ✅ **Friday Highlighting**: Friday rows are highlighted in yellow
- ✅ **PDF Export**: Export timesheet as PDF with proper A4 formatting
- ✅ **Excel Export**: Export data to Excel spreadsheet
- ✅ **Print Support**: Print-optimized layout
- ✅ **TypeScript**: Full type safety
- ✅ **Responsive Design**: Works on different screen sizes
- ✅ **No CORS Issues**: Logo loaded from public folder

## Tech Stack

- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **jsPDF + html2canvas** - PDF export
- **xlsx (SheetJS)** - Excel export

## Getting Started

### Prerequisites

- Node.js 18.x or 20.x
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
labor-timesheet/
├── public/
│   └── npclogo.jpeg           # Company logo
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main page
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── TimesheetHeader.tsx # Header with logo and title
│   │   ├── InfoTable.tsx       # Project/labor information
│   │   ├── WorkTable.tsx       # Daily work entries table
│   │   ├── FooterSection.tsx   # Signatures and summary
│   │   └── ExportButtons.tsx   # PDF/Excel/Print buttons
│   ├── hooks/
│   │   └── useTimesheet.ts     # Custom hook for state management
│   ├── lib/
│   │   ├── pdfExport.ts        # PDF export logic
│   │   ├── excelExport.ts      # Excel export logic
│   │   └── dateUtils.ts        # Date generation utilities
│   └── types/
│       └── timesheet.ts        # TypeScript interfaces
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Building for Production

```bash
npm run build
npm start
```

## Deployment to Vercel

### Required Environment Variables

Set these in Vercel Project Settings -> Environment Variables (for Production, Preview, and Development as needed):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### Supabase Auth URL Configuration

In Supabase Dashboard -> Authentication -> URL Configuration:

1. Site URL: set to your Vercel production URL (for example `https://your-app.vercel.app`)
2. Add Redirect URLs for all environments you use:

```bash
http://localhost:3000
https://your-app.vercel.app
https://your-app-git-*.vercel.app
```

If these values are missing or incorrect, login/session behavior may fail after deployment.

### Option 1: Deploy via GitHub

1. Push your code to GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your GitHub repository
5. Vercel will auto-detect Next.js and deploy

### Option 2: Deploy via Vercel CLI

1. Install Vercel CLI:

```bash
npm install -g vercel
```

2. Deploy:

```bash
vercel
```

3. Follow the prompts

## Usage

1. **Select Month/Year**: Choose the month and year from the dropdowns
2. **Fill Information**: Enter labor name, project details, etc.
3. **Enter Work Data**: Input daily work hours
4. **Auto-calculation**: Total worked hours and overtime are calculated automatically
5. **Export**: Use the buttons to export as PDF or Excel, or print directly

## Features Details

### Auto-calculation
- **Total Worked Hours**: Sum of all daily worked hours
- **Over Time**: Sum of all daily overtime hours
- **Actual Worked**: Total Worked + Over Time (auto-calculated)

### Friday Highlighting
- All Friday rows are automatically highlighted in yellow (#ffcc00)

### Info Table Spacing
- Cells in the info table have 20px spacing between them for better readability

### Lunch Break Column
- The "Lunch Break Time" column has no border as per the original design

## Customization

### Change Company Name
Edit `src/components/InfoTable.tsx` line 45:
```tsx
<div className="text-[12px] font-bold mb-1">YOUR COMPANY NAME</div>
```

### Change Default Project Name
Edit `src/hooks/useTimesheet.ts` line 10:
```tsx
const [projectName, setProjectName] = useState('YOUR PROJECT NAME');
```

### Change Colors
Edit `tailwind.config.ts` to customize colors:
```ts
colors: {
  'timesheet-border': '#c8a055',
  'timesheet-bg': '#fffacd',
  'friday-highlight': '#ffcc00',
  'header-bg': '#e8762b94',
}
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is private and proprietary.

## Support

For issues or questions, please contact the development team.
