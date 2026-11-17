/**
 * Tools for the Automation & AI Agents hub, layer by layer, with my own automation stack marked (from profile.ts:
 * Python, Node.js, Playwright, Chrome extensions, WhatsApp API, Power Automate, MCP). Ratings are rule-of-thumb
 * judgements (1–5), not benchmarks, and are labelled as such on the page. `npm` and `pypi` name the packages whose
 * weekly downloads the page shows live (npm from the browser, PyPI through a cached server route).
 */
export type AutoLayer = "No-code & iPaaS" | "RPA" | "Browser & testing" | "Scripts & schedulers" | "Orchestration & queues" | "CI/CD & infrastructure" | "Messaging" | "AI models & gateways" | "Agent frameworks" | "Agent protocols, memory & ops";
export const AUTO_LAYERS: { id: AutoLayer; what: string }[] = [
  { id: "No-code & iPaaS", what: "connect apps with boxes and arrows" },
  { id: "RPA", what: "robots that use screens, for systems without APIs" },
  { id: "Browser & testing", what: "code that drives a real browser" },
  { id: "Scripts & schedulers", what: "languages and timers for jobs you write" },
  { id: "Orchestration & queues", what: "long, multi-step and background work, reliably" },
  { id: "CI/CD & infrastructure", what: "shipping code and building servers automatically" },
  { id: "Messaging", what: "where automations talk to people" },
  { id: "AI models & gateways", what: "the models that read, write and decide" },
  { id: "Agent frameworks", what: "code for loops, tools, memory and teams of agents" },
  { id: "Agent protocols, memory & ops", what: "connecting agents to tools and data, and watching them" },
];
export type AutoRatings = { ease: number; power: number; ecosystem: number; control: number; scale: number };
export const AUTO_RATING_LABELS: [keyof AutoRatings, string][] = [
  ["ease", "Easy to start"],
  ["power", "Handles complex logic"],
  ["ecosystem", "Connectors & community"],
  ["control", "Self-host & control"],
  ["scale", "Grows with you"],
];
export type AutoTool = {
  id: string;
  name: string;
  layer: AutoLayer;
  icon?: string;
  mono?: string;
  color: string;
  mine: boolean;
  lang: string;
  what: string;
  strong: string;
  weak: string;
  when: string;
  npm?: string;
  pypi?: string;
  ratings: AutoRatings;
};
const r = (ease: number, power: number, ecosystem: number, control: number, scale: number): AutoRatings => ({ ease, power, ecosystem, control, scale });

