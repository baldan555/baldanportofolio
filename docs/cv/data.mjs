// One source for every CV template (build.mjs). English uses UK/Australian spelling; build.mjs converts it for the US.
// `**text**` renders bold. Only facts from the original CV and the portfolio's own project pages.

export const person = {
  name: "N.I.S. BALDANULLAH",
  title: "Full Stack Data Scientist",
  location: "Makassar · Jakarta, Indonesia",
  phone: "+62 812 4594 1155",
  email: "baldanullah55@gmail.com",
  linkedin: "linkedin.com/in/baldanullah",
  portfolio: "portofolio.baldanproject.my.id",
};

export const en = {
  summary:
    "Full Stack Data Scientist who builds data products end to end: from SQL pipelines, cloud databases and machine learning / deep learning models to the dashboards, web platforms, mobile field apps and automation bots that people use every day. Currently builds and runs the internal systems of Indosat Ooredoo Hutchison's Kalisumapa channel team (via Mitracomm): a sales-operations portal, a geofenced promoter app, a helpdesk, manpower and budget trackers and portal bots, all deployed on Google Cloud. Earlier delivered BI, profit and fraud analytics for a Telkomsel distributor and bitumen price forecasting for Kalla Group. Works across Python, SQL, Next.js, FastAPI, TensorFlow, Power BI and GCP, and applies Generative and Agentic AI to real workflows.",
  summaryShort:
    "Full Stack Data Scientist who builds data products end to end: SQL pipelines, ML/DL models, dashboards, web platforms, mobile field apps and automation bots. Builds and runs the internal systems of Indosat Ooredoo Hutchison's Kalisumapa channel team on Google Cloud; earlier BI and fraud analytics for a Telkomsel distributor and bitumen price forecasting for Kalla Group.",
  highlights: [
    ["20+", "apps, dashboards & bots shipped to real users"],
    ["8", "enterprise portal automations"],
    ["30+", "live ML / DL projects on the portfolio"],
    ["70%", "of decisions enhanced by the bitumen forecast"],
    ["3.76", "GPA, Computer Science (Data Science)"],
  ],
  keySkills: [
    "Data analysis & SQL",
    "Machine learning & deep learning",
    "Business intelligence (Power BI, Tableau)",
    "Dashboards & data visualisation",
    "Full-stack web (Next.js, FastAPI)",
    "Mobile field apps (Expo, Android)",
    "Cloud deployment (Google Cloud, Docker)",
    "Business process automation",
    "Generative & agentic AI, MCP",
    "Database design & administration",
    "Stakeholder communication",
    "Problem solving",
  ],
  keySkillsUk: [
    ["Data & machine learning", "Python, SQL, scikit-learn and TensorFlow, from exploratory analysis to models that run in production and in the browser."],
    ["Business intelligence", "Power BI, Tableau and Looker Studio dashboards, and web dashboards when the analysis outgrows them."],
    ["Full-stack products", "Next.js, FastAPI, Prisma and Expo: portals, SaaS and mobile field apps with authentication and role-based access."],
    ["Cloud & data operations", "Google Cloud (Cloud Run, Cloud SQL, Cloud Storage, BigQuery, Firestore) and Docker; daily data extraction and master data."],
    ["Automation & AI", "Playwright and Chrome-extension bots, Oracle Fusion imports, WhatsApp reports, LLM integration, AI agents and MCP."],
    ["Working with people", "Sits with the people doing the work, ships a first version fast and keeps improving it with them."],
  ],
  jobs: [
    {
      role: "Tech Support Administration",
      type: "Contract",
      org: "PT Mitracomm Ekasarana",
      orgNote: "placed at Indosat Ooredoo Hutchison, Circle Kalisumapa",
      orgUs: "PT Mitracomm Ekasarana (for Indosat Ooredoo Hutchison)",
      where: "Makassar, Indonesia",
      from: [5, 2026],
      to: null,
      duties: [
        "Run end-to-end data operations for Sales & Distribution: daily GCP data extraction for Trade Revenue, SnD KPI dashboard updates, Channel Operation distribution tracking across Kalisumapa, partner status reports, monthly master data, partner management and payout administration.",
        "**Portal Channel Operation** (FastAPI, pandas, Cloud Storage, Firestore, Cloud Run): built and maintain the team's daily workbench, six work areas behind one login with per-page, per-tab and per-territory access; Excel uploads become clean masters, P&L ingest with purchase validation, server-side exports, email/WhatsApp reminders and an activity log.",
        "**PROTRACK** (FastAPI, Firestore, Android/Kotlin): field app for promoters. Check-in only within 500 m of the outlet with camera-only photos; fake GPS, replayed requests and impossible jumps rejected; every SIM card scanned once and its activation checked; live tracking on the portal.",
        "**TickMate** helpdesk (Next.js, Prisma), **Fulfillment Manpower** (Next.js, Firestore) and **Budget Tower** for the Marketing division (Next.js, Cloud Storage): role- and region-scoped access, full audit trails, Excel in / Excel out, vacancy and budget-burn tracking.",
        "Automated enterprise portals: a web app that replaced the Oracle Fusion sales-order macro (quantity sheet in, validated import ZIP out) and Playwright / Chrome-extension bots for PO approvals, SO downloads and daily WhatsApp reports; plus a D-1 KPI wall for the office TV and Embed Hub for the teams' Excel dashboards.",
      ],
      dutiesAu: [
        "Run end-to-end data operations for Sales & Distribution: daily GCP data extraction for Trade Revenue, SnD KPI dashboard updates and Channel Operation distribution tracking across Kalisumapa.",
        "Prepare partner status reports, manage monthly master data, partner management and payout administration, and maintain the systems used by Distribution, Sales Effectiveness and Finance.",
        "Design, build and maintain the team's internal web platforms, field apps and automations on Google Cloud.",
      ],
      wins: [
        "Replaced a pile of separate spreadsheets and one-off tools with **Portal Channel Operation** (FastAPI, Cloud Run): six work areas, per-page, per-tab and per-territory access, P&L ingest with purchase validation.",
        "Made promoter attendance verifiable with **PROTRACK** (FastAPI, Firestore, Android): geofenced, camera-only check-ins, fake-GPS and replay detection, every SIM sold scanned once.",
        "Shipped **TickMate** (helpdesk), **Fulfillment Manpower** and **Budget Tower** (Next.js) with role-based access, audit trails and Excel in / Excel out.",
        "Delivered 8 enterprise portal automations, including a web app that replaced the Oracle Fusion sales-order macro, plus a D-1 KPI wall for the office TV.",
      ],
      short: [
        "Run daily GCP data extraction, SnD KPI dashboards and distribution tracking for Sales & Distribution across Kalisumapa.",
        "Built the team's operations portal (FastAPI, Cloud Run): six work areas, per-page and per-territory access, Excel uploads turned into clean masters.",
        "Built PROTRACK, a geofenced promoter app (FastAPI, Firestore, Android) that rejects fake GPS and checks every SIM card sold.",
        "Built a helpdesk, manpower and budget trackers (Next.js) and 8 portal automations, including an Oracle Fusion order importer.",
      ],
    },
    {
      role: "Data Analyst",
      type: "Contract",
      org: "PT Makassar Mega Putra Prima",
      orgNote: "Telkomsel distributor",
      where: "Makassar, Indonesia",
      from: [8, 2024],
      to: [5, 2026],
      duties: [
        "Managed and optimised cloud databases and wrote the SQL behind each analysis to support strategic decisions.",
        "Designed interactive dashboards in Power BI and, when the analysis outgrew Power BI, built web-based dashboards instead (Python, Next.js).",
        "Delivered profit analysis, fraud transaction detection and Nochip tracking for daily operations and business strategy.",
      ],
      wins: [
        "Moved analyses that outgrew Power BI into web dashboards (Python, Next.js).",
        "Delivered fraud transaction detection, profit monitoring and Nochip tracking used in daily operations.",
      ],
      short: [
        "Managed cloud databases and wrote SQL for every analysis; built Power BI dashboards and web dashboards (Python, Next.js) beyond Power BI's limits.",
        "Delivered profit analysis, fraud transaction detection and Nochip tracking for daily operations.",
      ],
    },
    {
      role: "Big Data Analyst",
      type: "Intern",
      org: "Kalla Group",
      where: "Makassar, Indonesia",
      from: [8, 2023],
      to: [12, 2023],
      duties: [
        "Led scalable data pipelines that cleansed, stored and pre-processed large datasets from several subsidiaries, using SQL for data management.",
        "Built a recurrent neural network forecasting FOB Bitumen Singapore prices and deployed it in an interactive Plotly + Streamlit dashboard for real-time monitoring of predictions and trends; the end-to-end solution enhanced 70% of decision-making processes.",
      ],
      wins: ["Enhanced 70% of decision-making processes with an end-to-end forecasting solution, from pipeline to live dashboard."],
      short: ["Built SQL pipelines across subsidiaries and an RNN forecasting FOB Bitumen Singapore prices, deployed in a Plotly + Streamlit dashboard; enhanced 70% of decision-making processes."],
    },
    {
      role: "Web Data Management",
      type: "Contract",
      org: "INIPASTI Communika",
      where: "Makassar, Indonesia",
      from: [4, 2021],
      to: [4, 2022],
      duties: ["Tracked and analysed website visitors to improve audience engagement and content strategy; optimised posting times from audience behaviour, sharpening stakeholder decisions."],
      wins: [],
      short: ["Analysed website visitors and optimised posting times from audience behaviour to lift engagement."],
    },
  ],
  projects: [
    {
      name: "GatherInsight (2026)",
      text: "SaaS for field research that comes with its proof: surveys, interviews, traffic counts and geo mapping. Bilingual (ID/EN) web platform plus three mobile apps with offline sync, GPS and audio.",
      stack: "Next.js, Prisma, PostgreSQL, Expo / React Native, Cloud Run, Cloud SQL, Cloud Storage, Cloud Scheduler",
      link: "gatherinsight.baldanproject.my.id",
      short: "Field-research SaaS: web platform + three offline-first mobile apps (Next.js, PostgreSQL, Expo, Cloud Run).",
    },
    {
      name: "Portfolio platform (2026)",
      text: "30+ live projects: ML and deep-learning demos running in the browser, five analytics dashboards (Online Retail sales, A/B test, live Jakarta air quality, Telco churn, and an FWA base-health case with cohorts, a churn model, campaign tests and customer surveys), data-engineering and automation labs.",
      stack: "Next.js 16, React 19, TypeScript, Tailwind CSS, Python, Docker, Cloud Build, Cloud Run",
      link: "portofolio.baldanproject.my.id",
      short: "30+ live ML/DL demos and five analytics dashboards (Next.js, TypeScript, Python, Cloud Run).",
    },
  ],
  ml: "Telco Customer Churn (ROC-AUC 0.83) • Manufacturing Defects (F1 0.89 on 3% failures) • Credit Risk (39% lower cost of errors) • Complaint Router (96% routed to the right team) • Feedback Themes (ROC-AUC 0.96) • Card Fraud Review Queue (79 of 108 frauds in the top 100 alerts) • Bank Churn Targeting • Insurance Claim Fraud • Heart Failure Prediction • Student Performance • Air Quality Virtual Sensor • Demand Forecasting • Product Recommender • Uplift Promo Targeting • House Price Range • Mall Customer Segments • NYC Taxi Anomalies",
  dl: "Handwritten Digits CNN (99.2% accuracy) • Hand Gestures • Live Object Detection • Sign Language Speller • Face Mood Mirror • Drowsiness Detector • Virtual Mouse • Head & Blink Keyboard • Traffic Counter on London JamCams • Doodle Duel • Live Forecast Lab (LSTMs) • Bilingual Sentiment (BiLSTM, Indonesian/English) • Air Synth",
  mlShort: "17 ML models (e.g. churn ROC-AUC 0.83, defects F1 0.89, complaint routing 96%) and 13 deep-learning demos (digits CNN 99.2%, live object detection, sign language, BiLSTM sentiment).",
  virtual: "Business Intelligence with Power BI (PwC Switzerland × Forage, 2024) • British Airways Sentiment & Predictive Analysis (British Airways × Forage, 2024)",
  education: [
    {
      title: "Bachelor of Computer Science, Data Science",
      org: "Universitas Pancasila",
      where: "South Jakarta, Indonesia",
      from: [7, 2020],
      to: [8, 2024],
      bullets: [
        "GPA 3.76 / 4.00. Thesis: “Forecasting Free On Board Bitumen Singapore Price Using Recurrent Neural Network”.",
        "Led paper projects: “Comparison of TOPSIS, WP and SAW Methods for Determining the Best Journalist”, “Testing Web&#8209;Based Learning Applications Using Equivalence Partitioning”, “Parallel Processing on Machine Learning Modelling Using the Random Forest Algorithm”.",
      ],
    },
    {
      title: "Machine Learning Path, Graduated Cohort",
      org: "Bangkit Academy (led by Google, GoTo and Traveloka)",
      where: "Online",
      from: [1, 2023],
      to: [7, 2023],
      bullets: ["Supervised and unsupervised learning, deep learning, NLP and computer vision; capstone: a tire-damage classification model deployed into a vehicle-booking service mobile app."],
    },
  ],
  courses:
    "Database Design & Database Programming with SQL (BPSDMP Jakarta, 2024) • Azure AI Engineer (Kominfo × Microsoft Azure, 2024) • Data Analysis with Python (freeCodeCamp, 2024) • Tableau Fundamentals (DataCamp, 2024) • Google Data Analytics (Google, 2023) • Deep Learning with TensorFlow (2023) • Machine Learning (Stanford University, 2023) • Data Visualization (ASEAN DSE, 2022)",
  certs: [
    ["Database Administrator", "BNSP", [12, 2024], [12, 2027]],
    ["TensorFlow Developer Certificate", "Google", [12, 2023], [12, 2026]],
  ],
  skills: [
    ["Data & ML", "Python, SQL, pandas, NumPy, scikit-learn, TensorFlow / Keras, time series (RNN, LSTM), NLP, computer vision, MediaPipe, A/B testing, cohort & survival analysis."],
    ["BI & visualisation", "Power BI, Tableau, Looker Studio, Excel, Plotly, Streamlit, Seaborn, Matplotlib, custom SVG / d3 dashboards."],
    ["Data & databases", "BigQuery, PostgreSQL, MySQL, SQLite, Firestore, Oracle Database, Pentaho, Cloud Storage, data modelling, ETL pipelines."],
    ["Web, SaaS & mobile", "TypeScript, Next.js, React, Tailwind CSS, Prisma, FastAPI, Node.js / Express, REST APIs, authentication & role-based access, Expo / React Native, Android (Kotlin)."],
    ["Cloud & DevOps", "Google Cloud (Cloud Run, Cloud Build, Cloud SQL, Cloud Storage, Cloud Scheduler, Firebase), Docker."],
    ["Automation & AI", "Playwright, Chrome extensions, Power Automate, WhatsApp API, Oracle Fusion, SAP, LLM integration, AI agents & agentic workflows, prompt engineering, Model Context Protocol (MCP), no-code / low-code."],
  ],
  soft: "Problem solving, analytical thinking, communication, collaboration, project management, adaptability.",
  languages: "Indonesian (native), English (TOEFL ITP 617 predicted, IELTS 6.0).",
};

