# Konsep deploy

Status: **live di Google Cloud Run** sejak 15 Nov 2026 (rencana awal dicatat 10 Nov 2026).

## Yang sedang jalan (15 Nov 2026)

| | |
|---|---|
| Project GCP | `gatherinsight` (billing account sudah penuh 5 project, jadi project baru `baldanproject` dibuat tapi tanpa billing dan tidak dipakai) |
| Service Cloud Run | `baldanproject`, region `asia-southeast1` |
| Alamat | **https://portofolio.baldanproject.my.id** (domain sendiri, sudah aktif) · alamat bawaan Cloud Run: https://baldanproject-1021483580038.asia-southeast1.run.app |
| Instance | minimal **0** (mati saat sepi, biaya Rp0 tanpa pengunjung), maksimal 3, 1 vCPU / 1 GiB |
| Image | `asia-southeast1-docker.pkg.dev/gatherinsight/baldanproject/site:<tag>` (repo terpisah dari image GatherInsight) |
| File | `Dockerfile` (Next.js standalone), `cloudbuild.yaml`, `.gcloudignore`, `.dockerignore` |

`.gcloudignore` wajib ada karena folder ini bukan repo git: tanpa itu gcloud akan meng-upload semuanya. Yang tidak ikut: `.env*` (key OpenRouter), isi `ml/` kecuali `train.py`, `live_data.py` dan `quickdraw_data.py` (kodenya ditampilkan di halaman project, dibaca saat build oleh `src/lib/code-docs.ts`; kalau menambah file `extra` di `src/data/code-docs.ts` dari `ml/`, tambahkan juga pengecualiannya di `.gcloudignore` dan `.dockerignore`), `docs/`, `node_modules/`, `.next/`, PDF di folder utama, runtime wasm MediaPipe (dibuat ulang saat build).

### Deploy otomatis (sejak 17 Nov 2026)

Repo: https://github.com/baldan555/baldanportofolio (publik). Cukup `git push` ke `main`: GitHub Actions menjalankan lint + build, membangun image, `terraform apply` (folder `infra/terraform`), lalu smoke test ke domain. Pull request mendapat `terraform plan`. Login ke GCP tanpa key (Workload Identity Federation, hanya untuk repo ini; setup sekali lewat `infra/bootstrap.sh`). State Terraform di bucket `gatherinsight-baldanproject-tfstate`.

### Deploy ulang manual (cadangan, kalau Actions tidak bisa dipakai)

Ganti `v2` setiap kali (PowerShell, dari folder project):

```
$img = "asia-southeast1-docker.pkg.dev/gatherinsight/baldanproject/site:v2"
gcloud builds submit --project gatherinsight --config cloudbuild.yaml --substitutions="_IMAGE=$img,_SITE_URL=https://portofolio.baldanproject.my.id" .
gcloud run deploy baldanproject --project gatherinsight --region asia-southeast1 --image $img --min-instances 0
```

`_SITE_URL` = domain publik (dipakai untuk gambar preview, sitemap dan canonical). CV ada 6 format di `public/cv/`; setelah mengubah isi CV jalankan `node docs/cv/build.mjs` dulu, baru build ulang.

### Menyalakan demo Prompt → automation di Cloud Run

Key **tidak** ikut di image. Pasang di service (sekali saja), lebih aman lewat Secret Manager:

```
gcloud run services update baldanproject --project gatherinsight --region asia-southeast1 --update-env-vars OPENROUTER_MODEL=<model-id> --update-secrets OPENROUTER_API_KEY=<nama-secret>:latest
```

## Intinya: situs ini statis, kecuali dua route kecil (sejak 11 Nov 2026)

| Bagian | Jalan di mana | Butuh server? |
|---|---|---|
| Landing page, halaman skill, studi kasus | HTML hasil `next build` (prerender) | Tidak |
| Demo ML (churn, heart, mall, taxi) | Browser pengunjung, membaca `src/data/models/*.json` | Tidak |
| Cuaca langsung di hero | Browser → API Open-Meteo (gratis, tanpa key) | Tidak |
| Training model | Komputer Baldan (`ml/train.py`) | Tidak di server |

Jadi tidak perlu database, tidak perlu Python di server, dan biaya hosting bisa Rp0.

## Alur kerja update

```
1. ubah / tambah model   →  ml/.venv/Scripts/python ml/train.py
2. JSON di src/data/models/ ikut berubah
3. commit + push ke GitHub
4. hosting otomatis build & deploy ulang
```

