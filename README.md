# EasyDrawer Backend

## Description

This repository is the main hub for announcements and updates about the **EasyDrawer** app (name subject to change), a Single Page Application (SPA) designed for easy, straightforward, and self-hosted PDF management. The app allows users to organize, browse, and manage their PDF collections efficiently, with a focus on deployment in personal or private server environments.

## Features

- **Filesystem-like Import & Reorganization**
  Import new files or folders and reorganize them in a filesystem-like interface — all changes are reflected directly in the host’s filesystem.
- **Folder & File Management**
  Add, delete, and tag files directly from the app interface.
- **Tag-based PDF Management**
  Organize and categorize PDFs efficiently using tags.
- **Bulk Tagging & Editing**
  Apply tags and edits to multiple files at once.
- **Support for Duplicate Books**
  Handle duplicated PDF files seamlessly.
- **Search & Filter**
  Search PDFs by name and filter by tags (additional search features coming soon).
- **Paginated Browsing**
  Browse your PDF library with pagination for better navigation.
- **Fast Thumbnail Generation**
  Thumbnails are generated quickly and saved on disk for improved performance.
- **Easy Deployment with Docker Compose**
  Ready for quick deployment using Docker Compose.

## Preview

![](assets/demo.gif)

## Technology Stack

- React
- React Router (for client-side routing)
- React Query (for data fetching, querying, and caching)
- Tailwind
- React-icons
- Node.js
- Express
- Prisma ORM
- PostgreSQL
- Chakra UI
- Vite
- Docker

_Note: The stack may evolve as the app develops._

Additional dependencies installed via apt packages:

- `webp`
- `poppler-utils`

## Upcoming Features

- Full-text and fuzzy search
- Duplication detection
- Authentication

## Contribution

Issues and feature requests are welcome.

## Docker

### Docker Compose

Below is an example `docker-compose.yml` setup for easy deployment of the backend, frontend, database, and migration service.

To connect the frontend to the backend, simply replace the `API` environment variable in the frontend service with the backend URL.
For example, if deploying locally, set it to `http://localhost:3001`.

```yaml
services:
  back-end:
    container_name: pdfmanbackend
    image: pdfmanapp/pdfmanbackend:latest
    shm_size: "4g" #Change to how much of ram you want to give for thumbs generation min 500mb
    environment:
      DATABASE_URL: postgresql://myuser:mypassword@db:5432/PDFMAN
      FOLDER_PATH: /pdfs/
      THUMBNAIL_FOLDER: /thumbnails/
      PORT: 3001
    ports:
      - "3001:3001"
    depends_on:
      - db
      - migrator

    volumes:
      - /path/to/pdfs/folder:/pdfs:rw
      - thumbnails:/thumbnails:rw
    restart:
      - always
  front-end:
    container_name: pdfmanfrontend
    image: pdfmanapp/pdfmanfrontend:latest
    ports:
      - "5173:80"
    environment:
      - API=http://localhost:3001/ #if this is hosted on another device, you should put here its ip adress
    depends_on:
      - back-end
  db:
    image: postgres
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

  migrator:
    image: pdfmanapp/prismamigration:latest
    environment:
      - DATABASE_URL=postgresql://myuser:mypassword@db:5432/PDFMAN
    depends_on:
      - db
    restart: no

volumes:
  pgdata:
  thumbnails:
```

## Local developement setup :

Follow the steps below to set up the project locally:
Make sure your PostgreSQL database is running.

1. **Clone the Repository**
   Clone this repository to your local machine and navigate into the project directory.
2. **Install Dependencies**
   run "npm run install", install popper-utils and webp
3. **Configure Environment Variables**Create a `.env` file in the root of the project and define the following variables:

   - `DATABASE_URL` – Connection string to your PostgreSQL database.
     Example: `postgresql://myuser:mypassword@localhost:5432/PDFMAN`
   - `FOLDER_PATH` – Absolute path to the folder containing the PDF files.
   - `THUMBNAIL_FOLDER` – Absolute path to the folder where thumbnails will be generated.
   - `PORT` – Port number the application will run on (e.g., `3000`).

4. **Run Database Migrations**
   If you're setting up a fresh database, run "npx prisma migrate dev" command to initialize the schema.
5. **Start the Development Server**
   -run "npm start" or "npm run dev"(for nodemon)

License Notice:
This project is licensed under the MIT License. The application uses several open-source libraries, primarily under the MIT and Apache 2.0 licenses. Please refer to their respective repositories for detailed licensing information.
