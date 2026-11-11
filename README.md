Markdown
# 🚀 Prompt.ai — AI-Powered Database Analytics & Reporting SaaS

Prompt.ai is an enterprise-grade SaaS platform designed to bridge the gap between complex relational databases and business intelligence. By leveraging natural language processing, users can query their databases (PostgreSQL, MySQL, SQL Server, Oracle) in plain text, receive real-time structured insights, and instantly export executive reports.

---

## ✨ Key Features

- **Natural Language Data Querying:** Ask questions in plain language and receive real-time, AI-generated analytical insights.
- **Multi-DBMS Compatibility:** Native connection pipelines for PostgreSQL, MySQL, SQL Server, and Oracle.
- **Automated Executive Reports:** Export query results to formatted Excel (`.xlsx`) and PDF documents with a single click.
- **Built-in Monetization & Billing:** Complete Stripe integration including Checkout, Webhooks, and a 7-day free trial workflow ($190/month subscription).
- **Secure Authentication & Data Isolation:** Powered by Supabase Auth and Row Level Security (RLS).
- **Modern Responsive UI:** Built with Next.js 14, Tailwind CSS, Dark/Light theme toggle, and audio speech synthesis support.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Frontend & Styling:** React 18, Tailwind CSS, Lucide Icons, React Markdown
- **Backend & Database:** Next.js Server Actions, [Supabase](https://supabase.com/) (PostgreSQL)
- **Payments & Subscriptions:** [Stripe API](https://stripe.com/) & Webhooks
- **Reporting Engine:** SheetJS (`xlsx`) and `jspdf`

---

## ⚙️ Getting Started

Follow these steps to set up and run Prompt.ai locally on your machine.

### 1. Prerequisites

Ensure you have the following installed:
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm** package manager
- A **Supabase** account (for Auth and Database)
- A **Stripe** developer account (for testing payments)

---

### 2. Installation

Clone the repository and install the project dependencies:

```bash
# Clone the repository
git clone [https://github.com/YOUR-USERNAME/prompt-ai.git](https://github.com/YOUR-USERNAME/prompt-ai.git)

# Navigate into the project folder
cd prompt-ai

# Install dependencies
npm install
3. Environment Variables Configuration
To run the application, you need to configure your environment variables.

Duplicate the .env.example file and rename it to .env.local:

Bash
cp .env.example .env.local
Open .env.local and fill in your respective credentials:

Code snippet
# -----------------------------------------------------------------------------
# SUPABASE CONFIGURATION
# -----------------------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=[https://your-project.supabase.co](https://your-project.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# -----------------------------------------------------------------------------
# STRIPE CONFIGURATION
# -----------------------------------------------------------------------------
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# -----------------------------------------------------------------------------
# AI / API KEYS
# -----------------------------------------------------------------------------
OPENAI_API_KEY=sk-proj-...
4. Database Setup
Log into your Supabase Dashboard and create a new project.

Run the SQL initialization scripts located in /supabase/schema.sql (or set up your database tables for User Profiles and Subscription states).

Ensure Row Level Security (RLS) is enabled for your user data tables.

5. Running the Application
Start the local development server:

Bash
npm run dev
Open http://localhost:3000 in your browser to test the login, landing page, and pricing options.

🚢 Deployment
This project is fully optimized for one-click deployment on Vercel:

Push your repository to GitHub.

Import the project into Vercel.

Add the environment variables configured in .env.local to the Vercel Project Settings.

Deploy!

📄 License
This repository is proprietary software available for asset acquisition.


---

### Como aplicar no seu projeto:

1. Abra o arquivo `README.md` no VS Code.
2. Cole o código acima.
3. Substitua `YOUR-USERNAME` pelo seu nome de usuário do GitHub.
4. Salve o arquivo, faça o commit e suba para o GitHub:

```bash
git add README.md
git commit -m "Docs: update README with comprehensive setup guide"
git push origin main