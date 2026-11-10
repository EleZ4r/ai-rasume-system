Backend developer notes

- Run composer install after adding new packages:

    composer install

- Run migrations:

    php artisan migrate

- Start queue worker (if using database queue):

    php artisan queue:work --tries=3

- Before running `php artisan db:seed`, set unique `ADMIN_SEED_EMAIL`,
  `ADMIN_SEED_PASSWORD`, `HR_SEED_EMAIL`, and `HR_SEED_PASSWORD` values in your
  local `.env`. Never commit those credentials.

- Required .env entries:

    AI_BASE_URL=https://api.groq.com/openai/v1
    AI_MODEL=openai/gpt-oss-20b
    GROQ_API_KEY=your_groq_key_here
    QUEUE_CONNECTION=database

- Start the API in one terminal:

    php artisan serve --host=127.0.0.1 --port=8000

- Start the worker in another terminal. Restart it after changing .env:

    php artisan config:clear
    php artisan queue:restart
    php artisan queue:work --tries=3 -vvv

Applicant accounts can keep one current resume. The first PDF is uploaded with
`POST /api/resume/upload`; later versions replace that resume with
`PUT /api/resume/{id}/replace`. Uploads are limited to readable PDFs with
contact details and at least two recognizable resume section headings. Replacing
a PDF clears its previous AI analyses so the new file can be reviewed.

## Admin workspace

The browser-based admin workspace is available at `/admin/login`. It provides
an applicant directory with account details, private resume viewing, resume
analysis, application history, and interview records, as well as an overview of
hiring activity, monthly reports, job listing creation, and mock interview
review. Sign in with an account assigned the `admin` or `hr` role. Run
`php artisan db:seed` to create the local development roles and staff accounts.