// Bahasa Indonesia, for employers in Indonesia
export const id = {
  summary:
    "Full Stack Data Scientist yang membangun produk data dari awal sampai akhir: pipeline SQL, database cloud, dan model machine learning / deep learning, sampai dashboard, platform web, aplikasi lapangan, dan bot otomasi yang dipakai setiap hari. Saat ini membangun dan mengelola sistem internal tim channel Indosat Ooredoo Hutchison Circle Kalisumapa (melalui Mitracomm): portal operasional penjualan, aplikasi promotor berbasis geofence, helpdesk, pelacak manpower dan anggaran, serta bot portal, semuanya berjalan di Google Cloud. Sebelumnya menangani BI, analisis profit dan deteksi fraud untuk distributor Telkomsel, serta peramalan harga bitumen untuk Kalla Group. Menguasai Python, SQL, Next.js, FastAPI, TensorFlow, Power BI, dan GCP, serta menerapkan Generative dan Agentic AI pada alur kerja nyata.",
  highlights: [
    ["20+", "aplikasi, dashboard & bot dipakai pengguna nyata"],
    ["8", "otomasi portal enterprise"],
    ["30+", "project ML / DL live di portofolio"],
    ["70%", "keputusan terbantu oleh prediksi harga bitumen"],
    ["3,76", "IPK Ilmu Komputer (Data Science)"],
  ],
  jobs: [
    {
      duties: [
        "Menjalankan operasional data Sales & Distribution: ekstraksi data GCP harian untuk Trade Revenue, pembaruan dashboard KPI SnD, pelacakan distribusi Channel Operation di wilayah Kalisumapa, laporan status partner, master data bulanan, manajemen partner, dan administrasi payout.",
        "**Portal Channel Operation** (FastAPI, pandas, Cloud Storage, Firestore, Cloud Run): membangun dan memelihara portal kerja harian tim, enam area kerja dalam satu login dengan akses per halaman, per tab, dan per wilayah; unggahan Excel diolah menjadi master data bersih, input P&L dengan validasi pembelian, ekspor dari server, pengingat email/WhatsApp, dan log aktivitas.",
        "**PROTRACK** (FastAPI, Firestore, Android/Kotlin): aplikasi lapangan untuk promotor. Check-in hanya dalam radius 500 m dari outlet dengan foto langsung dari kamera; fake GPS, request berulang, dan lompatan lokasi yang mustahil ditolak; setiap kartu SIM dipindai sekali dan aktivasinya dicek; pemantauan langsung di portal.",
        "**TickMate** (helpdesk, Next.js, Prisma), **Fulfillment Manpower** (Next.js, Firestore), dan **Budget Tower** untuk divisi Marketing (Next.js, Cloud Storage): akses berdasarkan peran dan wilayah, jejak audit lengkap, impor/ekspor Excel, pelacakan kursi kosong dan serapan anggaran.",
        "Otomasi portal enterprise: aplikasi web pengganti makro sales order Oracle Fusion (unggah sheet kuantitas, keluar ZIP impor yang sudah divalidasi) serta bot Playwright / ekstensi Chrome untuk approval PO, unduh SO, dan laporan harian ke WhatsApp; ditambah layar KPI D-1 untuk TV kantor dan Embed Hub untuk dashboard Excel tim.",
      ],
    },
    {
      duties: [
        "Mengelola dan mengoptimalkan database cloud serta menulis query SQL untuk setiap kebutuhan analisis guna mendukung keputusan strategis.",
        "Merancang dashboard interaktif di Power BI dan, ketika analisis melampaui kemampuan Power BI, membangun dashboard berbasis web (Python, Next.js).",
        "Menangani analisis profit, deteksi transaksi fraud, dan pelacakan Nochip untuk operasional harian dan strategi bisnis.",
      ],
    },
    {
      duties: [
        "Memimpin pembangunan pipeline data untuk membersihkan, menyimpan, dan memproses data skala besar dari beberapa anak perusahaan, menggunakan SQL untuk pengelolaan data.",
        "Membangun model recurrent neural network untuk meramal harga FOB Bitumen Singapura dan menerapkannya dalam dashboard interaktif Plotly + Streamlit untuk memantau prediksi dan tren secara real time; solusi end-to-end ini meningkatkan 70% proses pengambilan keputusan.",
      ],
    },
    {
      duties: ["Melacak dan menganalisis pengunjung website untuk meningkatkan engagement dan strategi konten; mengoptimalkan waktu posting berdasarkan perilaku audiens sehingga keputusan stakeholder lebih tepat."],
    },
  ],
  projects: [
    { text: "SaaS riset lapangan yang dilengkapi bukti: survei, wawancara, traffic count, dan pemetaan geografis. Platform web dua bahasa (ID/EN) dan tiga aplikasi mobile dengan sinkronisasi offline, GPS, dan rekaman audio." },
    { name: "Platform portofolio (2026)", text: "30+ project live: demo ML dan deep learning yang berjalan di browser, lima dashboard analitik (penjualan Online Retail, A/B test, kualitas udara Jakarta langsung, churn Telco, dan studi kasus kesehatan basis pelanggan FWA dengan kohort, model churn, uji kampanye, dan survei pelanggan), serta lab data engineering dan otomasi." },
  ],
  ml: "Telco Customer Churn (ROC-AUC 0,83) • Manufacturing Defects (F1 0,89 pada 3% kegagalan) • Credit Risk (biaya kesalahan 39% lebih rendah) • Complaint Router (96% tepat ke tim yang benar) • Feedback Themes (ROC-AUC 0,96) • Card Fraud Review Queue (79 dari 108 fraud di 100 alert teratas) • Bank Churn Targeting • Insurance Claim Fraud • Heart Failure Prediction • Student Performance • Air Quality Virtual Sensor • Demand Forecasting • Product Recommender • Uplift Promo Targeting • House Price Range • Mall Customer Segments • NYC Taxi Anomalies",
  dl: "Handwritten Digits CNN (akurasi 99,2%) • Hand Gestures • Live Object Detection • Sign Language Speller • Face Mood Mirror • Drowsiness Detector • Virtual Mouse • Head & Blink Keyboard • Traffic Counter (kamera lalu lintas London) • Doodle Duel • Live Forecast Lab (LSTM) • Bilingual Sentiment (BiLSTM, Indonesia/Inggris) • Air Synth",
  virtual: "Business Intelligence with Power BI (PwC Switzerland × Forage, 2024) • British Airways Sentiment & Predictive Analysis (British Airways × Forage, 2024)",
  education: [
    {
      title: "Sarjana Ilmu Komputer (S.Kom.), peminatan Data Science",
      bullets: [
        "IPK 3,76 / 4,00. Skripsi: “Forecasting Free On Board Bitumen Singapore Price Using Recurrent Neural Network”.",
        "Memimpin penulisan paper: “Comparison of TOPSIS, WP and SAW Methods for Determining the Best Journalist”, “Testing Web&#8209;Based Learning Applications Using Equivalence Partitioning”, “Parallel Processing on Machine Learning Modelling Using the Random Forest Algorithm”.",
      ],
    },
    {
      title: "Machine Learning Path, Lulusan",
      bullets: ["Supervised dan unsupervised learning, deep learning, NLP, dan computer vision; capstone: model klasifikasi kerusakan ban yang diterapkan di aplikasi mobile pemesanan servis kendaraan."],
    },
  ],
  skills: [
    ["Data & ML", "Python, SQL, pandas, NumPy, scikit-learn, TensorFlow / Keras, time series (RNN, LSTM), NLP, computer vision, MediaPipe, A/B testing, analisis kohort & survival."],
    ["BI & visualisasi", "Power BI, Tableau, Looker Studio, Excel, Plotly, Streamlit, Seaborn, Matplotlib, dashboard SVG / d3."],
    ["Data & database", "BigQuery, PostgreSQL, MySQL, SQLite, Firestore, Oracle Database, Pentaho, Cloud Storage, pemodelan data, pipeline ETL."],
    ["Web, SaaS & mobile", "TypeScript, Next.js, React, Tailwind CSS, Prisma, FastAPI, Node.js / Express, REST API, autentikasi & akses berbasis peran, Expo / React Native, Android (Kotlin)."],
    ["Cloud & DevOps", "Google Cloud (Cloud Run, Cloud Build, Cloud SQL, Cloud Storage, Cloud Scheduler, Firebase), Docker."],
    ["Otomasi & AI", "Playwright, ekstensi Chrome, Power Automate, WhatsApp API, Oracle Fusion, SAP, integrasi LLM, AI agent & alur kerja agentic, prompt engineering, Model Context Protocol (MCP), no-code / low-code."],
  ],
  soft: "Pemecahan masalah, berpikir analitis, komunikasi, kolaborasi, manajemen proyek, adaptif.",
  languages: "Bahasa Indonesia (penutur asli), Bahasa Inggris (TOEFL ITP 617 prediksi, IELTS 6.0).",
};