export const AUTO_TOOLS: AutoTool[] = [
  // No-code & iPaaS
  { id: "zapier", name: "Zapier", layer: "No-code & iPaaS", icon: "zapier", color: "#ff4f00", mine: false, lang: "No code", what: "The best-known no-code automation service: a trigger in one app, actions in others.", strong: "Thousands of app connectors and the gentlest learning curve.", weak: "Priced per task; branching and loops get awkward and expensive.", when: "Small teams connecting SaaS apps without a developer.", ratings: r(5, 2, 5, 1, 3) },
  { id: "make", name: "Make", layer: "No-code & iPaaS", icon: "make", color: "#6d00cc", mine: false, lang: "No code", what: "Visual scenarios with branches, loops and data mapping on a canvas (formerly Integromat).", strong: "More logic per dollar than Zapier, and you can see data flow between modules.", weak: "The canvas gets busy; error handling needs care.", when: "Multi-step workflows with branching, built by non-developers.", ratings: r(4, 3, 4, 1, 3) },
  { id: "n8n", name: "n8n", layer: "No-code & iPaaS", icon: "n8n", color: "#ea4b71", mine: false, lang: "Low code + JavaScript", npm: "n8n", what: "Open-source workflow automation you can host yourself, with code nodes and AI agent nodes.", strong: "Self-hostable, so data stays with you; code when you need it; strong AI building blocks.", weak: "Self-hosting means you run, update and back it up; fewer connectors than Zapier.", when: "Teams that want control, privacy or complex logic, and AI agents inside workflows.", ratings: r(3, 4, 4, 5, 4) },
  { id: "powerautomate", name: "Power Automate", layer: "No-code & iPaaS", mono: "PA", color: "#0066ff", mine: true, lang: "Low code", what: "Microsoft's automation for Microsoft 365: cloud flows, approvals, and desktop robots.", strong: "Deep links into Outlook, Teams, SharePoint and Excel; standard connectors come with many Microsoft 365 plans.", weak: "Premium connectors (such as plain HTTP) cost extra; flows are hard to version and debug.", when: "Companies on Microsoft 365, especially approvals and Excel or SharePoint work.", ratings: r(4, 3, 4, 2, 4) },
  { id: "pipedream", name: "Pipedream", layer: "No-code & iPaaS", mono: "PD", color: "#1f2937", mine: false, lang: "Low code + Node.js / Python", what: "Workflows for developers: hosted triggers, and any step can be code.", strong: "Code-first flexibility with app logins and triggers handled for you.", weak: "Less friendly for non-developers.", when: "Developers who want quick integrations without running servers.", ratings: r(3, 4, 4, 2, 3) },
  { id: "workato", name: "Workato", layer: "No-code & iPaaS", mono: "W", color: "#0f766e", mine: false, lang: "Low code", what: "An enterprise integration and automation platform with governance built in.", strong: "Made for IT: security, audit trails and connectors to SAP, NetSuite and the like.", weak: "Enterprise pricing; too much for small teams.", when: "Large companies integrating many business systems.", ratings: r(3, 4, 4, 2, 5) },
  { id: "ifttt", name: "IFTTT", layer: "No-code & iPaaS", icon: "ifttt", color: "#000000", mine: false, lang: "No code", what: "Simple “if this, then that” applets for consumer apps and smart homes.", strong: "As simple as it gets.", weak: "Two-step logic only; not for business processes.", when: "Personal and smart-home automations.", ratings: r(5, 1, 3, 1, 1) },
  // RPA
  { id: "uipath", name: "UiPath", layer: "RPA", icon: "uipath", color: "#fa4616", mine: false, lang: "Low code + .NET", what: "The leading RPA platform: design robots in Studio, run and schedule them from Orchestrator.", strong: "Mature recorders, document understanding and management for large fleets of robots.", weak: "Expensive licences; robots break when screens change.", when: "Enterprises automating legacy desktop and web systems at scale.", ratings: r(3, 4, 4, 3, 5) },
  { id: "pad", name: "Power Automate Desktop", layer: "RPA", mono: "PAD", color: "#0066ff", mine: false, lang: "Low code", what: "Microsoft's desktop RPA: record or build flows that click through Windows and web apps.", strong: "Free for attended use on Windows; hands off to cloud flows.", weak: "Unattended robots need paid licences; Windows only.", when: "Desktop work on Windows, especially next to Microsoft 365.", ratings: r(4, 3, 3, 3, 3) },
  { id: "aa", name: "Automation Anywhere", layer: "RPA", mono: "AA", color: "#ff6a00", mine: false, lang: "Low code", what: "A cloud-based RPA platform with bots, document processing and analytics.", strong: "Web-based bot builder; strong in finance and back-office processes.", weak: "Enterprise pricing and complexity.", when: "Enterprises standardising RPA in the cloud.", ratings: r(3, 4, 3, 2, 5) },
  { id: "blueprism", name: "Blue Prism", layer: "RPA", mono: "BP", color: "#0f4c81", mine: false, lang: "Low code", what: "Enterprise RPA focused on governance and a controlled “digital workforce”.", strong: "Security and auditing for regulated industries.", weak: "Heavy and slower to build with than newer tools.", when: "Banks, insurers and other regulated companies.", ratings: r(2, 4, 3, 3, 5) },
  { id: "rpaframework", name: "RPA Framework", layer: "RPA", icon: "robotframework", color: "#000000", mine: false, lang: "Python", pypi: "rpaframework", what: "Open-source RPA libraries in Python, built on Robot Framework (from Robocorp).", strong: "Robots as code: version control and tests, no per-robot licence.", weak: "Needs developers; a smaller community than UiPath.", when: "Developer teams that prefer code to a visual studio.", ratings: r(2, 4, 3, 5, 4) },
  // Browser & testing
  { id: "playwright", name: "Playwright", layer: "Browser & testing", mono: "PW", color: "#2ead33", mine: true, lang: "JS · Python · Java · .NET", npm: "playwright", pypi: "playwright", what: "Microsoft's browser automation: drives Chromium, Firefox and WebKit, waiting for elements by itself.", strong: "Reliable auto-waiting, a recorder that writes code, and traces to debug failures; good for bots and tests alike.", weak: "Real browsers are heavy on servers, and some sites block automation.", when: "Portal bots, data collection and end-to-end tests. I use it for portal bots.", ratings: r(3, 5, 4, 5, 4) },
  { id: "puppeteer", name: "Puppeteer", layer: "Browser & testing", icon: "puppeteer", color: "#40b5a4", mine: false, lang: "JavaScript", npm: "puppeteer", what: "Google's Node.js library for controlling Chrome through the DevTools Protocol.", strong: "Close to Chrome itself: PDFs, screenshots, performance traces.", weak: "Chrome-first and JavaScript only; fewer test helpers than Playwright.", when: "Chrome automation, PDF generation and screenshots.", ratings: r(3, 4, 4, 5, 4) },
  { id: "selenium", name: "Selenium", layer: "Browser & testing", icon: "selenium", color: "#43b02a", mine: false, lang: "Many languages", npm: "selenium-webdriver", pypi: "selenium", what: "The original browser automation standard (WebDriver), available in almost every language.", strong: "Every language and browser, a huge community, and Grid for running in parallel.", weak: "More code, and flakier waits, than Playwright.", when: "Existing test suites and teams on Java or C#.", ratings: r(2, 4, 5, 5, 4) },
  { id: "cypress", name: "Cypress", layer: "Browser & testing", icon: "cypress", color: "#69d3a7", mine: false, lang: "JavaScript", npm: "cypress", what: "End-to-end testing for web apps, with time-travel debugging in the browser.", strong: "An excellent developer experience for front-end tests.", weak: "For testing, not general bots; limited across tabs and domains.", when: "Testing your own web app.", ratings: r(4, 3, 4, 4, 3) },
  { id: "chromeext", name: "Chrome extensions", layer: "Browser & testing", icon: "googlechrome", color: "#4285f4", mine: true, lang: "JavaScript", what: "Add-ons that read and change pages inside your own logged-in browser.", strong: "Runs in your session, so no stored passwords; adds buttons and automation to any portal.", weak: "Needs the browser open; breaks when the page's structure changes.", when: "Speeding up repetitive clicking in internal portals. I build these for enterprise portals.", ratings: r(3, 3, 3, 5, 2) },
  // Scripts & schedulers
  { id: "python", name: "Python", layer: "Scripts & schedulers", icon: "python", color: "#3776ab", mine: true, lang: "Python", what: "The default language of automation and data: scripts, APIs, Excel, PDFs, AI.", strong: "A library for everything: requests, pandas, openpyxl, Playwright, every AI SDK.", weak: "Packaging and environments trip beginners up.", when: "Almost any scripted automation.", ratings: r(4, 5, 5, 5, 4) },
  { id: "node", name: "Node.js", layer: "Scripts & schedulers", icon: "nodedotjs", color: "#5fa04e", mine: true, lang: "JavaScript", what: "JavaScript on servers, great for bots, webhooks and anything web-shaped.", strong: "The same language as the browser; fast at many simultaneous API calls.", weak: "Less suited to heavy number-crunching than Python.", when: "Webhook handlers, chat bots and browser bots.", ratings: r(4, 4, 5, 5, 4) },
  { id: "powershell", name: "PowerShell", layer: "Scripts & schedulers", mono: "PS", color: "#5391fe", mine: false, lang: "PowerShell", what: "Microsoft's automation shell for Windows, Microsoft 365 and Azure administration.", strong: "First-class access to Windows, Active Directory and Microsoft 365.", weak: "Verbose, and less common outside Windows shops.", when: "IT administration on Windows and Microsoft 365.", ratings: r(3, 4, 4, 5, 3) },
  { id: "bash", name: "Bash", layer: "Scripts & schedulers", icon: "gnubash", color: "#4eaa25", mine: false, lang: "Shell", what: "The Linux shell: glue for files, commands and servers.", strong: "On every server; perfect for small glue jobs.", weak: "Error handling and data work get ugly fast.", when: "Server housekeeping and small glue scripts.", ratings: r(3, 2, 4, 5, 2) },
  { id: "cron", name: "cron", layer: "Scripts & schedulers", icon: "linux", color: "#0b0b0b", mine: false, lang: "Five fields", npm: "node-cron", what: "The Unix scheduler: five fields that say when a command runs.", strong: "Built into every Linux server, nothing to install.", weak: "No retries, history or alerts unless you add them.", when: "Simple scheduled jobs on a server.", ratings: r(3, 1, 3, 5, 2) },
  { id: "appsscript", name: "Google Apps Script", layer: "Scripts & schedulers", icon: "googleappsscript", color: "#4285f4", mine: false, lang: "JavaScript", what: "JavaScript inside Google Workspace: Sheets, Gmail, Drive, Calendar.", strong: "Free, no server, triggers on a schedule or on edits; perfect for Sheets.", weak: "Daily quotas and a 6-minute limit per run; awkward for large projects.", when: "Automating Google Sheets and Gmail.", ratings: r(4, 3, 3, 2, 2) },
  { id: "excel", name: "Excel macros & Office Scripts", layer: "Scripts & schedulers", mono: "XL", color: "#217346", mine: false, lang: "VBA · TypeScript", what: "VBA macros and TypeScript Office Scripts that automate Excel workbooks.", strong: "Works where the data already is; Office Scripts can run in the cloud from Power Automate.", weak: "Macros are hard to version, and often blocked for security.", when: "Repetitive Excel formatting and reporting.", ratings: r(4, 2, 3, 2, 2) },
  // Orchestration & queues
  { id: "airflow", name: "Apache Airflow", layer: "Orchestration & queues", icon: "apacheairflow", color: "#017cee", mine: false, lang: "Python", pypi: "apache-airflow", what: "The standard open-source orchestrator: pipelines as Python DAGs on schedules.", strong: "A huge ecosystem of operators; managed versions on every major cloud.", weak: "Heavy to run; built around schedules rather than events.", when: "Scheduled data pipelines and batch jobs.", ratings: r(2, 5, 5, 5, 5) },
  { id: "prefect", name: "Prefect", layer: "Orchestration & queues", icon: "prefect", color: "#070e10", mine: false, lang: "Python", pypi: "prefect", what: "Pythonic orchestration: turn functions into flows with retries, caching and a UI.", strong: "Feels like plain Python; easy to start, hosted or self-run.", weak: "A smaller ecosystem than Airflow.", when: "Python teams that want orchestration without Airflow's weight.", ratings: r(4, 4, 3, 4, 4) },
  { id: "dagster", name: "Dagster", layer: "Orchestration & queues", mono: "DG", color: "#4f43dd", mine: false, lang: "Python", pypi: "dagster", what: "Asset-based orchestration: declare the data you want, and it works out what to run.", strong: "Lineage, testing and types built in.", weak: "New concepts to learn (assets, resources).", when: "Data platforms that care about lineage and quality.", ratings: r(3, 5, 3, 4, 4) },
  { id: "temporal", name: "Temporal", layer: "Orchestration & queues", icon: "temporal", color: "#000000", mine: false, lang: "Go · Java · TS · Python", npm: "@temporalio/client", pypi: "temporalio", what: "Durable execution: workflows written as code that survive crashes and can wait for days.", strong: "Long-running business processes that resume exactly where they were, with retries and timers.", weak: "A cluster to run (or pay for), and a different way of thinking.", when: "Payments, onboarding and order flows that must never be left half-done.", ratings: r(2, 5, 3, 5, 5) },
  { id: "celery", name: "Celery", layer: "Orchestration & queues", icon: "celery", color: "#37814a", mine: false, lang: "Python", pypi: "celery", what: "Python's classic background-task queue, with workers and schedules.", strong: "Battle-tested with Django and Flask; schedules through Celery Beat.", weak: "Configuration and monitoring take effort.", when: "Background jobs in Python web apps.", ratings: r(3, 4, 4, 5, 4) },
  { id: "bullmq", name: "BullMQ", layer: "Orchestration & queues", mono: "BQ", color: "#d6303a", mine: false, lang: "TypeScript", npm: "bullmq", what: "Job queues for Node.js on Redis, with retries, delays, priorities and rate limits.", strong: "A simple API with repeatable jobs and job flows.", weak: "Needs Redis; Node.js only.", when: "Background jobs in Node.js apps.", ratings: r(4, 4, 3, 5, 4) },
  { id: "rabbitmq", name: "RabbitMQ", layer: "Orchestration & queues", icon: "rabbitmq", color: "#ff6600", mine: false, lang: "Any (AMQP)", npm: "amqplib", what: "A widely used message broker: queues, routing and acknowledgements.", strong: "Reliable delivery and flexible routing between services.", weak: "Another server to run and watch.", when: "Decoupling services and sharing out work.", ratings: r(3, 4, 4, 5, 4) },
  { id: "kafka", name: "Apache Kafka", layer: "Orchestration & queues", icon: "apachekafka", color: "#231f20", mine: false, lang: "Any", npm: "kafkajs", what: "A distributed event log for streaming events between systems in real time.", strong: "Huge throughput, replayable history, many consumers per stream.", weak: "Operationally demanding; overkill for small volumes.", when: "Event-driven systems with high volume.", ratings: r(2, 5, 5, 4, 5) },
  { id: "stepfunctions", name: "AWS Step Functions", layer: "Orchestration & queues", mono: "SF", color: "#e7157b", mine: false, lang: "JSON / visual", what: "AWS's managed state machines that chain Lambda functions and AWS services.", strong: "No servers; visual workflows with retries and waits.", weak: "AWS only; definitions get long.", when: "Serverless workflows on AWS.", ratings: r(3, 4, 4, 1, 5) },
  // CI/CD & infrastructure
  { id: "ghactions", name: "GitHub Actions", layer: "CI/CD & infrastructure", icon: "githubactions", color: "#2088ff", mine: false, lang: "YAML", what: "Workflows in YAML that run on GitHub events or on a schedule.", strong: "Right next to the code; a big marketplace of ready actions; free minutes for public repositories.", weak: "Debugging means pushing commits; scheduled runs can start late at busy times.", when: "CI/CD and scheduled jobs for code that lives on GitHub.", ratings: r(4, 4, 5, 2, 4) },
  { id: "gitlab", name: "GitLab CI", layer: "CI/CD & infrastructure", icon: "gitlab", color: "#fc6d26", mine: false, lang: "YAML", what: "Pipelines defined in .gitlab-ci.yml, with runners you can host yourself.", strong: "Self-hostable end to end.", weak: "Configuration can sprawl.", when: "Teams on GitLab, often self-hosted.", ratings: r(3, 4, 4, 4, 4) },
  { id: "jenkins", name: "Jenkins", layer: "CI/CD & infrastructure", icon: "jenkins", color: "#d24939", mine: false, lang: "Groovy", what: "The veteran open-source automation server.", strong: "Runs anything, a plugin for everything, fully self-hosted.", weak: "Plugin upkeep and an ageing interface.", when: "Existing enterprise pipelines.", ratings: r(2, 5, 5, 5, 4) },
  { id: "terraform", name: "Terraform", layer: "CI/CD & infrastructure", icon: "terraform", color: "#844fba", mine: false, lang: "HCL", what: "Infrastructure as code: describe cloud resources, review the plan, apply it.", strong: "Works across every cloud; the plan shows changes before they happen.", weak: "State files need care; the licence changed in 2023 (OpenTofu is the open-source fork).", when: "Building and changing cloud environments repeatably.", ratings: r(3, 5, 5, 4, 5) },
  { id: "ansible", name: "Ansible", layer: "CI/CD & infrastructure", icon: "ansible", color: "#ee0000", mine: false, lang: "YAML", pypi: "ansible", what: "Agentless configuration automation over SSH, written as YAML playbooks.", strong: "Nothing to install on the machines; readable playbooks.", weak: "Slow on very large fleets; YAML logic gets complicated.", when: "Configuring servers and network devices.", ratings: r(3, 4, 4, 5, 4) },
  // Messaging
  { id: "whatsapp", name: "WhatsApp Cloud API", layer: "Messaging", icon: "whatsapp", color: "#25d366", mine: true, lang: "HTTP API", what: "Meta's official API for businesses to send and receive WhatsApp messages.", strong: "Reaches people where they already are, with buttons, lists and media.", weak: "Business verification, approved templates for messages outside a 24-hour window, and usage-based pricing.", when: "Notifications, approvals and bots for teams and customers in Indonesia. I use it for “job done” pings.", ratings: r(3, 3, 4, 2, 5) },
  { id: "telegram", name: "Telegram Bot API", layer: "Messaging", icon: "telegram", color: "#26a5e4", mine: false, lang: "HTTP API", what: "A free, open bot API: create a bot with BotFather and start messaging.", strong: "Free, no approval, rich bots with buttons and groups.", weak: "Far fewer business users than WhatsApp in Indonesia.", when: "Internal alerts and bots for technical teams.", ratings: r(5, 3, 4, 3, 4) },
  { id: "slack", name: "Slack API", layer: "Messaging", mono: "SL", color: "#4a154b", mine: false, lang: "HTTP API", npm: "@slack/bolt", what: "Bots, slash commands and interactive messages inside Slack.", strong: "Approvals with buttons; Workflow Builder for simple flows.", weak: "Only for teams that use Slack.", when: "Team alerts and approvals in Slack companies.", ratings: r(4, 4, 5, 2, 4) },
  { id: "twilio", name: "Twilio", layer: "Messaging", mono: "TW", color: "#f22f46", mine: false, lang: "HTTP API", npm: "twilio", what: "APIs for SMS, voice calls, WhatsApp and verification codes.", strong: "One API for many channels, worldwide.", weak: "Per-message costs add up; SMS rules differ by country.", when: "SMS and voice notifications, one-time codes.", ratings: r(4, 4, 4, 2, 5) },
  { id: "resend", name: "Resend", layer: "Messaging", icon: "resend", color: "#000000", mine: false, lang: "HTTP API", npm: "resend", what: "A developer-friendly API for sending email.", strong: "A simple API and email templates written in React.", weak: "Newer, with fewer marketing features.", when: "Transactional email from apps and automations.", ratings: r(5, 3, 3, 2, 4) },
  // AI models & gateways
  { id: "openrouter", name: "OpenRouter", layer: "AI models & gateways", icon: "openrouter", color: "#6366f1", mine: false, lang: "OpenAI-compatible API", npm: "@openrouter/ai-sdk-provider", what: "One key and one OpenAI-compatible API for hundreds of models from many providers.", strong: "Switch models by changing a name, compare prices, fall back between providers.", weak: "Another company between you and the model provider.", when: "Trying and switching models. The prompt-to-automation demo on this site uses it.", ratings: r(5, 4, 5, 2, 4) },
  { id: "openai", name: "OpenAI API", layer: "AI models & gateways", mono: "OA", color: "#10a37f", mine: false, lang: "HTTP API · SDKs", npm: "openai", pypi: "openai", what: "GPT models, embeddings, images and speech through one API.", strong: "Strong models, structured outputs and tool calling, and the biggest ecosystem.", weak: "Cloud only; your data goes to OpenAI (with business controls).", when: "General-purpose AI features and agents.", ratings: r(5, 5, 5, 1, 5) },
  { id: "anthropic", name: "Claude API", layer: "AI models & gateways", icon: "anthropic", color: "#d97757", mine: false, lang: "HTTP API · SDKs", npm: "@anthropic-ai/sdk", pypi: "anthropic", what: "Anthropic's Claude models for writing, reasoning, coding and tool use.", strong: "Strong with long documents, code and careful tool use.", weak: "Cloud only.", when: "Agents, coding assistants and document-heavy work.", ratings: r(5, 5, 4, 1, 5) },
  { id: "gemini", name: "Gemini API", layer: "AI models & gateways", icon: "googlegemini", color: "#8e75b2", mine: false, lang: "HTTP API · SDKs", npm: "@google/genai", pypi: "google-genai", what: "Google's multimodal models with very long context, through AI Studio or Vertex AI.", strong: "Long context; images, audio and video as input; a free tier in AI Studio.", weak: "Two entry points (AI Studio and Vertex AI) can confuse.", when: "Multimodal work and Google Cloud shops.", ratings: r(5, 5, 4, 1, 5) },
  { id: "mistral", name: "Mistral", layer: "AI models & gateways", icon: "mistralai", color: "#fa520f", mine: false, lang: "HTTP API · SDKs", pypi: "mistralai", what: "A European model provider with an API and several open-weight models.", strong: "Open weights you can host yourself, and EU data residency.", weak: "A smaller ecosystem than the largest providers.", when: "European data requirements or self-hosted open models.", ratings: r(4, 4, 3, 4, 4) },
  { id: "ollama", name: "Ollama", layer: "AI models & gateways", icon: "ollama", color: "#000000", mine: false, lang: "Local API", npm: "ollama", what: "Run open models (Llama, Qwen, Mistral, Gemma) on your own machine with one command.", strong: "Private and free to run, with an OpenAI-compatible local API.", weak: "Needs a good GPU or patience; small models are less capable.", when: "Private data, offline work and experiments.", ratings: r(4, 3, 4, 5, 2) },
  { id: "huggingface", name: "Hugging Face", layer: "AI models & gateways", icon: "huggingface", color: "#ffd21e", mine: false, lang: "Python", pypi: "transformers", what: "The hub of open models and datasets, with libraries to run and fine-tune them.", strong: "Almost every open model, plus hosted endpoints to serve them.", weak: "Running models yourself is real engineering work.", when: "Open models, fine-tuning and self-hosting.", ratings: r(3, 5, 5, 5, 4) },
  { id: "litellm", name: "LiteLLM", layer: "AI models & gateways", mono: "LL", color: "#0f766e", mine: false, lang: "Python", pypi: "litellm", what: "An open-source library and proxy that puts 100+ model APIs behind one OpenAI-style interface.", strong: "A self-hosted gateway with budgets, keys and logs.", weak: "One more service to run.", when: "Teams that want their own model gateway.", ratings: r(3, 4, 4, 5, 4) },
  // Agent frameworks
  { id: "langchain", name: "LangChain", layer: "Agent frameworks", icon: "langchain", color: "#1c3c3c", mine: false, lang: "Python · TypeScript", npm: "langchain", pypi: "langchain", what: "The best-known toolkit for LLM apps: models, prompts, tools, retrievers and integrations.", strong: "Integrations for almost every model, database and tool.", weak: "Many layers of abstraction, and frequent changes between versions.", when: "LLM apps that need many integrations.", ratings: r(3, 4, 5, 4, 4) },
  { id: "langgraph", name: "LangGraph", layer: "Agent frameworks", icon: "langchain", color: "#1c3c3c", mine: false, lang: "Python · TypeScript", npm: "@langchain/langgraph", pypi: "langgraph", what: "Agents as graphs of nodes and state, with checkpoints and pauses for human approval.", strong: "Fine control over the agent loop; durable state; interrupts for approvals.", weak: "More code than simpler agent SDKs.", when: "Production agents that need explicit control and approvals.", ratings: r(2, 5, 4, 5, 5) },
  { id: "llamaindex", name: "LlamaIndex", layer: "Agent frameworks", mono: "LI", color: "#7c3aed", mine: false, lang: "Python · TypeScript", npm: "llamaindex", pypi: "llama-index", what: "A framework for connecting models to your data: loaders, indexes, retrieval and agents.", strong: "Strong for answering questions over documents, with many data loaders.", weak: "Less general-purpose outside retrieval.", when: "Knowledge assistants over company documents.", ratings: r(3, 4, 4, 4, 4) },
  { id: "crewai", name: "CrewAI", layer: "Agent frameworks", icon: "crewai", color: "#ff5a50", mine: false, lang: "Python", pypi: "crewai", what: "Multi-agent “crews”: agents with roles and goals working through tasks together.", strong: "A team of agents in a few lines of readable Python.", weak: "Less control over each step; cost grows with every agent.", when: "Multi-agent prototypes such as research, then write.", ratings: r(4, 3, 3, 4, 3) },
  { id: "autogen", name: "AutoGen", layer: "Agent frameworks", mono: "AG", color: "#0078d4", mine: false, lang: "Python · .NET", pypi: "autogen-agentchat", what: "Microsoft's framework for agents that converse with each other and use tools.", strong: "Flexible multi-agent conversations, from Microsoft Research.", weak: "The API has changed a lot between versions.", when: "Experimental multi-agent systems.", ratings: r(2, 4, 3, 4, 3) },
  { id: "openaiagents", name: "OpenAI Agents SDK", layer: "Agent frameworks", mono: "OA", color: "#10a37f", mine: false, lang: "Python · TypeScript", npm: "@openai/agents", pypi: "openai-agents", what: "A light SDK for agents with tools, handoffs between agents, guardrails and tracing.", strong: "Few concepts and built-in tracing; works with other providers too.", weak: "Young, and smoothest with OpenAI's own models.", when: "Straightforward agents and handoffs.", ratings: r(4, 4, 3, 4, 4) },
  { id: "claudeagent", name: "Claude Agent SDK", layer: "Agent frameworks", icon: "claude", color: "#d97757", mine: false, lang: "TypeScript · Python", npm: "@anthropic-ai/claude-agent-sdk", pypi: "claude-agent-sdk", what: "The agent loop behind Claude Code as a library: tools, files, MCP, subagents and permissions.", strong: "A complete agent harness with file and shell tools, MCP and permission controls.", weak: "Built around Claude models.", when: "Agents that work with files, code and many tools.", ratings: r(4, 5, 3, 4, 4) },
  { id: "aisdk", name: "Vercel AI SDK", layer: "Agent frameworks", icon: "vercel", color: "#000000", mine: false, lang: "TypeScript", npm: "ai", what: "A TypeScript toolkit for AI apps: one API across providers, streaming, tool calling and agents.", strong: "Made for web apps, with providers for OpenAI, Anthropic, Google and OpenRouter.", weak: "TypeScript only.", when: "AI features inside Next.js and React apps.", ratings: r(4, 4, 4, 4, 4) },
  { id: "mastra", name: "Mastra", layer: "Agent frameworks", mono: "MA", color: "#111111", mine: false, lang: "TypeScript", npm: "@mastra/core", what: "A TypeScript agent framework with workflows, memory, retrieval and evaluations.", strong: "Agents and fixed workflows in one TypeScript toolkit.", weak: "A young project.", when: "TypeScript teams building agents.", ratings: r(3, 4, 3, 4, 4) },
  { id: "pydanticai", name: "Pydantic AI", layer: "Agent frameworks", icon: "pydantic", color: "#e92063", mine: false, lang: "Python", pypi: "pydantic-ai", what: "Type-safe agents in Python from the Pydantic team: validated outputs and tools.", strong: "Structured, validated results; feels like FastAPI.", weak: "A smaller ecosystem than LangChain.", when: "Python agents where correct output shapes matter.", ratings: r(4, 4, 3, 4, 4) },
  { id: "smolagents", name: "smolagents", layer: "Agent frameworks", icon: "huggingface", color: "#ffd21e", mine: false, lang: "Python", pypi: "smolagents", what: "A minimal Hugging Face library where agents act by writing and running Python.", strong: "Tiny and readable; acting through code is powerful.", weak: "Model-written code must run in a sandbox.", when: "Learning, and lightweight code agents.", ratings: r(4, 3, 3, 5, 2) },
  { id: "browseruse", name: "browser-use", layer: "Agent frameworks", mono: "BU", color: "#ff6b35", mine: false, lang: "Python", pypi: "browser-use", what: "Lets an AI agent operate a real browser to finish web tasks.", strong: "Agents that use websites without a script per page.", weak: "Slower and less predictable than a Playwright script; pages can carry hidden instructions.", when: "Web tasks too varied to script.", ratings: r(4, 3, 3, 4, 2) },
  // Agent protocols, memory & ops
  { id: "mcp", name: "Model Context Protocol", layer: "Agent protocols, memory & ops", icon: "modelcontextprotocol", color: "#000000", mine: true, lang: "Open standard", npm: "@modelcontextprotocol/sdk", pypi: "mcp", what: "An open standard for connecting AI apps to tools and data through MCP servers.", strong: "Write a tool server once and use it from any MCP client: assistants, IDEs, agents.", weak: "Servers you install can read data and take actions, so trust and permissions matter.", when: "Giving agents reusable, controlled access to your systems.", ratings: r(3, 4, 5, 5, 4) },
  { id: "a2a", name: "Agent2Agent (A2A)", layer: "Agent protocols, memory & ops", mono: "A2A", color: "#4285f4", mine: false, lang: "Open standard", npm: "@a2a-js/sdk", pypi: "a2a-sdk", what: "An open protocol for agents from different vendors to find each other and hand off tasks.", strong: "Agents built on different frameworks can collaborate.", weak: "Early, with fewer real deployments than MCP.", when: "Agents collaborating across systems and companies.", ratings: r(2, 4, 3, 5, 4) },
  { id: "pgvector", name: "pgvector", layer: "Agent protocols, memory & ops", icon: "postgresql", color: "#336791", mine: false, lang: "SQL", pypi: "pgvector", what: "Vector similarity search inside PostgreSQL.", strong: "Embeddings live next to your data; no new database.", weak: "Very large indexes need tuning.", when: "Retrieval when you already run Postgres.", ratings: r(4, 4, 4, 5, 4) },
  { id: "pinecone", name: "Pinecone", layer: "Agent protocols, memory & ops", mono: "PC", color: "#000000", mine: false, lang: "HTTP API", npm: "@pinecone-database/pinecone", pypi: "pinecone", what: "A managed vector database.", strong: "Serverless, scales without operations work.", weak: "Another paid service, and your data leaves your database.", when: "Large-scale semantic search without running infrastructure.", ratings: r(4, 4, 4, 1, 5) },
  { id: "chroma", name: "Chroma", layer: "Agent protocols, memory & ops", mono: "CH", color: "#f59e0b", mine: false, lang: "Python · TypeScript", npm: "chromadb", pypi: "chromadb", what: "An open-source embedding database that runs in your process or as a server.", strong: "The easiest way to start retrieval locally.", weak: "Less proven at very large scale.", when: "Prototypes and small retrieval apps.", ratings: r(5, 3, 4, 5, 3) },
  { id: "qdrant", name: "Qdrant", layer: "Agent protocols, memory & ops", icon: "qdrant", color: "#dc244c", mine: false, lang: "Rust (any client)", npm: "@qdrant/js-client-rest", pypi: "qdrant-client", what: "A fast open-source vector database, self-hosted or in the cloud.", strong: "Vector search with filters, efficiently.", weak: "One more service to run.", when: "Production retrieval with filters.", ratings: r(3, 4, 4, 5, 5) },
  { id: "langfuse", name: "Langfuse", layer: "Agent protocols, memory & ops", mono: "LF", color: "#0a60b5", mine: false, lang: "Python · TypeScript", npm: "langfuse", pypi: "langfuse", what: "Open-source tracing, prompt management and evaluation for AI apps.", strong: "See every step, token and cost of an agent run; self-hostable.", weak: "Another service, and you instrument your code.", when: "Debugging and monitoring agents in production.", ratings: r(4, 4, 4, 5, 4) },
  { id: "langsmith", name: "LangSmith", layer: "Agent protocols, memory & ops", icon: "langchain", color: "#1c3c3c", mine: false, lang: "Python · TypeScript", npm: "langsmith", pypi: "langsmith", what: "LangChain's platform for tracing, evaluating and monitoring AI apps.", strong: "Deep integration with LangChain and LangGraph; datasets and evaluations.", weak: "Hosted (self-hosting on enterprise plans).", when: "Teams already on LangChain or LangGraph.", ratings: r(4, 4, 4, 2, 4) },
];