`ml/.venv/` dan `ml/data/raw/` tidak ikut di-commit (sudah di `.gitignore`); yang ikut hanya kode training dan JSON hasilnya.

## Pilihan hosting

| Opsi | Cocok kalau | Catatan |
|---|---|---|
| **Vercel** (disarankan) | Ingin paling cepat dan otomatis | Dibuat tim Next.js. Paket Hobby gratis untuk portofolio pribadi. Push ke GitHub → otomatis live. Domain sendiri bisa dipasang. |
| **Google Cloud Run** | Ingin satu ekosistem dengan project lain (GatherInsight, PROTRACK) | Pakai Dockerfile + Cloud Build seperti project lain. Ada biaya kecil kalau trafik tinggi. |
| **Firebase Hosting / Cloudflare Pages** | Ingin hosting file statis murni | Perlu mode static export (`output: "export"`); config `cacheComponents` di `next.config.ts` perlu dicek ulang saat itu. |

## Sebelum deploy (checklist)

- [ ] `git init` + repo GitHub (folder ini belum jadi repo git)
- [ ] Pilih domain (mis. nama sendiri)
- [x] Gambar Open Graph + metadata untuk preview link di LinkedIn/WhatsApp (12 Nov 2026: `src/app/opengraph-image.tsx`, `twitter-image.tsx`, ikon `icon.svg` / `apple-icon.png` / `favicon.ico`)
- [x] `sitemap.xml` dan `robots.txt` (12 Nov 2026: `src/app/sitemap.ts`, `robots.ts`)
- [ ] Set `NEXT_PUBLIC_SITE_URL` ke domain final (mis. `https://namamu.com`) di env Vercel. Dipakai untuk link gambar preview, canonical, sitemap dan data JSON-LD. Kalau kosong, di Vercel otomatis memakai domain produksi Vercel; di lokal `http://localhost:3000`
- [ ] Putuskan: nomor WhatsApp tetap tampil publik atau tidak
- [ ] Pastikan nama project kantor (PROTRACK, TickMate, dst.) aman ditampilkan
- [ ] Cek ulang di HP sungguhan (scroll, kursor dimatikan di layar sentuh, demo)

## Aset MediaPipe (demo kamera, 10 Nov 2026)

- Demo gestur kamera memakai `@mediapipe/tasks-vision` 1.1.1 (Apache-2.0), di-host sendiri, tanpa CDN pihak ketiga.
- `public/mediapipe/gesture_recognizer.task` (8,4 MB), `efficientdet_lite0.tflite` (7,3 MB) dan `face_landmarker.task` (3,8 MB) ikut di-commit.
- Runtime WebAssembly (~27 MB) **tidak** di-commit: `scripts/copy-mediapipe.mjs` menyalinnya dari `node_modules` ke `public/mediapipe/wasm/` lewat `predev`/`prebuild`, jadi build di Vercel otomatis menyiapkannya.
- Kamera butuh HTTPS (Vercel sudah HTTPS). Video diproses di perangkat pengunjung, tidak diunggah.

## Data live: Live Forecast Lab (10 Nov 2026)

| Seri | API yang dipanggil browser | Syarat |
|---|---|---|
| PM2.5 Jakarta per jam | `air-quality-api.open-meteo.com` (CAMS) | Gratis, tanpa key, **non-komersial**, atribusi CC BY 4.0 (sudah ada di halaman) |
| Kurs USD/IDR harian | `api.frankfurter.dev` (kurs referensi ECB) | Gratis, tanpa key |
| Pageviews Wikipedia Indonesia | `wikimedia.org/api/rest_v1/metrics/pageviews` | Gratis, tanpa key |

- Ketiganya dipanggil langsung dari browser pengunjung (CORS terbuka), jadi tetap tanpa server. Kalau API gagal, demo memakai snapshot dari hari training.
- Model LSTM tidak dilatih ulang otomatis. Untuk memperbarui: `ml/.venv/Scripts/python -I ml/live_data.py --force`, lalu `ml/.venv/Scripts/python ml/train.py live_forecasts`, lalu commit JSON-nya. Kalau sebagian artikel Wikipedia gagal karena dibatasi server (HTTP 429), jalankan `ml/live_data.py --fill-wiki` sebelum training.
- Kalau situs nanti dipakai komersial, API Open-Meteo gratis tidak boleh dipakai: perlu paket berbayar atau sumber lain.

## Bobot model sentimen (10 Nov 2026)

