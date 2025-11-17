# 📚 EasyDrawer (PDF Management Backend)

## ⚙️ Description

This repository serves as the main hub for announcements and updates about **EasyDrawer** (name subject to change) — a **Single Page Application (SPA)** designed for easy, self-hosted, and efficient PDF management.

EasyDrawer allows users to organize, browse, and manage their PDF collections with a focus on **private and self-hosted environments**. The backend supports seamless integration with a modern frontend and offers filesystem-level synchronization for a straightforward and transparent management experience.

> **Note:** While this project has been in personal use for several months, it is **not yet ready for a bug-free production deployment**. Users are expected to have **some development experience** — enough to identify potential bug sources, troubleshoot issues, and adapt the setup if necessary.

---

## ✨ Features

- **Filesystem-like Import & Reorganization**
  Import files or folders and reorganize them in a structure that mirrors your filesystem — changes are reflected directly in the host environment.

- **Folder & File Management**
  Add, delete, or tag files and folders directly from the web interface.

- **Tag-based PDF Organization**
  Use tags to efficiently categorize and manage large PDF libraries.

- **Bulk Tagging & Editing**
  Apply tags or make edits to multiple files simultaneously.

- **Duplicate File Handling**
  Manage and differentiate between duplicate PDF files.

- **Search & Filter**
  Quickly search by name or filter by tags.

- **Full-text Search (via MeiliSearch)**
  Perform full-text search within tagged PDF collections.

- **Paginated Browsing**
  Navigate large libraries smoothly with built-in pagination.

- **Fast Thumbnail Generation**
  Thumbnails are cached on disk for better performance.

- **Easy Deployment with Docker Compose**
  Includes a sample `docker-compose.yml` for quick setup.

  Ready for quick deployment using Docker Compose.

## Preview

![](assets/demo.gif)

### ⚠️ Important Notice — Test Before Using on Real Files

---

Before using **EasyDrawer** on your actual PDF collection, please **test the setup with a sample or dummy folder**.
The application interacts directly with your filesystem — meaning actions such as renaming, deleting, or reorganizing PDFs will affect the files themselves.

Testing with a small, disposable folder first ensures you’re comfortable with how the system behaves and helps identify potential issues before working with your real data.
Please keep in mind the following:

Selection:
To select multiple files or folders, use Ctrl + Left Mouse Click.
(Multi-selection is currently limited to this method.)

Folder Movement:
When you move a folder, the files inside it are moved, but the folder structure itself is flattened — subfolders are not preserved in the current implementation.
This behavior is temporary and will change in a future update once hierarchical moves are supported.

---

## 🧠 Technology Stack

- **Frontend:** React, Chakra UI, React-icons, Vite
- **Backend:** Node.js, Express, Prisma ORM, PostgreSQL
- **Deployment:** Docker & Docker Compose

Additional dependencies installed via `apt`:

- `webp`
- `poppler-utils`
- `pymupdf`

> _Note: The stack may evolve as the project develops._

---

## 💡 Contribution

Contributions, issues, and feature requests are welcome!
Feel free to open an issue or submit a pull request.

---

## 🐳 Docker Setup

Below is an example `docker-compose.yml` for deploying the backend, frontend, database, and migration service.

To connect the frontend to the backend, set the `API` environment variable in the frontend service to the backend’s URL.
Example for local deployment: `http://localhost:3001`

```yaml
services:
  back-end:
    container_name: pdfmanbackend
    image: pdfmanapp/pdfmanbackend:latest
    environment:
      DATABASE_URL: postgresql://myuser:mypassword@db:5432/PDFMAN
      FOLDER_PATH: /pdfs/
      THUMBNAIL_FOLDER: /thumbnails/
      PORT: 3001
      MEILISEARCH_API: http://localhost:7700
    ports:
      - "3001:3001"
    depends_on:
      - db
    volumes:
      - /path/to/pdfs/folder:/pdfs:rw
      - thumbnails:/thumbnails:rw
    restart: always

  front-end:
    container_name: pdfmanfrontend
    image: pdfmanapp/pdfmanfrontend:latest
    ports:
      - "5173:80"
    environment:
      - API=http://localhost:3001/ #Please use local adresses, no mdns if using meilisearch
      - MEILISEARCH_URL=http://localhost:7700
    depends_on:
      - back-end

  db:
    image: postgres:17
    container_name: postgresdb
    restart: always
    environment:
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
      POSTGRES_DB: PDFMAN
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
  thumbnails:
```

---

## 🔍 MeiliSearch

MeiliSearch is required for full-text search functionality.
Please refer to the **official MeiliSearch documentation** for installation and setup instructions:
👉 [https://www.meilisearch.com/docs](https://www.meilisearch.com/docs)

---

## 🧩 Local Development Setup

To set up and run the project locally:

1. **Clone the repository**

   ```bash
   git clone https://github.com/mustnotcan/pdfman-backend.git
   cd pdfman-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the project root and define:

   ```env
   DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/PDFMAN
   FOLDER_PATH=/absolute/path/to/pdfs
   THUMBNAIL_FOLDER=/absolute/path/to/thumbnails
   PORT=3001
   MEILISEARCH_API=http://localhost:7700
   ```

4. **Run database migrations**

   ```bash
   npx prisma migrate dev
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   or

   ```bash
   npm start
   ```

## 📄 License

This project’s source code is licensed under the **MIT License**, except where otherwise noted.

However, this project depends on **PyMuPDF**, which is licensed under the **GNU Affero General Public License v3.0 (AGPLv3)**.  
Any deployment or distribution that includes PyMuPDF must comply with the AGPLv3, including making source code available for network-accessible services that use it.

For more information:

- [PyMuPDF / fitz AGPL License](https://pymupdf.readthedocs.io/en/latest/about.html#license-and-copyright)
- [AGPLv3 Full Text](https://www.gnu.org/licenses/agpl-3.0.en.html)

> ⚠️ This project is under active development and provided _as-is_, without any guarantee of bug-free operation or production readiness.