/* ------------------------------------------------------------------ the same job in several tools */
export type Snippet = { tool: string; file: string; code: string; note?: string };
export type AutoTask = { id: string; title: string; ask: string; snippets: Snippet[] };
export const AUTO_TASKS: AutoTask[] = [
  {
    id: "report",
    title: "The morning report",
    ask: "Every morning at 7: get yesterday's orders from an API, total them per store and post the summary to the team chat.",
    snippets: [
      {
        tool: "python",
        file: "report.py  ·  cron: 0 7 * * *",
        code: `import datetime as dt, os, requests

day = (dt.date.today() - dt.timedelta(days=1)).isoformat()
orders = requests.get(f"{os.environ['API']}/orders",
                      params={"date": day}, timeout=30).json()

totals = {}
for o in orders:
    totals[o["store"]] = totals.get(o["store"], 0) + o["total"]

lines = [f"{s}: Rp {t:,.0f}" for s, t in sorted(totals.items())]
requests.post(os.environ["CHAT_WEBHOOK"],
              json={"text": f"Orders {day}\\n" + "\\n".join(lines)},
              timeout=30)`,
        note: "Run by cron on any Linux server: 0 7 * * * python3 /opt/jobs/report.py",
      },
      {
        tool: "ghactions",
        file: ".github/workflows/report.yml",
        code: `name: morning-report
on:
  schedule:
    - cron: "0 0 * * *"   # 07:00 in Jakarta = 00:00 UTC
  workflow_dispatch:        # plus a Run button
jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install requests && python report.py
        env:
          API: \${{ vars.API }}
          CHAT_WEBHOOK: \${{ secrets.CHAT_WEBHOOK }}`,
        note: "The same script, scheduled by GitHub instead of a server. Schedules run in UTC and can start a few minutes late.",
      },
      {
        tool: "n8n",
        file: "workflow (simplified)",
        code: `Schedule Trigger   every day at 07:00
      ↓
HTTP Request       GET {{ $env.API }}/orders
                   ?date={{ $today.minus({ days: 1 }).toISODate() }}
      ↓
Summarize          split by: store · sum of: total
      ↓
Slack              post to #sales:
                   {{ $json.store }}: Rp {{ $json.sum_total }}`,
        note: "Built by dragging four nodes onto the canvas; expressions in {{ }} are JavaScript.",
      },
      {
        tool: "powerautomate",
        file: "cloud flow",
        code: `Recurrence        every 1 day at 07:00 (SE Asia Standard Time)
      ↓
HTTP              GET https://api.example.com/orders
                  ?date=@{formatDateTime(addDays(utcNow(), -1), 'yyyy-MM-dd')}
      ↓
Parse JSON        schema of an order
      ↓
Apply to each     add each total to its store's variable
      ↓
Post message in a chat or channel   (Microsoft Teams)`,
        note: "The HTTP action is a premium connector; with an Excel or SharePoint source instead, standard connectors do.",
      },
      {
        tool: "appsscript",
        file: "Code.gs",
        code: `function morningReport() {
  const day = Utilities.formatDate(new Date(Date.now() - 864e5),
                                   "Asia/Jakarta", "yyyy-MM-dd");
  const orders = JSON.parse(
    UrlFetchApp.fetch(\`\${API}/orders?date=\${day}\`).getContentText());
  const totals = {};
  orders.forEach(o => totals[o.store] = (totals[o.store] || 0) + o.total);
  const text = \`Orders \${day}\\n\` + Object.entries(totals)
    .map(([s, t]) => \`\${s}: Rp \${t.toLocaleString("id-ID")}\`).join("\\n");
  UrlFetchApp.fetch(CHAT_WEBHOOK, { method: "post",
    contentType: "application/json", payload: JSON.stringify({ text }) });
}
// Triggers → Add trigger → morningReport · Time-driven · Day timer · 7am to 8am`,
        note: "Lives inside a Google Sheet or Drive; no server at all.",
      },
      {
        tool: "airflow",
        file: "dags/morning_report.py  ·  Airflow 3",
        code: `from datetime import timedelta
import pendulum, requests
from airflow.sdk import dag, task

@dag(schedule="0 7 * * *", catchup=False,
     start_date=pendulum.datetime(2026, 1, 1, tz="Asia/Jakarta"),
     default_args={"retries": 3, "retry_delay": timedelta(minutes=5)})
def morning_report():
    @task
    def extract(ds=None):            # ds = the day this run covers
        return requests.get(f"{API}/orders", params={"date": ds}, timeout=30).json()

    @task
    def totals(orders):
        out = {}
        for o in orders:
            out[o["store"]] = out.get(o["store"], 0) + o["total"]
        return out

    @task
    def notify(t):
        text = "\\n".join(f"{s}: Rp {v:,.0f}" for s, v in t.items())
        requests.post(CHAT_WEBHOOK, json={"text": text}, timeout=30)

    notify(totals(extract()))

morning_report()`,
        note: "Three tasks with retries, a history of every run, and backfills for missed days.",
      },
      {
        tool: "playwright",
        file: "download.ts  ·  when the portal has no API",
        code: `import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("https://portal.example.com/login");
await page.getByLabel("Username").fill(process.env.PORTAL_USER!);
await page.getByLabel("Password").fill(process.env.PORTAL_PASS!);
await page.getByRole("button", { name: "Sign in" }).click();

await page.getByRole("link", { name: "Orders" }).click();
const download = page.waitForEvent("download");
await page.getByRole("button", { name: "Export yesterday" }).click();
await (await download).saveAs("orders.xlsx");
await browser.close();`,
        note: "Replaces the API call when there isn't one; the totals and the chat message stay the same.",
      },
    ],
  },
  {
    id: "classify",
    title: "An AI step: sort an email",
    ask: "Read a support email and return a label the next step can trust: topic (billing, tech or other) and whether it's urgent.",
    snippets: [
      {
        tool: "openrouter",
        file: "classify.ts  ·  plain fetch",
        code: `const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.OPENROUTER_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: process.env.OPENROUTER_MODEL,
    messages: [
      { role: "system", content:
        'Classify the support email. Reply only with JSON: ' +
        '{"topic": "billing" | "tech" | "other", "urgent": true | false}' },
      { role: "user", content: email },
    ],
    response_format: { type: "json_object" },
  }),
});
const label = JSON.parse((await res.json()).choices[0].message.content);`,
        note: "The OpenAI-compatible format: the same code works for any model OpenRouter offers by changing OPENROUTER_MODEL.",
      },
      {
        tool: "aisdk",
        file: "classify.ts  ·  Vercel AI SDK",
        code: `import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

const { object: label } = await generateObject({
  model: openrouter(process.env.OPENROUTER_MODEL!),
  schema: z.object({
    topic: z.enum(["billing", "tech", "other"]),
    urgent: z.boolean(),
  }),
  system: "Classify the support email.",
  prompt: email,
});`,
        note: "The schema is checked for you: a wrong shape is an error, not a surprise in the next step.",
      },
      {
        tool: "pydanticai",
        file: "classify.py  ·  Pydantic AI",
        code: `from typing import Literal
from pydantic import BaseModel
from pydantic_ai import Agent

class Label(BaseModel):
    topic: Literal["billing", "tech", "other"]
    urgent: bool

agent = Agent(MODEL, output_type=Label,
              instructions="Classify the support email.")

label = agent.run_sync(email).output   # a validated Label`,
        note: "MODEL is a provider-prefixed name, such as an OpenAI or OpenRouter model.",
      },
      {
        tool: "langchain",
        file: "classify.py  ·  LangChain",
        code: `from langchain.chat_models import init_chat_model

llm = init_chat_model(MODEL, model_provider="openai")
classifier = llm.with_structured_output(Label)   # the same Label class

label = classifier.invoke([
    ("system", "Classify the support email."),
    ("user", email),
])`,
        note: "with_structured_output turns any supported chat model into a function that returns Label objects.",
      },
      {
        tool: "n8n",
        file: "workflow",
        code: `Gmail Trigger        new email in support@
      ↓
Text Classifier      categories: billing · tech · other
(AI node)            model: an OpenRouter or OpenAI chat model
      ↓
Switch               one branch per category
      ↓
Slack / Jira         route to the right team`,
        note: "The AI is one node in an otherwise ordinary workflow.",
      },
    ],
  },
  {
    id: "tool",
    title: "Give an agent a tool",
    ask: "Let a model fetch orders by itself: describe one tool, get_orders(date), and run it when the model asks.",
    snippets: [
      {
        tool: "openrouter",
        file: "the raw API: a tool definition",
        code: `// 1. Send the tool's description with the messages
"tools": [{
  "type": "function",
  "function": {
    "name": "get_orders",
    "description": "Orders for one day, with store and total",
    "parameters": {
      "type": "object",
      "properties": { "date": { "type": "string", "description": "YYYY-MM-DD" } },
      "required": ["date"]
    }
  }
}]

// 2. The model answers with a request instead of text
"tool_calls": [{ "id": "call_1", "type": "function",
  "function": { "name": "get_orders", "arguments": "{\\"date\\":\\"2026-11-11\\"}" } }]

// 3. You run it and send the result back; the model continues
{ "role": "tool", "tool_call_id": "call_1", "content": "[{\\"store\\":\\"Sinar\\",\\"total\\":182500}]" }`,
        note: "Every framework below wraps exactly this exchange. The Build an agent page walks through it live.",
      },
      {
        tool: "mcp",
        file: "server.ts  ·  an MCP server",
        code: `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "orders", version: "1.0.0" });

server.registerTool(
  "get_orders",
  { description: "Orders for one day, with store and total",
    inputSchema: { date: z.string().describe("YYYY-MM-DD") } },
  async ({ date }) => ({
    content: [{ type: "text", text: JSON.stringify(await fetchOrders(date)) }],
  }),
);

await server.connect(new StdioServerTransport());`,
        note: "Written once, usable from any MCP client: desktop assistants, IDEs and agent frameworks.",
      },
      {
        tool: "mcp",
        file: "server.py  ·  the same server in Python",
        code: `from mcp.server.fastmcp import FastMCP

mcp = FastMCP("orders")

@mcp.tool()
def get_orders(date: str) -> list[dict]:
    """Orders for one day, with store and total. date: YYYY-MM-DD"""
    return fetch_orders(date)

if __name__ == "__main__":
    mcp.run()`,
        note: "The function's name, type hints and docstring become the tool description.",
      },
      {
        tool: "langgraph",
        file: "agent.py  ·  LangGraph",
        code: `from langgraph.prebuilt import create_react_agent

def get_orders(date: str) -> list[dict]:
    """Orders for one day, with store and total. date: YYYY-MM-DD"""
    return fetch_orders(date)

agent = create_react_agent(
    model,                                   # any LangChain chat model
    tools=[get_orders, send_message],
    prompt="You prepare the morning orders report.",
)
result = agent.invoke({"messages": [("user", "Do yesterday's report")]})`,
        note: "A prebuilt reason-act loop; switch to a custom graph when you need approvals or branches.",
      },
      {
        tool: "openaiagents",
        file: "agent.py  ·  OpenAI Agents SDK",
        code: `from agents import Agent, Runner, function_tool

@function_tool
def get_orders(date: str) -> list[dict]:
    """Orders for one day, with store and total. date: YYYY-MM-DD"""
    return fetch_orders(date)

agent = Agent(name="Reporter",
              instructions="Prepare the morning orders report.",
              tools=[get_orders])

result = Runner.run_sync(agent, "Do yesterday's report")
print(result.final_output)`,
        note: "Each step is traced automatically, so you can see which tools it called and why.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ pick a stack */
export type AutoScenario = { id: string; label: string; need: string; picks: { layer: AutoLayer; tool: string; why: string; alt: string[] }[] };
export const AUTO_SCENARIOS: AutoScenario[] = [
  {
    id: "smb",
    label: "Small business, no developer",
    need: "Orders, invoices and reminders across a few online apps, run by the owner or an admin.",
    picks: [
      { layer: "No-code & iPaaS", tool: "make", why: "visual workflows with branches, without code", alt: ["zapier"] },
      { layer: "Scripts & schedulers", tool: "appsscript", why: "the order sheet already lives in Google Sheets", alt: ["excel"] },
      { layer: "Messaging", tool: "whatsapp", why: "customers and staff already answer WhatsApp", alt: ["telegram"] },
      { layer: "AI models & gateways", tool: "openrouter", why: "one key to try AI steps (sorting messages, drafting replies)", alt: ["openai"] },
    ],
  },
  {
    id: "m365",
    label: "A corporate team on Microsoft 365",
    need: "Approvals, Excel reports and SharePoint lists; IT wants everything inside Microsoft.",
    picks: [
      { layer: "No-code & iPaaS", tool: "powerautomate", why: "approvals, Teams and Excel connectors are built in", alt: ["workato"] },
      { layer: "RPA", tool: "pad", why: "the same platform covers desktop apps without APIs", alt: ["uipath"] },
      { layer: "Scripts & schedulers", tool: "excel", why: "Office Scripts run inside the flows", alt: ["powershell"] },
      { layer: "Scripts & schedulers", tool: "powershell", why: "for the IT admin jobs", alt: ["python"] },
    ],
  },
  {
    id: "devs",
    label: "A developer team on its own servers",
    need: "Integrations with internal systems, data kept in-house, everything in version control.",
    picks: [
      { layer: "No-code & iPaaS", tool: "n8n", why: "self-hosted workflows the whole team can read, with code nodes", alt: ["pipedream"] },
      { layer: "Scripts & schedulers", tool: "python", why: "for the jobs that outgrow a workflow", alt: ["node"] },
      { layer: "Orchestration & queues", tool: "temporal", why: "flows that must never be left half-done (payments, onboarding)", alt: ["celery", "bullmq"] },
      { layer: "CI/CD & infrastructure", tool: "ghactions", why: "tests, deploys and scheduled jobs next to the code", alt: ["gitlab"] },
      { layer: "Messaging", tool: "telegram", why: "free alerts for the on-call developer", alt: ["slack"] },
    ],
  },
  {
    id: "legacy",
    label: "Old systems without APIs",
    need: "Enterprise portals and desktop apps where the only way in is the screen.",
    picks: [
      { layer: "Browser & testing", tool: "playwright", why: "reliable bots for web portals, written as code", alt: ["selenium"] },
      { layer: "Browser & testing", tool: "chromeext", why: "speed up staff who are already in the portal", alt: [] },
      { layer: "RPA", tool: "uipath", why: "for desktop apps and large fleets of robots", alt: ["pad", "rpaframework"] },
      { layer: "Messaging", tool: "whatsapp", why: "tell people when the robot has finished, or failed", alt: ["telegram"] },
    ],
  },
  {
    id: "data",
    label: "A data team",
    need: "Pipelines from many sources into a warehouse, refreshed reliably every night.",
    picks: [
      { layer: "Orchestration & queues", tool: "airflow", why: "the standard for scheduled pipelines, managed on every cloud", alt: ["dagster", "prefect"] },
      { layer: "Scripts & schedulers", tool: "python", why: "the language of the whole data stack", alt: [] },
      { layer: "CI/CD & infrastructure", tool: "ghactions", why: "test pipeline code before it runs on real data", alt: ["gitlab"] },
      { layer: "Messaging", tool: "slack", why: "failure alerts where the team works", alt: ["telegram"] },
    ],
  },
  {
    id: "agent",
    label: "An AI agent product",
    need: "An assistant that reads documents, calls internal tools and asks before acting.",
    picks: [
      { layer: "AI models & gateways", tool: "openrouter", why: "switch and compare models without rewriting code", alt: ["litellm", "openai"] },
      { layer: "Agent frameworks", tool: "langgraph", why: "explicit control of the loop, with pauses for approval", alt: ["aisdk", "openaiagents"] },
      { layer: "Agent protocols, memory & ops", tool: "mcp", why: "internal tools exposed once, reusable by any agent", alt: [] },
      { layer: "Agent protocols, memory & ops", tool: "pgvector", why: "document search inside the database you already run", alt: ["qdrant"] },
      { layer: "Agent protocols, memory & ops", tool: "langfuse", why: "see every step, token and cost of every run", alt: ["langsmith"] },
    ],
  },
  {
    id: "field",
    label: "Field operations, WhatsApp-first",
    need: "Sales and delivery teams on phones; reports come in as messages and photos.",
    picks: [
      { layer: "Messaging", tool: "whatsapp", why: "where the field team already is", alt: ["telegram"] },
      { layer: "No-code & iPaaS", tool: "n8n", why: "turns incoming messages into rows, tasks and replies", alt: ["make"] },
      { layer: "AI models & gateways", tool: "openrouter", why: "read free-text messages and photos of receipts", alt: ["gemini"] },
      { layer: "Scripts & schedulers", tool: "python", why: "the daily summary and the jobs that need more logic", alt: ["appsscript"] },
    ],
  },
];

export const PYPI_PACKAGES = [...new Set(AUTO_TOOLS.map((t) => t.pypi).filter((x): x is string => !!x))];