- `public/models/bilingual-sentiment-weights.json` (~2 MB, bobot int8 + kosakata dua bahasa) **ikut di-commit**; demo mengunduhnya saat dibuka, jadi halaman lain tidak ikut berat.
- Dataset mentah (`ml/data/raw/smsa`, `ml/data/raw/goemotions`) tidak di-commit. Training ulang: `ml/.venv/Scripts/python ml/train.py sentiment`.

## Route server untuk Traffic Counter (11 Nov 2026)

- `src/app/api/jamcams/route.ts`: daftar kamera TfL JamCam (London), di-cache 1 jam dengan `use cache` + `cacheLife('hours')`.
- `src/app/api/jamcams/[id]/route.ts`: meneruskan klip MP4 terbaru satu kamera dari bucket publik TfL. Hanya menerima ID kamera TfL (`^\d{5}\.\d{5}$`), jadi bukan proxy terbuka; Cache-Control 60 detik di CDN.
- Alasannya: bucket TfL tidak mengirim header CORS, sehingga browser tidak boleh membaca piksel videonya untuk AI. Lewat route di domain sendiri, klip menjadi same-origin.
- Konsekuensi: butuh hosting yang menjalankan fungsi server (Vercel Hobby cukup). Static export murni (`output: "export"`) tidak bisa lagi.
- Atribusi wajib: "Powered by TfL Open Data" (lisensi TfL Transport Data Service, berbasis OGL v2.0), dan jangan terkesan sebagai aplikasi resmi TfL. Keduanya sudah tercantum di halaman.
- CCTV kota Indonesia tidak dipakai: tidak ada syarat pakai ulang yang terbuka.

## Route server untuk hub Automation (12 Nov 2026)

Selain JamCams, sekarang ada empat route kecil lagi (semua Node runtime, tanpa database):

- `src/app/api/pypi/route.ts`: unduhan PyPI mingguan untuk halaman Tools (pypistats.org tidak mengirim header CORS). Hanya paket di `src/data/auto-tools.ts`, cache sehari.
- `src/app/api/models/route.ts`: daftar model publik OpenRouter (tanpa key) dipangkas jadi ±43 KB, cache sehari. Dipakai kalkulator biaya dan pemilih model.
- `src/app/api/automation/plan/route.ts`: **demo Prompt → automation**. GET memberi status (aktif atau tidak, model yang boleh dipilih + harga live, batas); POST mengirim deskripsi pengunjung ke OpenRouter dengan satu tool `create_workflow`, memvalidasi hasilnya (`src/lib/workflow/ai.ts`), lalu mengembalikan workflow.

### Menyalakan demo Prompt → automation (OpenRouter milikmu)

1. Buat key di openrouter.ai/keys dan **pasang credit limit pada key itu** (batas biaya yang paling kuat).
2. Pilih model yang mendukung tool calling di openrouter.ai/models (filter "tools").
3. Lokal: isi `.env.local` (sudah ada sebagai template kosong, di-ignore git), lalu restart `npm run dev`:
   - `OPENROUTER_API_KEY=` key-mu
   - `OPENROUTER_MODEL=` id model default
   - `OPENROUTER_ALLOWED_MODELS=` (opsional) id lain yang boleh dipilih pengunjung, pisahkan koma
   - `AUTOMATION_PER_HOUR=8`, `AUTOMATION_PER_DAY=200` (opsional)
4. Vercel: Project → Settings → Environment Variables, isi variabel yang sama, lalu redeploy.

Tanpa key, halaman otomatis memakai mode contoh (5 contoh, salah satunya bahasa Indonesia). Key tidak pernah dikirim ke browser. Batas per jam dan per hari disimpan di memori tiap instance server, jadi anggap itu lapisan pertama saja; credit limit di OpenRouter adalah pagar utamanya. Catatan dev: Next tidak menghapus variabel yang sudah dimuat saat baris di `.env.local` dihapus; restart dev server setelah mengganti key.

## SEO dan link preview halaman utama (12 Nov 2026)

- Konstanta situs ada di `src/lib/site.ts` (URL, judul, deskripsi). Ganti di sana kalau judul atau deskripsi berubah.
- Halaman utama punya data terstruktur `Person` (JSON-LD) tanpa email dan nomor telepon. Tambahkan URL GitHub ke `sameAs` di `src/app/page.tsx` kalau mau ikut tampil.
- `next.config.ts` mengunci `turbopack.root` ke folder ini, karena ada `package-lock.json` lain di folder Downloads yang bikin Next salah tebak root.
- `src/lib/code-docs.ts` membaca file sumber hanya saat build (semua halaman studi kasus statis), jadi pembacaannya diberi `turbopackIgnore` supaya seluruh folder proyek tidak ikut di-trace ke server.
